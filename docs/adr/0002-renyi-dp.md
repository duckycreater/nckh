# ADR 0002 — Rényi differential privacy for federated training

- **Status:** Accepted (2026-02)
- **Deciders:** BMO engineering, ISEF advisor
- **Context drivers:** GDPR-style consent forbids uploading any raw
  image, but we still want to learn from user corrections ("I sorted
  this as plastic but it's actually paper"). Federated learning allows
  training on-device, but gradient updates can leak information about
  individual training examples.

## Context

Naïve FedAvg ships weight deltas back to the server. Even a single
gradient step at a single example can be partially inverted: prior
work on "Deep Leakage from Gradients" (Zhu et al., 2019) demonstrates
that a few hundred parameter values plus their signs are enough to
reconstruct an image. With ~50K users, even a small leak is unacceptable.

Rényi Differential Privacy (RDP) composes well across FL rounds and
admits a clean (ε, δ)-DP conversion at the end of training
(Mironov 2017). We considered three flavours:

1. **User-level DP with Gaussian noise on the aggregated deltas.**
   Standard FedAvg + DP-SGD style; we ship the deltas after Gaussian
   noise is added with σ calibrated to (ε, δ).
2. **RDP composition with Rényi-divergence-based Gaussian mechanism.**
   Tightest composition; standard for FL with heterogeneous σ per
   client (Mironov–Talwar–Zhang 2019).
3. **Central-DP at the aggregator.** Easier to reason about but
   requires the aggregator to be trusted. We assume the aggregator is
   operated by us, but we want defense in depth.

## Decision

Adopt **option 2 (RDP composition with per-client σ)**:

- Each client adds noise with σ proportional to the L2-sensitivity of
  the clipped update (clipNorm = 1.0 by default).
- The server composes Rényi divergences across an α-grid
  `{1.5, 2, 4, 8, 16, 32, 64, 128}` to get the tightest (ε, δ).
- We advertise ε ≤ 1.0, δ ≤ 1e-5 to users via the Privacy Budget Meter.
- Implementation: `server/services/dpAccountant.ts` (and the
  client-side mirror in `src/services/dpAccountant.ts`).

## Consequences

- **Good:** Tight composition gives 30-50 % looser (ε, δ) than naïve
  advanced-composition accounting for the same noise level.
- **Good:** Per-client σ means a single poorly-trained client doesn't
  blow the budget for everyone else.
- **Bad:** RDP composition requires the α-grid to be specified up
  front; we made it configurable but the default grid is hard-coded.
- **Bad:** Numerical noise in the RDP-to-DP conversion needs care; we
  test this in `tests/services/dpAccountant.spec.ts`.

## Validation

- The Privacy Budget Meter (`src/components/PrivacyBudgetMeter.tsx`)
  reads from the in-browser RDP accountant and surfaces the running
  (ε, δ) after each FL round.
- Federated training is opt-in and disabled by default.
- `server/services/rctEngine.ts` (see ADR-0004) relies on the same
  (ε, δ) budget for hypothesis-test power calculations.

## Alternatives considered

- **Local DP (Laplace at the client).** Rejected: too noisy for our
  small model (40 KB of weights).
- **Secure aggregation without DP.** Rejected: does not defend against
  a compromised aggregator; see ADR-0003.