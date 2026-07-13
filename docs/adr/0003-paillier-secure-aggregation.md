# ADR 0003 — Paillier homomorphic encryption for secure aggregation

- **Status:** Accepted (2026-03)
- **Deciders:** BMO engineering
- **Context drivers:** Even with RDP (ADR-0002), the aggregator still
  sees the noisy gradient per client. We want to ensure the *aggregator*
  never sees the un-noised update — defense in depth against a
  compromised or subpoenaed server.

## Context

Secure aggregation lets the server learn only the *sum* of all client
updates, not any individual one. Two practical schemes:

1. **Mask-based secure aggregation (Bonawitz et al., 2017).** Each pair
   of clients agrees on a shared mask via pairwise Diffie-Hellman; the
   server sees the masked sum. No heavy crypto, but requires an extra
   round of communication.
2. **Paillier homomorphic encryption.** Each client encrypts under the
   *aggregator's* public key; the server sums ciphertexts and decrypts
   only the aggregate. Heavy (compute + bandwidth), but one round.

For a class of 50-200 students per school, the latency budget allows
Paillier (the model is small enough that 4 KB of ciphertext is
manageable on a school LAN).

## Decision

Adopt **Paillier** with a 1024-bit modulus for threat-model uses where
the aggregator is untrusted (e.g. the cross-school FL server). For our
default in-school aggregator, we additionally adopt the mask-based
scheme so the per-client (ε, δ) budget is preserved without doubling
the noise requirement. Both are implemented in
`server/services/secureAggregation.ts`.

- 1024-bit Paillier (λ/μ keygen) — adequate for ≥ 1e-6 decryption
  failure under 2^80 brute force.
- Per-client σ in addition to Paillier aggregation, because Paillier
  only hides the *plaintext*, not whether a given weight was clipped.
- Self-test runs at boot via `maybeSelfTest()` so we catch keygen bugs
  before serving traffic.

## Consequences

- **Good:** Even a fully-malicious aggregator sees only the sum +
  noise, so it cannot reconstruct any single example.
- **Good:** Homomorphic aggregation lets us fold (Paillier +
  Gaussian) before decryption, halving the noise budget at the cost of
  marginal compute.
- **Bad:** 1024-bit Paillier adds ~150 ms to round time on a low-end
  phone. Acceptable for a non-realtime FL round.
- **Bad:** Adding/removing members mid-round requires a re-key. We
  run FL in rounds of fixed size.

## Alternatives considered

- **BGV / BFV fully homomorphic encryption.** Rejected: latency on the
  order of seconds; not needed for a single sum.
- **Trusted execution environment (Intel SGX).** Rejected: requires
  server-side hardware we cannot guarantee in a school setting.