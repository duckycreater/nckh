/**
 * Waste Rush — Timed Real-Time Sorting Challenge
 *
 * 60-second speed sorting challenge:
 * - Timer countdown với visual pressure
 * - Points: base 10 × streak_multiplier × time_bonus
 * - Combo system: đúng liên tiếp tăng multiplier (x1 → x2 → x3 → x4 max)
 * - Miss resets combo
 * - End-of-day leaderboard cho top challengers
 * - Weekly tournament với bonus rewards
 *
 * Scientific basis:
 * - Operant Conditioning (Skinner): Variable ratio schedule với immediate feedback
 * - Flow Theory (Csikszentmihalyi): Challenge/skill balance trong timed mode
 * - Stress response: Measure reaction time như proxy cho engagement intensity
 */

import { getDb } from "../db.js";
import { bmoCare } from "./bmoCare.js";
import { behavioralProfiler } from "./behavioralProfiler.js";
import { eventLogger } from "./eventLogger.js";

export type WasteCategory = "plastic" | "paper" | "glass" | "metal" | "organic" | "hazard";

export interface RushItem {
  id: string;
  name: string;
  emoji: string;
  category: WasteCategory;
  correctBin: WasteCategory;
  hint: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface RushSession {
  sessionId: string;
  odUserId: string;
  odStartTime: Date;
  odItems: RushItem[];
  odCurrentIndex: number;
  odScore: number;
  odCombo: number;
  odMaxCombo: number;
  odCorrect: number;
  odWrong: number;
  odTimeBonus: number;
  odFinished: boolean;
  odFinalScore: number;
}

export interface RushResult {
  sessionId: string;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  maxCombo: number;
  avgReactionTime: number;
  bonusMultiplier: number;
  bmoResult: import("./bmoCare.js").BmoInteractionResult;
  rank: number;          // rank among today's challengers
  percentile: number;      // top X%
}

export const RUSH_CATEGORIES: Record<WasteCategory, { binColor: string; binEmoji: string }> = {
  plastic: { binColor: "#06b6d4", binEmoji: "🟦" },
  paper: { binColor: "#f59e0b", binEmoji: "🟨" },
  glass: { binColor: "#14b8a6", binEmoji: "🟩" },
  metal: { binColor: "#64748b", binEmoji: "⬜" },
  organic: { binColor: "#22c55e", binEmoji: "🟩" },
  hazard: { binColor: "#ef4444", binEmoji: "🟥" },
};

export const RUSH_ITEMS: RushItem[] = [
  // PLASTIC
  { id: "r1", name: "Chai nhựa PET", emoji: "🧴", category: "plastic", correctBin: "plastic", hint: "Nhựa có ký hiệu ♻️", difficulty: "easy" },
  { id: "r2", name: "Túi nilon", emoji: "🛍️", category: "plastic", correctBin: "plastic", hint: "Nhựa mềm", difficulty: "easy" },
  { id: "r3", name: "Ống hút nhựa", emoji: "🥤", category: "plastic", correctBin: "plastic", hint: "Nhựa dùng một lần", difficulty: "easy" },
  { id: "r4", name: "Nắp chai nhựa", emoji: "🔹", category: "plastic", correctBin: "plastic", hint: "Nhựa có thể tái chế", difficulty: "easy" },
  { id: "r5", name: "Hộp cơm nhựa", emoji: "🥡", category: "plastic", correctBin: "plastic", hint: "Hộp nhựa dùng một lần", difficulty: "easy" },
  { id: "r6", name: "Bình xịt nước", emoji: "🚿", category: "plastic", correctBin: "hazard", hint: "Có hóa chất bên trong", difficulty: "hard" },
  { id: "r7", name: "Bong bóng", emoji: "🎈", category: "plastic", correctBin: "plastic", hint: "Nhựa mỏng", difficulty: "easy" },
  { id: "r8", name: "Vỏ bút chì", emoji: "✏️", category: "plastic", correctBin: "plastic", hint: "Vỏ nhựa bút", difficulty: "easy" },
  // PAPER
  { id: "r9", name: "Giấy báo", emoji: "📰", category: "paper", correctBin: "paper", hint: "Giấy tái chế được", difficulty: "easy" },
  { id: "r10", name: "Sách giáo khoa", emoji: "📚", category: "paper", correctBin: "paper", hint: "Sách cũ có thể tái sử dụng", difficulty: "easy" },
  { id: "r11", name: "Giấy gói quà", emoji: "🎁", category: "paper", correctBin: "paper", hint: "Giấy trang trí", difficulty: "easy" },
  { id: "r12", name: "Giấy ăn", emoji: "🧻", category: "paper", correctBin: "organic", hint: "Đã sử dụng, ướt", difficulty: "medium" },
  { id: "r13", name: "Giấy lót", emoji: "🥧", category: "paper", correctBin: "organic", hint: "Dính dầu/thức ăn", difficulty: "medium" },
  { id: "r14", name: "Sách nấu ăn", emoji: "🍳", category: "paper", correctBin: "paper", hint: "Sách giấy", difficulty: "easy" },
  { id: "r15", name: "Bìa cứng", emoji: "📦", category: "paper", correctBin: "paper", hint: "Carton có thể tái chế", difficulty: "easy" },
  // GLASS
  { id: "r16", name: "Chai bia", emoji: "🍺", category: "glass", correctBin: "glass", hint: "Thủy tinh có thể tái chế", difficulty: "easy" },
  { id: "r17", name: "Chai nước ngọt", emoji: "🥤", category: "glass", correctBin: "glass", hint: "Chai thủy tinh", difficulty: "easy" },
  { id: "r18", name: "Lọ hoa", emoji: "🏺", category: "glass", correctBin: "glass", hint: "Đồ thủy tinh trang trí", difficulty: "easy" },
  { id: "r19", name: "Bóng đèn", emoji: "💡", category: "glass", correctBin: "hazard", hint: "Có thể chứa thủy ngân", difficulty: "medium" },
  { id: "r20", name: "Kính mắt", emoji: "👓", category: "glass", correctBin: "hazard", hint: "Cần xử lý đặc biệt", difficulty: "hard" },
  // METAL
  { id: "r21", name: "Lon nước ngọt", emoji: "🥫", category: "metal", correctBin: "metal", hint: "Hộp kim loại có thể tái chế", difficulty: "easy" },
  { id: "r22", name: "Nắp chai sắt", emoji: "🔩", category: "metal", correctBin: "metal", hint: "Sắt/kim loại", difficulty: "easy" },
  { id: "r23", name: "Đỡ giày", emoji: "👟", category: "metal", correctBin: "plastic", hint: "Đế giày bằng cao su", difficulty: "medium" },
  { id: "r24", name: "Pin", emoji: "🔋", category: "metal", correctBin: "hazard", hint: "Có chất độc hại", difficulty: "medium" },
  { id: "r25", name: "Kem tiêm", emoji: "💉", category: "metal", correctBin: "hazard", hint: "Vật y tế nguy hiểm", difficulty: "hard" },
  // ORGANIC
  { id: "r26", name: "Vỏ cam", emoji: "🍊", category: "organic", correctBin: "organic", hint: "Phế phẩm nông nghiệp", difficulty: "easy" },
  { id: "r27", name: "Vỏ chuối", emoji: "🍌", category: "organic", correctBin: "organic", hint: "Rác hữu cơ", difficulty: "easy" },
  { id: "r28", name: "Lá cây", emoji: "🍂", category: "organic", correctBin: "organic", hint: "Phân compost được", difficulty: "easy" },
  { id: "r29", name: "Xương gà", emoji: "🍗", category: "organic", correctBin: "organic", hint: "Thức ăn thừa", difficulty: "easy" },
  { id: "r30", name: "Vỏ trứng", emoji: "🥚", category: "organic", correctBin: "organic", hint: "Có thể làm phân bón", difficulty: "easy" },
  // HAZARD
  { id: "r31", name: "Pin", emoji: "🔋", category: "hazard", correctBin: "hazard", hint: "Rác điện tử nguy hại", difficulty: "medium" },
  { id: "r32", name: "Bóng đèn huỳnh quang", emoji: "💡", category: "hazard", correctBin: "hazard", hint: "Có thủy ngân", difficulty: "medium" },
  { id: "r33", name: "Sơn", emoji: "🎨", category: "hazard", correctBin: "hazard", hint: "Hóa chất độc hại", difficulty: "medium" },
  { id: "r34", name: "Thuốc trừ sâu", emoji: "☠️", category: "hazard", correctBin: "hazard", hint: "Hóa chất nguy hiểm", difficulty: "hard" },
  { id: "r35", name: "Lọ thuốc hết hạn", emoji: "💊", category: "hazard", correctBin: "hazard", hint: "Thuốc không dùng được", difficulty: "medium" },
];

const RUSH_DURATION_MS = 60_000;
const BASE_POINTS = 10;
const COMBO_THRESHOLDS = [1, 3, 5, 8]; // combo levels: 0→1, 3→2, 5→3, 8→4
const COMBO_MULTIPLIERS = [1, 2, 3, 4]; // x1, x2, x3, x4

function getComboMultiplier(combo: number): number {
  for (let i = COMBO_THRESHOLDS.length - 1; i >= 0; i--) {
    if (combo >= COMBO_THRESHOLDS[i]) return COMBO_MULTIPLIERS[i];
  }
  return 1;
}

function getTimeBonus(remainingMs: number): number {
  // More time remaining = bigger bonus (up to 1.5x)
  const pct = remainingMs / RUSH_DURATION_MS;
  return 1 + pct * 0.5;
}

function getRandomItems(count: number): RushItem[] {
  const shuffled = [...RUSH_ITEMS].sort(() => Math.random() - 0.5);
  const result: RushItem[] = [];
  let idx = 0;
  while (result.length < count) {
    result.push(shuffled[idx % shuffled.length]);
    idx++;
  }
  return result.sort(() => Math.random() - 0.5);
}

class WasteRush {
  private db = getDb();
  private sessions = new Map<string, RushSession>();

  /**
   * Start a new Rush challenge session.
   */
  startSession(userId: string): RushSession {
    const sessionId = `rush_${userId}_${Date.now()}`;
    const session: RushSession = {
      sessionId,
      odUserId: userId,
      odStartTime: new Date(),
      odItems: getRandomItems(20),
      odCurrentIndex: 0,
      odScore: 0,
      odCombo: 0,
      odMaxCombo: 0,
      odCorrect: 0,
      odWrong: 0,
      odTimeBonus: 0,
      odFinished: false,
      odFinalScore: 0,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get a session by ID.
   */
  getSession(sessionId: string): RushSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Submit an answer for the current item.
   * Returns null if session not found or already finished.
   */
  submitAnswer(
    sessionId: string,
    userAnswer: WasteCategory,
    reactionTimeMs: number
  ): {
    correct: boolean;
    session: RushSession;
    pointsEarned: number;
    newCombo: number;
    isSessionOver: boolean;
    currentItem: RushItem | null;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.odFinished) return null;

    const currentItem = session.odItems[session.odCurrentIndex];
    const correct = userAnswer === currentItem.correctBin;

    if (correct) {
      session.odCombo++;
      session.odCorrect++;
      if (session.odCombo > session.odMaxCombo) {
        session.odMaxCombo = session.odCombo;
      }
      const comboMult = getComboMultiplier(session.odCombo);
      const timeBonus = getTimeBonus(RUSH_DURATION_MS - (Date.now() - session.odStartTime.getTime()));
      const points = Math.round(BASE_POINTS * comboMult * timeBonus);
      session.odScore += points;
      session.odTimeBonus += timeBonus;
    } else {
      session.odCombo = 0; // Reset combo on wrong
      session.odWrong++;
    }

    session.odCurrentIndex++;

    // Check if session is over
    const elapsed = Date.now() - session.odStartTime.getTime();
    const isSessionOver = elapsed >= RUSH_DURATION_MS || session.odCurrentIndex >= session.odItems.length;

    if (isSessionOver) {
      session.odFinished = true;
      session.odFinalScore = session.odScore;
    }

    this.sessions.set(sessionId, session);

    return {
      correct,
      session,
      pointsEarned: correct ? Math.round(BASE_POINTS * getComboMultiplier(correct ? session.odCombo : 0) * getTimeBonus(RUSH_DURATION_MS - elapsed)) : 0,
      newCombo: session.odCombo,
      isSessionOver,
      currentItem: isSessionOver ? null : session.odItems[session.odCurrentIndex],
    };
  }

  /**
   * Finish a session and get results.
   */
  async finishSession(sessionId: string, userId: string): Promise<RushResult | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.odFinished = true;
    session.odFinalScore = session.odScore;

    // Get BMO mood effect
    const streakDays = await this.getStreakDays(userId);
    const isFirstToday = await this.isFirstSortToday(userId);
    const bmoResult = await bmoCare.onCorrectSort(userId, streakDays, isFirstToday);

    // Calculate rank
    const { rank, percentile } = await this.getTodayRanking(userId, session.odScore);

    // Save to DB
    await this.saveSession(session);

    // Log event
    if (this.db) {
      try {
        await eventLogger.log(userId, "waste_rush_complete", {
          score: session.odScore,
          correct: session.odCorrect,
          wrong: session.odWrong,
          maxCombo: session.odMaxCombo,
          bmoMoodScore: bmoResult.moodScore,
        });
      } catch (e) {
        console.warn("[WasteRush] Failed to log event:", (e as Error).message);
      }
    }

    return {
      sessionId,
      totalScore: session.odFinalScore,
      correctCount: session.odCorrect,
      wrongCount: session.odWrong,
      maxCombo: session.odMaxCombo,
      avgReactionTime: 0, // computed on frontend
      bonusMultiplier: bmoResult.bonusMultiplier,
      bmoResult,
      rank,
      percentile,
    };
  }

  /**
   * Get today's top Rush scores.
   */
  async getTodayLeaderboard(limit = 10): Promise<Array<{ odUserId: string; odScore: number; timestamp: Date }>> {
    if (!this.db) return [];
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { rows } = await this.db.query(
        `SELECT user_id, MAX((metadata->>'score')::int) as best_score, MAX(timestamp) as ts
         FROM behavioral_events
         WHERE event_type = 'waste_rush_complete'
           AND timestamp >= $1
         GROUP BY user_id
         ORDER BY best_score DESC
         LIMIT $2`,
        [today, limit]
      );
      return rows.map((r) => ({
        odUserId: r.user_id,
        odScore: r.best_score,
        timestamp: r.ts,
      }));
    } catch {
      return [];
    }
  }

  private async getTodayRanking(userId: string, score: number): Promise<{ rank: number; percentile: number }> {
    if (!this.db) return { rank: 1, percentile: 100 };
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { rows } = await this.db.query(
        `SELECT COUNT(DISTINCT user_id) as total FROM behavioral_events
         WHERE event_type = 'waste_rush_complete' AND timestamp >= $1`,
        [today]
      );
      const total = parseInt(rows[0]?.total || "0");
      const { rows: rankRows } = await this.db.query(
        `SELECT COUNT(DISTINCT user_id) as above FROM (
           SELECT user_id, MAX((metadata->>'score')::int) as best_score
           FROM behavioral_events
           WHERE event_type = 'waste_rush_complete' AND timestamp >= $1
           GROUP BY user_id
         ) sub WHERE best_score > $2`,
        [today, score]
      );
      const above = parseInt(rankRows[0]?.above || "0");
      const rank = above + 1;
      const percentile = total > 0 ? Math.round(((total - above) / total) * 100) : 100;
      return { rank, percentile };
    } catch {
      return { rank: 1, percentile: 100 };
    }
  }

  private async saveSession(session: RushSession): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.query(
        `INSERT INTO waste_rush_sessions
         (session_id, user_id, score, correct, wrong, max_combo, duration_ms, finished_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (session_id) DO UPDATE SET
           score = $3, correct = $4, wrong = $5, max_combo = $6, finished_at = NOW()`,
        [session.sessionId, session.odUserId, session.odFinalScore,
         session.odCorrect, session.odWrong, session.odMaxCombo, RUSH_DURATION_MS]
      );
    } catch (e) {
      console.warn("[WasteRush] Failed to save session:", (e as Error).message);
    }
  }

  private async getStreakDays(userId: string): Promise<number> {
    try {
      const { rows } = await this.db!.query(
        `SELECT streak_days FROM user_progress WHERE user_id = $1`,
        [userId]
      );
      return rows[0]?.streak_days || 1;
    } catch {
      return 1;
    }
  }

  private async isFirstSortToday(userId: string): Promise<boolean> {
    if (!this.db) return true;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { rows } = await this.db.query(
        `SELECT COUNT(*) FROM behavioral_events
         WHERE user_id = $1 AND event_type = 'waste_rush_complete' AND timestamp >= $2`,
        [userId, today]
      );
      return parseInt(rows[0]?.count || "0") === 0;
    } catch {
      return true;
    }
  }
}

export const wasteRush = new WasteRush();
