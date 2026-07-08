/**
 * ReasoningChainView.tsx — Render the per-step reasoning chain for a
 * chatbot answer.
 *
 * The chatbot already produces an array of `{step, claim, evidence}`
 * entries via `causalReasoning.ts`. This view surfaces them with
 * clickable source links and a confidence indicator. No animation;
 * just a clear vertical timeline.
 */

import React, { useState } from "react";
import { ChevronRight, ChevronDown, FileText, FlaskConical } from "lucide-react";

export interface ReasoningStep {
  step: number;
  claim: string;
  evidence: string;
  /** Optional confidence score in [0,1]. */
  confidence?: number;
  /** Optional source citation (path in repo, e.g. "docs/research/LITERATURE_REVIEW.md#epa-warm"). */
  source?: string;
}

/** A chain is an array of reasoning steps. */
export type ReasoningChain = ReasoningStep[];

interface Props {
  steps: ReasoningStep[];
  /** Optional final answer summary shown above the chain. */
  summary?: string;
  /** Hide collapsible sections; default false (expandable). */
  startCollapsed?: boolean;
}

export function ReasoningChainView({steps, summary, startCollapsed = false}: Props) {
  const [collapsed, setCollapsed] = useState(startCollapsed);

  if (!steps?.length) {
    return (
      <div className="text-xs italic text-slate-500">
        Không có chuỗi suy luận cho câu trả lời này.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/40">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 text-left font-semibold text-slate-700 dark:text-slate-200"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        Chuỗi suy luận ({steps.length} bước)
      </button>
      {summary && (
        <div className="mt-2 text-slate-600 dark:text-slate-300">
          <span className="font-semibold">Tóm tắt:</span> {summary}
        </div>
      )}
      {!collapsed && (
        <ol className="mt-2 space-y-2">
          {steps.map((s) => (
            <li key={s.step} className="flex gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                {s.step}
              </span>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 dark:text-slate-100">
                  {s.claim}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <FlaskConical size={10} className="mr-1 inline" />
                  {s.evidence}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {typeof s.confidence === "number" && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${confidenceClass(s.confidence)}`}
                    >
                      {(s.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                  {s.source && (
                    <a
                      href={s.source}
                      className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:underline dark:text-emerald-300"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText size={10} />
                      {labelOf(s.source)}
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function confidenceClass(c: number): string {
  if (c >= 0.8) return "bg-emerald-100 text-emerald-700";
  if (c >= 0.5) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function labelOf(src: string): string {
  if (src.includes("LITERATURE_REVIEW")) return "Tài liệu tham khảo";
  if (src.includes("THEORY_OF_CHANGE")) return "Lý thuyết thay đổi";
  if (src.includes("EPA") || src.includes("WARM")) return "EPA WARM";
  if (src.includes("IPCC")) return "IPCC AR6";
  return src.split("/").pop() || src;
}