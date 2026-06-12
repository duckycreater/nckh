import { useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Zap } from "lucide-react";

export interface MilestoneDef {
  threshold: number;
  bonus: number;
  label: string;
  labelVi: string;
}

export const MILESTONE_LEVELS: MilestoneDef[] = [
  { threshold: 50,    bonus: 5,    label: "First Steps",     labelVi: "Buoc Dau Tien" },
  { threshold: 100,   bonus: 10,   label: "Getting Started", labelVi: "Bat Dau Hanh Trinh" },
  { threshold: 200,   bonus: 25,   label: "On Fire",        labelVi: "No Lua" },
  { threshold: 500,   bonus: 50,   label: "Halfway Hero",   labelVi: "Anh Hung Nua Chang" },
  { threshold: 1000,  bonus: 100,  label: "Rising Star",     labelVi: "Ngoi Sao Dang Len" },
  { threshold: 2000,  bonus: 200,  label: "Dedicated",      labelVi: "Tan Tam" },
  { threshold: 5000,  bonus: 500,  label: "Elite",         labelVi: "Tinh Hoa" },
  { threshold: 10000, bonus: 1000, label: "Legend",         labelVi: "Huyen Thoai" },
];

export function getNextMilestone(points: number): MilestoneDef | null {
  return MILESTONE_LEVELS.find((m) => m.threshold > points) ?? null;
}

export function getCurrentMilestone(points: number): MilestoneDef | null {
  const passed = [...MILESTONE_LEVELS].reverse().find((m) => points >= m.threshold);
  return passed ?? null;
}

interface MilestoneBurstProps {
  milestone: MilestoneDef;
  newPoints: number;
  oldPoints: number;
  onComplete?: () => void;
}

export function MilestoneBurst({ milestone, newPoints, onComplete }: MilestoneBurstProps) {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 4000);
    return () => clearTimeout(t);
  }, [onComplete]);

  const newLevel = Math.floor(newPoints / 200) + 1;

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
        className="pointer-events-auto w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-center"
      >
        <div className="mb-3 flex items-center justify-center gap-1.5">
          <Star size={14} className="text-amber-500 fill-amber-400" />
          <span className="text-sm font-semibold text-amber-600">Cot moc moi!</span>
        </div>

        <div className="mb-2 text-2xl font-black text-gray-800">{milestone.labelVi}</div>
        <div className="mb-4 text-sm text-gray-500">Cap {newLevel}</div>

        <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2">
          <Zap size={14} className="text-emerald-500 fill-emerald-400" />
          <span className="text-sm font-semibold text-emerald-700">+{milestone.bonus} EXP</span>
        </div>

        <button
          onClick={onComplete}
          className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
        >
          Tiep tuc
        </button>
      </motion.div>
    </motion.div>
  );
}

const _MILESTONE_CACHE_PREFIX = "ecoquest_milestones_";

export function getMilestoneCache(nick: string): Set<number> {
  try {
    const raw = localStorage.getItem(_MILESTONE_CACHE_PREFIX + nick);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch { return new Set(); }
}

export function addMilestoneFired(nick: string, threshold: number) {
  try {
    const set = getMilestoneCache(nick);
    set.add(threshold);
    localStorage.setItem(_MILESTONE_CACHE_PREFIX + nick, JSON.stringify([...set]));
  } catch {}
}

export function checkMilestones(oldPoints: number, newPoints: number): MilestoneDef[] {
  return MILESTONE_LEVELS.filter((m) => newPoints >= m.threshold && oldPoints < m.threshold);
}

export function MilestoneProgress(props: { points: number; className?: string }) {
  const { points, className } = props;
  const next = getNextMilestone(points);
  const current = getCurrentMilestone(points);

  if (!next) {
    return (
      <div className="text-center text-xs font-medium text-gray-400">
        Da dat cot moc cao nhat!
      </div>
    );
  }

  const prevThreshold = current?.threshold ?? 0;
  const progress = ((points - prevThreshold) / (next.threshold - prevThreshold)) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-medium text-gray-500">
        <span>{current?.labelVi ?? "Bat dau"}</span>
        <span>{next.labelVi}</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
          animate={{ width: Math.min(100, progress) + "%" }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
