import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User } from "../types";
import { Minigame } from "./Minigame";
import { Leaderboard } from "./Leaderboard";
import { AIScanner } from "./AIScanner";
import { VirtualGarden } from "./VirtualGarden";
import { DailyChallenges } from "./DailyChallenges";
import { RewardStore } from "./RewardStore";
import { RewardHistory } from "./RewardHistory";
import { Flashcards } from "./Flashcards";
import { CraftingStation } from "./CraftingStation";
import { ProfileView } from "./ProfileView";
import { Settings } from "./Settings";
import { AdaptiveRewardBanner } from "./AdaptiveRewardBanner";
import { StreakCalendar } from "./StreakCalendar";
import { saveStreakToCache } from "../lib/streakPersistence";
import { PointsToastContainer } from "../lib/toast";
import { Badge, Button, Card, ModalShell } from "../lib/ui";
import {
  Home,
  Compass,
  LogOut,
  Settings as SettingsIcon,
  Hammer,
  Flame,
  ScanLine,
  Trophy,
  ChevronLeft,
} from "lucide-react";
import { motion } from "framer-motion";

function StreakBadge({ streakDays }: { streakDays: number }) {
  const multiplier = Math.min(1 + (streakDays - 1) * 0.1, 2);
  const isActive = streakDays > 1;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm transition-all ${
        isActive
          ? "border-orange-200 bg-orange-50 text-orange-600"
          : "border-emerald-100 bg-emerald-50 text-emerald-700"
      }`}
    >
      <Flame size={14} className={isActive ? "fill-current text-orange-400" : "fill-current text-emerald-500"} />
      <span>{streakDays} ngày</span>
      {isActive && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px]">x{multiplier.toFixed(1)}</span>}
    </div>
  );
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (updatedUser: Partial<User>) => void;
}

export function Dashboard({ user, onLogout, onUpdateUser }: DashboardProps) {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  const validTabs = ["home", "cards", "craft"];
  const activeTab = validTabs.includes(tab || "") ? (tab as "home" | "cards" | "craft") : "home";

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/user/${user.account_id}`);
        if (res.ok) {
          const data = await res.json();
          onUpdateUser({
            points: data.points,
            name: data.name,
            progress: data.progress,
            hasPlayed: data.hasPlayed,
            selectedAvatar: data.selectedAvatar,
            selectedFrame: data.selectedFrame,
          });
          if (data.progress?.streakDays && data.progress?.lastUpdateDate) {
            saveStreakToCache(user.account_id, data.progress.streakDays, data.progress.lastUpdateDate);
          }
        }
      } catch {}
    };
    fetchUser();
  }, [refreshTrigger, user.account_id, onUpdateUser]);

  const handleEarnPoints = (newPointsOffset: number) => {
    onUpdateUser({ points: user.points + newPointsOffset });
    fetch("/api/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: user.account_id,
        points: newPointsOffset,
        reason: "Hoàn thành thử thách xanh",
      }),
    })
      .then(() => setRefreshTrigger((prev) => prev + 1))
      .catch(console.error);
  };

  const triggerRefresh = (updatedProgress?: any) => {
    if (updatedProgress) {
      onUpdateUser({ progress: updatedProgress });
    }
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleBuyOrCraft = (cost: number, reason: string = "Tiêu điểm chế tạo/đổi quà") => {
    onUpdateUser({ points: user.points - cost });
    fetch("/api/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: user.account_id, points: -cost, reason }),
    })
      .then(() => setRefreshTrigger((prev) => prev + 1))
      .catch(console.error);
  };

  const handleMinigameComplete = (newPoints: number) => {
    onUpdateUser({ points: newPoints });
    setRefreshTrigger((prev) => prev + 1);
  };

  const calculateLevel = (points: number) => {
    const level = Math.floor(points / 200) + 1;
    const currentExp = points % 200;
    const progress = (currentExp / 200) * 100;
    return { level, currentExp, progress };
  };

  const { level, currentExp, progress } = calculateLevel(user.points);

  const AVATARS: Record<string, string> = { av1: "🌱", av2: "💧", av3: "🦁" };
  const FRAMES: Record<string, { border: string; shadow: string }> = {
    fr1: { border: "border-4 border-amber-700", shadow: "" },
    fr2: { border: "border-4 border-cyan-400", shadow: "" },
    fr3: { border: "border-4 border-emerald-500", shadow: "shadow-[0_0_12px_#10b981]" },
  };

  const avatarEmoji = user.selectedAvatar ? AVATARS[user.selectedAvatar] : null;
  const frameStyle = user.selectedFrame ? FRAMES[user.selectedFrame] : null;

  const navItems = [
    { id: "home", label: "Chính", icon: Home, activeColor: "text-emerald-600" },
    { id: "cards", label: "Sưu tập", icon: Compass, activeColor: "text-indigo-600" },
    { id: "craft", label: "Chế tạo", icon: Hammer, activeColor: "text-amber-600" },
  ] as const;

  return (
    <div className="perspective-1000 flex h-screen items-center justify-center bg-transparent sm:p-4">
      <div className="app-shell relative flex h-full w-full flex-col overflow-hidden sm:h-[92vh] sm:max-w-md sm:rounded-[36px]">
        <div className="thin-scrollbar flex-1 overflow-y-auto pb-24">
          <div className="p-4 sm:p-5">
            {activeTab === "home" && (
              <div className="animate-[fadeIn_0.35s_ease-out] space-y-4">
                <Card className="overflow-hidden rounded-[30px] border-0 bg-[linear-gradient(140deg,#f7fbf9,#ffffff_55%,#eef7f3)] p-0">
                  <div className="border-b border-slate-100 px-5 pb-5 pt-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge tone="success">Bảng điều khiển cá nhân</Badge>
                          <StreakBadge streakDays={user.progress?.streakDays || 1} />
                        </div>
                        <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">{user.name}</h1>
                        <p className="mt-1 text-sm text-slate-500">@{user.account_id}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingProfile(user.account_id)}
                          className={`flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-gradient-to-br from-emerald-100 to-teal-100 text-2xl font-black text-emerald-600 shadow-sm transition hover:scale-[1.03] ${frameStyle ? `${frameStyle.border} ${frameStyle.shadow}` : ""}`}
                          title="Xem hồ sơ của tôi"
                        >
                          {avatarEmoji || user.name[0]}
                        </button>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setShowSettings(true)}
                            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                          >
                            <SettingsIcon size={18} />
                          </button>
                          <button
                            onClick={onLogout}
                            className="rounded-full border border-red-100 bg-red-50 p-2 text-red-500 transition hover:bg-red-100"
                          >
                            <LogOut size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[24px] bg-slate-950 p-4 text-white shadow-[var(--shadow-soft)]">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-bold text-emerald-200">Cấp {level}</span>
                        <span className="text-slate-300">{currentExp}/200 EXP</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
                        />
                      </div>
                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Tài nguyên hiện có</p>
                          <p className="mt-1 text-3xl font-black">{user.points} <span className="text-base text-emerald-200">EXP</span></p>
                        </div>
                        <Badge tone="accent" className="bg-white/10 text-white border-white/10">Hành trình xanh</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 px-5 py-5 sm:grid-cols-2">
                    <Button onClick={() => setShowScanner(true)} size="lg" className="w-full justify-center">
                      <ScanLine className="h-4 w-4" />
                      AI Quét & thưởng
                    </Button>
                    <Button onClick={() => setShowLeaderboard((prev) => !prev)} size="lg" variant="ghost" className="w-full justify-center">
                      <Trophy className="h-4 w-4" />
                      {showLeaderboard ? "Ẩn bảng xếp hạng" : "Xem bảng xếp hạng"}
                    </Button>
                  </div>
                </Card>

                <VirtualGarden points={user.points} />
                <StreakCalendar
                  streakDays={user.progress?.streakDays || 1}
                  lastUpdateDate={user.progress?.lastUpdateDate || new Date().toDateString()}
                />
                <AdaptiveRewardBanner userId={user.account_id} />

                {showLeaderboard && (
                  <Card className="rounded-[28px] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-900">Bảng xếp hạng</p>
                        <p className="text-xs text-slate-500">Theo dõi vị trí hiện tại và các người chơi nổi bật.</p>
                      </div>
                      <Badge tone="warning">Top 10</Badge>
                    </div>
                    <Leaderboard
                      refreshTrigger={refreshTrigger}
                      currentUser={user.account_id}
                      onUserClick={(nickname) => setViewingProfile(nickname)}
                    />
                  </Card>
                )}

                <DailyChallenges
                  onReward={handleEarnPoints}
                  userId={user.account_id}
                  progress={user.progress}
                  onRefresh={triggerRefresh}
                />

                <Minigame user={user} onComplete={handleMinigameComplete} />
              </div>
            )}

            {activeTab === "cards" && (
              <div className="animate-[fadeIn_0.35s_ease-out] min-h-[60vh]">
                <Flashcards onReward={handleEarnPoints} points={user.points} onSpend={handleBuyOrCraft} userId={user.account_id} progress={user.progress} onRefresh={triggerRefresh} />
              </div>
            )}

            {activeTab === "craft" && (
              <div className="animate-[fadeIn_0.35s_ease-out] min-h-[60vh] space-y-4">
                <Card className="rounded-[28px] border-0 bg-[linear-gradient(140deg,#f8fafc,#eef8f3)] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Badge tone="success">Kho năng lượng</Badge>
                      <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900">Tích luỹ và sử dụng EXP</h3>
                      <p className="mt-1 text-sm text-slate-500">Đổi thưởng, chế tạo và theo dõi lịch sử giao dịch của bạn.</p>
                    </div>
                    <div className="rounded-[24px] border border-emerald-100 bg-white px-4 py-3 text-right shadow-sm">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Hiện có</p>
                      <p className="mt-1 text-2xl font-black text-emerald-600">{user.points} <span className="text-sm text-emerald-400">EXP</span></p>
                    </div>
                  </div>
                </Card>

                <CraftingStation points={user.points} onCraft={handleBuyOrCraft} userId={user.account_id} progress={user.progress} onRefresh={triggerRefresh} />
                <RewardStore points={user.points} onPurchase={handleBuyOrCraft} userId={user.account_id} progress={user.progress} onRefresh={triggerRefresh} />
                <RewardHistory userId={user.account_id} currentBalance={user.points} />
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/92 px-3 py-2 backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/${item.id}`)}
                  className={`relative flex flex-col items-center justify-center rounded-[22px] px-3 py-3 text-[11px] font-bold transition-all ${
                    active ? `${item.activeColor} bg-slate-50` : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {active && item.id === "home" && user.progress?.streakDays && user.progress.streakDays >= 3 && (
                    <span className="absolute right-4 top-3 h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                  )}
                  <motion.div animate={active ? { y: [-1, -4, -1] } : { y: 0 }} transition={{ duration: 0.6, repeat: active ? Infinity : 0 }}>
                    <Icon size={20} />
                  </motion.div>
                  <span className="mt-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <PointsToastContainer />

        {showScanner && (
          <AIScanner
            user={user}
            onClose={() => setShowScanner(false)}
            onUpdatePoints={(pts) => {
              onUpdateUser({ points: pts });
              setRefreshTrigger((prev) => prev + 1);
            }}
          />
        )}

        {viewingProfile && (
          <ProfileView nickname={viewingProfile} onClose={() => setViewingProfile(null)} />
        )}

        {showSettings && (
          <ModalShell onClose={() => setShowSettings(false)} className="max-h-[92vh] max-w-4xl overflow-y-auto p-0">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/92 px-5 py-4 backdrop-blur-sm">
              <button
                onClick={() => setShowSettings(false)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
              >
                <ChevronLeft size={16} />
                Quay lại
              </button>
              <div>
                <p className="text-lg font-black text-slate-900">Cài đặt cá nhân</p>
                <p className="text-xs text-slate-500">Tinh chỉnh hồ sơ và bảo mật tài khoản.</p>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <Settings user={user} onUpdate={onUpdateUser} />
            </div>
          </ModalShell>
        )}
      </div>
    </div>
  );
}
