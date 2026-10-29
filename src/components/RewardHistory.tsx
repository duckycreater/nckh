import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Clock,
  Gift,
  ShoppingCart,
  BotMessageSquare,
  FileCheck,
  Zap,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorRetry, LoadingSpinner, TabButton } from "../lib/ui";
import { getAuthHeaders } from "../lib/auth";

interface RewardTransaction {
  id?: number;
  transaction_type: "earn" | "spend" | "adjustment";
  amount: number;
  reason: string | null;
  source: string | null;
  multiplier: number;
  points_balance: number | null;
  created_at: string;
}

interface RewardSummary {
  totalEarned: number;
  totalSpent: number;
  netChange: number;
  txCount: number;
}

interface RedemptionRecord {
  id: string;
  reward: { name: string };
  cost: number;
  status: "pending" | "approved" | "fulfilled" | "cancelled";
  createdAt: number;
  refundedAt: number | null;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  scan: <Zap size={14} className="text-emerald-500" />,
  quiz: <FileCheck size={14} className="text-blue-500" />,
  gameplay: <Zap size={14} className="text-yellow-500" />,
  purchase: <ShoppingCart size={14} className="text-purple-500" />,
  craft: <Gift size={14} className="text-orange-500" />,
  robot: <BotMessageSquare size={14} className="text-cyan-500" />,
  refund: <RefreshCw size={14} className="text-green-500" />,
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

interface RewardHistoryProps {
  userId: string;
  currentBalance: number;
  refreshKey?: number;
}

export function RewardHistory({ userId, currentBalance, refreshKey = 0 }: RewardHistoryProps) {
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "earn" | "spend">("all");
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txRes, sumRes, redemptionRes] = await Promise.all([
        fetch(`/api/reward-history/${userId}`, { headers: getAuthHeaders() }),
        fetch(`/api/reward-summary/${userId}`, { headers: getAuthHeaders() }),
        fetch("/api/redemptions", { headers: getAuthHeaders() }),
      ]);

      if (!txRes.ok || !sumRes.ok || !redemptionRes.ok) {
        throw new Error("Không thể tải lịch sử giao dịch.");
      }
      if ((txRes.headers.get("content-type") || "").includes("application/json")) {
        const data = await txRes.json();
        setTransactions(Array.isArray(data) ? data : []);
      } else {
        setTransactions([]);
      }

      if (sumRes.ok && (sumRes.headers.get("content-type") || "").includes("application/json")) {
        const data = await sumRes.json();
        setSummary(data);
      } else {
        setSummary(null);
      }
      const redemptionPayload = (await redemptionRes.json()) as {
        redemptions?: RedemptionRecord[];
      };
      setRedemptions(redemptionPayload.redemptions ?? []);
    } catch (e) {
      console.error("[RewardHistory] Failed to load:", e);
      setError(e instanceof Error ? e.message : "Không thể tải lịch sử giao dịch.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const filtered = transactions.filter((tx) => {
    if (filter === "all") return true;
    return tx.transaction_type === filter;
  });

  const displayTransactions = showAll ? filtered : filtered.slice(0, 8);
  const hiddenCount = Math.max(0, filtered.length - 8);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-semibold text-[var(--graphite)]">
            <Clock size={20} className="text-[var(--primary)]" />
            Lịch sử giao dịch
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Theo dõi biến động điểm và số dư hiện tại:{" "}
            <span className="font-black text-emerald-600">{currentBalance}</span>
          </p>
        </div>
        <Button onClick={loadData} disabled={loading} variant="ghost" size="sm">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      {error && <ErrorRetry message={error} onRetry={() => void loadData()} />}

      {!error && redemptions.length > 0 && (
        <section className="mb-5">
          <h4 className="text-sm font-semibold text-[var(--graphite)]">Đơn đổi quà</h4>
          <div className="mt-3 space-y-2">
            {redemptions.slice(0, 8).map((redemption) => {
              const statusLabel =
                redemption.status === "pending"
                  ? "Chờ duyệt"
                  : redemption.status === "approved"
                    ? "Đã duyệt"
                    : redemption.status === "fulfilled"
                      ? "Đã hoàn tất"
                      : "Đã hủy";
              return (
                <div
                  key={redemption.id}
                  className="flex flex-col gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--graphite)]">
                      {redemption.reward.name}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {new Date(redemption.createdAt).toLocaleString("vi-VN")} ·{" "}
                      {redemption.cost} điểm
                    </p>
                  </div>
                  <Badge
                    tone={
                      redemption.status === "fulfilled"
                        ? "success"
                        : redemption.status === "cancelled"
                          ? "warning"
                          : "default"
                    }
                  >
                    {statusLabel}
                    {redemption.refundedAt ? " · Đã hoàn điểm" : ""}
                  </Badge>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!error && summary && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-center">
            <div className="mb-1 flex items-center justify-center gap-1">
              <TrendingUp size={14} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase text-emerald-600">Kiếm được</span>
            </div>
            <div className="text-lg font-black text-emerald-600">+{summary.totalEarned}</div>
          </div>
          <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-center">
            <div className="mb-1 flex items-center justify-center gap-1">
              <TrendingDown size={14} className="text-red-500" />
              <span className="text-[10px] font-bold uppercase text-red-600">Đã tiêu</span>
            </div>
            <div className="text-lg font-black text-red-600">-{summary.totalSpent}</div>
          </div>
          <div
            className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-center"
          >
            <div className="mb-1 flex items-center justify-center gap-1">
              {summary.netChange > 0 ? (
                <TrendingUp size={14} className="text-blue-500" />
              ) : summary.netChange < 0 ? (
                <TrendingDown size={14} className="text-slate-500" />
              ) : (
                <Minus size={14} className="text-slate-500" />
              )}
              <span
                className={`text-[10px] font-bold uppercase ${summary.netChange >= 0 ? "text-blue-600" : "text-slate-600"}`}
              >
                Chênh lệch
              </span>
            </div>
            <div
              className={`text-lg font-black ${summary.netChange >= 0 ? "text-blue-600" : "text-slate-600"}`}
            >
              {summary.netChange >= 0 ? "+" : ""}
              {summary.netChange}
            </div>
          </div>
        </div>
      )}

      {!error && <div className="mb-4 flex gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1">
        {(
          [
            { id: "all", label: "Tất cả" },
            { id: "earn", label: "Kiếm điểm" },
            { id: "spend", label: "Tiêu điểm" },
          ] as const
        ).map((f) => (
          <TabButton
            key={f.id}
            active={filter === f.id}
            onClick={() => {
              setFilter(f.id);
              setShowAll(false);
            }}
            className="flex-1 justify-center py-2.5"
          >
            {f.label}
          </TabButton>
        ))}
      </div>}

      {!error && (loading ? (
        <LoadingSpinner message="Đang tải lịch sử điểm..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Chưa có giao dịch nào"
          subtitle="Điểm thưởng và chi tiêu của bạn sẽ hiển thị tại đây."
        />
      ) : (
        <>
          <div className="space-y-2">
            {displayTransactions.map((tx, i) => (
              <div
                key={tx.id ?? `tx-${i}`}
                className="flex items-center justify-between rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] ${tx.transaction_type === "earn" ? "bg-emerald-100" : tx.transaction_type === "spend" ? "bg-red-100" : "bg-slate-100"}`}
                  >
                    {tx.transaction_type === "earn" ? (
                      <TrendingUp size={14} className="text-emerald-600" />
                    ) : tx.transaction_type === "spend" ? (
                      <TrendingDown size={14} className="text-red-600" />
                    ) : (
                      <Minus size={14} className="text-slate-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-800">
                      {tx.reason || (tx.transaction_type === "earn" ? "Điểm thưởng" : "Tiêu điểm")}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      {tx.source && SOURCE_ICONS[tx.source]}
                      {tx.source && <span className="capitalize">{tx.source}</span>}
                      {tx.multiplier > 1 && <Badge tone="warning">×{tx.multiplier}</Badge>}
                      <span>{formatRelativeTime(tx.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="ml-2 flex flex-shrink-0 flex-col items-end">
                  <div
                    className={`text-sm font-black ${tx.transaction_type === "earn" ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {tx.transaction_type === "earn" ? "+" : "-"}
                    {Math.abs(tx.amount)}
                  </div>
                  {tx.points_balance !== null && (
                    <div className="text-[10px] text-slate-400">Còn {tx.points_balance}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hiddenCount > 0 && (
            <Button onClick={() => setShowAll(!showAll)} variant="ghost" className="mt-4 w-full">
              {showAll ? "Thu gọn" : `Xem thêm ${hiddenCount} giao dịch`}
            </Button>
          )}
        </>
      ))}
    </Card>
  );
}
