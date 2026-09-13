import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { User } from "../types";
import { formatNumber } from "../lib/format";
import { Minigame } from "./Minigame";
import { Leaderboard } from "./Leaderboard";
import { VirtualGarden } from "./VirtualGarden";
import { DailyChallenges } from "./DailyChallenges";
import { RewardStore } from "./RewardStore";
import { RewardHistory } from "./RewardHistory";
import { CraftingStation } from "./CraftingStation";
import { ProfileView } from "./ProfileView";
import { Settings } from "./Settings";
import { AdaptiveRewardBanner } from "./AdaptiveRewardBanner";
import { StreakCalendar } from "./StreakCalendar";
import { MilestoneBurst, MilestoneProgress, checkMilestones } from "./MilestoneBurst";
import { LevelUpCelebration } from "./LevelUpCelebration";
import { calculateLevel, TIER_NAMES, levelToTier } from "../lib/useLevel";
import { AchievementPopup } from "./AchievementPopup";
import { SurpriseGift, STREAK_GIFT_TIERS } from "./SurpriseGift";
import { DailyWheel, type WheelSpinResult } from "./DailyWheel";
import { PvPArena } from "./PvPArena";
import { TournamentBracket } from "./TournamentBracket";
import { ClanLobby } from "./ClanLobby";
import { saveStreakToCache } from "../lib/streakPersistence";
import { showPointsToast, PointsToastContainer } from "../lib/toast";
import { getAuthHeaders } from "../lib/auth";
import { getVietnamDayKey } from "../lib/dayKey";
import type { GameplayRewardClaim } from "../lib/gameplayRewards";
import {
  Home,
  Compass,
  LogOut,
  Settings as SettingsIcon,
  Hammer,
  Flame,
  Zap,
  Trophy,
  Camera,
  Swords,
  Users,
  Crown,
  ChevronRight,
  Gift,
  Star,
  Map as MapIcon,
} from "lucide-react";
import { motion } from "framer-motion";

const LazyFlashcards = lazy(() => import("./Flashcards").then((m) => ({ default: m.Flashcards })));
const LazyAIScanner = lazy(() => import("./AIScanner").then((m) => ({ default: m.AIScanner })));

function LoadingFallback({ message = "Đang tải..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">{message}</p>
      </div>
    </div>
  );
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (updatedUser: Partial<User>) => void;
}

export function Dashboard({ user, onLogout, onUpdateUser }: DashboardProps) {
  const { t, i18n } = useTranslation();
  const loc = i18n.language;
  const fmt = (n: number) => formatNumber(n, loc);
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  const validTabs = ["home", "cards", "craft", "leaderboard"];
  const activeTab = validTabs.includes(tab || "")
    ? (tab as "home" | "cards" | "craft" | "leaderboard")
    : "home";

  const [showScanner, setShowScanner] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [pendingMilestone, setPendingMilestone] = useState<
    import("./MilestoneBurst").MilestoneDef | null
  >(null);
  const [pendingLevelUp, setPendingLevelUp] = useState<{
    oldLevel: number;
    newLevel: number;
  } | null>(null);
  const [showDailyWheel, setShowDailyWheel] = useState(false);
  const [dailyWheelAvailable, setDailyWheelAvailable] = useState(false);
  const [showSurpriseGift, setShowSurpriseGift] = useState<
    import("./SurpriseGift").SurpriseGiftDef | null
  >(null);
  const [showPvPArena, setShowPvPArena] = useState(false);
  const [showTournament, setShowTournament] = useState(false);
  const [showClanLobby, setShowClanLobby] = useState(false);
  const [lastWheelDate, setLastWheelDate] = useState<string>("");
  const [lastGiftMilestone, setLastGiftMilestone] = useState<number>(0);

  const totalExpEarned = user.totalExpEarned ?? user.points;
  const highWaterRef = useRef<number>(totalExpEarned);
  if (totalExpEarned > highWaterRef.current) highWaterRef.current = totalExpEarned;

  const prevPointsRef = useRef<number>(highWaterRef.current);
  const prevLevelRef = useRef<number>(calculateLevel(highWaterRef.current).level);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/user/${user.account_id}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          onUpdateUser({
            points: data.points,
            totalExpEarned: data.totalExpEarned,
            name: data.name,
            progress: data.progress,
            hasPlayed: data.hasPlayed,
            selectedAvatar: data.selectedAvatar,
            selectedFrame: data.selectedFrame,
            customAvatarUrl: data.customAvatarUrl,
          });
          if (data.progress?.streakDays && data.progress?.lastUpdateDate) {
            saveStreakToCache(
              user.account_id,
              data.progress.streakDays,
              data.progress.lastUpdateDate,
            );
          }
        }
      } catch (e) {
        console.warn("[Dashboard] Failed to fetch user progress:", e);
      }
    };
    fetchUser();
  }, [refreshTrigger, user.account_id, onUpdateUser]);

  useEffect(() => {
    const totalExp = highWaterRef.current;
    const { level } = calculateLevel(totalExp);
    const oldLevel = prevLevelRef.current;
    if (level > oldLevel) {
      setPendingLevelUp({ oldLevel, newLevel: level });
      prevLevelRef.current = level;
    }
    const milestone = checkMilestones(prevPointsRef.current, totalExp);
    if (milestone.length > 0) setPendingMilestone(milestone[0]);
    prevPointsRef.current = totalExp;
  }, [totalExpEarned, user.points]);

  useEffect(() => {
    const today = getVietnamDayKey();
    const lastSpin = user.lastWheelClaimDate || localStorage.getItem("bmo:wheel:lastSpin");
    setDailyWheelAvailable(lastSpin !== today);
    setLastWheelDate(lastSpin || "");
    const localGift = parseInt(localStorage.getItem("bmo:gift:lastMilestone") || "0", 10);
    const serverGift = Math.max(0, ...(user.claimedStreakGifts ?? []));
    const lastGift = Math.max(localGift, serverGift);
    setLastGiftMilestone(lastGift);
  }, [user.claimedStreakGifts, user.lastWheelClaimDate]);

  const handleEarnPoints = async (claim: GameplayRewardClaim) => {
    try {
      const response = await fetch("/api/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(claim),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !Number.isFinite(data.points)) {
        throw new Error(data.message || "Reward request failed");
      }
      onUpdateUser({ points: data.points });
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("[Dashboard] Failed to claim reward:", error);
    }
  };

  const triggerRefresh = (updatedProgress?: any) => {
    if (updatedProgress) onUpdateUser({ progress: updatedProgress });
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleMinigameComplete = (newPoints: number) => {
    onUpdateUser({ points: newPoints });
    setRefreshTrigger((prev) => prev + 1);
  };

  const { level, currentExpInLevel, expToNextLevel, progress, tier, tierData, isMaxLevel } =
    calculateLevel(highWaterRef.current);
  const streakDays = user.progress?.streakDays ?? 0;

  const handleWheelSpin = async (): Promise<WheelSpinResult> => {
    const response = await fetch("/api/daily-wheel", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    });
    const data = await response.json();
    if (!response.ok || !data.success || !Number.isFinite(data.points)) {
      throw new Error(data.message || "Không thể quay thưởng lúc này.");
    }
    localStorage.setItem("bmo:wheel:lastSpin", data.claimDate);
    setLastWheelDate(data.claimDate);
    setDailyWheelAvailable(false);
    onUpdateUser({
      points: data.points,
      totalExpEarned: data.totalExpEarned,
      lastWheelClaimDate: data.claimDate,
    });
    showPointsToast(data.earnedPoints, 1, t("dashboard.wheelResult", { label: "Daily Wheel" }));
    return data as WheelSpinResult;
  };

  const handleSurpriseClaim = async (gift: import("./SurpriseGift").SurpriseGiftDef) => {
    try {
      const response = await fetch("/api/streak-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ milestone: gift.streakDays }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !Number.isFinite(data.points)) {
        throw new Error(data.message || "Không thể nhận quà streak lúc này.");
      }
      localStorage.setItem("bmo:gift:lastMilestone", String(gift.streakDays));
      setLastGiftMilestone(gift.streakDays);
      setShowSurpriseGift(null);
      onUpdateUser({
        points: data.points,
        totalExpEarned: data.totalExpEarned,
        claimedStreakGifts: [...(user.claimedStreakGifts ?? []), gift.streakDays],
      });
    } catch (error) {
      console.error("[Dashboard] Failed to claim streak gift:", error);
    }
  };

  useEffect(() => {
    const nextGift = STREAK_GIFT_TIERS.find(
      (g) => g.streakDays > lastGiftMilestone && streakDays >= g.streakDays,
    );
    if (nextGift) setShowSurpriseGift(nextGift);
  }, [streakDays, lastGiftMilestone]);

  function StatCard({
    label,
    value,
    icon,
    accent,
  }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    accent?: string;
  }) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 shadow-sm">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${accent || "bg-[var(--primary-soft)] text-[var(--primary)]"}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            {label}
          </p>
          <p className="font-black text-[var(--text-primary)] truncate">{value}</p>
        </div>
      </div>
    );
  }

  function ActionBtn({
    icon,
    label,
    color,
    onClick,
    disabled = false,
  }: {
    icon: React.ReactNode;
    label: string;
    color: string;
    onClick: () => void;
    disabled?: boolean;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all enabled:active:scale-95 enabled:hover:scale-105 disabled:cursor-not-allowed ${color}`}
      >
        <div>{icon}</div>
        <span className="text-[10px] font-bold leading-tight text-[var(--text-muted)] text-center">
          {label}
        </span>
      </button>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] sm:p-4 lg:p-6">
      <div className="relative flex h-screen w-full max-w-7xl flex-col overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-medium)] sm:h-[calc(100vh-2rem)] sm:rounded-3xl lg:h-[calc(100vh-3rem)]">
        {/* ── TOP BAR ── */}
        <div className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border-subtle)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setViewingProfile(user.account_id)}
              aria-label={loc.startsWith("vi") ? "Mở hồ sơ cá nhân" : "Open profile"}
              className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="w-11 h-11 rounded-2xl bg-[var(--primary-soft)] border border-[var(--primary-soft-strong)] flex items-center justify-center text-lg font-black text-[var(--primary)] shrink-0">
                {user.name[0]}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black text-[var(--text-primary)] truncate">{user.name}</p>
                  {streakDays > 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-black text-amber-600 shrink-0">
                      <Flame size={10} className="fill-amber-400 text-amber-400" />
                      {streakDays}d
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  Lv.{level} · {loc.startsWith("vi") ? tierData.full : tierData.short}
                </p>
              </div>
            </button>

            <div className="hidden max-w-[260px] flex-1 sm:block">
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                <span>EXP</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-[var(--surface-soft)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-emerald-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                aria-label={loc.startsWith("vi") ? "Mở cài đặt" : "Open settings"}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition-colors"
              >
                <SettingsIcon size={18} />
              </button>
              <button
                type="button"
                onClick={onLogout}
                aria-label={loc.startsWith("vi") ? "Đăng xuất" : "Log out"}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="flex-1 overflow-y-auto thin-scrollbar">
          <div className="space-y-4 p-4 sm:p-6">
            {/* HOME */}
            {activeTab === "home" && (
              <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
                {/* AI Scanner hero */}
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-emerald-400 p-4 text-white shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98] lg:col-span-7 lg:min-h-24"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shrink-0">
                    <Camera size={24} />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-black text-base">{t("dashboard.aiScanReward")}</p>
                    <p className="text-[11px] text-white/70">{t("dashboard.scanSubtitle")}</p>
                  </div>
                  <ChevronRight size={20} className="text-white/60 shrink-0" />
                </button>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 lg:col-span-5 lg:h-full">
                  <StatCard
                    label={t("dashboard.levelLabel")}
                    value={`Lv.${level}`}
                    icon={<Star size={16} />}
                    accent="bg-violet-50 text-violet-600"
                  />
                  <StatCard
                    label={t("dashboard.pointsLabel")}
                    value={fmt(user.points)}
                    icon={<Zap size={16} />}
                  />
                  <StatCard
                    label={t("dashboard.daysLabel")}
                    value={`${streakDays}d`}
                    icon={<Flame size={16} className="text-amber-500" />}
                    accent="bg-amber-50 text-amber-600"
                  />
                </div>

                {/* Quick actions */}
                <div className="lg:col-span-12">
                  <p className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2 px-1">
                    {t("dashboard.toolsLabel")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                    <ActionBtn
                      icon={<MapIcon size={20} className="text-cyan-600" />}
                      label={t("nav.campaign")}
                      color="bg-cyan-50 border-cyan-200"
                      onClick={() => navigate("/world-map")}
                    />
                    <ActionBtn
                      icon={<Trophy size={20} className="text-orange-500" />}
                      label={t("dashboard.leaderboard")}
                      color="bg-orange-50 border-orange-100"
                      onClick={() => navigate("/leaderboard")}
                    />
                    <ActionBtn
                      icon={<Swords size={20} className="text-red-500" />}
                      label={t("dashboard.pvpLabel")}
                      color="bg-red-50 border-red-100"
                      onClick={() => setShowPvPArena(true)}
                    />
                    <ActionBtn
                      icon={<Crown size={20} className="text-violet-500" />}
                      label={t("dashboard.tournament")}
                      color="bg-violet-50 border-violet-100"
                      onClick={() => setShowTournament(true)}
                    />
                    <ActionBtn
                      icon={<Users size={20} className="text-emerald-500" />}
                      label={t("dashboard.clanTitle")}
                      color="bg-emerald-50 border-emerald-100"
                      onClick={() => setShowClanLobby(true)}
                    />
                    <ActionBtn
                      icon={<Gift size={20} className="text-amber-500" />}
                      label={
                        dailyWheelAvailable
                          ? loc.startsWith("vi")
                            ? "Vòng quay"
                            : "Daily reward"
                          : loc.startsWith("vi")
                            ? "Đã nhận"
                            : "Claimed"
                      }
                      color={
                        dailyWheelAvailable
                          ? "bg-amber-50 border-amber-200"
                          : "bg-slate-50 border-slate-100 opacity-60"
                      }
                      disabled={!dailyWheelAvailable}
                      onClick={() => {
                        if (dailyWheelAvailable) setShowDailyWheel(true);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-4 lg:col-span-7">
                  <DailyChallenges
                    userId={user.account_id}
                    progress={user.progress}
                    onRefresh={triggerRefresh}
                  />
                  <AdaptiveRewardBanner userId={user.account_id} />
                </div>
                <div className="space-y-4 lg:col-span-5">
                  <Minigame user={user} onComplete={handleMinigameComplete} />
                  <VirtualGarden points={user.points} onReward={handleEarnPoints} />
                </div>
              </div>
            )}

            {/* CARDS */}
            {activeTab === "cards" && (
              <Suspense fallback={<LoadingFallback message="Đang tải bộ sưu tập..." />}>
                <LazyFlashcards
                  onReward={handleEarnPoints}
                  onOpenCampaign={() => navigate("/world-map")}
                  points={user.points}
                  userId={user.account_id}
                  progress={user.progress}
                  onRefresh={triggerRefresh}
                />
              </Suspense>
            )}

            {/* CRAFT */}
            {activeTab === "craft" && (
              <div className="space-y-4">
                <CraftingStation
                  points={user.points}
                  progress={user.progress}
                  onRefresh={triggerRefresh}
                />
                <RewardStore
                  points={user.points}
                  progress={user.progress}
                  onRefresh={triggerRefresh}
                />
                <RewardHistory
                  userId={user.account_id}
                  currentBalance={user.points}
                  refreshKey={refreshTrigger}
                />
              </div>
            )}

            {/* LEADERBOARD */}
            {activeTab === "leaderboard" && (
              <div>
                <button
                  onClick={() => navigate("/home")}
                  className="mb-3 flex items-center gap-1 text-[var(--primary)] text-sm font-bold hover:underline"
                >
                  ← Trang chủ
                </button>
                <Leaderboard
                  refreshTrigger={refreshTrigger}
                  currentUser={user.account_id}
                  onUserClick={(nickname) => setViewingProfile(nickname)}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM NAV ── */}
        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface)]">
          <div className="mx-auto flex w-full max-w-2xl">
            <button
              onClick={() => navigate("/home")}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${activeTab === "home" ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}
            >
              <motion.div
                animate={activeTab === "home" ? { y: [-1, -3, -1] } : {}}
                transition={{ duration: 0.6, repeat: activeTab === "home" ? Infinity : 0 }}
              >
                <Home size={20} />
              </motion.div>
              <span className="text-[10px] font-bold">{t("nav.home")}</span>
            </button>
            <button
              onClick={() => navigate("/cards")}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${activeTab === "cards" ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}
            >
              <motion.div
                animate={activeTab === "cards" ? { y: [-1, -3, -1] } : {}}
                transition={{ duration: 0.6, repeat: activeTab === "cards" ? Infinity : 0 }}
              >
                <Compass size={20} />
              </motion.div>
              <span className="text-[10px] font-bold">{t("nav.cards")}</span>
            </button>
            <button
              onClick={() => navigate("/world-map")}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-cyan-600 transition-colors"
            >
              <motion.div
                animate={{ y: [-1, -3, -1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <MapIcon size={20} />
              </motion.div>
              <span className="text-[10px] font-black">{t("nav.campaign")}</span>
            </button>
            <button
              onClick={() => navigate("/craft")}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${activeTab === "craft" ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}
            >
              <motion.div
                animate={activeTab === "craft" ? { y: [-1, -3, -1] } : {}}
                transition={{ duration: 0.6, repeat: activeTab === "craft" ? Infinity : 0 }}
              >
                <Hammer size={20} />
              </motion.div>
              <span className="text-[10px] font-bold">{t("nav.craft")}</span>
            </button>
            <button
              onClick={() => navigate("/leaderboard")}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${activeTab === "leaderboard" ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}
            >
              <motion.div
                animate={activeTab === "leaderboard" ? { y: [-1, -3, -1] } : {}}
                transition={{ duration: 0.6, repeat: activeTab === "leaderboard" ? Infinity : 0 }}
              >
                <Trophy size={20} />
              </motion.div>
              <span className="text-[10px] font-bold">{t("nav.leaderboard")}</span>
            </button>
          </div>
        </div>

        <PointsToastContainer />

        {showScanner && (
          <Suspense fallback={<LoadingFallback message={t("common.loading")} />}>
            <LazyAIScanner
              user={user}
              onClose={() => setShowScanner(false)}
              onUpdatePoints={(pts) => {
                onUpdateUser({ points: pts });
                setRefreshTrigger((prev) => prev + 1);
              }}
            />
          </Suspense>
        )}

        {viewingProfile && (
          <ProfileView
            nickname={viewingProfile}
            currentUserNick={user.account_id}
            onClose={() => setViewingProfile(null)}
          />
        )}

        {showSettings && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 z-50 bg-[var(--background)] overflow-y-auto"
          >
            <div className="p-4">
              <button
                onClick={() => setShowSettings(false)}
                className="mb-6 flex items-center gap-1 text-sm font-bold text-[var(--primary)] hover:underline"
              >
                ← Đóng
              </button>
              <Settings user={user} onUpdate={onUpdateUser} />
            </div>
          </motion.div>
        )}

        {showDailyWheel && (
          <DailyWheel
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
            currentUserNick={user.account_id}
            onClose={() => setShowTournament(false)}
          />
        )}

        {showClanLobby && (
          <ClanLobby userNick={user.account_id} onClose={() => setShowClanLobby(false)} />
        )}

        {pendingMilestone && (
          <MilestoneBurst
            milestone={pendingMilestone}
            totalExpEarned={highWaterRef.current}
            onComplete={() => setPendingMilestone(null)}
          />
        )}

        {pendingLevelUp && (
          <LevelUpCelebration
            oldLevel={pendingLevelUp.oldLevel}
            newLevel={pendingLevelUp.newLevel}
            totalExpEarned={highWaterRef.current}
            streakDays={user.progress?.streakDays}
            onClose={() => setPendingLevelUp(null)}
          />
        )}

        <AchievementPopup />
      </div>
    </div>
  );
}
