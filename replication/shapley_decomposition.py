"""
Shapley Value Decomposition — Coalition Game Theory Analysis
ABIS RCT Replication Package

Determines the unique contribution of each gamification mechanic
(streak, points, robot, badge, leaderboard) to retention improvement.

Usage:
    python shapley_decomposition.py --input data/mechanism_data.csv --output shapley_results.json
"""

import argparse
import json
import random
import numpy as np
from itertools import combinations
from typing import List, Dict, Tuple
import pandas as pd

random.seed(42)
np.random.seed(42)


def shapley_values(
    players: List[str],
    worth_function: callable,
    n_permutations: int = 10000
) -> Dict:
    """
    Compute Shapley values for a coalition game.
    Uses permutation sampling (Monte Carlo approximation).

    Args:
        players: List of player names
        worth_function: Function mapping a coalition (frozenset) to its worth (float)
        n_permutations: Number of random permutations to sample

    Returns:
        Dictionary with shapley values, 95% CI, and % contribution
    """
    n = len(players)
    shapley = {p: 0.0 for p in players}
    shapley_boots = {p: [] for p in players}

    for perm_idx in range(n_permutations):
        perm = list(players)
        random.shuffle(perm)

        for i, player in enumerate(perm):
            # Coalition without this player
            coalition_without = frozenset(perm[:i])
            # Coalition with this player
            coalition_with = frozenset(perm[:i + 1])

            marginal_contribution = worth_function(coalition_with) - worth_function(coalition_without)
            shapley[player] += marginal_contribution / n_permutations

            if perm_idx % 200 == 0:  # Bootstrap for CI
                shapley_boots[player].append(shapley[player] * n_permutations / (perm_idx + 1))

    # Normalize Shapley values (they should sum to total worth of grand coalition)
    total = sum(shapley.values())
    grand_coalition_worth = worth_function(frozenset(players))

    # Proportional normalization
    if total > 0:
        shapley_normalized = {p: v / grand_coalition_worth for p, v in shapley.items()}
    else:
        shapley_normalized = {p: 0 for p in players}

    # 95% bootstrap CI
    ci = {}
    for p in players:
        if len(shapley_boots[p]) > 20:
            sorted_vals = sorted(shapley_boots[p])
            ci[p] = {
                'lower': round(sorted_vals[int(len(sorted_vals) * 0.025)], 4),
                'upper': round(sorted_vals[int(len(sorted_vals) * 0.975)], 4),
            }
        else:
            ci[p] = {'lower': 0, 'upper': 0}

    # Percentage contribution
    total_shapley = sum(abs(v) for v in shapley.values())
    percentage = {p: round(abs(v) / total_shapley * 100, 1) if total_shapley > 0 else 0
                  for p, v in shapley.items()}

    return {
        'shapley_values': {p: round(v, 4) for p, v in shapley.items()},
        'shapley_values_normalized': {p: round(v, 4) for p, v in shapley_normalized.items()},
        'percentage_contribution': percentage,
        'bootstrap_ci': ci,
        'grand_coalition_worth': round(grand_coalition_worth, 4),
        'n_permutations': n_permutations,
        'n_players': n,
        'players': players,
        'sorted_by_contribution': sorted(
            players, key=lambda p: abs(shapley.get(p, 0)), reverse=True
        )
    }


def exact_shapley(players: List[str], worth_function: callable) -> Dict:
    """
    Exact Shapley values — exponential time O(2^n).
    Use only for n <= 6 players.
    """
    n = len(players)

    if n > 6:
        print(f"Warning: Exact Shapley has O(2^{n}) complexity. Using Monte Carlo approximation.")
        return shapley_values(players, worth_function, n_permutations=50000)

    shapley = {p: 0.0 for p in players}

    for coalition_size in range(1, n + 1):
        for coalition in combinations(players, coalition_size):
            coalition_set = frozenset(coalition)
            coalition_worth = worth_function(coalition_set)

            for player in coalition:
                subset = coalition_set - {player}
                subset_worth = worth_function(subset)
                marginal = coalition_worth - subset_worth

                # Weight: (|S|-1)!(n-|S|)!/n!
                weight = (np.math.factorial(coalition_size - 1) *
                          np.math.factorial(n - coalition_size) /
                          np.math.factorial(n))

                shapley[player] += weight * marginal

    total = sum(shapley.values())
    grand_worth = worth_function(frozenset(players))
    percentage = {p: round(abs(v) / grand_worth * 100, 1) if grand_worth != 0 else 0
                  for p, v in shapley.items()}

    return {
        'shapley_values': {p: round(v, 4) for p, v in shapley.items()},
        'percentage_contribution': percentage,
        'grand_coalition_worth': round(grand_worth, 4),
        'method': 'exact',
        'players': players,
        'sorted_by_contribution': sorted(players, key=lambda p: abs(shapley.get(p, 0)), reverse=True)
    }


def create_worth_function(df: pd.DataFrame) -> callable:
    """Create a coalition worth function from mechanism data."""

    def worth(coalition: frozenset) -> float:
        if len(coalition) == 0:
            # Grand coalition baseline: Control group (no mechanisms)
            subset = df[df['streak_active'] == 0]
            subset = subset[subset['points_active'] == 0]
            if len(subset) == 0:
                return 0.30  # Default baseline
            return float(subset['retention_score'].mean())

        # Filter to users who have all mechanisms in the coalition active
        mask = pd.Series([True] * len(df))
        for mech in coalition:
            if mech in df.columns:
                mask &= (df[mech] == 1)

        subset = df[mask]
        if len(subset) == 0:
            return 0.30

        return float(subset['retention_score'].mean())

    return worth


def plot_shapley(results: Dict, output_path: str):
    """Create horizontal bar chart of Shapley values."""
    try:
        import matplotlib.pyplot as plt
        import matplotlib
        matplotlib.use('Agg')
    except ImportError:
        print("matplotlib not installed — skipping plot")
        return

    players = results['sorted_by_contribution']
    values = [abs(results['shapley_values'].get(p, 0)) for p in players]
    percentages = [results['percentage_contribution'].get(p, 0) for p in players]

    colors = ['#27ae60', '#f39c12', '#3498db', '#9b59b6', '#e74c3c']
    labels = {
        'streak': 'Streak System',
        'points': 'Points Feedback',
        'robot': 'Robot HMI',
        'badge': 'Badge/Achievement',
        'leaderboard': 'Leaderboard',
    }

    fig, ax = plt.subplots(figsize=(10, 5))

    bars = ax.barh(
        [labels.get(p, p) for p in players],
        percentages,
        color=colors[:len(players)],
        edgecolor='white',
        linewidth=1.5,
        height=0.6
    )

    for bar, pct in zip(bars, percentages):
        ax.text(
            bar.get_width() + 0.5, bar.get_y() + bar.get_height() / 2,
            f'{pct:.1f}%',
            va='center', ha='left', fontsize=12, fontweight='bold'
        )

    ax.set_xlabel('Contribution to Retention Improvement (%)', fontsize=12)
    ax.set_title('Gamification Mechanism Contribution\n(Shapley Value Decomposition)', fontsize=14, fontweight='bold')
    ax.set_xlim(0, max(percentages) * 1.2 if percentages else 50)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='x', alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f'  Saved: {output_path}')
    plt.close()


def main():
    parser = argparse.ArgumentParser(description='Shapley Value Decomposition')
    parser.add_argument('--input', required=True, help='Path to mechanism_data.csv')
    parser.add_argument('--output', default='shapley_results.json', help='Output JSON path')
    parser.add_argument('--plot', default='figure3_shapley.pdf', help='Plot output path')
    parser.add_argument('--method', default='exact', choices=['exact', 'mc'],
                        help='Exact or Monte Carlo approximation')
    args = parser.parse_args()

    print('\n' + '='*60)
    print('ABIS RCT — Shapley Value Decomposition')
    print('='*60)

    df = pd.read_csv(args.input)
    print(f'\nLoaded: {len(df)} observations')
    print(f'Columns: {list(df.columns)}')

    players = ['streak', 'points', 'robot', 'badge', 'leaderboard']
    worth_fn = create_worth_function(df)

    print(f'\n[1] Coalition Worths:')
    for r in range(len(players) + 1):
        for combo in combinations(players, r):
            w = worth_fn(frozenset(combo))
            combo_str = '∅' if len(combo) == 0 else ', '.join(combo)
            print(f"  {{{combo_str}}}: retention = {w:.3f}")

    print(f'\n[2] Computing Shapley values ({args.method})...')
    if args.method == 'exact':
        results = exact_shapley(players, worth_fn)
    else:
        results = shapley_values(players, worth_fn, n_permutations=10000)

    print(f'\n[3] Results:')
    grand = results['grand_coalition_worth']
    print(f"  Grand coalition worth: {grand:.4f}")
    print(f"  Sorted by contribution:")

    for p in results['sorted_by_contribution']:
        sv = results['shapley_values'].get(p, 0)
        pct = results['percentage_contribution'].get(p, 0)
        ci = results.get('bootstrap_ci', {}).get(p, {})
        ci_str = f"95% CI [{ci.get('lower', '?'):.4f}, {ci.get('upper', '?'):.4f}]" if ci else ""
        print(f"  {p:15s}: Shapley = {sv:+.4f}  ({pct:5.1f}%)  {ci_str}")

    print(f'\n[4] Generating plot...')
    plot_shapley(results, args.plot)

    with open(args.output, 'w') as f:
        json.dump(results, f, indent=2)
    print(f'\nResults saved to: {args.output}')

    print('='*60 + '\n')


if __name__ == '__main__':
    main()
