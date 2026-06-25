/**
 * BMO Care — Virtual Pet System
 *
 * Robot BMO có mood/affection score ảnh hưởng đến:
 * - Trạng thái hiển thị của BMO (animations, expressions)
 * - Bonus points khi mood cao
 * - Unlock accessories khi đạt milestone streaks
 * - Emotional HMI feedback cho human-robot interaction
 *
 * Scientific basis:
 * - Self-Determination Theory (Deci & Ryan): Competence + Relatedness
 * - Social Cognitive Theory (Bandura): Vicarious experience through BMO's emotional states
 * - Operant Conditioning (Skinner): Mood acts as a variable reinforcement signal
 */

import { getDb } from "../db.js";
import { eventLogger } from "./eventLogger.js";

export type BmoMoodLevel = "critical" | "sad" | "neutral" | "happy" | "excited";

export interface BmoCareState {
  userId: string;
  moodScore: number;        // 0-100, start at 50
  moodLevel: BmoMoodLevel;
  currentAccessories: string[];
  unlockedAccessories: string[];
  lastInteraction: Date;
  totalInteractions: number;
  longestStreakMood: number;  // highest mood streak achieved
  moodHistory: number[];      // last 30 daily mood scores
}

export interface BmoInteractionResult {
  moodScore: number;
  moodLevel: BmoMoodLevel;
  moodChange: number;
  isNewAccessory: boolean;
  newAccessory: string | null;
  moodMessage: string;
  bonusMultiplier: number;  // applied to next points reward
}

export interface BmoAccessory {
  id: string;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  emoji: string;
  requiredStreak: number;  // streak days needed to unlock
  moodThreshold: number;   // minimum mood score needed
  visualVariant: string;    // CSS class or color for BMO display
}

export const BMO_ACCESSORIES: BmoAccessory[] = [
  {
    id: "crown",
    name: "Royal Crown",
    nameVi: "Vương Miện Hoàng Gia",
    description: "BMO wears a tiny golden crown",
    descriptionVi: "BMO đội vương miện vàng",
    emoji: "👑",
    requiredStreak: 7,
    moodThreshold: 40,
    visualVariant: "accessory-crown",
  },
  {
    id: "sunglasses",
    name: "Cool Shades",
    nameVi: "Kính Râm Ngầu",
    description: "BMO sports stylish sunglasses",
    descriptionVi: "BMO đeo kính râm cool ngầu",
    emoji: "🕶️",
    requiredStreak: 14,
    moodThreshold: 50,
    visualVariant: "accessory-sunglasses",
  },
  {
    id: "hat_blue",
    name: "Blue Cap",
    nameVi: "Mũ Nón Xanh Dương",
    description: "A fresh blue baseball cap",
    descriptionVi: "Mũ lưỡi trai màu xanh dương",
    emoji: "🧢",
    requiredStreak: 21,
    moodThreshold: 55,
    visualVariant: "accessory-hat-blue",
  },
  {
    id: "bowtie",
    name: "Classy Bowtie",
    nameVi: "Nơ Cổ Lịch Sự",
    description: "BMO looks dapper with a bowtie",
    descriptionVi: "BMO trông lịch sự với chiếc nơ",
    emoji: "🎀",
    requiredStreak: 30,
    moodThreshold: 60,
    visualVariant: "accessory-bowtie",
  },
  {
    id: "halo",
    name: "Angel Halo",
    nameVi: "Hào Quang Thiên Thần",
    description: "A glowing golden halo appears above BMO",
    descriptionVi: "Vầng hào quang vàng rực rỡ xuất hiện trên đầu BMO",
    emoji: "😇",
    requiredStreak: 45,
    moodThreshold: 65,
    visualVariant: "accessory-halo",
  },
  {
    id: "cape",
    name: "Hero Cape",
    nameVi: "Áo Choàng Siêu Anh Hùng",
    description: "BMO becomes a superhero!",
    descriptionVi: "BMO trở thành siêu anh hùng!",
    emoji: "🦸",
    requiredStreak: 60,
    moodThreshold: 70,
    visualVariant: "accessory-cape",
  },
  {
    id: "crystal",
    name: "Crystal Crown",
    nameVi: "Vương Miện Pha Lê",
    description: "A majestic crystal crown for legendary BMO",
    descriptionVi: "Vương miện pha lê huyền bí cho BMO huyền thoại",
    emoji: "💎",
    requiredStreak: 90,
    moodThreshold: 75,
    visualVariant: "accessory-crystal",
  },
];

const MAX_MOOD = 100;
const START_MOOD = 50;
const MOOD_DECAY_PER_DAY = 2;
const MOOD_GAIN_CORRECT = 5;    // base mood gain for correct sorting
const MOOD_GAIN_CORRECT_VAR = 3; // variance: random(5-8)
const MOOD_LOSS_WRONG = 2;        // base mood loss for wrong sorting
const MOOD_LOSS_WRONG_VAR = 1;    // variance: random(1-3)
const MOOD_STREAK_BONUS = 0.5;   // bonus mood per streak day

function computeMoodLevel(score: number): BmoMoodLevel {
  if (score >= 80) return "excited";
  if (score >= 60) return "happy";
  if (score >= 40) return "neutral";
  if (score >= 20) return "sad";
  return "critical";
}

function getMoodMessage(level: BmoMoodLevel, prevLevel: BmoMoodLevel, moodChange: number): string {
  if (moodChange > 0) {
    if (level === "excited" && prevLevel !== "excited") return "BMO is THRIVING! 🌟";
    if (level === "happy" && prevLevel === "neutral") return "BMO is feeling great! 😊";
    if (level === "happy" && prevLevel === "sad") return "BMO is cheering up! 💚";
    return "BMO appreciated that! ✨";
  } else if (moodChange < 0) {
    if (level === "sad" && prevLevel !== "sad") return "BMO looks a bit down... 🥺";
    if (level === "critical") return "BMO really misses you... 💔";
    return "BMO felt that wasn't right... 😕";
  }
  return "BMO is staying steady 😐";
}

function getBonusMultiplier(moodScore: number): number {
  if (moodScore >= 90) return 1.5;
  if (moodScore >= 75) return 1.3;
  if (moodScore >= 60) return 1.2;
  if (moodScore >= 40) return 1.0;
  if (moodScore >= 20) return 0.9;
  return 0.8;
}

class BmoCare {
  private db = getDb();

  /**
   * Initialize BMO care state for a new user.
   */
  async initUser(userId: string): Promise<BmoCareState> {
    const state: BmoCareState = {
      userId,
      moodScore: START_MOOD,
      moodLevel: "neutral",
      currentAccessories: [],
      unlockedAccessories: [],
      lastInteraction: new Date(),
      totalInteractions: 0,
      longestStreakMood: 0,
      moodHistory: [START_MOOD],
    };
    await this.saveState(state);
    return state;
  }

  /**
   * Get current BMO care state for a user.
   */
  async getState(userId: string): Promise<BmoCareState | null> {
    if (!this.db) {
      return this.getLocalState(userId);
    }
    try {
      const { rows } = await this.db.query(
        `SELECT bmo_care_state FROM user_bmo_care WHERE user_id = $1`,
        [userId]
      );
      if (rows.length === 0) return null;
      const state = rows[0].bmo_care_state;
      return {
        userId,
        moodScore: state.moodScore,
        moodLevel: computeMoodLevel(state.moodScore),
        currentAccessories: state.currentAccessories || [],
        unlockedAccessories: state.unlockedAccessories || [],
        lastInteraction: state.lastInteraction ? new Date(state.lastInteraction) : new Date(),
        totalInteractions: state.totalInteractions || 0,
        longestStreakMood: state.longestStreakMood || 0,
        moodHistory: state.moodHistory || [START_MOOD],
      };
    } catch {
      return null;
    }
  }

  /**
   * Get or create BMO care state.
   */
  async getOrCreateState(userId: string): Promise<BmoCareState> {
    const existing = await this.getState(userId);
    if (existing) return existing;
    return this.initUser(userId);
  }

  /**
   * Process a correct waste sorting action.
   * Called when user correctly sorts waste.
   */
  async onCorrectSort(
    userId: string,
    streakDays: number,
    isFirstToday: boolean
  ): Promise<BmoInteractionResult> {
    const state = await this.getOrCreateState(userId);
    const prevLevel = state.moodLevel;

    // Apply mood decay from last interaction
    const daysSince = this.getDaysSince(state.lastInteraction);
    const decay = daysSince * MOOD_DECAY_PER_DAY;
    let moodScore = Math.max(0, state.moodScore - decay);

    // Correct sorting: mood increases
    const gain = MOOD_GAIN_CORRECT + Math.floor(Math.random() * MOOD_GAIN_CORRECT_VAR);
    const streakBonus = streakDays * MOOD_STREAK_BONUS;
    const firstBonus = isFirstToday ? 5 : 0;
    moodScore = Math.min(MAX_MOOD, moodScore + gain + streakBonus + firstBonus);

    const moodLevel = computeMoodLevel(moodScore);
    const moodChange = moodScore - state.moodScore;

    // Check for new accessory unlock
    let newAccessory: string | null = null;
    let isNewAccessory = false;
    if (!state.unlockedAccessories.includes("crown") && streakDays >= 7 && moodScore >= 40) {
      newAccessory = "crown";
      isNewAccessory = true;
    } else {
      for (const acc of BMO_ACCESSORIES) {
        if (!state.unlockedAccessories.includes(acc.id) &&
            streakDays >= acc.requiredStreak &&
            moodScore >= acc.moodThreshold) {
          newAccessory = acc.id;
          isNewAccessory = true;
          break;
        }
      }
    }

    const updatedAccessories = isNewAccessory && newAccessory
      ? [...state.unlockedAccessories, newAccessory]
      : state.unlockedAccessories;

    // Update longest streak mood
    const longestStreakMood = Math.max(state.longestStreakMood, moodScore);

    // Append to mood history (keep last 30)
    const moodHistory = [...state.moodHistory, moodScore].slice(-30);

    const updatedState: BmoCareState = {
      ...state,
      moodScore,
      moodLevel,
      unlockedAccessories: updatedAccessories,
      lastInteraction: new Date(),
      totalInteractions: state.totalInteractions + 1,
      longestStreakMood,
      moodHistory,
    };

    await this.saveState(updatedState);

    return {
      moodScore,
      moodLevel,
      moodChange,
      isNewAccessory,
      newAccessory,
      moodMessage: getMoodMessage(moodLevel, prevLevel, moodChange),
      bonusMultiplier: getBonusMultiplier(moodScore),
    };
  }

  /**
   * Process an incorrect waste sorting action.
   */
  async onWrongSort(userId: string): Promise<BmoInteractionResult> {
    const state = await this.getOrCreateState(userId);
    const prevLevel = state.moodLevel;

    const daysSince = this.getDaysSince(state.lastInteraction);
    const decay = daysSince * MOOD_DECAY_PER_DAY;
    let moodScore = Math.max(0, state.moodScore - decay);

    const loss = MOOD_LOSS_WRONG + Math.floor(Math.random() * MOOD_LOSS_WRONG_VAR);
    moodScore = Math.max(0, moodScore - loss);

    const moodLevel = computeMoodLevel(moodScore);
    const moodChange = moodScore - state.moodScore;

    const updatedState: BmoCareState = {
      ...state,
      moodScore,
      moodLevel,
      lastInteraction: new Date(),
      totalInteractions: state.totalInteractions + 1,
      moodHistory: [...state.moodHistory, moodScore].slice(-30),
    };

    await this.saveState(updatedState);

    return {
      moodScore,
      moodLevel,
      moodChange,
      isNewAccessory: false,
      newAccessory: null,
      moodMessage: getMoodMessage(moodLevel, prevLevel, moodChange),
      bonusMultiplier: getBonusMultiplier(moodScore),
    };
  }

  /**
   * Process daily login — apply decay and give small mood boost.
   */
  async onDailyLogin(userId: string): Promise<BmoInteractionResult> {
    const state = await this.getOrCreateState(userId);
    const prevLevel = state.moodLevel;

    const daysSince = this.getDaysSince(state.lastInteraction);

    // Apply decay for missed days
    let moodScore = state.moodScore;
    if (daysSince > 1) {
      const decay = (daysSince - 1) * MOOD_DECAY_PER_DAY;
      moodScore = Math.max(0, moodScore - decay);
    }

    // Small mood boost for logging in
    const loginBoost = 3;
    moodScore = Math.min(MAX_MOOD, moodScore + loginBoost);

    const moodLevel = computeMoodLevel(moodScore);
    const moodChange = moodScore - state.moodScore;

    const updatedState: BmoCareState = {
      ...state,
      moodScore,
      moodLevel,
      lastInteraction: new Date(),
      totalInteractions: state.totalInteractions + 1,
      moodHistory: [...state.moodHistory, moodScore].slice(-30),
    };

    await this.saveState(updatedState);

    return {
      moodScore,
      moodLevel,
      moodChange,
      isNewAccessory: false,
      newAccessory: null,
      moodMessage: getMoodMessage(moodLevel, prevLevel, moodChange),
      bonusMultiplier: getBonusMultiplier(moodScore),
    };
  }

  /**
   * Equip an accessory.
   */
  async equipAccessory(userId: string, accessoryId: string): Promise<{ success: boolean; error?: string }> {
    const state = await this.getOrCreateState(userId);

    if (!state.unlockedAccessories.includes(accessoryId)) {
      return { success: false, error: "Accessory not unlocked" };
    }

    if (!state.currentAccessories.includes(accessoryId)) {
      // Max 3 accessories at a time
      const current = [...state.currentAccessories, accessoryId].slice(-3);
      state.currentAccessories = current;
      await this.saveState(state);
    }

    return { success: true };
  }

  /**
   * Unequip an accessory.
   */
  async unequipAccessory(userId: string, accessoryId: string): Promise<{ success: boolean }> {
    const state = await this.getOrCreateState(userId);
    state.currentAccessories = state.currentAccessories.filter((a) => a !== accessoryId);
    await this.saveState(state);
    return { success: true };
  }

  /**
   * Get BMO display data for frontend rendering.
   */
  async getBmoDisplay(userId: string): Promise<{
    moodLevel: BmoMoodLevel;
    moodScore: number;
    accessories: string[];
    unlockedAccessories: string[];
    moodHistory: number[];
    longestStreakMood: number;
    moodMessage: string;
    availableAccessories: BmoAccessory[];
    nextUnlock: { accessory: BmoAccessory; daysAway: number } | null;
  }> {
    const state = await this.getOrCreateState(userId);
    const streakDays = await this.getStreakDays(userId);

    const nextUnlock = this.findNextAccessory(state.unlockedAccessories, streakDays, state.moodScore);

    return {
      moodLevel: state.moodLevel,
      moodScore: state.moodScore,
      accessories: state.currentAccessories,
      unlockedAccessories: state.unlockedAccessories,
      moodHistory: state.moodHistory,
      longestStreakMood: state.longestStreakMood,
      moodMessage: this.getMoodDisplayMessage(state.moodLevel, state.moodScore),
      availableAccessories: BMO_ACCESSORIES,
      nextUnlock,
    };
  }

  private findNextAccessory(
    unlocked: string[],
    streakDays: number,
    moodScore: number
  ): { accessory: BmoAccessory; daysAway: number } | null {
    for (const acc of BMO_ACCESSORIES) {
      if (!unlocked.includes(acc.id)) {
        const daysNeeded = Math.max(0, acc.requiredStreak - streakDays);
        if (daysNeeded <= 30) {
          return { accessory: acc, daysAway: daysNeeded };
        }
      }
    }
    return null;
  }

  private getMoodDisplayMessage(level: BmoMoodLevel, score: number): string {
    switch (level) {
      case "excited": return `BMO is SO happy right now! ${score}/100 💖`;
      case "happy": return `BMO is feeling good! ${score}/100 😊`;
      case "neutral": return `BMO is doing okay. ${score}/100 😐`;
      case "sad": return `BMO is a bit down... ${score}/100 🥺`;
      case "critical": return `BMO really misses you... ${score}/100 💔`;
    }
  }

  private getDaysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
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

  private async saveState(state: BmoCareState): Promise<void> {
    if (!this.db) {
      this.saveLocalState(state);
      return;
    }
    try {
      await this.db.query(
        `INSERT INTO user_bmo_care (user_id, bmo_care_state, last_updated)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET bmo_care_state = $2, last_updated = NOW()`,
        [state.userId, JSON.stringify({
          moodScore: state.moodScore,
          currentAccessories: state.currentAccessories,
          unlockedAccessories: state.unlockedAccessories,
          lastInteraction: state.lastInteraction,
          totalInteractions: state.totalInteractions,
          longestStreakMood: state.longestStreakMood,
          moodHistory: state.moodHistory,
        })]
      );
    } catch (e) {
      console.warn("[BmoCare] Failed to save state:", (e as Error).message);
    }
  }

  private localCache = new Map<string, BmoCareState>();

  private getLocalState(userId: string): BmoCareState | null {
    return this.localCache.get(userId) || null;
  }

  private saveLocalState(state: BmoCareState): void {
    this.localCache.set(state.userId, state);
  }
}

export const bmoCare = new BmoCare();
