import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  getDpAccountant,
  resetDpAccountant,
  DEFAULT_ALPHA_GRID,
  type DpState,
  type RenyiDpAccountant,
} from "../services/dpAccountant";

export interface PrivacyDashboardProps {
  endpoint?: string;
  refreshSeconds?: number;
}

interface PrivacyAudit {
  merkleRoot: string;
  rounds: number;
  lastRoundAt: string;
  withinBudget: boolean;
}

interface PrivacyFeed {
  renyiCurve: { alpha: number; epsAlpha: number }[];
  epsilonAtDelta: number;
  deltaAtEpsilon: number;
  withinBudget: boolean;
  recommendedSigma: number | null;
  rounds: number;
  audit: PrivacyAudit;
}

const DEFAULT_FEED: PrivacyFeed = {
  renyiCurve: [],
  epsilonAtDelta: 0,
  deltaAtEpsilon: 0,
  withinBudget: true,
  recommendedSigma: null,
  rounds: 0,
  audit: { merkleRoot: "", rounds: 0, lastRoundAt: "—", withinBudget: true },
};

const MAX_EPSILON = 1.0;
const TARGET_DELTA = 1e-5;

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({
  endpoint = "/api/privacy/state",
  refreshSeconds = 30,
}) => {
  const [feed, setFeed] = useState<PrivacyFeed>(DEFAULT_FEED);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<DpState | null>(null);

  // Local accountant for offline / browser-only demo.
  const local = useMemo<RenyiDpAccountant>(() => getDpAccountant(), []);

  const recordLocal = (sigma = 0.6) => {
    local.setConfig({ clipNorm: 1.0, sigma });
    local.recordRound();
    const state = local.computeState();
    setSnapshot(state);
    setFeed((prev) => ({
      ...prev,
      rounds: state.rounds,
      renyiCurve: state.renyiCurve,
      epsilonAtDelta: state.epsilonAtDelta,
      deltaAtEpsilon: state.deltaAtEpsilon,
      withinBudget: state.withinBudget,
      recommendedSigma: state.recommendedSigma,
    }));
  };

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const r = await fetch(endpoint);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as PrivacyFeed;
        if (!cancelled) setFeed(json);
      } catch {
        if (!cancelled) {
          const state = local.computeState();
          setSnapshot(state);
          setFeed((prev) => ({
            ...prev,
            rounds: state.rounds,
            renyiCurve: state.renyiCurve,
            epsilonAtDelta: state.epsilonAtDelta,
            deltaAtEpsilon: state.deltaAtEpsilon,
            withinBudget: state.withinBudget,
            recommendedSigma: state.recommendedSigma,
          }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOnce();
    const id = setInterval(fetchOnce, refreshSeconds * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [endpoint, refreshSeconds, local]);

  const epsPct = Math.min(100, (feed.epsilonAtDelta / MAX_EPSILON) * 100);

  return (
    <div className="w-full space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Privacy Dashboard — Rényi DP Budget Tracker
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cumulative (ε, δ) across federated rounds. COPPA + GDPR-K compliant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => recordLocal(0.6)}
            className="rounded-full bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700"
          >
            +1 round
          </button>
          <button
            onClick={() => resetDpAccountant()}
            className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            reset
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <BudgetCard
          label={`ε at δ=${TARGET_DELTA.toExponential(0)}`}
          value={feed.epsilonAtDelta.toFixed(4)}
          pct={epsPct}
          accent={feed.withinBudget ? "#0ea5e9" : "#dc2626"}
        />
        <BudgetCard
          label="δ at ε=1.0"
          value={feed.deltaAtEpsilon.toExponential(2)}
          pct={Math.min(100, (feed.deltaAtEpsilon / TARGET_DELTA) * 100)}
          accent={feed.deltaAtEpsilon <= TARGET_DELTA ? "#0ea5e9" : "#dc2626"}
        />
        <BudgetCard
          label="Recommended σ (next round)"
          value={feed.recommendedSigma !== null ? feed.recommendedSigma.toFixed(4) : "—"}
          pct={0}
          accent="#16a34a"
        />
      </div>

      <BudgetBar epsilon={feed.epsilonAtDelta} max={MAX_EPSILON} rounds={feed.rounds} />

      <RenyiCurvePlot curve={feed.renyiCurve} />

      <AuditCard audit={feed.audit} />

      {loading && <p className="text-xs text-slate-400">Loading…</p>}
      {snapshot && (
        <pre className="overflow-x-auto rounded-2xl bg-slate-900 px-3 py-2 text-[10px] text-slate-100">
          {JSON.stringify({ rounds: snapshot.rounds, withinBudget: snapshot.withinBudget, recommendedSigma: snapshot.recommendedSigma }, null, 2)}
        </pre>
      )}
    </div>
  );
};

const BudgetCard: React.FC<{ label: string; value: string; pct: number; accent: string }> = ({
  label,
  value,
  pct,
  accent,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: accent }}>
        {value}
      </p>
      {pct > 0 && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <motion.div
            className="h-full"
            style={{ backgroundColor: accent }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      )}
    </div>
  );
};

const BudgetBar: React.FC<{ epsilon: number; max: number; rounds: number }> = ({ epsilon, max, rounds }) => {
  const pct = Math.min(100, (epsilon / max) * 100);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Privacy budget used ({rounds} rounds)
        </p>
        <p className="font-mono text-xs text-slate-500">
          ε={epsilon.toFixed(4)} / max ε={max}
        </p>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <motion.div
          className="h-full"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ backgroundColor: pct > 90 ? "#dc2626" : pct > 60 ? "#d97706" : "#0ea5e9" }}
        />
      </div>
      <p className="mt-1 text-[10px] text-slate-500">
        α-grid: {DEFAULT_ALPHA_GRID.join(", ")}
      </p>
    </div>
  );
};

const RenyiCurvePlot: React.FC<{ curve: { alpha: number; epsAlpha: number }[] }> = ({ curve }) => {
  if (!curve.length) {
    return <div className="text-xs text-slate-500">Rényi divergence curve will appear after the first round.</div>;
  }
  const max = Math.max(1e-9, ...curve.map((c) => c.epsAlpha));
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        Rényi divergence ε(α) over α ∈ [{curve[0].alpha.toFixed(2)}, {curve[curve.length - 1].alpha.toFixed(1)}]
      </p>
      <svg viewBox="0 0 320 120" className="mt-3 w-full">
        <line x1="0" y1="110" x2="320" y2="110" stroke="#94a3b8" />
        <line x1="0" y1="10" x2="0" y2="110" stroke="#94a3b8" />
        {curve.map((c, i) => {
          const x = (i / Math.max(1, curve.length - 1)) * 320;
          const y = 110 - (c.epsAlpha / max) * 100;
          return <circle key={i} cx={x} cy={y} r="2.5" fill="#0ea5e9" />;
        })}
      </svg>
    </div>
  );
};

const AuditCard: React.FC<{ audit: PrivacyAudit }> = ({ audit }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tamper-evident audit</p>
      <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300 break-all">
        Merkle root: {audit.merkleRoot ? `${audit.merkleRoot.slice(0, 64)}` : "(empty)"}
      </p>
      <p className="mt-1 text-[10px] text-slate-500">
        Last round: {audit.lastRoundAt} · {audit.rounds} rounds · {audit.withinBudget ? "within budget" : "OVER BUDGET"}
      </p>
    </div>
  );
};

export default PrivacyDashboard;