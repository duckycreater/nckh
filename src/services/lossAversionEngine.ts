/**
 * lossAversionEngine.ts - Nudge library using loss-aversion theory
 *
 * Implements Kahneman & Tversky's (1979) prospect theory findings:
 * losses loom larger than gains (~2×). BMO uses this for:
 *   1. Regret prompts (when a streak breaks).
 *   2. Loss-framed recoveries ("you can earn the streak back in 3 days").
 *   3. Loss-aversion avoidance: never remove points already earned.
 *
 * Designed to be culturally appropriate for Vietnamese teens: messages
 * avoid puritanical shame, lean into "you can recover this" framing,
 * and offer one concrete step.
 */

import type { User } from "../types";
import { computeBreakdown } from "./theoryOfChange.js";

export const LOSS_AVERSION_ENGINE_VERSION = "1.0.0";

export type Language = "vi" | "en";

export interface RegretPrompt {
  id: string;
  text: string;
  intensity: "gentle" | "moderate" | "firm";
  /** Pre-built recovery action. */
  recovery: { id: string; text: string; deadlineDays: number };
  /** Why this prompt was generated (auditability). */
  reason: string;
}

const REGRET_LIBRARY_VI: RegretPrompt[] = [
  {
    id: "vi.regret.1",
    text: "Streak vừa đứt. Đừng lo — bạn có thể quay lại trong 3 ngày.",
    intensity: "gentle",
    recovery: { id: "vi.rec.1", text: "Sắp xếp 1 lần quét trong hôm nay để bắt đầu lại.", deadlineDays: 1 },
    reason: "streak_broken_gentle",
  },
  {
    id: "vi.regret.2",
    text: "Bạn đã xa rời mục tiêu 2 ngày. Quay lại là điều tốt nhất lúc này.",
    intensity: "moderate",
    recovery: { id: "vi.rec.2", text: "Quét 5 mục bất kỳ ngay bây giờ — chỉ trong 90 giây.", deadlineDays: 1 },
    reason: "inactivity_2d",
  },
  {
    id: "vi.regret.3",
    text: "Bạn đang để mất streak dài hơn — hãy hoàn tất một nhiệm vụ nhỏ trong ngày hôm nay.",
    intensity: "firm",
    recovery: { id: "vi.rec.3", text: "Hoàn thành 1 quiz 5 câu để khôi phục điểm.", deadlineDays: 1 },
    reason: "streak_break_3d",
  },
];

const REGRET_LIBRARY_EN: RegretPrompt[] = [
  {
    id: "en.regret.1",
    text: "Your streak just broke — no worries. You can rebuild it in 3 days.",
    intensity: "gentle",
    recovery: { id: "en.rec.1", text: "Schedule one scan today to start a fresh streak.", deadlineDays: 1 },
    reason: "streak_broken_gentle",
  },
  {
    id: "en.regret.2",
    text: "You've drifted for 2 days. Coming back is the best thing right now.",
    intensity: "moderate",
    recovery: { id: "en.rec.2", text: "Scan 5 items right now — it takes only 90 seconds.", deadlineDays: 1 },
    reason: "inactivity_2d",
  },
  {
    id: "en.regret.3",
    text: "You are losing a longer streak — finish one small task today.",
    intensity: "firm",
    recovery: { id: "en.rec.3", text: "Complete a 5-question quiz to restore progress.", deadlineDays: 1 },
    reason: "streak_break_3d",
  },
];

/**
 * Compute regret prompt based on streak history + last active.
 * `streakHistoryDays` is the array of the last N days; 1 = active, 0 = inactive.
 */
export function computeRegretPrompt(
  user: Partial<User> & { lastActiveDays: number; longestStreakBeforeBreak?: number },
  options?: { language?: Language; rngSeed?: number }
): RegretPrompt {
  const lib = options?.language === "en" ? REGRET_LIBRARY_EN : REGRET_LIBRARY_VI;
  const days = user.lastActiveDays;
  const longStreak = user.longestStreakBeforeBreak ?? user.streakDays ?? 0;

  // Gentle if streak broken ≤ 1 day, moderate if 2, firm if ≥3.
  if (days <= 1 && longStreak > 0) return lib[0];
  if (days <= 2 && longStreak >= 3) return lib[1];
  if (days >= 3 || longStreak > 7) return lib[2];

  // Default gentle.
  return lib[0];
}

/**
 * Returns the highest "avoidable loss" estimate in kg CO₂e we would lose
 * if the user dropped off now.
 */
export function avoidableLossesIfDropout(
  user: Partial<User>,
  options?: { scanCoefficientKg?: number; weeeksHorizon?: number }
): { kgCo2ePerWeek: number; kgTotal: number; confidenceLow: boolean } {
  const weeklyScans = user.totalScans ? user.totalScans / 6 : 5; // heuristic
  const coeff = options?.scanCoefficientKg ?? 0.028;
  const weeks = options?.weeeksHorizon ?? 12;
  const kgPerWeek = weeklyScans * coeff;
  return {
    kgCo2ePerWeek: kgPerWeek,
    kgTotal: kgPerWeek * weeks,
    confidenceLow: weeklyScans < 4,
  };
}

/**
 * Generate a non-punitive *recovery* prompt when user falls below baseline.
 * Returns null if the user is at or above the reflective-motivation baseline,
 * so the engine suppresses the prompt instead of nagging.
 */
export function shouldShowRecovery(user: Partial<User>, baseline = 0.55): boolean {
  const breakdown = computeBreakdown(user);
  return breakdown.subscores.reflectiveMotivation < baseline;
}

/**
 * Compute "stakes" framing for an event (e.g., "you have X kg at stake").
 * Avoids catastrophising — never used above intensity "moderate".
 */
export function stakesFraming(user: Partial<User>, language: Language = "vi"): string {
  const losses = avoidableLossesIfDropout(user);
  const text =
    language === "vi"
      ? `Tiếp tục, bạn đang giữ khoảng ${losses.kgCo2ePerWeek.toFixed(2)} kg CO₂e mỗi tuần.`
      : `Keep going — you're holding about ${losses.kgCo2ePerWeek.toFixed(2)} kg CO₂e per week.`;
  return text;
}
