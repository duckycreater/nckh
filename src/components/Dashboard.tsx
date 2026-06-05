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
import { Badge, Button, Card, LoadingSpinner, ModalHeader, ModalShell } from "../lib/ui";
import {
  Home,
  Compass,
  LogOut,
  Settings as SettingsIcon,
  Hammer,
  Flame,
  ScanLine,
  Trophy,
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
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setRefreshing(true);
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
      } catch {
      } finally {
        setRefreshing(false);
      }
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
    <div className="perspective-1000 flex min-h-screen items-center justify-center bg-transparent sm:p-4">
      <div className="app-shell relative flex min-h-screen w-full flex-col overflow-hidden sm:min-h-0 sm:h-[92vh] sm:max-w-md sm:rounded-[36px]">
        <div className="thin-scrollbar flex-1 overflow-y-auto pb-24">
          <div className="p-4 sm:p-5">
            {activeTab === "home" && (
              <div className="space-y-4 animate-[fadeIn_0.35s_ease-out]">
                <Card className="overflow-hidden rounded-[30px] border-0 bg-[linear-gradient(140deg,#f7fbf9,#ffffff_55%,#eef7f3)] p-0">
                  <div className="border-b border-slate-100 px-5 pb-5 pt-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge tone="success">Bảng điều khiển cá nhân</Badge>
                          <StreakBadge streakDays={user.progress?.streakDays || 1} />
                          {refreshing && <Badge tone="default">Đang làm mới</Badge>}
                        </div>
                        <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">{user.name}</h1>
                        <p className="mt-1 text-sm text-slate-500">@{user.account_id}</p>
                        <p className="mt-3 max-w-[24rem] text-sm leading-6 text-slate-500">
                          Quản lý điểm thưởng, chuỗi ngày xanh và các hoạt động đang chờ bạn hoàn thành trong hôm nay.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingProfile(user.account_id)}
                          className={`flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-gradient-to-br from-emerald-100 to-teal-100 text-2xl font-black text-emerald-600 shadow-sm transition hover:scale-[1.03] ${frameStyle ? `${frameStyle.border} ${frameStyle.shadow}` : ""}`}
                          title="Xem hồ sơ của tôi"
                          aria-label="Xem hồ sơ của tôi"
                        >
                          {avatarEmoji || user.name[0]}
                        </button>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setShowSettings(true)}
                            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                            aria-label="Mở cài đặt"
                          >
                            <SettingsIcon size={18} />
                          </button>
                          <button
                            onClick={onLogout}
                            className="rounded-full border border-red-100 bg-red-50 p-2 text-red-500 transition hover:bg-red-100"
                            aria-label="Đăng xuất"
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
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Tài nguyên hiện có</p>
                          <p className="mt-1 text-3xl font-black">{user.points} <span className="text-base text-emerald-200">EXP</span></p>
                        </div>
                        <Badge tone="accent" className="border-white/10 bg-white/10 text-white">Hành trình xanh</Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Button onClick={() => setShowScanner(true)} className="w-full" size="lg">
                        <ScanLine className="h-4 w-4" /> Quét rác ngay
                      </Button>
                      <Button onClick={() => setShowLeaderboard(true)} variant="ghost" size="lg" className="w-full">
                        <Trophy className="h-4 w-4" /> Xem bảng xếp hạng
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 px-5 py-5 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-500">Gợi ý hôm nay</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">Hoàn thành thử thách và quét thêm một món rác để tăng chuỗi xanh nhanh hơn.</p>
                    </div>
                    <div className="rounded-[22px] border border-indigo-100 bg-indigo-50/70 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Điểm nhấn</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">Kho phần thưởng, thẻ bài và mini game đều đã sẵn sàng để bạn khám phá tiếp.</p>
                    </div>
                  </div>
                </Card>

                <AdaptiveRewardBanner user={user} />
                <DailyChallenges user={user} onReward={handleEarnPoints} />
                <VirtualGarden points={user.points} onReward={handleEarnPoints} />
                <StreakCalendar userId={user.account_id} progress={user.progress} onRefresh={triggerRefresh} />
                <Minigame currentUser={user.account_id} onComplete={handleMinigameComplete} />
              </div>
            )}

            {activeTab === "cards" && (
              <Flashcards
                onReward={handleEarnPoints}
                onSpend={handleBuyOrCraft}
                points={user.points}
                userId={user.account_id}
                progress={user.progress}
                onRefresh={triggerRefresh}
              />
            )}

            {activeTab === "craft" && (
              <div className="space-y-4 animate-[fadeIn_0.35s_ease-out]">
                <CraftingStation user={user} onSpend={handleBuyOrCraft} onRefresh={triggerRefresh} />
                <RewardStore user={user} onSpend={handleBuyOrCraft} onRefresh={triggerRefresh} />
                <RewardHistory user={user} />
              </div>
            )}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200/80 bg-white/85 px-3 pb-3 pt-2 backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/${item.id}`)}
                  className={`flex flex-col items-center justify-center rounded-[22px] px-3 py-3 text-xs font-bold transition-all ${
                    active
                      ? `bg-slate-950 text-white shadow-[var(--shadow-soft)] ${item.activeColor}`
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                  aria-label={item.label}
                >
                  <Icon size={18} className={active ? "text-white" : ""} />
                  <span className="mt-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {showScanner && (
          <AIScanner
            user={user}
            onUpdatePoints={(points) => onUpdateUser({ points })}
            onClose={() => setShowScanner(false)}
          />
        )}

        {showLeaderboard && (
          <ModalShell onClose={() => setShowLeaderboard(false)} className="max-w-3xl overflow-hidden p-0" title="Bảng xếp hạng">
            <ModalHeader
              title="Bảng xếp hạng xanh"
              subtitle="Theo dõi vị trí của bạn và khám phá những người đang tạo ảnh hưởng tích cực nhất hôm nay."
              badge={<Badge tone="accent">Thành tích</Badge>}
              onClose={() => setShowLeaderboard(false)}
            />
            <div className="p-4 sm:p-6">
              <Leaderboard currentUser={user.account_id} onViewProfile={(id) => setViewingProfile(id)} />
            </div>
          </ModalShell>
        )}

        {viewingProfile && (
          <ModalShell onClose={() => setViewingProfile(null)} className="max-w-3xl overflow-hidden p-0" title="Hồ sơ người dùng">
            <ModalHeader
              title="Hồ sơ người dùng"
              subtitle="Xem tiến trình, huy hiệu và các dấu ấn cá nhân trong hành trình phân loại rác."
              badge={<Badge tone="success">Cộng đồng</Badge>}
              onClose={() => setViewingProfile(null)}
            />
            <div className="p-4 sm:p-6">
              <ProfileView profileId={viewingProfile} currentUser={user.account_id} />
            </div>
          </ModalShell>
        )}

        {showSettings && (
          <ModalShell onClose={() => setShowSettings(false)} className="max-w-3xl overflow-hidden p-0" title="Cài đặt cá nhân">
            <ModalHeader
              title="Cài đặt cá nhân"
              subtitle="Tinh chỉnh hồ sơ, bảo mật và những chi tiết hiển thị để trải nghiệm nhất quán hơn."
              badge={<Badge tone="accent">Tuỳ chỉnh</Badge>}
              onClose={() => setShowSettings(false)}
            />
            <div className="p-4 sm:p-6">
              <Settings user={user} onUpdate={onUpdateUser} />
            </div>
          </ModalShell>
        )}

        <PointsToastContainer />
      </div>
    </div>
  );
}
