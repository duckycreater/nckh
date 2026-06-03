/**
 * Statistical Analysis Service - Research-Grade Statistical Tests
 *
 * Provides proper statistical tests: t-tests, ANOVA, effect sizes,
 * power analysis, and normality tests for A/B experiment evaluation.
 */

import jstat from "jstat";
import {
  kaplanMeier,
  logRankTest,
  proportionCI,
  minimumDetectableEffect,
  shapiroFrancia,
  getRetentionAt,
  type SurvivalDataPoint,
} from "./survivalAnalysis.js";

export interface TTestResult {
  tStatistic: number;
  pValue: number;
  degreesOfFreedom: number;
  cohensD: number;
  effectSizeLabel: "negligible" | "small" | "medium" | "large";
  significant: boolean;
  bonferroniCorrected: boolean;
  power: number;
  sampleSizeA: number;
  sampleSizeB: number;
  meanA: number;
  meanB: number;
  stdPooled: number;
  normalA: boolean;
  normalB: boolean;
  ciLower: number;
  ciUpper: number;
}

export interface ANOVAResult {
  F: number;
  pValue: number;
  dfBetween: number;
  dfWithin: number;
  etaSquared: number;
  groups: string[];
  means: number[];
  sampleSizes: number[];
  significant: boolean;
}

export interface ExperimentComparison {
  comparison: string;
  tStatistic: number;
  pValue: number;
  degreesOfFreedom: number;
  cohensD: number;
  effectSizeLabel: string;
  significant: boolean;
  bonferroniCorrected: boolean;
  power: number;
  sampleSizeA: number;
  sampleSizeB: number;
  meanA: number;
  meanB: number;
  ciLower: number;
  ciUpper: number;
}

export interface ExperimentResults {
  experimentId: string;
  experimentName: string;
  comparisons: ExperimentComparison[];
  overallSignificant: boolean;
  totalComparisons: number;
  significantComparisons: number;
  minimumDetectableEffect: number;
  powerAnalysis: {
    currentPower: number;
    requiredSampleSize: number;
  };
}

/**
 * Cohen's d effect size between two groups.
 */
export function cohensD(a: number[], b: number[]): number {
  const meanA = jstat.mean(a);
  const meanB = jstat.mean(b);
  const varA = jstat.variance(a, true);
  const varB = jstat.variance(b, true);
  const nA = a.length;
  const nB = b.length;
  const pooledStd = Math.sqrt(((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2));
  if (pooledStd === 0) return 0;
  return (meanA - meanB) / pooledStd;
}

/**
 * Welch's t-test (does not assume equal variances).
 * More robust than Student's t-test for real-world data.
 */
export function welchTTest(a: number[], b: number[]): TTestResult {
  const nA = a.length;
  const nB = b.length;
  const meanA = jstat.mean(a);
  const meanB = jstat.mean(b);
  const varA = jstat.variance(a, true);
  const varB = jstat.variance(b, true);

  if (varA === 0 && varB === 0) {
    return makeResult(0, 1, 1, 0, 0, nA, nB, meanA, meanB, 0, false, false, 0, 0);
  }

  const se = Math.sqrt(varA / nA + varB / nB);
  const t = se > 0 ? (meanA - meanB) / se : 0;

  // Welch-Satterthwaite degrees of freedom
  const v1 = varA / nA;
  const v2 = varB / nB;
  const df = Math.pow(v1 + v2, 2) / (Math.pow(v1, 2) / (nA - 1) + Math.pow(v2, 2) / (nB - 1));
  const dfClamped = Math.max(1, Math.round(df));

  const pValue = 2 * (1 - jstat.studentt.cdf(Math.abs(t), dfClamped));
  const d = cohensD(a, b);

  // 95% CI for difference in means (Welch)
  const tCrit = jstat.studentt.inv(0.975, dfClamped);
  const ciMargin = tCrit * se;
  const ciLower = (meanA - meanB) - ciMargin;
  const ciUpper = (meanA - meanB) + ciMargin;

  // Power calculation (approximate)
  const ncp = Math.abs(d) * Math.sqrt(nA * nB / (nA + nB));
  const power = jstat.normal.cdf(ncp - 1.96, 0, 1) + jstat.normal.cdf(-ncp - 1.96, 0, 1);

  // Normality tests
  const normA = nA < 4 || shapiroFrancia(a).pValue > 0.05;
  const normB = nB < 4 || shapiroFrancia(b).pValue > 0.05;

  return makeResult(t, pValue, dfClamped, d, power, nA, nB, meanA, meanB, se, normA, normB, ciLower, ciUpper);
}

function makeResult(
  t: number,
  p: number,
  df: number,
  d: number,
  power: number,
  nA: number,
  nB: number,
  meanA: number,
  meanB: number,
  stdPooled: number,
  normalA: boolean,
  normalB: boolean,
  ciLower: number,
  ciUpper: number,
  bonferroni = false
): TTestResult {
  return {
    tStatistic: Math.round(t * 1000) / 1000,
    pValue: Math.round(p * 10000) / 10000,
    degreesOfFreedom: df,
    cohensD: Math.round(d * 1000) / 1000,
    effectSizeLabel: d < 0.2 ? "negligible" : d < 0.5 ? "small" : d < 0.8 ? "medium" : "large",
    significant: p < 0.05,
    bonferroniCorrected: bonferroni,
    power: Math.round(power * 1000) / 1000,
    sampleSizeA: nA,
    sampleSizeB: nB,
    meanA: Math.round(meanA * 1000) / 1000,
    meanB: Math.round(meanB * 1000) / 1000,
    stdPooled: Math.round(stdPooled * 1000) / 1000,
    normalA,
    normalB,
    ciLower: Math.round(ciLower * 1000) / 1000,
    ciUpper: Math.round(ciUpper * 1000) / 1000,
  };
}

/**
 * One-way ANOVA with effect size (eta-squared).
 */
export function oneWayANOVA(groups: number[][]): ANOVAResult {
  const all = groups.flat();
  const grandMean = jstat.mean(all);
  const k = groups.length;
  const N = all.length;

  // Between-group sum of squares
  const ssBetween = groups.reduce(
    (sum, g) => sum + g.length * Math.pow(jstat.mean(g) - grandMean, 2),
    0
  );

  // Within-group sum of squares
  const ssWithin = groups.reduce(
    (sum, g) => sum + g.reduce((s, x) => s + Math.pow(x - jstat.mean(g), 2), 0),
    0
  );

  const dfBetween = k - 1;
  const dfWithin = N - k;

  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;

  const F = msWithin > 0 ? msBetween / msWithin : 0;
  const pValue = 1 - jstat.centralf.cdf(F, dfBetween, dfWithin);
  const etaSquared = ssBetween / (ssBetween + ssWithin);

  return {
    F: Math.round(F * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    dfBetween,
    dfWithin,
    etaSquared: Math.round(etaSquared * 1000) / 1000,
    groups: groups.map((_, i) => `Group ${i + 1}`),
    means: groups.map((g) => Math.round(jstat.mean(g) * 1000) / 1000),
    sampleSizes: groups.map((g) => g.length),
    significant: pValue < 0.05,
  };
}

/**
 * Full experiment analysis with all pairwise comparisons and corrections.
 */
export function analyzeExperiment(
  experimentId: string,
  experimentName: string,
  retentionByGroup: Record<string, number[]>,
  nComparisons: number
): ExperimentResults {
  const groupNames = Object.keys(retentionByGroup);
  const comparisons: ExperimentComparison[] = [];
  let significantCount = 0;

  for (let i = 0; i < groupNames.length; i++) {
    for (let j = i + 1; j < groupNames.length; j++) {
      const gA = groupNames[i];
      const gB = groupNames[j];
      const dataA = retentionByGroup[gA];
      const dataB = retentionByGroup[gB];

      const tt = welchTTest(dataA, dataB);

      // Bonferroni correction
      const bonferroniThreshold = 0.05 / nComparisons;
      const bonferroniSig = tt.pValue < bonferroniThreshold;

      if (tt.significant) significantCount++;

      comparisons.push({
        comparison: `${gA} vs ${gB}`,
        tStatistic: tt.tStatistic,
        pValue: tt.pValue,
        degreesOfFreedom: tt.degreesOfFreedom,
        cohensD: tt.cohensD,
        effectSizeLabel: tt.effectSizeLabel,
        significant: tt.significant,
        bonferroniCorrected: bonferroniSig,
        power: tt.power,
        sampleSizeA: tt.sampleSizeA,
        sampleSizeB: tt.sampleSizeB,
        meanA: tt.meanA,
        meanB: tt.meanB,
        ciLower: tt.ciLower,
        ciUpper: tt.ciUpper,
      });
    }
  }

  const minN = Math.min(...groupNames.map((g) => retentionByGroup[g].length));
  const mde = minimumDetectableEffect(minN);
  const currentPower = jstat.normal.cdf(
    Math.abs(jstat.mean(Object.values(retentionByGroup)[0]) - jstat.mean(Object.values(retentionByGroup)[1])) / mde - 1.96,
    0,
    1
  );

  return {
    experimentId,
    experimentName,
    comparisons,
    overallSignificant: significantCount > 0,
    totalComparisons: comparisons.length,
    significantComparisons: significantCount,
    minimumDetectableEffect: Math.round(mde * 1000) / 1000,
    powerAnalysis: {
      currentPower: Math.round(currentPower * 1000) / 1000,
      requiredSampleSize: Math.ceil(Math.pow((1.96 + 0.84) / 0.5, 2)),
    },
  };
}

/**
 * Bootstrap confidence interval for any statistic.
 */
export function bootstrapCI(
  data: number[],
  statistic: (arr: number[]) => number,
  nBoot = 2000,
  alpha = 0.05
): { lower: number; upper: number } {
  const n = data.length;
  if (n < 2) return { lower: data[0] ?? 0, upper: data[0] ?? 0 };

  const observed = statistic(data);
  const boots: number[] = [];

  for (let i = 0; i < nBoot; i++) {
    const sample: number[] = [];
    for (let j = 0; j < n; j++) {
      sample.push(data[Math.floor(Math.random() * n)]);
    }
    boots.push(statistic(sample));
  }

  boots.sort((a, b) => a - b);
  const lower = boots[Math.floor((alpha / 2) * nBoot)];
  const upper = boots[Math.floor((1 - alpha / 2) * nBoot)];

  return {
    lower: Math.round(lower * 1000) / 1000,
    upper: Math.round(upper * 1000) / 1000,
  };
}

/**
 * Mann-Whitney U test (non-parametric alternative to t-test).
 * Use when normality assumption is violated.
 */
export function mannWhitneyU(a: number[], b: number[]): { U: number; pValue: number; z: number } {
  const nA = a.length;
  const nB = b.length;
  const all = [...a.map((x, i) => ({ val: x, grp: "A", i })), ...b.map((x, i) => ({ val: x, grp: "B", i }))];
  all.sort((x, y) => x.val - y.val);
  const ranks = all.map((e) => {
    const eq = all.filter((f) => f.val === e.val);
    return { ...e, rank: eq.reduce((s, _, k) => s + all.indexOf(eq[k]) + 1, 0) / eq.length };
  });

  const R = ranks.filter((r) => r.grp === "A").reduce((s, r) => s + r.rank, 0);
  const U = R - (nA * (nA + 1)) / 2;
  const Uprime = nA * nB - U;
  const Umin = Math.min(U, Uprime);

  const mU = (nA * nB) / 2;
  const sigmaU = Math.sqrt((nA * nB * (nA + nB + 1)) / 12);
  const z = sigmaU > 0 ? (Umin - mU) / sigmaU : 0;
  const pValue = 2 * (1 - jstat.normal.cdf(Math.abs(z), 0, 1));

  return {
    U: Math.round(U * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    z: Math.round(z * 1000) / 1000,
  };
}
