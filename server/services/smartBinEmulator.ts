/**
 * smartBinEmulator - Digital-twin simulator for smart waste bins
 *
 * Phase 5 (RCT infrastructure): lets the platform run experiments,
 * scenario-analysis, and collection-route optimization against
 * 100+ virtual bins WITHOUT requiring physical hardware.
 *
 * The emulator mirrors the contract of `smartBinAdapter.ts` so any
 * downstream code (impact, carbon ledger, collection routes) consumes
 * identical SmartBinReading objects whether the data came from
 * real ESP32 hardware or this emulator.
 *
 * Patterns simulated:
 *   - Lunchtime spike (10:30–13:00) at school bins
 *   - Weekend decay (0.4× weekday) at school bins
 *   - Household morning + evening peaks at household bins
 *   - Industrial continuous rate at factory bins
 *   - Battery degradation over time
 *   - Offline windows (sensor failure simulation)
 *
 * Used by:
 *   - `server/routes/impact.ts` for /api/impact/summary in "emulated" mode
 *   - `scripts/synthetic_rct.py` via shared JSON schema
 *   - `src/components/SmartBinTwin.tsx` for live dashboard
 *
 * See: docs/research/RESEARCH_PROPOSAL.md §3.3 (Intervention components)
 *      docs/research/THEORY_OF_CHANGE.md       §2.2 (Physical opportunity)
 */

import { type ImpactCategory, AVG_WEIGHT_G, CO2_FACTORS } from "./impactCalculator.js";
import { SmartBinAdapter, SmartBinReading } from "./smartBinAdapter.js";

export type BinKind = "school" | "household" | "factory" | "public_park";

export interface EmulatedBinProfile {
  deviceId: string;
  location: string;
  schoolId?: string;
  kind: BinKind;
  /** Capacity in kg before full */
  capacityKg: number;
  /** Baseline daily weight (kg, before daily-pattern multipliers) */
  baseDailyKg: number;
  /** Category distribution (must sum to 1). Drives 6-class weights. */
  categoryShares: Partial<Record<ImpactCategory, number>>;
  /** Daily-pattern function returning multiplier (0–∞) for hour [0..24). */
  hourlyPattern: (hour: number, dayOfWeek: number) => number;
  /** Battery decay curve: fraction remaining at ms-since-start (0..1). */
  battery: (elapsedMs: number) => number;
  /** Probability of offline window in [0..1] per hour. */
  offlineProb: number;
  /** Deterministic seed (for repeatable RCT runs). */
  rngSeed: number;
}

/**
 * Seeded PRNG (mulberry32). Reproducible across runs — critical for
 * pre-registered RCT analyses.
 */
function mulberry32(seed: number): () => number {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Default patterns — keep thin so they can be tuned in tests.
 */

function schoolHourly(hour: number, dow: number): number {
  // Lunch spike on weekdays (10–13h, peak at 12h → 4×)
  // After-school evening (16–18h) → 2×; otherwise baseline 0.4×.
  const isWeekend = dow === 0 || dow === 6;
  if (isWeekend) return 0.1;
  if (hour >= 10 && hour < 13) return 4.0 - Math.abs(hour - 11.5) * 0.6;
  if (hour >= 16 && hour < 18) return 2.0;
  if (hour >= 7 && hour < 19) return 0.5;
  return 0.1;
}

function householdHourly(hour: number, _dow: number): number {
  // Morning peak 6–8h, evening peak 18–21h.
  if (hour >= 6 && hour < 8) return 1.6;
  if (hour >= 18 && hour < 21) return 2.2;
  if (hour >= 11 && hour < 14) return 1.3;
  if (hour >= 0 && hour < 5) return 0.05;
  return 0.6;
}

function factoryHourly(hour: number, dow: number): number {
  const isWeekend = dow === 0 || dow === 6;
  if (isWeekend) return 0.0;
  if (hour >= 8 && hour < 17) return 1.4;
  return 0.2;
}

function publicHourly(hour: number, dow: number): number {
  const isWeekend = dow === 0 || dow === 6;
  if (hour >= 11 && hour < 20) return isWeekend ? 1.6 : 1.0;
  return 0.15;
}

function linearBattery(elapsedMs: number, start = 100, lifeMs = 90 * 24 * 3600_000): number {
  return Math.max(0, start - (start * elapsedMs) / lifeMs);
}

/**
 * Build a profile for one emulated bin. The factory below uses this
 * to generate 100 synthetic bins deterministically.
 */
export function buildProfile(
  deviceId: string,
  location: string,
  kind: BinKind,
  schoolId: string | undefined,
  seed: number,
  opts?: Partial<EmulatedBinProfile>
): EmulatedBinProfile {
  const defaults: EmulatedBinProfile = {
    deviceId,
    location,
    schoolId,
    kind,
    capacityKg: kind === "factory" ? 200 : 60,
    baseDailyKg: kind === "factory" ? 80 : kind === "school" ? 6 : 2.5,
    categoryShares: {
      plastic: 0.32,
      paper: 0.22,
      glass: 0.10,
      metal: 0.06,
      organic: 0.25,
      hazard: 0.05,
    },
    hourlyPattern:
      kind === "school"
        ? schoolHourly
        : kind === "household"
        ? householdHourly
        : kind === "factory"
        ? factoryHourly
        : publicHourly,
    battery: (e) => linearBattery(e),
    offlineProb: kind === "factory" ? 0.05 : 0.02,
    rngSeed: seed,
  };
  return { ...defaults, ...opts };
}

/**
 * Generate N emulated bins across K schools. Distribution:
 *   60% school, 25% household, 10% public_park, 5% factory
 * (Approximates Vietnamese urban secondary-school neighborhoods.)
 */
export function generateBins(opts: {
  schools: string[];
  totalBins: number;
  baseSeed?: number;
}): EmulatedBinProfile[] {
  const { schools, totalBins, baseSeed = 0xc0ffee } = opts;
  if (totalBins < schools.length * 5) {
    throw new Error("totalBins must be at least 5 per school for RCT validity");
  }
  const binsPerSchool = Math.floor(totalBins / schools.length);
  const bins: EmulatedBinProfile[] = [];

  for (let s = 0; s < schools.length; s++) {
    const schoolId = schools[s];
    for (let i = 0; i < binsPerSchool; i++) {
      const idx = s * binsPerSchool + i;
      // Allocation by share
      const r = (idx % 100) / 100;
      let kind: BinKind;
      if (r < 0.6) kind = "school";
      else if (r < 0.85) kind = "household";
      else if (r < 0.95) kind = "public_park";
      else kind = "factory";

      const deviceId = `${schoolId}-bin-${String(idx).padStart(4, "0")}`;
      const location =
        kind === "school"
          ? `${schoolId} — ${i < 4 ? "Block " + "ABCD"[i] : "Yard " + (i - 3)}`
          : kind === "household"
          ? `${schoolId} neighborhood — house ${i}`
          : kind === "public_park"
          ? `${schoolId} district — park ${i}`
          : `${schoolId} industrial zone — factory ${i}`;
      bins.push(buildProfile(deviceId, location, kind, schoolId, baseSeed + idx));
    }
  }
  // Top up if there's a remainder (assign to the first school)
  while (bins.length < totalBins) {
    const idx = bins.length;
    const deviceId = `${schools[0]}-bin-${String(idx).padStart(4, "0")}`;
    bins.push(buildProfile(deviceId, `${schools[0]} topup`, "school", schools[0], baseSeed + idx));
  }
  return bins;
}

/**
 * Single-bin deterministic snapshot for a given wall-clock time.
 * Used by both the live adapter and offline analysis.
 */
export function snapshot(
  profile: EmulatedBinProfile,
  now: number = Date.now()
): SmartBinReading {
  const rng = mulberry32(profile.rngSeed + Math.floor(now / (60 * 60_000)));
  const dt = new Date(now);
  const hour = dt.getHours();
  const dow = dt.getDay();

  const multiplier = profile.hourlyPattern(hour, dow);
  const isOffline = rng() < profile.offlineProb * (1 / 24); // per-snapshot prob

  if (isOffline) {
    return {
      deviceId: profile.deviceId,
      location: profile.location,
      timestamp: now,
      weightsByCategory: {},
      totalKg: 0,
      batteryPercent: Math.round(profile.battery(now - profile.rngSeed * 1000)),
      isOnline: false,
    };
  }

  // Per-category weight = base × share × multiplier × capacity-utilization noise
  const baseDaily = profile.baseDailyKg * multiplier;
  const weightsByCategory: Partial<Record<ImpactCategory, number>> = {};
  let totalKg = 0;
  for (const cat of Object.keys(profile.categoryShares) as ImpactCategory[]) {
    const share = profile.categoryShares[cat] ?? 0;
    const noise = 0.8 + rng() * 0.4; // 0.8x–1.2x
    const kg = (baseDaily * share * noise) / 24; // per hour contribution
    const rounded = Math.round(kg * 1000) / 1000;
    weightsByCategory[cat] = rounded;
    totalKg += rounded;
  }
  totalKg = Math.round(totalKg * 1000) / 1000;

  return {
    deviceId: profile.deviceId,
    location: profile.location,
    timestamp: now,
    weightsByCategory,
    totalKg,
    batteryPercent: Math.round(profile.battery(now - profile.rngSeed * 1000)),
    isOnline: true,
  };
}

/**
 * Aggregate impact across all bins for a given time window.
 * Mirrors the contract that `impactCalculator.ts` and the carbon
 * ledger expect.
 */
export function aggregateImpact(
  profiles: EmulatedBinProfile[],
  startMs: number,
  endMs: number,
  stepMinutes = 60
) {
  const categories = Object.keys(AVG_WEIGHT_G) as ImpactCategory[];
  const totals: Record<ImpactCategory, number> = {
    plastic: 0, paper: 0, glass: 0, metal: 0, organic: 0, hazard: 0,
  };
  let co2Total = 0;
  let binsOnline = 0;
  const stepMs = stepMinutes * 60_000;

  for (const p of profiles) {
    for (let t = startMs; t < endMs; t += stepMs) {
      const s = snapshot(p, t);
      if (!s.isOnline) continue;
      for (const cat of categories) {
        const kg = s.weightsByCategory[cat] || 0;
        totals[cat] += kg;
        co2Total += kg * CO2_FACTORS[cat];
      }
      binsOnline++;
    }
  }

  const totalKg = Object.values(totals).reduce((a, b) => a + b, 0);
  return {
    binsOnline,
    byCategory: totals,
    totalKg: Math.round(totalKg * 1000) / 1000,
    co2KgSaved: Math.round(co2Total * 1000) / 1000,
  };
}

/**
 * Adapter that implements SmartBinAdapter on top of the emulator.
 * Drop-in replacement for StubAdapter / HTTPAdapter.
 */
export class EmulatorAdapter implements SmartBinAdapter {
  readonly adapterType = "emulator";

  constructor(
    private profiles: EmulatedBinProfile[],
    private rngOverride?: () => number
  ) {
    this.indexById();
  }

  private idIndex: Map<string, EmulatedBinProfile> = new Map();
  private indexById() {
    this.idIndex.clear();
    for (const p of this.profiles) this.idIndex.set(p.deviceId, p);
  }

  async getReading(deviceId: string): Promise<SmartBinReading> {
    const p = this.idIndex.get(deviceId);
    if (!p) {
      throw new Error(`EmulatorAdapter: unknown device ${deviceId}`);
    }
    return snapshot(p, Date.now());
  }

  async getReadings(deviceIds: string[]): Promise<SmartBinReading[]> {
    return Promise.all(deviceIds.map((id) => this.getReading(id)));
  }

  async ping(deviceId: string): Promise<boolean> {
    return this.idIndex.has(deviceId);
  }

  /** Convenience: snapshot all bins now. */
  async getAllReadings(now: number = Date.now()): Promise<SmartBinReading[]> {
    return this.profiles.map((p) => snapshot(p, now));
  }

  /** Convenience: aggregate impact for "live" dashboard. */
  async summarizeForLastHours(hours = 24) {
    const now = Date.now();
    return aggregateImpact(this.profiles, now - hours * 3600_000, now, 60);
  }
}

/**
 * Singleton for RCT / global impact dashboard. Loaded lazily so the
 * default REST server doesn't pay emulator boot cost unless someone
 * calls `getEmulator()`.
 */
let _singleton: EmulatorAdapter | null = null;
export function getEmulator(
  opts: { schools?: string[]; totalBins?: number } = {}
): EmulatorAdapter {
  if (_singleton) return _singleton;
  const schools = opts.schools ?? ["school_a", "school_b", "school_c", "school_d", "school_e"];
  const totalBins = opts.totalBins ?? 100;
  const profiles = generateBins({ schools, totalBins });
  _singleton = new EmulatorAdapter(profiles);
  return _singleton;
}

/** Reset the singleton — used by `scripts/synthetic_rct.py` to vary seeds. */
export function resetEmulator(): void {
  _singleton = null;
}
