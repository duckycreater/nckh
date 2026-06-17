# ABIS-RCT Replication Package

## Overview

This package contains analysis code, data specifications, and materials for replicating the statistical analyses in the ABIS RCT study.

**Project:** Adaptive Behavioral Intervention System (ABIS)
**Study:** Randomized Controlled Trial — 24-week longitudinal study (n=222)
**Context:** School-based environmental education, HCMC, Vietnam, 2025-2026

## Package Contents

```
replication/
├── README.md                      ← You are here
├── data_specification.md          ← Data schema & variable definitions
├── survival_analysis.py           ← Kaplan-Meier, log-rank, Cox regression
├── statistical_tests.py           ← ANOVA, t-test, Shapiro-Wilk, mixed-effects
├── shapley_decomposition.py      ← Coalition game theory analysis
├── ai_benchmark.py               ← Vision model evaluation
└── figures/
    ├── figure1_consort.pdf       ← CONSORT flowchart (create in PowerPoint)
    ├── figure2_kaplan_meier.pdf  ← Survival curves
    ├── figure3_shapley.pdf       ← Shapley bar chart
    ├── figure4_confusion_matrix.pdf ← AI confusion heatmap
    └── figure5_retention.pdf     ← Retention over time
```

## Quick Start

### 1. Install Dependencies

```bash
pip install jstat numpy scipy matplotlib seaborn pandas scikit-learn
```

### 2. Prepare Data

Format your data as CSV with columns matching `data_specification.md`.

### 3. Run Analysis

```bash
python survival_analysis.py --input data/survival_data.csv --output figures/
python statistical_tests.py --input data/retention_data.csv --output results.json
python shapley_decomposition.py --input data/mechanism_data.csv --output shapley_results.json
```

## Key Analysis Pipeline

### Step 1: Survival Analysis

```python
# Kaplan-Meier estimator
km_estimates = kaplan_meier(survival_data, event_col='churned', time_col='days')
plot_survival_curves(km_estimates, groups=['control','exp_a','exp_b','exp_c'])

# Log-rank test
lr = log_rank_test(group1_data, group2_data)
# Chi-square, p-value, df

# Cox regression
cox = cox_regression(data, time_col='days', event_col='churned', covariates=['group','baseline_kap'])
# HR, 95% CI, concordance index
```

### Step 2: Mixed-Effects Logistic Regression

```python
# Primary analysis for binary retention outcome
# Replaces LOCF (inappropriate for binary data)
mixed = mixed_logistic_regression(
    data=longitudinal_binary_data,
    outcome='retained',
    fixed_effects=['group', 'week', 'baseline_kap'],
    random_effects=['user_id']
)
# OR, 95% CI, p-value for treatment effect
```

### Step 3: Mechanism Decomposition

```python
# Shapley values from coalition game
shapley = shapley_values(
    players=['streak', 'points', 'robot', 'badge', 'leaderboard'],
    worth_function=retention_improvement,
    n_permutations=10000
)
# Print % contribution per mechanism
```

## Data Requirements

| Dataset | Variables | Description |
|---|---|---|
| `survival_data.csv` | user_id, group, days_to_event, churned (0/1) | Time-to-event data for Kaplan-Meier |
| `retention_data.csv` | user_id, week, group, retained (0/1) | Binary retention per week |
| `mechanism_data.csv` | user_id, mechanism_1..5, retention_score | Mechanism contribution data |
| `ai_metrics.csv` | model, TP, TN, FP, FN per category | Vision model benchmark |
| `shapley_results.csv` | mechanism, shapley_value, lower_ci, upper_ci | Shapley decomposition |

## Statistical Standards Applied

| Standard | Method | Notes |
|---|---|---|
| Normality | Shapiro-Wilk (Royston extension, n=3-50) | Use Shapiro-Francia for n>50 |
| Variance equality | Levene's test | Welch's t-test used (robust to violation) |
| Multiple comparisons | Bonferroni correction | α_adj = 0.05 / n_comparisons |
| Missing data | Mixed-effects models (MAR) | LOCF NOT used for binary outcomes |
| Effect size | Cohen's d (t-test), η²p (ANOVA), HR (Cox) | 95% CI for all |
| Survival analysis | Kaplan-Meier + Greenwood SE + log-log CI | Breslow ties |
| Cox regression | Newton-Raphson IRLS | Wald tests for coefficients |
| Shapley values | Permutation sampling (n=10,000) | 95% CI via bootstrap |

## Contact

For questions about replication:
- **Phạm Minh Nhựt** (phamminhnhatv)
- **Nguyễn Minh Đức** (ducnguyenminh0804)
- Mentor: Th.S Trương Hoàng Duy

## Citation

If using this replication package, please cite:

```
Nguyen, P.M.N. & Nguyen, M.D. (2026).
Adaptive Behavioral Intervention in School-Based Environmental Education:
A Multi-Method Investigation of Gamification, AI Personalization, and Human-Robot Interaction.
Science & Engineering Fair Vietnam 2026.
```

## License

Creative Commons Attribution-NonCommercial-ShareAlike 4.0 (CC BY-NC-SA 4.0)
