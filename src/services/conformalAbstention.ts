/**
 * Conformal calibration and selective prediction for waste classification.
 *
 * This layer never changes the underlying model probabilities. It adds a
 * finite-sample calibrated prediction set and an explicit abstention state.
 * A profile must be fitted from an independent, labelled calibration set
 * before it is used in a research claim.
 */

export type CalibrationSource = "held_out" | "external_site" | "demo";

export interface CalibrationProfile {
  version: 1;
  alpha: number;
  quantile: number;
  classes: string[];
  calibrationCount: number;
  source: CalibrationSource;
  createdAt: string;
  /** Optional feature-space centre/scale for a lightweight shift screen. */
  featureMean?: number[];
  featureStd?: number[];
  maxFeatureZ?: number;
}

export interface SelectivePrediction {
  predictionSet: string[];
  category: string | null;
  confidence: number;
  abstained: boolean;
  reason: "accepted" | "prediction_set" | "low_confidence" | "domain_shift" | "invalid_profile";
  maxFeatureZ?: number;
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function finiteSampleQuantile(values: number[], alpha: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  // Split-conformal uses an order statistic, not an interpolated quantile.
  // The +1 finite-sample correction is what gives the marginal coverage
  // guarantee under exchangeability.
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((sorted.length + 1) * (1 - alpha))));
  return sorted[rank - 1];
}

/**
 * Fit the finite-sample split-conformal threshold from calibrated logits.
 * `probabilities[i]` and `labels[i]` must describe the same observation.
 */
export function fitConformalProfile(
  probabilities: number[][],
  labels: string[],
  classes: string[],
  options: {
    alpha?: number;
    source?: CalibrationSource;
    featureVectors?: number[][];
    createdAt?: string;
    maxFeatureZ?: number;
  } = {},
): CalibrationProfile {
  const alpha = options.alpha ?? 0.1;
  if (!(alpha > 0 && alpha < 1)) throw new Error("alpha must be between 0 and 1");
  if (classes.length === 0) throw new Error("classes must not be empty");
  if (probabilities.length !== labels.length || probabilities.length === 0) {
    throw new Error("probabilities and labels must have the same non-zero length");
  }

  const classIndex = new Map(classes.map((name, index) => [name, index]));
  const scores: number[] = [];
  for (let row = 0; row < probabilities.length; row++) {
    const p = probabilities[row];
    const labelIndex = classIndex.get(labels[row]);
    if (
      labelIndex === undefined ||
      p.length !== classes.length ||
      labelIndex < 0 ||
      labelIndex >= p.length
    ) {
      throw new Error(`unknown label at row ${row}`);
    }
    if (!p.every((value) => finite(value) && value >= 0)) {
      throw new Error(`invalid probability row at ${row}`);
    }
    const total = p.reduce((sum, value) => sum + value, 0);
    if (!(total > 0)) throw new Error(`invalid probability row at ${row}`);
    const trueProbability = p[labelIndex] / total;
    scores.push(1 - Math.max(0, Math.min(1, trueProbability)));
  }

  // The finite-sample conformal index is ceil((n + 1)(1-alpha))/n.
  const n = scores.length;
  const profile: CalibrationProfile = {
    version: 1,
    alpha,
    quantile: finiteSampleQuantile(scores, alpha),
    classes: [...classes],
    calibrationCount: n,
    source: options.source ?? "held_out",
    createdAt: options.createdAt ?? new Date().toISOString(),
  };

  if (options.featureVectors && options.featureVectors.length === probabilities.length) {
    const width = options.featureVectors[0]?.length ?? 0;
    if (
      width > 0 &&
      options.featureVectors.every((row) => row.length === width && row.every(finite))
    ) {
      const mean = Array.from(
        { length: width },
        (_, j) => options.featureVectors!.reduce((sum, row) => sum + row[j], 0) / n,
      );
      const std = mean.map((m, j) => {
        const variance =
          options.featureVectors!.reduce((sum, row) => sum + (row[j] - m) ** 2, 0) /
          Math.max(1, n - 1);
        return Math.max(Math.sqrt(variance), 1e-6);
      });
      profile.featureMean = mean;
      profile.featureStd = std;
      profile.maxFeatureZ = options.maxFeatureZ ?? 4;
    }
  }
  return profile;
}

export function validateConformalProfile(profile: CalibrationProfile, classes: string[]): boolean {
  if (!profile || !Array.isArray(profile.classes) || !Array.isArray(classes)) return false;
  if (
    profile.version !== 1 ||
    profile.classes.length === 0 ||
    profile.classes.length !== classes.length
  )
    return false;
  if (!profile.classes.every((name, i) => typeof name === "string" && name === classes[i]))
    return false;
  if (!Number.isSafeInteger(profile.calibrationCount) || profile.calibrationCount <= 0)
    return false;
  if (
    !(profile.alpha > 0 && profile.alpha < 1) ||
    !finite(profile.quantile) ||
    profile.quantile < 0 ||
    profile.quantile > 1
  )
    return false;
  if (profile.featureMean !== undefined || profile.featureStd !== undefined) {
    if (
      !profile.featureMean ||
      !profile.featureStd ||
      profile.featureMean.length === 0 ||
      profile.featureMean.length !== profile.featureStd.length
    )
      return false;
    if (
      !profile.featureMean.every(finite) ||
      !profile.featureStd.every((value) => finite(value) && value > 0)
    )
      return false;
    if (
      profile.maxFeatureZ !== undefined &&
      (!finite(profile.maxFeatureZ) || profile.maxFeatureZ <= 0)
    )
      return false;
  }
  return true;
}

function featureShift(profile: CalibrationProfile, features?: number[]): number | undefined {
  if (
    !features ||
    !profile.featureMean ||
    !profile.featureStd ||
    features.length !== profile.featureMean.length
  )
    return undefined;
  let maxZ = 0;
  for (let i = 0; i < features.length; i++) {
    if (!finite(features[i])) return Number.POSITIVE_INFINITY;
    maxZ = Math.max(
      maxZ,
      Math.abs((features[i] - profile.featureMean[i]) / Math.max(profile.featureStd[i], 1e-6)),
    );
  }
  return maxZ;
}

/** Apply calibrated prediction-set and shift checks to one probability vector. */
export function selectivePredict(
  probabilities: number[],
  profile: CalibrationProfile,
  options: { minConfidence?: number; features?: number[] } = {},
): SelectivePrediction {
  if (!validateConformalProfile(profile, profile?.classes ?? [])) {
    return {
      predictionSet: [],
      category: null,
      confidence: 0,
      abstained: true,
      reason: "invalid_profile",
    };
  }
  const total = probabilities.reduce(
    (sum, value) => sum + (finite(value) && value >= 0 ? value : 0),
    0,
  );
  if (!(total > 0) || probabilities.length !== profile.classes.length) {
    return {
      predictionSet: [],
      category: null,
      confidence: 0,
      abstained: true,
      reason: "invalid_profile",
    };
  }
  const normalized = probabilities.map((value) => Math.max(0, value) / total);
  let topIndex = 0;
  for (let i = 1; i < normalized.length; i++)
    if (normalized[i] > normalized[topIndex]) topIndex = i;
  const confidence = normalized[topIndex];
  const predictionSet = profile.classes.filter(
    (_, i) => 1 - normalized[i] <= profile.quantile + 1e-12,
  );
  const maxFeatureZ = featureShift(profile, options.features);
  if (maxFeatureZ !== undefined && maxFeatureZ > (profile.maxFeatureZ ?? 4)) {
    return {
      predictionSet,
      category: null,
      confidence,
      abstained: true,
      reason: "domain_shift",
      maxFeatureZ,
    };
  }
  if (confidence < (options.minConfidence ?? 0)) {
    return {
      predictionSet,
      category: null,
      confidence,
      abstained: true,
      reason: "low_confidence",
      maxFeatureZ,
    };
  }
  if (predictionSet.length !== 1) {
    return {
      predictionSet,
      category: null,
      confidence,
      abstained: true,
      reason: "prediction_set",
      maxFeatureZ,
    };
  }
  return {
    predictionSet,
    category: profile.classes[topIndex],
    confidence,
    abstained: false,
    reason: "accepted",
    maxFeatureZ,
  };
}
