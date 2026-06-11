import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Star, Sparkles, Zap } from "lucide-react";

export interface WheelSegment {
  label: string;
  labelVi: string;
  reward: number;
  type: "exp" | "jackpot" | "card" | "gems";
  color: string;
  textColor: string;
}

const SEGMENTS: WheelSegment[] = [
  { label: "+10 EXP",   labelVi: "+10 EXP",    reward: 10,  type: "exp",    color: "#065f46", textColor: "#6ee7b7" },
  { label: "+25 EXP",   labelVi: "+25 EXP",    reward: 25,  type: "exp",    color: "#1e3a5f", textColor: "#93c5fd" },
  { label: "+20 EXP",   labelVi: "+20 EXP",    reward: 20,  type: "exp",    color: "#4a1d96", textColor: "#c4b5fd" },
  { label: "JACKPOT!",  labelVi: "JACKPOT!",   reward: 500, type: "jackpot", color: "#78350f", textColor: "#fbbf24" },
  { label: "+15 EXP",   labelVi: "+15 EXP",    reward: 15,  type: "exp",    color: "#134e4a", textColor: "#5eead4" },
  { label: "+30 EXP",   labelVi: "+30 EXP",    reward: 30,  type: "exp",    color: "#3b0764", textColor: "#d8b4fe" },
  { label: "Card Drop", labelVi: "Rút Bài",    reward: 1,   type: "card",   color: "#1e3a5f", textColor: "#93c5fd" },
  { label: "+50 EXP",   labelVi: "+50 EXP",    reward: 50,  type: "exp",    color: "#065f46", textColor: "#6ee7b7" },
];

const WEIGHTS = [15, 15, 15, 1, 15, 15, 14, 10]; // jackpot = 1%
const TOTAL_WEIGHT = WEIGHTS.reduce((a, b) => a + b, 0);

function weightedRandom(): number {
  let r = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < WEIGHTS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return i;
  }
  return 0;
}

interface DailyWheelProps {
  userId: string;
  lastSpinDate?: string;
  onSpin: (segment: WheelSegment) => void;
  onClose: () => void;
}

export function DailyWheel({ userId, lastSpinDate, onSpin, onClose }: DailyWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<WheelSegment | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const SEGMENT_ANGLE = (2 * Math.PI) / SEGMENTS.length;

  // Draw wheel on canvas
  const drawWheel = useCallback((targetRotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const R = canvas.width / 2 - 4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(targetRotation);

    SEGMENTS.forEach((seg, i) => {
      const startAngle = i * SEGMENT_ANGLE;
      const endAngle = startAngle + SEGMENT_ANGLE;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.rotate(startAngle + SEGMENT_ANGLE / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = seg.textColor;
      ctx.font = `bold ${Math.max(9, Math.floor(R / 10))}px system-ui, sans-serif`;
      ctx.fillText(seg.labelVi, R - 14, 0);
      ctx.restore();
    });

    // Pointer triangle (top)
    ctx.beginPath();
    ctx.moveTo(0, -R - 2);
    ctx.lineTo(-10, -R - 22);
    ctx.lineTo(10, -R - 22);
    ctx.closePath();
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();
  }, [SEGMENTS, SEGMENT_ANGLE]);

  // Initial draw
  useEffect(() => {
    drawWheel(rotation);
  }, [drawWheel, rotation]);

  // Animate spin
  const spin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);

    const targetIdx = weightedRandom();
    // Calculate where the pointer (top) lands on the target segment
    // Pointer is at -PI/2 (top). We want segment `targetIdx` to be at top.
    // Wheel rotates clockwise, so we need to rotate to put targetIdx at top.
    const segmentCenter = targetIdx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    // Normalize to make it land nicely (not exactly at edge)
    const jitter = (Math.random() - 0.5) * (SEGMENT_ANGLE * 0.5);
    const targetAngle = -segmentCenter + Math.PI / 2 + jitter;

    // Add several full rotations for effect
    const fullRotations = 4 + Math.random() * 2;
    const totalRotation = rotation + fullRotations * 2 * Math.PI + targetAngle - (rotation % (2 * Math.PI));

    const startRot = rotation;
    const startTime = performance.now();
    const DURATION = 4200;

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / DURATION, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const currentRot = startRot + (totalRotation - startRot) * eased;
      setRotation(currentRot);
      drawWheel(currentRot);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSelectedIdx(targetIdx);
        setResult(SEGMENTS[targetIdx]);
        setSpinning(false);
        setShowResult(true);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [spinning, rotation, drawWheel]);

  const handleClaim = () => {
    if (result) {
      onSpin(result);
    }
    onClose();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[190] flex items-center justify-center">
      <div className="pointer-events-auto relative">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 -z-10 rounded-3xl bg-slate-950/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Close X */}
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-400 shadow-lg transition-colors hover:border-slate-500 hover:text-white"
        >
          ×
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-center"
        >
          <div className="mb-1 flex items-center justify-center gap-2">
            <Gift size={20} className="text-amber-400" />
            <h2 className="text-xl font-black text-white">Vòng Quay May Mắn</h2>
            <Gift size={20} className="text-amber-400" />
          </div>
          <p className="text-sm text-slate-400">Quay mỗi ngày để nhận phần thưởng!</p>
        </motion.div>

        {/* Wheel container */}
        <div className="relative">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full opacity-30 blur-xl" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)" }} />

          {/* Canvas wheel */}
          <motion.canvas
            ref={canvasRef}
            width={300}
            height={300}
            animate={{ rotate: spinning ? [0, 0] : 0 }}
            className="mx-auto drop-shadow-2xl"
            style={{ borderRadius: "50%" }}
          />

          {/* Center button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.button
              whileHover={!spinning ? { scale: 1.06 } : {}}
              whileTap={!spinning ? { scale: 0.95 } : {}}
              onClick={spin}
              disabled={spinning}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-black text-white shadow-[0_0_24px_rgba(245,158,11,0.5)] disabled:opacity-60"
            >
              {spinning ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles size={24} className="text-white" />
                </motion.div>
              ) : (
                <span className="text-[10px] font-black leading-tight">QUAY<br/>NGAY</span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Result display */}
        <AnimatePresence>
          {showResult && result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 18, stiffness: 280 }}
              className="mt-6 text-center"
            >
              <div className="mb-3">
                <span className="text-lg">{result.type === "jackpot" ? "🎉" : "✨"}</span>
                <p className={`mt-1 text-2xl font-black ${result.type === "jackpot" ? "text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" : "text-white"}`}>
                  {result.type === "jackpot" ? "JACKPOT!" :
                   result.type === "card" ? "Lá Bài Đặc Biệt!" :
                   `+${result.reward} EXP`}
                </p>
                {result.type === "card" && (
                  <p className="mt-1 text-sm text-slate-400">
                    Bạn nhận được 1 lá bài ngẫu nhiên!
                  </p>
                )}
                {result.type === "jackpot" && (
                  <p className="mt-1 text-sm text-amber-300">
                    Bạn là người may mắn nhất hôm nay!
                  </p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleClaim}
                className="mx-auto flex items-center gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-500/20 px-8 py-3 font-black text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-500/30"
              >
                <Star size={16} className="fill-emerald-400 text-emerald-400" />
                Nhận Thưởng
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Already spun state */}
        {lastSpinDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-sm text-slate-500"
          >
            Đã quay hôm nay. Hẹn gặp lại vào ngày mai!
          </motion.div>
        )}
      </div>
    </div>
  );
}
