/**
 * PrivacyBudgetMeter.tsx — Minimal donut ε-meter for Settings.
 *
 * - No animation library; pure SVG arc with CSS transitions.
 * - Fires an `onWarn` callback when usage crosses 80% of the budget so
 *   the parent can show a "đợi 24h" suggestion instead of escalating
 *   the privacy cost.
 * - Uses the dpAccountant singleton from src/services/dpAccountant.ts.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Shield, AlertTriangle } from "lucide-react";

interface Props {
  /** Max ε before the user should stop contributing today. */
  epsilonMax?: number;
  /** Notification when usage crosses this fraction (default 0.8). */
  warnThreshold?: number;
  className?: string;
}

interface DpState {
  rounds: number;
  epsilon: number;
  delta: number;
  withinBudget: boolean;
  recommendedSigma: number | null;
}

const WARN_FRACTION_DEFAULT = 0.8;

export function PrivacyBudgetMeter({
  epsilonMax = 3.0,
  warnThreshold = WARN_FRACTION_DEFAULT,
  className = "",
}: Props) {
  const [state, setState] = useState<DpState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const warnedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let timer: number | undefined;
    async function poll() {
      try {
        const mod = await import("../services/dpAccountant");
        const a = mod.getDpAccountant();
        const s = a.computeState();
        if (!mounted) return;
        setState({
          rounds: s.rounds,
          epsilon: s.epsilonAtDelta,
          delta: s.deltaAtEpsilon,
          withinBudget: s.withinBudget,
          recommendedSigma: s.recommendedSigma,
        });
      } catch {
        // ignore
      }
      timer = window.setTimeout(poll, 15_000);
    }
    void poll();
    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const usedFraction = useMemo(() => {
    if (!state) return 0;
    return Math.min(1, state.epsilon / epsilonMax);
  }, [state, epsilonMax]);

  const showWarning =
    !!state && !state.withinBudget && !warnedRef.current && usedFraction >= warnThreshold;

  useEffect(() => {
    if (showWarning) warnedRef.current = true;
  }, [showWarning]);

  /* Donut geometry. */
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - usedFraction);
  const color = !state
    ? "#cbd5e1"
    : state.withinBudget
      ? usedFraction > warnThreshold
        ? "#f59e0b"
        : "#10b981"
      : "#ef4444";

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <Shield size={16} className="text-emerald-600" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Quỹ riêng tư
        </h3>
      </div>

      <div className="flex items-center gap-4">
        <svg width={120} height={120} viewBox="0 0 120 120" className="shrink-0">
          <circle cx={60} cy={60} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={10} />
          <circle
            cx={60}
            cy={60}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
            style={{transition: "stroke-dashoffset 600ms ease-out, stroke 200ms"}}
          />
          <text
            x={60}
            y={56}
            textAnchor="middle"
            fontSize={20}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill="currentColor"
          >
            {state ? state.epsilon.toFixed(2) : "—"}
          </text>
          <text x={60} y={76} textAnchor="middle" fontSize={10} fill="#94a3b8">
            / ε_max = {epsilonMax.toFixed(1)}
          </text>
        </svg>

        <div className="text-xs text-slate-600 dark:text-slate-300">
          <div className="font-semibold">
            {state?.rounds ?? 0} vòng federated đã chạy
          </div>
          <div className="mt-1">
            δ = {state ? state.delta.toExponential(1) : "—"}
          </div>
          <div className="mt-1">
            {state?.withinBudget
              ? "Đang trong ngân sách — bạn có thể tiếp tục đóng góp."
              : "Đã vượt ngân sách — dừng gửi update mới."}
          </div>
          {state?.recommendedSigma != null && (
            <div className="mt-1 text-amber-600">
              Gợi ý σ tiếp theo: {state.recommendedSigma.toFixed(3)}
            </div>
          )}
        </div>
      </div>

      {showWarning && !dismissed && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            Bạn đã dùng {(usedFraction * 100).toFixed(0)}% ngân sách riêng tư
            hôm nay. Để bảo vệ người dùng khác, hãy đợi 24h trước khi
            đóng góp thêm round FL.
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="rounded px-2 py-0.5 text-[10px] text-amber-700 hover:bg-amber-100"
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  );
}