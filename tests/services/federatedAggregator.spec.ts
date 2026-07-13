/**
 * tests/services/federatedAggregator.spec.ts
 *
 * FedAvg + DP aggregation buffer logic. We do NOT require a real DB
 * (the aggregator degrades gracefully when getDb() returns null). We
 * also do NOT exercise the timer; we drive runRoundIfReady() directly.
 *
 * Run with: npm test  (node:test).
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { FederatedAggregator } from "../../server/services/federatedAggregator.ts";

const expect = (v: unknown) => ({
  toBe: (x: unknown) => assert.deepStrictEqual(v, x),
  toEqual: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeCloseTo: (x: number, digits = 5) =>
    assert.ok(
      Math.abs(Number(v) - x) < Math.pow(10, -digits),
      `expected ${v} ≈ ${x}`,
    ),
  toBeGreaterThan: (x: number) => assert.ok(Number(v) > x, `${v} <= ${x}`),
  toBeLessThan: (x: number) => assert.ok(Number(v) < x, `${v} >= ${x}`),
  toBeGreaterThanOrEqual: (x: number) =>
    assert.ok(Number(v) >= x, `${v} < ${x}`),
  toBeLessThanOrEqual: (x: number) => assert.ok(Number(v) <= x, `${v} > ${x}`),
  toBeType: (t: string) => assert.strictEqual(typeof v, t),
  toMatch: (re: RegExp) => assert.ok(re.test(String(v)), `${v} did not match ${re}`),
  toBeTruthy: () => assert.ok(v),
});

const CATS = ["plastic", "paper", "glass", "metal", "organic", "hazard"];

/**
 * Build a weight row with shape [1×6] (one score per category).
 */
function makeRow(probs: number[]): number[][] {
  // Row normalised so L2 norm ≤ clipNorm (default 1.0)
  const l2 = Math.sqrt(probs.reduce((s, v) => s + v * v, 0));
  const scaled = l2 > 1.0 ? probs.map((v) => v / l2) : probs;
  return [scaled];
}

describe("FederatedAggregator.configure + getStats", () => {
  it("default config has reasonable defaults", () => {
    const agg = new FederatedAggregator();
    const cfg = agg.getConfig();
    expect(cfg.minClients).toBe(10);
    expect(cfg.dpEpsilon).toBeGreaterThan(0);
    expect(cfg.dpDelta).toBeGreaterThan(0);
    expect(cfg.clipNorm).toBeGreaterThan(0);
    expect(cfg.bufferLimit).toBeGreaterThan(0);
  });
  it("configure overrides individual fields", () => {
    const agg = new FederatedAggregator();
    agg.configure({minClients: 3, dpEpsilon: 5.0});
    expect(agg.getConfig().minClients).toBe(3);
    expect(agg.getConfig().dpEpsilon).toBe(5.0);
    expect(agg.getConfig().dpDelta).toBeGreaterThan(0); // unchanged
  });
  it("getStats reports bufferSize + dp + (null latestVersion)", () => {
    const agg = new FederatedAggregator();
    const s = agg.getStats();
    expect(s.bufferSize).toBe(0);
    expect(s.minClients).toBe(10);
    expect(s.latestVersion).toBe(null);
    expect(s.dp.epsilon).toBeGreaterThan(0);
    expect(s.dp.delta).toBeGreaterThan(0);
    expect(s.dp.clipNorm).toBeGreaterThan(0);
  });
});

describe("FederatedAggregator.submit", () => {
  let agg: FederatedAggregator;
  beforeEach(() => {
    agg = new FederatedAggregator();
    agg.configure({minClients: 2, bufferLimit: 50, clipNorm: 1.0});
  });
  it("accepts well-formed updates and returns a 64-hex hash", async () => {
    const r = await agg.submit("user1", {
      round: 1,
      weights: makeRow([0.2, 0.1, 0.1, 0.1, 0.3, 0.2]),
      numSamples: 10,
      metrics: {loss: 0.5, accuracy: 0.8, durationMs: 100},
      privacy: {epsilon: 1.0, delta: 1e-5, noiseSigma: 0.5},
    });
    expect(r.accepted).toBe(true);
    expect(r.weightHash).toMatch(/^[0-9a-f]{64}$/);
    expect(agg.getBufferSize()).toBe(1);
  });
  it("rejects updates with norm > 4·clipNorm", async () => {
    // Bypass the local L2 cap: scale is 24.5 (> 4·1.0).
    const huge = [[10, 10, 10, 10, 10, 10]];
    const r = await agg.submit("user1", {
      round: 1,
      weights: huge,
      numSamples: 10,
      metrics: {loss: 0.5, accuracy: 0.8, durationMs: 100},
      privacy: {epsilon: 1.0, delta: 1e-5, noiseSigma: 0.5},
    });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe("norm_exceeded");
  });
  it("rejects when buffer is full", async () => {
    agg.configure({bufferLimit: 2});
    for (let i = 0; i < 2; i++) {
      await agg.submit(`u${i}`, {
        round: 1,
        weights: makeRow([0.1, 0.1, 0.1, 0.1, 0.3, 0.3]),
        numSamples: 5,
        metrics: {loss: 0.5, accuracy: 0.8, durationMs: 100},
        privacy: {epsilon: 1.0, delta: 1e-5, noiseSigma: 0.5},
      });
    }
    const r = await agg.submit("overflow", {
      round: 1,
      weights: makeRow([0.1, 0.1, 0.1, 0.1, 0.3, 0.3]),
      numSamples: 5,
      metrics: {loss: 0.5, accuracy: 0.8, durationMs: 100},
      privacy: {epsilon: 1.0, delta: 1e-5, noiseSigma: 0.5},
    });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe("buffer_full");
  });
});

describe("FederatedAggregator.runRoundIfReady", () => {
  let agg: FederatedAggregator;
  beforeEach(() => {
    agg = new FederatedAggregator();
    agg.configure({minClients: 2, dpEpsilon: 100.0}); // high ε ≈ little noise
  });
  it("returns not_enough_clients when buffer too small", async () => {
    await agg.submit("u1", {
      round: 1,
      weights: makeRow([0.2, 0.1, 0.1, 0.1, 0.3, 0.2]),
      numSamples: 10,
      metrics: {loss: 0.5, accuracy: 0.8, durationMs: 100},
      privacy: {epsilon: 1.0, delta: 1e-5, noiseSigma: 0.5},
    });
    const r = await agg.runRoundIfReady();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("not_enough_clients");
    expect(r.participants).toBe(1);
  });
  it("aggregates and clears buffer after enough clients", async () => {
    const probs = [0.2, 0.1, 0.1, 0.1, 0.3, 0.2];
    for (let i = 0; i < 3; i++) {
      await agg.submit(`u${i}`, {
        round: 1,
        weights: makeRow(probs),
        numSamples: 10,
        metrics: {loss: 0.5, accuracy: 0.8, durationMs: 100},
        privacy: {epsilon: 1.0, delta: 1e-5, noiseSigma: 0.5},
      });
    }
    const r = await agg.runRoundIfReady();
    expect(r.ok).toBe(true);
    expect(r.participants).toBe(3);
    expect(typeof r.version).toBe("string");
    expect(r.aggregated).toBeTruthy();
    // All 6 categories present
    for (const c of CATS) {
      expect(typeof r.aggregated![c]).toBe("number");
    }
    // With ε=100 noise should be near zero; aggregated ≈ input (L2-normalised).
    for (const c of CATS) {
      expect(Math.abs(r.aggregated![c] - probs[CATS.indexOf(c)])).toBeLessThan(0.5);
    }
    expect(agg.getBufferSize()).toBe(0);
    expect(agg.getLatestVersion()?.trainedOn).toBe(30);
  });
  it("weights by numSamples (FedAvg)", async () => {
    // Two clients: u1 with 10 samples and score 1.0; u2 with 90 samples and score 0.0
    // Expected: aggregated ≈ 0.1·1.0 + 0.9·0.0 = 0.1 (in row 0)
    for (let i = 0; i < 2; i++) {
      await agg.submit(`u${i}`, {
        round: 1,
        weights: i === 0 ? makeRow([1, 0, 0, 0, 0, 0]) : makeRow([0, 1, 0, 0, 0, 0]),
        numSamples: i === 0 ? 10 : 90,
        metrics: {loss: 0.5, accuracy: 0.8, durationMs: 100},
        privacy: {epsilon: 1.0, delta: 1e-5, noiseSigma: 0.5},
      });
    }
    agg.configure({dpEpsilon: 100.0}); // high epsilon → small noise
    const r = await agg.runRoundIfReady();
    expect(r.ok).toBe(true);
    // plastic = (1.0 · 10 + 0.0 · 90) / 100 = 0.10 (give 1 digit tolerance)
    expect(r.aggregated!.plastic).toBeCloseTo(0.10, 1);
    expect(r.aggregated!.paper).toBeCloseTo(0.90, 1);
  });
});

describe("FederatedAggregator.start/stop", () => {
  it("start() is idempotent; stop() clears timer", () => {
    const agg = new FederatedAggregator();
    agg.start();
    agg.start(); // calling twice should not crash
    agg.stop();
    agg.stop(); // idempotent
    // Just verify no exceptions.
    expect(true).toBe(true);
  });
});