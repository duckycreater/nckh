/**
 * Shared types between federatedWorker and the rest of the app.
 */
export interface TrainingSample {
  features: number[];
  labelValue: number;
  /** Optional client-side timestamp (ms). */
  takenAt?: number;
}

export interface LocalUpdate {
  /** L2-clipped + Gaussian-noised gradient vector. */
  delta: number[];
  /** Number of samples used to compute this update. */
  numSamples: number;
  computedAt: number;
  /** Loss after the final epoch (training only, not aggregated). */
  epochLoss: number;
}

export interface FederatedConfig {
  clipNorm: number;
  sigma: number;
  epochs: number;
}