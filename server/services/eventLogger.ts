/**
 * Event Logger Service - Research Data Pipeline
 *
 * Logs EVERY user action with timestamps for temporal analysis.
 * Supports regression, ANOVA, survival analysis, and behavioral clustering.
 */

import { getDb } from "../db.js";

export type EventType =
  | "login"
  | "logout"
  | "session_start"
  | "session_end"
  | "quiz_start"
  | "quiz_complete"
  | "quiz_correct"
  | "quiz_wrong"
  | "scan_garbage"
  | "scan_success"
  | "gacha_pull"
  | "gacha_new_card"
  | "gacha_duplicate"
  | "card_battle_start"
  | "card_battle_win"
  | "card_battle_lose"
  | "streak_update"
  | "streak_break"
  | "reward_claim"
  | "reward_spent"
  | "daily_challenge_start"
  | "daily_challenge_complete"
  | "purchase"
  | "craft"
  | "checkin"
  | "leaderboard_view"
  | "chat_message"
  | "intervention_shown"
  | "personality_mode_change"
  | "profile_update"
  | "feature_used"
  | "register"
  | "page_view"
  // Social interaction events
  | "profile_view"
  | "leaderboard_view"
  | "share_action"
  | "team_join"
  | "social_chat"
  | "fusion_attempt"
  | "waste_rush_complete";

export interface EventMetadata {
  points_earned?: number;
  points_spent?: number;
  streak_days?: number;
  session_duration_seconds?: number;
  card_id?: number;
  card_rarity?: string;
  challenge_id?: number;
  score?: number;
  correct_count?: number;
  total_questions?: number;
  intervention_type?: string;
  feature_name?: string;
  personality_mode?: string;
  previous_personality?: string;
  eco_type?: string;
  scan_result?: string;
  [key: string]: unknown;
}

class EventLogger {
  private db = getDb();

  async log(
    userId: string,
    eventType: EventType,
    metadata: EventMetadata = {},
    sessionId?: number
  ): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.query(
        `INSERT INTO behavioral_events (user_id, event_type, session_id, metadata)
         VALUES ($1, $2, $3, $4)`,
        [userId, eventType, sessionId || null, JSON.stringify(metadata)]
      );
    } catch (e) {
      console.warn("[EventLogger] Failed to log:", eventType, (e as Error).message);
    }
  }

  async logLogin(userId: string, sessionId?: number): Promise<void> {
    await this.log(userId, "login", {}, sessionId);
  }

  async logLogout(userId: string, sessionDurationSeconds?: number, sessionId?: number): Promise<void> {
    await this.log(userId, "session_end", { session_duration_seconds: sessionDurationSeconds }, sessionId);
  }

  async logQuiz(
    userId: string,
    completed: boolean,
    score: number,
    correctCount: number,
    totalQuestions: number,
    sessionId?: number
  ): Promise<void> {
    await this.log(
      userId,
      completed ? "quiz_complete" : "quiz_start",
      { score, correct_count: correctCount, total_questions: totalQuestions },
      sessionId
    );
  }

  async logGarbageScan(
    userId: string,
    success: boolean,
    ecoType: string,
    sessionId?: number
  ): Promise<void> {
    await this.log(
      userId,
      success ? "scan_success" : "scan_garbage",
      { eco_type: ecoType },
      sessionId
    );
  }

  async logGacha(
    userId: string,
    cardId: number,
    isNew: boolean,
    rarity: string,
    sessionId?: number
  ): Promise<void> {
    await this.log(
      userId,
      isNew ? "gacha_new_card" : "gacha_duplicate",
      { card_id: cardId, card_rarity: rarity },
      sessionId
    );
  }

  async logCardBattle(
    userId: string,
    won: boolean,
    score: number,
    sessionId?: number
  ): Promise<void> {
    await this.log(
      userId,
      won ? "card_battle_win" : "card_battle_lose",
      { score },
      sessionId
    );
  }

  async logStreak(
    userId: string,
    days: number,
    broken: boolean,
    sessionId?: number
  ): Promise<void> {
    await this.log(
      userId,
      broken ? "streak_break" : "streak_update",
      { streak_days: days },
      sessionId
    );
  }

  async logReward(
    userId: string,
    earned: number,
    spent: number,
    reason: string,
    sessionId?: number
  ): Promise<void> {
    if (earned > 0) {
      await this.log(userId, "reward_claim", { points_earned: earned, reason }, sessionId);
    }
    if (spent > 0) {
      await this.log(userId, "reward_spent", { points_spent: spent, reason }, sessionId);
    }
  }

  async logDailyChallenge(
    userId: string,
    challengeId: number,
    completed: boolean,
    sessionId?: number
  ): Promise<void> {
    await this.log(
      userId,
      completed ? "daily_challenge_complete" : "daily_challenge_start",
      { challenge_id: challengeId },
      sessionId
    );
  }

  async logIntervention(
    userId: string,
    interventionType: string,
    metadata: EventMetadata = {}
  ): Promise<void> {
    await this.log(userId, "intervention_shown", { intervention_type: interventionType, ...metadata });
  }

  async logPersonalityChange(
    userId: string,
    previous: string,
    current: string
  ): Promise<void> {
    await this.log(userId, "personality_mode_change", {
      personality_mode: current,
      previous_personality: previous,
    });
  }

  async logFeatureUse(userId: string, featureName: string, metadata: EventMetadata = {}): Promise<void> {
    await this.log(userId, "feature_used", { feature_name: featureName, ...metadata });
  }

  async getEventCount(userId: string, eventType?: EventType): Promise<number> {
    if (!this.db) return 0;
    try {
      if (eventType) {
        const { rows } = await this.db.query(
          `SELECT COUNT(*) FROM behavioral_events WHERE user_id = $1 AND event_type = $2`,
          [userId, eventType]
        );
        return parseInt(rows[0]?.count || "0");
      } else {
        const { rows } = await this.db.query(
          `SELECT COUNT(*) FROM behavioral_events WHERE user_id = $1`,
          [userId]
        );
        return parseInt(rows[0]?.count || "0");
      }
    } catch {
      return 0;
    }
  }

  async getRecentEvents(userId: string, limit = 50): Promise<any[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(
        `SELECT event_type, timestamp, metadata FROM behavioral_events
         WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2`,
        [userId, limit]
      );
      return rows;
    } catch {
      return [];
    }
  }
}

export const eventLogger = new EventLogger();
