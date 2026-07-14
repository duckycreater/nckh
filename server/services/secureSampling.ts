/**
 * secureSampling.ts
 *
 * Cryptographically-secure random sampling primitives used by
 * `secureAggregation.ts` (Paillier DP noise) and `dpAccountant.ts`
 * (Heterogeneous-RDP composition).
 *
 * The single non-negotiable rule:
 *   **Never use `Math.random()` for anything that feeds a privacy or
 *   cryptographic primitive.** `Math.random` is an LCG, predictable from
 *   a handful of consecutive outputs, and silently breaks DP.
 *
 * Every function here is backed by Node's `crypto.randomBytes` (CSPRNG).
 *
 * Reference: NIST SP 800-90A (HMAC-DRBG / CTR-DRBG).
 */
import crypto from "node:crypto";

/**
 * Uniform double in (0, 1). Uses 32 bits of CSPRNG entropy (4 random
 * bytes), keeping us well below Number.MAX_SAFE_INTEGER (2^53 − 1) so
 * every value is exact in IEEE-754. 32 bits is more than enough to defeat
 * any practical brute-force attack on the noise source.
 *
 * Range is *open* on both ends so the inverse-CDF samplers below never
 * hit log(0).
 */
export function sampleUniform01(): number {
  const buf = crypto.randomBytes(4);
  // 32-bit unsigned big-endian integer in [0, 2^32 − 1].
  const mantissa = buf.readUIntBE(0, 4);
  // Reserve mantissa=0 to avoid returning 0 (we want (0, 1) open).
  // Probability: 2^-32 — fine.
  return (mantissa + 1) / 0x1_0000_0001;
}

/**
 * Symmetric uniform double in (-0.5, 0.5). Convenience wrapper for the
 * inverse-CDF samplers below.
 */
export function sampleSymmetricHalf(): number {
  return sampleUniform01() - 0.5;
}

/**
 * Draw from a Laplace(0, b) distribution via inverse-CDF sampling.
 *
 *   X = -b · sign(u) · log(1 - 2|u|),  u ~ Uniform(-0.5, 0.5)
 *
 * `b` (scale) defaults to 1.0; callers scale the result.
 *
 * `@param bytes`  Optional 4-byte buffer. Provided for tests that want
 *                determinism; production code should let it default to
 *                a fresh `crypto.randomBytes(4)` call.
 */
export function laplaceSample(b: number = 1, bytes?: Buffer): number {
  const buf = bytes ?? crypto.randomBytes(4);
  const mantissa = buf.readUIntBE(0, 4);
  // Map 32-bit integer to (0, 1) by reserving both boundary values.
  const u01 = (mantissa + 1) / 0x1_0000_0001; // (0, 1)
  const u = u01 - 0.5; // (-0.5, 0.5)
  return (-b) * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

/**
 * Uniform bigint modulo n, with full n+ bits of entropy. Used by
 * `secureAggregation.paillierEncrypt` for the Paillier `r` factor.
 *
 * The output is uniform over [0, n). Rejection of `0` has negligible
 * probability (~1/n) and is unbiased.
 */
export function uniformModN(n: bigint, bytes = 256): bigint {
  const buf = crypto.randomBytes(bytes);
  const candidate = BigInt("0x" + buf.toString("hex")) % n;
  return candidate === 0n ? uniformModN(n, bytes) : candidate;
}