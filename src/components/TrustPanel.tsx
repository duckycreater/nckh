import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Database } from "lucide-react";
import { Card, StatusBadge } from "../lib/ui";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface FedStatus {
  bufferSize: number;
  latestVersion: { version: string; trainedOn: number; createdAt: number } | null;
}

interface FedRound {
  round_number: number;
  participants_count: number | null;
  validation_accuracy: number | null;
  dp_epsilon: number | null;
  completed_at: string | null;
  model_version_after: string | null;
}

async function safeJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function TrustPanel() {
  const [status, setStatus] = useState<FedStatus | null>(null);
  const [rounds, setRounds] = useState<FedRound[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.all([
      safeJson<FedStatus>("/api/federated/status"),
      safeJson<{ rounds: FedRound[] }>("/api/federated/rounds"),
    ]).then(([nextStatus, nextRounds]) => {
      if (!active) return;
      setStatus(nextStatus);
      setRounds(nextRounds?.rounds ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const latestRound = rounds?.[0] ?? null;
  const hasModel = Boolean(status?.latestVersion);

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-[var(--surface-muted)] text-[var(--primary)]"><Database size={19} /></span>
          <div>
            <h2 className="text-lg font-semibold">Trạng thái dữ liệu nghiên cứu</h2>
          </div>
        </div>
        <StatusBadge tone={loading ? "default" : hasModel ? "success" : "warning"}>
          {loading ? "Đang kiểm tra" : hasModel ? "Có dữ liệu" : "Chưa cấu hình"}
        </StatusBadge>
      </div>

      <dl className="mt-5 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        <EvidenceRow
          label="Phiên bản mô hình liên kết"
          value={status?.latestVersion?.version ?? "Chưa có phiên bản được công bố"}
          available={hasModel}
        />
        <EvidenceRow
          label="Số mẫu máy chủ ghi nhận"
          value={hasModel ? String(status?.latestVersion?.trainedOn ?? 0) : "Không có dữ liệu"}
          available={hasModel}
        />
        <EvidenceRow
          label="Vòng tổng hợp gần nhất"
          value={latestRound ? `#${latestRound.round_number}` : "Chưa có vòng hoàn tất"}
          available={Boolean(latestRound)}
        />
        <EvidenceRow
          label="Ngân sách riêng tư công bố"
          value={latestRound?.dp_epsilon != null ? `ε ${latestRound.dp_epsilon.toFixed(2)}` : "Chưa có dữ liệu"}
          available={latestRound?.dp_epsilon != null}
        />
      </dl>

    </Card>
  );
}

function EvidenceRow({ label, value, available }: { label: string; value: string; available: boolean }) {
  const Icon = available ? CheckCircle2 : CircleDashed;
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 py-3">
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="font-telemetry flex items-center gap-2 text-right text-xs font-semibold text-[var(--graphite)]">
        <Icon size={13} className={available ? "text-[var(--primary)]" : "text-[var(--text-muted)]"} />
        {value}
      </dd>
    </div>
  );
}
