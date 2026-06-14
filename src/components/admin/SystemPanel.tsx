import React, { useState, useEffect } from "react";
import { RefreshCw, Database, HardDrive, Cloud, Server, FileText, Shield, Activity, Loader2 } from "lucide-react";
import { Button, Card, Badge, SectionHeading } from "../../lib/ui";
import { showToast } from "../../lib/toast";

const token = () => localStorage.getItem("auth_token") || "";
const adminApiKey = (import.meta as any).env?.VITE_ADMIN_API_KEY || "";

const authHeaders = (): HeadersInit => ({
  Authorization: token() ? `Bearer ${token()}` : "",
  "x-admin-key": adminApiKey,
});

export function SystemPanel() {
  const [health, setHealth] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [healthRes, auditRes] = await Promise.all([
        fetch("/api/admin/system/health", { headers: authHeaders() }),
        fetch("/api/admin/audit-log?limit=50", { headers: authHeaders() }),
      ]);
      if (healthRes.ok) setHealth(await healthRes.json());
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAudit(data.actions || []);
      }
    } catch (e) {
      showToast("Lỗi", (e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="space-y-4">
      {/* Health */}
      <Card className="rounded-[28px] p-6">
        <SectionHeading
          eyebrow="System Health"
          title="Tình trạng hệ thống"
          action={
            <Button variant="ghost" onClick={load} loading={loading}>
              <RefreshCw className="h-4 w-4" /> Tải lại
            </Button>
          }
        />

        {health ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <Server className="h-4 w-4" /> Server
                </div>
                <p className="mt-2 text-2xl font-bold">{formatUptime(health.server?.uptime || 0)}</p>
                <p className="text-xs text-slate-500">Uptime</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <Database className="h-4 w-4" /> Memory
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {formatBytes(health.server?.memory?.heapUsed || 0)}
                </p>
                <p className="text-xs text-slate-500">Heap used</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <HardDrive className="h-4 w-4" /> RSS
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {formatBytes(health.server?.memory?.rss || 0)}
                </p>
                <p className="text-xs text-slate-500">Resident set</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Kết nối</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <ConnectionRow
                  name="Firestore"
                  status={health.firestore?.status}
                  icon={<Database className="h-4 w-4" />}
                />
                <ConnectionRow
                  name="Supabase"
                  status={health.supabase?.status}
                  icon={<Cloud className="h-4 w-4" />}
                />
                <ConnectionRow
                  name="Google Sheets"
                  status={health.sheets?.status}
                  icon={<FileText className="h-4 w-4" />}
                  detail={health.sheets?.spreadsheetTitle}
                />
                <ConnectionRow
                  name="Quiz DB"
                  status={health.quizDb?.status}
                  icon={<Database className="h-4 w-4" />}
                />
                <ConnectionRow
                  name="Rewards DB"
                  status={health.rewardsDb?.status}
                  icon={<Database className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Environment</h3>
              <div className="space-y-1 text-sm">
                <EnvRow label="NODE_ENV" value={health.env?.nodeEnv} />
                <EnvRow
                  label="ADMIN_API_KEY"
                  value={health.env?.adminApiKeySet ? "Set" : "Not set"}
                />
                <EnvRow
                  label="Firebase"
                  value={health.env?.firebaseConfigured ? "Configured" : "Not configured"}
                />
                <EnvRow
                  label="Supabase"
                  value={health.env?.supabaseConfigured ? "Configured" : "Not configured"}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 p-4 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
          </div>
        )}
      </Card>

      {/* Audit log */}
      <Card className="rounded-[28px] p-6">
        <SectionHeading
          eyebrow="Audit Log"
          title="Nhật ký hành động admin (50 gần nhất)"
        />
        {audit.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Chưa có hành động nào được ghi.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b">
                <tr>
                  <th className="py-2 px-2">Thời gian</th>
                  <th className="py-2 px-2">Admin</th>
                  <th className="py-2 px-2">Hành động</th>
                  <th className="py-2 px-2">Target</th>
                  <th className="py-2 px-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a: any, i: number) => (
                  <tr key={a.id || i} className="border-b border-slate-100">
                    <td className="py-2 px-2 text-xs">
                      {new Date(a.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2 px-2">{a.admin_nick}</td>
                    <td className="py-2 px-2">
                      <Badge tone="accent">{a.action_type}</Badge>
                    </td>
                    <td className="py-2 px-2 text-xs">
                      {a.target_type && `${a.target_type}#${a.target_id || ""}`}
                    </td>
                    <td className="py-2 px-2 text-xs font-mono text-slate-500 max-w-xs truncate">
                      {a.details ? JSON.stringify(a.details).slice(0, 80) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function ConnectionRow({ name, status, icon, detail }: any) {
  const isOk =
    status === "connected" ||
    status === "configured" ||
    (typeof status === "string" && !status.includes("error") && !status.includes("Not") && !status.includes("disconnected"));
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span className="font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">{detail || status}</span>
        {isOk ? (
          <Badge tone="success">OK</Badge>
        ) : (
          <Badge tone="warning">Warn</Badge>
        )}
      </div>
    </div>
  );
}

function EnvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-1 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}
