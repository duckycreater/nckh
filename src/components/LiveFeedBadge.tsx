/**
 * LiveFeedBadge — tiny "Live" / "Offline" pill that shows the SSE status
 * and surfaces the most recent event seen.
 *
 * Lives next to (or above) the TrustPanel so visitors to /impact see
 * the system is genuinely running, not a mock.
 */

import React from "react";
import { useEventSource } from "../hooks/useEventSource";

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) || "";

interface Props {
  className?: string;
}

export function LiveFeedBadge({className = ""}: Props) {
  const {status, last} = useEventSource(`${API_BASE}/api/stream/feed`);

  const labelMap: Record<string, string> = {
    connecting: "Đang kết nối…",
    open: "Trực tiếp",
    closed: "Đã đóng",
    error: "Mất kết nối",
  };
  const dotColor =
    status === "open" ? "bg-emerald-500"
      : status === "connecting" ? "bg-amber-400"
      : "bg-rose-500";

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 ${className}`}>
      <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`}>
        {status === "open" && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />}
      </span>
      <span>{labelMap[status] || status}</span>
      {last && (
        <span className="hidden text-[10px] font-normal text-slate-500 sm:inline">
          · {last.type} {formatRelative(last.ts)}
        </span>
      )}
    </div>
  );
}

function formatRelative(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 5_000) return "vừa xong";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  return new Date(ts).toLocaleTimeString("vi-VN");
}