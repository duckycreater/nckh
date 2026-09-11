import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  getSyntheticPopulation,
  summarisePopulation,
  type CohortId,
} from "../services/syntheticPopulation";
import { holmBonferroni, bonferroni } from "../lib/multipleTesting";
import { getAuthHeaders } from "../lib/auth";

export interface ResearchDashboardProps {
  endpoint?: string;
  refreshSeconds?: number;
  user?: unknown;
}

interface RctRow {
  cohort: CohortId;
  n: number;
  identityChange: number;
  identityChangeSD: number;
  sortAccuracy: number;
  sortAccuracySD: number;
  d30Retention: number;
  kgCo2ePerUserWeek: number;
  cohensD?: number;
}

interface RctSummary {
  provenance?: "live" | "synthetic" | "unknown";
  generatedAt?: string;
  rows: RctRow[];
  primaryTests?: {
    cohensD: number;
    pValue: number;
    df: number;
    t: number;
    meanDiff: number;
  }[];
  audit?: { merkleRoot: string; rounds: number };
}

export const ResearchDashboard: React.FC<ResearchDashboardProps> = ({
  endpoint = "/api/research/summary",
  refreshSeconds = 60,
}) => {
  const { t } = useTranslation();
  const COHORT_LABELS: Record<CohortId, string> = {
    C: t("research.cohorts.C"),
    E1: t("research.cohorts.E1"),
    E2: t("research.cohorts.E2"),
    E3: t("research.cohorts.E3"),
    E4: t("research.cohorts.E4"),
  };
  const [summary, setSummary] = useState<RctSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [nUsers, setNUsers] = useState(1000);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syntheticPreview, setSyntheticPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const r = await fetch(endpoint, { headers: getAuthHeaders() });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = validateSummary((await r.json()) as RctSummary);
        if (!cancelled) {
          setSummary(json);
          setSyntheticPreview(false);
          setLoadError(null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSummary((current) => (current?.provenance === "synthetic" ? current : null));
          setLoadError(
            "Chưa có dữ liệu RCT thật từ máy chủ. Không có kết quả mô phỏng nào được hiển thị mặc định.",
          );
          setLoading(false);
        }
      }
    };
    fetchOnce();
    const id = setInterval(fetchOnce, refreshSeconds * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [endpoint, refreshSeconds]);

  useEffect(() => {
    if (syntheticPreview) setSummary(deriveFromSynthetic(nUsers));
  }, [nUsers, syntheticPreview]);

  const correctedP = useMemo(() => {
    if (!summary?.primaryTests) return null;
    const pvalues = summary.primaryTests.map((p) => p.pValue);
    return { holm: holmBonferroni(pvalues), bonf: bonferroni(pvalues) };
  }, [summary]);

  return (
    <div className="w-full space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Research Dashboard — RCT analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kết quả cohort thật chỉ xuất hiện khi API nghiên cứu đã được cấu hình và xác thực.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${summary?.provenance === "live" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}
        >
          {summary?.provenance === "live"
            ? "LIVE DATA"
            : summary?.provenance === "synthetic"
              ? "SYNTHETIC PREVIEW"
              : "NO LIVE DATA"}
        </span>
        {summary?.provenance === "synthetic" && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="research-user-count"
              className="text-xs text-slate-500 dark:text-slate-400"
            >
              N mô phỏng
            </label>
            <input
              id="research-user-count"
              type="range"
              min={100}
              max={2000}
              step={100}
              value={nUsers}
              onChange={(e) => setNUsers(Number(e.target.value))}
              className="accent-cyan-600"
            />
            <span className="text-xs font-mono">{nUsers}</span>
          </div>
        )}
      </header>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {loadError && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => {
              setSyntheticPreview((enabled) => !enabled);
              setSummary(syntheticPreview ? null : deriveFromSynthetic(nUsers));
            }}
            className="shrink-0 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-100"
          >
            {syntheticPreview ? "Tắt mô phỏng" : "Mở mô phỏng minh họa"}
          </button>
        </div>
      )}

      {summary && <CohortTable rows={summary.rows} labels={COHORT_LABELS} />}

      {summary?.provenance === "live" && summary.primaryTests && (
        <PrimaryTestsCard tests={summary.primaryTests} corrected={correctedP} />
      )}

      {summary?.provenance === "live" && summary.audit && <AuditCard audit={summary.audit} />}
    </div>
  );
};

// ─── Cohort table ───────────────────────────────────────────────────────

const CohortTable: React.FC<{ rows: RctRow[]; labels: Record<CohortId, string> }> = ({
  rows,
  labels,
}) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full text-xs">
        <thead className="text-left text-[10px] uppercase tracking-widest text-slate-500">
          <tr>
            <th className="py-2 pl-3">Cohort</th>
            <th>n</th>
            <th>Δ Identity (mean ± SD)</th>
            <th>{t("research.axisLabels.sortAccuracy")}</th>
            <th>{t("research.axisLabels.d30Retention")}</th>
            <th>kg CO₂e / wk</th>
            <th>Cohen&apos;s d</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <motion.tr
              key={r.cohort}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="border-t border-slate-200 dark:border-slate-700"
            >
              <td className="py-2 pl-3 font-semibold text-slate-800 dark:text-slate-200">
                {labels[r.cohort]}
              </td>
              <td className="font-mono">{r.n}</td>
              <td className="font-mono">
                {r.identityChange.toFixed(3)} ± {r.identityChangeSD.toFixed(3)}
              </td>
              <td className="font-mono">
                {r.sortAccuracy.toFixed(3)} ± {r.sortAccuracySD.toFixed(3)}
              </td>
              <td className="font-mono">{(r.d30Retention * 100).toFixed(1)}%</td>
              <td className="font-mono">{r.kgCo2ePerUserWeek.toFixed(3)}</td>
              <td className="font-mono">{r.cohensD !== undefined ? r.cohensD.toFixed(2) : "—"}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Primary tests card ────────────────────────────────────────────────

const PrimaryTestsCard: React.FC<{
  tests: NonNullable<RctSummary["primaryTests"]>;
  corrected: {
    holm: { rejectedIdx: number[]; adjustedP: number[] };
    bonf: { rejectedIdx: number[]; adjustedP: number[] };
  } | null;
}> = ({ tests, corrected }) => {
  const { t } = useTranslation();
  const labels = [
    t("research.axisLabels.identityChange"),
    t("research.axisLabels.sortAccuracy"),
    t("research.axisLabels.d30Retention"),
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        Primary tests (E4 vs C)
      </p>
      <table className="mt-3 w-full text-xs">
        <thead className="text-left text-[10px] uppercase tracking-widest text-slate-500">
          <tr>
            <th>Outcome</th>
            <th>Mean diff</th>
            <th>Welch t</th>
            <th>df</th>
            <th>p</th>
            <th>Holm adj.</th>
            <th>Reject H₀?</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((t, i) => {
            const rejected = corrected ? corrected.holm.rejectedIdx.includes(i) : false;
            return (
              <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                <td className="py-1">{labels[i]}</td>
                <td className="font-mono">{t.meanDiff.toFixed(3)}</td>
                <td className="font-mono">{t.t.toFixed(3)}</td>
                <td className="font-mono">{t.df.toFixed(1)}</td>
                <td className="font-mono">{t.pValue.toExponential(2)}</td>
                <td className="font-mono">
                  {corrected ? corrected.holm.adjustedP[i].toExponential(2) : "—"}
                </td>
                <td>
                  {rejected ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-mono text-emerald-700">
                      yes
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-mono text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      no
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Audit card ────────────────────────────────────────────────────────

const AuditCard: React.FC<{ audit: NonNullable<RctSummary["audit"]> }> = ({ audit }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Audit Trail</p>
      <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">
        Merkle root: {audit.merkleRoot.slice(0, 32)}…
      </p>
      <p className="text-xs text-slate-500">Rounds logged: {audit.rounds}</p>
    </div>
  );
};

// ─── Fallback derivation from synthetic population ─────────────────────

function deriveFromSynthetic(nUsers: number): RctSummary {
  const pop = getSyntheticPopulation({ seed: 42, nUsers });
  const stats = summarisePopulation(pop);
  // Simple deterministic mapping from baseline → final identity change.
  // Mirrors the synthetic_rct.py simulation: each cohort shifts by a factor.
  const effectByCohort: Record<CohortId, number> = {
    C: 0.04,
    E1: 0.18,
    E2: 0.27,
    E3: 0.36,
    E4: 0.52,
  };
  const rows: RctRow[] = Object.keys(effectByCohort).map((c) => {
    const cohort = c as CohortId;
    const cohortUsers = pop.filter((u) => u.cohort === cohort);
    const identityChange = effectByCohort[cohort];
    const accuracy =
      cohortUsers.reduce((a, b) => a + b.baseline.accuracy, 0) / Math.max(1, cohortUsers.length);
    return {
      cohort,
      n: cohortUsers.length,
      identityChange,
      identityChangeSD: 0.12,
      sortAccuracy: accuracy,
      sortAccuracySD: 0.1,
      d30Retention: 0.65 + effectByCohort[cohort] * 0.4,
      kgCo2ePerUserWeek: 0.027 + effectByCohort[cohort] * 0.05,
      cohensD: (identityChange - 0.04) / 0.12,
    };
  });
  return {
    provenance: "synthetic",
    rows,
  };
}

function validateSummary(summary: RctSummary): RctSummary {
  if (!summary || !Array.isArray(summary.rows)) throw new Error("Invalid research summary");
  const provenance = summary.provenance ?? "unknown";
  if (!["live", "synthetic", "unknown"].includes(provenance)) {
    throw new Error("Invalid research provenance");
  }
  for (const row of summary.rows) {
    if (!row || !Number.isFinite(row.n) || row.n < 0) throw new Error("Invalid research row");
    for (const value of [
      row.identityChange,
      row.identityChangeSD,
      row.sortAccuracy,
      row.sortAccuracySD,
      row.d30Retention,
      row.kgCo2ePerUserWeek,
    ]) {
      if (!Number.isFinite(value)) throw new Error("Non-finite research value");
    }
  }
  return { ...summary, provenance: provenance as RctSummary["provenance"] };
}

export default ResearchDashboard;
