import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Clock, Gift, ShoppingCart, BotMessageSquare, FileCheck, Zap } from "lucide-react";

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
          <Clock size={20} className="text-indigo-500" />
          Lịch Sử Điểm Thưởng
        </h3>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Làm mới"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp size={14} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Kiếm được</span>
            </div>
            <div className="font-black text-emerald-600 text-lg">+{summary.totalEarned}</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown size={14} className="text-red-500" />
              <span className="text-[10px] font-bold text-red-600 uppercase">Đã tiêu</span>
            </div>
            <div className="font-black text-red-600 text-lg">-{summary.totalSpent}</div>
          </div>
          <div className={`${summary.netChange >= 0 ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100"} rounded-xl p-3 text-center border`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              {summary.netChange > 0 ? (
                <TrendingUp size={14} className="text-blue-500" />
              ) : summary.netChange < 0 ? (
                <TrendingDown size={14} className="text-gray-500" />
              ) : (
                <Minus size={14} className="text-gray-500" />
              )}
              <span className={`text-[10px] font-bold uppercase ${summary.netChange >= 0 ? "text-blue-600" : "text-gray-600"}`}>Còn lại</span>
            </div>
            <div className={`font-black text-lg ${summary.netChange >= 0 ? "text-blue-600" : "text-gray-600"}`}>
              {summary.netChange >= 0 ? "+" : ""}{summary.netChange}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 mb-3">
        {(["all", "earn", "spend"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setShowAll(false); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === f
                ? f === "earn" ? "bg-emerald-500 text-white"
                  : f === "spend" ? "bg-red-500 text-white"
                    : "bg-indigo-500 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "Tất cả" : f === "earn" ? "Kiếm điểm" : "Tiêu điểm"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <RefreshCw size={20} className="animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          Chưa có giao dịch nào
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {displayTransactions.map((tx, i) => (
              <div
                key={tx.id ?? `tx-${i}`}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    tx.transaction_type === "earn"
                      ? "bg-emerald-100"
                      : tx.transaction_type === "spend"
                        ? "bg-red-100"
                        : "bg-gray-100"
                  }`}>
                    {tx.transaction_type === "earn" ? (
                      <TrendingUp size={14} className="text-emerald-600" />
                    ) : tx.transaction_type === "spend" ? (
                      <TrendingDown size={14} className="text-red-600" />
                    ) : (
                      <Minus size={14} className="text-gray-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-800 truncate">
                      {tx.reason || (tx.transaction_type === "earn" ? "Điểm thưởng" : "Tiêu điểm")}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {tx.source && SOURCE_ICONS[tx.source]}
                      {tx.source && <span className="capitalize">{tx.source}</span>}
                      {tx.multiplier > 1 && (
                        <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">
                          ×{tx.multiplier}
                        </span>
                      )}
                      <span>{formatRelativeTime(tx.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 ml-2">
                  <div className={`font-black text-sm ${
                    tx.transaction_type === "earn" ? "text-emerald-600" : "text-red-600"
                  }`}>
                    {tx.transaction_type === "earn" ? "+" : "-"}{Math.abs(tx.amount)}
                  </div>
                  {tx.points_balance !== null && (
                    <div className="text-[10px] text-gray-400">
                      Còn {tx.points_balance}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full mt-3 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              {showAll ? "Thu gọn" : `Xem thêm ${hiddenCount} giao dịch`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
