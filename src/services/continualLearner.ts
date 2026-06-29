/**
 * Continual Learner - Elastic Weight Consolidation (EWC) for the BMO model
 *
 * Breakthrough: prevents catastrophic forgetting when the model learns
 * new waste categories or new user patterns.
 *
 * EWC idea (Kirkpatrick et al., 2017):
 *   L_total = L_new + λ · Σ_i F_i · (θ_i - θ*_i)²
 *
 *   where F_i = Fisher information of parameter θ_i for old tasks
 *
 * Implementation:
 *   - Browser-side: tracks important parameters + diagonal Fisher
 *   - Uses localStorage to persist across sessions
 *   - Penalizes updates to weights that were critical for past tasks
 */

export interface TaskSnapshot {
  taskId: string;
  params: number[][];      // serialized parameters
  fisher: number[][];      // diagonal Fisher information
  loss: number;
  samples: number;
  timestamp: number;
}

export interface EWCConfig {
  lambda: number;          // penalty strength (default 5000)
  fisherSamples: number;   // # samples to estimate Fisher (default 200)
  maxSnapshots: number;    // max tasks to remember (default 5)
  onlineEpsilon: boolean;  // use online EWC (single Fisher matrix, less memory)
}

const DEFAULT_CONFIG: EWCConfig = {
  lambda: 5000,
  fisherSamples: 200,
  maxSnapshots: 5,
  onlineEpsilon: true,
};

class ContinualLearner {
  private snapshots: TaskSnapshot[] = [];
  private config: EWCConfig = DEFAULT_CONFIG;
  private storageKey = "bmo_continual_snapshots";

  configure(cfg: Partial<EWCConfig>): void {
    this.config = { ...this.config, ...cfg };
  }

  loadFromStorage(): void {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(this.storageKey) : null;
      if (raw) this.snapshots = JSON.parse(raw);
    } catch (e) {
      console.warn("[EWC] Failed to load snapshots:", e);
    }
  }

  saveToStorage(): void {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(this.storageKey, JSON.stringify(this.snapshots));
      }
    } catch (e) {
      console.warn("[EWC] Failed to save snapshots:", e);
    }
  }

  /**
   * Compute Fisher information for the current model on a batch of samples
   * Fisher_i = E[(∂L/∂θ_i)²]  (diagonal approximation)
   */
  computeFisher(
    currentParams: number[][],
    gradients: number[][],
    sampleCount: number
  ): number[][] {
    return currentParams.map((layer, l) => {
      const gradLayer = gradients[l];
      if (!gradLayer) return new Array(layer.length).fill(0);
      return Array.isArray(gradLayer[0])
        ? gradLayer.map((row: number[]) => row.map((g: number) => g * g))
        : gradLayer.map((g: number) => g * g);
    });
  }

  /**
   * Save a task snapshot (params + Fisher + loss)
   */
  saveSnapshot(taskId: string, params: number[][], fisher: number[][], loss: number, samples: number): void {
    const snapshot: TaskSnapshot = {
      taskId,
      params: params.map((p) => Array.isArray(p[0]) ? p.flat() : Array.from(p)),
      fisher: fisher.map((f) => Array.isArray(f[0]) ? f.flat() : Array.from(f)),
      loss,
      samples,
      timestamp: Date.now(),
    };

    // Cap at maxSnapshots (drop oldest)
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots.shift();
    }
    this.saveToStorage();
    console.log(`[EWC] Saved snapshot for task ${taskId} (total: ${this.snapshots.length})`);
  }

  /**
   * Compute EWC penalty term to add to current loss
   * L_ewc = λ · Σ_i F_i · (θ_i - θ*_i)²
   */
  computePenalty(currentParams: number[][]): number {
    if (this.snapshots.length === 0) return 0;
    let penalty = 0;

    for (const snap of this.snapshots) {
      currentParams.forEach((layer, l) => {
        const snapLayer = snap.params[l];
        const fisherLayer = snap.fisher[l];
        if (!snapLayer || !fisherLayer) return;
        for (let i = 0; i < layer.length; i++) {
          penalty += fisherLayer[i] * Math.pow(layer[i] - snapLayer[i], 2);
        }
      });
    }

    return this.config.lambda * penalty;
  }

  /**
   * Compute consolidated gradient (current grad + EWC grad)
   * Returns the adjustment to apply to each parameter
   */
  consolidateGradients(
    currentParams: number[][],
    currentLossGrad: number[][]
  ): number[][] {
    return currentParams.map((layer, l) => {
      const out = new Array(layer.length).fill(0);
      const curGrad = currentLossGrad[l];
      if (!curGrad) return out;

      // Aggregate EWC gradient across snapshots
      for (const snap of this.snapshots) {
        const snapLayer = snap.params[l];
        const fisherLayer = snap.fisher[l];
        if (!snapLayer || !fisherLayer) continue;

        const ewcGrad = new Array(layer.length).fill(0);
        for (let i = 0; i < layer.length; i++) {
          ewcGrad[i] = 2 * this.config.lambda * fisherLayer[i] * (layer[i] - snapLayer[i]);
        }
        for (let i = 0; i < out.length; i++) out[i] += ewcGrad[i];
      }

      // Total = current task gradient + EWC penalty
      for (let i = 0; i < out.length; i++) out[i] += curGrad[i] || 0;
      return out;
    });
  }

  /**
   * Apply continual learning update to current parameters
   */
  applyUpdate(
    currentParams: number[][],
    currentLossGrad: number[][],
    learningRate: number
  ): number[][] {
    const consolidated = this.consolidateGradients(currentParams, currentLossGrad);
    return currentParams.map((layer, l) => {
      const update = consolidated[l];
      if (!update) return Array.from(layer);
      if (Array.isArray(layer[0])) {
        return (layer as number[][]).map((row, r) =>
          row.map((v, c) => v - learningRate * (update[r * row.length + c] ?? 0))
        );
      }
      return (layer as number[]).map((v, i) => v - learningRate * (update[i] ?? 0));
    });
  }

  /**
   * Forget a task (GDPR-style right to be forgotten)
   */
  forgetTask(taskId: string): boolean {
    const initial = this.snapshots.length;
    this.snapshots = this.snapshots.filter((s) => s.taskId !== taskId);
    const removed = initial - this.snapshots.length;
    if (removed > 0) {
      this.saveToStorage();
      console.log(`[EWC] Forgot task ${taskId}`);
    }
    return removed > 0;
  }

  getSnapshots(): TaskSnapshot[] {
    return this.snapshots;
  }

  getMemorySize(): { tasks: number; params: number } {
    const params = this.snapshots.reduce((sum, s) =>
      sum + s.params.reduce((a, p) => a + p.length, 0), 0);
    return { tasks: this.snapshots.length, params };
  }

  reset(): void {
    this.snapshots = [];
    this.saveToStorage();
  }
}

export const continualLearner = new ContinualLearner();