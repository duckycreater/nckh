import React, { useState, useEffect } from "react";
import { RefreshCw, Upload, Download, Activity, AlertCircle, CheckCircle2, Clock, FileSpreadsheet, Zap, Loader2 } from "lucide-react";
import { Button, Card, Badge, FieldLabel, Input, SectionHeading, EmptyState } from "../../lib/ui";
import { showToast } from "../../lib/toast";

const token = () => localStorage.getItem("auth_token") || "";
const adminApiKey = (import.meta as any).env?.VITE_ADMIN_API_KEY || "";

const authHeaders = (json = false): HeadersInit => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  Authorization: token() ? `Bearer ${token()}` : "",
  "x-admin-key": adminApiKey,
});

const DEFAULT_SHEET_ID = "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q";

export function SheetsSyncPanel() {
  const [spreadsheetId, setSpreadsheetId] = useState(DEFAULT_SHEET_ID);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<"full" | "push" | null>(null);
  const [health, setHealth] = useState<any>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sheets/status", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.spreadsheetId) setSpreadsheetId(data.spreadsheetId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    try {
      const res = await fetch("/api/admin/system/health", { headers: authHeaders() });
      if (res.ok) setHealth(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStatus();
    loadHealth();
    const interval = setInterval(() => {
      loadStatus();
    }, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const runFullSync = async () => {
    if (!confirm("Đồng bộ 2 chiều (Supabase + Firestore ↔ Google Sheets)? Quá trình có thể mất vài phút.")) return;
    setSyncing("full");
    try {
      const res = await fetch("/api/admin/sheets/full-sync", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ spreadsheetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      showToast(
        "Đồng bộ hoàn tất",
        `${data.users} users, ${data.quizQuestions} câu hỏi, ${data.rewards} rewards`,
        "success",
      );
      loadStatus();
    } catch (e) {
      showToast("Lỗi đồng bộ", (e as Error).message, "error");
    } finally {
      setSyncing(null);
    }
  };

  const runPushOnly = async () => {
    setSyncing("push");
    try {
      const res = await fetch("/api/admin/sheets/push-to-sheets", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ spreadsheetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Push failed");
      showToast(
        "Đã đẩy lên Sheets",
        `${data.users} users, ${data.quizQuestions} câu hỏi, ${data.rewards} rewards`,
        "success",
      );
      loadStatus();
    } catch (e) {
      showToast("Lỗi push", (e as Error).message, "error");
    } finally {
      setSyncing(null);
    }
  };

  const runPullOnly = async () => {
    if (!confirm("Kéo từ Google Sheets về DB? Hành động này sẽ ghi đè CauHinh và BoCauHoi trong DB.")) return;
    setSyncing("full");
    try {
      const res = await fetch("/api/admin/sync-sheets", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ spreadsheetId }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("Đã kéo về từ Sheets", "CauHinh và BoCauHoi đã được cập nhật", "success");
      loadStatus();
    } catch (e) {
      showToast("Lỗi pull", (e as Error).message, "error");
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-[28px] p-6">
        <SectionHeading
          eyebrow="Sheets Sync"
          title="Đồng bộ Google Sheets"
          subtitle="Sheets là hub trung tâm. Auto-sync mỗi 15 phút. Bạn cũng có thể trigger thủ công."
          action={
            <Button variant="ghost" onClick={loadStatus} loading={loading}>
              <RefreshCw className="h-4 w-4" /> Tải lại
            </Button>
          }
        />

        <div className="mt-4 space-y-2">
          <FieldLabel>Spreadsheet ID</FieldLabel>
          <Input
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={runFullSync} loading={syncing === "full"}>
            <RefreshCw className="h-4 w-4" /> Đồng bộ 2 chiều (Full)
          </Button>
          <Button onClick={runPushOnly} variant="secondary" loading={syncing === "push"}>
            <Upload className="h-4 w-4" /> DB → Sheets
          </Button>
          <Button onClick={runPullOnly} variant="ghost" loading={syncing === "full"}>
            <Download className="h-4 w-4" /> Sheets → DB
          </Button>
        </div>

        {syncing && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-blue-50 p-3 text-sm text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang đồng bộ... quá trình có thể mất 1-2 phút tùy lượng dữ liệu.
          </div>
        )}
      </Card>

      {/* Health check */}
      {health && (
        <Card className="rounded-[28px] p-6">
          <SectionHeading
            eyebrow="Health"
            title="Tình trạng kết nối"
            action={
              <Button variant="ghost" onClick={loadHealth}>
                <RefreshCw className="h-4 w-4" /> Tải lại
              </Button>
            }
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <HealthItem
              label="Firestore"
              status={health.firestore?.status}
              ok={health.firestore?.status === "connected"}
            />
            <HealthItem
              label="Supabase"
              status={health.supabase?.status}
              ok={health.supabase?.status === "connected"}
            />
            <HealthItem
              label="Google Sheets"
              status={health.sheets?.status}
              ok={health.sheets?.status === "connected"}
              detail={health.sheets?.spreadsheetTitle}
            />
            <HealthItem
              label="Quiz DB"
              status={health.quizDb?.status}
              ok={health.quizDb?.status === "configured"}
            />
            <HealthItem
              label="Rewards DB"
              status={health.rewardsDb?.status}
              ok={health.rewardsDb?.status === "configured"}
            />
            <HealthItem
              label="Server Uptime"
              status={`${Math.floor(health.server?.uptime || 0)}s`}
              ok
            />
          </div>
        </Card>
      )}

      {/* Last sync result */}
      {status?.lastSyncResult && (
        <Card className="rounded-[28px] p-6">
          <SectionHeading
            eyebrow="Last Sync"
            title={`Lần đồng bộ gần nhất: ${new Date(status.lastSyncTime).toLocaleString("vi-VN")}`}
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Metric label="Users" value={status.lastSyncResult.users} />
            <Metric label="Quiz Questions" value={status.lastSyncResult.quizQuestions} />
            <Metric label="Quiz Config" value={status.lastSyncResult.quizConfig} />
            <Metric label="Rewards" value={status.lastSyncResult.rewards} />
            <Metric label="Behavioral Events" value={status.lastSyncResult.behavioralEvents} />
            <Metric label="Reward Tx" value={status.lastSyncResult.rewardTransactions} />
            <Metric label="Research Profiles" value={status.lastSyncResult.userResearchProfiles} />
            <Metric label="Decay Log" value={status.lastSyncResult.noveltyDecayLog} />
            <Metric label="Interventions" value={status.lastSyncResult.interventions} />
          </div>
          {status.lastSyncResult.errors?.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <strong>Lỗi:</strong>
              <ul className="mt-1 list-disc pl-5">
                {status.lastSyncResult.errors.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-3 text-xs text-slate-500">
            Thời gian thực hiện: {status.lastSyncResult.duration}ms
          </div>
        </Card>
      )}

      {/* Sync history */}
      {status?.syncHistory && status.syncHistory.length > 0 && (
        <Card className="rounded-[28px] p-6">
          <SectionHeading eyebrow="History" title="Lịch sử đồng bộ (20 lần gần nhất)" />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b">
                <tr>
                  <th className="py-2 px-2">Thời gian</th>
                  <th className="py-2 px-2">Trạng thái</th>
                  <th className="py-2 px-2">Users</th>
                  <th className="py-2 px-2">Quiz</th>
                  <th className="py-2 px-2">Rewards</th>
                  <th className="py-2 px-2">Events</th>
                  <th className="py-2 px-2">Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {status.syncHistory.map((h: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 px-2 text-xs">
                      {new Date(h.timestamp).toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2 px-2">
                      {h.error ? (
                        <Badge tone="warning">Lỗi</Badge>
                      ) : (
                        <Badge tone="success">OK</Badge>
                      )}
                    </td>
                    <td className="py-2 px-2">{h.result?.users ?? 0}</td>
                    <td className="py-2 px-2">{h.result?.quizQuestions ?? 0}</td>
                    <td className="py-2 px-2">{h.result?.rewards ?? 0}</td>
                    <td className="py-2 px-2">{h.result?.behavioralEvents ?? 0}</td>
                    <td className="py-2 px-2 text-xs text-red-600">
                      {h.result?.errors?.length || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function HealthItem({ label, status, ok, detail }: any) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-500" />
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">{status}</p>
      {detail && <p className="text-xs text-slate-400">{detail}</p>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
