/**
 * BMO Care — Virtual Pet React Component
 *
 * Hiển thị BMO với trạng thái mood, accessories,
 * và mood history chart.
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Sparkles, Star, Lock, ChevronRight, TrendingUp,
  Smile, Frown, Meh, Zap,
} from "lucide-react";

function getMoodEmoji(level: string): string {
  switch (level) {
    case "excited": return "💖";
    case "happy": return "😊";
    case "neutral": return "😐";
    case "sad": return "🥺";
    case "critical": return "💔";
    default: return "😐";
  }
}

function getMoodColor(level: string): string {
  switch (level) {
    case "excited": return "#f43f5e";
    case "happy": return "#22c55e";
    case "neutral": return "#eab308";
    case "sad": return "#f97316";
    case "critical": return "#ef4444";
    default: return "#94a3b8";
  }
}

function getMoodLabel(level: string, t: (key: string) => string): string {
  switch (level) {
    case "excited": return t("bmoCare.moodExcited");
    case "happy": return t("bmoCare.moodHappy");
    case "neutral": return t("bmoCare.moodNeutral");
    case "sad": return t("bmoCare.moodSad");
    case "critical": return t("bmoCare.moodCritical");
    default: return t("bmoCare.moodNeutral");
  }
}

function getAccessoryEmoji(id: string): string {
  const map: Record<string, string> = {
    crown: "👑",
    sunglasses: "🕶️",
    hat_blue: "🧢",
    bowtie: "🎀",
    halo: "😇",
    cape: "🦸",
    crystal: "💎",
  };
  return map[id] || "🎁";
}

interface BmoCareDisplayProps {
  userId: string;
  onClose?: () => void;
}

export function BmoCareDisplay({ userId, onClose }: BmoCareDisplayProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"status" | "accessories" | "history">("status");

  useEffect(() => {
    fetch(`/api/bmo-care/${userId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-sm text-slate-500">
        {t("bmoCare.errorLoading")}
      </div>
    );
  }

  const { moodLevel, moodScore, unlockedAccessories, availableAccessories, nextUnlock, moodHistory } = data;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-2xl">🤖</div>
          <div>
            <h3 className="font-black text-[var(--text-primary)]">BMO</h3>
            <p className="text-xs text-[var(--text-muted)]">{t("bmoCare.title")}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
            <ChevronRight size={18} className="text-slate-400 rotate-90" />
          </button>
        )}
      </div>

      {/* BMO Avatar */}
      <div className="relative flex flex-col items-center">
        <motion.div
          animate={
            moodLevel === "excited" ? { scale: [1, 1.1, 1], rotate: [-2, 2, 0] } :
            moodLevel === "happy" ? { scale: [1, 1.05, 1] } :
            moodLevel === "sad" ? { y: [0, 2, 0] } :
            {}
          }
          transition={{ duration: 2, repeat: moodLevel === "excited" || moodLevel === "happy" ? Infinity : 0 }}
          className="relative w-28 h-28 rounded-3xl flex items-center justify-center text-6xl shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${getMoodColor(moodLevel)}30, ${getMoodColor(moodLevel)}10)`,
            border: `2px solid ${getMoodColor(moodLevel)}50`,
            boxShadow: `0 0 24px ${getMoodColor(moodLevel)}30`,
          }}
        >
          {getMoodEmoji(moodLevel)}
          {/* Accessories overlay */}
          {unlockedAccessories?.map((acc: string) => (
            <span key={acc} className="absolute text-lg">{getAccessoryEmoji(acc)}</span>
          ))}
        </motion.div>

        {/* Mood label */}
        <motion.div
          key={moodLevel}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 px-3 py-1 rounded-full text-xs font-bold"
          style={{
            background: `${getMoodColor(moodLevel)}20`,
            color: getMoodColor(moodLevel),
          }}
        >
          {getMoodLabel(moodLevel, t)}
        </motion.div>
      </div>

      {/* Mood Score Bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="font-bold text-[var(--text-muted)]">Mood Score</span>
          <span className="font-black" style={{ color: getMoodColor(moodLevel) }}>{moodScore}/100</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: getMoodColor(moodLevel) }}
            animate={{ width: `${moodScore}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
          <span>0 💔</span>
          <span>100 💖</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-800 p-1">
        {(["status", "accessories", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab
                ? "bg-[var(--primary)] text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab === "status" ? "Status" : tab === "accessories" ? "Items" : "History"}
          </button>
        ))}
      </div>

      {/* Status Tab */}
      {activeTab === "status" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              icon={<Heart size={14} className="text-rose-400" />}
              label={t("bmoCare.totalInteractions")}
              value={data.totalInteractions || 0}
            />
            <StatTile
              icon={<Star size={14} className="text-amber-400" />}
              label={t("bmoCare.bestMood")}
              value={data.longestStreakMood || moodScore}
            />
          </div>

          {nextUnlock && (
            <div className="rounded-xl border border-amber-200/30 bg-amber-50/30 p-3">
              <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">
                {t("bmoCare.nextUnlock")}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xl">{getAccessoryEmoji(nextUnlock.accessory.id)}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{nextUnlock.accessory.nameVi}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {nextUnlock.daysAway === 0
                      ? t("bmoCare.unlockNow")
                      : `${nextUnlock.daysAway} ${t("bmoCare.daysAway")}`}
                  </p>
                </div>
              </div>
              {nextUnlock.daysAway > 0 && (
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-amber-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(5, 100 - (nextUnlock.daysAway / 90) * 100)}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Accessories Tab */}
      {activeTab === "accessories" && (
        <div className="grid grid-cols-3 gap-2">
          {availableAccessories?.map((acc: any) => {
            const unlocked = unlockedAccessories?.includes(acc.id);
            return (
              <div
                key={acc.id}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  unlocked
                    ? "border-amber-400/50 bg-amber-50/30"
                    : "border-slate-700 bg-slate-800/50 opacity-50"
                }`}
              >
                <span className="text-2xl">{getAccessoryEmoji(acc.id)}</span>
                <span className="text-[10px] font-bold text-center text-[var(--text-primary)] leading-tight">
                  {acc.nameVi}
                </span>
                {unlocked ? (
                  <span className="text-[9px] font-bold text-amber-500">{t("bmoCare.unlocked")}</span>
                ) : (
                  <div className="flex items-center gap-1 text-[9px] text-slate-500">
                    <Lock size={8} />
                    <span>{acc.requiredStreak}d</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">
            {t("bmoCare.moodHistory")}
          </p>
          <div className="flex items-end gap-0.5 h-16">
            {(moodHistory || Array(10).fill(50)).map((score: number, i: number) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(4, score)}%` }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="flex-1 rounded-t-sm"
                style={{
                  background: getMoodColor(
                    score >= 80 ? "excited" : score >= 60 ? "happy" : score >= 40 ? "neutral" : "sad"
                  ),
                  opacity: 0.6 + (i / moodHistory?.length || 10) * 0.4,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-slate-600 mt-1">
            <span>Oldest</span>
            <span>Latest</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-800/50 p-2">
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-[9px] text-[var(--text-muted)] leading-tight">{label}</p>
        <p className="text-sm font-black text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}
