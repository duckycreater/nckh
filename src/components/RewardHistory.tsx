import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Clock, Gift, ShoppingCart, BotMessageSquare, FileCheck, Zap } from "lucide-react";
import { Badge, Button, Card, EmptyState, LoadingSpinner, TabButton } from "../lib/ui";

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
}

export function RewardHistory({ userId, currentBalance }: RewardHistoryProps) {
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "earn" | "spend">("all");
  const [showAll, setShowAll] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, sumRes] = await Promise.all([
        fetch(`/api/reward-history/${userId}`),
        fetch(`/api/reward-summary/${userId}`),
      ]);
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data);
      }
      if (sumRes.ok) {
        const data = await sumRes.json();
        setSummary(data);
      }
    } catch (e) {
      console.error("[RewardHistory] Failed to load:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = transactions.filter((tx) => {
    if (filter === "all") return true;
    return tx.transaction_type === filter;
  });

  const displayTransactions = showAll ? filtered : filtered.slice(0, 8);
  const hiddenCount = Math.max(0, filtered.length - 8);

  return (
    <Card className="rounded-[28px] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-black text-slate-900">
            <Clock size={20} className="text-indigo-500" />
            Lịch sử điểm thưởng
          </h3>
          <p className="mt-1 text-sm text-slate-500">Theo dõi biến động điểm và số dư hiện tại: <span className="font-black text-emerald-600">{currentBalance}</span></p>
        </div>
        <Button onClick={loadData} disabled={loading} variant="ghost" size="sm">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      {summary && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 p-3 text-center">
            <div className="mb-1 flex items-center justify-center gap-1">
              <TrendingUp size={14} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase text-emerald-600">Kiếm được</span>
            </div>
            <div className="text-lg font-black text-emerald-600">+{summary.totalEarned}</div>
          </div>
          <div className="rounded-[22px] border border-red-100 bg-red-50 p-3 text-center">
            <div className="mb-1 flex items-center justify-center gap-1">
              <TrendingDown size={14} className="text-red-500" />
              <span className="text-[10px] font-bold uppercase text-red-600">Đã tiêu</span>
            </div>
            <div className="text-lg font-black text-red-600">-{summary.totalSpent}</div>
          </div>
          <div className={`rounded-[22px] border p-3 text-center ${summary.netChange >= 0 ? "border-blue-100 bg-blue-50" : "border-slate-100 bg-slate-50"}`}>
            <div className="mb-1 flex items-center justify-center gap-1">
              {summary.netChange > 0 ? <TrendingUp size={14} className="text-blue-500" /> : summary.netChange < 0 ? <TrendingDown size={14} className="text-slate-500" /> : <Minus size={14} className="text-slate-500" />}
              <span className={`text-[10px] font-bold uppercase ${summary.netChange >= 0 ? "text-blue-600" : "text-slate-600"}`}>Chênh lệch</span>
            </div>
            <div className={`text-lg font-black ${summary.netChange >= 0 ? "text-blue-600" : "text-slate-600"}`}>{summary.netChange >= 0 ? "+" : ""}{summary.netChange}</div>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2 rounded-[24px] bg-slate-100 p-1">
        {([
          { id: "all", label: "Tất cả" },
          { id: "earn", label: "Kiếm điểm" },
          { id: "spend", label: "Tiêu điểm" },
        ] as const).map((f) => (
          <TabButton key={f.id} active={filter === f.id} onClick={() => { setFilter(f.id); setShowAll(false); }} className="flex-1 justify-center py-2.5">
            {f.label}
          </TabButton>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải lịch sử điểm..." />
      ) : filtered.length === 0 ? (
        <EmptyState title="Chưa có giao dịch nào" subtitle="Điểm thưởng và chi tiêu của bạn sẽ hiển thị tại đây." />
      ) : (
        <>
          <div className="space-y-2">
            {displayTransactions.map((tx, i) => (
              <div key={tx.id ?? `tx-${i}`} className="flex items-center justify-between rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3 transition hover:bg-white">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${tx.transaction_type === "earn" ? "bg-emerald-100" : tx.transaction_type === "spend" ? "bg-red-100" : "bg-slate-100"}`}>
                    {tx.transaction_type === "earn" ? <TrendingUp size={14} className="text-emerald-600" /> : tx.transaction_type === "spend" ? <TrendingDown size={14} className="text-red-600" /> : <Minus size={14} className="text-slate-600" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-800">{tx.reason || (tx.transaction_type === "earn" ? "Điểm thưởng" : "Tiêu điểm")}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      {tx.source && SOURCE_ICONS[tx.source]}
                      {tx.source && <span className="capitalize">{tx.source}</span>}
                      {tx.multiplier > 1 && <Badge tone="warning">×{tx.multiplier}</Badge>}
                      <span>{formatRelativeTime(tx.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="ml-2 flex flex-shrink-0 flex-col items-end">
                  <div className={`text-sm font-black ${tx.transaction_type === "earn" ? "text-emerald-600" : "text-red-600"}`}>
                    {tx.transaction_type === "earn" ? "+" : "-"}{Math.abs(tx.amount)}
                  </div>
                  {tx.points_balance !== null && <div className="text-[10px] text-slate-400">Còn {tx.points_balance}</div>}
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
      )}
    </Card>
  );
}
