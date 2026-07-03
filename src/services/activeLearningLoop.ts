/**
 * activeLearningLoop.ts - Uncertainty-sampling active learning
 *
 * Selects which scan to send to the user for *manual confirmation* next,
 * based on the classifier's uncertainty. We use three uncertainty scores:
 *   1. Top-1 confidence margin (1 - p_top1)
 *   2. Predictive entropy -sum(p * log p)
 *   3. MC-Dropout variance (if available)
 *
 * Strategy:
 *   - Sample the top-K scans that maximise uncertainty.
 *   - Compute the labelling priority per category so we balance the
 *     dataset (avoid over-sampling already-confident categories).
 *
 * Reference:
 *   Settles, B. (2009). Active learning literature survey. CMU TR.
 *   Gal, Y., Ghahramani, Z. (2016). Dropout as Bayesian approximation.
 */

export const ACTIVE_LEARNING_VERSION = "1.0.0";

export interface ClassifierPrediction {
  scanId: string;
  category: string;
  probabilities: Record<string, number>;
  /** Optional: MC-Dropout predictive variance. */
  variance?: number;
}

export interface UncertaintyScore {
  scanId: string;
  /** 1 - top_1 probability. */
  margin: number;
  /** Predictive entropy (bits). */
  entropy: number;
  /** Aggregated uncertainty in [0..1]. */
  aggregate: number;
  /** Per-class priority (which categories are underrepresented). */
  categoryPriority: number;
}

export interface ActiveLearningBatch {
  picks: { scanId: string; reason: string }[];
  expectedEntropyReduction: number;
  /** Counts of categories per batch (to enforce balance). */
  batchComposition: Record<string, number>;
}

export interface ActiveLearningOptions {
  /** Number of scans to surface for labelling. */
  batchSize: number;
  /** Max number of picks per category in a single batch. */
  perCategoryCap: number;
  /** If MC-Dropout variance is available, weight it this much. */
  mcDropoutWeight: number;
}

export const DEFAULT_OPTIONS: ActiveLearningOptions = {
  batchSize: 8,
  perCategoryCap: 4,
  mcDropoutWeight: 0.2,
};

/**
 * Compute uncertainty score for a single prediction.
 */
export function computeUncertainty(
  pred: ClassifierPrediction,
  options?: ActiveLearningOptions
): UncertaintyScore {
  const opts = options ?? DEFAULT_OPTIONS;
  const probs = Object.values(pred.probabilities);
  const sortedDesc = [...probs].sort((a, b) => b - a);
  const top1 = sortedDesc[0] ?? 0;
  const top2 = sortedDesc[1] ?? 0;
  const margin = 1 - top1;

  // Predictive entropy H = -sum(p * log p). Normalise to [0..1] via log(#classes).
  let entropy = 0;
  for (const p of probs) {
    if (p > 0) entropy -= p * Math.log2(p);
  }
  const entropyNorm = probs.length > 1 ? entropy / Math.log2(probs.length) : 0;

  // MC-Dropout variance term (capped at 1)
  const varTerm = Math.min(1, pred.variance ?? 0);
  const aggregate = (margin * (1 - opts.mcDropoutWeight) + entropyNorm * 0.3 + varTerm * opts.mcDropoutWeight);
  return {
    scanId: pred.scanId,
    margin,
    entropy: entropyNorm,
    aggregate: Math.min(1, aggregate),
    categoryPriority: 0,
  };
}

/**
 * Build a labelling batch that prioritises uncertain scans while keeping
 * category balance.
 */
export function buildActiveLearningBatch(
  predictions: ClassifierPrediction[],
  options?: ActiveLearningOptions,
  categoryCounts?: Record<string, number>
): ActiveLearningBatch {
  const opts = options ?? DEFAULT_OPTIONS;
  const counts = { ...(categoryCounts ?? {}) };
  const totalScans = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const invFrac = (cat: string) => {
    const c = counts[cat] ?? 0;
    if (c === 0) return 2.0;
    return Math.log((totalScans + 1) / (c + 1)) / Math.log(totalScans + 1);
  };
  const scored: UncertaintyScore[] = predictions.map((p) => {
    const base = computeUncertainty(p, opts);
    return { ...base, categoryPriority: invFrac(p.category) };
  });
  // Aggregate score = uncertainty * (1 + categoryPriority)
  const composite = scored
    .map((s) => ({
      s,
      score: s.aggregate * (1 + s.categoryPriority * 0.5),
    }))
    .sort((a, b) => b.score - a.score);

  const picks: { scanId: string; reason: string }[] = [];
  const batchComposition: Record<string, number> = {};
  const baseEntropy = averageEntropy(scored.map((s) => s.entropy));

  for (const { s } of composite) {
    if (picks.length >= opts.batchSize) break;
    const pred = predictions.find((p) => p.scanId === s.scanId)!;
    const currentCountForCat = batchComposition[pred.category] ?? 0;
    if (currentCountForCat >= opts.perCategoryCap) continue;
    picks.push({
      scanId: pred.scanId,
      reason: `uncertainty=${s.aggregate.toFixed(3)} margin=${s.margin.toFixed(3)} entropy=${s.entropy.toFixed(3)} cat=${pred.category}`,
    });
    batchComposition[pred.category] = currentCountForCat + 1;
  }

  // Estimated entropy reduction: assume each labelled point halves the
  // uncertainty of its predicted class. This is a conservative estimate.
  const expectedEntropyReduction = picks.length / Math.max(1, predictions.length);
  return {
    picks,
    expectedEntropyReduction,
    batchComposition,
  };
}

function averageEntropy(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Sample a synthetic set of ClassifierPredictions for testing. Used by the
 * dashboard to show what would be queued for labelling.
 */
export function generateDemoPredictions(
  n: number,
  seed = 42
): ClassifierPrediction[] {
  const rng = mulberry32(seed);
  const cats = ["plastic", "paper", "glass", "metal", "organic", "hazard"];
  return Array.from({ length: n }, (_, i) => {
    // Make some predictions confident and others uncertain.
    const isUncertain = rng() < 0.3;
    const probs: Record<string, number> = {};
    const cat = cats[Math.floor(rng() * cats.length)];
    if (isUncertain) {
      // Dirichlet-like flat distribution.
      let sum = 0;
      for (const c of cats) {
        probs[c] = 0.5 + rng() * 1.0;
        sum += probs[c];
      }
      for (const c of cats) probs[c] /= sum;
    } else {
      // Concentrate mass on one class.
      const winner = cat;
      const peak = 0.7 + rng() * 0.25;
      probs[winner] = peak;
      let leftover = 1 - peak;
      for (const c of cats) {
        if (c === winner) continue;
        probs[c] = (rng() * leftover) / Math.max(1, cats.length - 1);
        leftover -= probs[c];
      }
    }
    return {
      scanId: `scan_${String(i).padStart(4, "0")}`,
      category: cat,
      probabilities: probs,
      variance: isUncertain ? 0.05 + rng() * 0.05 : 0,
    };
  });
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}