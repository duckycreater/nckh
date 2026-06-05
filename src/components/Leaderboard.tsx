import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { Badge, Button, Card, EmptyState, ErrorRetry, SkeletonRow, TabButton } from "../lib/ui";

interface LeaderboardEntry {
  name: string;
  points: number;
  nick: string;
  score?: number;
  sessions_count?: number;
  streak_days?: number;
  improvement_pct?: number;
  eco_impact_score?: number;
}

interface Props {
  refreshTrigger: number;
  currentUser?: string;
  onUserClick?: (nickname: string) => void;
}

const LEADERBOARD_TYPES = [
  { key: "total", label: "Tổng điểm", emoji: "🏆" },
  { key: "weekly", label: "Tuần này", emoji: "📅" },
  { key: "consistency", label: "Kiên trì", emoji: "🔥" },
  { key: "improvement", label: "Cải thiện", emoji: "📈" },
  { key: "eco_impact", label: "Eco Impact", emoji: "🌿" },
] as const;

export function Leaderboard({ refreshTrigger, currentUser, onUserClick }: Props) {
  const [users, setUsers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const [lbType, setLbType] = useState<typeof LEADERBOARD_TYPES[number]["key"]>("total");
  const { width, height } = useWindowSize();

  useEffect(() => {
    const fetchBoard = async () => {
      setLoading(true);
      setError(null);
      try {
        if (lbType === "total") {
          const res = await fetch("/api/leaderboard");
          if (!res.ok) throw new Error("Không thể tải bảng xếp hạng");
          const data = await res.json();
          setUsers(data);
        } else {
          const res = await fetch(`/api/research/leaderboard/${lbType}`);
          if (res.ok) {
            const data = await res.json();
            setUsers(data);
          } else {
            setUsers([]);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    };
    fetchBoard();
  }, [refreshTrigger, refetchKey, lbType]);

  const isTop1 = currentUser && users[0] && users[0].nick === currentUser;

  const getBadge = (points: number) => {
    if (points > 200) return <Badge tone="accent">Hiệp sĩ môi trường</Badge>;
    if (points > 50) return <Badge tone="success">Người bảo vệ</Badge>;
    return <Badge>Mầm non</Badge>;
  };

  const getScoreDisplay = (user: LeaderboardEntry) => {
    if (lbType === "consistency") return user.streak_days || 0;
    if (lbType === "improvement") return user.improvement_pct || 0;
    if (lbType === "eco_impact") return user.eco_impact_score || 0;
    if (lbType === "weekly") return user.score || user.points;
    return user.points;
  };

  const getScoreLabel = () => {
    if (lbType === "consistency") return "Ngày";
    if (lbType === "improvement") return "%";
    return "Điểm";
  };

  return (
    <>
      {isTop1 && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <Confetti width={width} height={height} numberOfPieces={260} recycle={false} />
        </div>
      )}

      <Card className="rounded-[28px] p-0 border-0 shadow-none">
        <div className="border-b border-slate-100 px-0 pb-4">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {LEADERBOARD_TYPES.map((type) => (
              <TabButton key={type.key} active={lbType === type.key} onClick={() => { setLbType(type.key); setRefetchKey((k) => k + 1); }} className="shrink-0 gap-1.5 px-4 py-2.5 whitespace-nowrap">
                <span>{type.emoji}</span>
                <span>{type.label}</span>
              </TabButton>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} className="h-16" />)}
          </div>
        ) : error ? (
          <ErrorRetry message={error} onRetry={() => setRefetchKey((k) => k + 1)} />
        ) : users.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu" subtitle="Hãy là người đầu tiên ghi danh!" />
        ) : (
          <div className="space-y-3 py-4">
            {users.map((user, index) => {
              const scoreDisplay = getScoreDisplay(user);
              const isCurrent = user.nick === currentUser;
              const rankLabel = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;

              return (
                <div key={`${user.nick}-${index}`} className={`flex items-center justify-between rounded-[24px] border px-4 py-3 transition ${isCurrent ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-white hover:bg-slate-50"}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${index === 0 ? "bg-yellow-100 text-yellow-700" : index === 1 ? "bg-slate-100 text-slate-600" : index === 2 ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500"}`}>
                      {rankLabel}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => onUserClick && onUserClick(user.nick)} className="truncate text-left font-bold text-slate-800 hover:text-emerald-600 hover:underline" title={`Xem hồ sơ của ${user.name}`}>
                          {user.name}
                        </button>
                        {getBadge(lbType === "total" ? user.points : (scoreDisplay as number))}
                        {isCurrent && <span className="text-[11px] font-bold italic text-slate-500">(Bạn)</span>}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{typeLabel(lbType)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-600">{typeof scoreDisplay === "number" ? lbType === "improvement" ? `${scoreDisplay > 0 ? "+" : ""}${scoreDisplay.toFixed(1)}%` : scoreDisplay.toLocaleString() : scoreDisplay}</p>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{getScoreLabel()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}

function typeLabel(type: typeof LEADERBOARD_TYPES[number]["key"]) {
  if (type === "total") return "Xếp hạng theo tổng điểm";
  if (type === "weekly") return "Xếp hạng theo điểm tuần";
  if (type === "consistency") return "Xếp hạng theo streak";
  if (type === "improvement") return "Xếp hạng theo mức cải thiện";
  return "Xếp hạng theo tác động sinh thái";
}
