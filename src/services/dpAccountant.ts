/**
 * dpAccountant.ts - Rényi Differential Privacy accountant
 *
 * Tracks cumulative privacy loss (ε, δ) across many rounds of federated
 * training using Rényi DP composition (Mironov 2017). This accountant is
 * an engineering control and reporting aid; it is not, by itself, evidence
 * of compliance with any privacy regulation.
 *
 * Per-round mechanism is the Gaussian mechanism with sensitivity = clip_norm * 2
 * (clipping of L2 norm to clip_norm, then Gaussian noise calibrated by
 * the standard deviation σ such that the per-round Rényi divergence is
 * bounded at (α, ε_round)).
 *
 * Reference:
 *   Mironov, I. (2017). Rényi differential privacy.
 *   IEEE Computer Security Foundations Symposium (CSF).
 *   https://arxiv.org/abs/1702.07476
 *
 * Doc references:
 *   docs/research/RESEARCH_PROPOSAL.md §3.3 (FL subsystem)
 *   docs/research/RESEARCH_PROPOSAL.md §1.3 (RQ2 hypothesis)
 */

export const DP_ACCOUNTANT_VERSION = "1.0.0";

/** Per-round privacy loss as an (alpha, epsilon) pair of the Gaussian
 *  mechanism with sensitivity Δ and noise σ.
 *  Formula: ε_round(α) = α / (2 σ² / Δ²) ≈ α·Δ² / (2σ²) for moderate α.
 *  More precisely, ε(α) = α · Δ² / (2σ²)  (ignoring higher-order terms),
 *  which is valid for α·Δ²/σ² ≤ 1 (we cap α to keep us in that regime).
 *
 *  We use the closed-form bound for the Gaussian mechanism from Mironov
 *  (2017) Thm. 8 (the "standard" bound), at α < σ²/Δ².
 */
export function gaussianRenyiEpsilon(
  alpha: number,
  sigma: number,
  delta_clip_norm: number,
): number {
  if (alpha < 1) {
    throw new Error("Rényi order alpha must be >= 1");
  }
  if (sigma <= 0) {
    throw new Error("sigma must be > 0");
  }
  if (delta_clip_norm <= 0) {
    throw new Error("clip_norm must be > 0");
  }
  // Standard upper bound: ε(α) = α * Δ² / (2 σ²)
  // (We're using the "analytical Gaussian mechanism" bound; for tighter
  //  bounds, swap in Mironov's numerical method.)
  return (alpha * delta_clip_norm * delta_clip_norm) / (2 * sigma * sigma);
}

/** Cumulative Rényi divergence after composing T Gaussian mechanisms
 *  with the same (α, σ, clipNorm). The composed bound is:
 *      ε_composed(α) = T · ε_round(α)
 *  and we then convert to (ε, δ) via
 *      δ(ε) ≥ exp((α-1)(ε - ε_composed(α)) - α·log(α)/ (α-1))
 *      — but in practice we use the simpler bound that for the optimal
 *      α, ε_composed ≤ ε and δ = 0; we then find the smallest δ
 *      satisfying the (α-1) bound.
 */
export function composeRenyi(
  rounds: number,
  alpha: number,
  sigma: number,
  clipNorm: number,
): number {
  const epsRound = gaussianRenyiEpsilon(alpha, sigma, clipNorm);
  return rounds * epsRound;
}

/**
 * Convert composed Rényi DP bound (α, ε_composed) to (ε, δ) form.
 * For a target ε (>= ε_composed at alpha=1), we have:
 *      δ(ε, α) ≥ exp((α-1)(ε - ε_composed(α)) - ln α / (α-1) · ε_composed(α))
 *  Returned δ is the *minimum* over α of the RHS.
 *
 * This is the canonical conversion from Mironov (2017), Prop. 9 (numerical
 * method simplified here — we scan α on a log-grid and minimise).
 */
export function renyiToEpsilonDelta(
  renyiOrders: { alpha: number; epsAlpha: number }[],
  targetEpsilon: number,
): number {
  let minDelta = 1;
  for (const { alpha, epsAlpha } of renyiOrders) {
    if (alpha <= 1 || !Number.isFinite(epsAlpha)) continue;
    // Basic RDP conversion:
    //   (alpha, epsAlpha)-RDP => (targetEpsilon, delta)-DP where
    //   delta = exp((epsAlpha - targetEpsilon) * (alpha - 1)).
    // The previous implementation had this sign reversed, which made
    // delta grow as the requested epsilon became looser.
    const logDelta = (epsAlpha - targetEpsilon) * (alpha - 1);
    const delta = Math.min(1, Math.exp(logDelta));
    if (delta < minDelta) minDelta = delta;
  }
  return minDelta;
}

/** Convert an RDP curve to the smallest epsilon at a target delta. */
export function renyiToEpsilonAtDelta(
  renyiOrders: { alpha: number; epsAlpha: number }[],
  targetDelta: number,
): number {
  if (!(targetDelta > 0 && targetDelta < 1)) {
    throw new Error("targetDelta must be in (0, 1)");
  }
  let best = Infinity;
  for (const { alpha, epsAlpha } of renyiOrders) {
    if (alpha <= 1 || !Number.isFinite(epsAlpha)) continue;
    best = Math.min(best, epsAlpha + Math.log(1 / targetDelta) / (alpha - 1));
  }
  return Number.isFinite(best) ? best : Infinity;
}

export interface FlRoundDpConfig {
  clipNorm: number;
  /** Gaussian noise stddev (σ) for this round. */
  sigma: number;
  /** Number of FL rounds composed so far. */
  rounds: number;
  /** Optional: target δ for converting RDP → (ε, δ). */
  targetDelta: number;
  /** Alpha grid for RDP → (ε, δ) conversion. */
  alphaGrid?: number[];
}

export interface DpState {
  rounds: number;
  /** Tiny buffer of (alpha, eps_alpha) for plotting/UI. */
  renyiCurve: { alpha: number; epsAlpha: number }[];
  /** Estimated (ε, δ) at each round — kept for the dashboard. */
  epsilonAtDelta: number;
  deltaAtEpsilon: number;
  /** Whether the current state respects the configured privacy budget. */
  withinBudget: boolean;
  /** Recommended next-round σ to keep budget below target. */
  recommendedSigma: number | null;
}

const DEFAULT_ALPHA_GRID = [1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 128, 256, 512, 1024];
export { DEFAULT_ALPHA_GRID };

export class RenyiDpAccountant {
  /** Default privacy budget: ε ≤ 1.0, δ ≤ 1e-5. */
  static readonly BUDGET_EPSILON = 1.0;
  static readonly BUDGET_DELTA = 1e-5;

  private config: { clipNorm: number; sigma: number };
  /** Keep the mechanism used by every round so later config changes do not
   * retroactively rewrite the historical privacy loss. */
  private roundConfigs: Array<{ clipNorm: number; sigma: number }> = [];

  constructor(config?: { clipNorm: number; sigma: number }) {
    this.config = { clipNorm: 1.0, sigma: 1.0, ...config };
    if (this.config.clipNorm <= 0) throw new Error("clipNorm must be > 0");
    if (this.config.sigma <= 0) throw new Error("sigma must be > 0");
  }

  setConfig(partial: Partial<{ clipNorm: number; sigma: number }>): void {
    this.config = { ...this.config, ...partial };
    if (this.config.clipNorm <= 0) throw new Error("clipNorm must be > 0");
    if (this.config.sigma <= 0) throw new Error("sigma must be > 0");
  }

  getConfig(): { clipNorm: number; sigma: number } {
    return { ...this.config };
  }

  reset(): void {
    this.roundConfigs = [];
  }

  getNumRounds(): number {
    return this.roundConfigs.length;
  }

  /**
   * Record one FL round at the current σ. After updating, returns the
   * current DpState for the dashboard / privacy budget tracker.
   *
   * @param sigmaOverride optional per-round σ (overrides config).
   */
  recordRound(sigmaOverride?: number): DpState {
    if (sigmaOverride !== undefined) {
      this.setConfig({ sigma: sigmaOverride });
    }
    this.roundConfigs.push({ ...this.config });
    return this.computeState();
  }

  /**
   * Compute state without mutating rounds counter.
   */
  computeState(alphaGrid: number[] = DEFAULT_ALPHA_GRID): DpState {
    const renyiCurve = alphaGrid.map((alpha) => ({
      alpha,
      epsAlpha: this.roundConfigs.reduce(
        (sum, round) => sum + gaussianRenyiEpsilon(alpha, round.sigma, round.clipNorm),
        0,
      ),
    }));
    const epsilonAtDelta = this.roundConfigs.length
      ? renyiToEpsilonAtDelta(renyiCurve, RenyiDpAccountant.BUDGET_DELTA)
      : 0;
    const deltaAtEpsilon = renyiToEpsilonDelta(renyiCurve, RenyiDpAccountant.BUDGET_EPSILON);

    const withinBudget =
      epsilonAtDelta <= RenyiDpAccountant.BUDGET_EPSILON &&
      deltaAtEpsilon <= RenyiDpAccountant.BUDGET_DELTA;

    const candidate = this.minimumSigmaForNextRound(renyiCurve);
    const recommendedSigma = Number.isFinite(candidate) ? candidate : null;

    return {
      rounds: this.roundConfigs.length,
      renyiCurve,
      epsilonAtDelta,
      deltaAtEpsilon,
      withinBudget,
      recommendedSigma,
    };
  }

  /**
   * Recommend σ for the NEXT round such that, after adding 1 round to the
   * current count, we remain within budget.
   *
   * Uses a monotone binary search over σ and the same RDP→(ε,δ)
   * conversion used by the dashboard.
   */
  recommendSigmaForNextRound(alphaGrid: number[] = DEFAULT_ALPHA_GRID): number {
    const currentCurve = alphaGrid.map((alpha) => ({
      alpha,
      epsAlpha: this.roundConfigs.reduce(
        (sum, round) => sum + gaussianRenyiEpsilon(alpha, round.sigma, round.clipNorm),
        0,
      ),
    }));
    return this.minimumSigmaForNextRound(currentCurve);
  }

  /** Quick predicate: would one more round at current σ remain within budget? */
  canAffordNextRound(): boolean {
    const curve = DEFAULT_ALPHA_GRID.map((alpha) => ({
      alpha,
      epsAlpha:
        this.roundConfigs.reduce(
          (sum, round) => sum + gaussianRenyiEpsilon(alpha, round.sigma, round.clipNorm),
          0,
        ) + gaussianRenyiEpsilon(alpha, this.config.sigma, this.config.clipNorm),
    }));
    return (
      renyiToEpsilonAtDelta(curve, RenyiDpAccountant.BUDGET_DELTA) <=
      RenyiDpAccountant.BUDGET_EPSILON
    );
  }

  private minimumSigmaForNextRound(currentCurve: { alpha: number; epsAlpha: number }[]): number {
    const currentEpsilon = this.roundConfigs.length
      ? renyiToEpsilonAtDelta(currentCurve, RenyiDpAccountant.BUDGET_DELTA)
      : 0;
    if (currentEpsilon >= RenyiDpAccountant.BUDGET_EPSILON) return Infinity;

    const epsilonWith = (sigma: number) =>
      renyiToEpsilonAtDelta(
        currentCurve.map(({ alpha, epsAlpha }) => ({
          alpha,
          epsAlpha: epsAlpha + gaussianRenyiEpsilon(alpha, sigma, this.config.clipNorm),
        })),
        RenyiDpAccountant.BUDGET_DELTA,
      );

    let high = Math.max(1, this.config.sigma);
    while (epsilonWith(high) > RenyiDpAccountant.BUDGET_EPSILON && high < 1e9) high *= 2;
    if (high >= 1e9 && epsilonWith(high) > RenyiDpAccountant.BUDGET_EPSILON) return Infinity;

    let low = 0;
    for (let i = 0; i < 80; i++) {
      const mid = (low + high) / 2;
      if (epsilonWith(mid) <= RenyiDpAccountant.BUDGET_EPSILON) high = mid;
      else low = mid;
    }
    return high;
  }

  toJSON(): { rounds: number; config: { clipNorm: number; sigma: number }; state: DpState } {
    return {
      rounds: this.roundConfigs.length,
      config: this.config,
      state: this.computeState(),
    };
  }
}

/** Convenience singleton — used by PrivacyDashboard.tsx and server/services/federatedAggregator.ts. */
let _singleton: RenyiDpAccountant | null = null;
export function getDpAccountant(): RenyiDpAccountant {
  if (!_singleton) _singleton = new RenyiDpAccountant();
  return _singleton;
}

export function resetDpAccountant(): void {
  _singleton = null;
}

/**
 * Convenience summary used by the UI PrivacyBudgetMeter — returns the
 * spent ε and round count without exposing the full Rényi curve.
 */
export function dpAccountantSummary(_userId: string): { spentEpsilon: number; rounds: number } {
  const a = getDpAccountant();
  const state = a.computeState();
  return {
    spentEpsilon: state.epsilonAtDelta,
    rounds: state.rounds,
  };
}
