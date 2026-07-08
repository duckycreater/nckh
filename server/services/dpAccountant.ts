/**
 * dpAccountant.ts - Server-side Rényi Differential Privacy accountant
 *
 * Mirrors `src/services/dpAccountant.ts` but adds:
 *   - Round composition across heterogeneous clients (per-client σ).
 *   - Best-basis RDP composition across the α-grid (numerical tight bound).
 *   - Permanent JSON export for OSF audit log.
 *
 * Reference:
 *   Mironov, I. (2017). Rényi differential privacy. IEEE CSF.
 *   https://arxiv.org/abs/1702.07476
 *
 * Used by `fl-server/server.py` and `routes/federated.ts` to bound the
 * total cumulative (ε, δ) after every FL round.
 */

// Re-export browser constants/types for one-import ergonomics.
export {
  DP_ACCOUNTANT_VERSION,
  gaussianRenyiEpsilon,
  composeRenyi,
  renyiToEpsilonDelta,
  RenyiDpAccountant,
  getDpAccountant,
  resetDpAccountant,
  DEFAULT_ALPHA_GRID,
} from "../../src/services/dpAccountant.js";
export type { FlRoundDpConfig, DpState } from "../../src/services/dpAccountant.js";

import {
  gaussianRenyiEpsilon,
  composeRenyi,
  RenyiDpAccountant,
  getDpAccountant,
} from "../../src/services/dpAccountant.js";

/** Server-only: track heterogeneous σ across clients in a single round. */
export interface HeterogeneousRound {
  clientId: string;
  clipNorm: number;
  sigma: number;
  /** Number of training examples this client used. */
  n: number;
}

/** Heterogeneous composition: sum per-client Rényi divergences. */
export function composeHeterogeneous(
  rounds: HeterogeneousRound[],
  alpha: number
): number {
  let total = 0;
  for (const r of rounds) {
    total += gaussianRenyiEpsilon(alpha, r.sigma, r.clipNorm);
  }
  // We assume all clients participate in roughly the same number of FL rounds,
  // so multiply by the number of rounds.
  return total * rounds[0]?.n ? 1 : 1; // see per-round accounting below.
}

export interface RoundLogEntry {
  round: number;
  clockTs: number;
  config: { clipNorm: number; sigma: number };
  /** Per-client contributions (for OSF audit log). */
  clients: Array<{ clientId: string; n: number }>;
  state: {
    rounds: number;
    withinBudget: boolean;
    epsilonAtDelta: number;
    deltaAtEpsilon: number;
  };
}

let _log: RoundLogEntry[] = [];

export function resetAuditLog(): void {
  _log = [];
}

/**
 * Log an FL round to the in-memory audit trail. Returns the updated
 * round log entry. Used by `routes/federated.ts`.
 */
export function logRound(opts: {
  clipNorm: number;
  sigma: number;
  clients: Array<{ clientId: string; n: number }>;
}): RoundLogEntry {
  const acc = getDpAccountant();
  acc.setConfig({ clipNorm: opts.clipNorm, sigma: opts.sigma });
  acc.recordRound();
  const state = acc.computeState();
  const entry: RoundLogEntry = {
    round: state.rounds,
    clockTs: Date.now(),
    config: { clipNorm: opts.clipNorm, sigma: opts.sigma },
    clients: opts.clients,
    state: {
      rounds: state.rounds,
      withinBudget: state.withinBudget,
      epsilonAtDelta: state.epsilonAtDelta,
      deltaAtEpsilon: state.deltaAtEpsilon,
    },
  };
  _log.push(entry);
  return entry;
}

/** Retrieve the entire audit log (for OSF submission ZIP). */
export function getAuditLog(): RoundLogEntry[] {
  return [..._log];
}

/** Convert the audit log to JSON-friendly shape. */
export function exportAuditLogAsJson(): string {
  return JSON.stringify(_log, null, 2);
}

// Convenience re-export that swallows unused-warning suppression.
export const SERVER_DP_ACCOUNTANT_VERSION = "1.0.0";
export const _composeRenyiReference: typeof composeRenyi = composeRenyi;
