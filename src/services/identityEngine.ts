/**
 * identityEngine.ts - Self-concept priming engine
 *
 * Implements Whitmarsh & O'Neill (2010) self-concept intervention for
 * waste-sorting behaviour. The core premise: people who see themselves
 * as "an environmentally-friendly person" sustain the behaviour longer
 * than people who only receive extrinsic points. We surface this through:
 *
 *   1. Reflection primes (post-scan surveys): "When you sorted a bottle,
 *      you were the kind of person who…"
 *   2. Identity-tagged achievements: badges that read "as a sorter".
 *   3. Self-talk substitution: replace "user who does X" with "sorter
 *      who does X" in user-visible strings.
 *
 * The engine is an *intervention selector* — it never decides a UI directly.
 * Downstream components `TheoryOfChangeViz.tsx`, `Chatbot.tsx`, and the
 * study dashboard query the engine for messages + frequency.
 */

import type { User } from "../types";
import { computeBreakdown, COM_B_VERSION } from "./theoryOfChange.js";

export const IDENTITY_ENGINE_VERSION = "1.0.0";

export const EID4_ITEMS_VI: string[] = [
  "Tôi coi mình là người quan tâm đến môi trường.",
  "Hành động bảo vệ môi trường phù hợp với giá trị của tôi.",
  "Tôi thấy mình là một phần của thiên nhiên.",
  "Sống xanh là điều tôi tự hào.",
];

export const EID4_ITEMS_EN: string[] = [
  "I see myself as someone who cares about the environment.",
  "Acting environmentally is in line with my values.",
  "I see myself as part of nature.",
  "Living green is something I'm proud of.",
];

/** Default language index — 0 = Vietnamese, 1 = English. */
export type Language = "vi" | "en";

export interface IdentityPrime {
  /** Stable ID; downstream components may dedup by ID. */
  id: string;
  /** Pre-formatted message in current language. */
  text: string;
  /** True iff the prime is high-intensity (shown only on ≥ D5). */
  intensity: "low" | "medium" | "high";
  /** Target sub-score (reflective motivation). */
  target: "reflectiveMotivation" | "automaticMotivation";
}

/** Select the prime that maximises reflective-motivation gain
 *  given the current user state. Used by `Chatbot.tsx`,
 *  `Settings.tsx`, and the post-scan modal in `AIScanner.tsx`.
 */
export function selectIdentityPrime(
  user: Partial<User>,
  options?: { language?: Language; previousPrimes?: string[]; rngSeed?: number }
): IdentityPrime | null {
  const language = options?.language ?? "vi";
  const breakdown = computeBreakdown(user);
  const reflectiveMotivation = breakdown.subscores.reflectiveMotivation;
  if (reflectiveMotivation > 0.78) {
    return null; // User is already strongly identity-driven; suppress.
  }

  const previous = new Set(options?.previousPrimes ?? []);
  const rng = options?.rngSeed ? mulberry32(options.rngSeed) : Math.random;
  const candidates = IDENTITY_PRIMES.filter((p) => p.language === language && !previous.has(p.id));
  if (candidates.length === 0) return null;

  // Pick lowest-targeted prime for high-intensity, etc.
  const targetOrder: IdentityPrime["intensity"][] = ["high", "medium", "low"];
  for (const intent of targetOrder) {
    const list = candidates.filter((c) => c.intensity === intent);
    if (list.length > 0) {
      return list[Math.floor(rng() * list.length)];
    }
  }
  return null;
}

const IDENTITY_PRIMES: { id: string; language: Language; text: string; intensity: "low" | "medium" | "high"; target: "reflectiveMotivation" | "automaticMotivation" }[] = [
  // VI - high intensity
  { id: "vi.1", language: "vi", text: "Bạn vừa hành động như một người phân loại rác — xin chúc mừng người bạn mới!", intensity: "high", target: "reflectiveMotivation" },
  { id: "vi.2", language: "vi", text: "Mỗi lần phân loại là bạn đang sống đúng con người mình muốn trở thành.", intensity: "high", target: "reflectiveMotivation" },
  { id: "vi.3", language: "vi", text: "Tin vào bản thân: người phân loại rác chính là bạn, không chỉ bây giờ mà còn ngày mai.", intensity: "high", target: "reflectiveMotivation" },
  // VI - medium
  { id: "vi.4", language: "vi", text: "Bạn có để ý mỗi khi mình làm đúng, mình thấy năng lượng tốt hơn không?", intensity: "medium", target: "automaticMotivation" },
  { id: "vi.5", language: "vi", text: "Một quyết định nhỏ — một cốc nhựa đúng chỗ — là một câu chuyện lớn về con người bạn.", intensity: "medium", target: "reflectiveMotivation" },
  // VI - low
  { id: "vi.6", language: "vi", text: "Cảm ơn bạn — người trân trọng điều nhỏ xinh.", intensity: "low", target: "automaticMotivation" },
  { id: "vi.7", language: "vi", text: "Bạn đã tiết kiệm 0.027 kg CO₂e — và một chút tự hào nữa.", intensity: "low", target: "automaticMotivation" },

  // EN - high
  { id: "en.1", language: "en", text: "You just acted like a sorter — congratulations on the new identity!", intensity: "high", target: "reflectiveMotivation" },
  { id: "en.2", language: "en", text: "Every time you sort, you live the person you want to be.", intensity: "high", target: "reflectiveMotivation" },
  { id: "en.3", language: "en", text: "Trust yourself: you are the kind of person who sorts.", intensity: "high", target: "reflectiveMotivation" },
  // EN - medium
  { id: "en.4", language: "en", text: "Have you noticed you feel better when you make the right call?", intensity: "medium", target: "automaticMotivation" },
  { id: "en.5", language: "en", text: "A small choice — one cup in the right bin — is a big story about you.", intensity: "medium", target: "reflectiveMotivation" },
  // EN - low
  { id: "en.6", language: "en", text: "Thanks, friend. Small acts, big heart.", intensity: "low", target: "automaticMotivation" },
  { id: "en.7", language: "en", text: "You just saved 0.027 kg CO₂e — and a little pride too.", intensity: "low", target: "automaticMotivation" },
];

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Submit EID-4 responses and compute the user's EID-4 mean (0..1).
 * Used by `ValidatedSurvey.tsx` (T33) after the user fills the 4-item Likert.
 */
export function computeEID4Score(responsesVi: number[]): number {
  if (responsesVi.length === 0) return 0.5;
  const valid = responsesVi.filter((v) => Number.isFinite(v) && v >= 1 && v <= 7);
  if (valid.length === 0) return 0.5;
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  return Math.max(0, Math.min(1, (mean - 1) / 6)); // 1..7 → 0..1
}

/**
 * Determine the *frequency* of identity-prime injections per week.
 * Goal: 2–4 primes/week when reflective motivation is low, decaying
 *       to 0/week when it exceeds 0.78.
 */
export function recommendedPrimeFrequency(
  user: Partial<User>,
  weekIndex: number
): { perWeek: number; reason: string } {
  const breakdown = computeBreakdown(user);
  const motivation = breakdown.subscores.reflectiveMotivation;
  if (motivation >= 0.78) return { perWeek: 0, reason: "Reflective motivation already high" };
  if (motivation < 0.30) return { perWeek: 5, reason: "Reflective motivation very low — 5 primes per week" };
  if (motivation < 0.50) return { perWeek: 4, reason: "Reflective motivation low — 4 primes per week" };
  if (motivation < 0.65) return { perWeek: 2, reason: "Moderate motivation — 2 primes per week" };
  // 0.65 to 0.78 → 1 prime every other week
  return {
    perWeek: weekIndex % 2 === 0 ? 1 : 0,
    reason: "Mild intervention needed once per week",
  };
}

export { IDENTITY_PRIMES };
