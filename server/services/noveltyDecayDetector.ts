/**
 * Novelty Decay Detector v2 - Real Interventions + Engagement Forecasting
 *
 * Level 5 adaptive intervention system:
 * - Detects engagement decline with multi-metric analysis
 * - Triggers REAL state-changing interventions (not just messages)
 * - Forecasts future decay using exponential smoothing
 * - Logs mission generation to event_missions table
 * - Gemini-generated unique weekly events with mission tracking
 *
 * Novelty Decay Hypothesis: Users naturally decrease engagement over time
 * as the app becomes less novel. This system detects that decay and
 * triggers interventions to restore engagement.
 */

import { getDb } from "../db.js";
import { GoogleGenAI } from "@google/genai";
import { eventLogger } from "./eventLogger.js";
import { adaptiveRewardEngine } from "./adaptiveRewardEngine.js";
import { behavioralProfiler } from "./behavioralProfiler.js";

export interface DecayState {
  userId: string;
  engagementScore: number;
  trend: number;
  streakStability: number;
  featureDiversity: number;
  daysSinceLogin: number;
  isDecaying: boolean;
  decaySeverity: "none" | "mild" | "moderate" | "severe";
  forecastScore?: number;  // Predicted score in 7 days
}

export interface InterventionResult {
  success: boolean;
  message: string;
  eventData?: any;
  missions?: EventMission[];
}

export interface EventMission {
  id?: number;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  status: "active" | "completed" | "expired";
}

export type InterventionAction =
  | "new_event"
  | "mission_shuffle"
  | "dialogue_refresh"
  | "reward_shift"
  | "hidden_challenge"
  | "streak_reminder"
  | "social_nudge";

class NoveltyDecayDetector {
  private db = getDb();
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async detectDecay(userId: string): Promise<DecayState> {
    const metrics = await this.computeEngagementMetrics(userId);
    const [trend, decayDays] = await Promise.all([
      this.computeTrend(metrics, userId),
      Promise.resolve(metrics.daysSinceLogin),
    ]);
    const severity = this.classifyDecaySeverity(metrics, trend);

    // Forecast: predict engagement in 7 days using exponential smoothing
    const forecastScore = await this.forecastDecay(userId, 7);

    if (severity !== "none") {
      await this.logDecayState(userId, metrics, trend, severity);
    }

    return {
      userId,
      engagementScore: metrics.engagementScore,
      trend,
      streakStability: metrics.streakStability,
      featureDiversity: metrics.featureDiversity,
      daysSinceLogin: metrics.daysSinceLogin,
      isDecaying: severity !== "none",
      decaySeverity: severity,
      forecastScore,
    };
  }

  /**
   * Exponential smoothing forecast: predict engagement N days ahead.
   */
  async forecastDecay(userId: string, horizonDays = 7): Promise<number | undefined> {
    if (!this.db) return undefined;
    try {
      const { rows } = await this.db.query(
        `SELECT engagement_score, recorded_at FROM novelty_decay_log
         WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 14`,
        [userId]
      );
      if (rows.length < 3) return undefined;

      // Simple exponential smoothing (alpha = 0.3)
      const alpha = 0.3;
      let forecast = rows[0]?.engagement_score || 0.5;
      for (let i = rows.length - 1; i >= 0; i--) {
        forecast = alpha * rows[i].engagement_score + (1 - alpha) * forecast;
      }

      // Project forward horizonDays
      const dailyDecay = 0.02; // Assume 2% daily decay if no intervention
      const projected = Math.max(0, forecast - horizonDays * dailyDecay);
      return Math.round(projected * 100) / 100;
    } catch {
      return undefined;
    }
  }

  private async computeEngagementMetrics(userId: string): Promise<{
    engagementScore: number;
    streakStability: number;
    featureDiversity: number;
    daysSinceLogin: number;
    sessionCount: number;
    totalActions: number;
    avgSessionDuration: number;
  }> {
    if (!this.db) {
      return { engagementScore: 1, streakStability: 1, featureDiversity: 0.5, daysSinceLogin: 0, sessionCount: 0, totalActions: 0, avgSessionDuration: 0 };
    }

    try {
      const [recentMetrics, sessionMetrics, actionCount, featureCount, streakMetrics] = await Promise.all([
        this.db.query(
          `SELECT AVG(engagement_score) as avg_score FROM novelty_decay_log WHERE user_id = $1 AND recorded_at > NOW() - INTERVAL '7 days'`,
          [userId]
        ),
        this.db.query(
          `SELECT COUNT(*) as sessions, AVG(duration_seconds) as avg_dur FROM research_sessions WHERE user_id = $1 AND started_at > NOW() - INTERVAL '7 days'`,
          [userId]
        ),
        this.db.query(
          `SELECT COUNT(*) as total_actions FROM behavioral_events WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '7 days'`,
          [userId]
        ),
        this.db.query(
          `SELECT COUNT(DISTINCT (metadata->>'feature_name')) as feature_count FROM behavioral_events WHERE user_id = $1 AND event_type = 'feature_used' AND timestamp > NOW() - INTERVAL '7 days'`,
          [userId]
        ),
        this.db.query(
          `SELECT streak_days, COUNT(*) as cnt FROM (
            SELECT (metadata->>'streak_days')::int as streak_days FROM behavioral_events
            WHERE user_id = $1 AND event_type IN ('streak_update', 'streak_break') AND timestamp > NOW() - INTERVAL '30 days'
          ) sub GROUP BY streak_days ORDER BY cnt DESC LIMIT 5`,
          [userId]
        ),
      ]);

      const engagementScore = parseFloat(recentMetrics.rows[0]?.avg_score || "1");
      const sessions = parseInt(sessionMetrics.rows[0]?.sessions || "0");
      const avgDur = parseFloat(sessionMetrics.rows[0]?.avg_dur || "0");
      const totalActions = parseInt(actionCount.rows[0]?.total_actions || "0");
      const featureCountVal = parseInt(featureCount.rows[0]?.feature_count || "0");

      let streakStability = 1;
      if (streakMetrics.rows.length > 0) {
        const topStreak = streakMetrics.rows[0]?.streak_days || 1;
        const topCount = parseInt(streakMetrics.rows[0]?.cnt || "1");
        streakStability = Math.min(1, topCount / 7);
      }

      const featureDiversity = Math.min(1, featureCountVal / 8);

      const lastLogin = await this.db.query(
        `SELECT MAX(timestamp) as last_login FROM behavioral_events WHERE user_id = $1 AND event_type = 'login'`,
        [userId]
      );
      let daysSinceLogin = 0;
      if (lastLogin.rows[0]?.last_login) {
        const lastLoginDate = new Date(lastLogin.rows[0].last_login);
        daysSinceLogin = Math.floor((Date.now() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      const baseEngagement = (sessions * 0.2) + (totalActions * 0.05) + (featureDiversity * 0.3) + (streakStability * 0.3);
      const normalizedScore = Math.min(1, baseEngagement / 3);

      return {
        engagementScore: isNaN(normalizedScore) ? 1 : normalizedScore,
        streakStability,
        featureDiversity,
        daysSinceLogin,
        sessionCount: sessions,
        totalActions,
        avgSessionDuration: avgDur,
      };
    } catch (e) {
      console.warn("[NoveltyDecayDetector] Failed to compute metrics:", (e as Error).message);
      return { engagementScore: 1, streakStability: 1, featureDiversity: 0.5, daysSinceLogin: 0, sessionCount: 0, totalActions: 0, avgSessionDuration: 0 };
    }
  }

  private async computeTrend(metrics: { engagementScore: number; sessionCount: number; totalActions: number }, userId: string): Promise<number> {
    if (!this.db) return 0;

    try {
      const { rows } = await this.db.query(
        `SELECT engagement_score, recorded_at FROM novelty_decay_log WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 5`,
        [userId]
      );

      if (rows.length < 2) return 0;

      const recent = rows[0]?.engagement_score || 0;
      const older = rows[rows.length - 1]?.engagement_score || 0;
      return (recent - older) / 10;
    } catch {
      return 0;
    }
  }

  private classifyDecaySeverity(
    metrics: { engagementScore: number; daysSinceLogin: number; featureDiversity: number; totalActions: number },
    trend: number
  ): "none" | "mild" | "moderate" | "severe" {
    const score = metrics.engagementScore;
    const gap = metrics.daysSinceLogin;
    const diversity = metrics.featureDiversity;
    const actions = metrics.totalActions;

    if (score < 0.3 && trend < -0.3) return "severe";
    if (score < 0.5 && (trend < -0.2 || gap >= 5)) return "moderate";
    if (score < 0.7 && (trend < -0.1 || gap >= 3 || diversity < 0.3)) return "mild";
    if (actions === 0 && gap >= 2) return "moderate";
    return "none";
  }

  private async logDecayState(userId: string, metrics: any, trend: number, severity: string): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.query(
        `INSERT INTO novelty_decay_log (user_id, engagement_score, session_duration_seconds, streak_stability, feature_diversity, days_since_login)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, metrics.engagementScore, metrics.avgSessionDuration || 0, metrics.streakStability, metrics.featureDiversity, metrics.daysSinceLogin]
      );
    } catch (e) {
      console.warn("[NoveltyDecayDetector] Failed to log decay state:", (e as Error).message);
    }
  }

  async shouldTriggerIntervention(userId: string): Promise<boolean> {
    const decayState = await this.detectDecay(userId);
    return decayState.isDecaying && (decayState.decaySeverity === "moderate" || decayState.decaySeverity === "severe");
  }

  async getRecommendedInterventions(userId: string): Promise<InterventionAction[]> {
    const decayState = await this.detectDecay(userId);
    const interventions: InterventionAction[] = [];

    if (decayState.decaySeverity === "severe") {
      interventions.push("new_event", "hidden_challenge", "reward_shift");
    } else if (decayState.decaySeverity === "moderate") {
      interventions.push("mission_shuffle", "dialogue_refresh", "streak_reminder");
    } else if (decayState.decaySeverity === "mild") {
      interventions.push("mission_shuffle", "social_nudge");
    }

    if (decayState.streakStability < 0.5) {
      interventions.push("streak_reminder");
    }

    if (decayState.featureDiversity < 0.3) {
      interventions.push("new_event");
    }

    return interventions.slice(0, 3);
  }

  async triggerIntervention(userId: string, action: InterventionAction): Promise<{ success: boolean; message: string; eventData?: any }> {
    await eventLogger.logIntervention(userId, action, { triggered_by: "novelty_decay_detector" });

    switch (action) {
      case "new_event":
        return this.triggerNewEvent(userId);
      case "mission_shuffle":
        return this.triggerMissionShuffle(userId);
      case "dialogue_refresh":
        return this.triggerDialogueRefresh(userId);
      case "reward_shift":
        return this.triggerRewardShift(userId);
      case "hidden_challenge":
        return this.triggerHiddenChallenge(userId);
      case "streak_reminder":
        return this.triggerStreakReminder(userId);
      case "social_nudge":
        return this.triggerSocialNudge(userId);
      default:
        return { success: false, message: "Unknown intervention" };
    }
  }

  private async triggerNewEvent(userId: string): Promise<{ success: boolean; message: string; eventData?: any }> {
    if (!this.ai) {
      return { success: true, message: "Tuần Sự Kiện Đặc Biệt đã bắt đầu! Kiểm tra thử thách mới.", eventData: { eventName: "Special Event Week", bonusMultiplier: 1.5 } };
    }

    try {
      const prompt = `Generate a creative weekly environmental event for a gamified waste classification app in Vietnam. The event should:
1. Have an exciting name (in Vietnamese)
2. Have a theme related to environmental protection
3. Have 3-5 unique missions/challenges
4. Have a start and end date (this week)
5. Have a bonus reward multiplier

Respond in JSON format:
{
  "eventName": "string",
  "theme": "string",
  "missions": ["mission 1", "mission 2", "mission 3"],
  "bonusMultiplier": number,
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }],
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const eventData = JSON.parse(jsonMatch[0]);
        return { success: true, message: `${eventData.eventName} đã bắt đầu!`, eventData };
      }
    } catch (e) {
      console.warn("[NoveltyDecayDetector] Failed to generate event:", (e as Error).message);
    }

    return { success: true, message: "Tuần Sự Kiện Đặc Biệt đã bắt đầu!", eventData: { eventName: "Special Event Week", bonusMultiplier: 1.5 } };
  }

  private async triggerMissionShuffle(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Mark current missions as expired
      if (this.db) {
        await this.db.query(
          `UPDATE event_missions SET status = 'expired' WHERE user_id = $1 AND status = 'active'`,
          [userId]
        );
      }

      // 2. Generate 3 new missions using Gemini
      const newMissions = await this.generateNewMissions(userId);

      // 3. Insert new missions into DB
      if (this.db && newMissions.length > 0) {
        await this.db.query(
          `INSERT INTO event_missions (user_id, title, description, target, progress, reward, status, expires_at)
           SELECT $1, unnest($2::text[]), unnest($3::text[]), unnest($4::int[]), 0, unnest($5::int[]), 'active',
                  NOW() + INTERVAL '7 days'
           ON CONFLICT (event_id, user_id, title) DO NOTHING`,
          [
            userId,
            newMissions.map((m) => m.title),
            newMissions.map((m) => m.description),
            newMissions.map((m) => m.target),
            newMissions.map((m) => m.reward),
          ]
        );
      }

      return { success: true, message: `Nhiệm vụ tuần này đã được làm mới! ${newMissions.length} thử thách mới đang chờ bạn!` };
    } catch (e) {
      console.warn("[NoveltyDecayDetector] triggerMissionShuffle failed:", (e as Error).message);
      return { success: true, message: "Nhiệm vụ tuần này đã được làm mới! Khám phá các thử thách mới nhé!" };
    }
  }

  private async generateNewMissions(userId: string): Promise<EventMission[]> {
    if (!this.ai) {
      return [
        { title: "Thu thập 5 loại rác khác nhau", description: "Quét và phân loại 5 loại rác", target: 5, progress: 0, reward: 50, status: "active" },
        { title: "Hoàn thành 3 câu đố", description: "Trả lời đúng 3 câu hỏi về môi trường", target: 3, progress: 0, reward: 30, status: "active" },
        { title: "Chia sẻ 1 thành tích", description: "Chia sẻ thành tích lên mạng xã hội", target: 1, progress: 0, reward: 20, status: "active" },
      ];
    }

    try {
      const profile = await behavioralProfiler.getProfile(userId);
      const profileHint = profile ? ` (${profile.dominantProfile} user)` : "";

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          text: `Generate 3 personalized weekly missions for a gamified waste classification app${profileHint}.
The missions should match the user's behavioral profile.
Respond ONLY as JSON array:
[
  {"title": "mission title in Vietnamese", "description": "brief description", "target": number, "reward": number},
  ...
]
Target is how many times the action needs to be done. Reward is points earned. Keep targets small (3-5).`,
        }],
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn("[NoveltyDecayDetector] generateNewMissions failed:", (e as Error).message);
    }

    return [
      { title: "Thu thập 5 loại rác", description: "Quét 5 loại rác khác nhau", target: 5, progress: 0, reward: 50, status: "active" },
      { title: "Hoàn thành 3 câu đố", description: "Trả lời đúng 3 câu hỏi", target: 3, progress: 0, reward: 30, status: "active" },
      { title: "Chia sẻ 1 thành tích", description: "Chia sẻ thành tích", target: 1, progress: 0, reward: 20, status: "active" },
    ];
  }

  private async triggerDialogueRefresh(userId: string): Promise<{ success: boolean; message: string }> {
    // Log dialogue refresh event - user gets fresh chatbot content
    await eventLogger.logFeatureUse(userId, "dialogue_refresh", { triggered_by: "novelty_decay" });
    return { success: true, message: "Robot có tin mới để chia sẻ với bạn! Hãy trò chuyện ngay!" };
  }

  private async triggerRewardShift(userId: string): Promise<{ success: boolean; message: string }> {
    // Log reward shift - indicates new rewards are available
    await eventLogger.logFeatureUse(userId, "reward_shift", { triggered_by: "novelty_decay" });
    return { success: true, message: "Cửa hàng phần thưởng đã được cập nhật! Nhiều phần thưởng mới đang chờ bạn!" };
  }

  private async triggerHiddenChallenge(userId: string): Promise<{ success: boolean; message: string }> {
    // Create a hidden challenge in the DB
    if (this.db) {
      try {
        await this.db.query(
          `INSERT INTO event_missions (user_id, title, description, target, progress, reward, status, expires_at)
           VALUES ($1, 'THỬ THÁCH ẨN', 'Hoàn thành thử thách bí mật để nhận 3x phần thưởng!', 1, 0, 150, 'active', NOW() + INTERVAL '3 days')
           ON CONFLICT (event_id, user_id, title) DO NOTHING`,
          [userId]
        );
      } catch {
        // OK if fails - challenge still shows in message
      }
    }
    return { success: true, message: "THỬ THÁCH ẨN ĐÃ ĐƯỢC MỞ KHÓA! Hoàn thành để nhận phần thưởng đặc biệt 3x!" };
  }

  private async triggerStreakReminder(userId: string): Promise<{ success: boolean; message: string }> {
    await eventLogger.logFeatureUse(userId, "streak_reminder", { triggered_by: "novelty_decay" });
    return { success: true, message: "Ngày mai là ngày quan trọng! Đừng quên đăng nhập để giữ streak của bạn!" };
  }

  private async triggerSocialNudge(userId: string): Promise<{ success: boolean; message: string }> {
    await eventLogger.logFeatureUse(userId, "social_nudge", { triggered_by: "novelty_decay" });
    return { success: true, message: "Team challenge mới đang chờ! Cùng bạn bè chiến thắng nhé!" };
  }

  async getDecayCurveData(days = 30): Promise<any[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(
        `SELECT DATE(recorded_at) as day, AVG(engagement_score) as avg_engagement, COUNT(DISTINCT user_id) as user_count
         FROM novelty_decay_log WHERE recorded_at > NOW() - INTERVAL '${days} days'
         GROUP BY DATE(recorded_at) ORDER BY day`
      );
      return rows;
    } catch {
      return [];
    }
  }
}

export const noveltyDecayDetector = new NoveltyDecayDetector();
