/**
 * Waste Rush — Timed Real-Time Sorting Challenge Component
 *
 * 60-second speed sorting game với:
 * - Countdown timer với visual effects
 * - Combo system (x1 → x2 → x3 → x4)
 * - Points calculation với multipliers
 * - Daily leaderboard
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Heart, X, Clock, Trophy, Star, ChevronRight,
} from "lucide-react";
import { User } from "../types";
import { showPointsToast } from "../lib/toast";

type WasteCategory = "plastic" | "paper" | "glass" | "metal" | "organic" | "hazard";

interface RushItem {
  id: string;
  name: string;
  emoji: string;
  category: WasteCategory;
  correctBin: WasteCategory;
  hint: string;
  difficulty: "easy" | "medium" | "hard";
}

const BIN_COLORS: Record<WasteCategory, string> = {
  plastic: "#06b6d4",
  paper: "#f59e0b",
  glass: "#14b8a6",
  metal: "#64748b",
  organic: "#22c55e",
  hazard: "#ef4444",
};

const BIN_LABELS: Record<WasteCategory, string> = {
  plastic: "Nhựa",
  paper: "Giấy",
  glass: "Thủy tinh",
  metal: "Kim loại",
  organic: "Hữu cơ",
  hazard: "Nguy hại",
};

const RUSH_ITEMS: RushItem[] = [
  { id: "r1", name: "Chai nhựa PET", emoji: "🧴", category: "plastic", correctBin: "plastic", hint: "Nhựa có ký hiệu ♻️", difficulty: "easy" },
  { id: "r2", name: "Túi nilon", emoji: "🛍️", category: "plastic", correctBin: "plastic", hint: "Nhựa mềm", difficulty: "easy" },
  { id: "r3", name: "Ống hút nhựa", emoji: "🥤", category: "plastic", correctBin: "plastic", hint: "Nhựa dùng một lần", difficulty: "easy" },
  { id: "r4", name: "Nắp chai nhựa", emoji: "🔹", category: "plastic", correctBin: "plastic", hint: "Nhựa có thể tái chế", difficulty: "easy" },
  { id: "r5", name: "Hộp cơm nhựa", emoji: "🥡", category: "plastic", correctBin: "plastic", hint: "Hộp nhựa dùng một lần", difficulty: "easy" },
  { id: "r6", name: "Bình xịt nước", emoji: "🚿", category: "plastic", correctBin: "hazard", hint: "Có hóa chất bên trong", difficulty: "hard" },
  { id: "r7", name: "Bong bóng", emoji: "🎈", category: "plastic", correctBin: "plastic", hint: "Nhựa mỏng", difficulty: "easy" },
  { id: "r8", name: "Vỏ bút chì", emoji: "✏️", category: "plastic", correctBin: "plastic", hint: "Vỏ nhựa bút", difficulty: "easy" },
  { id: "r9", name: "Giấy báo", emoji: "📰", category: "paper", correctBin: "paper", hint: "Giấy tái chế được", difficulty: "easy" },
  { id: "r10", name: "Sách giáo khoa", emoji: "📚", category: "paper", correctBin: "paper", hint: "Sách cũ có thể tái sử dụng", difficulty: "easy" },
  { id: "r11", name: "Giấy gói quà", emoji: "🎁", category: "paper", correctBin: "paper", hint: "Giấy trang trí", difficulty: "easy" },
  { id: "r12", name: "Giấy ăn", emoji: "🧻", category: "paper", correctBin: "organic", hint: "Đã sử dụng, ướt", difficulty: "medium" },
  { id: "r13", name: "Giấy lót", emoji: "🥧", category: "paper", correctBin: "organic", hint: "Dính dầu/thức ăn", difficulty: "medium" },
  { id: "r14", name: "Sách nấu ăn", emoji: "🍳", category: "paper", correctBin: "paper", hint: "Sách giấy", difficulty: "easy" },
  { id: "r15", name: "Bìa cứng", emoji: "📦", category: "paper", correctBin: "paper", hint: "Carton có thể tái chế", difficulty: "easy" },
  { id: "r16", name: "Chai bia", emoji: "🍺", category: "glass", correctBin: "glass", hint: "Thủy tinh có thể tái chế", difficulty: "easy" },
  { id: "r17", name: "Chai nước ngọt", emoji: "🥤", category: "glass", correctBin: "glass", hint: "Chai thủy tinh", difficulty: "easy" },
  { id: "r18", name: "Lọ hoa", emoji: "🏺", category: "glass", correctBin: "glass", hint: "Đồ thủy tinh trang trí", difficulty: "easy" },
  { id: "r19", name: "Bóng đèn", emoji: "💡", category: "glass", correctBin: "hazard", hint: "Có thể chứa thủy ngân", difficulty: "medium" },
  { id: "r20", name: "Kính mắt", emoji: "👓", category: "glass", correctBin: "hazard", hint: "Cần xử lý đặc biệt", difficulty: "hard" },
  { id: "r21", name: "Lon nước ngọt", emoji: "🥫", category: "metal", correctBin: "metal", hint: "Hộp kim loại có thể tái chế", difficulty: "easy" },
  { id: "r22", name: "Nắp chai sắt", emoji: "🔩", category: "metal", correctBin: "metal", hint: "Sắt/kim loại", difficulty: "easy" },
  { id: "r23", name: "Đế giày", emoji: "👟", category: "metal", correctBin: "plastic", hint: "Đế giày bằng cao su", difficulty: "medium" },
  { id: "r24", name: "Pin", emoji: "🔋", category: "metal", correctBin: "hazard", hint: "Có chất độc hại", difficulty: "medium" },
  { id: "r25", name: "Kem tiêm", emoji: "💉", category: "metal", correctBin: "hazard", hint: "Vật y tế nguy hiểm", difficulty: "hard" },
  { id: "r26", name: "Vỏ cam", emoji: "🍊", category: "organic", correctBin: "organic", hint: "Phế phẩm nông nghiệp", difficulty: "easy" },
  { id: "r27", name: "Vỏ chuối", emoji: "🍌", category: "organic", correctBin: "organic", hint: "Rác hữu cơ", difficulty: "easy" },
  { id: "r28", name: "Lá cây", emoji: "🍂", category: "organic", correctBin: "organic", hint: "Phân compost được", difficulty: "easy" },
  { id: "r29", name: "Xương gà", emoji: "🍗", category: "organic", correctBin: "organic", hint: "Thức ăn thừa", difficulty: "easy" },
  { id: "r30", name: "Vỏ trứng", emoji: "🥚", category: "organic", correctBin: "organic", hint: "Có thể làm phân bón", difficulty: "easy" },
  { id: "r31", name: "Pin", emoji: "🔋", category: "hazard", correctBin: "hazard", hint: "Rác điện tử nguy hại", difficulty: "medium" },
  { id: "r32", name: "Bóng đèn huỳnh quang", emoji: "💡", category: "hazard", correctBin: "hazard", hint: "Có thủy ngân", difficulty: "medium" },
  { id: "r33", name: "Sơn", emoji: "🎨", category: "hazard", correctBin: "hazard", hint: "Hóa chất độc hại", difficulty: "medium" },
  { id: "r34", name: "Thuốc trừ sâu", emoji: "☠️", category: "hazard", correctBin: "hazard", hint: "Hóa chất nguy hiểm", difficulty: "hard" },
  { id: "r35", name: "Lọ thuốc hết hạn", emoji: "💊", category: "hazard", correctBin: "hazard", hint: "Thuốc không dùng được", difficulty: "medium" },
];

const DURATION = 60;

function getComboMultiplier(combo: number): number {
  if (combo >= 8) return 4;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

function getComboColor(combo: number): string {
  if (combo >= 8) return "#f43f5e";
  if (combo >= 5) return "#f97316";
  if (combo >= 3) return "#eab308";
  return "#94a3b8";
}

interface WasteRushGameProps {
  user: User;
  onComplete: (score: number) => void;
  onClose: () => void;
}

export function WasteRushGame({ user, onComplete, onClose }: WasteRushGameProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"intro" | "playing" | "result">("intro");
  const [items, setItems] = useState<RushItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [result, setResult] = useState<any>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startGame = useCallback(() => {
    const shuffled = [...RUSH_ITEMS].sort(() => Math.random() - 0.5);
    setItems(shuffled);
    setCurrentIdx(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrect(0);
    setWrong(0);
    setTimeLeft(DURATION);
    setFeedback(null);
    setResult(null);
    startTimeRef.current = Date.now();
    setPhase("playing");

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const finishGame = useCallback(async () => {
    clearInterval(timerRef.current!);
    setPhase("result");

    // Calculate final score
    const finalScore = score + (combo >= 3 ? combo * 5 : 0);
    onComplete(finalScore);

    // Submit to server
    try {
      const res = await fetch(`/api/waste-rush/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.account_id }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch {
      // Ignore
    }
  }, [score, combo, user.account_id, onComplete]);

  const handleAnswer = useCallback((answer: WasteCategory) => {
    if (phase !== "playing") return;
    const item = items[currentIdx];
    const isCorrect = answer === item.correctBin;

    if (isCorrect) {
      const newCombo = combo + 1;
      const newMaxCombo = Math.max(maxCombo, newCombo);
      const mult = getComboMultiplier(newCombo);
      const points = Math.round(10 * mult);
      setCombo(newCombo);
      setMaxCombo(newMaxCombo);
      setScore((prev) => prev + points);
      setCorrect((prev) => prev + 1);
      setFeedback({ correct: true, message: `+${points} điểm! x${mult}` });
      showPointsToast(points, 1, `Waste Rush Combo x${mult}`);
    } else {
      setCombo(0);
      setWrong((prev) => prev + 1);
      setFeedback({
        correct: false,
        message: `Sai! ${BIN_LABELS[item.correctBin]} ${item.emoji}`,
      });
    }

    // Next item after brief feedback
    setTimeout(() => {
      setFeedback(null);
      if (currentIdx + 1 < items.length) {
        setCurrentIdx((prev) => prev + 1);
      } else {
        finishGame();
      }
    }, 400);
  }, [phase, items, currentIdx, combo, maxCombo, finishGame]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Intro screen
  if (phase === "intro") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-6 p-6 text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [-5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-7xl"
        >
          ⏱️
        </motion.div>
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)]">Waste Rush</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {t("wasteRush.introDesc")}
          </p>
        </div>

        <div className="w-full space-y-2">
          <RuleRow emoji="⏱️" text={`${DURATION} giây countdown`} />
          <RuleRow emoji="🎯" text="Chọn thùng rác đúng" />
          <RuleRow emoji="🔥" text="Combo x1 → x4 cho chuỗi đúng" />
          <RuleRow emoji="💎" text="Nhanh càng tốt — bonus theo thời gian" />
        </div>

        <button
          onClick={startGame}
          className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 py-4 font-black text-white text-lg shadow-lg active:scale-95 transition-transform"
        >
          {t("wasteRush.startButton")}
        </button>

        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
          {t("common.cancel")}
        </button>
      </motion.div>
    );
  }

  // Result screen
  if (phase === "result") {
    const pct = Math.round((correct / (correct + wrong || 1)) * 100);
    const mult = getComboMultiplier(maxCombo);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col gap-4 p-6"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10 }}
            className="text-6xl mb-2"
          >
            {pct >= 80 ? "🏆" : pct >= 60 ? "🌟" : pct >= 40 ? "💪" : "🔄"}
          </motion.div>
          <h2 className="text-xl font-black text-[var(--text-primary)]">
            {pct >= 80 ? "Xuất sắc!" : pct >= 60 ? "Tốt lắm!" : pct >= 40 ? "Cố gắng lên!" : "Thử lại nhé!"}
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <ResultStat label="Điểm" value={score} icon={<Zap size={14} className="text-amber-400" />} />
          <ResultStat label="Đúng" value={correct} icon={<Star size={14} className="text-green-400" />} />
          <ResultStat label="Combo max" value={`x${mult}`} icon={<Trophy size={14} className="text-rose-400" />} />
        </div>

        <div className="rounded-2xl bg-slate-800/50 p-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Độ chính xác</span>
            <span className="font-black text-green-400">{pct}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
            />
          </div>
        </div>

        {result && (
          <div className="rounded-2xl border border-amber-200/30 bg-amber-50/20 p-3">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400">
                {result.rank <= 10 ? `Top #${result.rank} hôm nay!` : `Top ${result.percentile}% hôm nay`}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl py-3 font-bold text-sm text-[var(--text-muted)] border border-slate-700"
          >
            Đóng
          </button>
          <button
            onClick={() => { setPhase("intro"); }}
            className="flex-1 rounded-2xl py-3 font-bold text-sm bg-gradient-to-r from-rose-500 to-orange-400 text-white"
          >
            Chơi lại
          </button>
        </div>
      </motion.div>
    );
  }

  // Playing screen
  const currentItem = items[currentIdx];
  const timePct = (timeLeft / DURATION) * 100;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Timer */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="font-bold text-[var(--text-muted)]">
            <Clock size={12} className="inline mr-1" />
            {t("wasteRush.timeLeft")}
          </span>
          <span className={`font-black tabular-nums ${timeLeft <= 10 ? "text-red-400" : ""}`}>
            {timeLeft}s
          </span>
        </div>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            animate={{
              width: `${timePct}%`,
              backgroundColor: timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f97316" : "#22c55e",
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Score + Combo */}
      <div className="flex justify-between">
        <div className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1">
          <Zap size={14} className="text-amber-400" />
          <span className="text-sm font-black text-white">{score}</span>
        </div>
        <motion.div
          key={combo}
          animate={combo >= 3 ? { scale: [1, 1.3, 1] } : {}}
          className="flex items-center gap-1 rounded-full px-3 py-1"
          style={{ background: `${getComboColor(combo)}30`, border: `1px solid ${getComboColor(combo)}50` }}
        >
          <Heart size={14} style={{ color: getComboColor(combo) }} />
          <span className="text-sm font-black" style={{ color: getComboColor(combo) }}>
            x{getComboMultiplier(combo)} combo
          </span>
        </motion.div>
      </div>

      {/* Current Item */}
      <div className="flex flex-col items-center gap-3 py-4">
        <motion.div
          key={currentItem.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-7xl drop-shadow-lg"
        >
          {currentItem.emoji}
        </motion.div>
        <h3 className="text-lg font-black text-[var(--text-primary)]">{currentItem.name}</h3>
        <p className="text-xs text-[var(--text-muted)]">{currentItem.hint}</p>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-center py-2 rounded-xl font-black text-sm ${
              feedback.correct ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answer Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {(["plastic", "paper", "glass", "organic", "hazard", "metal"] as WasteCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => handleAnswer(cat)}
            disabled={!!feedback}
            className="flex items-center gap-2 rounded-2xl py-3 px-4 border-2 font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{
              borderColor: BIN_COLORS[cat],
              background: `${BIN_COLORS[cat]}15`,
              color: BIN_COLORS[cat],
            }}
          >
            <span className="text-lg">{BIN_COLORS[cat] === "#06b6d4" ? "🟦" : BIN_COLORS[cat] === "#f59e0b" ? "🟨" : BIN_COLORS[cat] === "#14b8a6" ? "🟩" : BIN_COLORS[cat] === "#64748b" ? "⬜" : BIN_COLORS[cat] === "#22c55e" ? "🌿" : "🟥"}</span>
            <span>{BIN_LABELS[cat]}</span>
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>Item {currentIdx + 1}/{items.length}</span>
        <span>{correct} đúng · {wrong} sai</span>
      </div>
    </div>
  );
}

function RuleRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-800/50 p-3">
      <span className="text-xl">{emoji}</span>
      <span className="text-sm text-[var(--text-primary)] font-medium">{text}</span>
    </div>
  );
}

function ResultStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-slate-800/50 p-3">
      <div className="flex items-center gap-1">{icon}</div>
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase">{label}</p>
    </div>
  );
}
