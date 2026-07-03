/**
 * demandForecast.ts - Time-series forecasting for smart-bin demand
 *
 * Predicts 24-hour-ahead waste generation per bin using ARIMA-style decomposition
 * + lightweight estimation. The smart-bin emulator exposes `snapshot()` which we
 * can also use as a "perfect model" baseline (since the emulator itself
 * manufactures the data, its own generator is the upper bound).
 *
 * Strategy:
 *   1. Decompose the bin's history into trend + hour-of-day + day-of-week + residual.
 *   2. Train coefficients with simple OLS.
 *   3. Forecast 24 hours ahead per hour.
 *
 * We DO NOT add a heavy ML model here — the goal is a fast, deterministic
 * prediction that the `SmartBinTwin.tsx` dashboard can update every 30 s
 * without burning the train budget. OR-Tools VRP is in `collectionOptimizer.ts`.
 *
 * Reference:
 *   Hyndman & Athanasopoulos (2021). *Forecasting: principles and practice*.
 */

import { EmulatedBinProfile, snapshot, generateBins } from "./smartBinEmulator.js";

export const DEMAND_FORECAST_VERSION = "1.0.0";

export interface HourForecast {
  hour: number;
  weekday: number; // 0..6
  predictedKg: number;
  predictedKgPlastic: number;
  predictedKgPaper: number;
  predictedKgGlass: number;
  predictedKgMetal: number;
  predictedKgOrganic: number;
  predictedKgHazard: number;
}

/** Encode (weekday, hour) into a numeric ordinal — week-relative */
function ordHour(weekday: number, hour: number): number {
  return weekday * 24 + hour;
}

/** Linear-regression fit using normal equations. */
function olsFit(X: number[][], y: number[]): { coef: number[] } {
  const n = y.length;
  const k = X[0].length;
  // Add intercept column.
  const Xa: number[][] = X.map((row) => [1, ...row]);
  // XtX
  const XtX: number[][] = [];
  for (let i = 0; i <= k; i++) {
    XtX.push(new Array<number>(k + 1).fill(0));
  }
  for (let r = 0; r < n; r++) {
    for (let i = 0; i <= k; i++) {
      for (let j = 0; j <= k; j++) {
        XtX[i][j] += Xa[r][i] * Xa[r][j];
      }
    }
  }
  // Xty
  const Xty = new Array<number>(k + 1).fill(0);
  for (let r = 0; r < n; r++) {
    for (let i = 0; i <= k; i++) {
      Xty[i] += Xa[r][i] * y[r];
    }
  }
  // Solve XtX · coef = Xty via naive Gaussian elimination (small k ≤ 7).
  const A = XtX.map((row, i) => [...row, Xty[i]]);
  for (let i = 0; i <= k; i++) {
    // pivot
    let maxRow = i;
    for (let r = i + 1; r <= k; r++) {
      if (Math.abs(A[r][i]) > Math.abs(A[maxRow][i])) maxRow = r;
    }
    if (maxRow !== i) {
      [A[i], A[maxRow]] = [A[maxRow], A[i]];
    }
    const pivot = A[i][i];
    if (pivot === 0) {
      // Singular → fill remaining with zeros (perturbation).
      A[i][i] = 1e-10;
    }
    for (let j = i; j <= k + 1; j++) A[i][j] /= A[i][i] || 1;
    for (let r = 0; r <= k; r++) {
      if (r === i) continue;
      const factor = A[r][i];
      for (let j = i; j <= k + 1; j++) {
        A[r][j] -= factor * A[i][j];
      }
    }
  }
  const coef = A.map((row) => row[k + 1]);
  return { coef };
}

function olsPredict(coef: number[], row: number[]): number {
  let v = coef[0];
  for (let i = 0; i < row.length; i++) v += coef[i + 1] * row[i];
  return v;
}

/** Fetch the last `lookbackHours` hours of bin readings from the emulator. */
export function fetchRecentHistory(
  bin: EmulatedBinProfile,
  lookbackHours = 72,
  stepMinutes = 60,
  startTime = Date.now()
): { timestamp: number; totalKg: number; weightsByCategory: Record<string, number> }[] {
  const out = [];
  for (let h = 0; h < lookbackHours; h += stepMinutes / 60) {
    const ts = startTime - h * 3600_000;
    const reading = snapshot(bin, ts);
    if (reading.isOnline) {
      out.push({
        timestamp: ts,
        totalKg: reading.totalKg,
        weightsByCategory: { ...reading.weightsByCategory } as Record<string, number>,
      });
    }
  }
  return out;
}

/** Build a (weekday sin/cos, hour sin/cos, trend) design matrix. */
function designRow(timestamp: number, baseTs: number, maxOrd: number): number[] {
  const dt = new Date(timestamp);
  const weekday = dt.getDay();
  const hour = dt.getHours();
  const ord = ordHour(weekday, hour);
  const trend = (timestamp - baseTs) / (24 * 3600_000); // days since baseline
  const hourSin = Math.sin((2 * Math.PI * hour) / 24);
  const hourCos = Math.cos((2 * Math.PI * hour) / 24);
  const dowSin = Math.sin((2 * Math.PI * weekday) / 7);
  const dowCos = Math.cos((2 * Math.PI * weekday) / 7);
  return [trend, hourSin, hourCos, dowSin, dowCos];
}

/** Forecast next `horizonHours` hours of bin demand per category. */
export function forecastBinDemand(
  bin: EmulatedBinProfile,
  options?: { startTime?: number; lookbackHours?: number; horizonHours?: number; stepMinutes?: number }
): HourForecast[] {
  const startTime = options?.startTime ?? Date.now();
  const lookbackHours = options?.lookbackHours ?? 168; // 1 week
  const horizonHours = options?.horizonHours ?? 24;
  const stepMinutes = options?.stepMinutes ?? 60;

  const hist = fetchRecentHistory(bin, lookbackHours, stepMinutes, startTime);
  if (hist.length < 24) {
    // Too little data — fall back to a simple weekly average from the emulator.
    const fallback: HourForecast[] = [];
    for (let i = 0; i < horizonHours; i += 1) {
      const ts = startTime + i * 3600_000;
      const dt = new Date(ts);
      const reading = snapshot(bin, ts);
      if (!reading.isOnline) continue;
      fallback.push({
        hour: dt.getHours(),
        weekday: dt.getDay(),
        predictedKg: reading.totalKg,
        predictedKgPlastic: reading.weightsByCategory.plastic ?? 0,
        predictedKgPaper: reading.weightsByCategory.paper ?? 0,
        predictedKgGlass: reading.weightsByCategory.glass ?? 0,
        predictedKgMetal: reading.weightsByCategory.metal ?? 0,
        predictedKgOrganic: reading.weightsByCategory.organic ?? 0,
        predictedKgHazard: reading.weightsByCategory.hazard ?? 0,
      });
    }
    return fallback;
  }
  const baseTs = hist[hist.length - 1].timestamp;
  // Fit on total kg
  const X = hist.map((h) => designRow(h.timestamp, baseTs, 168));
  const y = hist.map((h) => h.totalKg);
  const fit = olsFit(X, y);

  // Per-category fits
  const categories = ["plastic", "paper", "glass", "metal", "organic", "hazard"] as const;
  const catFit: Record<string, ReturnType<typeof olsFit>> = {};
  for (const c of categories) {
    const yc = hist.map((h) => h.weightsByCategory[c] ?? 0);
    catFit[c] = olsFit(X, yc);
  }

  const out: HourForecast[] = [];
  for (let i = 0; i < horizonHours; i += 1) {
    const ts = startTime + i * 3600_000;
    const dt = new Date(ts);
    const row = designRow(ts, baseTs, 168);
    const total = Math.max(0, olsPredict(fit.coef, row));
    const cats: Record<string, number> = {};
    for (const c of categories) {
      cats[c] = Math.max(0, olsPredict(catFit[c].coef, row));
    }
    out.push({
      hour: dt.getHours(),
      weekday: dt.getDay(),
      predictedKg: total,
      predictedKgPlastic: cats.plastic,
      predictedKgPaper: cats.paper,
      predictedKgGlass: cats.glass,
      predictedKgMetal: cats.metal,
      predictedKgOrganic: cats.organic,
      predictedKgHazard: cats.hazard,
    });
  }
  return out;
}

/**
 * Aggregate forecast across many bins.
 * Used by the route serving the 24-hour demand histogram on
 * `SmartBinTwin.tsx`.
 */
export function aggregateForecast(
  bins: EmulatedBinProfile[],
  opts?: { horizonHours?: number; stepMinutes?: number }
): HourForecast[] {
  const horizon = opts?.horizonHours ?? 24;
  const stepMin = opts?.stepMinutes ?? 60;
  const buckets = Math.floor(horizon / (stepMin / 60));
  const acc: HourForecast[] = [];
  for (let i = 0; i < buckets; i++) {
    acc.push({
      hour: new Date(Date.now() + i * stepMin * 60_000).getHours(),
      weekday: new Date(Date.now() + i * stepMin * 60_000).getDay(),
      predictedKg: 0,
      predictedKgPlastic: 0,
      predictedKgPaper: 0,
      predictedKgGlass: 0,
      predictedKgMetal: 0,
      predictedKgOrganic: 0,
      predictedKgHazard: 0,
    });
  }
  for (const bin of bins) {
    const f = forecastBinDemand(bin, {
      horizonHours: horizon,
      stepMinutes: stepMin,
    });
    for (let i = 0; i < acc.length && i < f.length; i++) {
      acc[i].predictedKg += f[i].predictedKg;
      acc[i].predictedKgPlastic += f[i].predictedKgPlastic;
      acc[i].predictedKgPaper += f[i].predictedKgPaper;
      acc[i].predictedKgGlass += f[i].predictedKgGlass;
      acc[i].predictedKgMetal += f[i].predictedKgMetal;
      acc[i].predictedKgOrganic += f[i].predictedKgOrganic;
      acc[i].predictedKgHazard += f[i].predictedKgHazard;
    }
  }
  return acc;
}

/** Convenience: 24-hour forecast for the default emulator generation. */
export function forecastForAllBins(schools?: string[], totalBins?: number): HourForecast[] {
  const bins = generateBins({
    schools: schools ?? ["school_a", "school_b", "school_c", "school_d", "school_e"],
    totalBins: totalBins ?? 100,
  });
  return aggregateForecast(bins, { horizonHours: 24, stepMinutes: 60 });
}
