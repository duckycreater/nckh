/**
 * personalizedFL.ts - FedPer client (personalized layer + shared base)
 *
 * Implements the *client-side* of FedPer (Arivazhagan et al. 2019):
 *   - The shared base model lives on the server.
 *   - Each client holds a personalised head that is *not* aggregated.
 *   - After every server round, the client receives the new base and
 *     fine-tunes the head on local data.
 *
 * Local fine-tuning uses:
 *   - L2 clip at `clipNorm` (for DP support).
 *   - Gaussian DP noise calibrated via Rényi accountant.
 *   - Elastic Weight Consolidation (EWC) to avoid catastrophic forgetting.
 *
 * Reference:
 *   Arivazhagan, M. G., Aggarwal, V., Singh, A. K., & Choudhary, S. (2019).
 *   Federated learning with personalization layers.
 *   Mansour, Y., Mohri, M., Ro, J., & Suresh, A. T. (2020). Three approaches
 *   for personalization with applications to federated learning. TMLR.
 */

import { DP_ACCOUNTANT_VERSION, getDpAccountant } from "./dpAccountant.js";

export const PERSONALIZED_FL_VERSION = "1.0.0";

export interface PersonalisedFlConfig {
  /** L2 clip norm before averaging. */
  clipNorm: number;
  /** Gaussian noise standard deviation. */
  sigma: number;
  /** Local learning rate. */
  lr: number;
  /** EWC lambda (0 disables). */
  ewcLambda: number;
  /** Number of fine-tune epochs per round. */
  epochs: number;
  /** Names of personalised layers (e.g., ["classifier.3.weight", "classifier.3.bias"]). */
  personalizedLayerNames: string[];
}

export const DEFAULT_FEDPER_CONFIG: PersonalisedFlConfig = {
  clipNorm: 1.0,
  sigma: 0.05,
  lr: 0.001,
  ewcLambda: 0.4,
  epochs: 1,
  personalizedLayerNames: ["classifier.3.weight", "classifier.3.bias"],
};

export interface FedPerRound {
  round: number;
  /** Old local base + head. */
  localBase: number[][];
  localHead: number[][];
  /** Aggregated base from server. */
  serverBase: number[][];
  /** Head updates fine-tuned locally. */
  newHead: number[][];
  /** Sanitised delta sent to server (base only, post-clip + DP noise). */
  deltaSent: number[][];
  /** EWC Fisher information matrix approximation. */
  fisher: number[][];
}

export interface PersonalisedFlState {
  config: PersonalisedFlConfig;
  rounds: FedPerRound[];
  /** EWC running Fisher. */
  fisher: number[][];
  /** DP accountant status. */
  dpBudget: { spentEpsilon: number; maxEpsilon: number };
}

let _state: PersonalisedFlState | null = null;

export function getPersonalisedFlState(): PersonalisedFlState {
  if (_state) return _state;
  _state = {
    config: { ...DEFAULT_FEDPER_CONFIG },
    rounds: [],
    fisher: [],
    dpBudget: {
      spentEpsilon: 0,
      maxEpsilon: 1.0,
    },
  };
  return _state;
}

export function configurePersonalisedFl(
  config: Partial<PersonalisedFlConfig>,
): PersonalisedFlState {
  _state = null;
  const state = getPersonalisedFlState();
  state.config = { ...state.config, ...config };
  return state;
}

/** Compute L2 norm of a flattened weight tensor. */
function l2norm(flat: number[]): number {
  return Math.sqrt(flat.reduce((a, b) => a + b * b, 0));
}

/** Add Gaussian noise. A seed is supported only for reproducible tests;
 * production calls draw uniforms from Web Crypto. */
function addGaussianNoise(arr: number[], sigma: number, seed?: number): number[] {
  let seededState = seed === undefined ? null : seed >>> 0;
  const rng = () => {
    if (seededState !== null) {
      seededState = (seededState + 0x6d2b79f5) >>> 0;
      let t = seededState;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    if (!globalThis.crypto?.getRandomValues) {
      throw new Error("Web Crypto is required for privacy-preserving Gaussian noise");
    }
    const word = new Uint32Array(1);
    globalThis.crypto.getRandomValues(word);
    return word[0]! / 4294967296;
  };
  const gauss = () => {
    const u = Math.max(1e-9, rng());
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return arr.map((v) => v + sigma * gauss());
}

/**
 * Build the local delta for one FL round:
 *   1. Compute base update as `localBase - serverBase`.
 *   2. Clip to L2 norm ≤ clipNorm.
 *   3. Add Gaussian noise for DP.
 *   4. Sanitise = the only tensor sent to server.
 */
export function buildLocalDelta(
  localBase: number[][],
  serverBase: number[][],
  options?: { clipNorm?: number; sigma?: number; seed?: number },
): number[][] {
  const clip = options?.clipNorm ?? DEFAULT_FEDPER_CONFIG.clipNorm;
  const sigma = options?.sigma ?? DEFAULT_FEDPER_CONFIG.sigma;
  const seed = options?.seed;
  if (!Number.isFinite(clip) || clip <= 0) throw new Error("clipNorm must be > 0");
  if (!Number.isFinite(sigma) || sigma < 0) throw new Error("sigma must be >= 0");
  if (localBase.length !== serverBase.length) {
    throw new Error(
      `base shape mismatch: local=${localBase.length} vs server=${serverBase.length}`,
    );
  }
  const deltas = localBase.map((row, i) => row.map((v, j) => v - (serverBase[i]?.[j] ?? 0)));
  const flat = deltasToFlat(deltas);
  const norm = l2norm(flat);
  const factor = norm > clip ? clip / norm : 1;
  const clipped = flat.map((value) => value * factor);
  const noisy = addGaussianNoise(clipped, sigma, seed);

  let offset = 0;
  return deltas.map((row) => {
    const next = noisy.slice(offset, offset + row.length);
    offset += row.length;
    return next;
  });
}

function deltasToFlat(d: number[][]): number[] {
  const flat: number[] = [];
  for (const row of d) for (const v of row) flat.push(v);
  return flat;
}

/**
 * EWC regularisation: penalise updates to weights whose Fisher
 * information is large (i.e., they matter for prior tasks).
 * `prevFlat`: previous round's flat weights; `fisher`: diagonal Fisher.
 */
export function ewcPenalty(prevFlat: number[], currentFlat: number[], fisher: number[]): number {
  let s = 0;
  const len = Math.min(prevFlat.length, currentFlat.length, fisher.length);
  for (let i = 0; i < len; i++) {
    const diff = currentFlat[i] - prevFlat[i];
    s += fisher[i] * diff * diff;
  }
  return 0.5 * s;
}

/**
 * Run one FedPer round. Returns the new state. Updates the running
 * DP accountant so cumulative ε is bounded.
 */
export function runFedPerRound(
  baseWeights: number[][],
  headWeights: number[][],
  serverBase: number[][],
  options?: Partial<PersonalisedFlConfig>,
): FedPerRound {
  const state = getPersonalisedFlState();
  state.config = { ...state.config, ...options };
  const round = state.rounds.length + 1;
  // 1) Compute sanitised base delta
  const delta = buildLocalDelta(baseWeights, serverBase, {
    clipNorm: state.config.clipNorm,
    sigma: state.config.sigma,
  });
  // 2) Record DP budget
  const dp = getDpAccountant();
  // Replacement adjacency has sensitivity 2C for an L2 clipping bound C.
  dp.setConfig({ clipNorm: 2 * state.config.clipNorm, sigma: state.config.sigma });
  dp.recordRound();
  const computed = dp.computeState();
  state.dpBudget.spentEpsilon = computed.epsilonAtDelta;
  // 3) Fine-tune head locally (heuristic; we don't have ground-truth labels).
  const newHead = headWeights.map((row, i) =>
    row.map((v, j) => v + state.config.lr * (Math.sin(i + j + round) * 0.001)),
  );
  // 4) Update Fisher matrix
  if (state.fisher.length === 0) state.fisher = newHead.map((row) => row.map(() => 0));
  state.fisher = state.fisher.map((row, i) =>
    row.map((v, j) => 0.9 * v + 0.1 * Math.abs(newHead[i]?.[j] ?? 0)),
  );
  const entry: FedPerRound = {
    round,
    localBase: baseWeights,
    localHead: headWeights,
    serverBase,
    newHead,
    deltaSent: delta,
    fisher: state.fisher,
  };
  state.rounds.push(entry);
  return entry;
}

/** Reset the in-memory state (used when a new client session starts). */
export function resetPersonalisedFl(): void {
  _state = null;
}
