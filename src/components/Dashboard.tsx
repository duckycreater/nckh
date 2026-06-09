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
import {
  Home,
  Compass,
  User as UserIcon,
  LogOut,
  Settings as SettingsIcon,
  ArrowLeft,
  Hammer,
  Flame,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function StreakBadge({ streakDays }: { streakDays: number }) {
  const multiplier = Math.min(1 + (streakDays - 1) * 0.1, 2);
  const isActive = streakDays > 1;

  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border shadow-sm transition-all shrink-0 ${
        isActive
          ? "bg-gradient-to-r from-orange-400 to-red-500 text-white border-orange-300 shadow-orange-500/30 animate-pulse"
          : "bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-emerald-300 shadow-emerald-500/20"
      }`}
    >
      <Flame size={14} className={isActive ? "fill-current text-yellow-300" : "fill-current text-yellow-200 opacity-80"} />
      <span className="font-black">{streakDays}d</span>
      {isActive && (
        <span className="bg-white/20 px-1 rounded text-[10px] font-black">x{multiplier.toFixed(1)}</span>
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

  const validTabs = ["home", "cards", "craft"];
  const activeTab = validTabs.includes(tab || "") ? (tab as "home" | "cards" | "craft") : "home";

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      } catch (e) {}
    };
    fetchUser();
  }, [refreshTrigger, user.account_id]);

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

  return (
    <div className="flex min-h-screen sm:min-h-0 bg-gray-100 items-center justify-center sm:p-2 lg:p-4">
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white sm:rounded-3xl shadow-xl flex flex-col relative overflow-hidden"
        style={{ maxHeight: "100dvh" }}>
        {/* Header Content inside App Layout */}
        <div className="flex-1 overflow-y-auto w-full" style={{ maxHeight: "calc(100dvh - 56px)" }}>
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Header info */}
            {activeTab === "home" && (
              <div className="animate-[fadeIn_0.4s_ease-out]">
                {/* Header: Avatar + Name + Level compact row */}
                <div className="flex items-center justify-between gap-2 mb-3 mt-1">
                  {/* Left: Avatar button + Name/Level col */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      onClick={() => setViewingProfile(user.account_id)}
                      className="transition-all hover:scale-105 shrink-0"
                      title="Xem hồ sơ"
                    >
                      {avatarImage ? (
                        <img src={avatarImage} alt={user.name}
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 ${frameStyle ? frameStyle.border : "border-emerald-200"} shadow-sm`} />
                      ) : avatarEmoji ? (
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 font-black border-2 ${frameStyle ? frameStyle.border : "border-emerald-200"}`}>
                          {avatarEmoji}
                        </div>
                      ) : (
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-black bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 border-2 ${frameStyle ? frameStyle.border : "border-emerald-200"}`}>
                          {user.name[0]}
                        </div>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-emerald-800 text-sm sm:text-base font-bold truncate">{user.name}</h2>
                        <StreakBadge streakDays={user.progress?.streakDays || 1} />
                      </div>
                      {/* XP bar */}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 shrink-0">Cấp {level}</span>
                        <div className="flex-1 h-1.5 sm:h-2 bg-emerald-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                          />
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-gray-400 shrink-0 tabular-nums">{currentExp}/200</span>
                      </div>
                    </div>
                  </div>
                  {/* Right: Settings + Logout */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button onClick={() => setShowSettings(true)}
                      className="p-1.5 sm:p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 border border-gray-200 transition-all hover:scale-105">
                      <SettingsIcon size={16} />
                    </button>
                    <button onClick={onLogout}
                      className="p-1.5 sm:p-2 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 border border-red-100 transition-all hover:scale-105">
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>

                {/* Points + Actions Row */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-slate-800 rounded-lg px-2.5 py-1 flex items-center gap-1">
                      <Zap size={12} className="text-amber-400" />
                      <span className="text-xs font-black text-amber-400 tabular-nums">{user.points.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400">EXP</span>
                    </div>
                    <StreakBadge streakDays={user.progress?.streakDays || 1} />
                  </div>
                  {user.progress?.streakDays && user.progress.streakDays >= 3 && (
                    <span className="text-[9px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 animate-pulse">
                      🔥 Streak {user.progress.streakDays}ngày!
                    </span>
                  )}
                </div>

                <VirtualGarden points={user.points} />

                <StreakCalendar
                  streakDays={user.progress?.streakDays || 1}
                  lastUpdateDate={user.progress?.lastUpdateDate || new Date().toDateString()}
                />

                <AdaptiveRewardBanner userId={user.account_id} />

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setShowScanner(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    <span className="text-base">📷</span>
                    <span>AI Quét <span className="font-black">+50đ</span></span>
                  </button>
                  <button
                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    <span className="text-base">🏆</span>
                    <span>Xếp hạng</span>
                  </button>
                </div>

                {showLeaderboard && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <h4 className="font-bold text-gray-700 text-xs mb-2 flex items-center gap-1">
                      <span>🏆</span> TOP 10 CAO THỦ
                    </h4>
                    <Leaderboard
                      refreshTrigger={refreshTrigger}
                      currentUser={user.account_id}
                      onUserClick={(nickname) => setViewingProfile(nickname)}
                    />
                  </div>
                )}

                <DailyChallenges
                  onReward={handleEarnPoints}
                  userId={user.account_id}
                  progress={user.progress}
                  onRefresh={triggerRefresh}
                />

                <div className="mt-2">
                  <Minigame user={user} onComplete={handleMinigameComplete} />
                </div>
              </div>
            )}

            {activeTab === "cards" && (
              <div className="animate-[fadeIn_0.4s_ease-out]">
                <Flashcards onReward={handleEarnPoints} points={user.points} onSpend={handleBuyOrCraft} userId={user.account_id} progress={user.progress} onRefresh={triggerRefresh} />
              </div>
            )}

            {activeTab === "craft" && (
              <div className="animate-[fadeIn_0.4s_ease-out]">
                {/* Energy Core header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-3 mb-3 flex justify-between items-center shadow-lg">
                  <div>
                    <h4 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Kho Lõi Năng Lượng
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Trạng thái: Hoạt động</p>
                  </div>
                  <div className="bg-black/40 rounded-xl px-3 py-1.5 flex flex-col items-end border border-white/10">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Hiện có</span>
                    <div className="flex items-center gap-1">
                      <Zap size={14} className="text-amber-400" />
                      <span className="font-black text-amber-400 text-lg leading-none tabular-nums">{user.points.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <CraftingStation points={user.points} onCraft={handleBuyOrCraft} userId={user.account_id} progress={user.progress} onRefresh={triggerRefresh} />
                <div className="mt-2">
                  <RewardStore points={user.points} onPurchase={handleBuyOrCraft} userId={user.account_id} progress={user.progress} onRefresh={triggerRefresh} />
                  <div className="mt-2">
                    <RewardHistory userId={user.nick} currentBalance={user.points} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex-none bg-white border-t border-gray-100 flex shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-20" style={{ height: 56 }}>
          <button
            onClick={() => navigate("/home")}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${activeTab === "home" ? "text-emerald-600" : "text-gray-400 hover:text-emerald-500"}`}
          >
            {activeTab === "home" && user.progress?.streakDays && user.progress.streakDays >= 3 && (
              <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
            )}
            <motion.div animate={activeTab === "home" ? { y: [-1, -3, -1] } : {}} transition={{ duration: 0.6, repeat: activeTab === "home" ? Infinity : 0 }}>
              <Home size={20} />
            </motion.div>
            <span className="text-[9px] font-bold leading-none">Chính</span>
          </button>
          <button
            onClick={() => navigate("/cards")}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${activeTab === "cards" ? "text-teal-600" : "text-gray-400 hover:text-teal-500"}`}
          >
            <motion.div animate={activeTab === "cards" ? { y: [-1, -3, -1] } : {}} transition={{ duration: 0.6, repeat: activeTab === "cards" ? Infinity : 0 }}>
              <Compass size={20} />
            </motion.div>
            <span className="text-[9px] font-bold leading-none">Sưu tập</span>
          </button>
          <button
            onClick={() => navigate("/craft")}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${activeTab === "craft" ? "text-amber-600" : "text-gray-400 hover:text-amber-500"}`}
          >
            <motion.div animate={activeTab === "craft" ? { y: [-1, -3, -1] } : {}} transition={{ duration: 0.6, repeat: activeTab === "craft" ? Infinity : 0 }}>
              <Hammer size={20} />
            </motion.div>
            <span className="text-[9px] font-bold leading-none">Chế tạo</span>
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
          <div className="absolute inset-0 z-50 bg-white overflow-y-auto animate-[fadeIn_0.3s_ease-out]"
            style={{ maxHeight: "100dvh" }}>
            <div className="p-3 sm:p-4">
              <button
                onClick={() => setShowSettings(false)}
                className="mb-4 flex items-center gap-1.5 text-gray-500 hover:text-gray-800 font-bold text-xs bg-gray-100 px-3 py-1.5 rounded-full transition-colors"
              >
                <ArrowLeft size={14} /> Quay lại
              </button>
              <Settings user={user} onUpdate={onUpdateUser} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
