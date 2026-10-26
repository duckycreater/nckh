import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { User, type UserProgress } from "../types";
import { Minigame } from "./Minigame";
import { VirtualGarden } from "./VirtualGarden";
import { DailyChallenges } from "./DailyChallenges";
import { AdaptiveRewardBanner } from "./AdaptiveRewardBanner";
import { MilestoneBurst, checkMilestones } from "./MilestoneBurst";
import { LevelUpCelebration } from "./LevelUpCelebration";
import { calculateLevel } from "../lib/useLevel";
import { AchievementPopup } from "./AchievementPopup";
import { SurpriseGift, STREAK_GIFT_TIERS } from "./SurpriseGift";
import type { WheelSpinResult } from "./DailyWheel";
import { saveStreakToCache } from "../lib/streakPersistence";
import { showPointsToast, PointsToastContainer } from "../lib/toast";
import { getAuthHeaders } from "../lib/auth";
import { getVietnamDayKey } from "../lib/dayKey";
import type { GameplayRewardClaim } from "../lib/gameplayRewards";
import type { MaterialCard } from "../../shared/materialCards";
import {
  ArrowRight,
  Gift,
  Layers3,
  ScanLine,
  Users,
} from "lucide-react";
import { Button, Card, ErrorRetry, PageHeader, SectionHeading, TabButton, Tabs } from "../lib/ui";
import { StudentAppShell } from "./StudentAppShell";
import { MATERIAL_LABELS, MaterialVisual } from "./MaterialVisual";

const LazyMaterialCards = lazy(() =>
  import("./MaterialCards").then((m) => ({ default: m.MaterialCards })),
);
const LazyAIScanner = lazy(() => import("./AIScanner").then((m) => ({ default: m.AIScanner })));
const LazyLeaderboard = lazy(() =>
  import("./Leaderboard").then((m) => ({ default: m.Leaderboard })),
);
const LazyRewardStore = lazy(() =>
  import("./RewardStore").then((m) => ({ default: m.RewardStore })),
);
const LazyRewardHistory = lazy(() =>
  import("./RewardHistory").then((m) => ({ default: m.RewardHistory })),
);
const LazyCraftingStation = lazy(() =>
  import("./CraftingStation").then((m) => ({ default: m.CraftingStation })),
);
const LazyProfileView = lazy(() =>
  import("./ProfileView").then((m) => ({ default: m.ProfileView })),
);
const LazySettings = lazy(() => import("./Settings").then((m) => ({ default: m.Settings })));
const LazyDailyWheel = lazy(() => import("./DailyWheel").then((m) => ({ default: m.DailyWheel })));
const LazyClanLobby = lazy(() => import("./ClanLobby").then((m) => ({ default: m.ClanLobby })));
const LazyFamilyMode = lazy(() => import("./FamilyMode").then((m) => ({ default: m.FamilyMode })));

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
  const { t } = useTranslation();
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  const validTabs = [
    "home",
    "scan",
    "cards",
    "rewards",
    "leaderboard",
    "activities",
    "profile",
    "settings",
    "family",
  ];
  const activeTab = validTabs.includes(tab || "")
    ? (tab as
        | "home"
        | "scan"
        | "cards"
        | "rewards"
        | "leaderboard"
        | "activities"
        | "profile"
        | "settings"
        | "family")
    : "home";

  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [recentCards, setRecentCards] = useState<MaterialCard[]>([]);
  const [recentCardsLoading, setRecentCardsLoading] = useState(true);
  const [recentCardsError, setRecentCardsError] = useState(false);
  const [rewardsTab, setRewardsTab] = useState<"catalog" | "history">("catalog");

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
    let cancelled = false;
    const loadRecentCards = async () => {
      setRecentCardsLoading(true);
      setRecentCardsError(false);
      try {
        const request = await fetch("/api/material-cards?limit=6", { headers: getAuthHeaders() });
        if (!request.ok) throw new Error("cards_unavailable");
        const payload = (await request.json()) as { cards?: MaterialCard[] };
        if (!cancelled) setRecentCards(Array.isArray(payload.cards) ? payload.cards : []);
      } catch {
        if (!cancelled) setRecentCardsError(true);
      } finally {
        if (!cancelled) setRecentCardsLoading(false);
      }
    };
    void loadRecentCards();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger, user.account_id]);

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

  const triggerRefresh = (updatedProgress?: UserProgress) => {
    if (updatedProgress) onUpdateUser({ progress: updatedProgress });
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleMinigameComplete = (newPoints: number) => {
    onUpdateUser({ points: newPoints });
    setRefreshTrigger((prev) => prev + 1);
  };

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

  return (
    <StudentAppShell user={user} onLogout={onLogout}>
      <div className="page-container">
        {activeTab === "home" && (
          <>
            <PageHeader
              title={t("lab.home.title", { name: user.name })}
              subtitle={t("lab.home.subtitle")}
            />

            <section className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
              <div className="relative overflow-hidden rounded-[14px] bg-[var(--graphite)] p-6 text-white sm:p-8">
                <div className="relative z-10 max-w-2xl">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{t("lab.home.scanTitle")}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#c4ccc7] sm:text-base">{t("lab.home.scanDescription")}</p>
                  <Button className="mt-6" size="lg" onClick={() => navigate("/scan")}>
                    <ScanLine size={18} /> {t("lab.home.startScan")}
                  </Button>
                </div>
              </div>
              <Card padding="lg" className="flex flex-col justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--graphite)]">{t("lab.home.nextTitle")}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t("lab.home.nextDescription")}</p>
                </div>
                <Button className="mt-6 w-full" variant="ghost" onClick={() => navigate("/activities")}>
                  {t("lab.home.nextActivity")} <ArrowRight size={16} />
                </Button>
              </Card>
            </section>

            <section>
              <Card padding="lg">
                <SectionHeading
                  title={t("lab.home.recentTitle")}
                  subtitle={t("lab.home.recentSubtitle")}
                  action={
                    <Button variant="ghost" size="sm" onClick={() => navigate("/cards")}>
                      {t("lab.home.openCollection")} <ArrowRight size={15} />
                    </Button>
                  }
                />
                {recentCardsLoading ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[0, 1, 2].map((item) => <div key={item} className="h-40 animate-pulse rounded-[10px] bg-[var(--surface-muted)]" />)}
                  </div>
                ) : recentCardsError ? (
                  <div className="mt-5">
                    <ErrorRetry message={t("lab.home.loadError")} onRetry={() => setRefreshTrigger((value) => value + 1)} />
                  </div>
                ) : recentCards.length ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {recentCards.slice(0, 6).map((card) => (
                      <button key={card.id} type="button" onClick={() => navigate("/cards")} className="group overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface)] text-left hover:border-[var(--border-strong)]">
                        <MaterialVisual category={card.category} imageUrl={card.imageUrl} objectName={card.objectName} propertyIds={card.properties.map((property) => property.id)} className="aspect-[4/3] min-h-0" />
                        <div className="p-3">
                          <p className="truncate text-sm font-semibold text-[var(--graphite)]">{card.objectName}</p>
                          <p className="mt-1 text-[11px] text-[var(--text-muted)]">{MATERIAL_LABELS[card.category]}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 flex min-h-44 flex-col items-start justify-center rounded-[10px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-6">
                    <Layers3 className="text-[var(--primary)]" size={22} />
                    <p className="mt-4 font-semibold text-[var(--graphite)]">{t("lab.home.emptyCollection")}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{t("lab.home.emptyCollectionHint")}</p>
                  </div>
                )}
              </Card>
            </section>
          </>
        )}

        {activeTab === "scan" && (
          <>
            <PageHeader title={t("lab.scan.title")} subtitle={t("lab.scan.subtitle")} />
            <Suspense fallback={<LoadingFallback message={t("common.loading")} />}>
              <LazyAIScanner
                mode="page"
                user={user}
                onClose={() => navigate("/home")}
                onUpdatePoints={(pts) => {
                  onUpdateUser({ points: pts });
                  setRefreshTrigger((prev) => prev + 1);
                }}
                onCardCreated={() => setRefreshTrigger((prev) => prev + 1)}
              />
            </Suspense>
          </>
        )}

        {activeTab === "cards" && (
          <>
            <PageHeader title={t("lab.cards.title")} subtitle={t("lab.cards.subtitle")} />
            <Suspense fallback={<LoadingFallback message={t("common.loading")} />}>
              <LazyMaterialCards actorNick={user.nick} refreshKey={refreshTrigger} onScan={() => navigate("/scan")} />
            </Suspense>
          </>
        )}

        {activeTab === "rewards" && (
          <>
            <PageHeader title={t("lab.rewards.title")} subtitle={t("lab.rewards.subtitle")} />
            <Suspense fallback={<LoadingFallback message={t("common.loading")} />}>
              <Tabs className="mb-4 w-fit">
                <TabButton active={rewardsTab === "catalog"} onClick={() => setRewardsTab("catalog")}>{t("lab.rewards.catalog")}</TabButton>
                <TabButton active={rewardsTab === "history"} onClick={() => setRewardsTab("history")}>{t("lab.rewards.history")}</TabButton>
              </Tabs>
              {rewardsTab === "catalog" ? (
                <LazyCraftingStation points={user.points} progress={user.progress} onRefresh={triggerRefresh} />
              ) : (
                <LazyRewardHistory userId={user.account_id} currentBalance={user.points} refreshKey={refreshTrigger} />
              )}
            </Suspense>
          </>
        )}

        {activeTab === "leaderboard" && (
          <>
            <PageHeader
              title={t("lab.community.title")}
              subtitle={t("lab.community.subtitle")}
              action={<Button variant="ghost" onClick={() => setShowClanLobby(true)}><Users size={16} /> {t("lab.community.openClan")}</Button>}
            />
            <Suspense fallback={<LoadingFallback message={t("common.loading")} />}>
              <LazyLeaderboard refreshTrigger={refreshTrigger} currentUser={user.account_id} onUserClick={(nickname) => setViewingProfile(nickname)} />
            </Suspense>
          </>
        )}

        {activeTab === "activities" && (
          <>
            <PageHeader
              title={t("lab.activities.title")}
              subtitle={t("lab.activities.subtitle")}
              action={
                <Button variant="soft" disabled={!dailyWheelAvailable} onClick={() => dailyWheelAvailable && setShowDailyWheel(true)}>
                  <Gift size={16} /> {dailyWheelAvailable ? t("lab.activities.claim") : t("lab.activities.claimed")}
                </Button>
              }
            />
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <DailyChallenges userId={user.account_id} progress={user.progress} onRefresh={triggerRefresh} />
                <AdaptiveRewardBanner userId={user.account_id} />
              </div>
              <div className="space-y-4 lg:col-span-5">
                <Minigame user={user} onComplete={handleMinigameComplete} />
                <VirtualGarden points={user.points} onReward={handleEarnPoints} />
              </div>
            </div>
          </>
        )}

        {activeTab === "profile" && (
          <Suspense fallback={<LoadingFallback message={t("common.loading")} />}>
            <div className="space-y-4">
              <LazyProfileView embedded nickname={user.account_id} currentUserNick={user.account_id} onClose={() => navigate("/home")} />
              <LazyRewardStore points={user.points} progress={user.progress} onRefresh={triggerRefresh} />
            </div>
          </Suspense>
        )}

        {activeTab === "settings" && (
          <>
            <PageHeader title={t("lab.settings.title")} subtitle={t("lab.settings.subtitle")} />
            <Suspense fallback={<LoadingFallback message={t("common.loading")} />}>
              <LazySettings user={user} onUpdate={onUpdateUser} />
            </Suspense>
          </>
        )}

        {activeTab === "family" && (
          <>
            <PageHeader title={t("lab.family.title")} subtitle={t("lab.family.subtitle")} />
            <Suspense fallback={<LoadingFallback message={t("common.loading")} />}>
              <LazyFamilyMode user={user} isOpen onClose={() => navigate("/home")} mode="page" />
            </Suspense>
          </>
        )}
      </div>

      <PointsToastContainer />
      <Suspense fallback={null}>
        {viewingProfile && <LazyProfileView nickname={viewingProfile} currentUserNick={user.account_id} onClose={() => setViewingProfile(null)} />}
        {showDailyWheel && <LazyDailyWheel lastSpinDate={lastWheelDate} onSpin={handleWheelSpin} onClose={() => setShowDailyWheel(false)} />}
        {showSurpriseGift && <SurpriseGift streakDays={streakDays} onClaim={handleSurpriseClaim} onClose={() => setShowSurpriseGift(null)} />}
        {showClanLobby && <LazyClanLobby userNick={user.account_id} onClose={() => setShowClanLobby(false)} />}
      </Suspense>

      {pendingMilestone && <MilestoneBurst milestone={pendingMilestone} totalExpEarned={highWaterRef.current} onComplete={() => setPendingMilestone(null)} />}
      {pendingLevelUp && <LevelUpCelebration oldLevel={pendingLevelUp.oldLevel} newLevel={pendingLevelUp.newLevel} totalExpEarned={highWaterRef.current} streakDays={user.progress?.streakDays} onClose={() => setPendingLevelUp(null)} />}
      <AchievementPopup />
    </StudentAppShell>
  );
}
