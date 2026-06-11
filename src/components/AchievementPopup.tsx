import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Flame, CheckCircle2 } from "lucide-react";
import {
  ALL_ACHIEVEMENTS,
  RARITY_CONFIG,
  buildAchievementContext,
  Achievement,
} from "../lib/achievements";
import { User } from "../types";

export interface AchievementUnlock {
  achievement: Achievement;
  timestamp: number;
}

// Global queue for achievement popups — any component can dispatch unlock events
let unlockQueue: AchievementUnlock[] = [];
let dispatchEvent = (a: AchievementUnlock) => {
  window.dispatchEvent(
    new CustomEvent<AchievementUnlock>("ecoquest:achievement-unlock", { detail: a })
  );
};

export function triggerAchievement(achievement: Achievement) {
  dispatchEvent({ achievement, timestamp: Date.now() });
}

// ─── AchievementPopup Component ──────────────────────────────────────────────────
export function AchievementPopup() {
  const [queue, setQueue] = useState<AchievementUnlock[]>([]);
  const [active, setActive] = useState<AchievementUnlock | null>(null);
  const DISMISS_DELAY = 3800;
  const DISPLAY_DURATION = DISMISS_DELAY + 600; // 4.4s total

  useEffect(() => {
    const handler = (e: Event) => {
      const unlock = (e as CustomEvent<AchievementUnlock>).detail;
      setQueue((prev) => [...prev, unlock]);
    };
    window.addEventListener("ecoquest:achievement-unlock", handler);
    return () => window.removeEventListener("ecoquest:achievement-unlock", handler);
  }, []);

  // Process queue: show one at a time
  useEffect(() => {
    if (active) return; // already showing one
    if (queue.length === 0) return;

    const next = queue[0];
    setQueue((prev) => prev.slice(1));
    setActive(next);

    const timer = setTimeout(() => {
      setActive(null);
    }, DISMISS_DELAY);

    return () => clearTimeout(timer);
  }, [queue, active]);

  if (!active) return null;

  const cfg = RARITY_CONFIG[active.achievement.rarity];
  const isEpicOrHigher = active.achievement.rarity === "epic" || active.achievement.rarity === "legendary";

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-start justify-center pt-16 px-4">
      <AnimatePresence>
        <motion.div
          key={active.achievement.id + active.timestamp}
          initial={{ opacity: 0, y: -40, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.35 } }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className="relative w-full max-w-sm"
        >
          {/* Glow backdrop */}
          <div
            className="absolute -inset-1 rounded-3xl blur-xl opacity-60"
            style={{ background: cfg.glow }}
          />
          {/* Card */}
          <div
            className={`relative overflow-hidden rounded-3xl border-2 bg-slate-900/95 px-6 py-5 shadow-2xl backdrop-blur-sm ${cfg.border}`}
          >
            {/* Rarity shimmer line at top */}
            {isEpicOrHigher && (
              <motion.div
                className="absolute inset-x-0 top-0 h-0.5"
                style={{ background: cfg.glow }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            <div className="flex items-start gap-4">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", damping: 15, stiffness: 300 }}
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-lg`}
                style={{ background: cfg.glow }}
              >
                {active.achievement.icon}
              </motion.div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                {/* Label */}
                <div className="mb-1 flex items-center gap-2">
                  <Trophy size={12} className={cfg.labelColor} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.labelColor}`}>
                    {active.achievement.rarity === "legendary" ? "HUYỀN THOẠI" :
                     active.achievement.rarity === "epic" ? "SỌ RARE" :
                     active.achievement.rarity === "rare" ? "HIẾM" : "THÔNG THƯỜNG"}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-black text-white text-base leading-tight">
                  {active.achievement.titleVi}
                </h3>

                {/* Description */}
                <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                  {active.achievement.descVi}
                </p>

                {/* Reward */}
                <div className="mt-2 flex items-center gap-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", damping: 12 }}
                    className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1"
                  >
                    <Star size={10} className="fill-emerald-400 text-emerald-400" />
                    <span className="text-xs font-black text-emerald-300">
                      +{active.achievement.expReward} EXP
                    </span>
                  </motion.div>
                </div>
              </div>

              {/* Dismiss X */}
              <button
                className="shrink-0 rounded-full p-1 text-slate-500 hover:text-white transition-colors"
                onClick={() => setActive(null)}
              >
                ×
              </button>
            </div>

            {/* Progress fill bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 rounded-full"
              style={{ background: cfg.glow }}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: DISMISS_DELAY / 1000, ease: "linear" }}
            />
          </div>

          {/* Floating +EXP text */}
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -30, scale: [0.5, 1.2, 1] }}
            transition={{ duration: 1.5, delay: 0.2 }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap text-lg font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]"
          >
            +{active.achievement.expReward} EXP
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Achievement Badge Grid (for ProfileView) ───────────────────────────────────
export function AchievementBadgeGrid({
  user,
  unlockedIds,
  className = "",
}: {
  user: User;
  unlockedIds: Set<string>;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-5 gap-2 ${className}`}>
      {ALL_ACHIEVEMENTS.map((ach) => {
        const unlocked = unlockedIds.has(ach.id);
        const cfg = RARITY_CONFIG[ach.rarity];

        return (
          <motion.div
            key={ach.id}
            whileHover={{ scale: 1.1 }}
            title={unlocked ? `${ach.titleVi}: ${ach.descVi}` : "???"}
            className={`relative flex aspect-square cursor-pointer items-center justify-center rounded-2xl text-xl transition-all ${
              unlocked
                ? `border-2 ${cfg.border} bg-slate-800/80 shadow-lg`
                : "border border-slate-700 bg-slate-800/40 opacity-30 grayscale"
            }`}
          >
            <span>{unlocked ? ach.icon : "🔒"}</span>
            {ach.rarity === "legendary" && unlocked && (
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.8)]" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Achievement check hook ─────────────────────────────────────────────────────
export function useAchievements(user: User) {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

  const checkAndUnlock = useCallback((ctx: Parameters<typeof buildAchievementContext>[0]) => {
    const newCtx = buildAchievementContext(ctx);
    const newlyUnlocked: Achievement[] = [];

    ALL_ACHIEVEMENTS.forEach((ach) => {
      if (!unlockedIds.has(ach.id) && ach.condition(newCtx)) {
        newlyUnlocked.push(ach);
        setUnlockedIds((prev) => new Set([...prev, ach.id]));
        // Fire popup
        window.dispatchEvent(
          new CustomEvent("ecoquest:achievement-unlock", {
            detail: { achievement: ach, timestamp: Date.now() },
          })
        );
      }
    });

    return newlyUnlocked;
  }, [unlockedIds]);

  return { unlockedIds, checkAndUnlock };
}
