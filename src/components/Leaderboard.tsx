import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { useTranslation } from "react-i18next";
import { Badge, Card, EmptyState, ErrorRetry, SkeletonRow, TabButton } from "../lib/ui";
import { formatNumber } from "../lib/format";
import { Minus, TrendingUp, TrendingDown, Trophy } from "lucide-react";

interface LeaderboardEntry {
  name: string;
  points: number;
  nick: string;
  score?: number;
  sessions_count?: number;
  streak_days?: number;
  improvement_pct?: number;
  eco_impact_score?: number;
  weekly_points?: number;
  monthly_points?: number;
  rank_change?: number;
  clan_id?: string;
  clan_name?: string;
}

interface Props {
  refreshTrigger: number;
  currentUser?: string;
  onUserClick?: (nickname: string) => void;
}

type LbTab = "total" | "weekly" | "monthly" | "clans";
type SortKey = "total" | "weekly" | "monthly";

const PODIUM_BG: Record<number, string> = {
  0: "from-amber-300 via-amber-200 to-amber-100",
  1: "from-slate-300 via-slate-200 to-slate-100",
  2: "from-orange-300 via-orange-200 to-orange-100",
};
const PODIUM_CROWN: Record<number, string> = {
  0: "👑",
  1: "🥈",
  2: "🥉",
};
const PODIUM_HEIGHT: Record<number, string> = {
  0: "h-32",
  1: "h-24",
  2: "h-20",
};
const PODIUM_NAME_TOP: Record<number, string> = {
  0: "-top-16",
  1: "-top-12",
  2: "-top-10",
};

export function Leaderboard({ refreshTrigger, currentUser, onUserClick }: Props) {
  const { t, i18n } = useTranslation();
  const loc = i18n.language;
  const fmt = (n: number) => formatNumber(n, loc);
  const [users, setUsers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const [activeTab, setActiveTab] = useState<LbTab>("total");
  const [clans, setClans] = useState<{ name: string; tag: string; exp: number; member_count: number }[]>([]);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const { width, height } = useWindowSize();

  const LB_TABS: { key: LbTab; label: string; emoji: string }[] = [
    { key: "total", label: t("leaderboard.total"), emoji: "🏆" },
    { key: "weekly", label: t("leaderboard.weekly"), emoji: "📅" },
    { key: "monthly", label: t("leaderboard.monthly"), emoji: "🗓️" },
    { key: "clans", label: t("leaderboard.clan"), emoji: "⚔️" },
  ];

  const sortKey: SortKey = activeTab === "clans" ? "total" : activeTab;

  useEffect(() => {
    const fetchBoard = async () => {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === "clans") {
          const res = await fetch("/api/clans");
          if (res.ok) {
            const data = await res.json();
            setClans(Array.isArray(data) ? data : []);
          } else {
            setClans([]);
          }
        } else {
          if (activeTab === "total") {
            const res = await fetch("/api/leaderboard");
            if (!res.ok) throw new Error(t("leaderboard.loadError"));
            const data = await res.json();
            setUsers(data);
          } else {
            const res = await fetch(`/api/research/leaderboard/${activeTab}`);
            if (res.ok) {
              const data = await res.json();
              setUsers(data);
            } else {
              setUsers([]);
            }
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t("common.error"));
      } finally {
        setLoading(false);
      }
    };
    fetchBoard();
  }, [refreshTrigger, refetchKey, activeTab]);

  const isTop1 = currentUser && users[0] && users[0].nick === currentUser;

  const rankedUsers = React.useMemo(() => {
    if (activeTab === "clans") return [];
    const sorted = [...users].sort((a, b) => {
      const aScore = sortKey === "total" ? a.points : sortKey === "weekly" ? a.weekly_points ?? a.score ?? 0 : a.monthly_points ?? 0;
      const bScore = sortKey === "total" ? b.points : sortKey === "weekly" ? b.weekly_points ?? b.score ?? 0 : b.monthly_points ?? 0;
      return bScore - aScore;
    });
    return sorted;
  }, [users, sortKey, activeTab]);

  const rankedClans = React.useMemo(() => {
    if (activeTab !== "clans") return [];
    return [...clans].sort((a, b) => b.exp - a.exp);
  }, [clans, activeTab]);

  useEffect(() => {
    if (rankedUsers.length > 0 && currentUser) {
      const idx = rankedUsers.findIndex((u) => u.nick === currentUser);
      setCurrentRank(idx >= 0 ? idx + 1 : null);
    } else {
      setCurrentRank(null);
    }
  }, [rankedUsers, currentUser]);

  const getScoreDisplay = (user: LeaderboardEntry) => {
    if (sortKey === "weekly") return user.weekly_points ?? user.score ?? user.points;
    if (sortKey === "monthly") return user.monthly_points ?? 0;
    return user.points;
  };

  const getScoreLabel = () => {
    if (sortKey === "weekly") return t("leaderboard.weeklyScore");
    if (sortKey === "monthly") return t("leaderboard.monthlyScore");
    return t("leaderboard.totalScore");
  };

  const getRankIcon = (change: number | undefined) => {
    if (change === undefined || change === 0) return <Minus size={14} className="text-slate-400" />;
    if (change > 0) return <TrendingUp size={14} className="text-emerald-500" />;
    return <TrendingDown size={14} className="text-red-400" />;
  };

  const RankChangeBadge = ({ change }: { change: number | undefined }) => {
    if (change === undefined || change === 0) return null;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${change > 0 ? "text-emerald-500" : "text-red-400"}`}>
        {getRankIcon(change)}
        {change > 0 ? `+${change}` : change}
      </span>
    );
  };

  const UserRow = ({ user, rank }: { user: LeaderboardEntry; rank: number }) => {
    const scoreDisplay = getScoreDisplay(user);
    const isCurrent = user.nick === currentUser;
    return (
      <div className={`flex items-center justify-between rounded-[20px] border px-4 py-3 transition-all ${isCurrent ? "border-amber-200 bg-amber-50 shadow-sm ring-2 ring-amber-100" : "border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-500">
            #{rank}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={() => onUserClick && onUserClick(user.nick)} className="truncate text-left font-bold text-slate-800 hover:text-emerald-600 hover:underline">
                {user.name}
              </button>
              {user.clan_name && (
                <span className="text-[10px] rounded-full bg-violet-100 px-2 py-0.5 font-bold text-violet-600">
                  {user.clan_name}
                </span>
              )}
              {isCurrent && <span className="text-[11px] font-bold italic text-amber-600">{t("common.you")}</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <RankChangeBadge change={user.rank_change} />
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-black text-emerald-600">
            {typeof scoreDisplay === "number" ? fmt(scoreDisplay) : scoreDisplay}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{getScoreLabel()}</p>
        </div>
      </div>
    );
  };

  const Podium = () => {
    const top3 = rankedUsers.slice(0, 3);
    if (top3.length === 0) return null;
    return (
      <div className="mb-6 flex items-end justify-center gap-3 px-4">
        {[1, 0, 2].map((pos) => {
          const user = top3[pos];
          if (!user) return <div key={pos} className="w-24" />;
          const isCurrent = user.nick === currentUser;
          return (
            <div key={pos} className={`flex w-24 flex-col items-center ${pos === 0 ? "-mb-2 z-10" : ""}`}>
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-full text-lg ${isCurrent ? "ring-4 ring-amber-300" : ""}`}>
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${PODIUM_BG[pos]}`} />
                <span className="relative z-10">{PODIUM_CROWN[pos]}</span>
              </div>
              <div className={`relative mt-1.5 ${PODIUM_NAME_TOP[pos]} flex flex-col items-center`}>
                <p className={`max-w-20 truncate text-center text-xs font-bold leading-tight ${isCurrent ? "text-amber-700" : "text-slate-600"}`}>{user.name}</p>
                <p className="text-[10px] font-black text-emerald-600">{fmt(getScoreDisplay(user))}</p>
              </div>
              <div className={`relative mt-1 w-full rounded-t-2xl rounded-b-lg bg-gradient-to-b ${PODIUM_BG[pos]} flex flex-col items-center justify-end pb-3 pt-4 ${PODIUM_HEIGHT[pos]}`}>
                <p className="text-xl font-black text-white drop-shadow-sm">{pos + 1}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">#{pos + 1}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const YourRankCard = () => {
    if (!currentUser || currentRank === null) return null;
    const restUsers = rankedUsers.slice(3);
    const myEntry = rankedUsers[currentRank - 1];
    if (!myEntry) return null;
    const nextUser = restUsers[currentRank - 4];
    const pointsToNext = nextUser ? getScoreDisplay(nextUser) - getScoreDisplay(myEntry) : 0;
    return (
      <div className="sticky bottom-0 z-20 mt-4 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-lg font-black text-white shadow">
              #{currentRank}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">{t("leaderboard.yourRank")}</p>
              <p className="text-xs text-slate-400">{t("leaderboard.yourRankInfo", { rank: currentRank, label: getScoreLabel().toLowerCase() })}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-emerald-600">{fmt(getScoreDisplay(myEntry))}</p>
            {pointsToNext > 0 && (
              <p className="text-[10px] text-slate-400">{t("leaderboard.pointsToNext", { points: fmt(pointsToNext), prevRank: currentRank - 1 })}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {isTop1 && (
        <div key="confetti-celebration" className="pointer-events-none fixed inset-0 z-50">
          <Confetti width={width} height={height} numberOfPieces={260} recycle={false} />
        </div>
      )}

      <Card className="rounded-[28px] p-0 border-0 shadow-none">
        <div className="mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {LB_TABS.map((tab) => (
            <TabButton
              key={tab.key}
              active={activeTab === tab.key}
              onClick={() => { setActiveTab(tab.key); setRefetchKey((k) => k + 1); }}
              className="shrink-0 gap-1.5 whitespace-nowrap px-4 py-2"
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </TabButton>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} className="h-16" />)}
          </div>
        ) : error ? (
          <ErrorRetry message={error} onRetry={() => setRefetchKey((k) => k + 1)} />
        ) : activeTab === "clans" ? (
          rankedClans.length === 0 ? (
            <EmptyState title={t("leaderboard.noClan")} subtitle={t("leaderboard.firstClan")} />
          ) : (
            <div className="space-y-3 py-4">
              <div className="mb-2 flex items-center gap-2 px-1">
                <Trophy size={16} className="text-amber-500" />
                <p className="text-sm font-bold text-slate-600">{t("leaderboard.clanLeaderboard")}</p>
              </div>
              {rankedClans.map((clan, index) => {
                const isTop3 = index < 3;
                return (
                  <div key={clan.tag || index} className={`flex items-center justify-between rounded-[20px] border px-4 py-3 transition ${isTop3 ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-white hover:bg-slate-50"}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${isTop3 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                        {isTop3 ? PODIUM_CROWN[index] : `#${index + 1}`}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-800">{clan.name}</p>
                        <p className="text-xs text-slate-400">{t("leaderboard.clanMembers", { tag: clan.tag, count: clan.member_count })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-violet-600">{fmt(clan.exp)}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">EXP</p>
                    </div>
                  </div>
                );
              })}
              <YourRankCard />
            </div>
          )
        ) :           rankedUsers.length === 0 ? (
            <EmptyState title={t("leaderboard.noClanData")} subtitle={t("leaderboard.firstRecord")} />
        ) : (
          <div className="space-y-3 py-4">
            <Podium />
            {rankedUsers.slice(3).map((user, i) => (
              <UserRow key={`${user.nick}-${i}`} user={user} rank={i + 4} />
            ))}
            <YourRankCard />
          </div>
        )}
      </Card>
    </>
  );
}
