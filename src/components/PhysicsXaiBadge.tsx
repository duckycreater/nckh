/**
 * PhysicsXaiBadge — Renders the physics-aware sanity check that the
 * `evaluatePhysics()` rules already compute. Pure presentational; expects
 * the caller to have run `evaluatePhysics()` and passed the result in.
 *
 * No animation, just SVG bars and labels.
 */
import React from "react";
import { PHYSICS_RULES, type PhysicsResult } from "../services/physicsAwareXAI";

interface Props {
  result: PhysicsResult;
}

export function PhysicsXaiBadge({ result }: Props) {
  if (!result || !result.rules || result.rules.length === 0) {
    return null;
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-bold text-slate-700">Sanity check vật lý</div>
        <div className="font-mono text-sm font-bold text-slate-900">
          {Math.round(result.overallScore * 100)}/100
        </div>
      </div>
      <ul className="space-y-2">
        {result.rules.map((r) => {
          const rule = PHYSICS_RULES.find((pr) => pr.id === r.id);
          return (
            <li key={r.id}>
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>{rule?.description || r.id}</span>
                <span className="font-mono">{Math.round(r.score * 100)}%</span>
              </div>
              <svg
                width="100%"
                height="6"
                viewBox="0 0 100 6"
                preserveAspectRatio="none"
                aria-hidden
                className="mt-1"
              >
                <rect x="0" y="0" width="100" height="6" rx="3" fill="#e2e8f0" />
                <rect
                  x="0"
                  y="0"
                  width={Math.max(0, Math.min(100, r.score * 100))}
                  height="6"
                  rx="3"
                  fill={r.score >= 0.7 ? "#059669" : r.score >= 0.4 ? "#d97706" : "#dc2626"}
                />
              </svg>
              <div className="mt-0.5 text-[10px] text-slate-500">{r.note}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
