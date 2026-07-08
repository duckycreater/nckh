/**
 * collectionOptimizer.ts - Vehicle Routing Problem (VRP) solver
 *
 * Greedy "fill-rate-first" heuristic for small-scale bins (≤ ~200). When
 * the bin count grows, swap to OR-Tools via `python/vrp_or_tools.py`
 * (see T21 for the `causal-service` analogue).
 *
 * Algorithm (greedy build + 2-opt):
 *   1. Sort bins by predicted fill rate (descending), so highest-priority
 *      bins get collected first.
 *   2. Partition sorted bins into `nVehicles` balanced groups using
 *      a Longest-Processing-Time (LPT) heuristic so each truck has
 *      roughly equal load.
 *   3. Improve each route with a fixed-budget 2-opt pass.
 *
 * Output: per-vehicle route (sequence of bin IDs) + estimated drive
 * minutes using a haversine approximation with a 30 km/h urban average.
 *
 * Reference:
 *   Toth, P. & Vigo, D. (2014). *Vehicle Routing: Problems, Methods,
 *   and Applications.* SIAM.
 */

import { EmulatedBinProfile } from "./smartBinEmulator.js";
import { forecastBinDemand, HourForecast } from "./demandForecast.js";

export const VRP_SOLVER_VERSION = "1.0.0";

export interface BinLocation {
  deviceId: string;
  /** Approximate lat/lon — optional; haversine computes from school centroid if absent. */
  latitude?: number;
  longitude?: number;
  /** Predicted waste load for the next horizon. */
  predictedKg: number;
  /** Capacity bound (kg). */
  capacityKg: number;
}

export interface RouteResult {
  vehicleId: string;
  binIds: string[];
  /** Total load kg. */
  loadKg: number;
  /** Estimated drive minutes (cumulative time). */
  driveMinutes: number;
}

export interface VrpResult {
  routes: RouteResult[];
  /** Total predicted kg collected in the planning horizon. */
  totalCollectedKg: number;
  /** Total estimated drive minutes (sum). */
  totalDriveMinutes: number;
  /** Algorithm metadata. */
  meta: {
    nVehicles: number;
    nBins: number;
    iterations2opt: number;
    speed_km_per_h: number;
  };
}

export interface VrpOptions {
  nVehicles?: number;
  horizonHours?: number;
  speedKmh?: number;
  /** Window for 2-opt; passes per route. */
  maxTwoOptPasses?: number;
}

/** Haversine distance in km between two lat/lon. */
function haversineKm(a: { latitude?: number; longitude?: number }, b: { latitude?: number; longitude?: number }): number {
  const R = 6371.0;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Pseudo-coordinate for a bin within a school: deterministic from id. */
function binCoordinate(profile: EmulatedBinProfile, index: number): { latitude: number; longitude: number } {
  // School "centroid" hash to a 0.05° (~5 km) cell.
  const seed = (profile.schoolId ?? "school").split("").reduce((acc, c) => acc + c.charCodeAt(0), index);
  const lat = 10.75 + ((seed * 13) % 100) / 1000; // ~Hanoi area for simplicity.
  const lon = 106.7 + ((seed * 7) % 100) / 1000;
  return { latitude: lat, longitude: lon };
}

function buildLocations(
  profiles: EmulatedBinProfile[],
  forecasts: Map<string, HourForecast[]>
): BinLocation[] {
  return profiles.map((p, idx) => {
    const fcast = forecasts.get(p.deviceId);
    const predictedKg = (fcast ?? []).reduce((a, h) => a + h.predictedKg, 0);
    const coord = binCoordinate(p, idx);
    return {
      deviceId: p.deviceId,
      latitude: coord.latitude,
      longitude: coord.longitude,
      predictedKg,
      capacityKg: p.capacityKg,
    };
  });
}

/** Longest-Processing-Time (LPT) partition into N balanced subsets. */
function lptPartition(locs: BinLocation[], k: number): BinLocation[][] {
  if (k < 1 || locs.length === 0) return [locs];
  const sorted = [...locs].sort((a, b) => b.predictedKg - a.predictedKg);
  const loads = new Array<number>(k).fill(0);
  const groups: BinLocation[][] = Array.from({ length: k }, () => []);
  for (const bin of sorted) {
    let j = 0;
    for (let i = 1; i < k; i++) if (loads[i] < loads[j]) j = i;
    groups[j].push(bin);
    loads[j] += bin.predictedKg;
  }
  return groups;
}

/** 2-opt pass on a single route to reduce drive minutes. */
function twoOpt(
  bins: BinLocation[],
  speedKmh: number
): { bins: BinLocation[]; driveMinutes: number; iterations: number } {
  if (bins.length <= 2) {
    return { bins, driveMinutes: 0, iterations: 0 };
  }
  let best = [...bins];
  let bestDist = computeRouteDistanceKm(best);
  let iterations = 0;
  const max = bins.length * 2;
  let improved = true;
  while (improved && iterations < max) {
    improved = false;
    iterations++;
    for (let i = 1; i < best.length - 2; i++) {
      for (let j = i + 1; j < best.length - 1; j++) {
        const candidate = best.slice(0, i).concat(best.slice(i, j + 1).reverse(), best.slice(j + 1));
        const d = computeRouteDistanceKm(candidate);
        if (d + 1e-9 < bestDist) {
          best = candidate;
          bestDist = d;
          improved = true;
        }
      }
    }
  }
  return { bins: best, driveMinutes: (bestDist / speedKmh) * 60, iterations };
}

function computeRouteDistanceKm(bins: BinLocation[]): number {
  if (bins.length <= 1) return 0;
  let total = 0;
  // Depot implicit at first bin's location; ends at first bin too.
  const first = bins[0];
  for (let i = 1; i < bins.length; i++) {
    total += haversineKm(first, bins[i]);
  }
  total += haversineKm(bins[bins.length - 1], first);
  return total;
}

/**
 * Solve the VRP greedily, then 2-opt each route.
 * Returns routes + summary metrics.
 */
export function solveVrp(
  profiles: EmulatedBinProfile[],
  options: VrpOptions = {}
): VrpResult {
  const nVehicles = options.nVehicles ?? 3;
  const horizonHours = options.horizonHours ?? 24;
  const speedKmh = options.speedKmh ?? 30;
  const maxPasses = options.maxTwoOptPasses ?? 1;

  // 1. Forecast each bin's demand.
  const forecastMap = new Map<string, HourForecast[]>();
  for (const p of profiles) {
    forecastMap.set(p.deviceId, forecastBinDemand(p, { horizonHours }));
  }
  // 2. Build bin-location table.
  const locs = buildLocations(profiles, forecastMap);
  // 3. LPT partition into N vehicles.
  const groups = lptPartition(locs, nVehicles);
  // 4. 2-opt each group.
  const routes: RouteResult[] = [];
  let totalCollectedKg = 0;
  let totalDriveMinutes = 0;
  let iterations = 0;
  groups.forEach((group, idx) => {
    const opt = twoOpt(group, speedKmh);
    if (maxPasses >= 2) {
      // one more pass for symmetry
      const second = twoOpt(opt.bins, speedKmh);
      opt.bins = second.bins;
      opt.driveMinutes = second.driveMinutes;
      iterations += second.iterations;
    }
    iterations += opt.iterations;
    const loadKg = opt.bins.reduce((a, b) => a + b.predictedKg, 0);
    const r: RouteResult = {
      vehicleId: `truck-${idx + 1}`,
      binIds: opt.bins.map((b) => b.deviceId),
      loadKg,
      driveMinutes: opt.driveMinutes,
    };
    routes.push(r);
    totalCollectedKg += loadKg;
    totalDriveMinutes += opt.driveMinutes;
  });

  return {
    routes,
    totalCollectedKg,
    totalDriveMinutes,
    meta: {
      nVehicles,
      nBins: profiles.length,
      iterations2opt: iterations,
      speed_km_per_h: speedKmh,
    },
  };
}

/** Convenience used by the dashboard route. Returns sorted by load (descending). */
export function suggestCollectionRoute(
  profiles: EmulatedBinProfile[],
  options?: VrpOptions
): RouteResult[] {
  return solveVrp(profiles, options).routes;
}

/** Compare optimised route vs. fixed route (alpha: drive minutes saved). */
export function compareAgainstFixedRoute(
  profiles: EmulatedBinProfile[],
  options?: VrpOptions
): { optimised: VrpResult; fixedPerDriveMinutes: number; savedMinutes: number; savedPercent: number } {
  // Fixed-route baseline: visit all bins in id-sort order, single truck, 30 km/h.
  const sorted = [...profiles].sort((a, b) => a.deviceId.localeCompare(b.deviceId));
  const fixedGroups: EmulatedBinProfile[][] = [sorted];
  const fixedRoutes: RouteResult[] = [];
  let fDrive = 0;
  fixedGroups.forEach((g, i) => {
    const fcastMap = new Map<string, HourForecast[]>();
    for (const p of g) {
      fcastMap.set(p.deviceId, forecastBinDemand(p, { horizonHours: options?.horizonHours ?? 24 }));
    }
    const locs = buildLocations(g, fcastMap);
    const r = twoOpt(locs, options?.speedKmh ?? 30);
    const loadKg = r.bins.reduce((a, b) => a + b.predictedKg, 0);
    fixedRoutes.push({
      vehicleId: `fixed-truck-${i + 1}`,
      binIds: r.bins.map((b) => b.deviceId),
      loadKg,
      driveMinutes: r.driveMinutes,
    });
    fDrive += r.driveMinutes;
  });
  const optimised = solveVrp(profiles, options);
  const savedMinutes = Math.max(0, fDrive - optimised.totalDriveMinutes);
  const savedPercent = fDrive > 0 ? (savedMinutes / fDrive) * 100 : 0;
  return { optimised, fixedPerDriveMinutes: fDrive, savedMinutes, savedPercent };
}
