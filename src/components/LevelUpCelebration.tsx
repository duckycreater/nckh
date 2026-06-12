import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Zap, TrendingUp } from "lucide-react";
import { calculateLevel, TIER_NAMES } from "../lib/useLevel";
import { getStreakMultiplier } from "../lib/streakPersistence";

interface LevelUpCelebrationProps {
  oldLevel: number;
  newLevel: number;
  totalExpEarned?: number;
  bonusExp?: number;
  streakDays?: number;
  onClose: () => void;
}

export function LevelUpCelebration({
  oldLevel,
  newLevel,
  totalExpEarned = 0,
  bonusExp = 0,
  streakDays,
  onClose,
}: LevelUpCelebrationProps) {
  const multiplier = streakDays ? getStreakMultiplier(streakDays) : 1;

  const oldTierData = TIER_NAMES[`t${Math.min(Math.ceil(oldLevel / 3), 10)}`] ?? TIER_NAMES.t1;
  const newTierData = TIER_NAMES[`t${Math.min(Math.ceil(newLevel / 3), 10)}`] ?? TIER_NAMES.t1;

  useEffect(() => {
    const t = setTimeout(() => onClose(), 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  const tierChanged = newLevel !== oldLevel;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="pointer-events-none fixed inset-0 z-[220] flex flex-col items-center justify-center bg-black/20"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="pointer-events-auto w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            <Star size={16} className="text-amber-500 fill-amber-400" />
            <span className="text-sm font-bold text-amber-600">Lên cấp!</span>
          </div>

          {/* Level transition */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-black text-gray-400">{oldLevel}</div>
              <div className="text-[10px] text-gray-400">{oldTierData.full}</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Zap size={18} className="text-amber-500 fill-amber-400" />
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            </div>
            <div className="text-center">
              <motion.div
                key={newLevel}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="text-4xl font-black text-amber-600"
              >
                {newLevel}
              </motion.div>
              <div className="text-[10px] font-semibold text-amber-500">{newTierData.full}</div>
            </div>
          </div>

          {/* Tier badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-3 py-1.5">
              <span className="text-xl">{newTierData.emoji}</span>
              <span className={`text-sm font-bold ${newTierData.color}`}>{newTierData.short}</span>
            </div>
          </div>

          {/* Streak notice */}
          {streakDays !== undefined && streakDays > 1 && (
            <div className="flex items-center justify-center gap-1.5 mb-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5">
              <TrendingUp size={13} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-700">
                Streak x{multiplier.toFixed(1)} đang hoạt động!
              </span>
            </div>
          )}

          {/* Bonus EXP */}
          {bonusExp > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2">
              <Zap size={15} className="text-emerald-500 fill-emerald-400" />
              <span className="text-sm font-semibold text-emerald-700">+{bonusExp.toLocaleString()} EXP</span>
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Tiếp tục
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
