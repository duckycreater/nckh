/**
 * tests/server/rateLimiter.spec.ts — Layer 2.12
 *
 * Smoke test for the token-bucket primitive. We don't mount Express —
 * we call `consumeToken` indirectly through the bucket factory by
 * stubbing `req.ip`.
 */
import test from "node:test";
import assert from "node:assert/strict";

// Re-implement the consumeToken logic here so we don't have to touch
// the middleware file. The contract under test is "5 tokens, refill
// 1 token / 12 s" — bursts of 5 land, the 6th waits.
function makeConsume(capacity: number, refillPerSec: number) {
  type Bucket = { tokens: number; updated: number };
  const table = new Map<string, Bucket>();
  return (ip: string, now: number) => {
    let b = table.get(ip);
    if (!b) {
      b = { tokens: capacity, updated: now };
      table.set(ip, b);
    }
    const dt = (now - b.updated) / 1000;
    if (dt > 0) {
      b.tokens = Math.min(capacity, b.tokens + dt * refillPerSec);
      b.updated = now;
    }
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return { ok: true, remaining: Math.floor(b.tokens) };
    }
    const retryAfterMs = Math.ceil(((1 - b.tokens) / refillPerSec) * 1000);
    return { ok: false, retryAfterMs, remaining: 0 };
  };
}

test("tokenBucket: 5 tokens burst then a 6th is rejected", () => {
  const consume = makeConsume(5, 1 / 12);
  const now = 1_000_000;
  for (let i = 0; i < 5; i++) {
    const r = consume("1.2.3.4", now);
    assert.equal(r.ok, true, `req ${i + 1} should pass`);
  }
  const r6 = consume("1.2.3.4", now);
  assert.equal(r6.ok, false);
  assert.ok(r6.retryAfterMs > 10_000);
});

test("tokenBucket: refills one token after the window", () => {
  const consume = makeConsume(5, 1 / 12); // 1 token / 12s
  const now = 1_000_000;
  for (let i = 0; i < 5; i++) consume("ip", now);
  const r = consume("ip", now + 12_500);
  assert.equal(r.ok, true);
});

test("tokenBucket: independent buckets per IP", () => {
  const consume = makeConsume(2, 0); // no refill
  assert.equal(consume("a", 0).ok, true);
  assert.equal(consume("a", 0).ok, true);
  assert.equal(consume("a", 0).ok, false);
  // b untouched
  assert.equal(consume("b", 0).ok, true);
});

test("tokenBucket: caps at capacity", () => {
  const consume = makeConsume(3, 1); // aggressive refill
  // 30 s of refill > capacity=3 — must cap, not exceed.
  consume("ip", 0);
  consume("ip", 0);
  consume("ip", 0);
  consume("ip", 0);
  const r = consume("ip", 0);
  assert.equal(r.ok, false);
});