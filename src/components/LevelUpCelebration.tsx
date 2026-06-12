import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Zap } from "lucide-react";
import { getStreakMultiplier } from "../lib/streakPersistence";

interface LevelUpCelebrationProps {
  oldLevel: number;
  newLevel: number;
  bonusExp?: number;
  streakDays?: number;
  onClose: () => void;
}

export function LevelUpCelebration({
  oldLevel,
  newLevel,
  bonusExp = 0,
  streakDays,
  onClose,
}: LevelUpCelebrationProps) {
  const multiplier = streakDays ? getStreakMultiplier(streakDays) : 1;

  useEffect(() => {
    const t = setTimeout(() => onClose(), 4000);
    return () => clearTimeout(t);
  }, [onClose]);

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
          className="pointer-events-auto w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <Star size={16} className="text-amber-500 fill-amber-400" />
            <span className="text-sm font-semibold text-amber-600">Lên cấp!</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-center">
              <div className="text-3xl font-black text-gray-300">{oldLevel}</div>
            </div>
            <div className="flex flex-col items-center">
              <Zap size={16} className="text-amber-500 fill-amber-400" />
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-amber-600">{newLevel}</div>
            </div>
          </div>

          {streakDays && streakDays > 1 && (
            <p className="mb-3 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              Streak x{multiplier.toFixed(1)} đang hoạt động!
            </p>
          )}

          {bonusExp > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2">
              <Zap size={15} className="text-emerald-500 fill-emerald-400" />
              <span className="text-sm font-semibold text-emerald-700">+{String(bonusExp)} EXP</span>
            </div>
          )}

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
