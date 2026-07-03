# Synthetic RCT Results — BMO Robot

**Seed:** 42
**Population:** 1000 simulated students
**Duration:** 12 weeks

## Cohort-level outcomes

| Cohort | n | Δ Identity (mean ± SD) | Sort accuracy | D30 retention | kg CO₂e/user/week |
|---|---|---|---|---|---|
| C | 200 | 0.074 ± 0.023 | 0.598 ± 0.158 | 97.5% | 0.034 |
| E1 | 200 | 0.232 ± 0.021 | 0.714 ± 0.158 | 96.0% | 0.089 |
| E2 | 200 | 0.307 ± 0.022 | 0.769 ± 0.157 | 97.0% | 0.105 |
| E3 | 200 | 0.383 ± 0.024 | 0.807 ± 0.139 | 95.5% | 0.119 |
| E4 | 200 | 0.509 ± 0.065 | 0.898 ± 0.113 | 96.0% | 0.146 |

## Primary tests (E4 vs C)

| Outcome | Cohen's d | Welch t |
|---|---|---|
| Identity change | 8.92 | 89.20 |
| Sort accuracy | 2.19 | 21.90 |
| D30 retention | 0.00 | — |

## Interpretation

- The full-stack E4 cohort (gamification + federated learning + smart-bin twin + identity-prime)
  shows large effect sizes against the control (d ≥ 0.4 pre-registration target).
- Novelty-decay is calibrated by `novelty_decay = 0.96**week`; controls decay faster.
- This synthetic pilot is a sanity check, not a substitute for real-pilot data.
- See docs/research/PRE_REGISTRATION.md for the locked analysis plan.
