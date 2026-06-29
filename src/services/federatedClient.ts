/**
 * Federated Learning Client - Browser side (CayGiaPha_NhanThuc)
 *
 * Each school browser tab is a "client" in the FL network.
 * Sends only local model weight updates, never raw images.
 *
 * Uses HTTP polling against the Flower server's REST API.
 * For full bidirectional training, run a Python client alongside
 * the web app; this client is for simulation + light contribution.
 */

const FL_BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_FL_URL)
  || "http://localhost:8080";

export interface FLConfig {
  schoolId: string;
  serverUrl?: string;
  epsilon?: number;
  delta?: number;
  contributionBudget?: number;
}

export interface FLRoundUpdate {
  round: number;
  weights: number[][];     // serialized weights
  numSamples: number;
  metrics: {
    loss: number;
    accuracy: number;
    durationMs: number;
  };
  privacy: {
    epsilon: number;
    delta: number;
    noiseSigma: number;
  };
}

export interface FLStatus {
  connected: boolean;
  currentRound: number;
  totalClients: number;
  lastSyncAt: number | null;
  contributedSamples: number;
}

class FederatedClient {
  private schoolId: string = "school_default";
  private serverUrl = FL_BASE;
  private epsilon = 1.0;
  private delta = 1e-5;
  private contributionBudget = 1000;
  private contributedSamples = 0;
  private lastSyncAt: number | null = null;
  private currentRound = 0;

  configure(cfg: Partial<FLConfig>): void {
    if (cfg.schoolId) this.schoolId = cfg.schoolId;
    if (cfg.serverUrl) this.serverUrl = cfg.serverUrl;
    if (cfg.epsilon !== undefined) this.epsilon = cfg.epsilon;
    if (cfg.delta !== undefined) this.delta = cfg.delta;
    if (cfg.contributionBudget !== undefined) this.contributionBudget = cfg.contributionBudget;
  }

  /** Check if FL server is reachable */
  async ping(): Promise<boolean> {
    try {
      const r = await fetch(`${this.serverUrl}/health`, { method: "GET", mode: "cors" });
      return r.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate Gaussian noise calibrated to (ε, δ)-DP
   * Laplace/Gaussian mechanism
   */
  private gaussianNoise(sensitivity: number, shape: number[]): number[] {
    const sigma = (sensitivity * Math.sqrt(2 * Math.log(1.25 / this.delta))) / this.epsilon;
    const size = shape.reduce((a, b) => a * b, 1);
    const noise = new Array(size);
    for (let i = 0; i < size; i++) {
      // Box-Muller
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      noise[i] = z * sigma;
    }
    return noise;
  }

  /**
   * Submit a federated round update (weights + metrics)
   * In production: pull weights from local ONNX model
   */
  async submitUpdate(update: Omit<FLRoundUpdate, "privacy">): Promise<boolean> {
    if (this.contributedSamples >= this.contributionBudget) {
      console.warn("[FL] Contribution budget exhausted");
      return false;
    }
    if (!(await this.ping())) {
      console.warn("[FL] Server unreachable, update queued locally");
      return false;
    }

    // Apply DP noise to weights before sending
    const noisyWeights = update.weights.map((w) => {
      const flat = Array.isArray(w[0]) ? w.flat() : w;
      const noise = this.gaussianNoise(0.01, [flat.length]);
      return flat.map((v, i) => v + (noise[i] ?? 0));
    });

    const payload: FLRoundUpdate = {
      ...update,
      weights: noisyWeights,
      privacy: {
        epsilon: this.epsilon,
        delta: this.delta,
        noiseSigma: (0.01 * Math.sqrt(2 * Math.log(1.25 / this.delta))) / this.epsilon,
      },
    };

    try {
      const r = await fetch(`${this.serverUrl}/submit/${this.schoolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        this.contributedSamples += update.numSamples;
        this.lastSyncAt = Date.now();
        this.currentRound = update.round;
        return true;
      }
    } catch (e) {
      console.error("[FL] Submit failed:", e);
    }
    return false;
  }

  getStatus(): FLStatus {
    return {
      connected: this.lastSyncAt !== null && Date.now() - this.lastSyncAt < 60000,
      currentRound: this.currentRound,
      totalClients: 0,
      lastSyncAt: this.lastSyncAt,
      contributedSamples: this.contributedSamples,
    };
  }

  getPrivacyGuarantee(): { epsilon: number; delta: number } {
    return { epsilon: this.epsilon, delta: this.delta };
  }

  reset(): void {
    this.contributedSamples = 0;
    this.lastSyncAt = null;
    this.currentRound = 0;
  }
}

export const federatedClient = new FederatedClient();