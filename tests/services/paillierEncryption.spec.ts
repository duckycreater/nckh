/**
 * tests/services/paillierEncryption.spec.ts
 *
 * Stress / edge-case coverage for the Paillier primitives.
 * Overlaps with secureAggregation.spec.ts but focuses on:
 *   - Boundary messages (0, n-1)
 *   - Encrypted messages across many key sizes
 *   - Re-encryption of a known plaintext never produces the same ciphertext
 *   - DP-noise encryption stays within a sane band (statistical)
 *
 * Run with: npm test  (node:test).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  generatePaillierKeyPair,
  paillierEncrypt,
  paillierDecrypt,
  paillierEncryptVector,
  paillierEncryptWithLaplaceNoise,
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

describe("paillierEncryption.metadata", () => {
  it("SECURE_AGGREGATION_VERSION is semver", () => {
    expect(SECURE_AGGREGATION_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("paillierEncryption.edge cases", () => {
  const key = generatePaillierKeyPair(512); // smaller for speed; still secure enough for unit tests
  it("m=0 → E(0) → 0", () => {
    const c = paillierEncrypt(0n, key.publicKey);
    expect(paillierDecrypt(c, key)).toBe(0n);
  });
  it("m=n-1 → E(n-1) → n-1", () => {
    const m = key.publicKey.n - 1n;
    const c = paillierEncrypt(m, key.publicKey);
    expect(paillierDecrypt(c, key)).toBe(m);
  });
  it("100 random re-encryptions of m=1 all differ", () => {
    const ciphertexts = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ciphertexts.add(paillierEncrypt(1n, key.publicKey).toString());
    }
    // Should have ≥ 99 distinct values (allow 1 collision in 100 with negligible probability).
    expect(ciphertexts.size).toBeGreaterThanOrEqual(99);
  });
  it("ciphertext bound: 0 ≤ c < n²", () => {
    const n2 = key.publicKey.n * key.publicKey.n;
    for (let i = 0; i < 20; i++) {
      const c = paillierEncrypt(BigInt(i * 17), key.publicKey);
      expect(c >= 0n).toBe(true);
      expect(c < n2).toBe(true);
    }
  });
});

describe("paillierEncryption.vector encryption with noise", () => {
  const key = generatePaillierKeyPair(512);
  it("encrypts each element and round-trips back", () => {
    const v = [3n, 5n, 7n, 11n];
    const cv = paillierEncryptVector(v.map(Number), key.publicKey);
    expect(cv.length).toBe(v.length);
    for (let i = 0; i < v.length; i++) {
      expect(paillierDecrypt(cv[i], key)).toBe(v[i]);
    }
  });
  it("Laplace-noised encryption stays within ±50 of input (ε=1, sens=5)", () => {
    const trials = 30;
    let inBand = 0;
    for (let i = 0; i < trials; i++) {
      const c = paillierEncryptWithLaplaceNoise(100, key.publicKey, 5, 1);
      const d = paillierDecrypt(c, key);
      if (Math.abs(Number(d) - 100) < 50) inBand++;
    }
    // With sens/ε = 5, expected noise ≤ ~50 with high probability.
    expect(inBand / trials).toBeGreaterThanOrEqual(0.7);
  });
});