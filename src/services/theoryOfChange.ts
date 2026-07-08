/**
 * theoryOfChange.ts - COM-B scoring engine (browser-side)
 *
 * Maps the COM-B model (Capability × Opportunity × Motivation → Behaviour)
 * to numerical proxy scores for every BMO user. These scores drive:
 *
 *   1. Personalised intervention selection (identityEngine.ts)
 *   2. Loss-aversion nudges (lossAversionEngine.ts)
 *   3. Social-graph centrality weighting (socialDiffusion.ts)
 *   4. Pre-registered RCT mediator analysis (server/services/rctEngine.ts)
 *
 * The COM-B definitions follow Michie, van Stralen & West (2011).
 * The identity sub-scale follows Whitmarsh & O'Neill (2010).
 *
 * Doc references:
 *   docs/research/THEORY_OF_CHANGE.md  §2
 *   docs/research/RESEARCH_PROPOSAL.md §3.3 (interventions) and §3.4 (outcomes)
 */

import type { User } from "../types";

export type ComComponent = "capability" | "opportunity" | "motivation";

export interface ComScores {
  /** Physical + psychological capability to sort correctly. 0–1. */
  capability: number;
  /** Physical (bin access) + social (peer) opportunity. 0–1. */
  opportunity: number;
  /** Reflective (identity) + automatic (rewards) motivation. 0–1. */
  motivation: number;
  /** Behaviour proxy (sort accuracy proxy). 0–1. */
  behaviour: number;
}

export interface ComSubscores {
  physicalCapability: number;
  psychologicalCapability: number;
  physicalOpportunity: number;
  socialOpportunity: number;
  reflectiveMotivation: number;
  automaticMotivation: number;
}

export interface ComBreakdown {
  scores: ComScores;
  subscores: ComSubscores;
  computedAt: number;
  version: string;
}

const VERSION = "1.0.0";

// ─── Helper functions ────────────────────────────────────────────────────

/** Logistic squash to [0, 1]. */
function squish(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Bounded weights so subscores can never exceed 1. */
function boundedWeightedSum(parts: number[], weights: number[]): number {
  if (parts.length !== weights.length) {
    throw new Error("parts and weights length mismatch");
  }
  const wSum = weights.reduce((a, b) => a + b, 0);
  const num = parts.reduce((acc, p, i) => acc + Math.max(0, Math.min(1, p)) * weights[i], 0);
  return Math.max(0, Math.min(1, num / wSum));
}

/**
 * Whitmarsh & O'Neill (2010) 4-item Environmental Identity scale.
 * Items measure agreement with statements like
 *   "I see myself as an environmentally-friendly person".
 * The original uses 1–7 Likert; we normalise to 0–1.
 */
export const EID4_ITEMS_VI: string[] = [
  "Tôi coi mình là người quan tâm đến môi trường.",
  "Hành động bảo vệ môi trường phù hợp với giá trị của tôi.",
  "Tôi thấy mình là một phần của thiên nhiên.",
  "Sống xanh là điều tôi tự hào.",
];

// ─── Core scoring ───────────────────────────────────────────────────────

/**
 * Compute COM subscores from a User snapshot.
 * Missing fields are imputed conservatively (mid-range 0.5) so that
 * cold-start users get a valid ToC profile without falsely extreme scores.
 */
export function computeComSubscores(user: Partial<User>): ComSubscores {
  // Physical capability — proxy: total scans, accuracy, on-device model confidence
  const scans = user.totalScans ?? 0;
  const accuracy = user.accuracy ?? 0.5;
  const physicalCapability = squish((scans / 60) - 1.0) * 0.6 + accuracy * 0.4;

  // Psychological capability — proxy: quizzes completed, badges in knowledge category
  const quizzes = user.quizzesCompleted ?? 0;
  const psychologicalCapability = squish((quizzes - 3) / 12) * 0.5 + Math.min(1, (user.chatMessagesCount ?? 0) / 30) * 0.5;

  // Physical opportunity — proxy: smart-bin coverage (we assume OK for schools)
  const physicalOpportunity = user.binAccessScore ?? 0.7;

  // Social opportunity — proxy: friend count, world-map unlocks
  const friends = user.friendCount ?? 0;
  const regionsUnlocked = (user.unlockedRegions?.length ?? 0) / 8.0;
  const socialOpportunity = squish((friends - 1) / 6) * 0.55 + Math.min(1, regionsUnlocked) * 0.45;

  // Reflective motivation — proxy: environmental-identity scale & flagged identity
  const eidScore = user.environmentalIdentityScore;
  const reflectiveMotivation = eidScore == null ? 0.5 : Math.max(0, Math.min(1, eidScore));

  // Automatic motivation — proxy: streak length, last-active freshness, levels
  const streak = user.streakDays ?? 0;
  const lastActiveDaysAgo = user.lastActiveAt
    ? (Date.now() - user.lastActiveAt) / (24 * 3600_000)
    : 7;
  const freshness = Math.max(0, 1 - lastActiveDaysAgo / 7);
  const automaticMotivation = squish((streak - 2) / 14) * 0.6 + freshness * 0.4;

  return {
    physicalCapability,
    psychologicalCapability,
    physicalOpportunity,
    socialOpportunity,
    reflectiveMotivation,
    automaticMotivation,
  };
}

/** Aggregate subscores → COM scores via Michie's product + multiplicative factor. */
export function aggregateCom(sub: ComSubscores): ComScores {
  const capability = boundedWeightedSum(
    [sub.physicalCapability, sub.psychologicalCapability],
    [0.55, 0.45]
  );
  const opportunity = boundedWeightedSum(
    [sub.physicalOpportunity, sub.socialOpportunity],
    [0.4, 0.6]
  );
  const motivation = boundedWeightedSum(
    [sub.reflectiveMotivation, sub.automaticMotivation],
    [0.65, 0.35]
  );
  // Behaviour = C × O × M (Michie's product form). Squish to [0,1].
  const rawBehaviour = capability * opportunity * motivation;
  return {
    capability,
    opportunity,
    motivation,
    behaviour: rawBehaviour, // already in [0,1] because each factor is.
  };
}

/**
 * Compute the full breakdown for a User.
 */
export function computeBreakdown(user: Partial<User>): ComBreakdown {
  const subscores = computeComSubscores(user);
  const scores = aggregateCom(subscores);
  return {
    scores,
    subscores,
    computedAt: Date.now(),
    version: VERSION,
  };
}

// ─── Intervention selection ──────────────────────────────────────────────

export type InterventionKind =
  | "identity_prime"
  | "social_nudge"
  | "loss_aversion"
  | "knowledge_chunk"
  | "skill_practice"
  | "no_action";

export interface InterventionDecision {
  kind: InterventionKind;
  reason: string;
  priorityScore: number;
}

/**
 * Decide which intervention to surface this session.
 * Uses a simple priority-ranking policy that prefers the lowest-subscore COM
 * component to maximize the next-session COM gain.
 *
 * This implements the "single-subscore-lever" principle from
 * docs/research/THEORY_OF_CHANGE.md §2 — interventions target the weakest
 * COM component rather than spamming the strongest.
 */
export function selectIntervention(breakdown: ComBreakdown): InterventionDecision {
  const { capability, opportunity, motivation } = breakdown.scores;
  const sorted = (
    [
      ["capability", capability, "knowledge_chunk"],
      ["capability", capability, "skill_practice"],
      ["opportunity", opportunity, "social_nudge"],
      ["motivation", motivation, "identity_prime"],
      ["motivation", motivation, "loss_aversion"],
    ] as [ComComponent, number, InterventionKind][]
  ).sort((a, b) => a[1] - b[1]);

  const [, lowest, kind] = sorted[0];
  const priorityScore = 1 - lowest; // lower sub-score → higher priority

  const reasons: Record<InterventionKind, string> = {
    identity_prime: "Reflective motivation is the weakest link — surface identity priming.",
    social_nudge: "Social opportunity is low — show peers for homophily-driven diffusion.",
    loss_aversion: "Motivation is dipping — prompt loss-aversion via streak breakdown.",
    knowledge_chunk: "Capability is low — deliver a short knowledge chunk via chatbot.",
    skill_practice: "Skill gap detected — direct to scan-practice with high-confidence bins.",
    no_action: "All COM components are healthy; no intervention needed this session.",
  };

  return { kind, reason: reasons[kind], priorityScore };
}

// ─── Population-level aggregation ────────────────────────────────────────

export function aggregateCohort(breakdowns: ComBreakdown[]): {
  n: number;
  meanCapability: number;
  meanOpportunity: number;
  meanMotivation: number;
  meanBehaviour: number;
  weakestComponent: ComComponent;
} {
  if (breakdowns.length === 0) {
    return {
      n: 0,
      meanCapability: 0,
      meanOpportunity: 0,
      meanMotivation: 0,
      meanBehaviour: 0,
      weakestComponent: "motivation",
    };
  }
  let cap = 0, opp = 0, mot = 0, beh = 0;
  for (const b of breakdowns) {
    cap += b.scores.capability;
    opp += b.scores.opportunity;
    mot += b.scores.motivation;
    beh += b.scores.behaviour;
  }
  const n = breakdowns.length;
  const meanCapability = cap / n;
  const meanOpportunity = opp / n;
  const meanMotivation = mot / n;
  const meanBehaviour = beh / n;

  const weakest = (["capability", "opportunity", "motivation"] as const).reduce((a, b) =>
    ({ capability: meanCapability, opportunity: meanOpportunity, motivation: meanMotivation }[a]) <
    ({ capability: meanCapability, opportunity: meanOpportunity, motivation: meanMotivation }[b])
      ? a
      : b
  );

  return {
    n,
    meanCapability,
    meanOpportunity,
    meanMotivation,
    meanBehaviour,
    weakestComponent: weakest,
  };
}

// ─── Singleton convenience for in-app use ────────────────────────────────

let cachedBreakdown: ComBreakdown | null = null;

export function cachedBreakdownFor(user: Partial<User>): ComBreakdown {
  // Skip cache for development logs; recompute every call in this lightweight helper.
  return computeBreakdown(user);
}

// Re-export so downstream modules have one place to import
export const COM_B_VERSION = VERSION;
