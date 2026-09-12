/**
 * Differential Privacy + Secure Aggregation utilities
 *
 * Implements the Gaussian mechanism for (ε, δ)-DP
 * + a lightweight secure aggregation protocol (Shamir-style).
 *
 * Used by the FL client to:
 *   - Add calibrated noise to model gradients before upload
 *   - Track privacy budget across training rounds
 *   - Verify aggregation integrity
 */

export interface DPLedgerEntry {
  round: number;
  epsilon_spent: number;
  delta: number;
  noise_sigma: number;
  timestamp: number;
}

export interface SecureShare {
  index: number;
  value: number[];
  threshold: number;
  total: number;
}

/**
 * Differential Privacy accountant (advanced composition)
 */
class DPAccountant {
  private totalEpsilon = 0;
  private delta = 1e-5;
  private history: DPLedgerEntry[] = [];
  private maxBudget = 10; // hard cap

  setBudget(epsilon: number, delta: number): void {
    if (!Number.isFinite(epsilon) || epsilon <= 0) throw new Error("epsilon must be positive");
    if (!Number.isFinite(delta) || delta <= 0 || delta >= 1)
      throw new Error("delta must be in (0, 1)");
    this.totalEpsilon = 0;
    this.delta = delta;
    this.maxBudget = epsilon;
    this.history = [];
  }

  /**
   * Compute σ for Gaussian mechanism given (ε, δ) and sensitivity
   * Standard formula: σ ≥ sqrt(2 ln(1.25/δ)) · Δ/ε
   */
  computeSigma(sensitivity: number, epsilon: number): number {
    if (!Number.isFinite(sensitivity) || sensitivity < 0)
      throw new Error("sensitivity must be non-negative");
    if (!Number.isFinite(epsilon) || epsilon <= 0) throw new Error("epsilon must be positive");
    return (sensitivity * Math.sqrt(2 * Math.log(1.25 / this.delta))) / epsilon;
  }

  /**
   * Apply Gaussian mechanism: add calibrated noise
   */
  gaussianMechanism(
    data: Float32Array | number[],
    sensitivity: number,
    epsilon: number,
  ): Float32Array {
    if (!this.canSpend(epsilon)) throw new Error("privacy budget exhausted");
    const sigma = this.computeSigma(sensitivity, epsilon);
    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const u1 = secureRandomUnit();
      const u2 = secureRandomUnit();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      out[i] = data[i] + z * sigma;
    }

    // Track spending (advanced composition)
    const epsSpent = epsilon; // single-shot; for k shots use sqrt(2k ln(1/δ))·ε + k·ε(e^ε-1)
    this.totalEpsilon += epsSpent;
    this.history.push({
      round: this.history.length + 1,
      epsilon_spent: epsSpent,
      delta: this.delta,
      noise_sigma: sigma,
      timestamp: Date.now(),
    });

    return out;
  }

  /**
   * Check if privacy budget remains
   */
  canSpend(epsilon: number): boolean {
    return this.totalEpsilon + epsilon <= this.maxBudget;
  }

  getRemainingBudget(): number {
    return Math.max(0, this.maxBudget - this.totalEpsilon);
  }

  getLedger(): DPLedgerEntry[] {
    return this.history;
  }

  reset(): void {
    this.totalEpsilon = 0;
    this.history = [];
  }
}

/**
 * Secure aggregation via additive n-of-n secret sharing.
 *
 * This utility intentionally does not pretend to implement threshold Shamir
 * sharing. Every participant is required for reconstruction; deployments that
 * need dropout tolerance should use the server-side SecAgg implementation.
 */
class SecureAggregator {
  /**
   * Split a numeric vector into n additive shares. All n shares are required.
   */
  static splitSecret(value: number[], threshold: number, total: number): SecureShare[] {
    if (!Number.isInteger(total) || total < 2) throw new Error("total must be at least 2");
    if (threshold !== total) {
      throw new Error("additive sharing requires threshold === total");
    }
    const shares: SecureShare[] = [];
    const running = new Array(value.length).fill(0);
    for (let i = 1; i < total; i++) {
      const mask = value.map(() => (secureRandomUnit() - 0.5) * 2);
      mask.forEach((part, index) => {
        running[index] += part;
      });
      shares.push({
        index: i,
        value: mask,
        threshold,
        total,
      });
    }
    shares.push({
      index: total,
      value: value.map((v, index) => v - running[index]),
      threshold,
      total,
    });
    return shares;
  }

  /** Reconstruct a vector by summing every additive share. */
  static reconstruct(shares: SecureShare[]): number[] {
    const first = shares[0];
    const vectorLength = first?.value.length ?? 0;
    const indices = new Set(shares.map((share) => share.index));
    if (
      !first ||
      shares.length !== first.total ||
      first.threshold !== first.total ||
      indices.size !== shares.length ||
      shares.some(
        (share) =>
          share.total !== first.total ||
          share.threshold !== first.threshold ||
          share.value.length !== vectorLength ||
          share.index < 1 ||
          share.index > first.total,
      )
    ) {
      throw new Error("Not enough shares to reconstruct");
    }
    const out = new Array(vectorLength).fill(0);
    for (const s of shares) {
      for (let i = 0; i < vectorLength; i++) out[i] += s.value[i];
    }
    return out;
  }

  /**
   * Check that the aggregate numerically matches the individual contributions.
   * This is an integrity sanity check, not a cryptographic commitment.
   */
  static verify(aggregated: number[], individual: number[][]): boolean {
    if (individual.length === 0) return true;
    const sum = new Array(individual[0].length).fill(0);
    for (const v of individual) {
      for (let i = 0; i < v.length; i++) sum[i] += v[i];
    }
    return (
      aggregated.length === sum.length &&
      aggregated.every(
        (value, index) => Math.abs(value - sum[index]) <= 1e-8 * Math.max(1, Math.abs(sum[index])),
      )
    );
  }
}

function secureRandomUnit(): number {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) throw new Error("Secure randomness is unavailable");
  const bytes = new Uint32Array(1);
  cryptoApi.getRandomValues(bytes);
  return (bytes[0] + 1) / 4294967297;
}

export const dpAccountant = new DPAccountant();
export { SecureAggregator };
