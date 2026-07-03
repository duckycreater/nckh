import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ComScores,
  ComBreakdown,
  selectIntervention,
  computeBreakdown,
} from "../services/theoryOfChange";
import type { User } from "../types";

export interface TheoryOfChangeVizProps {
  user?: Partial<User>;
  breakdown?: ComBreakdown;
  onInterventionSelect?: (kind: string) => void;
}

const NODE_COLOURS = {
  capability: "#06b6d4",
  opportunity: "#0d9488",
  motivation: "#d97706",
  behaviour: "#65a30d",
  impact: "#16a34a",
};

export const TheoryOfChangeViz: React.FC<TheoryOfChangeVizProps> = ({
  user,
  breakdown: breakdownProp,
  onInterventionSelect,
}) => {
  const breakdown = useMemo<ComBreakdown>(
    () => breakdownProp ?? computeBreakdown(user ?? {}),
    [breakdownProp, user]
  );
  const scores = breakdown.scores;
  const intervention = useMemo(() => selectIntervention(scores), [scores]);

  const nodes = [
    { id: "capability", label: "Capability", score: scores.capability, kind: "Knowledge / Skill" },
    { id: "opportunity", label: "Opportunity", score: scores.opportunity, kind: "Peer / Bin access" },
    { id: "motivation", label: "Motivation", score: scores.motivation, kind: "Identity / Reward" },
    { id: "behaviour", label: "Behaviour", score: scores.behaviour, kind: "Sort accuracy" },
  ];

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Theory of Change
        </h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          COM-B · v{breakdown.version}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Capability × Opportunity × Motivation → Behaviour → SDG Impact.
        Drag the slider to test interventions live.
      </p>

      {/* Causal pathway: 4 columns, each is a coloured card with a slider. */}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {nodes.map((node) => (
          <NodeCard key={node.id} node={node} accent={NODE_COLOURS[node.id as keyof typeof NODE_COLOURS]} />
        ))}
      </div>

      {/* The Impact bar */}
      <div className="mt-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700 p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">SDG Impact</p>
            <p className="text-2xl font-bold">
              Behaviour × Drop-off Rate × Population = ?
            </p>
            <p className="mt-1 text-sm opacity-90">
              KPI: ≥ 0.4 SD shift on EID-4 by week 10. Behaviour score = {scores.behaviour.toFixed(3)}.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest opacity-80">Predicted kg CO₂e / wk</p>
            <p className="text-3xl font-bold">{(scores.behaviour * 0.5).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Recommended intervention */}
      <motion.div
        layout
        className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Next-Best Intervention
        </p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            {intervention.kind}
          </p>
          <button
            onClick={() => onInterventionSelect?.(intervention.kind)}
            className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            Apply
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{intervention.reason}</p>
      </motion.div>
    </div>
  );
};

interface NodeCardProps {
  node: { id: string; label: string; score: number; kind: string };
  accent: string;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, accent }) => {
  const pct = Math.round(node.score * 100);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {node.label}
        </p>
        <span
          className="text-xs font-mono font-bold"
          style={{ color: accent }}
        >
          {pct}%
        </span>
      </div>
      <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <motion.div
          className="h-full"
          style={{ backgroundColor: accent }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{node.kind}</p>
    </div>
  );
};

export default TheoryOfChangeViz;