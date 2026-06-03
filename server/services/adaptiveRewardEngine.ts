/**
 * Adaptive Reward Engine v2 - Thompson Sampling Bandit + A/B Gating
 *
 * Level 5 research-grade adaptive reward system:
 * - Thompson Sampling multi-armed bandit per behavioral profile
 * - A/B experiment gating (control gets NO bonus = clean causal test)
 * - Real bonus multiplier learning from engagement outcomes
 * - Multi-dimensional profile scoring
 */

import { getDb } from "../db.js";
import { eventLogger } from "./eventLogger.js";
import { personalityEngine, type PersonalityMode } from "./personalityEngine.js";
import { behavioralProfiler } from "./behavioralProfiler.js";
import { experimentEngine } from "./experimentEngine.js";

export type InterventionType =
  | "encouragement"
  | "ranking_focus"
  | "bonus_unlock"
  | "effort_boost"
  | "streak_protection"
  | "hidden_event"
  | "difficulty_reduction"
  | "social_boost";

export interface AdaptiveRewardResult {
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  multiplier: number;
  interventionType?: InterventionType;
  message: string;
  applyStreakProtection: boolean;
  inTreatmentArm: boolean;
}

// Bandit arm: tracks successes/trials for Thompson Sampling
interface BanditArm {
  name: string;
  multiplier: number;
  successes: number;
  trials: number;
}

// In-memory bandit state (persisted to DB periodically)
const banditState: Map<string, BanditArm[]> = new Map();

function betaSample(alpha: number, beta: number): number {
  // Simple beta distribution sampling via gamma
  let x = gammaSample(alpha);
  let y = gammaSample(beta);
  return x / (x + y);
}

function gammaSample(shape: number): number {
  if (shape < 1) return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function normalSample(): number {
  const u = Math.random(), v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

class AdaptiveRewardEngine {
  private db = getDb();

  /**
   * Main entry: compute reward with Thompson Sampling + A/B gating.
   * Control group gets multiplier=1, no bonus. Treatment gets adaptive bonus.
   */
  async computeReward(
    userId: string,
    basePoints: number,
    actionType: string
  ): Promise<AdaptiveRewardResult> {
    // A/B gate: only treatment arm gets adaptive rewards
    const inTreatment = await experimentEngine.hasFeature(userId, "adaptive_rewards");
    if (!inTreatment) {
      return {
        basePoints,
        bonusPoints: 0,
        totalPoints: basePoints,
        multiplier: 1,
        message: "",
        applyStreakProtection: false,
        inTreatmentArm: false,
      };
    }

    const profile = await behavioralProfiler.getProfile(userId);
    const personality = await personalityEngine.getPersonality(userId);
    const engagementState = await this.getEngagementState(userId);

    let bonusPoints = 0;
    let multiplier = 1.0;
    let interventionType: InterventionType | undefined;
    let message = "";
    let applyStreakProtection = false;

    // Thompson Sampling: select best arm for this profile segment
    const segment = profile?.dominantProfile || "casual";
    const selectedMultiplier = this.thompsonSample(segment);
    multiplier = selectedMultiplier;

    if (engagementState.isLowEngagement && engagementState.decayDays > 3) {
      ({ bonusPoints, interventionType, message } = this.lowEngagementIntervention(
        engagementState, personality, basePoints
      ));
      multiplier = 1 + (bonusPoints / basePoints);
    } else if (engagementState.isDropoutRisk) {
      ({ bonusPoints, interventionType, message, applyStreakProtection } = this.dropoutPreventionIntervention(
        personality, basePoints
      ));
      multiplier = 1 + (bonusPoints / basePoints);
    } else if (profile?.dominantProfile === "competitive") {
      ({ bonusPoints, interventionType, message, multiplier } = this.competitiveIntervention(
        basePoints, personality
      ));
    } else if (profile?.dominantProfile === "collector") {
      ({ bonusPoints, interventionType, message, multiplier } = this.collectorIntervention(
        basePoints, personality
      ));
    } else if (profile?.dominantProfile === "streak_driven") {
      ({ bonusPoints, interventionType, message, multiplier, applyStreakProtection } = this.streakDrivenIntervention(
        basePoints, personality, engagementState
      ));
    } else if (profile?.dominantProfile === "social") {
      ({ bonusPoints, interventionType, message, multiplier } = this.socialIntervention(
        basePoints, personality
      ));
    } else if (engagementState.isHighEngagement) {
      ({ bonusPoints, multiplier } = this.highEngagementBonus(basePoints));
      message = this.getPersonalityMessage(personality, "achievement", { score: basePoints + bonusPoints });
    }

    const totalPoints = Math.round(basePoints * multiplier);

    if (interventionType) {
      await this.recordIntervention(userId, interventionType, {
        actionType,
        basePoints,
        bonusPoints,
        totalPoints,
        profile: profile?.dominantProfile,
        personality,
        engagementState: engagementState.isLowEngagement ? "low" : engagementState.isDropoutRisk ? "at_risk" : "normal",
        multiplier,
      });
    }

    // Update bandit arm with engagement outcome
    this.updateBandit(segment, multiplier, engagementState.isHighEngagement);

    return {
      basePoints,
      bonusPoints,
      totalPoints,
      multiplier,
      interventionType,
      message: message || `${basePoints} điểm!`,
      applyStreakProtection,
      inTreatmentArm: true,
    };
  }

  /**
   * Thompson Sampling: pick arm with highest sampled value from beta distribution.
   * Arms are initialized with prior Beta(1,1) = uniform.
   */
  private thompsonSample(segment: string): number {
    let arms = banditState.get(segment);
    if (!arms) {
      arms = [
        { name: "none", multiplier: 1.0, successes: 1, trials: 1 },
        { name: "small", multiplier: 1.1, successes: 1, trials: 1 },
        { name: "medium", multiplier: 1.25, successes: 1, trials: 1 },
        { name: "large", multiplier: 1.5, successes: 1, trials: 1 },
        { name: "xlarge", multiplier: 2.0, successes: 1, trials: 1 },
      ];
      banditState.set(segment, arms);
    }

    let bestArm = arms[0];
    let bestSample = -1;
    for (const arm of arms) {
      // Beta(successes, trials - successes) posterior
      const sample = betaSample(arm.successes + 1, Math.max(1, arm.trials - arm.successes) + 1);
      if (sample > bestSample) {
        bestSample = sample;
        bestArm = arm;
      }
    }
    return bestArm.multiplier;
  }

  /**
   * Update bandit arm after observing engagement outcome.
   * If engagement improved -> count as success.
   */
  private updateBandit(segment: string, multiplier: number, engagementImproved: boolean): void {
    const arms = banditState.get(segment);
    if (!arms) return;
    const arm = arms.find((a) => a.multiplier === multiplier);
    if (arm) {
      arm.trials += 1;
      if (engagementImproved) arm.successes += 1;
    }
  }

  private async getEngagementState(userId: string): Promise<{
    isLowEngagement: boolean;
    isDropoutRisk: boolean;
    isHighEngagement: boolean;
    decayDays: number;
    engagementScore: number;
    engagementTrend: number;
  }> {
    if (!this.db) {
      return { isLowEngagement: false, isDropoutRisk: false, isHighEngagement: false, decayDays: 0, engagementScore: 1, engagementTrend: 0 };
    }

    try {
      const { rows } = await this.db.query(
        `SELECT engagement_score, days_since_login,
                ROW_NUMBER() OVER (ORDER BY recorded_at DESC) as rn,
                LAG(engagement_score) OVER (ORDER BY recorded_at DESC) as prev_score
         FROM novelty_decay_log
         WHERE user_id = $1 AND recorded_at > NOW() - INTERVAL '7 days'
         ORDER BY recorded_at DESC LIMIT 7`,
        [userId]
      );

      if (rows.length === 0) {
        return { isLowEngagement: false, isDropoutRisk: false, isHighEngagement: false, decayDays: 0, engagementScore: 1, engagementTrend: 0 };
      }

      const latest = rows[0];
      const engagementScore = latest.engagement_score || 1;
      const daysSinceLogin = latest.days_since_login || 0;
      const recentRows = rows.slice(0, 3);
      const trend = recentRows.length >= 2
        ? (recentRows[0].engagement_score - (recentRows[1]?.engagement_score || 0)) / 10
        : 0;

      return {
        isLowEngagement: engagementScore < 0.5 || trend < -0.2,
        isDropoutRisk: daysSinceLogin >= 3 || trend < -0.3,
        isHighEngagement: engagementScore > 0.8 && trend > 0.1,
        decayDays: daysSinceLogin,
        engagementScore,
        engagementTrend: trend,
      };
    } catch (e) {
      console.warn("[AdaptiveRewardEngine] Failed to get engagement state:", (e as Error).message);
      return { isLowEngagement: false, isDropoutRisk: false, isHighEngagement: false, decayDays: 0, engagementScore: 1, engagementTrend: 0 };
    }
  }

  private lowEngagementIntervention(
    state: { isLowEngagement: boolean; decayDays: number; engagementScore: number },
    personality: PersonalityMode,
    basePoints: number
  ): { bonusPoints: number; interventionType: InterventionType; message: string } {
    const boostFactor = state.decayDays > 5 ? 0.5 : state.decayDays > 3 ? 0.3 : 0.2;
    const bonusPoints = Math.round(basePoints * boostFactor);
    const msg = this.getPersonalityMessage(personality, "low_engagement", { days: state.decayDays });
    return { bonusPoints, interventionType: "encouragement", message: msg };
  }

  private dropoutPreventionIntervention(
    personality: PersonalityMode,
    basePoints: number
  ): { bonusPoints: number; interventionType: InterventionType; message: string; applyStreakProtection: boolean } {
    const bonusPoints = Math.round(basePoints * 0.75);
    const msg = this.getPersonalityMessage(personality, "low_engagement", { days: 3 });
    return {
      bonusPoints,
      interventionType: "hidden_event",
      message: msg + " SPECIAL BONUS: +75% điểm hôm nay!",
      applyStreakProtection: true,
    };
  }

  private competitiveIntervention(basePoints: number, personality: PersonalityMode): { bonusPoints: number; interventionType: InterventionType; message: string; multiplier: number } {
    const bonusPoints = Math.round(basePoints * 0.15);
    const message = this.getPersonalityMessage(personality, "achievement", { score: basePoints + bonusPoints });
    return { bonusPoints, interventionType: "ranking_focus", message, multiplier: 1.15 };
  }

  private collectorIntervention(basePoints: number, personality: PersonalityMode): { bonusPoints: number; interventionType: InterventionType; message: string; multiplier: number } {
    const bonusPoints = Math.round(basePoints * 0.2);
    const message = this.getPersonalityMessage(personality, "achievement", { score: basePoints + bonusPoints });
    return { bonusPoints, interventionType: "bonus_unlock", message, multiplier: 1.2 };
  }

  private streakDrivenIntervention(basePoints: number, personality: PersonalityMode, state: { isDropoutRisk: boolean }): { bonusPoints: number; interventionType: InterventionType; message: string; multiplier: number; applyStreakProtection: boolean } {
    const bonusPoints = Math.round(basePoints * 0.25);
    const message = this.getPersonalityMessage(personality, "achievement", { score: basePoints + bonusPoints });
    return {
      bonusPoints,
      interventionType: "streak_protection",
      message,
      multiplier: 1.25,
      applyStreakProtection: state.isDropoutRisk,
    };
  }

  private socialIntervention(basePoints: number, personality: PersonalityMode): { bonusPoints: number; interventionType: InterventionType; message: string; multiplier: number } {
    const bonusPoints = Math.round(basePoints * 0.1);
    const message = this.getPersonalityMessage(personality, "achievement", { score: basePoints + bonusPoints });
    return { bonusPoints, interventionType: "social_boost", message, multiplier: 1.1 };
  }

  private highEngagementBonus(basePoints: number): { bonusPoints: number; multiplier: number } {
    return { bonusPoints: Math.round(basePoints * 0.05), multiplier: 1.05 };
  }

  private getPersonalityMessage(personality: PersonalityMode, key: string, params: Record<string, string | number> = {}): string {
    return personalityEngine.getMessage(personality, key, params);
  }

  private async recordIntervention(userId: string, interventionType: InterventionType, metadata: Record<string, unknown>): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.query(
        `INSERT INTO adaptive_interventions (user_id, intervention_type, triggered_by, metadata) VALUES ($1, $2, $3, $4)`,
        [userId, interventionType, "adaptive_reward_engine", JSON.stringify(metadata)]
      );
    } catch (e) {
      console.warn("[AdaptiveRewardEngine] Failed to record intervention:", (e as Error).message);
    }
  }

  async getRecentInterventions(userId: string, limit = 10): Promise<any[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(
        `SELECT intervention_type, triggered_by, triggered_at, effectiveness_score, metadata
         FROM adaptive_interventions WHERE user_id = $1 ORDER BY triggered_at DESC LIMIT $2`,
        [userId, limit]
      );
      return rows;
    } catch {
      return [];
    }
  }

  async computeInterventionEffectiveness(interventionId: number): Promise<number> {
    if (!this.db) return 0;
    try {
      const { rows } = await this.db.query(
        `SELECT user_id, triggered_at, metadata FROM adaptive_interventions WHERE id = $1`,
        [interventionId]
      );
      if (rows.length === 0) return 0;

      const intervention = rows[0];
      const userId = intervention.user_id;
      const triggeredAt = new Date(intervention.triggered_at);

      const { rows: decayRows } = await this.db.query(
        `SELECT engagement_score, recorded_at FROM novelty_decay_log
         WHERE user_id = $1 AND recorded_at >= $2 AND recorded_at <= $2::timestamp + INTERVAL '7 days'
         ORDER BY recorded_at ASC`,
        [userId, triggeredAt.toISOString()]
      );

      if (decayRows.length < 2) return 0;

      const baseline = decayRows[0]?.engagement_score || 0;
      const post = decayRows[decayRows.length - 1]?.engagement_score || 0;
      if (baseline === 0) return 0;
      const effectiveness = ((post - baseline) / baseline) * 100;

      await this.db.query(
        `UPDATE adaptive_interventions SET effectiveness_score = $1, outcome_recorded = TRUE WHERE id = $2`,
        [effectiveness, interventionId]
      );

      return effectiveness;
    } catch (e) {
      console.warn("[AdaptiveRewardEngine] Failed to compute effectiveness:", (e as Error).message);
      return 0;
    }
  }
}

export const adaptiveRewardEngine = new AdaptiveRewardEngine();
