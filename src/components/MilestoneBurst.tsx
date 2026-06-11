import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { Star, Zap, ChevronUp } from "lucide-react";

export interface MilestoneDef {
  threshold: number;
  bonus: number;
  label: string;
  labelVi: string;
}

export const MILESTONE_LEVELS: MilestoneDef[] = [
  { threshold: 50,   bonus: 5,   label: "First Steps",    labelVi: "Bước Đầu Tiên" },
  { threshold: 100,  bonus: 10,  label: "Getting Started", labelVi: "Bắt Đầu Hành Trình" },
  { threshold: 200,  bonus: 25,  label: "On Fire",         labelVi: "Nổ Lửa" },
  { threshold: 500,  bonus: 50,  label: "Halfway Hero",    labelVi: "Anh Hùng Nửa Chặng" },
  { threshold: 1000, bonus: 100, label: "Rising Star",      labelVi: "Ngôi Sao Đang Lên" },
  { threshold: 2000, bonus: 200, label: "Dedicated",       labelVi: "Tận Tâm" },
  { threshold: 5000, bonus: 500, label: "Elite",          labelVi: "Tinh Hoa" },
  { threshold: 10000,bonus: 1000,label: "Legend",          labelVi: "Huyền Thoại" },
];

export function getNextMilestone(points: number): MilestoneDef | null {
  return MILESTONE_LEVELS.find(m => m.threshold > points) ?? null;
}

export function getCurrentMilestone(points: number): MilestoneDef | null {
  const passed = [...MILESTONE_LEVELS].reverse().find(m => points >= m.threshold);
  return passed ?? null;
}

interface MilestoneBurstProps {
  milestone: MilestoneDef;
  newPoints: number;
  oldPoints: number;
  onComplete?: () => void;
}

export function MilestoneBurst({ milestone, newPoints, oldPoints, onComplete }: MilestoneBurstProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; dx: number; dy: number; color: string; size: number; opacity: number }>>([]);
  const [show, setShow] = useState(true);
  const [confetti, setConfetti] = useState(false);
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);

  // Gentle particle burst
  useEffect(() => {
    const colors = ["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#f97316"];
    const initial = Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      dx: (Math.random() - 0.5) * 8,
      dy: (Math.random() - 0.5) * 8 - 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 6,
      opacity: 1,
    }));
    setParticles(initial);

    const animate = () => {
      frameRef.current++;
      if (frameRef.current > 90) {
        cancelAnimationFrame(rafRef.current);
        return;
      }
      setParticles(prev =>
        prev.map(p => ({
          ...p,
          x: p.x + p.dx,
          y: p.y + p.dy + 0.15, // gravity
          dy: p.dy + 0.08,
          opacity: Math.max(0, p.opacity - 0.012),
          size: p.size * 0.995,
        }))
      );
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    // Confetti starts after 200ms
    const confettiTimer = setTimeout(() => setConfetti(true), 200);
    const hideTimer = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, 4000);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(confettiTimer);
      clearTimeout(hideTimer);
    };
  }, [onComplete]);

  if (!show) return null;

  const level = Math.floor(oldPoints / 200) + 1;
  const newLevel = Math.floor(newPoints / 200) + 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-none fixed inset-0 z-[210] flex flex-col items-center justify-center"
    >
      {/* Radial glow backdrop */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 2.5, opacity: 1 }}
        exit={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute rounded-full"
        style={{
          width: 200,
          height: 200,
          background: "radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />

      {/* Particles */}
      <canvas
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
        ref={(canvas) => {
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          particles.forEach(p => {
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          });
        }}
      />

      {/* Main card */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -20 }}
        transition={{ type: "spring", damping: 18, stiffness: 250, delay: 0.1 }}
        className="relative z-10 text-center"
      >
        {/* MILESTONE badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", damping: 12 }}
          className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.3)]"
        >
          <Star size={12} className="fill-amber-400 text-amber-400" />
          Cột Mốc Mới
        </motion.div>

        {/* Level up display */}
        <div className="mb-2 flex items-center justify-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-4xl font-black text-slate-500">{level}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-600">Cấp</span>
          </div>
          <motion.div
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center gap-1"
          >
            <ChevronUp size={24} className="text-amber-400" />
          </motion.div>
          <div className="flex flex-col items-center">
            <motion.span
              key={newLevel}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-black text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
            >
              {newLevel}
            </motion.span>
            <span className="text-[10px] uppercase tracking-wider text-amber-600">Cấp</span>
          </div>
        </div>

        {/* Milestone name */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-3 text-base font-black text-white"
        >
          {milestone.labelVi}
        </motion.p>

        {/* Bonus reward */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring", damping: 15 }}
          className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-5 py-2.5 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
        >
          <Zap size={18} className="fill-emerald-400 text-emerald-400" />
          <span className="text-lg font-black text-emerald-300">+{milestone.bonus} EXP</span>
          <span className="text-xs text-emerald-500/80">Bonus</span>
        </motion.div>
      </motion.div>

      {/* Confetti */}
      {confetti && (
        <Confetti
          numberOfPieces={80}
          recycle={false}
          run={true}
          gravity={0.12}
          tweenDuration={3500}
          colors={["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#f97316", "#fbbf24"]}
          style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 211 }}
        />
      )}
    </motion.div>
  );
}

// ─── Milestone check hook ────────────────────────────────────────────────────────
const MILESTONE_CACHE_KEY = (nick: string) => `ecoquest_milestones_${nick}`;

export function getMilestoneCache(nick: string): Set<number> {
  try {
    const raw = localStorage.getItem(MILESTONE_CACHE_KEY(nick));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch { return new Set(); }
}

export function addMilestoneFired(nick: string, threshold: number) {
  try {
    const set = getMilestoneCache(nick);
    set.add(threshold);
    localStorage.setItem(MILESTONE_CACHE_KEY(nick), JSON.stringify([...set]));
  } catch {}
}

export function checkMilestones(
  oldPoints: number,
  newPoints: number
): MilestoneDef[] {
  return MILESTONE_LEVELS.filter(
    m => newPoints >= m.threshold && oldPoints < m.threshold
  );
}

// ─── Milestone progress bar (for Dashboard) ─────────────────────────────────────
export function MilestoneProgress({ points, className = "" }: { points: number; className?: string }) {
  const next = getNextMilestone(points);
  const current = getCurrentMilestone(points);

  if (!next) return (
    <div className={`text-center text-xs font-bold text-amber-400 ${className}`}>
      Đã đạt cột mốc cao nhất!
    </div>
  );

  const prevThreshold = current?.threshold ?? 0;
  const progress = ((points - prevThreshold) / (next.threshold - prevThreshold)) * 100;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
        <span>{current?.labelVi ?? "Bắt đầu"}</span>
        <span className="text-amber-400/70">{next.labelVi}</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-800">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
          animate={{ width: `${Math.min(100, progress)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ boxShadow: "0 0 6px rgba(245,158,11,0.5)" }}
        />
      </div>
    </div>
  );
}
