import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Star, Zap } from "lucide-react";

export interface SurpriseGiftDef {
  day: number;
  reward: number;
  label: string;
  labelVi: string;
  icon: string;
  type: "exp" | "badge" | "card";
}

export const STREAK_GIFT_TIERS: SurpriseGiftDef[] = [
  { day: 7,   reward: 30,   label: "Week Warrior",   labelVi: "Chiến Binh Tuần",     icon: "⚡", type: "exp" },
  { day: 14,  reward: 75,   label: "Fortnight Hero",  labelVi: "Anh Hùng Nửa Tháng", icon: "🛡️", type: "exp" },
  { day: 30,  reward: 200,  label: "Monthly Legend",  labelVi: "Huyền Thoại Tháng",   icon: "👑", type: "exp" },
  { day: 60,  reward: 500,  label: "Diamond Tier",    labelVi: "Hạng Kim Cương",     icon: "💎", type: "exp" },
  { day: 100, reward: 1000, label: "Mythic Master",   labelVi: "Bậc Thầy Huyền Thoại", icon: "🏆", type: "badge" },
];

interface SurpriseGiftProps {
  streakDays: number;
  onClaim: (tier: SurpriseGiftDef) => void;
  onClose: () => void;
}

export function SurpriseGift({ streakDays, onClaim, onClose }: SurpriseGiftProps) {
  const [phase, setPhase] = useState<"closed" | "reveal">("closed");

  const tier = STREAK_GIFT_TIERS.find(t => t.day === streakDays) ?? null;

  useEffect(() => {
    if (!tier) { onClose(); return; }
    const openTimer = setTimeout(() => setPhase("reveal"), 800);
    return () => clearTimeout(openTimer);
  }, [tier]);

  if (!tier) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/20 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className="pointer-events-auto w-full max-w-xs bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {phase === "closed" && (
            <motion.div
              key="closed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 p-6"
            >
              <div className="text-4xl">{tier.icon}</div>
              <p className="text-xs font-medium text-gray-400">Đang mở quà...</p>
            </motion.div>
          )}

          {phase === "reveal" && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 p-6"
            >
              <div className="text-4xl">{tier.icon}</div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Quà streak {tier.day} ngày!</p>
                <p className="text-xs text-gray-400">{tier.labelVi}</p>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2">
                <Zap size={14} className="text-emerald-500 fill-emerald-400" />
                <span className="text-sm font-semibold text-emerald-700">+{tier.reward} EXP</span>
              </div>

              <button
                onClick={() => onClaim(tier)}
                className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white py-2 text-sm font-semibold transition-colors"
              >
                Nhận quà
              </button>
              <button
                onClick={onClose}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Đóng
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
