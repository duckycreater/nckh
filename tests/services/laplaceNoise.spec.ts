/**
 * tests/services/laplaceNoise.spec.ts
 *
 * Layer 2.5 — Regression test for the CSPRNG-backed Laplace sampler in
 * `secureSampling.ts`. The previous implementation used `Math.random()`,
 * which is an LCG, not a CSPRNG, and is unsuitable for cryptographic
 * noise sources.
 *
 * Pure-logic spec; runs under `npm test` (node:test bridge) and
 * `tsx --test tests/services/laplaceNoise.spec.ts`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { laplaceSample } from "../../server/services/secureSampling.ts";
import crypto from "node:crypto";

function laplaceCdf(x: number, mu = 0, b = 1) {
  return x < mu
    ? 0.5 * Math.exp((x - mu) / b)
    : 1 - 0.5 * Math.exp(-(x - mu) / b);
}

describe("laplaceSample (CSPRNG-backed, Layer 2.5)", () => {
  it("empirical CDF approximates analytical Laplace CDF (KS distance)", () => {
    const N = 500;
    const samples: number[] = [];
    for (let i = 0; i < N; i++) {
      samples.push(laplaceSample(1, crypto.randomBytes(4)));
    }
    samples.sort((a, b) => a - b);

    let maxStat = 0;
    for (let i = 0; i < N; i++) {
      const empirical = (i + 1) / N;
      const analytical = laplaceCdf(samples[i]!);
      maxStat = Math.max(maxStat, Math.abs(empirical - analytical));
    }
    // Generous bound — for N=500 and Laplace(0,1) the 5%-critical KS is ~0.061.
    // Use 0.10 to allow CI noise.
    assert.ok(maxStat < 0.1, `KS statistic ${maxStat} exceeded 0.10`);
  });

  it("is reproducible per seed-equivalent input", () => {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    const a = laplaceSample(1, buf);
    const b = laplaceSample(1, buf);
    assert.strictEqual(a, b);
  });

  it("produces values in the expected Laplace range", () => {
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(laplaceSample(1, crypto.randomBytes(4)));
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    assert.ok(Math.abs(mean) < 0.5, `mean ${mean} outside ±0.5`);
  });
});
