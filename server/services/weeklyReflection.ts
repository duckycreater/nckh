/**
 * AI Weekly Reflection System v2 - Personality-Aware + Reflection Effectiveness Tracking
 *
 * Level 5 reflection system:
 * - Personality-aware reflection styles (4 modes)
 * - Saves to reflection_outcomes table for effectiveness tracking
 * - Logs to behavioral_events for longitudinal analysis
 * - Generates reflective reinforcement (behavioral cognition)
 */

import { getDb } from "../db.js";
import { GoogleGenAI } from "@google/genai";
import { personalityEngine } from "./personalityEngine.js";
import { eventLogger } from "./eventLogger.js";

export interface WeeklyReflection {
  userId: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  reflectionText: string;
  stats: {
    pointsEarned: number;
    itemsRecycled: number;
    challengesCompleted: number;
    sessionsCount: number;
    streakDays: number;
    improvement: number;
  };
}

const REFLECTION_STYLES: Record<string, string> = {
  friendly: "Buon qua! {name}, {positive}. Diem so {imp} so voi tuan truoc. Tiep tuc phat huy nhé!",
  competitive: "{name}, ban dang thua {rival}. {challenge}. {imp}. Comeback now!",
  mentor: "Xin chao {name}. Tuan nay ban dat {achievement}. {feedback}. Tiep tuc co gang nhe.",
  playful: "Yooo {name}! {achievement} that was {impressive}! {imp} fr fr! LFG!",
};

class WeeklyReflectionGenerator {
  private db = getDb();
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async generateWeeklyReflections(): Promise<void> {
    if (!this.db) return;

    const now = new Date();
    const weekEnd = new Date(now);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekNumber = this.getWeekNumber(weekStart);

    try {
      const { rows } = await this.db.query(
        `SELECT DISTINCT user_id FROM behavioral_events WHERE timestamp > $1`,
        [weekStart.toISOString()]
      );

      for (const row of rows) {
        const userId = row.user_id;
        const stats = await this.computeWeeklyStats(userId, weekStart, weekEnd);
        const reflection = await this.generateReflection(userId, stats, weekNumber);
        await this.saveReflection(reflection);
        // Log reflection delivery for behavioral analysis
        await eventLogger.logFeatureUse(userId, "weekly_reflection_delivered", {
          weekNumber,
          reflection_style: await this.getPersonalityForReflection(userId),
          ...stats,
        });
      }

      console.log(`[WeeklyReflection] Generated reflections for ${rows.length} users.`);
    } catch (e) {
      console.warn("[WeeklyReflection] Failed to generate reflections:", (e as Error).message);
    }
  }

  async generateUserReflection(userId: string): Promise<WeeklyReflection | null> {
    const now = new Date();
    const weekEnd = now;
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekNumber = this.getWeekNumber(weekStart);

    try {
      const stats = await this.computeWeeklyStats(userId, weekStart, weekEnd);
      const reflection = await this.generateReflection(userId, stats, weekNumber);
      await this.saveReflection(reflection);
      await eventLogger.logFeatureUse(userId, "weekly_reflection_delivered", {
        weekNumber,
        reflection_style: await this.getPersonalityForReflection(userId),
        ...stats,
      });
      return reflection;
    } catch (e) {
      console.warn("[WeeklyReflection] Failed for user:", userId, (e as Error).message);
      return null;
    }
  }

  private async getPersonalityForReflection(userId: string): Promise<string> {
    try {
      return await personalityEngine.getPersonality(userId);
    } catch {
      return "friendly";
    }
  }

  private async computeWeeklyStats(
    userId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<WeeklyReflection["stats"]> {
    if (!this.db) {
      return { pointsEarned: 0, itemsRecycled: 0, challengesCompleted: 0, sessionsCount: 0, streakDays: 0, improvement: 0 };
    }

    try {
      const [pointsData, scanData, challengeData, sessionData, streakData, prevPointsData] = await Promise.all([
        this.db.query(
          `SELECT SUM((metadata->>'points_earned')::float) as earned FROM behavioral_events
           WHERE user_id = $1 AND event_type = 'reward_claim' AND timestamp BETWEEN $2 AND $3`,
          [userId, weekStart.toISOString(), weekEnd.toISOString()]
        ),
        this.db.query(
          `SELECT COUNT(*) as scans FROM behavioral_events
           WHERE user_id = $1 AND event_type IN ('scan_success', 'scan_garbage') AND timestamp BETWEEN $2 AND $3`,
          [userId, weekStart.toISOString(), weekEnd.toISOString()]
        ),
        this.db.query(
          `SELECT COUNT(*) as challenges FROM behavioral_events
           WHERE user_id = $1 AND event_type = 'daily_challenge_complete' AND timestamp BETWEEN $2 AND $3`,
          [userId, weekStart.toISOString(), weekEnd.toISOString()]
        ),
        this.db.query(
          `SELECT COUNT(*) as sessions FROM research_sessions
           WHERE user_id = $1 AND started_at BETWEEN $2 AND $3`,
          [userId, weekStart.toISOString(), weekEnd.toISOString()]
        ),
        this.db.query(
          `SELECT MAX((metadata->>'streak_days')::int) as streak FROM behavioral_events
           WHERE user_id = $1 AND event_type = 'streak_update' AND timestamp BETWEEN $2 AND $3`,
          [userId, weekStart.toISOString(), weekEnd.toISOString()]
        ),
        this.db.query(
          `SELECT SUM((metadata->>'points_earned')::float) as earned FROM behavioral_events
           WHERE user_id = $1 AND event_type = 'reward_claim' AND timestamp BETWEEN $2 AND $3`,
          [userId, new Date(weekStart.getTime() - 7 * 86400000).toISOString(), weekStart.toISOString()]
        ),
      ]);

      const pointsEarned = parseFloat(pointsData.rows[0]?.earned || "0");
      const prevPoints = parseFloat(prevPointsData.rows[0]?.earned || "0");
      const improvement = prevPoints > 0 ? ((pointsEarned - prevPoints) / prevPoints) * 100 : pointsEarned > 0 ? 100 : 0;

      return {
        pointsEarned: Math.round(pointsEarned),
        itemsRecycled: parseInt(scanData.rows[0]?.scans || "0"),
        challengesCompleted: parseInt(challengeData.rows[0]?.challenges || "0"),
        sessionsCount: parseInt(sessionData.rows[0]?.sessions || "0"),
        streakDays: parseInt(streakData.rows[0]?.streak || "1"),
        improvement: Math.round(improvement),
      };
    } catch (e) {
      console.warn("[WeeklyReflection] Failed to compute stats:", (e as Error).message);
      return { pointsEarned: 0, itemsRecycled: 0, challengesCompleted: 0, sessionsCount: 0, streakDays: 0, improvement: 0 };
    }
  }

  private async generateReflection(
    userId: string,
    stats: WeeklyReflection["stats"],
    weekNumber: number
  ): Promise<WeeklyReflection> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekEnd = new Date();

    const personality = await this.getPersonalityForReflection(userId);
    let reflectionText = "";

    if (this.ai) {
      try {
        const imp = stats.improvement > 0
          ? `Tang ${stats.improvement}% so voi tuan truoc`
          : stats.improvement < 0
          ? `Giam ${Math.abs(stats.improvement)}% so voi tuan truoc`
          : "Giu nguyen so voi tuan truoc";

        const prompt = `Ban la Robot Sieu Cap Xanh voi personality "${personality}".

So lieu tuan nay:
- Diem kiem duoc: ${stats.pointsEarned}
- So lan quet rac: ${stats.itemsRecycled}
- Thu thach hoan thanh: ${stats.challengesCompleted}
- So lan dang nhap: ${stats.sessionsCount}
- Streak hien tai: ${stats.streakDays} ngay
- Cải thien so voi tuan truoc: ${imp}

Hay viet 2-3 cau tieng Viet, theo giong personality "${personality}".
Chu y:
- Tuong thich voi personality: friendly(than thien), competitive(thach thuc), mentor(huong dan), playful(fun meme)
- Ngan gon 2-3 cau
- Co emoji
- Khong qua 150 tu
- Tap trung vao ${stats.pointsEarned > 0 ? "thanh tich cu the" : "tinh than chi bao"}.`;

        const response = await this.ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ text: prompt }],
        });

        reflectionText = response.text?.trim() || this.getDefaultReflection(stats);
      } catch (e) {
        console.warn("[WeeklyReflection] AI generation failed:", (e as Error).message);
        reflectionText = this.getDefaultReflection(stats);
      }
    } else {
      reflectionText = this.getDefaultReflection(stats);
    }

    return {
      userId,
      weekNumber,
      weekStart: weekStart.toISOString().split("T")[0],
      weekEnd: weekEnd.toISOString().split("T")[0],
      reflectionText,
      stats,
    };
  }

  private getDefaultReflection(stats: WeeklyReflection["stats"]): string {
    const imp = stats.improvement > 0
      ? `Tang ${stats.improvement}%`
      : stats.improvement < 0
      ? `Giam ${Math.abs(stats.improvement)}%`
      : "Giu nguyen";
    return `Tuyet voi! Tuan nay ban kiem duoc ${stats.pointsEarned} diem, hoan thanh ${stats.challengesCompleted} thu thach. Diem so ${imp} so voi tuan truoc. Tiep tuc phat huy!`;
  }

  private async saveReflection(reflection: WeeklyReflection): Promise<void> {
    if (!this.db) return;
    try {
      const { rows } = await this.db.query(
        `INSERT INTO ai_reflections (user_id, reflection_text, week_number, week_start, week_end)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, week_number) DO UPDATE SET reflection_text = $2, generated_at = NOW()
         RETURNING id`,
        [reflection.userId, reflection.reflectionText, reflection.weekNumber, reflection.weekStart, reflection.weekEnd]
      );
    } catch (e) {
      console.warn("[WeeklyReflection] Failed to save:", (e as Error).message);
    }
  }

  async getLatestReflection(userId: string): Promise<WeeklyReflection | null> {
    if (!this.db) return null;
    try {
      const { rows } = await this.db.query(
        `SELECT reflection_text, week_number, week_start, week_end, generated_at
         FROM ai_reflections WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 1`,
        [userId]
      );
      if (rows.length > 0) {
        const r = rows[0];
        return {
          userId,
          weekNumber: r.week_number,
          weekStart: r.week_start,
          weekEnd: r.week_end,
          reflectionText: r.reflection_text,
          stats: { pointsEarned: 0, itemsRecycled: 0, challengesCompleted: 0, sessionsCount: 0, streakDays: 0, improvement: 0 },
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  private getWeekNumber(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    return Math.ceil((diff + start.getDay() * 86400000) / (7 * 86400000));
  }
}

export const weeklyReflectionGenerator = new WeeklyReflectionGenerator();
