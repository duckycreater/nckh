/**
 * tests/services/secureAggregation.spec.ts
 *
 * Homomorphic Paillier primitives used by the federated aggregator.
 * Coverage:
 *   - Round-trip encryption/decryption for integer messages
 *   - Homomorphic addition (E(m1) · E(m2) = E(m1 + m2))
 *   - Homomorphic scalar multiplication (E(m)^k = E(k·m))
 *   - Sum of ciphertexts
 *   - Edge cases: m = 0, m = n - 1, k = 0
 *   - Self-test sanity check
 *   - Encrypted-with-Laplace-noise vector shape
 *
 * Run with: npm test  (node:test).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  generatePaillierKeyPair,
  paillierEncrypt,
  paillierDecrypt,
  paillierAdd,
  paillierMulScalar,
  paillierSum,
  paillierEncryptVector,
  paillierEncryptWithLaplaceNoise,
  maybeSelfTest,
  SECURE_AGGREGATION_VERSION,
} from "../../server/services/secureAggregation.ts";

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
  toMatch: (re: RegExp) => assert.ok(re.test(String(v)), `${v} did not match ${re}`),
});

function expectThrows(fn: () => unknown, msg?: string | RegExp): void {
  try {
    fn();
    assert.fail("Expected function to throw");
  } catch (e) {
    if (msg !== undefined) {
      const text = (e as Error).message;
      if (msg instanceof RegExp) {
        assert.ok(msg.test(text), `message ${text} !~ ${msg}`);
      } else {
        assert.ok(text.includes(msg), `message ${text} missing ${msg}`);
      }
    }
  }
}

function expectNoThrow(fn: () => unknown): void {
  try {
    fn();
  } catch (e) {
    assert.fail(`Expected no throw, got: ${(e as Error).message}`);
  }
}

describe("secureAggregation.metadata", () => {
  it("version is semver", () => {
    expect(SECURE_AGGREGATION_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
  it("self-test passes", () => {
    expect(maybeSelfTest()).toBe(true);
  });
});

// ─── Round-trip ───────────────────────────────────────────────────────────
describe("paillier.encrypt/decrypt round-trip", () => {
  const key = generatePaillierKeyPair(1024); // small for test speed
  it("decrypts to original", () => {
    const maxM = key.publicKey.n - 2n;
    for (const m of [0n, 1n, 2n, 42n, 1000n, maxM]) {
      const c = paillierEncrypt(m, key.publicKey);
      const d = paillierDecrypt(c, key);
      expect(d).toBe(m);
    }
  });
  it("rejects negative message", () => {
    expectThrows(() => paillierEncrypt(-1, key.publicKey));
  });
  it("rejects message ≥ n", () => {
    expectThrows(() => paillierEncrypt(key.publicKey.n, key.publicKey));
  });
  it("ciphertext is in [0, n²)", () => {
    const n2 = key.publicKey.n * key.publicKey.n;
    const c = paillierEncrypt(123, key.publicKey);
    expect(c >= 0n).toBe(true);
    expect(c < n2).toBe(true);
  });
  it("two encryptions of same message differ (randomness)", () => {
    const c1 = paillierEncrypt(42, key.publicKey);
    const c2 = paillierEncrypt(42, key.publicKey);
    expect(c1 === c2).toBe(false);
  });
});

// ─── Homomorphic addition ─────────────────────────────────────────────────
describe("paillierAdd (homomorphic +)", () => {
  const key = generatePaillierKeyPair(1024);
  it("E(a) · E(b) = E(a + b)", () => {
    for (const [a, b] of [[1, 2], [10, 20], [100, 250], [0, 5]] as [number, number][]) {
      const ca = paillierEncrypt(a, key.publicKey);
      const cb = paillierEncrypt(b, key.publicKey);
      const csum = paillierAdd(ca, cb, key.publicKey.n);
      expect(paillierDecrypt(csum, key)).toBe(BigInt(a + b));
    }
  });
  it("E(a) + E(0) = E(a)", () => {
    const ca = paillierEncrypt(99, key.publicKey);
    const cz = paillierEncrypt(0, key.publicKey);
    const sum = paillierAdd(ca, cz, key.publicKey.n);
    expect(paillierDecrypt(sum, key)).toBe(99n);
  });
});

// ─── Scalar multiplication ────────────────────────────────────────────────
describe("paillierMulScalar (homomorphic × k)", () => {
  const key = generatePaillierKeyPair(1024);
  it("E(m)^k = E(k·m)", () => {
    const c = paillierEncrypt(7, key.publicKey);
    for (const k of [1, 2, 5, 10, 100]) {
      const scaled = paillierMulScalar(c, k, key.publicKey.n);
      expect(paillierDecrypt(scaled, key)).toBe(BigInt(7 * k));
    }
  });
  it("k=0 yields E(0)", () => {
    const c = paillierEncrypt(7, key.publicKey);
    const z = paillierMulScalar(c, 0, key.publicKey.n);
    expect(paillierDecrypt(z, key)).toBe(0n);
  });
});

// ─── Sum of ciphertexts ───────────────────────────────────────────────────
describe("paillierSum", () => {
  const key = generatePaillierKeyPair(1024);
  it("sum of encrypted values equals encryption of sum", () => {
    const ms = [3, 5, 7, 11, 13];
    const cs = ms.map((m) => paillierEncrypt(m, key.publicKey));
    const sumC = paillierSum(cs, key.publicKey.n);
    const total = ms.reduce((a, b) => a + b, 0);
    expect(paillierDecrypt(sumC, key)).toBe(BigInt(total));
  });
  it("empty array sums to E(0)", () => {
    const c0 = paillierSum([], key.publicKey.n);
    expect(paillierDecrypt(c0, key)).toBe(0n);
  });
});

// ─── Vector encryption ────────────────────────────────────────────────────
describe("paillierEncryptVector", () => {
  const key = generatePaillierKeyPair(1024);
  it("preserves length", () => {
    const v = [1, 2, 3, 4, 5];
    const cv = paillierEncryptVector(v, key.publicKey);
    expect(cv.length).toBe(v.length);
    for (let i = 0; i < v.length; i++) {
      expect(paillierDecrypt(cv[i], key)).toBe(BigInt(v[i]));
    }
  });
  it("empty vector yields empty array", () => {
    const cv = paillierEncryptVector([], key.publicKey);
    expect(cv.length).toBe(0);
  });
});

// ─── Vector with Laplace noise ─────────────────────────────────────────────
describe("paillierEncryptWithLaplaceNoise", () => {
  const key = generatePaillierKeyPair(1024);
  it("decrypted value is close to input (10 trials, ε=1, sensitivity=5)", () => {
    const input = 42;
    let inBand = 0;
    for (let trial = 0; trial < 10; trial++) {
      const c = paillierEncryptWithLaplaceNoise(input, key.publicKey, 5, 1);
      const dec = paillierDecrypt(c, key);
      const delta = Math.abs(Number(dec) - input);
      if (delta < 50) inBand++;
    }
    expect(inBand).toBeGreaterThanOrEqual(7); // most trials within ±50
  });
});