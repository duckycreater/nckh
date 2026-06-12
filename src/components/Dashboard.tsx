import React, { useState, useEffect, useRef } from "react";
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
import { MilestoneBurst, MilestoneProgress, checkMilestones } from "./MilestoneBurst";
import { LevelUpCelebration } from "./LevelUpCelebration";
import { AchievementPopup } from "./AchievementPopup";
import { SurpriseGift, STREAK_GIFT_TIERS } from "./SurpriseGift";
import { DailyWheel } from "./DailyWheel";
import { PvPArena } from "./PvPArena";
import { TournamentBracket } from "./TournamentBracket";
import { ClanLobby } from "./ClanLobby";
import { saveStreakToCache } from "../lib/streakPersistence";
import { showPointsToast, PointsToastContainer } from "../lib/toast";
import {
  Home,
  Compass,
  User as UserIcon,
  LogOut,
  Settings as SettingsIcon,
  Hammer,
  Flame,
  Zap,
  Trophy,
  UserCircle,
  Camera,
  ChevronUp,
  ChevronDown,
  Swords,
  Users,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getFireLevel(streakDays: number) {
  if (streakDays >= 7) return 3;
  if (streakDays >= 4) return 2;
  if (streakDays >= 2) return 1;
  return 0;
}

function StreakBadge({ streakDays }: { streakDays: number }) {
  const multiplier = Math.min(1 + (streakDays - 1) * 0.1, 2);
  const isActive = streakDays > 1;
  const fireLevel = getFireLevel(streakDays);

  const fireConfig = {
    0: {
      bg: "bg-gradient-to-r from-slate-400 to-slate-500",
      border: "border-slate-300",
      shadow: "shadow-slate-500/20",
      iconSize: 12,
      iconClass: "text-slate-200 opacity-60",
      glow: "",
      ember: false,
      smoke: false,
    },
    1: {
      bg: "bg-gradient-to-r from-orange-400 to-amber-500",
      border: "border-orange-300",
      shadow: "shadow-orange-500/30",
      iconSize: 13,
      iconClass: "text-yellow-200",
      glow: "shadow-orange-500/40",
      ember: false,
      smoke: false,
    },
    2: {
      bg: "bg-gradient-to-r from-orange-500 to-red-500",
      border: "border-red-300",
      shadow: "shadow-red-500/40",
      iconSize: 14,
      iconClass: "text-yellow-300",
      glow: "shadow-red-500/50",
      ember: true,
      smoke: false,
    },
    3: {
      bg: "bg-gradient-to-r from-red-500 to-rose-600",
      border: "border-rose-400",
      shadow: "shadow-rose-600/50",
      iconSize: 15,
      iconClass: "text-yellow-300",
      glow: "shadow-rose-600/60",
      ember: true,
      smoke: false,
    },
  };

  const config = fireConfig[fireLevel];
  const atRisk = isActive && streakDays > 1;

  return (
    <div
      className={`relative flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border shadow-sm transition-all shrink-0 ${config.bg} ${config.border} ${atRisk ? `shadow-red-500/20 ${config.shadow}` : config.shadow} ${atRisk ? "animate-pulse" : fireLevel >= 3 ? "animate-pulse" : ""}`}
      title={
        fireLevel === 0
          ? "Bắt đầu streak ngay hôm nay!"
          : fireLevel === 3
          ? `🔥 Streak nguy hiểm! Giữ streak để nhận quà!`
          : `🔥 Streak ${streakDays} ngày - Cấp lửa ${fireLevel}`
      }
    >
      <div className={`relative ${fireLevel >= 2 ? "drop-shadow-[0_0_6px_rgba(255,100,0,0.8)]" : ""}`}>
        <Flame size={config.iconSize} className={`fill-current ${config.iconClass} ${fireLevel === 3 ? "animate-bounce" : ""}`} />
        {fireLevel === 3 && (
          <span className="absolute -top-1 -right-1 text-[6px] animate-ping opacity-70">✨</span>
        )}
      </div>
      <span className="font-black">{streakDays}d</span>
      {isActive && (
        <span className="bg-white/20 px-1 rounded text-[10px] font-black">x{multiplier.toFixed(1)}</span>
      )}
      {fireLevel === 3 && (
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-0.5 h-1 rounded-full bg-orange-400 animate-ping"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: "800ms" }}
            />
          ))}
        </div>
      )}
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

  const validTabs = ["home", "cards", "craft", "leaderboard"];
  const activeTab = validTabs.includes(tab || "") ? (tab as "home" | "cards" | "craft" | "leaderboard") : "home";

  const [showScanner, setShowScanner] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [quickAccessOpen, setQuickAccessOpen] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Dopamine system state
  const [pendingMilestone, setPendingMilestone] = useState<import("./MilestoneBurst").MilestoneDef | null>(null);
  const [pendingLevelUp, setPendingLevelUp] = useState<{ oldLevel: number; newLevel: number } | null>(null);
  const [showDailyWheel, setShowDailyWheel] = useState(false);
  const [showSurpriseGift, setShowSurpriseGift] = useState<import("./SurpriseGift").SurpriseGiftDef | null>(null);
  const [showPvPArena, setShowPvPArena] = useState(false);
  const [showTournament, setShowTournament] = useState(false);
  const [showClanLobby, setShowClanLobby] = useState(false);
  const [lastWheelDate, setLastWheelDate] = useState<string>("");
  const [lastGiftMilestone, setLastGiftMilestone] = useState<number>(0);
  const prevPointsRef = useRef(user.points);
  const prevLevelRef = useRef(Math.floor(user.points / 200));

  // Sync user state from backend occasionally
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/user/${user.account_id}`);
        if (res.ok) {
          const data = await res.json();
          onUpdateUser({ points: data.points, name: data.name, progress: data.progress, hasPlayed: data.hasPlayed, selectedAvatar: data.selectedAvatar, selectedFrame: data.selectedFrame, customAvatarUrl: data.customAvatarUrl });
          if (data.progress?.streakDays && data.progress?.lastUpdateDate) {
            saveStreakToCache(user.account_id, data.progress.streakDays, data.progress.lastUpdateDate);
          }
        }
      } catch (e) {
        console.warn('[Dashboard] Failed to fetch user progress:', e);
      }
    };
    fetchUser();
  }, [refreshTrigger, user.account_id]);

  // Check for milestone/level-up on point changes
  useEffect(() => {
    const newLevel = Math.floor(user.points / 200);
    const oldLevel = prevLevelRef.current;
    if (newLevel > oldLevel) {
      setPendingLevelUp({ oldLevel, newLevel });
      prevLevelRef.current = newLevel;
    }
    const milestone = checkMilestones(user.points, prevPointsRef.current);
    if (milestone) {
      setPendingMilestone(milestone);
    }
    prevPointsRef.current = user.points;
  }, [user.points]);

  // Check daily wheel eligibility on mount
  useEffect(() => {
    const today = new Date().toDateString();
    const lastSpin = localStorage.getItem("bmo:wheel:lastSpin");
    if (lastSpin !== today) {
      setShowDailyWheel(true);
    }
    setLastWheelDate(lastSpin || "");
    const lastGift = parseInt(localStorage.getItem("bmo:gift:lastMilestone") || "0", 10);
    setLastGiftMilestone(lastGift);
  }, []);

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

  const purchased = user.progress?.purchased || [];
  const hasPurchased = (id: string) => purchased.includes(id) || purchased.includes(Number(id));

  const AVATARS: Record<string, string> = { av1: "🌱", av2: "💧", av3: "🦁" };
  const FRAMES: Record<string, { border: string; shadow: string }> = {
    fr1: { border: "border-4 border-amber-700", shadow: "" },
    fr2: { border: "border-4 border-cyan-400", shadow: "" },
    fr3: { border: "border-4 border-emerald-500", shadow: "shadow-[0_0_12px_#10b981]" },
  };

  const avatarEmoji = user.selectedAvatar ? AVATARS[user.selectedAvatar] : null;
  const frameStyle = user.selectedFrame ? FRAMES[user.selectedFrame] : null;
  const avatarImage = user.customAvatarUrl || null;

  const settingsTransition = { duration: 0.3, ease: "easeOut" as const };

  const handleWheelSpin = (result: { label: string; amount: number }) => {
    const today = new Date().toDateString();
    localStorage.setItem("bmo:wheel:lastSpin", today);
    setShowDailyWheel(false);
    if (result.amount > 0) {
      onUpdateUser({ points: user.points + result.amount });
      fetch("/api/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: user.account_id, points: result.amount, reason: `Vòng quay: ${result.label}` }),
      }).catch(console.error);
    }
    showPointsToast(result.amount, 1, `Vòng quay: ${result.label}`);
  };

  const handleSurpriseClaim = (gift: import("./SurpriseGift").SurpriseGiftDef) => {
    localStorage.setItem("bmo:gift:lastMilestone", String(gift.streakDays));
    setLastGiftMilestone(gift.streakDays);
    setShowSurpriseGift(null);
    onUpdateUser({ points: user.points + gift.reward });
    fetch("/api/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: user.account_id, points: gift.reward, reason: `Quà streak ${gift.streakDays} ngày` }),
    }).catch(console.error);
  };

  const streakDays = user.progress?.streakDays || 1;
  useEffect(() => {
    const nextGift = STREAK_GIFT_TIERS.find((g) => g.streakDays > lastGiftMilestone && streakDays >= g.streakDays);
    if (nextGift) setShowSurpriseGift(nextGift);
  }, [streakDays, lastGiftMilestone]);

  return (
    <div className="flex h-screen bg-gray-100 items-center justify-center sm:p-4 perspective-1000">
        <div className="w-full h-full sm:h-[90vh] sm:max-w-md bg-white sm:rounded-3xl shadow-xl flex flex-col relative overflow-hidden">
        {/* Header Content inside App Layout */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="p-4 space-y-4">
            {/* Header info */}
            {activeTab === "home" && (
              <div className="animate-[fadeIn_0.4s_ease-out]">
                <div className="flex items-center justify-between mb-4 mt-2 px-2">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-emerald-800 text-xl font-bold uppercase tracking-wide truncate">
                        {user.name}
                      </h2>
                      <p className="text-[10px] text-gray-400 font-medium truncate">
                        @{user.account_id}
                      </p>
                      <StreakBadge streakDays={user.progress?.streakDays || 1} />
                    </div>
                    <div className="relative pt-1">
                      <div className="flex mb-1 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block text-emerald-600">
                            Cấp {level}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold inline-block text-gray-500">
                            {currentExp}/200 EXP
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-emerald-100 w-full relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full relative"
                        >
                          <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMCcgaGVpZ2h0PScxMCc+CiAgPHJlY3Qgd2lkdGg9JzEwJyBoZWlnaHQ9JzEwJyBmaWxsPSd0cmFuc3BhcmVudCcgLz4KICA8bGluZSB4MT0nMCcgeTE9JzEwJyB4Mj0nMTAnIHkyPScwJyBzdHJva2U9J3doaXRlJyBzdHJva2Utd2lkdGg9JzEnIG9wYWNpdHk9JzAuMyc+PC9saW5lPgo8L3N2Zz4=')] bg-repeat" />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <button
                      onClick={() => setViewingProfile(user.account_id)}
                      className="transition-all hover:scale-105"
                      title="Xem hồ sơ của tôi"
                    >
                      {avatarImage ? (
                        <img
                          src={avatarImage}
                          alt={user.name}
                          className={`w-11 h-11 rounded-full object-cover border border-emerald-200 shadow-sm ${frameStyle ? `${frameStyle.border} ${frameStyle.shadow}` : ""}`}
                        />
                      ) : avatarEmoji ? (
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center text-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 font-black border border-emerald-200 ${frameStyle ? `${frameStyle.border} ${frameStyle.shadow}` : ""}`}
                        >
                          {avatarEmoji}
                        </div>
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center text-xl font-black bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 border border-emerald-200 shadow-sm ${frameStyle ? `${frameStyle.border} ${frameStyle.shadow}` : ""}`}
                        >
                          {user.name[0]}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 border border-gray-200 shadow-sm transition-all hover:scale-105"
                    >
                      <SettingsIcon size={20} />
                    </button>
                    <button
                      onClick={onLogout}
                      className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 border border-red-100 shadow-sm transition-all hover:scale-105"
                    >
                      <LogOut size={20} />
                    </button>
                  </div>
                </div>

                <VirtualGarden points={user.points} onReward={(bonus) => handleEarnPoints(bonus)} />

                <StreakCalendar
                  streakDays={user.progress?.streakDays || 1}
                  lastUpdateDate={user.progress?.lastUpdateDate || new Date().toDateString()}
                />

                {/* Quick-access bar — collapsible */}
                <div>
                  <button
                    onClick={() => setQuickAccessOpen(!quickAccessOpen)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 hover:from-emerald-100 hover:to-teal-100 transition-all text-xs font-bold text-emerald-700"
                    aria-expanded={quickAccessOpen}
                  >
                    <span>Tiện ích nhanh</span>
                    <motion.div
                      animate={{ rotate: quickAccessOpen ? 0 : 180 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronUp size={16} />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {quickAccessOpen && (
                      <motion.div
                        key="quick-access"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center justify-around gap-2 py-2">
                          <button
                            onClick={() => navigate("/leaderboard")}
                            className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all hover:scale-105 active:scale-95 min-w-[72px]"
                            title="Bảng xếp hạng"
                          >
                            <Trophy size={18} className="text-orange-500" />
                            <span className="text-[10px] font-bold text-orange-700 leading-tight">Xếp Hạng</span>
                          </button>
                          <button
                            onClick={() => setViewingProfile(user.account_id)}
                            className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all hover:scale-105 active:scale-95 min-w-[72px]"
                            title="Hồ sơ của tôi"
                          >
                            <UserCircle size={18} className="text-blue-500" />
                            <span className="text-[10px] font-bold text-blue-700 leading-tight">Hồ Sơ</span>
                          </button>
                          <button
                            onClick={() => setShowTournament(true)}
                            className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-all hover:scale-105 active:scale-95 min-w-[72px]"
                            title="Giải đấu tuần"
                          >
                            <Trophy size={18} className="text-violet-500" />
                            <span className="text-[10px] font-bold text-violet-700 leading-tight">Giải Đấu</span>
                          </button>
                          <button
                            onClick={() => setShowPvPArena(true)}
                            className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 transition-all hover:scale-105 active:scale-95 min-w-[72px]"
                            title="PvP Arena"
                          >
                            <Swords size={18} className="text-red-500" />
                            <span className="text-[10px] font-bold text-red-700 leading-tight">PvP</span>
                          </button>
                          <button
                            onClick={() => setShowSettings(true)}
                            className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all hover:scale-105 active:scale-95 min-w-[72px]"
                            title="Cài đặt"
                          >
                            <SettingsIcon size={18} className="text-slate-500" />
                            <span className="text-[10px] font-bold text-slate-600 leading-tight">Cài Đặt</span>
                          </button>
                        </div>
                        <AdaptiveRewardBanner userId={user.account_id} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setShowScanner(true)}
                    className="flex-1 p-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:-translate-y-1"
                  >
                    <Camera className="inline-block w-4 h-4 mr-1.5" />
                    AI Quét & Thưởng (+50đ)
                  </button>
                  <button
                    onClick={() => navigate("/leaderboard")}
                    className="flex-1 p-3 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:-translate-y-1"
                  >
                    <Trophy className="inline-block w-4 h-4 mr-1.5" />
                    Bảng Xếp Hạng
                  </button>
                </div>

                {/* Competitive section */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowPvPArena(true)}
                    className="flex flex-col items-center gap-1.5 p-4 bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                      <Swords size={20} className="text-red-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">PvP Arena</span>
                    <span className="text-[10px] font-bold text-red-400">Đấu 1v1 · Cược EXP</span>
                  </button>
                  <button
                    onClick={() => setShowTournament(true)}
                    className="flex flex-col items-center gap-1.5 p-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                      <Trophy size={20} className="text-violet-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Giải Đấu Tuần</span>
                    <span className="text-[10px] font-bold text-violet-400">Top 8 · Phần thưởng lớn</span>
                  </button>
                  <button
                    onClick={() => setShowClanLobby(true)}
                    className="flex flex-col items-center gap-1.5 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <Users size={20} className="text-emerald-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Clan</span>
                    <span className="text-[10px] font-bold text-emerald-400">Cộng đồng · Đóng góp</span>
                  </button>
                </div>
              </div>
            )}

            <DailyChallenges
              onReward={handleEarnPoints}
              userId={user.account_id}
              progress={user.progress}
              onRefresh={triggerRefresh}
            />

            <div className="mt-4">
              <Minigame user={user} onComplete={handleMinigameComplete} />
            </div>

            {activeTab === "cards" && (
              <div className="animate-[fadeIn_0.4s_ease-out]">
                <Flashcards onReward={handleEarnPoints} points={user.points} onSpend={handleBuyOrCraft} userId={user.account_id} progress={user.progress} onRefresh={triggerRefresh} />
              </div>
            )}

            {activeTab === "craft" && (
              <div className="animate-[fadeIn_0.4s_ease-out]">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100 mb-4 flex justify-between items-center shadow-sm">
                  <div>
                    <h4 className="font-black text-emerald-900 text-lg uppercase tracking-wide">Kho Lõi Năng Lượng</h4>
                    <p className="text-xs font-bold text-emerald-600/70 uppercase">Trạng thái: Đang hoạt động</p>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-emerald-100 flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Hiện có</span>
                    <span className="font-black text-emerald-600 text-xl">{user.points} <span className="text-sm">EXP</span></span>
                  </div>
                </div>
                <CraftingStation points={user.points} onCraft={handleBuyOrCraft} userId={user.account_id} progress={user.progress} onRefresh={triggerRefresh} />
                <div className="mt-4">
                  <RewardStore points={user.points} onPurchase={handleBuyOrCraft} userId={user.account_id} progress={user.progress} onRefresh={triggerRefresh} />
                  <div className="mt-4">
                    <RewardHistory userId={user.account_id} currentBalance={user.points} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "leaderboard" && (
              <div className="animate-[fadeIn_0.4s_ease-out]">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => navigate("/home")}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-bold"
                  >
                    ← Quay lại
                  </button>
                </div>
                <Leaderboard
                  refreshTrigger={refreshTrigger}
                  currentUser={user.account_id}
                  onUserClick={(nickname) => setViewingProfile(nickname)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 flex shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-20">
          <button
            onClick={() => navigate("/home")}
            className={`flex-1 flex flex-col items-center justify-center p-3 transition-colors relative ${activeTab === "home" ? "text-emerald-600" : "text-gray-400 hover:text-emerald-500"}`}
          >
            {activeTab === "home" && user.progress?.streakDays && user.progress.streakDays >= 3 && (
              <span className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            )}
            <motion.div
              animate={activeTab === "home" ? { y: [-1, -4, -1] } : {}}
              transition={{ duration: 0.6, repeat: activeTab === "home" ? Infinity : 0 }}
            >
              <Home size={22} />
            </motion.div>
            <span className="text-[10px] font-bold mt-0.5">Chính</span>
          </button>
          <button
            onClick={() => navigate("/cards")}
            className={`flex-1 flex flex-col items-center justify-center p-3 transition-colors ${activeTab === "cards" ? "text-teal-600" : "text-gray-400 hover:text-teal-500"}`}
          >
            <motion.div
              animate={activeTab === "cards" ? { y: [-1, -4, -1] } : {}}
              transition={{ duration: 0.6, repeat: activeTab === "cards" ? Infinity : 0 }}
            >
              <Compass size={22} />
            </motion.div>
            <span className="text-[10px] font-bold mt-0.5">Sưu tập</span>
          </button>
          <button
            onClick={() => navigate("/craft")}
            className={`flex-1 flex flex-col items-center justify-center p-3 transition-colors ${activeTab === "craft" ? "text-amber-600" : "text-gray-400 hover:text-amber-500"}`}
          >
            <motion.div
              animate={activeTab === "craft" ? { y: [-1, -4, -1] } : {}}
              transition={{ duration: 0.6, repeat: activeTab === "craft" ? Infinity : 0 }}
            >
              <Hammer size={22} />
            </motion.div>
            <span className="text-[10px] font-bold mt-0.5">Chế tạo</span>
          </button>
          <button
            onClick={() => navigate("/leaderboard")}
            className={`flex-1 flex flex-col items-center justify-center p-3 transition-colors ${activeTab === "leaderboard" ? "text-orange-600" : "text-gray-400 hover:text-orange-500"}`}
          >
            <Trophy size={22} />
            <span className="text-[10px] font-bold mt-0.5">Hạng</span>
          </button>
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
          <ProfileView 
            nickname={viewingProfile} 
            onClose={() => setViewingProfile(null)} 
          />
        )}

        {showSettings && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={settingsTransition}
            className="absolute inset-0 z-50 bg-white overflow-y-auto"
          >
            <div className="p-4">
              <button
                onClick={() => setShowSettings(false)}
                className="mb-6 flex items-center text-gray-500 hover:text-gray-800 font-bold text-sm bg-gray-100 px-3 py-1.5 rounded-full"
              >
                ← Quay lại
              </button>
              <Settings user={user} onUpdate={onUpdateUser} />
            </div>
          </motion.div>
        )}

        {showDailyWheel && (
          <DailyWheel
            userId={user.account_id}
            lastSpinDate={lastWheelDate}
            onSpin={handleWheelSpin}
            onClose={() => setShowDailyWheel(false)}
          />
        )}

        {showSurpriseGift && (
          <SurpriseGift
            streakDays={streakDays}
            onClaim={handleSurpriseClaim}
            onClose={() => setShowSurpriseGift(null)}
          />
        )}

        {showPvPArena && (
          <PvPArena
            currentUserNick={user.name}
            onClose={() => setShowPvPArena(false)}
            onBattle={() => setShowPvPArena(false)}
          />
        )}

        {showTournament && (
          <TournamentBracket
            currentUserNick={user.name}
            onClose={() => setShowTournament(false)}
          />
        )}

        {showClanLobby && (
          <ClanLobby
            userNick={user.name}
            onClose={() => setShowClanLobby(false)}
          />
        )}

        {pendingMilestone && (
          <MilestoneBurst
            milestone={pendingMilestone}
            newPoints={user.points}
            oldPoints={prevPointsRef.current - pendingMilestone.bonus}
            onComplete={() => setPendingMilestone(null)}
          />
        )}

        {pendingLevelUp && (
          <LevelUpCelebration
            oldLevel={pendingLevelUp.oldLevel}
            newLevel={pendingLevelUp.newLevel}
            streakDays={streakDays}
            onClose={() => setPendingLevelUp(null)}
          />
        )}

        <AchievementPopup />
      </div>
    </div>
  );
}
