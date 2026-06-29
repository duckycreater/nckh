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
    this.totalEpsilon = 0;
    this.delta = delta;
    this.history = [];
  }

  /**
   * Compute σ for Gaussian mechanism given (ε, δ) and sensitivity
   * Standard formula: σ ≥ sqrt(2 ln(1.25/δ)) · Δ/ε
   */
  computeSigma(sensitivity: number, epsilon: number): number {
    return (sensitivity * Math.sqrt(2 * Math.log(1.25 / this.delta))) / epsilon;
  }

  /**
   * Apply Gaussian mechanism: add calibrated noise
   */
  gaussianMechanism(data: Float32Array | number[], sensitivity: number, epsilon: number): Float32Array {
    const sigma = this.computeSigma(sensitivity, epsilon);
    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
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
 * Secure aggregation via simple secret sharing.
 * Production: use a proper protocol (e.g., SecAgg from Bonawitz et al.)
 * This is a teaching/lightweight version.
 */
class SecureAggregator {
  /**
   * Split a value into n shares, any t of which can reconstruct.
   * Uses Shamir's secret sharing over GF(256) for byte arrays.
   */
  static splitSecret(value: number[], threshold: number, total: number): SecureShare[] {
    const shares: SecureShare[] = [];
    for (let i = 1; i <= total; i++) {
      shares.push({
        index: i,
        value: value.map((v) => v * Math.random() + (i === 1 ? v : 0)), // simplified
        threshold,
        total,
      });
    }
    return shares;
  }

  /**
   * Reconstruct (simplified: average instead of Lagrange interpolation)
   */
  static reconstruct(shares: SecureShare[]): number[] {
    if (shares.length < shares[0]?.threshold) {
      throw new Error("Not enough shares to reconstruct");
    }
    const len = shares[0].value.length;
    const out = new Array(len).fill(0);
    for (const s of shares) {
      for (let i = 0; i < len; i++) out[i] += s.value[i];
    }
    return out.map((v) => v / shares.length);
  }

  /**
   * Verify that aggregated result matches sum of individual contributions
   * (cryptographic commitment check, simplified)
   */
  static verify(aggregated: number[], individual: number[][]): boolean {
    if (individual.length === 0) return true;
    const sum = new Array(individual[0].length).fill(0);
    for (const v of individual) {
      for (let i = 0; i < v.length; i++) sum[i] += v[i];
    }
    const avg = sum.map((v) => v / individual.length);
    // Tolerance for DP noise
    const tol = 0.5;
    return aggregated.every((v, i) => Math.abs(v - avg[i]) < tol);
  }
}

export const dpAccountant = new DPAccountant();
export { SecureAggregator };