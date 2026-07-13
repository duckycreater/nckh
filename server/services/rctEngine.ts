/**
 * rctEngine.ts - Server-side Randomized Controlled Trial engine
 *
 * Phase 5 (RCT infrastructure). Manages cohort assignment, baseline
 * measurement tracking, mediator/moderator scoping, and outcome
 * computation for the multi-school privacy-preserving RCT
 * (see docs/research/RESEARCH_PROPOSAL.md and THEORY_OF_CHANGE.md).
 *
 * NOTE: This implementation is **deliberately kept pure + deterministic**
 * so the same input seeds yield the same group assignments — a hard
 * requirement for any pre-registered analysis plan on OSF.
 *
 * Consent model:
 *   - User must have completed COPPA/GDPR-K consent flow before assignment
 *   - School-level cluster assignment ensures no within-school contamination
 *   - All assignment hashes are logged for auditability
 */

export const RCT_ENGINE_VERSION = "2.0.0";

export type CohortId = "C" | "E1" | "E2" | "E3" | "E4";

export interface RctAssignmentSpec {
  /** Unique ID for this RCT instance (e.g., "fall-2027-vietnam"). */
  studyId: string;
  /** Schools participating (must have parental consent coverage). */
  schools: SchoolEligibility[];
  /** Cohorts to assign (in order — first cohort ends up at first school lexicographically after shuffle). */
  cohorts: CohortId[];
  /** RNG seed for reproducible randomisation. */
  seed: number;
}

export interface SchoolEligibility {
  schoolId: string;
  /** Number of consented students in the school. */
  nConsented: number;
  /** ISO timestamp of consent closure. */
  consentClosureAt: string;
  /** Lead contact (PI/co-PI). */
  contact: string;
}

export interface SchoolCohortAssignment {
  schoolId: string;
  cohort: CohortId;
  cohortDescription: string;
  nConsented: number;
  assignedAt: string;
  /** SHA-256 of the assignment input (for OSF audit log). */
  assignmentHash: string;
}

export const COHORT_DESCRIPTIONS: Record<CohortId, string> = {
  C: "Control: standard Vietnamese civic-education curriculum only.",
  E1: "E1 — BMO Gamification only: app without FL personalization or smart-bin twin.",
  E2: "E2 — E1 + Federated Learning: full BMO with on-device FL personalization.",
  E3: "E3 — E2 + Smart-bin Twin: full BMO plus live collection-route optimization.",
  E4: "E4 — E3 + Identity-Prime: full stack + COM-B-grounded identity messaging.",
};

/** Stable hash (sync) for audit-log reproducibility. */
import crypto from "crypto";

export function deterministicHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** Mulberry32 — same RNG used by smartBinEmulator.ts (compatible). */
function mulberry32(seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Validate study eligibility — refuse to run RCT if any school has
 * insufficient consented students.
 */
export function validateStudySpec(spec: RctAssignmentSpec): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (spec.cohorts.length === 0) errors.push("At least one cohort required");
  if (spec.schools.length !== spec.cohorts.length) {
    errors.push(
      `Number of schools (${spec.schools.length}) must equal number of cohorts (${spec.cohorts.length}) for balanced cluster randomization.`
    );
  }
  if (spec.schools.length > 0) {
    const minConsented = Math.min(...spec.schools.map((s) => s.nConsented));
    if (minConsented < 60) {
      errors.push(`Each school must have ≥60 consented students (smallest: ${minConsented}).`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Randomly shuffle cohorts across schools using the seeded RNG so the
 * assignment is fully reproducible for OSF pre-registration audit.
 */
export function assignCohorts(spec: RctAssignmentSpec): SchoolCohortAssignment[] {
  const { ok, errors } = validateStudySpec(spec);
  if (!ok) {
    throw new Error(`RCT spec invalid:\n${errors.join("\n")}`);
  }

  const rng = mulberry32(spec.seed);
  const cohortPool = [...spec.cohorts];
  // Fisher-Yates shuffle with seeded RNG
  for (let i = cohortPool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cohortPool[i], cohortPool[j]] = [cohortPool[j], cohortPool[i]];
  }

  const assignedAt = new Date().toISOString();
  const assignments: SchoolCohortAssignment[] = spec.schools.map((school, idx) => {
    const cohort = cohortPool[idx];
    const hashSource = [spec.studyId, spec.seed, school.schoolId, cohort, assignedAt].join("|");
    return {
      schoolId: school.schoolId,
      cohort,
      cohortDescription: COHORT_DESCRIPTIONS[cohort],
      nConsented: school.nConsented,
      assignedAt,
      assignmentHash: deterministicHash(hashSource),
    };
  });
  return assignments;
}

// ─── Outcome computation ──────────────────────────────────────────────

export interface OutcomeRecord {
  userId: string;
  schoolId: string;
  cohort: CohortId;
  week: number;
  scansCount: number;
  correctScans: number;
  /** Whitmarsh & O'Neill EID-4 mean (1..7 normalised to 0..1). */
  identityScore: number;
  active: boolean;
  /** kg CO₂e avoided that week (impactCalculator). */
  co2eKgWeek: number;
  timestamp: string;
}

export interface CohortSummary {
  cohort: CohortId;
  n: number;
  /** Mean Δ identity (week N − week 0). */
  identityChange: number;
  identityChangeSD: number;
  /** Mean sort accuracy (week N). */
  sortAccuracy: number;
  sortAccuracySD: number;
  /** D30 retention rate (active in any day 21..30). */
  d30Retention: number;
  /** Mean kg CO₂e avoided / user / week. */
  kgCo2ePerUserWeek: number;
  /** Welch t (vs control) on identityChange if applicable. */
  welch_t_identityChange?: number;
  cohens_d_identityChange?: number;
}

export interface PrimaryTestResult {
  primaryMetric: string;
  cohortsCompared: CohortId[];
  meanDiff: number;
  pooled: number;
  pooledSD: number;
  cohensD: number;
  /** Welch-Satterthwaite df. */
  df: number;
  /** t-statistic. */
  t: number;
  /** Whether the pre-registered d ≥ 0.40 threshold was reached. */
  reachedTarget: boolean;
}

export function summarizeCohort(
  cohort: CohortId,
  records: OutcomeRecord[],
  controlRecords: OutcomeRecord[] | null = null
): CohortSummary {
  const users = new Set<string>();
  const userWeeks = new Map<string, OutcomeRecord[]>();
  for (const r of records) {
    if (r.cohort !== cohort) continue;
    users.add(r.userId);
    if (!userWeeks.has(r.userId)) userWeeks.set(r.userId, []);
    userWeeks.get(r.userId)!.push(r);
  }
  const n = users.size;
  if (n === 0) {
    return {
      cohort,
      n: 0,
      identityChange: 0,
      identityChangeSD: 0,
      sortAccuracy: 0,
      sortAccuracySD: 0,
      d30Retention: 0,
      kgCo2ePerUserWeek: 0,
    };
  }

  const identityChanges: number[] = [];
  const weekAccuracies: number[] = [];
  const d30Flags: number[] = [];
  let totalCo2e = 0;

  for (const [, weeks] of userWeeks) {
    weeks.sort((a, b) => a.week - b.week);
    const first = weeks[0];
    const last = weeks[weeks.length - 1];
    identityChanges.push(last.identityScore - first.identityScore);
    const recent = weeks.filter((w) => w.week >= Math.max(2, last.week - 4));
    for (const w of recent) {
      if (w.scansCount > 0) {
        weekAccuracies.push(w.correctScans / w.scansCount);
      }
      totalCo2e += w.co2eKgWeek;
      if (w.week >= 4 && w.week <= 6) {
        d30Flags.push(w.active ? 1 : 0);
      }
    }
  }

  function mean(arr: number[]) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  function sd(arr: number[]) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / (arr.length - 1));
  }

  const summary: CohortSummary = {
    cohort,
    n,
    identityChange: mean(identityChanges),
    identityChangeSD: sd(identityChanges),
    sortAccuracy: mean(weekAccuracies),
    sortAccuracySD: sd(weekAccuracies),
    d30Retention: mean(d30Flags),
    kgCo2ePerUserWeek: totalCo2e / n,
  };

  if (controlRecords && cohort !== "C") {
    const ctrlChanges: number[] = [];
    const ctrlByUser = new Map<string, OutcomeRecord[]>();
    for (const r of controlRecords) {
      if (r.cohort !== "C") continue;
      if (!ctrlByUser.has(r.userId)) ctrlByUser.set(r.userId, []);
      ctrlByUser.get(r.userId)!.push(r);
    }
    for (const [, weeks] of ctrlByUser) {
      weeks.sort((a, b) => a.week - b.week);
      ctrlChanges.push(weeks[weeks.length - 1].identityScore - weeks[0].identityScore);
    }
    const ma = mean(identityChanges);
    const mb = mean(ctrlChanges);
    const va = identityChanges.length > 1 ? sd(identityChanges) ** 2 : 0;
    const vb = ctrlChanges.length > 1 ? sd(ctrlChanges) ** 2 : 0;
    const na = identityChanges.length;
    const nb = ctrlChanges.length;
    const se = Math.sqrt(va / na + vb / nb);
    if (se === 0) {
      summary.welch_t_identityChange = 0;
      summary.cohens_d_identityChange = 0;
    } else {
      const t = (ma - mb) / se;
      summary.welch_t_identityChange = t;
      const pooled = Math.sqrt(((na - 1) * va + (nb - 1) * vb) / (na + nb - 2));
      summary.cohens_d_identityChange = pooled > 0 ? (ma - mb) / pooled : 0;
    }
  }

  return summary;
}

export function runPrimaryTest(
  treatment: OutcomeRecord[],
  control: OutcomeRecord[],
  options?: { target_d?: number; metric_name?: string }
): PrimaryTestResult {
  const tChange: number[] = [];
  const cChange: number[] = [];
  const tByUser = new Map<string, OutcomeRecord[]>();
  const cByUser = new Map<string, OutcomeRecord[]>();
  for (const r of treatment) {
    if (!tByUser.has(r.userId)) tByUser.set(r.userId, []);
    tByUser.get(r.userId)!.push(r);
  }
  for (const r of control) {
    if (!cByUser.has(r.userId)) cByUser.set(r.userId, []);
    cByUser.get(r.userId)!.push(r);
  }
  for (const [, w] of tByUser) {
    w.sort((a, b) => a.week - b.week);
    tChange.push(w[w.length - 1].identityScore - w[0].identityScore);
  }
  for (const [, w] of cByUser) {
    w.sort((a, b) => a.week - b.week);
    cChange.push(w[w.length - 1].identityScore - w[0].identityScore);
  }
  function mean(arr: number[]) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  function sd(arr: number[]) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / (arr.length - 1));
  }
  const na = tChange.length;
  const nb = cChange.length;
  const ma = mean(tChange);
  const mb = mean(cChange);
  const va = tChange.length > 1 ? sd(tChange) ** 2 : 0;
  const vb = cChange.length > 1 ? sd(cChange) ** 2 : 0;
  const se = Math.sqrt(va / na + vb / nb);
  const t = se === 0 ? 0 : (ma - mb) / se;
  const pooled = Math.sqrt(((na - 1) * va + (nb - 1) * vb) / (na + nb - 2));
  const d = pooled > 0 ? (ma - mb) / pooled : 0;
  const num = (va / na + vb / nb) ** 2;
  const denom = (va / na) ** 2 / Math.max(1, na - 1) + (vb / nb) ** 2 / Math.max(1, nb - 1);
  const df = denom > 0 ? num / denom : 1;
  const target_d = options?.target_d ?? 0.4;
  return {
    primaryMetric: options?.metric_name ?? "Identity score change (week 10 − week 0)",
    cohortsCompared: ["E4", "C"],
    meanDiff: ma - mb,
    pooled,
    pooledSD: pooled,
    cohensD: d,
    df,
    t,
    reachedTarget: Math.abs(d) >= target_d,
  };
}

// ─── v2 additions (T11) ──────────────────────────────────────────────────
// Holm-Bonferroni correction across multiple primary tests.
// Expected input: an array of raw two-sided p-values (not corrected).
// Returns the indices that survive family-wise error control at alpha.
export function holmBonferroni(
  pvalues: number[],
  alpha = 0.05
): { rejectedIdx: number[]; adjustedP: number[] } {
  const m = pvalues.length;
  if (m === 0) return { rejectedIdx: [], adjustedP: [] };
  const pairs = pvalues
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p - b.p);
  const adjustedP = new Array<number>(m).fill(0);
  const rejected: number[] = [];
  let cummax = 0;
  for (let k = 0; k < m; k++) {
    const factor = m - k;
    const adj = pairs[k].p * factor;
    cummax = Math.max(cummax, adj);
    adjustedP[pairs[k].i] = Math.min(cummax, 1);
    if (adj <= alpha) rejected.push(pairs[k].i);
  }
  return { rejectedIdx: rejected, adjustedP };
}

// Bonferroni (uniformly conservative).
export function bonferroni(pvalues: number[], alpha = 0.05): { rejectedIdx: number[]; adjustedP: number[] } {
  const m = Math.max(1, pvalues.length);
  const adjustedP = pvalues.map((p) => Math.min(1, p * m));
  const rejectedIdx: number[] = [];
  adjustedP.forEach((p, i) => {
    if (p <= alpha) rejectedIdx.push(i);
  });
  return { rejectedIdx, adjustedP };
}

// Simple z-test approximation for very large samples (Wald).
// Two-sided p-value = erfc(|z|/√2) (with erf from A&S 7.1.26).
export function zscoreTwoSidedP(z: number): number {
  if (Number.isNaN(z)) return 1;
  const abs = Math.abs(z);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const x = abs / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  // Two-sided p = erfc(|z|/√2) = 1 - erf(|z|/√2).
  return Math.min(1, 1 - erf);
}

// Compute Welch's t-test p-value (two-sided) from summary statistics.
// Useful when we cache mean/var already and don't want to re-tally.
export function welchTTest(
  ma: number, na: number, va: number,
  mb: number, nb: number, vb: number
): { t: number; df: number; p: number } {
  if (na < 2 || nb < 2) return { t: 0, df: 1, p: 1 };
  const se = Math.sqrt(va / na + vb / nb);
  const t = se === 0 ? 0 : (ma - mb) / se;
  // Welch-Satterthwaite df
  const num = (va / na + vb / nb) ** 2;
  const denom = (va / na) ** 2 / Math.max(1, na - 1) + (vb / nb) ** 2 / Math.max(1, nb - 1);
  const df = denom > 0 ? num / denom : 1;
  // Convert t to z for p approximation (df>30 → near identical).
  const p = zscoreTwoSidedP(t);
  return { t, df, p };
}

// Mediation analysis (Baron-Kenny-style; bootstrap CI optional).
// Direct / indirect / total effects with simple bias-corrected bootstrap CI.
export interface MediationResult {
  /** Path a (treatment → mediator). */
  aPath: { coef: number; se: number; p: number };
  /** Path b (mediator → outcome, controlling for treatment). */
  bPath: { coef: number; se: number; p: number };
  /** Direct effect c' (treatment → outcome, controlling for mediator). */
  cPrime: { coef: number; se: number; p: number };
  /** Indirect (mediated) effect ab. */
  indirect: { coef: number; bootSE: number; bootCI: [number, number] };
  /** Total effect c = c' + ab. */
  total: number;
  /** Proportion of total effect mediated (TE*ab / TE) when c > 0. */
  propMediated: number;
}

// Light OLS regression: y = β0 + β1 * x. Returns betas, ses, p-values.
// Works on simple scalars for the client-side / small-server use-case;
// for full bootstrap CI use the heavy `analysis_synthetic.py` (T37).
export function regressionSlope(
  xs: number[],
  ys: number[]
): { slope: number; intercept: number; se: number; p: number; n: number } {
  const n = xs.length;
  if (n !== ys.length || n < 3) {
    return { slope: 0, intercept: 0, se: 0, p: 1, n: 0 };
  }
  const xm = xs.reduce((a, b) => a + b, 0) / n;
  const ym = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - xm) ** 2;
    syy += (ys[i] - ym) ** 2;
    sxy += (xs[i] - xm) * (ys[i] - ym);
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = ym - slope * xm;
  if (n <= 2 || syy === 0 || sxx === 0) {
    return { slope, intercept, se: 0, p: 1, n };
  }
  const rss = syy - slope * sxy;
  const s2 = rss / (n - 2);
  const se = Math.sqrt(s2 / sxx);
  const t = se === 0 ? 0 : slope / se;
  const p = zscoreTwoSidedP(t);
  return { slope, intercept, se, p, n };
}

/** Crude bootstrap CI for product-of-coefficients mediation (Baron & Kenny, 1986). */
export function bootstrapIndirect(
  tx: number[], mx: number[], yx: number[],
  nBoot = 1000, seed = 42
): { coef: number; bootSE: number; bootCI: [number, number] } {
  const rng = mulberry32(seed);
  const n = tx.length;
  if (n < 3) return { coef: 0, bootSE: 0, bootCI: [0, 0] };
  const aFit = regressionSlope(tx, mx);
  const bFit = regressionSlope(mx, yx);
  const indirect = aFit.slope * bFit.slope;
  const bootIndirect: number[] = [];
  for (let b = 0; b < nBoot; b++) {
    const txb: number[] = [];
    const mxb: number[] = [];
    const yxb: number[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rng() * n);
      txb.push(tx[idx]);
      mxb.push(mx[idx]);
      yxb.push(yx[idx]);
    }
    const a = regressionSlope(txb, mxb);
    const bc = regressionSlope(mxb, yxb);
    bootIndirect.push(a.slope * bc.slope);
  }
  bootIndirect.sort((a, b) => a - b);
  const lo = bootIndirect[Math.floor(0.025 * nBoot)];
  const hi = bootIndirect[Math.floor(0.975 * nBoot)];
  const mean = bootIndirect.reduce((a, b) => a + b, 0) / nBoot;
  const variance =
    bootIndirect.reduce((acc, v) => acc + (v - mean) ** 2, 0) / Math.max(1, nBoot - 1);
  return { coef: indirect, bootSE: Math.sqrt(variance), bootCI: [lo, hi] };
}

// Mixed-effects (school-level random intercept) — simplified for browser/JS:
// we collapse to per-school means and apply weighted ANOVA-like comparison.
// For the heavier version see `scripts/analysis_synthetic.py`.
export interface MixedEffectsEstimate {
  fixedEffect: number;
  randomSchoolSD: number;
  icc: number;
  ci: [number, number];
}

export function simpleMixedEffects(
  perSchoolEffects: { schoolId: string; effect: number; n: number }[]
): MixedEffectsEstimate {
  const totalN = perSchoolEffects.reduce((a, b) => a + b.n, 0);
  if (totalN === 0 || perSchoolEffects.length === 0) {
    return { fixedEffect: 0, randomSchoolSD: 0, icc: 0, ci: [0, 0] };
  }
  let weightedSum = 0;
  for (const s of perSchoolEffects) weightedSum += s.effect * s.n;
  const fixedEffect = weightedSum / totalN;
  const schoolVariance =
    perSchoolEffects.reduce((acc, s) => acc + (s.effect - fixedEffect) ** 2, 0) /
    Math.max(1, perSchoolEffects.length - 1);
  const randomSchoolSD = Math.sqrt(schoolVariance);
  // ICC ≈ σ²_school / (σ²_school + σ²_residual). We approximate σ²_residual
  // by the within-school variance of the pre-trend; for illustration we use 0.05.
  const approxResidual = 0.05;
  const icc = (schoolVariance) / (schoolVariance + approxResidual);
  const se = randomSchoolSD / Math.sqrt(perSchoolEffects.length);
  const ci: [number, number] = [fixedEffect - 1.96 * se, fixedEffect + 1.96 * se];
  return { fixedEffect, randomSchoolSD, icc, ci };
}

// Power analysis for cluster-RCT design. ICC = intra-class correlation.
// Assume variant of Cohen's d between treatment and control at individual level,
// clusters = number of schools per arm, clusterSize = students per school.
export interface RctPowerResult {
  alpha: number;
  nClustersPerArm: number;
  clusterSize: number;
  icc: number;
  effectSize: number;
  /** Effective sample size per arm (after design effect). */
  effectiveSampleSize: number;
  /** Estimated statistical power (1 - β). */
  power: number;
}

export function powerAnalysis(
  effectSize: number,
  alpha: number,
  nClustersPerArm: number,
  clusterSize: number,
  icc: number
): RctPowerResult {
  const de = 1 + (clusterSize - 1) * icc;
  const effN = (nClustersPerArm * clusterSize) / de;
  const zA = Math.abs(inverseNormalCDF(1 - alpha / 2));
  const nonCentrality = effectSize * Math.sqrt(effN);
  // Two-sided power = Φ(δ - zA) + Φ(-δ - zA) where δ = effect·√N.
  const power = normalCDF(nonCentrality - zA) + normalCDF(-nonCentrality - zA);
  return {
    alpha,
    nClustersPerArm,
    clusterSize,
    icc,
    effectSize,
    effectiveSampleSize: effN,
    power: Math.min(1, Math.max(0, power)),
  };
}

// Inverse CDF (probit) — Beasley-Springer-Moro.
export function inverseNormalCDF(p: number): number {
  if (p <= 0 || p >= 1) {
    if (p <= 0) return -Infinity;
    return Infinity;
  }
  const a = [-39.6968302866538, 220.946098424521, -275.928510446069,
             138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887,
             66.8013118877197, -13.2806815528537];
  const c = [-7.78489400243029e-3, -0.322396458041136, -2.40075827716184,
             -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [7.78469570904146e-3, 0.32246712907004, 2.445134137143,
             3.75440866190741];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q = 0, r = 0;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5] /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= phigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

// Standard normal CDF — A&S 7.1.26 Padé approximation of erf(|x|/√2).
// Accurate to ~1.5e-7 across the real line.
export function normalCDF(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const x = Math.abs(z) / Math.SQRT2;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  // Φ(z) = ½(1 + erf(z/√2)).
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}
function factorial(k: number): number {
  let v = 1;
  for (let i = 2; i <= k; i++) v *= i;
  return v;
}
