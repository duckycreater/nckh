import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { Skeleton, ErrorRetry, EmptyState } from "../lib/ui";

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
  { key: "total", label: "Tổng Điểm", emoji: "🏆", color: "amber" },
  { key: "weekly", label: "Tuần Này", emoji: "📅", color: "emerald" },
  { key: "consistency", label: "Kiên Trì", emoji: "🔥", color: "orange" },
  { key: "improvement", label: "Cải Thiện", emoji: "📈", color: "blue" },
  { key: "eco_impact", label: "Eco Impact", emoji: "🌿", color: "teal" },
] as const;

export function Leaderboard({ refreshTrigger, currentUser, onUserClick }: Props) {
  const [users, setUsers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const [lbType, setLbType] = useState<typeof LEADERBOARD_TYPES[number]["key"]>("total");
  const [lbTypeKey, setLbTypeKey] = useState(0);
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
  }, [refreshTrigger, refetchKey, lbType, lbTypeKey]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorRetry message={error} onRetry={() => setRefetchKey(k => k + 1)} />;
  }

  const isTop1 = currentUser && users[0] && users[0].nick === currentUser;

  const getBadge = (points: number) => {
    if (points > 200)
      return (
        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] ml-2 font-bold whitespace-nowrap border border-purple-200 shadow-sm">
          Hiệp sĩ môi trường
        </span>
      );
    if (points > 50)
      return (
        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] ml-2 font-bold whitespace-nowrap border border-blue-200">
          Người bảo vệ
        </span>
      );
    return (
      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] ml-2 font-bold whitespace-nowrap border border-green-200">
        Mầm non
      </span>
    );
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
    if (lbType === "eco_impact") return "Điểm";
    if (lbType === "weekly") return "Điểm";
    return "Điểm";
  };

  return (
    <>
      {isTop1 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <Confetti
            width={width}
            height={height}
            numberOfPieces={300}
            recycle={false}
          />
        </div>
      )}

      {/* Multi-type Tab Selector */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {LEADERBOARD_TYPES.map((type) => (
          <button
            key={type.key}
            onClick={() => { setLbType(type.key); setRefetchKey(k => k + 1); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              lbType === type.key
                ? type.key === "total" ? "bg-amber-100 text-amber-700 border border-amber-200"
                : type.key === "weekly" ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : type.key === "consistency" ? "bg-orange-100 text-orange-700 border border-orange-200"
                : type.key === "improvement" ? "bg-blue-100 text-blue-700 border border-blue-200"
                : "bg-teal-100 text-teal-700 border border-teal-200"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            <span>{type.emoji}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>}
          title="Chưa có dữ liệu"
          subtitle="Hãy là người đầu tiên ghi danh!"
        />
      ) : (
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr>
              <th className="text-left text-[#555] text-[12px] pb-[5px] border-b-[2px] border-[#eee] font-bold w-12">
                HẠNG
              </th>
              <th className="text-left text-[#555] text-[12px] pb-[5px] border-b-[2px] border-[#eee] font-bold">
                TÊN
              </th>
              <th className="text-right text-[#555] text-[12px] pb-[5px] border-b-[2px] border-[#eee] font-bold">
                {getScoreLabel().toUpperCase()}
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => {
              let rankIcon: React.ReactNode = `#${index + 1}`;
              let numClass = "";
              let bgClass = user.nick === currentUser ? "bg-amber-50" : "";

              if (index === 0) {
                rankIcon = "🥇";
                numClass = "text-[#FFD700] font-[900] text-[18px] drop-shadow-[1px_1px_0_#b8860b]";
                if (user.nick === currentUser) bgClass = "bg-yellow-100/50";
              } else if (index === 1) {
                rankIcon = "🥈";
                numClass = "text-[#C0C0C0] font-[900] text-[16px] drop-shadow-[1px_1px_0_#7f7f7f]";
              } else if (index === 2) {
                rankIcon = "🥉";
                numClass = "text-[#CD7F32] font-[900] text-[16px] drop-shadow-[1px_1px_0_#8b4513]";
              } else {
                numClass = "text-gray-500 font-bold";
              }

              const scoreDisplay = getScoreDisplay(user);

              return (
                <tr key={`${user.nick}-${index}`} className={bgClass}>
                  <td className="p-[10px_5px] border-b border-[#f0f0f0]">
                    <span className={numClass}>{rankIcon}</span>
                  </td>
                  <td className="p-[10px_5px] border-b border-[#f0f0f0] font-[500] text-gray-800">
                    <div className="flex items-center flex-wrap gap-y-1">
                      <button
                        onClick={() => onUserClick && onUserClick(user.nick)}
                        className="truncate max-w-[120px] sm:max-w-[200px] hover:text-emerald-600 hover:underline text-left"
                        title={`Xem hồ sơ của ${user.name}`}
                      >
                        {user.name}
                      </button>
                      {getBadge(lbType === "total" ? user.points : scoreDisplay as number)}
                      {user.nick === currentUser && (
                        <span className="ml-2 text-[10px] text-gray-500 italic">
                          (Bạn)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-[10px_5px] border-b border-[#f0f0f0] text-right">
                    <span className="font-bold text-[#2E7D32] float-right">
                      {typeof scoreDisplay === "number" ? (scoreDisplay > 1000 ? scoreDisplay.toLocaleString() : lbType === "improvement" ? `${scoreDisplay > 0 ? "+" : ""}${scoreDisplay.toFixed(1)}%` : scoreDisplay) : scoreDisplay}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
