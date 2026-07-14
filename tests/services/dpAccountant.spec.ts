/**
 * tests/services/dpAccountant.spec.ts
 *
 * Layer 2.4 — Regression test for the heterogeneous RDP composition in
 * `server/services/dpAccountant.ts`. The previous implementation had
 *
 *     return total * rounds[0]?.n ? 1 : 1;
 *
 * which always evaluates to 1, silently discarding the summed Rényi
 * divergence. This spec asserts the corrected sum is a meaningful,
 * monotonically increasing function of the input.
 *
 * Pure-logic spec; runs under `npm test` (node:test bridge) and
 * `tsx --test tests/services/dpAccountant.spec.ts`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  composeHeterogeneous,
  composeHeterogeneousToEpsilon,
  type HeterogeneousRound,
} from "../../server/services/dpAccountant.ts";
import { gaussianRenyiEpsilon } from "../../src/services/dpAccountant.ts";

const mk = (sigma: number, clipNorm = 1.0, n = 100): HeterogeneousRound => ({
  clientId: `c_${Math.random().toString(36).slice(2)}`,
  clipNorm,
  sigma,
  n,
});

describe("composeHeterogeneous (Layer 2.4 regression)", () => {
  it("returns a positive sum for a single round (was hard-coded to 1)", () => {
    const sum = composeHeterogeneous([mk(1.1)], 10);
    assert.ok(sum > 0, `expected positive, got ${sum}`);
    assert.notStrictEqual(sum, 1);
  });

  it("sums across heterogeneous clients (not constant)", () => {
    const rounds = [mk(1.1), mk(0.9), mk(1.5)];
    const a = composeHeterogeneous(rounds, 5);
    const b = composeHeterogeneous([rounds[0]!], 5);
    assert.ok(a > b, `expected ${a} > ${b}`);
    // Doubling all σ reduces divergence (larger noise, weaker bound).
    const roundsB = [mk(2.2), mk(1.8), mk(3.0)];
    const c = composeHeterogeneous(roundsB, 5);
    assert.ok(a > c, `expected ${a} > ${c}`);
  });

  it("scales by exact additive factor across independent rounds", () => {
    // Per-round epsilon is identical for all σ=1.1, clip=1.0 clients, so
    // the heterogeneous sum with N clients is exactly N × ε_round.
    const single = composeHeterogeneous([mk(1.1)], 10);
    const ten = composeHeterogeneous(Array.from({ length: 10 }, () => mk(1.1)), 10);
    const ratio = ten / (single * 10);
    assert.ok(Math.abs(ratio - 1) < 1e-9, `ratio ${ratio} ≠ 1`);
  });

  it("returns 0 for empty round list (vacuous composition)", () => {
    assert.strictEqual(composeHeterogeneous([], 10), 0);
  });

  it("scales as α·clip²/(2σ²) per round (sanity)", () => {
    // Single round at α=5, clip=2, σ=2 → ε_round = 5*4/(2*4) = 2.5.
    const sum = composeHeterogeneous([mk(2.0, 2.0, 100)], 5);
    assert.ok(Math.abs(sum - 2.5) < 1e-9, `${sum} ≠ 2.5`);
  });

  it("matches the sum of independent gaussianRenyiEpsilon calls", () => {
    const rounds = [mk(1.1), mk(1.1), mk(1.1)];
    const summed = rounds.reduce((a, r) => a + gaussianRenyiEpsilon(8, r.sigma, r.clipNorm), 0);
    const composed = composeHeterogeneous(rounds, 8);
    assert.ok(Math.abs(summed - composed) < 1e-9);
  });
});

describe("composeHeterogeneousToEpsilon (RDP → (ε, δ))", () => {
  it("produces a finite ε for canonical σ=1.1 case", () => {
    const rounds: HeterogeneousRound[] = Array.from({ length: 10 }, () =>
      mk(1.1),
    );
    const out = composeHeterogeneousToEpsilon(rounds, 1e-5);
    assert.ok(Number.isFinite(out.epsilon), `got ${out.epsilon}`);
    assert.ok(out.epsilon > 0);
    // Empirical sanity: σ=1.1, clip=1.0, 10 rounds at α∈default grid
    // should produce ε of order 50 (less than 100).
    assert.ok(out.epsilon < 100, `got ${out.epsilon}`);
  });

  it("larger σ → smaller raw divergence (no Mironov noise)", () => {
    const noisy = composeHeterogeneous(
      Array.from({ length: 5 }, () => mk(2.5)),
      5,
    );
    const loud = composeHeterogeneous(
      Array.from({ length: 5 }, () => mk(0.5)),
      5,
    );
    assert.ok(noisy < loud, `noisy(${noisy}) not < loud(${loud})`);
  });
});
