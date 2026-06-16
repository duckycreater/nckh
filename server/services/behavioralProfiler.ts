/**
 * Behavioral Profiler - AI-Powered Multi-Dimensional User Classification
 *
 * Analyzes user behavior to classify into 5 behavioral profiles:
 * - competitive: thich leaderboard, rankings, comparison
 * - collector: thich badge, hoan thanh collection
 * - casual: engagement thap, short sessions
 * - streak_driven: so mat streak, duy tri daily
 * - social: thich team events, collaboration
 *
 * Produces MULTI-DIMENSIONAL scores (continuous 0-1 per profile type),
 * not a single hard assignment. This is critical for Level 5 research.
 *
 * Uses Gemini to analyze behavior embeddings.
 */

import { getDb } from "../db.js";
import { GoogleGenAI } from "@google/genai";
import { eventLogger } from "./eventLogger.js";

export type BehavioralProfile = "competitive" | "collector" | "casual" | "streak_driven" | "social";

export interface BehavioralMetrics {
  loginFrequency: number;       // logins per week
  streakStability: number;       // 0-1, variance in streak length
  rewardResponseRate: number;    // earned vs spent ratio
  avgSessionDuration: number;    // seconds per session
  featureDiversity: number;      // 0-1, % of features used
  leaderboardViews: number;      // leaderboard views per week
  gachaPullRate: number;        // gacha pulls per week
  dailyChallengeRate: number;    // challenges completed per week
  engagementTrend: number;       // -1 to 1, recent vs historical engagement
  quizCompletionRate: number;    // how often they complete quizzes
}

export interface MultiDimensionalProfile {
  scores: Record<BehavioralProfile, number>;  // 0-1 per profile type
  dominantProfile: BehavioralProfile;
  confidence: number;  // entropy-based confidence
  metrics: BehavioralMetrics;
  lastUpdated: Date;
}

class BehavioralProfiler {
  private db = getDb();
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async profileUser(userId: string): Promise<MultiDimensionalProfile> {
    const metrics = await this.computeMetrics(userId);
    const profile = await this.classifyUser(metrics);
    await this.saveProfile(userId, profile);
    return profile;
  }

  async computeMetrics(userId: string): Promise<BehavioralMetrics> {
    if (!this.db) {
      return {
        loginFrequency: 0, streakStability: 0, rewardResponseRate: 1,
        avgSessionDuration: 0, featureDiversity: 0, leaderboardViews: 0,
        gachaPullRate: 0, dailyChallengeRate: 0, engagementTrend: 0, quizCompletionRate: 0,
      };
    }

    try {
      const [loginCount, sessionData, rewardData, featureData, lbData, gachaData, challengeData, quizData] = await Promise.all([
        this.db.query(
          `SELECT COUNT(*) FROM behavioral_events WHERE user_id = $1 AND event_type = 'login' AND timestamp > NOW() - INTERVAL '7 days'`,
          [userId]
        ),
        this.db.query(
          `SELECT AVG(duration_seconds) as avg_dur, STDDEV(duration_seconds) as std_dur FROM research_sessions WHERE user_id = $1 AND ended_at IS NOT NULL AND started_at > NOW() - INTERVAL '14 days'`,
          [userId]
        ),
        this.db.query(
          `SELECT
            SUM((metadata->>'points_earned')::float) as earned,
            SUM((metadata->>'points_spent')::float) as spent
           FROM behavioral_events WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '7 days' AND event_type IN ('reward_claim', 'reward_spent')`,
          [userId]
        ),
        this.db.query(
          `SELECT COUNT(DISTINCT (metadata->>'feature_name')) as feature_count FROM behavioral_events WHERE user_id = $1 AND event_type = 'feature_used' AND timestamp > NOW() - INTERVAL '7 days'`,
          [userId]
        ),
        this.db.query(
          `SELECT COUNT(*) FROM behavioral_events WHERE user_id = $1 AND event_type = 'leaderboard_view' AND timestamp > NOW() - INTERVAL '7 days'`,
          [userId]
        ),
        this.db.query(
          `SELECT COUNT(*) FROM behavioral_events WHERE user_id = $1 AND event_type IN ('gacha_pull', 'gacha_new_card', 'gacha_duplicate') AND timestamp > NOW() - INTERVAL '7 days'`,
          [userId]
        ),
        this.db.query(
          `SELECT COUNT(*) FROM behavioral_events WHERE user_id = $1 AND event_type = 'daily_challenge_complete' AND timestamp > NOW() - INTERVAL '7 days'`,
          [userId]
        ),
        // quizCompletionRate: completed / started
        this.db.query(
          `SELECT
            COUNT(*) FILTER (WHERE event_type = 'quiz_complete') as completed,
            COUNT(*) FILTER (WHERE event_type = 'quiz_start') as started
           FROM behavioral_events WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '7 days'`,
          [userId]
        ),
      ]);

      const recentSessions = await this.db.query(
        `SELECT COUNT(*) as recent, (
          SELECT COUNT(*) FROM behavioral_events WHERE user_id = $1 AND event_type = 'login' AND timestamp > NOW() - INTERVAL '14 days'
        ) as older FROM research_sessions WHERE user_id = $1 AND started_at > NOW() - INTERVAL '7 days'`,
        [userId]
      );

      const streakData = await this.db.query(
        `SELECT streak_days, COUNT(*) as cnt FROM (
          SELECT (metadata->>'streak_days')::int as streak_days
          FROM behavioral_events WHERE user_id = $1 AND event_type IN ('streak_update', 'streak_break') AND timestamp > NOW() - INTERVAL '30 days'
        ) sub GROUP BY streak_days`,
        [userId]
      );

      const avgDur = parseFloat(sessionData.rows[0]?.avg_dur || "0");
      const stdDur = parseFloat(sessionData.rows[0]?.std_dur || "0");
      const streakStability = stdDur > 0 && avgDur > 0 ? Math.max(0, 1 - (stdDur / avgDur)) : 1;
      const earned = parseFloat(rewardData.rows[0]?.earned || "0");
      const spent = parseFloat(rewardData.rows[0]?.spent || "0");
      const rewardResponseRate = earned > 0 ? Math.min(1, spent / earned) : 0.5;
      const loginFreq = parseInt(loginCount.rows[0]?.count || "0");
      const featureCount = parseInt(featureData.rows[0]?.feature_count || "0");
      const lbViews = parseInt(lbData.rows[0]?.count || "0");
      const gachaPulls = parseInt(gachaData.rows[0]?.count || "0");
      const challenges = parseInt(challengeData.rows[0]?.count || "0");

      const quizCompleted = parseInt(quizData.rows[0]?.completed || "0");
      const quizStarted = parseInt(quizData.rows[0]?.started || "0");
      const quizCompletionRate = quizStarted > 0 ? quizCompleted / quizStarted : 0;

      const recent = parseInt(recentSessions.rows[0]?.recent || "0");
      const older = parseInt(recentSessions.rows[0]?.older || "0");
      const engagementTrend = older > 0 ? (recent - older / 2) / older : 0;

      return {
        loginFrequency: loginFreq,
        streakStability,
        rewardResponseRate,
        avgSessionDuration: avgDur,
        featureDiversity: Math.min(1, featureCount / 8),
        leaderboardViews: lbViews,
        gachaPullRate: gachaPulls,
        dailyChallengeRate: challenges,
        engagementTrend: Math.max(-1, Math.min(1, engagementTrend)),
        quizCompletionRate,
      };
    } catch (e) {
      console.warn("[BehavioralProfiler] Failed to compute metrics:", (e as Error).message);
      return {
        loginFrequency: 0, streakStability: 0, rewardResponseRate: 1,
        avgSessionDuration: 0, featureDiversity: 0, leaderboardViews: 0,
        gachaPullRate: 0, dailyChallengeRate: 0, engagementTrend: 0, quizCompletionRate: 0,
      };
    }
  }

  /**
   * Multi-dimensional classification: returns continuous scores (0-1) per profile type.
   * Uses Gemini 2.5 Flash for AI classification, with rule-based fallback.
   *
   * AI Pipeline:
   * 1. Compute 10 behavioral metrics from PostgreSQL
   * 2. Send metrics to Gemini 2.5 Flash with structured prompt
   * 3. Parse PROFILE / CONFIDENCE / REASONING from response
   * 4. Fallback to rule-based if AI fails or is unavailable
   */
  private async classifyUser(metrics: BehavioralMetrics): Promise<MultiDimensionalProfile> {
    // Try Gemini first, fall back to rule-based
    try {
      const aiProfile = await this.classifyWithAI(metrics);
      if (aiProfile) return aiProfile;
    } catch (e) {
      console.warn("[BehavioralProfiler] AI classification failed, using rule-based:", (e as Error).message);
    }
    return this.classifyWithRules(metrics);
  }

  /**
   * AI-powered classification using Gemini 2.5 Flash.
   * Only called when AI is available (GEMINI_API_KEY set).
   */
  private async classifyWithAI(metrics: BehavioralMetrics): Promise<MultiDimensionalProfile | null> {
    if (!this.ai) return null;

    const prompt = `You are a behavioral psychologist analyzing user engagement data.
Classify user into ONE of these 5 profiles:

1. "competitive" — Frequently checks leaderboard, compares with others, motivated by rankings
2. "collector" — Focuses on card collection, badge completion, wants to complete sets
3. "casual" — Low engagement, short sessions, infrequent use
4. "streak_driven" — Highly motivated by daily streaks, fears losing streaks
5. "social" — Enjoys team events, collaborative activities, values peer interaction

Metrics:
- loginFrequency: ${metrics.loginFrequency} logins/week
- streakStability: ${metrics.streakStability.toFixed(3)} (0-1, higher = more stable streak)
- rewardResponseRate: ${metrics.rewardResponseRate.toFixed(3)} (0-1, earned/spent ratio)
- avgSessionDuration: ${metrics.avgSessionDuration.toFixed(1)} seconds
- featureDiversity: ${metrics.featureDiversity.toFixed(3)} (0-1, % of features used)
- leaderboardViews: ${metrics.leaderboardViews} views/week
- gachaPullRate: ${metrics.gachaPullRate} pulls/week
- dailyChallengeRate: ${metrics.dailyChallengeRate} challenges/week
- engagementTrend: ${metrics.engagementTrend.toFixed(3)} (-1 to 1)
- quizCompletionRate: ${metrics.quizCompletionRate.toFixed(3)} (0-1)

Respond ONLY with:
PROFILE: <profile_name>
CONFIDENCE: <0.0-1.0>
REASONING: <brief explanation in 1-2 sentences>`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }],
        config: { temperature: 0.3, maxOutputTokens: 128 },
      });

      const text = response.text?.trim() || "";

      // Parse structured response
      const profileMatch = text.match(/PROFILE:\s*(\w+)/i);
      const confidenceMatch = text.match(/CONFIDENCE:\s*([\d.]+)/);
      const reasoningMatch = text.match(/REASONING:\s*(.+)/i);

      if (!profileMatch) return null;

      const validProfiles: BehavioralProfile[] = ["competitive", "collector", "casual", "streak_driven", "social"];
      const rawProfile = profileMatch[1].toLowerCase();
      const dominantProfile = validProfiles.includes(rawProfile as BehavioralProfile)
        ? (rawProfile as BehavioralProfile)
        : "casual";

      const aiConfidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7;

      // Compute continuous scores for multi-dimensional profile
      // AI gives dominant profile; we blend with rule-based for multi-dimensional view
      const ruleScores = this.computeRuleScores(metrics);
      const dominantRuleScore = ruleScores[dominantProfile] || 0;
      const maxRuleScore = Math.max(...Object.values(ruleScores));

      // Blend: weight AI confidence toward dominant, distribute rest by rules
      const scores: Record<BehavioralProfile, number> = {} as any;
      const blendWeight = aiConfidence * 0.7; // AI weight proportional to its confidence
      for (const p of validProfiles) {
        const ruleNorm = maxRuleScore > 0 ? ruleScores[p] / maxRuleScore : 0.25;
        scores[p] = p === dominantProfile
          ? blendWeight + (1 - blendWeight) * ruleNorm
          : (1 - blendWeight) * ruleNorm;
      }

      // Renormalize to sum to 1
      const total = Object.values(scores).reduce((a, b) => a + b, 0);
      for (const p of validProfiles) {
        scores[p] = scores[p] / total;
      }

      // Entropy-based confidence
      const entropy = -Object.values(scores)
        .reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
      const maxEntropy = Math.log(5);
      const confidence = 1 - entropy / maxEntropy;

      return {
        scores,
        dominantProfile,
        confidence: Math.round(Math.max(aiConfidence, confidence) * 1000) / 1000,
        metrics,
        lastUpdated: new Date(),
      };
    } catch (e) {
      console.warn("[BehavioralProfiler] Gemini classification error:", (e as Error).message);
      return null;
    }
  }

  /**
   * Rule-based classification using weighted metrics.
   * Used as fallback when AI is unavailable.
   */
  private classifyWithRules(metrics: BehavioralMetrics): MultiDimensionalProfile {
    const scores = this.computeRuleScores(metrics);

    // Softmax normalization
    const maxScore = Math.max(...Object.values(scores));
    const expScores = Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, Math.exp(v - maxScore)])
    ) as Record<BehavioralProfile, number>;
    const total = Object.values(expScores).reduce((a, b) => a + b, 0);
    const normScores = Object.fromEntries(
      Object.entries(expScores).map(([k, v]) => [k, v / total])
    ) as Record<BehavioralProfile, number>;

    // Entropy-based confidence
    const entropy = -Object.values(normScores)
      .reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
    const maxEntropy = Math.log(5);
    const confidence = 1 - entropy / maxEntropy;

    const dominantProfile = Object.entries(normScores)
      .reduce((best, [k, v]) => v > best.val ? { key: k as BehavioralProfile, val: v } : best,
        { key: "casual" as BehavioralProfile, val: -1 }).key;

    return {
      scores: normScores,
      dominantProfile,
      confidence: Math.round(confidence * 1000) / 1000,
      metrics,
      lastUpdated: new Date(),
    };
  }

  private computeRuleScores(metrics: BehavioralMetrics): Record<BehavioralProfile, number> {
    return {
      competitive: metrics.leaderboardViews * 2 + (metrics.rewardResponseRate > 0.7 ? 2 : 0),
      collector: metrics.gachaPullRate * 1.5 + metrics.featureDiversity * 2,
      casual: metrics.avgSessionDuration < 60 && metrics.loginFrequency < 3 ? 5 : 0,
      streak_driven: metrics.streakStability * 3 + metrics.dailyChallengeRate * 1.5,
      social: metrics.dailyChallengeRate * 1.5 + metrics.featureDiversity + metrics.quizCompletionRate * 2,
    };
  }

  private async saveProfile(userId: string, profile: MultiDimensionalProfile): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.query(
        `INSERT INTO user_behavioral_profiles (user_id, profile_type, confidence, scores, metrics, last_updated)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id) DO UPDATE SET profile_type = $2, confidence = $3, scores = $4, metrics = $5, last_updated = NOW()`,
        [userId, profile.dominantProfile, profile.confidence, JSON.stringify(profile.scores), JSON.stringify(profile.metrics)]
      );
    } catch (e) {
      console.warn("[BehavioralProfiler] Failed to save profile:", (e as Error).message);
    }
  }

  async getProfile(userId: string): Promise<MultiDimensionalProfile | null> {
    if (!this.db) return null;
    try {
      const { rows } = await this.db.query(
        `SELECT profile_type, confidence, scores, metrics, last_updated FROM user_behavioral_profiles WHERE user_id = $1`,
        [userId]
      );
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        scores: typeof r.scores === "string" ? JSON.parse(r.scores) : r.scores,
        dominantProfile: r.profile_type as BehavioralProfile,
        confidence: r.confidence,
        metrics: r.metrics,
        lastUpdated: r.last_updated,
      };
    } catch {
      return null;
    }
  }

  async shouldReprofile(userId: string): Promise<boolean> {
    if (!this.db) return false;
    try {
      const { rows } = await this.db.query(
        `SELECT last_updated FROM user_behavioral_profiles WHERE user_id = $1`,
        [userId]
      );
      if (rows.length === 0) return true;
      const lastUpdated = new Date(rows[0].last_updated);
      const eventCount = await eventLogger.getEventCount(userId);
      const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate >= 7 || eventCount >= 50;
    } catch {
      return false;
    }
  }
}

export const behavioralProfiler = new BehavioralProfiler();
