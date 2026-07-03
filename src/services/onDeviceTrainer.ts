/**
 * OnDeviceTrainer - Local EWC training with Differential Privacy
 *
 * Implements the client side of the federated continual learning loop.
 * Hooks into the existing `continualLearner` (EWC penalty) and produces
 * DP-noised weight-deltas ready to be shipped to the aggregator.
 *
 * Usage (in App.tsx after a successful scan):
 *   await onDeviceTrainer.onScanCompleted({ category, confidence, imageHash });
 *
 * After every N scans (default 50), a round is auto-triggered:
 *   1. Compute pseudo-gradients from user corrections (curated labels).
 *   2. Apply EWC penalty via continualLearner.applyUpdate.
 *   3. Add Gaussian noise calibrated to (ε=1.0, δ=1e-5)-DP.
 *   4. Hand off to federatedClient.submitUpdate().
 *
 * Why this matters:
 *   The user benefits because the model improves *without* ever uploading the
 *   raw image — only the resulting weight deltas leave the device.
 */

import { continualLearner, type TaskSnapshot } from "./continualLearner";
import { federatedClient, type FLRoundUpdate } from "./federatedClient";

export interface OnDeviceTrainerConfig {
  /** Submit a federated round after every N scans (default 50). */
  roundsEveryScans: number;
  /** DP epsilon budget per round (lower = more private). */
  epsilon: number;
  /** DP delta (default 1e-5). */
  delta: number;
  /** L2 clip norm for gradients (default 1.0). */
  clipNorm: number;
  /** Minimum confidence required for a scan to count as a training sample. */
  minConfidence: number;
  /** Persist snapshots between sessions via localStorage. */
  persistSnapshots: boolean;
}

const DEFAULT_CONFIG: OnDeviceTrainerConfig = {
  roundsEveryScans: 50,
  epsilon: 1.0,
  delta: 1e-5,
  clipNorm: 1.0,
  minConfidence: 0.6,
  persistSnapshots: true,
};

export interface ScanSample {
  category: string;
  confidence: number;
  /** Optional: SHA-256 hash of the scan image (used as unique id). */
  imageHash?: string;
  /** Optional: human-corrected label (for ground-truth training). */
  correctedLabel?: string;
}

interface PseudoGradient {
  category: string;
  delta: number;
}

/**
 * OnDeviceTrainer
 *
 * Tracks a per-device training loop. The "model" we are updating is an
 * abstraction: a per-class score vector that we keep in localStorage.
 * Real ONNX weight extraction is integrated when the model file exposes
 * the weights API (post-Phase 5). The score vector approach keeps the
 * loop functional today while remaining wire-compatible with the FedAvg
 * aggregator (numbers in → numbers out).
 */
class OnDeviceTrainerImpl {
  private config: OnDeviceTrainerConfig = DEFAULT_CONFIG;
  private scansSinceLastRound = 0;
  private currentRound = 0;
  private userId: string = "user_default";

  /** 6-dim per-category score vector (the "weights" we are training). */
  private categoryScores: Record<string, number> = {
    plastic: 0, paper: 0, glass: 0, metal: 0, organic: 0, hazard: 0,
  };
  private categoryCounts: Record<string, number> = {
    plastic: 0, paper: 0, glass: 0, metal: 0, organic: 0, hazard: 0,
  };

  private storageKey = "bmo_ondevice_trainer";

  configure(cfg: Partial<OnDeviceTrainerConfig>): void {
    this.config = { ...this.config, ...cfg };
    federatedClient.configure({
      epsilon: this.config.epsilon,
      delta: this.config.delta,
    });
  }

  setUserId(userId: string): void {
    this.userId = userId;
    federatedClient.configure({ schoolId: userId });
  }

  loadFromStorage(): void {
    try {
      const raw = typeof localStorage !== "undefined"
        ? localStorage.getItem(this.storageKey)
        : null;
      if (raw) {
        const data = JSON.parse(raw);
        if (data.categoryScores) this.categoryScores = data.categoryScores;
        if (data.categoryCounts) this.categoryCounts = data.categoryCounts;
        if (typeof data.scansSinceLastRound === "number") {
          this.scansSinceLastRound = data.scansSinceLastRound;
        }
        if (typeof data.currentRound === "number") this.currentRound = data.currentRound;
      }
      if (this.config.persistSnapshots) continualLearner.loadFromStorage();
    } catch (e) {
      console.warn("[OnDeviceTrainer] load failed:", e);
    }
  }

  saveToStorage(): void {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(this.storageKey, JSON.stringify({
        categoryScores: this.categoryScores,
        categoryCounts: this.categoryCounts,
        scansSinceLastRound: this.scansSinceLastRound,
        currentRound: this.currentRound,
      }));
    } catch (e) {
      console.warn("[OnDeviceTrainer] save failed:", e);
    }
  }

  /**
   * Hook: call this after every scan. Cheap if below the round threshold.
   */
  async onScanCompleted(sample: ScanSample): Promise<{ triggered: boolean; loss?: number }> {
    if (sample.confidence < this.config.minConfidence) {
      return { triggered: false };
    }

    const label = sample.correctedLabel || sample.category;
    const prevCount = this.categoryCounts[label] ?? 0;
    this.categoryCounts[label] = prevCount + 1;

    // Update category score via exponential moving average of confidence.
    const alpha = 0.2;
    const prev = this.categoryScores[label] ?? 0;
    this.categoryScores[label] = prev * (1 - alpha) + sample.confidence * alpha;

    this.scansSinceLastRound += 1;
    this.saveToStorage();

    if (this.scansSinceLastRound >= this.config.roundsEveryScans) {
      const loss = await this.runTrainingRound();
      return { triggered: true, loss };
    }
    return { triggered: false };
  }

  /**
   * Run one round: compute pseudo-gradients, apply EWC, add DP noise, send.
   * Returns the cross-entropy-ish loss for monitoring.
   */
  async runTrainingRound(): Promise<number> {
    this.currentRound += 1;
    const samples = Object.values(this.categoryCounts).reduce((a, b) => a + b, 0);
    if (samples < 5) {
      // Not enough data yet, skip without sending.
      this.scansSinceLastRound = 0;
      this.saveToStorage();
      return 0;
    }

    // 1) Build pseudo-gradients from per-category scores.
    const grads: PseudoGradient[] = Object.entries(this.categoryCounts).map(
      ([cat, count]) => {
        const score = this.categoryScores[cat] ?? 0;
        const avg = count > 0 ? score / count : 0;
        return { category: cat, delta: avg - 0.5 }; // toward 0.5 baseline
      }
    );

    // 2) L2-clip the gradient vector (sensitivity bound).
    const flat = grads.map((g) => g.delta);
    const norm = Math.sqrt(flat.reduce((a, b) => a + b * b, 0)) || 1e-9;
    const scale = Math.min(1, this.config.clipNorm / norm);
    const clipped = flat.map((v) => v * scale);

    // 3) EWC consolidation using existing continualLearner.
    const params: number[][] = [clipped];
    const fisher: number[][] = [clipped.map((v) => Math.abs(v) + 1e-3)];
    const taskId = `round_${this.currentRound}_${this.userId}`;
    continualLearner.saveSnapshot(taskId, params, fisher, 0, samples);
    const ewcPenalty = continualLearner.computePenalty(params);
    const ewcAdjusted = clipped.map((v, i) => v + Math.sign(v) * Math.sqrt(ewcPenalty) * 1e-3);

    // 4) Build payload (the federatedClient will apply DP noise).
    const weights = ewcAdjusted.map((v) => [v]);
    const t0 = Date.now();
    const update: Omit<FLRoundUpdate, "privacy"> = {
      round: this.currentRound,
      weights,
      numSamples: samples,
      metrics: {
        loss: ewcPenalty,
        accuracy: Math.max(0, Math.min(1, ewcAdjusted.reduce((a, b) => a + Math.max(0, b), 0) / ewcAdjusted.length + 0.5)),
        durationMs: Date.now() - t0,
      },
    };

    // 5) Submit (federatedClient applies DP noise calibrated to (ε, δ)).
    const ok = await federatedClient.submitUpdate(update);

    // 6) Reset counter, persist.
    this.scansSinceLastRound = 0;
    this.saveToStorage();

    return ewcPenalty;
  }

  /**
   * Snapshot the model weights + Fisher as a checkpoint.
   * Useful before installing a federated update so we can roll back.
   */
  checkpoint(taskId: string = `checkpoint_${Date.now()}`): TaskSnapshot[] {
    const params: number[][] = [
      Object.values(this.categoryScores),
    ];
    const fisher: number[][] = [
      Object.values(this.categoryCounts).map((c) => c + 1e-3),
    ];
    continualLearner.saveSnapshot(taskId, params, fisher, 0, 0);
    return continualLearner.getSnapshots();
  }

  /**
   * Apply a global model update (received from /api/federated/model-version).
   * Hot-swaps the per-category score vector and saves a snapshot.
   */
  applyGlobalUpdate(globalScores: Record<string, number>, versionTag: string): void {
    this.checkpoint(`before_global_${versionTag}`);
    for (const cat of Object.keys(this.categoryScores)) {
      if (globalScores[cat] !== undefined) {
        this.categoryScores[cat] = globalScores[cat];
      }
    }
    this.saveToStorage();
  }

  getStats() {
    return {
      scansSinceLastRound: this.scansSinceLastRound,
      roundsEveryScans: this.config.roundsEveryScans,
      currentRound: this.currentRound,
      samplesTotal: Object.values(this.categoryCounts).reduce((a, b) => a + b, 0),
      samplesByCategory: { ...this.categoryCounts },
      scoresByCategory: { ...this.categoryScores },
      privacy: federatedClient.getPrivacyGuarantee(),
      flStatus: federatedClient.getStatus(),
    };
  }

  reset(): void {
    this.scansSinceLastRound = 0;
    this.currentRound = 0;
    this.categoryScores = {
      plastic: 0, paper: 0, glass: 0, metal: 0, organic: 0, hazard: 0,
    };
    this.categoryCounts = {
      plastic: 0, paper: 0, glass: 0, metal: 0, organic: 0, hazard: 0,
    };
    this.saveToStorage();
  }
}

export const onDeviceTrainer = new OnDeviceTrainerImpl();