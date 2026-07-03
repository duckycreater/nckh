/**
 * syntheticPopulation.ts - Generate 1,000 synthetic users with behavioural archetypes
 *
 * Mirrors the structure of `scripts/synthetic_rct.py` so the JS-side
 * debugger/preview dashboard can show the same population as the
 * Python simulation. Used by:
 *
 *   - `src/components/ResearchDashboard.tsx` (preview)
 *   - `src/components/TheoryOfChangeViz.tsx` (sample slider state)
 *   - `src/components/SmartBinTwin.tsx` (planning what student impact looks like)
 *
 * Does NOT run actual RCT — purely a population generator that can be
 * loaded by browser-side analytics.
 *
 * Archetypes (calibrated against Whitmarsh-O'Neill 2010 and Hamari 2019):
 *   - identity_driven    — high EID-4 baseline (0.65), high capability
 *   - peer_driven        — low EID-4 (0.30), high opportunity proxy (friends)
 *   - achievement_seeker — high capability, automatic motivation (badges)
 *   - indifferent        — low across the board (placeholder for control)
 */

import type { User } from "../types";

export type Archetype =
  | "identity_driven"
  | "peer_driven"
  | "achievement_seeker"
  | "indifferent";

export interface SyntheticArchetypeProfile {
  /** 0..1 — Whitmarsh-O'Neill EID-4 baseline (proxy: environmentalIdentityScore). */
  identityBaseline: number;
  /** 0..1 — sort accuracy baseline. */
  accuracyBaseline: number;
  /** 0..1 — engagement / scan-rate baseline. */
  engagementBaseline: number;
  /** 0..N — initial friend count. */
  friendBaseline: number;
  /** 0..N — initial streak days. */
  streakBaseline: number;
  /** 0..N — initial quizzes completed. */
  quizBaseline: number;
  /** 0..N — initial chat messages. */
  chatBaseline: number;
}

export const ARCHETYPES: Record<Archetype, SyntheticArchetypeProfile> = {
  identity_driven: {
    identityBaseline: 0.66,
    accuracyBaseline: 0.72,
    engagementBaseline: 0.65,
    friendBaseline: 4,
    streakBaseline: 6,
    quizBaseline: 6,
    chatBaseline: 12,
  },
  peer_driven: {
    identityBaseline: 0.35,
    accuracyBaseline: 0.50,
    engagementBaseline: 0.55,
    friendBaseline: 9,
    streakBaseline: 3,
    quizBaseline: 3,
    chatBaseline: 7,
  },
  achievement_seeker: {
    identityBaseline: 0.45,
    accuracyBaseline: 0.65,
    engagementBaseline: 0.80,
    friendBaseline: 3,
    streakBaseline: 12,
    quizBaseline: 9,
    chatBaseline: 4,
  },
  indifferent: {
    identityBaseline: 0.25,
    accuracyBaseline: 0.40,
    engagementBaseline: 0.30,
    friendBaseline: 1,
    streakBaseline: 0,
    quizBaseline: 1,
    chatBaseline: 1,
  },
};

export const ARCHETYPE_MIX: Record<Archetype, number> = {
  identity_driven: 0.30,
  peer_driven: 0.30,
  achievement_seeker: 0.20,
  indifferent: 0.20,
};

export type CohortId = "C" | "E1" | "E2" | "E3" | "E4";

export const COHORTS: CohortId[] = ["C", "E1", "E2", "E3", "E4"];

export interface SyntheticUserSpec {
  userId: string;
  cohort: CohortId;
  schoolId: string;
  archetype: Archetype;
  /** Seeded noise parameter so generated values are reproducible. */
  noise: number;
  /** Baseline numbers from archetype + noise. */
  baseline: {
    identity: number;
    accuracy: number;
    engagement: number;
    friends: number;
    streak: number;
    quizzes: number;
    chat: number;
  };
}

export interface SyntheticPopulationOptions {
  nUsers: number;
  schools?: string[];
  cohorts?: CohortId[];
  seed?: number;
}

const DEFAULT_SCHOOLS = ["school_a", "school_b", "school_c", "school_d", "school_e"];

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

const clip01 = (v: number) => Math.max(0, Math.min(1, v));

function pickArchetype(rng: () => number): Archetype {
  const r = rng();
  let cum = 0;
  for (const k of Object.keys(ARCHETYPES) as Archetype[]) {
    cum += ARCHETYPE_MIX[k];
    if (r < cum) return k;
  }
  return "indifferent";
}

/** Generate N synthetic users, deterministically if seed is provided. */
export function generateSyntheticPopulation(
  opts: SyntheticPopulationOptions
): SyntheticUserSpec[] {
  const nUsers = opts.nUsers;
  if (nUsers < 1) return [];
  const schools = opts.schools ?? DEFAULT_SCHOOLS;
  const cohorts = opts.cohorts ?? COHORTS;
  const seed = opts.seed ?? 0xc0ffee;
  const rng = mulberry32(seed);

  const users: SyntheticUserSpec[] = [];
  const usersPerSchool = Math.floor(nUsers / schools.length);
  if (usersPerSchool < 1) {
    throw new Error("Each school must have at least 1 user");
  }

  for (let s = 0; s < schools.length; s++) {
    const schoolId = schools[s];
    for (let i = 0; i < usersPerSchool; i++) {
      const userId = `${schoolId}_u${String(i).padStart(3, "0")}`;
      const cohort = cohorts[i % cohorts.length];
      const archetype = pickArchetype(rng);
      const proto = ARCHETYPES[archetype];

      const noise = () => (rng() - 0.5) * 0.10;
      const baseline = {
        identity: clip01(proto.identityBaseline + noise()),
        accuracy: clip01(proto.accuracyBaseline + noise()),
        engagement: clip01(proto.engagementBaseline + noise()),
        friends: Math.max(0, Math.round(proto.friendBaseline + (rng() - 0.5) * 3)),
        streak: Math.max(0, Math.round(proto.streakBaseline + (rng() - 0.5) * 4)),
        quizzes: Math.max(0, Math.round(proto.quizBaseline + (rng() - 0.5) * 4)),
        chat: Math.max(0, Math.round(proto.chatBaseline + (rng() - 0.5) * 4)),
      };
      users.push({
        userId,
        cohort,
        schoolId,
        archetype,
        noise,
        baseline,
      });
    }
  }

  // Top-up: assign the remainder round-robin to schools.
  let idx = 0;
  while (users.length < nUsers) {
    const schoolId = schools[idx % schools.length];
    const userId = `${schoolId}_extra${idx}`;
    const cohort = cohorts[idx % cohorts.length];
    const archetype = pickArchetype(rng);
    const proto = ARCHETYPES[archetype];
    const noise = () => (rng() - 0.5) * 0.10;
    const baseline = {
      identity: clip01(proto.identityBaseline + noise()),
      accuracy: clip01(proto.accuracyBaseline + noise()),
      engagement: clip01(proto.engagementBaseline + noise()),
      friends: Math.max(0, Math.round(proto.friendBaseline + (rng() - 0.5) * 3)),
      streak: Math.max(0, Math.round(proto.streakBaseline + (rng() - 0.5) * 4)),
      quizzes: Math.max(0, Math.round(proto.quizBaseline + (rng() - 0.5) * 4)),
      chat: Math.max(0, Math.round(proto.chatBaseline + (rng() - 0.5) * 4)),
    };
    users.push({ userId, cohort, schoolId, archetype, noise, baseline });
    idx++;
  }
  return users;
}

/** Convert a SyntheticUserSpec to a partial User (browser state). */
export function specToPartialUser(spec: SyntheticUserSpec): Partial<User> {
  return {
    points: Math.round(spec.baseline.engagement * 1000),
    level: Math.max(1, Math.round(spec.baseline.streak / 4) + 1),
    unlockedRegions: spec.baseline.friends > 4 ? ["region_01", "region_02", "region_03"] : ["region_01"],
    currentRegion: "region_01",
    dominantProfile: spec.archetype,
    personalityMode: spec.archetype === "peer_driven" ? "social" : "solo",
    engagementScore: spec.baseline.engagement,
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
  };
}

export interface PopulationStats {
  n: number;
  perCohort: Record<CohortId, number>;
  perArchetype: Record<Archetype, number>;
  /** Mean baseline identity across the whole population. */
  meanIdentity: number;
  meanAccuracy: number;
  meanEngagement: number;
}

export function summarisePopulation(specs: SyntheticUserSpec[]): PopulationStats {
  const perCohort: Record<CohortId, number> = { C: 0, E1: 0, E2: 0, E3: 0, E4: 0 };
  const perArchetype: Record<Archetype, number> = {
    identity_driven: 0,
    peer_driven: 0,
    achievement_seeker: 0,
    indifferent: 0,
  };
  let idSum = 0, accSum = 0, engSum = 0;
  for (const u of specs) {
    perCohort[u.cohort]++;
    perArchetype[u.archetype]++;
    idSum += u.baseline.identity;
    accSum += u.baseline.accuracy;
    engSum += u.baseline.engagement;
  }
  const n = specs.length || 1;
  return {
    n: specs.length,
    perCohort,
    perArchetype,
    meanIdentity: idSum / n,
    meanAccuracy: accSum / n,
    meanEngagement: engSum / n,
  };
}

/** Singleton for cross-component reuse; reset for new seeds. */
let _singleton: SyntheticUserSpec[] | null = null;
let _singletonSeed: number | null = null;

export function getSyntheticPopulation(opts?: { seed?: number; nUsers?: number }): SyntheticUserSpec[] {
  if (_singleton && (opts?.seed ?? _singletonSeed) === _singletonSeed) return _singleton;
  _singleton = generateSyntheticPopulation({
    nUsers: opts?.nUsers ?? 1000,
    seed: opts?.seed ?? 0xabc123,
  });
  _singletonSeed = opts?.seed ?? 0xabc123;
  return _singleton;
}

export function resetSyntheticPopulation(): void {
  _singleton = null;
  _singletonSeed = null;
}

export const SYNTHETIC_POPULATION_VERSION = "1.0.0";
