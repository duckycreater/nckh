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

                <VirtualGarden points={user.points} />

                <StreakCalendar
                  streakDays={user.progress?.streakDays || 1}
                  lastUpdateDate={user.progress?.lastUpdateDate || new Date().toDateString()}
                />

                <AdaptiveRewardBanner userId={user.account_id} />

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setShowScanner(true)}
                    className="flex-1 p-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:-translate-y-1"
                  >
                    📷 AI Quét & Thưởng (+50đ)
                  </button>
                  <button
                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                    className="flex-1 p-3 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:-translate-y-1"
                  >
                    🏆 Bảng Xếp Hạng
                  </button>
                </div>

                {showLeaderboard && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-2 border-b-2 border-orange-400 inline-block">
                      TOP 10 CAO THỦ
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

                <div className="mt-4">
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
                    <RewardHistory userId={user.nick} currentBalance={user.points} />
                  </div>
                </div>
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
          <div className="absolute inset-0 z-50 bg-white overflow-y-auto animate-[fadeIn_0.3s_ease-out]">
            <div className="p-4">
              <button 
                onClick={() => setShowSettings(false)}
                className="mb-6 flex items-center text-gray-500 hover:text-gray-800 font-bold text-sm bg-gray-100 px-3 py-1.5 rounded-full"
              >
                ← Quay lại
              </button>
              <Settings user={user} onUpdate={onUpdateUser} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
