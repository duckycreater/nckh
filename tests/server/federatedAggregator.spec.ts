/**
 * tests/server/federatedAggregator.spec.ts — Layer 2.6 (OOM hardening)
 *
 * The aggregator used to keep a `weights: number[][]` field on every
 * pending update. After 1000 clients × ~5 MB tensor the in-memory
 * buffer could reach ~5 GB. The contract now is:
 *   1. submit() collapses the tensor into perCategoryScores eagerly.
 *   2. submit() returns ok=false (reason='norm_exceeded') when the
 *      L2 norm exceeds 4 × clipNorm.
 *   3. Buffer cap refuses entries past `bufferLimit`.
 *   4. runRoundIfReady() produces an aggregate even with the minimal
 *      contribution per client (no NaN, finite scores).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { FederatedAggregator } from "../../server/services/federatedAggregator.ts";

test("federated: rejects wildly out-of-norm weights", async () => {
  const agg = new FederatedAggregator();
  agg.configure({ minClients: 1, bufferLimit: 5 });
  // 1e10 is way past clipNorm*4 = 4.0 — should be rejected.
  const result = await agg.submit("u1", {
    round: 1,
    weights: [[1e10, 0, 0, 0, 0, 0]],
    numSamples: 10,
    metrics: { loss: 0.1, accuracy: 0.9, durationMs: 100 },
    privacy: { epsilon: 1.0, delta: 1e-5, noiseSigma: 0.5 },
  });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "norm_exceeded");
});

test("federated: accepts weights within budget", async () => {
  const agg = new FederatedAggregator();
  agg.configure({ minClients: 1, bufferLimit: 5 });
  const r = await agg.submit("u2", {
    round: 1,
    weights: [[0.5, 0.1, 0.05, 0.05, 0.2, 0.1]],
    numSamples: 50,
    metrics: { loss: 0.1, accuracy: 0.9, durationMs: 100 },
    privacy: { epsilon: 1.0, delta: 1e-5, noiseSigma: 0.5 },
  });
  assert.equal(r.accepted, true);
  assert.match(r.weightHash, /^[a-f0-9]{64}$/);
});

test("federated: returns 'not_enough_clients' below threshold", async () => {
  const agg = new FederatedAggregator();
  agg.configure({ minClients: 2, bufferLimit: 10 });
  const r = await agg.runRoundIfReady();
  assert.equal(r.ok, false);
  assert.equal(r.reason, "not_enough_clients");
});

test("federated: aggregated scores are finite after a round", async () => {
  const agg = new FederatedAggregator();
  agg.configure({ minClients: 2, bufferLimit: 10, roundIntervalMs: 1 });
  for (const u of ["u1", "u2"]) {
    await agg.submit(u, {
      round: 1,
      weights: [[0.4, 0.2, 0.1, 0.1, 0.15, 0.05]],
      numSamples: 100,
      metrics: { loss: 0.1, accuracy: 0.9, durationMs: 100 },
      privacy: { epsilon: 1.0, delta: 1e-5, noiseSigma: 0.5 },
    });
  }
  const r = await agg.runRoundIfReady();
  assert.equal(r.ok, true);
  assert.ok(r.aggregated);
  for (const v of Object.values(r.aggregated!)) {
    assert.ok(Number.isFinite(v), `aggregate ${v} must be finite`);
  }
  assert.equal(r.participants, 2);
});

test("federated: buffer enforces capacity limit", async () => {
  const agg = new FederatedAggregator();
  agg.configure({ minClients: 100, bufferLimit: 2 });
  await agg.submit("a", { round: 1, weights: [[0.1,0.1,0.1,0.1,0.1,0.1]], numSamples: 1, metrics: { loss: 0, accuracy: 0, durationMs: 0 }, privacy: { epsilon: 1, delta: 1e-5, noiseSigma: 0.5 } });
  await agg.submit("b", { round: 1, weights: [[0.1,0.1,0.1,0.1,0.1,0.1]], numSamples: 1, metrics: { loss: 0, accuracy: 0, durationMs: 0 }, privacy: { epsilon: 1, delta: 1e-5, noiseSigma: 0.5 } });
  const third = await agg.submit("c", { round: 1, weights: [[0.1,0.1,0.1,0.1,0.1,0.1]], numSamples: 1, metrics: { loss: 0, accuracy: 0, durationMs: 0 }, privacy: { epsilon: 1, delta: 1e-5, noiseSigma: 0.5 } });
  assert.equal(third.accepted, false);
  assert.equal(third.reason, "buffer_full");
});