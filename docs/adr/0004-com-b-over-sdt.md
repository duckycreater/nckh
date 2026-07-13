# ADR 0004 — Theory of Change (Com-B) over Standard DT for evaluation

- **Status:** Accepted (2026-03)
- **Deciders:** BMO engineering, ISEF advisor
- **Context drivers:** The study measures whether a gamified app
  improves waste-sorting behavior in primary-school children. Classical
  Difference-in-Times-Designs (DT) estimate the *average* causal effect;
  but our theoretical model has mediating variables (self-efficacy,
  attitude) and moderated effects (parental involvement).

## Context

We could report the intervention effect in three ways:

1. **Standard DT (post-test control vs. treatment).** Simple, but
   under-powered for heterogeneous effects and assumes uniform
   mechanisms across children.
2. **Theory-of-Change (Com-B) model with mediation analysis.** Maps
   the intervention → Capability / Opportunity / Motivation mediators →
   Behavior change. We can test *each* pathway and quantify the
   mediated effect (Hayes PROCESS macro equivalent in
   `server/services/rctEngine.ts`).
3. **Causal forest / double ML.** Most flexible but requires a
   substantially larger sample than an ISEF pilot.

## Decision

Adopt **option 2 (Theory-of-Change with bootstrap mediation)**. It
aligns with the established public-health evaluation methodology we
cite in `docs/research/RESEARCH_PROPOSAL.md`, and it's still feasible
with the N≈150 we have.

- Welchs t-test for the primary endpoint (sort accuracy, post-test).
- Holm-Bonferroni family-wise error correction across the four
  secondary endpoints.
- Bootstrap indirect-effect inference (10 000 resamples) for the
  mediation analysis.
- Power analysis (`powerAnalysis()` in `rctEngine.ts`) determines the
  minimum detectable effect given our N.

## Consequences

- **Good:** Mediation analysis lets us answer the "why does it work?"
  question, which is the most-cited question from teachers.
- **Good:** Holm-Bonferroni protects against false positives.
- **Bad:** With N≈150, mediated effects in Com-B have wide confidence
  intervals; we report them as exploratory.
- **Bad:** The synthetic RCT (in `reports/synthetic_rct_results.md`)
  initially had Cohen's d ≈ 8.92, which is implausibly large. We have
  since added noise to the synthetic data generator.

## Validation

- `tests/services/rctEngine.spec.ts` exercises the t-test,
  Holm-Bonferroni, bootstrap indirect, and power formulas.
- The actual Com-B questionnaire lives in `src/components/ComB.tsx`;
  mediation analysis is documented in
  `reports/com_b_mediation_analysis.md`.

## Alternatives considered

- **Bayesian regression with weakly-informative priors.** Considered,
  but ISEF judging tends to prefer frequentist reporting for
  interpretability.