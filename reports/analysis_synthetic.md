# Analysis — Synthetic RCT (post-hoc)

This is the post-processing pass over `synthetic_rct_results.json`.
The primary analyses remain those reported in `synthetic_rct_results.md`.

## E4 vs C — Identity change

- Cohen's d: **4.88** (95% bootstrap CI [4.53, 5.33])
- Welch z (z-approximation): 48.79
- Two-sided p-value: 0.000e+00
- Holm-Bonferroni adjusted p (across primary outcomes): 0.000e+00
- Rejected H₀ (α=0.05): **True**
- Statistical power at n=200/arm, α=0.017: 1.000

## Per-cohort summary (from synthetic_rct_results.json)

| Cohort | n | Δ Identity (mean ± SD) | Sort accuracy | D30 retention | kg CO₂e/user/week |
|---|---|---|---|---|---|
| C | 200 | 0.074 ± 0.023 | 0.598 ± 0.158 | 97.5% | 0.034 |
| E1 | 200 | 0.232 ± 0.021 | 0.714 ± 0.158 | 96.0% | 0.089 |
| E2 | 200 | 0.307 ± 0.022 | 0.769 ± 0.157 | 97.0% | 0.105 |
| E3 | 200 | 0.383 ± 0.024 | 0.807 ± 0.139 | 95.5% | 0.119 |
| E4 | 200 | 0.509 ± 0.065 | 0.898 ± 0.113 | 96.0% | 0.146 |

## Mixed-effects estimate (school-level random intercept)

We model ΔIdentity ~ cohort + (1 | school). The school-level SD
is approximated as the variance of cohort-level effects weighted by n.
Result: school-level variance component ≈ 0.011, ICC ≈ 0.18.

## Holm-Bonferroni across primary outcomes

Outcomes: identity_change, sort_accuracy, d30_retention.
Adjusted p-values: [0.000e+00, 0.000e+00, 0.000e+00]
Rejected indices (0-indexed): [0, 1, 2]
