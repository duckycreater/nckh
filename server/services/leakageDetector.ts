/**
 * leakageDetector.ts - Smart-bin anomaly / leakage detector
 *
 * Detects situations where a bin's reading diverges from its
 * predicted distribution (per `demandForecast.ts`). When the residual
 * exceeds a threshold we emit a "leakage" alert — bin may have been:
 *   - mis-calibrated (sensor fault),
 *   - tampered with (theft of contents),
 *   - contaminated cross-stream (organic in a paper-only bin),
 *   - subject to unscheduled overflow.
 *
 * Algorithm:
 *   1. Reconstruct historical baseline per bin via Holt-Winters-style
 *      exponential smoothing.
 *   2. Compute residual of current observation vs prediction.
 *   3. Score via z-score + Isolation-Forest-style heuristic (random cuts).
 *   4. If z-score > 3 or any isolation-tree path is short → leak alert.
 *
 * Used by:
 *   - `routes/smartBin.ts` to push alerts in real time.
 *   - `src/components/SmartBinTwin.tsx` (red dot on the bin row).
 */

import { EmulatedBinProfile, snapshot } from "./smartBinEmulator.js";
import { forecastBinDemand } from "./demandForecast.js";

export const LEAKAGE_DETECTOR_VERSION = "1.0.0";

export type AlertSeverity = "info" | "warning" | "critical";

export interface LeakageAlert {
  deviceId: string;
  ts: number;
  severity: AlertSeverity;
  reason:
    | "zscore_overflow"
    | "category_imbalance"
    | "offline_repeat"
    | "residual_spike"
    | "negative_change";
  observed: number;
  expected: number;
  residual: number;
  zScore: number;
  message: string;
}

export interface DetectorConfig {
  zScoreThreshold: number;
  /** EWMA decay factor (0..1) — 0.05 ≈ 20-week effective window. */
  ewmaAlpha: number;
  /** Category-imbalance threshold: max fraction per category. */
  categoryImbalancePct: number;
  /** Maximum fraction of time the bin may be offline (rolling 24h). */
  maxOfflineFrac: number;
}

const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  zScoreThreshold: 3.0,
  ewmaAlpha: 0.05,
  categoryImbalancePct: 0.7,
  maxOfflineFrac: 0.4,
};

/** Per-bin rolling state. */
export interface BinDetectorState {
  deviceId: string;
  // EWMA of total kg
  ewmaMean: number;
  ewmaVar: number;
  lastObservedKg: number;
  lastForecastKg: number;
  rollingOfflineFrac: number;
  // EWMA of category shares
  categoryShares: Record<string, number>;
}

const binState = new Map<string, BinDetectorState>();
let config: DetectorConfig = { ...DEFAULT_DETECTOR_CONFIG };

export function configureLeakageDetector(c: Partial<DetectorConfig>): DetectorConfig {
  config = { ...config, ...c };
  return config;
}

/** Update state for one bin from a fresh observation. */
function updateState(
  bin: EmulatedBinProfile,
  observed: { totalKg: number; weightsByCategory: Record<string, number>; isOnline: boolean },
  forecastTotal: number
): BinDetectorState {
  const state = binState.get(bin.deviceId) ?? {
    deviceId: bin.deviceId,
    ewmaMean: 0,
    ewmaVar: 0,
    lastObservedKg: 0,
    lastForecastKg: forecastTotal,
    rollingOfflineFrac: 0,
    categoryShares: { plastic: 0, paper: 0, glass: 0, metal: 0, organic: 0, hazard: 0 },
  };
  const obs = observed.totalKg;
  // EWMA update — variance via Welford's online formula.
  const diff = obs - state.ewmaMean;
  state.ewmaMean = state.ewmaMean + config.ewmaAlpha * diff;
  state.ewmaVar = (1 - config.ewmaAlpha) * (state.ewmaVar + config.ewmaAlpha * diff * diff);
  state.lastObservedKg = obs;
  state.lastForecastKg = forecastTotal;
  state.rollingOfflineFrac = observed.isOnline
    ? state.rollingOfflineFrac * (1 - config.ewmaAlpha)
    : state.rollingOfflineFrac * (1 - config.ewmaAlpha) + config.ewmaAlpha;

  // Category shares update
  const total = obs || 1;
  for (const cat of Object.keys(state.categoryShares) as (keyof typeof state.categoryShares)[]) {
    const w = observed.weightsByCategory[cat] ?? 0;
    state.categoryShares[cat] = (1 - config.ewmaAlpha) * state.categoryShares[cat] + config.ewmaAlpha * (w / total);
  }
  binState.set(bin.deviceId, state);
  return state;
}

/** Compute residual z-score from current EWMA mean/var. */
function computeZScore(state: BinDetectorState, obs: number): number {
  const sd = Math.sqrt(state.ewmaVar || 1e-9);
  if (state.ewmaMean === 0) return 0;
  return (obs - state.ewmaMean) / sd;
}

/**
 * Lightweight Isolation Forest: randomly pick a feature split; the shorter
 * the average path to a leaf, the more anomalous the point.
 */
function isolationScore(
  state: BinDetectorState,
  observed: { totalKg: number; weightsByCategory: Record<string, number> },
  numTrees = 100,
  subSize = 32
): number {
  const features: Record<string, number> = {
    totalKg: observed.totalKg,
    ...Object.fromEntries(
      Object.entries(observed.weightsByCategory).map(([k, v]) => [k, observed.totalKg ? v / observed.totalKg : 0])
    ),
  };
  // We'll use the historical EWMA distribution as the "universe" of features
  // for forest training. Single-point isolation (no samples to draw) approximates
  // tree depth based on the difference between observation and EWMA.
  const sd = Math.sqrt(state.ewmaVar || 1e-3);
  let avgPathLen = 0;
  for (let t = 0; t < numTrees; t++) {
    let s = state.ewmaMean;
    let depth = 0;
    while (depth < 8) {
      const r = Math.random() - 0.5;
      s += r * sd;
      // Choose a "split feature" pseudo-randomly.
      const keys = Object.keys(features);
      const k = keys[Math.floor(Math.random() * keys.length)];
      if (Math.abs((observed.weightsByCategory[k] ?? observed.totalKg) - s) < sd * 0.5) break;
      depth++;
    }
    avgPathLen += depth;
  }
  avgPathLen /= numTrees;
  // Score is exponentially normalised: shorter path → higher score.
  const c = subSize > 1 ? 2 * (Math.log(subSize - 1) + 0.5772156649) - 2 * (subSize - 1) / subSize : 0;
  return Math.pow(2, -avgPathLen / (c || 1));
}

/**
 * Main entry: check one or many bins at a moment in time.
 * Returns a list of LeakageAlerts (possibly empty).
 */
export function detectLeakage(
  bins: EmulatedBinProfile[],
  options?: { lookbackHours?: number; config?: Partial<DetectorConfig> }
): LeakageAlert[] {
  if (options?.config) configureLeakageDetector(options.config);
  const alerts: LeakageAlert[] = [];
  const now = Date.now();
  for (const bin of bins) {
    const reading = snapshot(bin, now);
    const forecast = forecastBinDemand(bin, { horizonHours: 1, startTime: now });
    const expected = forecast.reduce((a, h) => a + h.predictedKg, 0);
    const state = updateState(
      bin,
      {
        totalKg: reading.totalKg,
        weightsByCategory: { ...reading.weightsByCategory } as Record<string, number>,
        isOnline: reading.isOnline,
      },
      expected
    );
    const z = computeZScore(state, reading.totalKg);

    // Rule 1: z-score overflow
    if (Math.abs(z) > config.zScoreThreshold) {
      alerts.push({
        deviceId: bin.deviceId,
        ts: now,
        severity: Math.abs(z) > 5 ? "critical" : "warning",
        reason: z > 0 ? "zscore_overflow" : "negative_change",
        observed: reading.totalKg,
        expected,
        residual: reading.totalKg - expected,
        zScore: z,
        message:
          z > 0
            ? `Residual ${(reading.totalKg - expected).toFixed(2)} kg > ${config.zScoreThreshold}σ — possible overflow.`
            : `Residual ${(reading.totalKg - expected).toFixed(2)} kg < ${-config.zScoreThreshold}σ — possible leak.`,
      });
    }

    // Rule 2: category imbalance
    if (reading.totalKg > 0) {
      const max = Math.max(
        ...Object.entries(reading.weightsByCategory).map(([, w]) => (w || 0) / reading.totalKg)
      );
      if (max > config.categoryImbalancePct) {
        alerts.push({
          deviceId: bin.deviceId,
          ts: now,
          severity: "warning",
          reason: "category_imbalance",
          observed: reading.totalKg,
          expected,
          residual: reading.totalKg - expected,
          zScore: z,
          message: `Category imbalance > ${(config.categoryImbalancePct * 100).toFixed(0)}% — possible stream contamination.`,
        });
      }
    }

    // Rule 3: offline repetition
    if (state.rollingOfflineFrac > config.maxOfflineFrac) {
      alerts.push({
        deviceId: bin.deviceId,
        ts: now,
        severity: "warning",
        reason: "offline_repeat",
        observed: 0,
        expected,
        residual: -expected,
        zScore: z,
        message: `Offline fraction ${(state.rollingOfflineFrac * 100).toFixed(0)}% in last 24h.`,
      });
    }

    // Rule 4: Isolation forest short path (random cutoff)
    const iScore = isolationScore(state, {
      totalKg: reading.totalKg,
      weightsByCategory: { ...reading.weightsByCategory } as Record<string, number>,
    });
    if (iScore > 0.85) {
      alerts.push({
        deviceId: bin.deviceId,
        ts: now,
        severity: "critical",
        reason: "residual_spike",
        observed: reading.totalKg,
        expected,
        residual: reading.totalKg - expected,
        zScore: z,
        message: `Isolation score ${iScore.toFixed(2)} — point is anomalous vs. bin's normal pattern.`,
      });
    }
  }
  return alerts;
}

/** Summary statistics across many bins. */
export interface LeakageSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  byReason: Record<string, number>;
}

export function summariseAlerts(alerts: LeakageAlert[]): LeakageSummary {
  const summary: LeakageSummary = {
    total: alerts.length,
    critical: 0,
    warning: 0,
    info: 0,
    byReason: {},
  };
  for (const a of alerts) {
    summary[a.severity]++;
    summary.byReason[a.reason] = (summary.byReason[a.reason] ?? 0) + 1;
  }
  return summary;
}
