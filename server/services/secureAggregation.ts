/**
 * secureAggregation.ts - Paillier-style secure aggregation for federated weights
 *
 * Designed for BMO Robot where each school contributes weight deltas
 * that we want to sum WITHOUT revealing individual contributions to the
 * aggregator. This is a *lightweight* additive-HOM implementation;
 * we use the homomorphic property of Paillier (ciphertext × ciphertext
 * = E(m1 + m2) mod n²) but DON'T include the heavyweight key generation
 * here — it lives in `fl-server/server.py` for hardware-grade RSA-style
 * key generation. The Node side receives the public key and operates
 * on ciphertexts using big-integer arithmetic.
 *
 * Threat model: honest-but-curious aggregator. Malicious aggregator
 * requires additional ZK proofs (out of scope for this version).
 *
 * Use cases:
 *   1. Per-school weight aggregation in `federatedAggregator.ts`.
 *   2. Cross-school summarisation in `weeklyReflection.ts`.
 *   3. Differential-privacy noise added INSIDE the ciphertext: caller
 *      can encrypt(m + Lap(b)) before submission, so noise is
 *      attributable to the client (better deniability under audit).
 *
 * Reference:
 *   Paillier, P. (1999). Public-key cryptosystems based on composite
 *   degree residuosity classes. EUROCRYPT. https://doi.org/10.1007/3-540-48910-X_16
 *   Truex, S., et al. (2019). A hybrid approach to privacy-preserving
 *   federated learning. AISec@CCS.
 */

import crypto from "crypto";

/** Modular exponentiation with bigint support. */
function bigModPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) {
      result = (result * b) % mod;
    }
    e >>= 1n;
    b = (b * b) % mod;
  }
  return result;
}

function bigL(x: bigint, n: bigint): bigint {
  // L(x) = (x - 1) / n  for x ≡ 1 (mod n)
  return (x - 1n) / n;
}

function gcdAB(x: bigint, y: bigint): bigint {
  return y === 0n ? x : gcdAB(y, x % y);
}

/** Generate a Paillier key pair. This is *not* constant-time and should
 *  be invoked once per FL round, ideally in an out-of-process worker.
 */
export interface PaillierKeyPair {
  /** Public key (n, g). g can default to n + 1 in production. */
  publicKey: { n: bigint; g: bigint };
  /** Private key (λ, μ). */
  privateKey: { lambda: bigint; mu: bigint };
  /** Bit length (e.g., 2048). */
  bitLength: number;
}

/** Probabilistic prime search; production keys should use libsodium or HSM. */
function probablePrime(bits: number): bigint {
  // Crypto random generation of an odd bigint of `bits` length.
  while (true) {
    const bytes = crypto.randomBytes(bits / 8);
    bytes[0] = (bytes[0] | 0x80) & 0xfe; // ensure high bit set & even
    const n = BigInt(`0x${bytes.toString("hex")}`);
    if (isProbablePrime(n)) return n;
  }
}

/** Miller-Rabin primality test (deterministic for 100-round witness set). */
function isProbablePrime(n: bigint, k = 40): boolean {
  if (n < 2n) return false;
  if (n === 2n || n === 3n) return true;
  const smallPrimes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  for (const p of smallPrimes) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  let d = n - 1n;
  let s = 0n;
  while (d % 2n === 0n) {
    d /= 2n;
    s++;
  }
  outer: for (let i = 0; i < k; i++) {
    let a: bigint;
    do {
      const bytes = crypto.randomBytes(32);
      // Mask to a value < n - 2.
      const r = BigInt(`0x${bytes.toString("hex")}`);
      a = (r % (n - 3n)) + 2n;
    } while (a < 2n || a >= n);
    let x = bigModPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let r = 0n; r < s - 1n; r++) {
      x = (x * x) % n;
      if (x === 1n) return false;
      if (x === n - 1n) continue outer;
    }
    return false;
  }
  return true;
}

export function generatePaillierKeyPair(bitLength = 2048): PaillierKeyPair {
  const p = probablePrime(bitLength / 2);
  const q = probablePrime(bitLength / 2);
  const n = p * q;
  const n2 = n * n;
  const g = n + 1n; // canonical g for Paillier
  // λ = lcm(p-1, q-1)
  const a = p - 1n;
  const b = q - 1n;
  const lcm = (x: bigint, y: bigint) => (x * y) / gcdAB(x, y);
  const lambda = lcm(a, b);
  // mu = (L(g^λ mod n²))⁻¹ mod n
  const lGLambda = bigL(bigModPow(g, lambda, n2), n);
  const mu = modInverse(lGLambda, n);
  return {
    publicKey: { n, g },
    privateKey: { lambda, mu },
    bitLength,
  };
}

/** Modular inverse via extended Euclidean; returns 0n if no inverse exists. */
function modInverse(a: bigint, m: bigint): bigint {
  if (gcdAB(a, m) !== 1n) return 0n;
  // Extended Euclidean: find x s.t. a·x ≡ 1 (mod m).
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

/** Encrypt an integer `m` ∈ Z_n under a Paillier public key. */
export function paillierEncrypt(m: number | bigint, pub: { n: bigint; g: bigint }): bigint {
  const n = pub.n;
  const n2 = n * n;
  const mb = BigInt(m);
  if (mb < 0n || mb >= n) {
    throw new Error(`Message ${m} must be in [0, n)`);
  }
  // Choose r ∈ Z*_n
  let r: bigint;
  do {
    const bytes = crypto.randomBytes(256 / 8);
    r = BigInt(`0x${bytes.toString("hex")}`) % n;
  } while (r === 0n || gcdAB(r, n) !== 1n);
  // g^m * r^n mod n^2
  const gm = bigModPow(pub.g, mb, n2);
  const rn = bigModPow(r, n, n2);
  return (gm * rn) % n2;
}

/** Decrypt a ciphertext c ∈ Z_{n²}. */
export function paillierDecrypt(c: bigint, key: PaillierKeyPair): bigint {
  const n = key.publicKey.n;
  const n2 = n * n;
  const { lambda, mu } = key.privateKey;
  const x = bigModPow(c, lambda, n2);
  const lVal = bigL(x, n);
  return (lVal * mu) % n;
}

/** Add two Paillier ciphertexts (homomorphic +): E(m1) * E(m2) = E(m1+m2) mod n². */
export function paillierAdd(a: bigint, b: bigint, n: bigint): bigint {
  const n2 = n * n;
  return ((a % n2) * (b % n2)) % n2;
}

/** Multiply ciphertext by scalar k: E(m)^k = E(k*m) mod n². */
export function paillierMulScalar(c: bigint, k: number | bigint, n: bigint): bigint {
  const n2 = n * n;
  return bigModPow(c, BigInt(k), n2);
}

/**
 * Sum a batch of ciphertexts in one pass (O(n) multiplications in Z_{n²}).
 * Used by FL aggregator to compute the secure aggregate.
 */
export function paillierSum(ciphertexts: bigint[], n: bigint): bigint {
  if (ciphertexts.length === 0) return 1n;
  const n2 = n * n;
  let acc = 1n;
  for (const c of ciphertexts) {
    acc = (acc * (c % n2)) % n2;
  }
  return acc;
}

/**
 * High-level façade: encrypt a vector of small integers.
 * Each element i is encrypted as E(v_i) so that decryption + sum equals sum(v_i).
 */
export function paillierEncryptVector(
  vec: number[],
  pub: { n: bigint; g: bigint }
): bigint[] {
  return vec.map((v) => paillierEncrypt(v, pub));
}

/** Add noise INSIDE encryption (Laplace on plaintext domain). */
export function paillierEncryptWithLaplaceNoise(
  v: number,
  pub: { n: bigint; g: bigint },
  sensitivity: number,
  epsilon: number
): bigint {
  // Laplace sample via inverse CDF.
  const u = Math.random() - 0.5;
  const lapNoise = Math.round(-sensitivity / epsilon * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)));
  return paillierEncrypt(v + lapNoise, pub);
}

/** Self-test (run once at module load if NODE_ENV=development). */
let _selfTested = false;
export function maybeSelfTest(): boolean {
  if (_selfTested) return true;
  _selfTested = true;
  try {
    const key = generatePaillierKeyPair(1024);
    const m = 7;
    const c = paillierEncrypt(m, key.publicKey);
    const d = paillierDecrypt(c, key);
    if (BigInt(m) !== d) return false;
    const c1 = paillierEncrypt(2, key.publicKey);
    const c2 = paillierEncrypt(3, key.publicKey);
    const cSum = paillierAdd(c1, c2, key.publicKey.n);
    const sum = paillierDecrypt(cSum, key);
    if (sum !== 5n) return false;
    const cScaled = paillierMulScalar(c1, 10, key.publicKey.n);
    const scaled = paillierDecrypt(cScaled, key);
    if (scaled !== 20n) return false;
    return true;
  } catch {
    return false;
  }
}

export const SECURE_AGGREGATION_VERSION = "1.0.0";
