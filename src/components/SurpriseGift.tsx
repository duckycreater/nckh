import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { Gift, Star, Sparkles, Zap } from "lucide-react";

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
  const [phase, setPhase] = useState<"closed" | "unwrapped" | "reveal">("closed");
  const [showConfetti, setShowConfetti] = useState(false);
  const [boxShake, setBoxShake] = useState(false);

  // Find which tier this streak triggers
  const tier = STREAK_GIFT_TIERS.find(t => t.day === streakDays) ?? null;

  // Auto-trigger open on mount
  useEffect(() => {
    if (!tier) { onClose(); return; }
    const openTimer = setTimeout(() => {
      setBoxShake(true);
      setTimeout(() => setBoxShake(false), 600);
      setTimeout(() => {
        setPhase("unwrapped");
        setShowConfetti(true);
        setTimeout(() => {
          setPhase("reveal");
          setShowConfetti(false);
        }, 2000);
      }, 800);
    }, 600);
    return () => clearTimeout(openTimer);
  }, [tier]);

  if (!tier) return null;

  const handleClaim = () => {
    onClaim(tier);
    onClose();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex flex-col items-center justify-center">
      <AnimatePresence>
        {showConfetti && (
          <Confetti
            numberOfPieces={120}
            recycle={false}
            run={true}
            gravity={0.1}
            tweenDuration={2500}
            colors={["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#fbbf24"]}
            style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 201 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.7 }}
        transition={{ type: "spring", damping: 20, stiffness: 260 }}
        className="pointer-events-auto relative text-center"
      >
        {/* Phase: Closed box */}
        <AnimatePresence>
          {phase === "closed" && (
            <motion.div
              animate={boxShake ? { x: [-4, 4, -3, 3, -2, 2, 0] } : {}}
              transition={{ duration: 0.5 }}
              className="relative mx-auto w-40 cursor-pointer"
              onClick={() => setPhase("unwrapped")}
            >
              {/* Box body */}
              <div className="rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-600/90 to-amber-800/90 p-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                <div className="text-5xl">{tier.icon}</div>
                <p className="mt-2 text-sm font-bold text-amber-100">{tier.day} Day Streak!</p>
              </div>
              {/* Ribbon */}
              <div className="absolute inset-x-0 top-0 -mt-1 flex justify-center">
                <div className="h-3 w-16 rounded-b-lg bg-red-500 shadow-lg" />
              </div>
              {/* Bow */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-1">
                  <motion.div
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="h-4 w-6 rounded-full bg-red-400"
                  />
                  <motion.div
                    animate={{ rotate: [5, -5, 5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="h-4 w-6 rounded-full bg-red-400"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase: Unwrapped / Glow */}
        <AnimatePresence>
          {phase === "unwrapped" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="relative mx-auto w-40 text-center"
            >
              {/* Open glow */}
              <div
                className="absolute inset-0 rounded-3xl blur-2xl"
                style={{ background: "radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)" }}
              />
              <div className="relative rounded-3xl border-2 border-amber-400/50 bg-slate-900/95 p-8 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
                {/* Sparkles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-amber-400"
                    style={{
                      top: `${10 + Math.random() * 80}%`,
                      left: `${10 + Math.random() * 80}%`,
                    }}
                    animate={{ scale: [0.5, 1.5, 0.5], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1 + Math.random(), repeat: Infinity, delay: i * 0.2 }}
                  >
                    <Sparkles size={14 + Math.random() * 8} className="fill-amber-400" />
                  </motion.div>
                ))}

                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-6xl"
                >
                  {tier.icon}
                </motion.div>
                <p className="mt-2 text-sm font-black text-amber-300">Streak Gift!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase: Reveal */}
        <AnimatePresence>
          {phase === "reveal" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", damping: 18, stiffness: 260 }}
              className="pointer-events-auto"
            >
              {/* Card */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-slate-900 to-slate-950 px-8 py-6 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
                {/* Top glow */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-60" />

                <div className="mb-3 text-5xl">{tier.icon}</div>
                <h3 className="mb-1 text-lg font-black text-white">
                  Phần Thưởng Streak!
                </h3>
                <p className="mb-3 text-sm text-slate-400">
                  {streakDays} Ngày Liên Tiếp
                </p>

                {/* Reward */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", damping: 14 }}
                  className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-500/20 px-6 py-3"
                >
                  <Zap size={20} className="fill-emerald-400 text-emerald-400" />
                  <span className="text-xl font-black text-emerald-300">
                    +{tier.reward} EXP
                  </span>
                </motion.div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleClaim}
                  className="mx-auto flex items-center gap-2 rounded-2xl border border-emerald-400/60 bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-2.5 font-black text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:from-emerald-400 hover:to-green-500"
                >
                  <Star size={14} className="fill-white/40" />
                  Nhận Thưởng
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-4 mx-auto flex items-center gap-2 rounded-xl border border-slate-600/50 bg-slate-800/80 px-4 py-1.5 text-sm font-bold text-slate-400 backdrop-blur-sm transition-colors hover:border-slate-500 hover:text-white"
        >
          Đóng
        </button>
      </motion.div>
    </div>
  );
}
