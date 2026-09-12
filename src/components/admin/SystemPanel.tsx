import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Database,
  HardDrive,
  Cloud,
  Server,
  FileText,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import { Button, Card, Badge, SectionHeading } from "../../lib/ui";
import { showToast } from "../../lib/toast";

const token = () => localStorage.getItem("auth_token") || "";

const authHeaders = (): HeadersInit => ({
  Authorization: token() ? `Bearer ${token()}` : "",
});

// Audit log entry from /api/admin/audit-log
interface AuditLogEntry {
  id: string;
  action: string;
  user?: string;
  target?: string;
  created_at: string;
  ip_address?: string;
  admin_nick?: string;
  action_type?: string;
  target_type?: string;
  target_id?: string;
  details?: unknown;
  [key: string]: unknown;
}

// Health check response
interface HealthStatus {
  status: string;
  server?: { status: string; uptime: number; memory: { heapUsed: number; rss: number } };
  firestore?: { status: string };
  supabase?: { status: string };
  sheets?: { status: string; spreadsheetTitle?: string };
  quizDb?: { status: string };
  rewardsDb?: { status: string };
  env?: {
    nodeEnv: string;
    adminApiKeySet: boolean;
    firebaseConfigured: boolean;
    supabaseConfigured: boolean;
  };
  [key: string]: unknown;
}

interface EmailStatus {
  provider: "resend" | "smtp" | "none";
  configured: boolean;
  fromConfigured: boolean;
  notificationRecipientConfigured: boolean;
  publicAppUrlConfigured: boolean;
}

export function SystemPanel() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [healthRes, auditRes, emailRes] = await Promise.all([
        fetch("/api/admin/system/health", { headers: authHeaders() }),
        fetch("/api/admin/audit-log?limit=50", { headers: authHeaders() }),
        fetch("/api/admin/email/status", { headers: authHeaders() }),
      ]);
      if (healthRes.ok) setHealth(await healthRes.json());
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAudit(data.actions || []);
      }
      if (emailRes.ok) setEmailStatus(await emailRes.json());
    } catch (e) {
      showToast("Lỗi", (e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sendTestEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setTestingEmail(true);
    try {
      const response = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ to: testEmail }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.reason || result?.message || "Không thể gửi email kiểm thử.");
      }
      showToast(
        "Email hoạt động",
        `${emailStatus?.provider?.toUpperCase() || "Provider"} đã chấp nhận email ${result.id || ""}.`,
        "success",
      );
    } catch (error) {
      showToast("Email chưa gửi được", (error as Error).message, "error");
    } finally {
      setTestingEmail(false);
    }
  };

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
                <p className="mt-2 text-2xl font-bold">
                  {formatUptime(health.server?.uptime || 0)}
                </p>
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
                  status={health.firestore?.status ?? "unknown"}
                  icon={<Database className="h-4 w-4" />}
                />
                <ConnectionRow
                  name="Supabase"
                  status={health.supabase?.status ?? "unknown"}
                  icon={<Cloud className="h-4 w-4" />}
                />
                <ConnectionRow
                  name="Google Sheets"
                  status={health.sheets?.status ?? "unknown"}
                  icon={<FileText className="h-4 w-4" />}
                  detail={health.sheets?.spreadsheetTitle}
                />
                <ConnectionRow
                  name="Quiz DB"
                  status={health.quizDb?.status ?? "unknown"}
                  icon={<Database className="h-4 w-4" />}
                />
                <ConnectionRow
                  name="Rewards DB"
                  status={health.rewardsDb?.status ?? "unknown"}
                  icon={<Database className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Environment</h3>
              <div className="space-y-1 text-sm">
                <EnvRow label="NODE_ENV" value={health.env?.nodeEnv ?? "unknown"} />
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

      {/* Transactional email diagnostics */}
      <Card className="rounded-[28px] p-6">
        <SectionHeading
          eyebrow="Transactional Email"
          title="Kiểm tra gửi email end-to-end"
          subtitle="Trạng thái chỉ hiển thị cấu hình có/không, không bao giờ trả API key về trình duyệt."
          action={
            <Badge tone={emailStatus?.configured ? "success" : "warning"}>
              <Mail className="h-3.5 w-3.5" />
              {emailStatus?.configured
                ? `${emailStatus.provider.toUpperCase()} configured`
                : "Email provider not configured"}
            </Badge>
          }
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <EmailConfigFlag label="API provider" enabled={Boolean(emailStatus?.configured)} />
          <EmailConfigFlag label="Địa chỉ gửi" enabled={Boolean(emailStatus?.fromConfigured)} />
          <EmailConfigFlag
            label="Email nhận đơn"
            enabled={Boolean(emailStatus?.notificationRecipientConfigured)}
          />
          <EmailConfigFlag
            label="URL khôi phục"
            enabled={Boolean(emailStatus?.publicAppUrlConfigured)}
          />
        </div>

        <form onSubmit={sendTestEmail} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="email-diagnostic-recipient">
            Email nhận thư kiểm thử
          </label>
          <input
            id="email-diagnostic-recipient"
            type="email"
            required
            value={testEmail}
            onChange={(event) => setTestEmail(event.target.value)}
            placeholder="Email nhận thư kiểm thử"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
          />
          <Button type="submit" loading={testingEmail} disabled={!emailStatus?.configured}>
            <Send className="h-4 w-4" /> Gửi email kiểm thử
          </Button>
        </form>
        {!emailStatus?.configured && (
          <p className="mt-3 text-xs text-amber-700">
            Cần cấu hình Resend hoặc SMTP trên môi trường deploy trước khi gửi thử.
          </p>
        )}
      </Card>

      {/* Audit log */}
      <Card className="rounded-[28px] p-6">
        <SectionHeading eyebrow="Audit Log" title="Nhật ký hành động admin (50 gần nhất)" />
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
                {audit.map((a: AuditLogEntry, i: number) => (
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

function EmailConfigFlag({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <Badge tone={enabled ? "success" : "warning"}>{enabled ? "OK" : "Missing"}</Badge>
    </div>
  );
}

function ConnectionRow({
  name,
  status,
  icon,
  detail,
}: {
  name: string;
  status: string;
  icon: React.ReactNode;
  detail?: string;
}) {
  const isOk =
    status === "connected" ||
    status === "configured" ||
    (typeof status === "string" &&
      !status.includes("error") &&
      !status.includes("Not") &&
      !status.includes("disconnected"));
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span className="font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">{detail || status}</span>
        {isOk ? <Badge tone="success">OK</Badge> : <Badge tone="warning">Warn</Badge>}
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
