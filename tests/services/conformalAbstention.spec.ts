import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fitConformalProfile,
  selectivePredict,
  validateConformalProfile,
} from "../../src/services/conformalAbstention.ts";

const classes = ["plastic", "paper", "glass"];

describe("conformal abstention", () => {
  it("fits a finite-sample profile and accepts a calibrated singleton", () => {
    const profile = fitConformalProfile(
      [
        [0.9, 0.05, 0.05],
        [0.8, 0.1, 0.1],
        [0.85, 0.1, 0.05],
      ],
      ["plastic", "paper", "glass"],
      classes,
      { alpha: 0.1, source: "held_out" },
    );
    assert.equal(validateConformalProfile(profile, classes), true);
    const result = selectivePredict([0.95, 0.03, 0.02], profile);
    assert.equal(result.abstained, false);
    assert.equal(result.category, "plastic");
    assert.deepEqual(result.predictionSet, ["plastic"]);
  });

  it("abstains when the calibrated prediction set is ambiguous", () => {
    const profile = fitConformalProfile(
      [
        [0.6, 0.4],
        [0.55, 0.45],
        [0.65, 0.35],
        [0.58, 0.42],
      ],
      ["plastic", "paper", "plastic", "paper"],
      ["plastic", "paper"],
      { alpha: 0.1 },
    );
    const result = selectivePredict([0.51, 0.49], profile);
    assert.equal(result.abstained, true);
    assert.equal(result.reason, "prediction_set");
    assert.equal(result.category, null);
  });

  it("rejects out-of-domain feature vectors when a shift profile is present", () => {
    const profile = fitConformalProfile(
      [
        [0.9, 0.1],
        [0.8, 0.2],
        [0.85, 0.15],
        [0.88, 0.12],
      ],
      ["plastic", "paper", "plastic", "plastic"],
      ["plastic", "paper"],
      {
        featureVectors: [
          [0, 0],
          [0.1, 0],
          [0, 0.1],
          [0.1, 0.1],
        ],
        maxFeatureZ: 3,
      },
    );
    const result = selectivePredict([0.99, 0.01], profile, { features: [100, 100] });
    assert.equal(result.abstained, true);
    assert.equal(result.reason, "domain_shift");
    assert.equal(result.category, null);
  });

  it("fails closed for malformed profiles or probabilities", () => {
    const profile = fitConformalProfile(
      [
        [0.9, 0.1],
        [0.8, 0.2],
      ],
      ["plastic", "paper"],
      ["plastic", "paper"],
    );
    const invalid = { ...profile, quantile: Number.NaN };
    assert.equal(selectivePredict([0.9, 0.1], invalid).reason, "invalid_profile");
    assert.equal(selectivePredict([0, 0], profile).reason, "invalid_profile");
  });
});
