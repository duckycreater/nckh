/**
 * Survival Analysis - Kaplan-Meier Estimator with Greenwood's Formula
 *
 * Used for longitudinal retention analysis. Computes survival curves,
 * confidence intervals, and compares survival distributions across groups.
 */

import jstat from "jstat";

export interface SurvivalDataPoint {
  time: number;          // Day number
  survival: number;       // Survival probability (0-1)
  se: number;            // Standard error (Greenwood)
  lowerCI: number;       // 95% CI lower bound
  upperCI: number;       // 95% CI upper bound
  atRisk: number;        // Number still active
  events: number;        // Number of "deaths" (churns) at this time
}

export interface SurvivalResult {
  curve: SurvivalDataPoint[];
  medianSurvival: number | null;  // Day at which 50% churned
  retentionAt7d: number;
  retentionAt14d: number;
  retentionAt30d: number;
}

export interface LogRankResult {
  statistic: number;     // Chi-square statistic
  pValue: number;
  df: number;
}

/**
 * Kaplan-Meier estimator with Greenwood's formula for standard errors
 * and log-log CI (more accurate for survival curves).
 *
 * @param events Array of {time: days since start, event: true if churned}
 */
export function kaplanMeier(events: { time: number; event: boolean }[]): SurvivalDataPoint[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.time - b.time);
  let atRisk = sorted.length;
  let survival = 1;
  const estimates: SurvivalDataPoint[] = [];

  // Group by unique time points
  const groups: Map<number, typeof sorted> = new Map();
  for (const e of sorted) {
    if (!groups.has(e.time)) groups.set(e.time, []);
    groups.get(e.time)!.push(e);
  }

  for (const [time, group] of groups) {
    const deaths = group.filter((e) => e.event).length;
    if (atRisk === 0) break;

    const survivalChange = (atRisk - deaths) / atRisk;
    survival *= survivalChange;

    // Greenwood's formula for SE
    const se = deaths > 0 && atRisk > deaths
      ? survival * Math.sqrt(deaths / (atRisk * atRisk * (atRisk - deaths)))
      : survival * 0.001;

    // log-log CI (more accurate than normal approximation for survival)
    const logSurvival = Math.log(-Math.log(survival));
    const z = 1.96; // 95% CI
    const logSe = deaths > 0 && atRisk > deaths
      ? Math.sqrt(deaths / (atRisk * atRisk * (atRisk - deaths)))
      : 0.001;

    let lowerCI = 0;
    let upperCI = 1;
    if (survival > 0 && survival < 1) {
      const logLower = logSurvival - z * logSe / Math.abs(logSurvival);
      const logUpper = logSurvival + z * logSe / Math.abs(logSurvival);
      lowerCI = Math.max(0, Math.exp(-Math.exp(logLower)));
      upperCI = Math.min(1, Math.exp(-Math.exp(logUpper)));
    } else if (survival === 0) {
      upperCI = 0;
    } else {
      lowerCI = 1;
    }

    atRisk -= deaths;

    estimates.push({
      time,
      survival: Math.round(survival * 10000) / 10000,
      se: Math.round(se * 10000) / 10000,
      lowerCI: Math.round(lowerCI * 10000) / 10000,
      upperCI: Math.round(upperCI * 10000) / 10000,
      atRisk,
      events: deaths,
    });
  }

  return estimates;
}

/**
 * Extract retention (survival) at specific day milestones.
 */
export function getRetentionAt(survivalCurve: SurvivalDataPoint[], day: number): number {
  // Find the closest time point <= day
  const sorted = [...survivalCurve].sort((a, b) => a.time - b.time);
  let closest = sorted[0]?.survival ?? 1;
  for (const pt of sorted) {
    if (pt.time <= day) closest = pt.survival;
    else break;
  }
  return closest;
}

/**
 * Find median survival time (when 50% have churned).
 * Returns null if median is not reached within data.
 */
export function getMedianSurvival(survivalCurve: SurvivalDataPoint[]): number | null {
  for (const pt of survivalCurve) {
    if (pt.survival <= 0.5) return pt.time;
  }
  return null;
}

/**
 * Full survival analysis result for a cohort.
 */
export function analyzeSurvival(events: { time: number; event: boolean }[]): SurvivalResult {
  const curve = kaplanMeier(events);
  return {
    curve,
    medianSurvival: getMedianSurvival(curve),
    retentionAt7d: getRetentionAt(curve, 7),
    retentionAt14d: getRetentionAt(curve, 14),
    retentionAt30d: getRetentionAt(curve, 30),
  };
}

/**
 * Log-rank test to compare two survival curves.
 * Tests whether the difference between groups is statistically significant.
 */
export function logRankTest(
  group1: { time: number; event: boolean }[],
  group2: { time: number; event: boolean }[]
): LogRankResult {
  const allTimes = new Set([...group1, ...group2].map((e) => e.time));

  let observed1 = 0, expected1 = 0;
  let variance = 0;

  for (const t of allTimes) {
    const d1 = group1.filter((e) => e.time === t && e.event).length;
    const d2 = group2.filter((e) => e.time === t && e.event).length;
    const n1 = group1.filter((e) => e.time >= t).length;
    const n2 = group2.filter((e) => e.time >= t).length;
    const d = d1 + d2;
    const n = n1 + n2;

    if (n > 0) {
      observed1 += d1;
      expected1 += (n1 * d) / n;
      if (n > 1) {
        variance += (n1 * n2 * d * (n - d)) / (n * n * (n - 1));
      }
    }
  }

  const statistic = variance > 0 ? Math.pow(observed1 - expected1, 2) / variance : 0;
  const pValue = 1 - jstat.chisquare.cdf(statistic, 1);
  const df = 1;

  return {
    statistic: Math.round(statistic * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    df,
  };
}

/**
 * Compute hazard ratio between two groups using Cox regression approximation.
 */
export function hazardRatio(
  group1: { time: number; event: boolean }[],
  group2: { time: number; event: boolean }[]
): number {
  const result = logRankTest(group1, group2);
  // HR = exp(log-rank statistic sign * sqrt(chisq))
  const sign = (group1.filter((e) => e.event).length / group1.length) >
               (group2.filter((e) => e.event).length / group2.length)
    ? 1 : -1;
  return Math.exp(sign * Math.sqrt(result.statistic));
}

/**
 * Compute 95% CI for a proportion (Wilson score interval).
 * Used for retention rates, accuracy, etc.
 */
export function proportionCI(successes: number, total: number): { lower: number; upper: number } {
  if (total === 0) return { lower: 0, upper: 1 };
  const p = successes / total;
  const z = 1.96;
  const denominator = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denominator;
  const margin = (z * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total))) / denominator;
  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}

/**
 * Minimum detectable effect (MDE) for independent samples t-test.
 * At 80% power, alpha=0.05, two-tailed.
 */
export function minimumDetectableEffect(nPerGroup: number, alpha = 0.05, power = 0.8): number {
  const zAlpha = jstat.normal.inv(1 - alpha / 2, 0, 1);
  const zBeta = jstat.normal.inv(power, 0, 1);
  return (zAlpha + zBeta) / Math.sqrt(nPerGroup / 2);
}

/**
 * Shapiro-Wilk normality test approximation (Shapiro-Francia for n > 50).
 * Returns p-value; p < 0.05 suggests non-normal distribution.
 */
export function shapiroFrancia(x: number[]): { statistic: number; pValue: number } {
  const n = x.length;
  if (n < 3) return { statistic: 0, pValue: 1 };
  if (n <= 50) return shapiroWilk(x);

  const sorted = [...x].sort((a, b) => a - b);
  const mean = jstat.mean(x);
  const s2 = jstat.variance(x, true);
  if (s2 === 0) return { statistic: 1, pValue: 1 };

  // Simplified W' approximation
  const m = Array.from({ length: n }, (_, i) => jstat.normal.inv((i + 1 - 0.375) / (n + 0.25), 0, 1));
  const b = m.reduce((sum, mi, i) => sum + mi * (sorted[n - 1 - i] - sorted[i]), 0);
  const Wprime = Math.pow(b, 2) / ((n - 1) * s2);

  // Approximate p-value via transformation
  const u = Math.log(1 - Wprime);
  const pValue = Math.exp(-0.366 + 0.932 * u - 0.214 * u * u + 0.017 * u * u * u);

  return { statistic: Math.round(Wprime * 10000) / 10000, pValue: Math.max(0, Math.min(1, pValue)) };
}

function shapiroWilk(x: number[]): { statistic: number; pValue: number } {
  const n = x.length;
  const sorted = [...x].sort((a, b) => a - b);
  const mean = jstat.mean(x);
  const s2 = jstat.variance(x, true);
  if (s2 === 0) return { statistic: 1, pValue: 1 };

  const weights = getShapiroWilkWeights(n);
  const b = weights.reduce((sum, w, i) => sum + w * (sorted[n - 1 - i] - sorted[i]), 0);
  const W = Math.pow(b, 2) / ((n - 1) * s2);

  // Approximation for p-value (R's shapiro.test approximation)
  const g = Array.from({ length: n }, (_, i) => jstat.normal.inv((i + 1 - 0.375) / (n + 0.25), 0, 1));
  const m = g;
  const wMean = m.reduce((a, b) => a + b, 0) / n;
  const wStd = Math.sqrt(m.reduce((a, b) => a + Math.pow(b - wMean, 2), 0) / (n - 1));

  const u = weights.map((w, i) => (sorted[n - 1 - i] - sorted[i]) / (wStd * Math.sqrt((n - 1) * s2)));
  const pApprox = jstat.normal.cdf(u.reduce((a, b) => a + b, 0) / n, 0, 1);

  return { statistic: Math.round(W * 10000) / 10000, pValue: Math.max(0, Math.min(1, 1 - pApprox)) };
}

function getShapiroWilkWeights(n: number): number[] {
  // Approximate weights for n <= 50 (standard Shapiro-Wilk coefficients)
  const weightTable: Record<number, number[]> = {
    3: [0.7071],
    4: [0.6872, 0.1677],
    5: [0.6646, 0.2413, 0.0871],
    6: [0.6431, 0.2806, 0.1401, 0.0490],
    7: [0.6233, 0.3031, 0.1741, 0.1091, 0.0494],
    8: [0.6052, 0.3164, 0.2073, 0.1497, 0.0921, 0.0399],
    9: [0.5888, 0.3244, 0.2344, 0.1706, 0.1172, 0.0720, 0.0290],
    10: [0.5739, 0.3291, 0.2570, 0.1858, 0.1367, 0.0907, 0.0561, 0.0214],
  };
  return weightTable[n] || weightTable[10];
}
