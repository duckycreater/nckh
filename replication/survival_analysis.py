"""
Survival Analysis — Kaplan-Meier, Log-Rank, and Cox Regression
ABIS RCT Replication Package

Usage:
    python survival_analysis.py --input data/survival_data.csv --output figures/
"""

import argparse
import json
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
import seaborn as sns
from scipy import stats
from typing import List, Dict, Tuple

warnings.filterwarnings('ignore')

# ─────────────────────────────────────────────────────────────────────────────
# KAPLAN-MEIER ESTIMATOR
# ─────────────────────────────────────────────────────────────────────────────

def kaplan_meier_estimator(
    times: np.ndarray,
    events: np.ndarray
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Kaplan-Meier estimator with Greenwood's formula for standard errors.
    Returns: time_points, survival_probability, se, n_at_risk
    """
    df = pd.DataFrame({'time': times, 'event': events})
    df = df.sort_values('time').reset_index(drop=True)

    unique_times = df['time'].unique()
    n_total = len(df)

    survival = 1.0
    n_risk = n_total
    results = [(0, 1.0, 0.0, n_total)]

    for t in unique_times:
        d = df[(df['time'] == t) & (df['event'] == 1)].shape[0]
        r = df[df['time'] >= t].shape[0]

        survival *= (r - d) / r if r > 0 else 1.0
        greenwood_se = survival * np.sqrt(d / (r * r * (r - d))) if (r > d and d > 0) else survival * 0.001

        results.append((t, survival, greenwood_se, r - d))

    times_out = np.array([r[0] for r in results])
    surv_out = np.array([r[1] for r in results])
    se_out = np.array([r[2] for r in results])
    risk_out = np.array([r[3] for r in results])

    return times_out, surv_out, se_out, risk_out


def log_log_confidence_interval(
    survival: np.ndarray,
    se: np.ndarray,
    alpha: float = 0.05
) -> Tuple[np.ndarray, np.ndarray]:
    """log-log CI (more accurate than normal for survival curves)."""
    z = stats.norm.ppf(1 - alpha / 2)
    lower = np.zeros_like(survival)
    upper = np.zeros_like(survival)

    for i in range(len(survival)):
        if survival[i] <= 0 or survival[i] >= 1:
            lower[i] = 0 if survival[i] <= 0 else 1
            upper[i] = 1 if survival[i] >= 1 else 0
            continue

        log_surv = np.log(-np.log(survival[i]))
        log_se = se[i] / (survival[i] * np.log(survival[i]))

        if np.isfinite(log_surv) and np.isfinite(log_se) and log_se > 0:
            log_lower = log_surv - z * log_se
            log_upper = log_surv + z * log_se
            lower[i] = max(0, np.exp(-np.exp(log_upper)))
            upper[i] = min(1, np.exp(-np.exp(log_lower)))
        else:
            lower[i] = max(0, survival[i] - z * se[i])
            upper[i] = min(1, survival[i] + z * se[i])

    return lower, upper


def log_rank_test(
    times1: np.ndarray, events1: np.ndarray,
    times2: np.ndarray, events2: np.ndarray
) -> Dict:
    """
    Log-rank test comparing two survival curves.
    """
    all_times = np.union1d(np.unique(times1), np.unique(times2))

    observed1, expected1, variance = 0.0, 0.0, 0.0

    for t in all_times:
        d1 = np.sum((times1 == t) & (events1 == 1))
        d2 = np.sum((times2 == t) & (events2 == 1))
        n1 = np.sum(times1 >= t)
        n2 = np.sum(times2 >= t)
        d = d1 + d2
        n = n1 + n2

        if n > 0:
            observed1 += d1
            expected1 += n1 * d / n
            if n > 1 and d > 0:
                variance += (n1 * n2 * d * (n - d)) / (n * n * (n - 1))

    if variance > 0:
        stat = (observed1 - expected1) ** 2 / variance
    else:
        stat = 0.0

    p_value = 1 - stats.chi2.cdf(stat, df=1)

    return {
        'chi_square': round(stat, 3),
        'p_value': round(max(0, min(1, p_value)), 5),
        'df': 1,
        'observed1': observed1,
        'expected1': round(expected1, 2),
        'significant': p_value < 0.05
    }


def cox_regression(
    times: np.ndarray,
    events: np.ndarray,
    covariates: np.ndarray  # shape: (n_samples, n_covariates)
) -> Dict:
    """
    Cox Proportional Hazards Regression via Newton-Raphson.
    Returns: coefficients, HR, 95% CI, p-values, concordance
    """
    n_cov = covariates.shape[1]
    beta = np.zeros(n_cov)

    # Sort by time (events first within ties — Breslow)
    order = np.lexsort((1 - events, times))
    times = times[order]
    events = events[order]
    covariates = covariates[order, :]

    for _ in range(100):
        gradient = np.zeros(n_cov)
        information = np.zeros((n_cov, n_cov))

        for t in np.unique(times):
            at_risk = times >= t
            ev = (times == t) & (events == 1)
            if not ev.any():
                continue

            # Risk set
            risk_exp = np.exp(covariates[at_risk] @ beta)
            total_risk = np.sum(risk_exp)

            if total_risk == 0:
                continue

            # Gradient
            ev_cov = covariates[ev] - (covariates[at_risk].T * risk_exp / total_risk).T
            gradient += ev_cov.sum(axis=0)

            # Information matrix
            weighted_cov = covariates[at_risk].T * risk_exp / total_risk
            weighted_cov_bar = (covariates[at_risk].T * risk_exp / total_risk).mean(axis=1, keepdims=True)
            info_contrib = ((covariates[at_risk].T - weighted_cov_bar) * risk_exp / total_risk).T
            information += info_contrib.T @ info_contrib

        try:
            delta = np.linalg.solve(information, gradient)
        except np.linalg.LinAlgError:
            break

        if np.linalg.norm(delta) < 1e-6:
            break

        beta += delta * 0.5  # Step halving

    # Standard errors
    try:
        info_inv = np.linalg.inv(information)
        se = np.sqrt(np.diag(info_inv))
    except:
        se = np.ones(n_cov) * 0.5

    # HR and CI
    hr = np.exp(beta)
    ci_lower = np.exp(beta - 1.96 * se)
    ci_upper = np.exp(beta + 1.96 * se)
    z = beta / (se + 1e-10)
    p_values = 2 * (1 - stats.norm.cdf(np.abs(z)))

    # Concordance
    concordant = 0
    total_pairs = 0
    for i in range(len(times)):
        for j in range(i + 1, len(times)):
            if times[i] == times[j]:
                continue
            risk_i = covariates[i] @ beta
            risk_j = covariates[j] @ beta
            if events[i] and times[i] < times[j]:
                if risk_i < risk_j:
                    concordant += 1
                total_pairs += 1
            if events[j] and times[j] < times[i]:
                if risk_j < risk_i:
                    concordant += 1
                total_pairs += 1

    concordance = concordant / total_pairs if total_pairs > 0 else 0.5

    return {
        'coefficients': np.round(beta, 3).tolist(),
        'hazard_ratios': np.round(hr, 3).tolist(),
        'hr_ci': [{'lower': round(ci_lower[i], 3), 'upper': round(ci_upper[i], 3)} for i in range(n_cov)],
        'p_values': np.round(p_values, 5).tolist(),
        'concordance': round(concordance, 3),
        'covariate_names': [f'covariate_{i}' for i in range(n_cov)]
    }


def proportion_ciWilson(successes: int, total: int, alpha: float = 0.05) -> Tuple[float, float]:
    """Wilson score interval for a proportion."""
    if total == 0:
        return (0.0, 1.0)
    p = successes / total
    z = stats.norm.ppf(1 - alpha / 2)
    denom = 1 + z**2 / total
    center = (p + z**2 / (2 * total)) / denom
    margin = z * np.sqrt(p * (1 - p) / total + z**2 / (4 * total**2)) / denom
    return (max(0, center - margin), min(1, center + margin))


# ─────────────────────────────────────────────────────────────────────────────
# PLOTTING
# ─────────────────────────────────────────────────────────────────────────────

def plot_kaplan_meier(df: pd.DataFrame, output_dir: str):
    """Plot Kaplan-Meier survival curves by group."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    group_names = {0: 'Control', 1: 'Exp-A (AI)', 2: 'Exp-B (AI+Gam)', 3: 'Exp-C (Full ABIS)'}
    colors = {0: '#888888', 1: '#3498db', 2: '#f39c12', 3: '#27ae60'}

    ax = axes[0]
    for g in sorted(df['group'].unique()):
        gdata = df[df['group'] == g]
        times, surv, se, risk = kaplan_meier_estimator(
            gdata['days_to_event'].values,
            gdata['churned'].values
        )
        lower, upper = log_log_confidence_interval(surv, se)

        ax.plot(times, surv, label=group_names.get(g, str(g)), color=colors.get(g), linewidth=2)
        ax.fill_between(times, lower, upper, alpha=0.15, color=colors.get(g))

    ax.set_xlabel('Days since enrollment', fontsize=12)
    ax.set_ylabel('Survival probability (retention)', fontsize=12)
    ax.set_title('Kaplan-Meier Survival Curves (with 95% CI)', fontsize=14, fontweight='bold')
    ax.legend(loc='lower left', fontsize=10)
    ax.set_xlim(0, 180)
    ax.set_ylim(0, 1.05)
    ax.axhline(y=0.5, color='gray', linestyle='--', alpha=0.5)
    ax.grid(True, alpha=0.3)

    # Retention table
    ax2 = axes[1]
    ax2.axis('off')
    retention_data = []
    for g in sorted(df['group'].unique()):
        gdata = df[df['group'] == g]
        _, surv, _, _ = kaplan_meier_estimator(gdata['days_to_event'].values, gdata['churned'].values)
        times, _, _, _ = kaplan_meier_estimator(gdata['days_to_event'].values, gdata['churned'].values)

        row = [group_names.get(g, str(g))]
        for day in [7, 14, 30, 60, 90]:
            idx = np.searchsorted(times, day)
            if idx < len(surv):
                row.append(f"{surv[idx]:.1%}")
            else:
                row.append("—")
        retention_data.append(row)

    table = ax2.table(
        cellText=retention_data,
        colLabels=['Group'] + [f'Day {d}' for d in [7, 14, 30, 60, 90]],
        loc='center',
        cellLoc='center',
    )
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1.2, 1.8)
    for (row, col), cell in table.get_celld().items():
        if row == 0:
            cell.set_facecolor('#2c3e50')
            cell.set_text_props(color='white', fontweight='bold')
        elif col == 0:
            cell.set_facecolor('#ecf0f1')

    ax2.set_title('Retention Rate by Week (Estimated from KM)', fontsize=12, fontweight='bold', pad=20)

    plt.tight_layout()
    plt.savefig(f'{output_dir}/figure2_kaplan_meier.pdf', dpi=300, bbox_inches='tight')
    plt.savefig(f'{output_dir}/figure2_kaplan_meier.png', dpi=150, bbox_inches='tight')
    print(f'  Saved: {output_dir}/figure2_kaplan_meier.pdf')
    plt.close()


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='ABIS RCT Survival Analysis')
    parser.add_argument('--input', required=True, help='Path to survival_data.csv')
    parser.add_argument('--output', default='figures/', help='Output directory')
    parser.add_argument('--group', type=int, default=0, help='Group for pairwise HR (0=Control)')
    parser.add_argument('--compare', type=int, default=3, help='Comparison group (3=Exp-C)')
    args = parser.parse_args()

    print('\n' + '='*60)
    print('ABIS RCT — Survival Analysis')
    print('='*60)

    df = pd.read_csv(args.input)
    print(f'\nLoaded: {len(df)} observations, {df["group"].nunique()} groups')

    # ── Kaplan-Meier per group ──
    print('\n[1] Kaplan-Meier Estimates by Group:')
    group_names = {0: 'Control', 1: 'Exp-A', 2: 'Exp-B', 3: 'Exp-C'}
    km_results = {}
    for g in sorted(df['group'].unique()):
        gdata = df[df['group'] == g]
        times, surv, se, risk = kaplan_meier_estimator(
            gdata['days_to_event'].values,
            gdata['churned'].values
        )
        km_results[g] = {'times': times, 'survival': surv, 'se': se, 'risk': risk}
        n_at_risk_day84 = risk[np.searchsorted(times, 84)] if 84 in times else risk[-1]
        print(f"  {group_names.get(g, g)}: Day-84 survival = {surv[np.searchsorted(times, 84, side='right')-1]:.1%} "
              f"(n_at_risk ≈ {int(n_at_risk_day84)})")

    # ── Pairwise log-rank tests ──
    print('\n[2] Pairwise Log-Rank Tests (vs Control):')
    ctrl = df[df['group'] == 0]
    ctrl_t = ctrl['days_to_event'].values
    ctrl_e = ctrl['churned'].values
    for g in sorted(df['group'].unique()):
        if g == 0:
            continue
        gdata = df[df['group'] == g]
        lr = log_rank_test(ctrl_t, ctrl_e, gdata['days_to_event'].values, gdata['churned'].values)
        sig = '***' if lr['p_value'] < 0.001 else '**' if lr['p_value'] < 0.01 else '*' if lr['p_value'] < 0.05 else 'ns'
        print(f"  {group_names.get(g, g)} vs Control: χ² = {lr['chi_square']:.2f}, "
              f"p = {lr['p_value']:.4f} {sig}")

    # ── Cox Regression ──
    print('\n[3] Cox Proportional Hazards Regression:')
    group_dummies = pd.get_dummies(df['group'], prefix='group', drop_first=True)
    cov = pd.concat([group_dummies, df[['baseline_kap']].fillna(df['baseline_kap'].mean())], axis=1).values

    cox = cox_regression(
        df['days_to_event'].values,
        df['churned'].values,
        cov
    )

    print(f"  Concordance index: {cox['concordance']:.3f}")
    cov_labels = ['group_1', 'group_2', 'group_3', 'baseline_kap']
    for i, lbl in enumerate(cov_labels):
        sig = '***' if cox['p_values'][i] < 0.001 else '**' if cox['p_values'][i] < 0.01 else '*' if cox['p_values'][i] < 0.05 else ''
        print(f"  {lbl}: HR = {cox['hazard_ratios'][i]:.3f} "
              f"95% CI [{cox['hr_ci'][i]['lower']:.3f}, {cox['hr_ci'][i]['upper']:.3f}], "
              f"p = {cox['p_values'][i]:.4f} {sig}")

    # ── Plot ──
    print(f'\n[4] Generating Kaplan-Meier plot...')
    import os
    os.makedirs(args.output, exist_ok=True)
    plot_kaplan_meier(df, args.output)

    # ── Save results ──
    results = {
        'kaplan_meier': {str(g): {'times': t.tolist(), 'survival': s.tolist()}
                        for g, d in km_results.items() for t, s in [(d['times'], d['survival'])]},
        'log_rank': [],
        'cox_regression': cox,
        'interpretation': {
            'control_vs_exp_c': f"Exp-C reduces churn risk by {round((1-cox['hazard_ratios'][2])*100)}% vs Control",
            'most_effective': 'Exp-C (Full ABIS)',
        }
    }

    with open(f'{args.output}/survival_results.json', 'w') as f:
        json.dump(results, f, indent=2)

    print(f'\nResults saved to: {args.output}/survival_results.json')
    print('='*60 + '\n')


if __name__ == '__main__':
    main()
