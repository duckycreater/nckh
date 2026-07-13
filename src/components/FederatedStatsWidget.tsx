/**
 * FederatedStatsWidget — "Trạng thái FL" mini panel.
 *
 * Polls /api/federated/stats every 15s. Shows:
 *   - số client đang chờ để đủ round
 *   - phiên bản model toàn cầu mới nhất
 *   - (ε, δ, clipNorm) DP budget
 *
 * Đặt cạnh các widget trust khác trên Dashboard hoặc /impact.
 */

import React, { useEffect, useState } from "react";
import { Shield, Layers, Activity } from "lucide-react";

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) || "";

interface Stats {
  bufferSize: number;
  minClients: number;
  latestVersion: { version: string; trainedOn: number; createdAt: number } | null;
  dp: { epsilon: number; delta: number; clipNorm: number };
}

interface Props {
  pollMs?: number;
  className?: string;
}

export function FederatedStatsWidget({pollMs = 15000, className = ""}: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/federated/status`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!mounted) return;
        setStats(data);
        setError(null);
      } catch (e) {
        if (mounted) setError((e as Error).message);
      }
    };
    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [pollMs]);

  if (error && !stats) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 ${className}`}>
        FL offline.
      </div>
    );
  }
  if (!stats) return null;

  const enough = stats.bufferSize >= stats.minClients;
  const pct = Math.min(100, Math.round((stats.bufferSize / Math.max(1, stats.minClients)) * 100));

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Trạng thái Federated Learning
        </h4>
        <Activity size={14} className="text-emerald-600" />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-slate-500">Phiên bản</dt>
          <dd className="font-mono font-semibold text-slate-900 dark:text-slate-100">
            {stats.latestVersion?.version || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Mẫu huấn luyện</dt>
          <dd className="font-mono font-semibold text-slate-900 dark:text-slate-100">
            {stats.latestVersion?.trainedOn?.toLocaleString() ?? 0}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="flex items-center justify-between text-slate-500">
            <span>
              <Layers size={11} className="mr-1 inline" />
              Buffer
            </span>
            <span className="font-mono">
              {stats.bufferSize} / {stats.minClients}
            </span>
          </dt>
          <div className="mt-1 h-1.5 rounded bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-1.5 rounded ${enough ? "bg-emerald-500" : "bg-amber-400"}`}
              style={{width: `${pct}%`}}
            />
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {enough ? "Đủ client — sẵn sàng cho round mới" : "Đang chờ thêm client"}
          </div>
        </div>
        <div className="col-span-2 mt-2 flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900/40">
          <Shield size={11} className="text-emerald-600" />
          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-200">
            ε = {stats.dp.epsilon.toFixed(2)} · δ = {stats.dp.delta.toExponential(1)} · clip = {stats.dp.clipNorm}
          </span>
        </div>
      </dl>
    </div>
  );
}