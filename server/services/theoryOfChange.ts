/**
 * theoryOfChange.ts - Server-side COM-B scoring engine
 *
 * Symmetrical to `src/services/theoryOfChange.ts` but runs in Node/Express.
 * Used by:
 *   - RCT mediator analysis in `rctEngine.ts`
 *   - Aggregate daily/weekly reports in `research.ts` routes
 *   - Synthetic pilot analysis in `scripts/synthetic_rct.py` via shared JSON
 *
 * Math: COM-B model of behaviour (Michie, van Stralen & West, 2011).
 * Sub-scores follow Whitmarsh & O'Neill (2010) for reflective motivation.
 */

import { ComScores, ComSubscores, COM_B_VERSION } from "../../src/services/theoryOfChange.js";

export { COM_B_VERSION };

/** Server-side variant of a user record — broader than the browser one. */
export interface ResearchUserRecord {
  userId: string;
  schoolId: string;
  cohort: "C" | "E1" | "E2" | "E3" | "E4";
  week: number;
  // Behavioural inputs
  totalScans: number;
  accuracy: number; // 0..1
  quizzesCompleted: number;
  chatMessagesCount: number;
  friendCount: number;
  unlockedRegions: string[];
  /** Environmental Identity Scale (Whitmarsh-O'Neill EID-4) mean 1..7 normalised to 0..1. */
  environmentalIdentityScore: number;
  /** Streak in days. */
  streakDays: number;
  /** Last active timestamp. */
  lastActiveAt: number;
}

/**
 * Compute COM subscores for one or many user records.
 * Same algorithm as the browser version (`src/services/theoryOfChange.ts`).
 */
export function subscoresFromRecord(r: Partial<ResearchUserRecord>): ComSubscores {
  const scans = r.totalScans ?? 0;
  const accuracy = r.accuracy ?? 0.5;
  const physicalCapability = squish((scans / 60) - 1.0) * 0.6 + accuracy * 0.4;

  const quizzes = r.quizzesCompleted ?? 0;
  const psychologicalCapability =
    squish((quizzes - 3) / 12) * 0.5 +
    Math.min(1, (r.chatMessagesCount ?? 0) / 30) * 0.5;

  const physicalOpportunity = 0.7; // assumption: schools all have bins
  const friends = r.friendCount ?? 0;
  const regionsUnlocked = (r.unlockedRegions?.length ?? 0) / 8.0;
  const socialOpportunity =
    squish((friends - 1) / 6) * 0.55 + Math.min(1, regionsUnlocked) * 0.45;

  const eidScore = r.environmentalIdentityScore;
  const reflectiveMotivation = eidScore == null ? 0.5 : Math.max(0, Math.min(1, eidScore));

  const streak = r.streakDays ?? 0;
  const lastActiveDaysAgo = r.lastActiveAt ? (Date.now() - r.lastActiveAt) / (24 * 3600_000) : 7;
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

function squish(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function aggregateComBFromRecords(records: Partial<ResearchUserRecord>[]): ComScores & {
  n: number;
} {
  const subs: ComSubscores[] = records.map(subscoresFromRecord);
  const n = subs.length || 1;
  const sum = (s: keyof ComSubscores) => subs.reduce((a, b) => a + b[s], 0) / n;
  const capability =
    sum("physicalCapability") * 0.55 + sum("psychologicalCapability") * 0.45;
  const opportunity =
    sum("physicalOpportunity") * 0.4 + sum("socialOpportunity") * 0.6;
  const motivation =
    sum("reflectiveMotivation") * 0.65 + sum("automaticMotivation") * 0.35;
  return {
    capability,
    opportunity,
    motivation,
    behaviour: capability * opportunity * motivation,
    n,
  };
}

/**
 * Map COM-B scores to the next-best intervention per Michie taxonomy.
 * Identical to `src/services/theoryOfChange.ts::selectIntervention`.
 */
export function selectServerIntervention(scores: ComScores): {
  kind: string;
  reason: string;
  priorityScore: number;
} {
  const sorted: { name: string; value: number; kind: string }[] = [
    { name: "capability", value: scores.capability, kind: "knowledge_chunk" },
    { name: "capability", value: scores.capability, kind: "skill_practice" },
    { name: "opportunity", value: scores.opportunity, kind: "social_nudge" },
    { name: "motivation", value: scores.motivation, kind: "identity_prime" },
    { name: "motivation", value: scores.motivation, kind: "loss_aversion" },
  ].sort((a, b) => a.value - b.value);
  const top = sorted[0];
  const priorityScore = 1 - top.value;
  return {
    kind: top.kind,
    reason: `Lowest sub-score is ${top.name} (${top.value.toFixed(3)}) — target that intervention.`,
    priorityScore,
  };
}

export const SERVER_THEORY_OF_CHANGE_VERSION = "1.0.0";
