import { useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Zap } from "lucide-react";
import {
  calculateLevel,
  getExpForNextLevel,
  getNextMilestone,
  getCurrentMilestone,
  checkMilestones,
  MILESTONE_LEVELS,
  TIER_NAMES,
  type MilestoneDef,
} from "../lib/useLevel";

export type { MilestoneDef };

export { getNextMilestone, getCurrentMilestone, checkMilestones, MILESTONE_LEVELS };

interface MilestoneBurstProps {
  milestone: MilestoneDef;
  totalExpEarned: number;
  onComplete?: () => void;
}

export function MilestoneBurst({ milestone, totalExpEarned, onComplete }: MilestoneBurstProps) {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 4000);
    return () => clearTimeout(t);
  }, [onComplete]);

  const { level, expToNextLevel, currentExpInLevel } = calculateLevel(totalExpEarned);
  const milestoneTierData = TIER_NAMES[milestone.tier] ?? TIER_NAMES.t1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-none fixed inset-0 z-[210] flex items-center justify-center bg-black/20"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className="pointer-events-auto w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-center"
      >
        {/* Tier badge */}
        <div className="mb-3 flex items-center justify-center gap-2">
          <Star size={14} className="text-amber-500 fill-amber-400" />
          <span className="text-sm font-semibold text-amber-600">Cột mốc mới!</span>
        </div>

        {/* Milestone name */}
        <div className="text-xl font-black text-gray-800 mb-1">{milestone.labelVi}</div>

        {/* Current tier */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-2xl">{milestoneTierData.emoji}</span>
          <span className="text-sm font-semibold text-gray-500">{milestoneTierData.full}</span>
        </div>

        {/* Level + EXP bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span className="font-semibold">Cấp {level}</span>
            <span>{currentExpInLevel.toLocaleString()} / {expToNextLevel.toLocaleString()} EXP</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (currentExpInLevel / expToNextLevel) * 100)}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Bonus EXP */}
        <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2">
          <Zap size={14} className="text-emerald-500 fill-emerald-400" />
          <span className="text-sm font-semibold text-emerald-700">+{milestone.bonus} EXP</span>
        </div>

        {/* Next milestone hint */}
        {nextTierData && (
          <p className="mt-2 text-xs text-gray-400">
            Cột mốc tiếp theo: {milestone.labelVi !== getCurrentMilestone(totalExpEarned)?.labelVi ? "" : ""}
          </p>
        )}

        <button
          onClick={onComplete}
          className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
        >
          Tiếp tục
        </button>
      </motion.div>
    </motion.div>
  );
}

export function MilestoneProgress(props: { totalExpEarned: number; className?: string }) {
  const { totalExpEarned, className } = props;
  const next = getNextMilestone(totalExpEarned);
  const current = getCurrentMilestone(totalExpEarned);

  if (!next) {
    return (
      <div className="text-center text-xs font-medium text-amber-500">
        Đã đạt cột mốc cao nhất! 👑
      </div>
    );
  }

  const prevThreshold = current?.threshold ?? 0;
  const progress = ((totalExpEarned - prevThreshold) / (next.threshold - prevThreshold)) * 100;

  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <div className="flex items-center justify-between text-[10px] font-medium text-gray-500">
        <span>{current?.labelVi ?? "Bắt đầu"}</span>
        <span>{next.labelVi}</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
          animate={{ width: Math.min(100, progress) + "%" }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <div className="text-right text-[9px] text-gray-400">
        {totalExpEarned.toLocaleString()} / {next.threshold.toLocaleString()} EXP
      </div>
    </div>
  );
}

// ── Backward-compatible re-export for old usages ──────────────────────────────
export function getMilestoneCache(_nick: string): Set<number> {
  return new Set();
}
export function addMilestoneFired(_nick: string, _threshold: number): void {}
