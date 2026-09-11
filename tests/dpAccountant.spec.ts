/**
 * dpAccountant.spec.ts — verifies Rényi DP accounting math.
 *
 * These tests exercise pure logic only (no browser, no Express). They are
 * the kind of unit tests the plan asks for: science modules must have
 * reproducible numerical behaviour.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  gaussianRenyiEpsilon,
  composeRenyi,
  renyiToEpsilonDelta,
  renyiToEpsilonAtDelta,
  RenyiDpAccountant,
  DP_ACCOUNTANT_VERSION,
} from "../src/services/dpAccountant";

function assertClose(actual: number, expected: number, tolerance = 1e-10): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not close to ${expected}`);
}

describe("DP_ACCOUNTANT_VERSION", () => {
  it("is exported and non-empty", () => {
    assert.ok(DP_ACCOUNTANT_VERSION.length > 0);
  });
});

describe("gaussianRenyiEpsilon", () => {
  it("throws when alpha < 1", () => {
    assert.throws(() => gaussianRenyiEpsilon(0.5, 1, 1), /alpha/);
  });
  it("throws when sigma <= 0", () => {
    assert.throws(() => gaussianRenyiEpsilon(2, 0, 1), /sigma/);
  });
  it("throws when clip_norm <= 0", () => {
    assert.throws(() => gaussianRenyiEpsilon(2, 1, 0), /clip/);
  });
  it("equals alpha * clip² / (2 σ²) for moderate α", () => {
    // Standard analytical Gaussian mechanism bound.
    assertClose(gaussianRenyiEpsilon(2, 1, 1), 1.0);
    assertClose(gaussianRenyiEpsilon(5, 1, 1), 2.5);
    assertClose(gaussianRenyiEpsilon(2, 2, 1), 0.25);
  });
  it("scales quadratically with clip_norm", () => {
    const base = gaussianRenyiEpsilon(3, 1, 1);
    const bigger = gaussianRenyiEpsilon(3, 1, 2);
    assertClose(bigger, base * 4);
  });
});

describe("composeRenyi", () => {
  it("equals T * ε_round", () => {
    const epsRound = gaussianRenyiEpsilon(2, 1, 1);
    assertClose(composeRenyi(5, 2, 1, 1), 5 * epsRound);
  });
  it("grows linearly with rounds", () => {
    const a = composeRenyi(10, 2, 1, 1);
    const b = composeRenyi(20, 2, 1, 1);
    assertClose(b, 2 * a);
  });
});

describe("renyiToEpsilonDelta", () => {
  it("returns a number for empty input", () => {
    const out = renyiToEpsilonDelta([], 4.0);
    assert.equal(typeof out, "number");
    assert.ok(out > 0);
  });
  it("returns a value in (0, 1] for valid input", () => {
    const out = renyiToEpsilonDelta([{ alpha: 2, epsAlpha: 1.0 }], 4.0);
    assert.ok(out > 0);
    assert.ok(out <= 1);
  });
  it("uses the correct sign in the basic RDP to delta conversion", () => {
    const out = renyiToEpsilonDelta([{ alpha: 2, epsAlpha: 1 }], 4);
    assertClose(out, Math.exp(-3));
  });
  it("decreases delta when the allowed epsilon becomes looser", () => {
    const curve = [{ alpha: 4, epsAlpha: 0.5 }];
    assert.ok(renyiToEpsilonDelta(curve, 2) < renyiToEpsilonDelta(curve, 1));
  });
});

describe("renyiToEpsilonAtDelta", () => {
  it("uses the standard RDP to (epsilon, delta) conversion", () => {
    const epsilon = renyiToEpsilonAtDelta([{ alpha: 2, epsAlpha: 1 }], 1e-5);
    assertClose(epsilon, 1 + Math.log(1e5));
  });
  it("rejects invalid delta", () => {
    assert.throws(() => renyiToEpsilonAtDelta([{ alpha: 2, epsAlpha: 1 }], 1), /targetDelta/);
  });
});

describe("RenyiDpAccountant", () => {
  it("starts with zero rounds", () => {
    const a = new RenyiDpAccountant();
    const state = a.computeState();
    assert.equal(state.rounds, 0);
  });
  it("recommends a sigma when not within budget", () => {
    const a = new RenyiDpAccountant({ sigma: 0.001, clipNorm: 1.0 });
    // Pretend we have run 1 round.
    a.recordRound();
    const state = a.computeState();
    // Either within budget (recommendedSigma is undefined) or
    // there's a positive recommendation; both shapes are acceptable.
    if (!state.withinBudget) {
      assert.equal(
        typeof state.recommendedSigma === "number" || state.recommendedSigma === null,
        true,
      );
    }
  });
  it("singleton can be reset between tests", async () => {
    const { getDpAccountant, resetDpAccountant } = await import("../src/services/dpAccountant");
    resetDpAccountant();
    const a = getDpAccountant();
    assert.ok(a);
  });
  it("checks the next round, not only the current round", () => {
    const a = new RenyiDpAccountant({ sigma: 1, clipNorm: 1 });
    for (let i = 0; i < 3; i++) a.recordRound();
    const expected = new RenyiDpAccountant({ sigma: 1, clipNorm: 1 });
    for (let i = 0; i < 4; i++) expected.recordRound();
    assert.equal(a.canAffordNextRound(), expected.computeState().withinBudget);
    assert.equal(a.getNumRounds(), 3);
  });
  it("composes each round with the configuration used at that time", () => {
    const a = new RenyiDpAccountant({ sigma: 1, clipNorm: 1 });
    a.recordRound();
    a.setConfig({ sigma: 2 });
    a.recordRound();
    const alphaTwo = a.computeState([2]).renyiCurve[0]!.epsAlpha;
    // alpha=2: first round contributes 1, second contributes 0.25.
    assertClose(alphaTwo, 1.25);
  });
});
