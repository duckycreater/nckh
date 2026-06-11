import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { Star, Zap, ChevronUp, Trophy } from "lucide-react";
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
  const [confetti, setConfetti] = useState(false);
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; rotation: number; scale: number; delay: number }>>([]);
  const [show, setShow] = useState(true);
  const [rings, setRings] = useState<Array<{ id: number; scale: number; opacity: number }>>([]);

  useEffect(() => {
    // Star burst
    setStars(
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: 30 + Math.random() * 40,
        y: 20 + Math.random() * 60,
        rotation: Math.random() * 360,
        scale: 0.6 + Math.random() * 0.8,
        delay: 0.2 + Math.random() * 0.5,
      }))
    );

    // Expanding rings
    setRings(
      Array.from({ length: 3 }, (_, i) => ({
        id: i,
        scale: 0.3 + i * 0.3,
        opacity: 0.4 - i * 0.1,
      }))
    );

    // Start confetti after delay
    const t = setTimeout(() => setConfetti(true), 300);
    // Auto close after 4.5s
    const t2 = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 400);
    }, 4500);

    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [onClose]);

  const multiplier = streakDays ? getStreakMultiplier(streakDays) : 1;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none fixed inset-0 z-[220] flex flex-col items-center justify-center"
        >
          {/* Expanding rings */}
          {rings.map((ring) => (
            <motion.div
              key={ring.id}
              initial={{ scale: 0.1, opacity: ring.opacity }}
              animate={{ scale: ring.scale * 4, opacity: 0 }}
              transition={{ duration: 2, delay: ring.id * 0.15, ease: "easeOut" }}
              className="absolute rounded-full border border-amber-400/30"
              style={{
                width: 120,
                height: 120,
                background: "transparent",
                boxShadow: "0 0 40px rgba(245,158,11,0.2)",
              }}
            />
          ))}

          {/* Radial glow */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute rounded-full"
            style={{
              width: 300,
              height: 300,
              background: "radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          {/* Floating stars */}
          {stars.map((star) => (
            <motion.div
              key={star.id}
              initial={{ opacity: 0, scale: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: star.scale,
                y: -60 - Math.random() * 80,
              }}
              transition={{ duration: 1.5, delay: star.delay, ease: "easeOut" }}
              className="absolute text-amber-400"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                transform: `rotate(${star.rotation}deg)`,
              }}
            >
              <Star size={16} className="fill-amber-400" />
            </motion.div>
          ))}

          {/* Main card */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 18, stiffness: 260, delay: 0.1 }}
            className="pointer-events-auto relative z-10 text-center"
          >
            {/* Header badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 14 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/20 px-6 py-2 shadow-[0_0_24px_rgba(245,158,11,0.3)]"
            >
              <Trophy size={16} className="fill-amber-400 text-amber-400" />
              <span className="text-sm font-black uppercase tracking-widest text-amber-300">
                Level Up!
              </span>
            </motion.div>

            {/* Level transition */}
            <div className="mb-4 flex items-center justify-center gap-4">
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 0.5, 0] }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="flex flex-col items-center"
              >
                <span className="text-5xl font-black text-slate-600 drop-shadow-none">{oldLevel}</span>
              </motion.div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.5, repeat: 2 }}
                className="flex flex-col items-center"
              >
                <ChevronUp size={28} className="text-amber-400" />
                <ChevronUp size={20} className="text-amber-300 -mt-2" />
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.55, type: "spring", damping: 12 }}
                className="relative flex flex-col items-center"
              >
                <span className="text-7xl font-black text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]">
                  {newLevel}
                </span>
                {/* Glow pulse */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ background: "rgba(245,158,11,0.1)", filter: "blur(10px)" }}
                />
              </motion.div>
            </div>

            {/* Multiplier info */}
            {streakDays && streakDays > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mb-3 inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-500/15 px-4 py-2"
              >
                <span className="text-sm font-bold text-orange-300">
                  Streak x{multiplier.toFixed(1)} active!
                </span>
              </motion.div>
            )}

            {/* Bonus EXP */}
            {bonusExp > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-500/20 px-6 py-3 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              >
                <Zap size={20} className="fill-emerald-400 text-emerald-400" />
                <span className="text-xl font-black text-emerald-300">+{bonusExp} EXP</span>
              </motion.div>
            )}

            {/* Close button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={() => { setShow(false); setTimeout(onClose, 400); }}
              className="pointer-events-auto mt-6 rounded-xl border border-slate-600/50 bg-slate-800/80 px-6 py-2 text-sm font-bold text-slate-400 backdrop-blur-sm transition-colors hover:border-slate-500 hover:text-white"
            >
              Tiếp tục
            </motion.button>
          </motion.div>

          {/* Confetti */}
          {confetti && (
            <Confetti
              numberOfPieces={80}
              recycle={false}
              run={true}
              gravity={0.1}
              tweenDuration={3800}
              colors={["#f59e0b", "#10b981", "#3b82f6", "#fbbf24", "#f97316"]}
              style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 221 }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
