/**
 * federatedWorker.ts — Off-main-thread federated training math.
 *
 * Why a worker?
 *   Even though our model is small (~6-category per-device score vector),
 *   the Gaussian noise sampling + EWC Fisher approximation is O(N) per scan
 *   and we want zero main-thread jank during a scan.
 *
 * Wire protocol:
 *   inbound  { id, type: "train", payload: { scores, scanHistory, epsilon, delta } }
 *   outbound { id, ok: true,  result: { updatedScores, fisher, round } }
 *         or { id, ok: false, error }
 *
 * This worker doesn't import React or any browser globals; it lives in
 * Vite as `?worker` so esbuild bundles it separately.
 */

/// <reference lib="webworker" />

export interface TrainRequest {
  id: number;
  type: "train";
  payload: {
    /** Per-category score vector. */
    scores: Record<string, number>;
    /** Recent classification history, oldest first. */
    scanHistory: Array<{ category: string; confidence: number; corrected?: string }>;
    /** DP ε budget for this round. */
    epsilon: number;
    /** DP δ for this round (default 1e-5). */
    delta: number;
    /** Round number (monotonically increasing). */
    round: number;
  };
}

export interface TrainResponse {
  id: number;
  ok: boolean;
  result?: {
    updatedScores: Record<string, number>;
    fisher: Record<string, number>;
    round: number;
    /** Gaussian sigma that was added (informational). */
    noiseSigma: number;
    /** EWC penalty at the end of this round. */
    ewcPenalty: number;
  };
  error?: string;
}

/** Box-Muller Gaussian noise — runs in worker thread so no main-thread cost. */
function gaussian(sigma: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1 || 1e-9)) * Math.cos(2 * Math.PI * u2) * sigma;
}

/** Calibrated sigma for (ε, δ)-Gaussian mechanism with sensitivity = 1. */
function noiseSigmaFor(epsilon: number, delta: number): number {
  // Standard analytical Gaussian mechanism: σ ≥ sqrt(2 ln(1.25/δ)) / ε
  return Math.sqrt(2 * Math.log(1.25 / Math.max(delta, 1e-9))) / Math.max(epsilon, 1e-3);
}

function elasticsWeightConsolidation(scores: Record<string, number>, fisher: Record<string, number>): number {
  let penalty = 0;
  for (const k of Object.keys(scores)) {
    const w = Math.abs(scores[k]);
    const f = fisher[k] ?? 0;
    penalty += f * w * w;
  }
  return penalty;
}

function handleTrain(req: TrainRequest): TrainResponse {
  const { scores, scanHistory, epsilon, delta, round } = req.payload;
  try {
    const updated = { ...scores };
    const fisher = { ...updated };

    for (const sample of scanHistory) {
      const target = sample.corrected || sample.category;
      const grad = Math.max(0, sample.confidence - 0.5) * 2 - 1; // crude pseudo-gradient
      updated[target] = (updated[target] ?? 0) + grad * 0.001;
      fisher[target] = (fisher[target] ?? 0) + grad * grad;
    }

    const sigma = noiseSigmaFor(epsilon, delta);
    for (const k of Object.keys(updated)) {
      updated[k] += gaussian(sigma);
    }

    const penalty = elasticsWeightConsolidation(updated, fisher);

    return {
      id: req.id,
      ok: true,
      result: {
        updatedScores: updated,
        fisher,
        round,
        noiseSigma: sigma,
        ewcPenalty: penalty,
      },
    };
  } catch (e) {
    return { id: req.id, ok: false, error: (e as Error).message };
  }
}

self.onmessage = (ev: MessageEvent<TrainRequest>) => {
  const data = ev.data;
  if (!data || data.type !== "train") return;
  const response = handleTrain(data);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(response);
};

export {};
