/**
 * tests/services/rctEngine.spec.ts
 *
 * Unit coverage for the per-protocol statistics primitives exposed by
 *   server/services/rctEngine.ts
 *
 * These primitives power the OSF-pre-registered analysis plan and must
 * stay deterministic: given the same numeric inputs they must return
 * the same numbers. Any behaviour drift here would invalidate analyses
 * that downstream researchers are already citing.
 *
 * Run with: npm test  (node:test, no DOM dependencies).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  RCT_ENGINE_VERSION,
  COHORT_DESCRIPTIONS,
  deterministicHash,
  validateStudySpec,
  assignCohorts,
  welchTTest,
  zscoreTwoSidedP,
  holmBonferroni,
  bonferroni,
  regressionSlope,
  bootstrapIndirect,
  powerAnalysis,
  normalCDF,
  inverseNormalCDF,
  runPrimaryTest,
  type OutcomeRecord,
  type CohortId,
  type RctAssignmentSpec,
} from "../../server/services/rctEngine.ts";

const expect = (v: unknown) => ({
  toBe: (x: unknown) => assert.deepStrictEqual(v, x),
  toEqual: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeCloseTo: (x: number, digits = 5) =>
    assert.ok(
      Math.abs(Number(v) - x) < Math.pow(10, -digits),
      `expected ${v} ≈ ${x}`,
    ),
  toBeGreaterThan: (x: number) => assert.ok(Number(v) > x, `${v} <= ${x}`),
  toBeLessThan: (x: number) => assert.ok(Number(v) < x, `${v} >= ${x}`),
  toBeGreaterThanOrEqual: (x: number) =>
    assert.ok(Number(v) >= x, `${v} < ${x}`),
  toBeLessThanOrEqual: (x: number) => assert.ok(Number(v) <= x, `${v} > ${x}`),
  toMatch: (re: RegExp) => assert.ok(re.test(String(v)), `${v} did not match ${re}`),
  toBeType: (t: string) => assert.strictEqual(typeof v, t),
});

describe("rctEngine.version", () => {
  it("is a semver-looking string", () => {
    expect(RCT_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
  it("describes all 5 cohorts", () => {
    const expected: CohortId[] = ["C", "E1", "E2", "E3", "E4"];
    for (const c of expected) {
      expect(typeof COHORT_DESCRIPTIONS[c]).toBe("string");
      expect(COHORT_DESCRIPTIONS[c].length).toBeGreaterThan(10);
    }
  });
});

// ─── deterministicHash ────────────────────────────────────────────────────
describe("rctEngine.deterministicHash", () => {
  it("is stable for identical input", () => {
    expect(deterministicHash("hello")).toBe(deterministicHash("hello"));
  });
  it("is 64-char hex", () => {
    expect(deterministicHash("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("differs for different inputs", () => {
    expect(deterministicHash("a") === deterministicHash("b")).toBe(false);
  });
});

// ─── validateStudySpec ────────────────────────────────────────────────────
describe("rctEngine.validateStudySpec", () => {
  const baseSchools = ["s1", "s2", "s3"].map((id) => ({
    schoolId: id,
    nConsented: 120,
    consentClosureAt: "2027-09-01T00:00:00Z",
    contact: "pi@example.com",
  }));

  it("rejects when schools.length != cohorts.length", () => {
    const spec: RctAssignmentSpec = {
      studyId: "fall-2027",
      schools: baseSchools.slice(0, 2),
      cohorts: ["C", "E1", "E2"],
      seed: 1,
    };
    const r = validateStudySpec(spec);
    expect(r.ok).toBe(false);
    expect(r.errors.length > 0).toBe(true);
  });
  it("rejects when school has < 60 consented", () => {
    const spec: RctAssignmentSpec = {
      studyId: "fall-2027",
      schools: [{...baseSchools[0], nConsented: 30}],
      cohorts: ["C"],
      seed: 1,
    };
    const r = validateStudySpec(spec);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("60"))).toBe(true);
  });
  it("accepts a well-formed spec", () => {
    const spec: RctAssignmentSpec = {
      studyId: "fall-2027",
      schools: baseSchools,
      cohorts: ["C", "E1", "E2"],
      seed: 42,
    };
    const r = validateStudySpec(spec);
    expect(r.ok).toBe(true);
    expect(r.errors.length).toBe(0);
  });
});

// ─── assignCohorts ─────────────────────────────────────────────────────────
describe("rctEngine.assignCohorts", () => {
  it("produces one row per school with the requested cohort", () => {
    const spec: RctAssignmentSpec = {
      studyId: "fall-2027",
      schools: [
        {schoolId: "school-a", nConsented: 200, consentClosureAt: "2027-09-01", contact: "x"},
        {schoolId: "school-b", nConsented: 200, consentClosureAt: "2027-09-01", contact: "x"},
        {schoolId: "school-c", nConsented: 200, consentClosureAt: "2027-09-01", contact: "x"},
        {schoolId: "school-d", nConsented: 200, consentClosureAt: "2027-09-01", contact: "x"},
        {schoolId: "school-e", nConsented: 200, consentClosureAt: "2027-09-01", contact: "x"},
      ],
      cohorts: ["C", "E1", "E2", "E3", "E4"],
      seed: 42,
    };
    const rows = assignCohorts(spec);
    expect(rows.length).toBe(5);
    const usedCohorts = new Set(rows.map((r) => r.cohort));
    expect(usedCohorts.size).toBe(5);
    for (const r of rows) {
      expect(r.assignmentHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });
  it("is reproducible with the same seed", () => {
    const buildSpec = (): RctAssignmentSpec => ({
      studyId: "fall-2027",
      schools: [
        {schoolId: "a", nConsented: 120, consentClosureAt: "2027-09-01", contact: "x"},
        {schoolId: "b", nConsented: 120, consentClosureAt: "2027-09-01", contact: "x"},
        {schoolId: "c", nConsented: 120, consentClosureAt: "2027-09-01", contact: "x"},
      ],
      cohorts: ["C", "E1", "E2"],
      seed: 1234,
    });
    const a = assignCohorts(buildSpec()).map((r) => r.cohort);
    const b = assignCohorts(buildSpec()).map((r) => r.cohort);
    expect(a.join(",")).toBe(b.join(","));
  });
  it("differs when seed changes", () => {
    const mkSpec = (seed: number): RctAssignmentSpec => ({
      studyId: "fall-2027",
      schools: [
        {schoolId: "a", nConsented: 120, consentClosureAt: "2027-09-01", contact: "x"},
        {schoolId: "b", nConsented: 120, consentClosureAt: "2027-09-01", contact: "x"},
        {schoolId: "c", nConsented: 120, consentClosureAt: "2027-09-01", contact: "x"},
      ],
      cohorts: ["C", "E1", "E2"],
      seed,
    });
    const a = assignCohorts(mkSpec(1)).map((r) => r.cohort);
    const b = assignCohorts(mkSpec(2)).map((r) => r.cohort);
    expect(a.join(",") !== b.join(",")).toBe(true);
  });
});

// ─── zscoreTwoSidedP ───────────────────────────────────────────────────────
describe("rctEngine.zscoreTwoSidedP", () => {
  it("is symmetric around 0", () => {
    expect(zscoreTwoSidedP(1.5)).toBeCloseTo(zscoreTwoSidedP(-1.5), 4);
  });
  it("monotone-decreases as |z| grows", () => {
    expect(zscoreTwoSidedP(3)).toBeLessThan(zscoreTwoSidedP(2));
    expect(zscoreTwoSidedP(2)).toBeLessThan(zscoreTwoSidedP(1));
  });
  it("gives roughly 0.05 at |z|=1.96", () => {
    expect(zscoreTwoSidedP(1.96)).toBeGreaterThan(0.04);
    expect(zscoreTwoSidedP(1.96)).toBeLessThan(0.06);
  });
  it("NaN returns 1", () => {
    expect(zscoreTwoSidedP(NaN)).toBe(1);
  });
});

// ─── welchTTest ────────────────────────────────────────────────────────────
describe("rctEngine.welchTTest", () => {
  it("detects a large mean difference with p<0.01", () => {
    const a = [10, 11, 12, 11, 10, 11, 12, 13, 12, 11];
    const b = [5, 6, 7, 6, 5, 6, 7, 8, 7, 6];
    const ma = a.reduce((s, v) => s + v, 0) / a.length;
    const mb = b.reduce((s, v) => s + v, 0) / b.length;
    const va = variance(a);
    const vb = variance(b);
    const out = welchTTest(ma, a.length, va, mb, b.length, vb);
    expect(out.p).toBeLessThan(0.01);
    expect(Math.abs(out.t)).toBeGreaterThan(2);
  });
  it("equal means → p close to 1", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8];
    const b = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = welchTTest(mean(a), a.length, variance(a), mean(b), b.length, variance(b));
    expect(out.p).toBeGreaterThan(0.5);
  });
  it("small samples return p=1 sentinel", () => {
    const out = welchTTest(10, 1, 0, 5, 1, 0);
    expect(out.t).toBe(0);
    expect(out.p).toBe(1);
  });
});

// ─── holmBonferroni + bonferroni ───────────────────────────────────────────
describe("rctEngine.holmBonferroni", () => {
  it("rejects nothing when all p > alpha", () => {
    const out = holmBonferroni([0.4, 0.5, 0.6], 0.05);
    expect(out.rejectedIdx.length).toBe(0);
  });
  it("rejects only enough to control FWER", () => {
    const out = holmBonferroni([0.01, 0.04, 0.03, 0.5], 0.05);
    // smallest p=0.01 → reject, then 0.03 adjusted 3*0.03=0.09 < 0.05 → reject,
    // 0.04 adjusted 2*0.04=0.08 (3 sorted asc would be 0.01 idx0, 0.03 idx2, 0.04 idx1)
    expect(out.rejectedIdx.length).toBeGreaterThanOrEqual(1);
    for (const p of out.adjustedP) expect(p).toBeLessThanOrEqual(1);
  });
  it("empty input → empty output", () => {
    const out = holmBonferroni([], 0.05);
    expect(out.rejectedIdx.length).toBe(0);
    expect(out.adjustedP.length).toBe(0);
  });
});

describe("rctEngine.bonferroni", () => {
  it("adjusted p equals min(1, raw * m)", () => {
    const out = bonferroni([0.01, 0.02, 0.03], 0.05);
    expect(out.adjustedP[0]).toBeCloseTo(0.03);
    expect(out.adjustedP[1]).toBeCloseTo(0.06);
    expect(out.adjustedP[2]).toBeCloseTo(0.09);
  });
  it("caps adjusted p at 1", () => {
    const out = bonferroni([0.5, 0.9], 0.05);
    expect(out.adjustedP.every((p) => p <= 1)).toBe(true);
  });
});

// ─── regressionSlope ───────────────────────────────────────────────────────
describe("rctEngine.regressionSlope", () => {
  it("recovers slope=2 in pure-linear data with small noise", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const ys = [3.1, 5.0, 7.2, 9.05, 11.1, 12.95, 14.0, 16.2, 18.05, 19.95];
    const r = regressionSlope(xs, ys);
    expect(r.slope).toBeCloseTo(2, 0);
    expect(r.intercept).toBeCloseTo(1, 0);
    expect(r.p).toBeLessThan(0.001);
  });
  it("returns slope≈0 on flat data", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [3, 3, 3, 3, 3];
    const r = regressionSlope(xs, ys);
    expect(r.slope).toBeCloseTo(0, 5);
    expect(r.p).toBeGreaterThan(0.5);
  });
});

// ─── bootstrapIndirect (mediation) ─────────────────────────────────────────
describe("rctEngine.bootstrapIndirect", () => {
  it("detects indirect effect when mediator lies on causal path", () => {
    // x → m → y: x ∈ {0,1}, m = 0.5·x + tiny noise, y = 0.4·m + tiny noise
    const tx: number[] = [];
    const mx: number[] = [];
    const yx: number[] = [];
    for (let i = 0; i < 60; i++) {
      const xi = i % 2;
      const mi = 0.5 * xi + 0.01 * (i - 30);
      const yi = 0.4 * mi + 0.005 * (i - 30);
      tx.push(xi);
      mx.push(mi);
      yx.push(yi);
    }
    const out = bootstrapIndirect(tx, mx, yx, 200, 7);
    // Indirect effect ~ 0.5 * 0.4 = 0.2
    expect(Math.abs(out.coef)).toBeGreaterThan(0.05);
    // Bootstrap CI should bracket the indirect effect
    expect(out.bootCI[0]).toBeLessThanOrEqual(out.coef);
    expect(out.bootCI[1]).toBeGreaterThanOrEqual(out.coef);
    // Standard error is positive
    expect(out.bootSE).toBeGreaterThanOrEqual(0);
  });
});

// ─── powerAnalysis ─────────────────────────────────────────────────────────
describe("rctEngine.powerAnalysis", () => {
  it("power increases with more clusters for fixed effect", () => {
    const small = powerAnalysis(0.5, 0.05, 5, 30, 0.05);
    const big = powerAnalysis(0.5, 0.05, 30, 30, 0.05);
    expect(big.power).toBeGreaterThan(small.power);
  });
  it("ICC shrinks effective sample size", () => {
    const low = powerAnalysis(0.5, 0.05, 10, 30, 0.0);
    const high = powerAnalysis(0.5, 0.05, 10, 30, 0.3);
    expect(low.effectiveSampleSize).toBeGreaterThan(high.effectiveSampleSize);
  });
});

// ─── normalCDF / inverseNormalCDF ──────────────────────────────────────────
describe("rctEngine.normalCDF <-> inverseNormalCDF", () => {
  it("are inverses around 1.96 ↔ 0.975", () => {
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 2);
    expect(inverseNormalCDF(0.975)).toBeCloseTo(1.96, 1);
  });
  it("Φ(0) = 0.5", () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 3);
  });
});

// ─── runPrimaryTest ────────────────────────────────────────────────────────
describe("rctEngine.runPrimaryTest", () => {
  it("computes cohens_d on mean change with realistic variance", () => {
    const treatment: OutcomeRecord[] = [];
    const control: OutcomeRecord[] = [];
    // Deterministic seeded jitter so the test is reproducible.
    let s = 17;
    const jitter = () => {
      s = (s * 9301 + 49297) % 233280;
      return (s / 233280) * 4 - 2; // ±2
    };
    for (let u = 0; u < 30; u++) {
      const baseT = 50 + jitter();
      const baseC = 50 + jitter();
      const postT = 70 + jitter();
      const postC = 55 + jitter();
      treatment.push({userId: `t-${u}`, schoolId: "school-A", cohort: "E1", week: 0, scansCount: 10, correctScans: 8, identityScore: baseT, active: true, co2eKgWeek: 0.5, timestamp: "2025-01-01T00:00:00Z"});
      treatment.push({userId: `t-${u}`, schoolId: "school-A", cohort: "E1", week: 10, scansCount: 20, correctScans: 17, identityScore: postT, active: true, co2eKgWeek: 1.0, timestamp: "2025-01-11T00:00:00Z"});
      control.push({userId: `c-${u}`, schoolId: "school-B", cohort: "C", week: 0, scansCount: 10, correctScans: 6, identityScore: baseC, active: true, co2eKgWeek: 0.5, timestamp: "2025-01-01T00:00:00Z"});
      control.push({userId: `c-${u}`, schoolId: "school-B", cohort: "C", week: 10, scansCount: 12, correctScans: 7, identityScore: postC, active: true, co2eKgWeek: 0.6, timestamp: "2025-01-11T00:00:00Z"});
    }
    const out = runPrimaryTest(treatment, control);
    expect(out.meanDiff).toBeGreaterThan(10);
    expect(out.cohensD).toBeGreaterThan(0.5);
    expect(out.reachedTarget).toBe(true);
  });
  it("returns 0 effect for identical outcomes", () => {
    const ids = Array.from({length: 10}, (_, i) => `u-${i}`);
    const flat = (ws: number): OutcomeRecord[] =>
      ids.flatMap((u) => [
        {userId: u, schoolId: "school-A", cohort: "E1" as const, week: 0, scansCount: 5, correctScans: 4, identityScore: ws, active: true, co2eKgWeek: 0.5, timestamp: "2025-01-01T00:00:00Z"},
        {userId: u, schoolId: "school-A", cohort: "E1" as const, week: 10, scansCount: 8, correctScans: 6, identityScore: ws, active: true, co2eKgWeek: 0.8, timestamp: "2025-01-11T00:00:00Z"},
      ]);
    const out = runPrimaryTest(flat(50), flat(50));
    expect(out.meanDiff).toBeCloseTo(0, 5);
    expect(out.cohensD).toBe(0);
    expect(out.reachedTarget).toBe(false);
  });
});

// ─── helpers (private to this spec) ────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function variance(arr: number[]): number {
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, arr.length - 1);
}