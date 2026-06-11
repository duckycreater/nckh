import React, { useState, useEffect } from "react";
import { CheckCircle2, Zap, Star, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserProgress } from "../types";

interface Props {
  onReward: (points: number) => void;
  userId: string;
  progress?: UserProgress;
  onRefresh?: (progress?: any) => void;
}

// 7-challenge pool — 3 rotate daily, 1 is "hard" (2x reward)
const CHALLENGE_POOL = [
  {
    id: 1,
    title: "Bình nước cá nhân",
    desc: "Mang bình nước cá nhân thay vì mua chai nhựa",
    points: 10,
    icon: "💧",
    rarity: "common",
  },
  {
    id: 2,
    title: "Tắt đèn 1 giờ",
    desc: "Tắt đèn và thiết bị điện không dùng trong 1 giờ",
    points: 20,
    icon: "💡",
    rarity: "hard",
  },
  {
    id: 3,
    title: "Chuyên gia AI",
    desc: "Dùng AI Scanner phân loại 1 món rác",
    points: 10,
    icon: "🤖",
    rarity: "common",
  },
  {
    id: 4,
    title: "Nói không với nhựa",
    desc: "Từ chối túi nilon và đồ nhựa dùng một lần",
    points: 15,
    icon: "🚫",
    rarity: "common",
  },
  {
    id: 5,
    title: "Tái chế đúng cách",
    desc: "Phân loại rác để tái chế cho gia đình hoặc khu phố",
    points: 20,
    icon: "♻️",
    rarity: "hard",
  },
  {
    id: 6,
    title: "Đi bộ hoặc xe đạp",
    desc: "Di chuyển bằng đi bộ hoặc xe đạp thay vì xe máy/ô tô",
    points: 10,
    icon: "🚶",
    rarity: "common",
  },
  {
    id: 7,
    title: "Tiết kiệm năng lượng",
    desc: "Tắt máy tính/TV khi không sử dụng trước khi ra khỏi phòng",
    points: 10,
    icon: "🔌",
    rarity: "common",
  },
];

const RARITY_STYLES: Record<string, { border: string; badge: string; badgeText: string; glow: string }> = {
  common: {
    border: "border-slate-600/40",
    badge: "bg-slate-700",
    badgeText: "text-slate-300",
    glow: "shadow-slate-500/10",
  },
  hard: {
    border: "border-orange-500/50",
    badge: "bg-orange-500/20",
    badgeText: "text-orange-400",
    glow: "shadow-orange-500/20",
  },
};

function getDailyChallenges(): typeof CHALLENGE_POOL[0][] {
  const today = new Date().toDateString();
  const stored = localStorage.getItem("dailyChallengeSet");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) return parsed.challenges;
    } catch { /* ignore */ }
  }
  // Seed from date for deterministic daily rotation
  const seed = today.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shuffled = [...CHALLENGE_POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed; // use seed so rotation is deterministic per day
    const j = (i * 7 + seed) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Pick 3: always include 1 hard, 2 common
  const hards = shuffled.filter((c) => c.rarity === "hard");
  const commons = shuffled.filter((c) => c.rarity === "common");
  const result = [
    hards[0],
    commons[0],
    commons[1],
  ].filter(Boolean);
  localStorage.setItem("dailyChallengeSet", JSON.stringify({ date: today, challenges: result }));
  return result;
}

const CHAIN_BONUS = 25;
const CHAIN_THRESHOLD = 3;

export function DailyChallenges({ onReward, userId, progress, onRefresh }: Props) {
  const [completed, setCompleted] = useState<number[]>([]);
  const [floatingPoints, setFloatingPoints] = useState<{ id: number; points: number; textId: number }[]>([]);
  const [nextTextId, setNextTextId] = useState(0);
  const [completedAnim, setCompletedAnim] = useState<number | null>(null);
  const [chainCount, setChainCount] = useState(() => {
    try { return parseInt(localStorage.getItem("bmo:challengeChain") || "0", 10); } catch { return 0; }
  });
  const [chainBonusAnim, setChainBonusAnim] = useState(false);
  const [dailyChallenges, setDailyChallenges] = useState<typeof CHALLENGE_POOL>([]);

  useEffect(() => {
    setDailyChallenges(getDailyChallenges());
    if (progress?.challengesCompleted) {
      const todayChallenges = getDailyChallenges();
      // only restore completions for today's challenges
      const validCompletions = (progress.challengesCompleted as number[]).filter((id) =>
        todayChallenges.some((c) => c.id === id)
      );
      setCompleted(validCompletions);
    }
  }, [progress]);

  const handleComplete = (id: number, points: number) => {
    if (completed.includes(id)) return;

    const newChain = chainCount + 1;
    setChainCount(newChain);
    localStorage.setItem("bmo:challengeChain", String(newChain));

    const chainBonus = newChain >= CHAIN_THRESHOLD ? CHAIN_BONUS : 0;
    const totalReward = points + chainBonus;

    const newCompleted = [...completed, id];
    setCompleted(newCompleted);
    setCompletedAnim(id);

    fetch("/api/user-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: userId, type: "challenge", data: id }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && onRefresh) onRefresh(result.progress);
      })
      .catch(() => { /* swallow */ });

    if (chainBonus > 0) {
      setChainBonusAnim(true);
      setTimeout(() => setChainBonusAnim(false), 2000);
    }

    const textId = nextTextId;
    setNextTextId(textId + 1);
    setFloatingPoints((prev) => [...prev, { id, points: totalReward, textId }]);

    setTimeout(() => onReward(totalReward), 600);

    setTimeout(() => {
      setFloatingPoints((prev) => prev.filter((p) => p.textId !== textId));
      setCompletedAnim(null);
    }, 2000);
  };

  const completedCount = completed.length;
  const totalCount = dailyChallenges.length;

  return (
    <div className="rpg-panel rounded-xl overflow-hidden relative">
      {/* Floating Points Overlay */}
      <AnimatePresence>
        {floatingPoints.map((fp) => (
          <motion.div
            key={fp.textId}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -60, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none text-2xl font-black text-yellow-400 drop-shadow-[0_0_8px_rgba(255,215,0,0.8)] flex items-center gap-1"
          >
            <Zap size={24} className="fill-current text-yellow-400" /> +{fp.points} EXP
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Chain bonus flash */}
      <AnimatePresence>
        {chainBonusAnim && (
          <motion.div
            key="chain"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.2, 1] }}
              transition={{ duration: 0.5, ease: "backOut" }}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-950 to-orange-950 px-8 py-5 text-center shadow-[0_0_40px_rgba(245,158,11,0.5)]"
            >
              <Star size={36} className="fill-amber-400 text-amber-400" />
              <p className="text-2xl font-black text-amber-400">CHUỖI HOÀN THÀNH!</p>
              <p className="text-sm font-bold text-amber-300">
                {CHAIN_THRESHOLD} nhiệm vụ liên tiếp — +{CHAIN_BONUS} EXP
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between border-b border-white/5"
        style={{ background: "linear-gradient(90deg, rgba(245,166,35,0.1), rgba(245,166,35,0.05))" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📜</span>
          <h3 className="font-black text-yellow-400 text-sm tracking-wide">NHIỆM VỤ NGÀY</h3>
          {chainCount > 0 && chainCount < CHAIN_THRESHOLD && (
            <div className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-950/60 px-2 py-0.5">
              <Flame size={10} className="text-amber-400" />
              <span className="text-[9px] font-bold text-amber-400">
                Chuỗi {chainCount}/{CHAIN_THRESHOLD}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Progress</span>
          <div className="flex gap-1">
            {[...Array(totalCount)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < completedCount
                    ? "bg-yellow-400 shadow-[0_0_6px_rgba(245,166,35,0.8)]"
                    : "bg-gray-700 border border-gray-600"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-black text-yellow-400">{completedCount}/{totalCount}</span>
        </div>
      </div>

      {/* Quest List */}
      <div className="p-3 space-y-2">
        {dailyChallenges.map((c) => {
          const isDone = completed.includes(c.id);
          const isAnimating = completedAnim === c.id;
          const rs = RARITY_STYLES[c.rarity] || RARITY_STYLES.common;
          const isHard = c.rarity === "hard";

          return (
            <motion.div
              layout
              key={c.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`quest-card rounded-xl p-3 flex items-center gap-3 border ${isAnimating ? "quest-complete-anim" : ""} ${rs.border} ${isHard && !isDone ? "bg-orange-950/20" : ""}`}
              style={{ boxShadow: isHard && !isDone ? "0 0 12px rgba(245,130,0,0.1)" : undefined }}
            >
              {/* Icon */}
              <div
                className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  isDone
                    ? "bg-emerald-500/20"
                    : isHard
                    ? "bg-orange-500/20"
                    : "bg-white/5"
                }`}
              >
                {c.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4
                    className={`font-bold text-sm truncate transition-all ${
                      isDone ? "text-gray-500 line-through" : "text-gray-200"
                    }`}
                  >
                    {c.title}
                  </h4>
                  {isHard && !isDone && (
                    <div className={`shrink-0 flex items-center gap-0.5 rounded-full border border-orange-500/50 ${rs.badge} px-1.5 py-0.5`}>
                      <Flame size={8} className={rs.badgeText} />
                      <span className={`text-[8px] font-black ${rs.badgeText}`}>Khó</span>
                    </div>
                  )}
                </div>
                <p
                  className={`text-[10px] leading-relaxed transition-all ${
                    isDone ? "text-gray-600" : "text-gray-500"
                  }`}
                >
                  {c.desc}
                </p>
              </div>

              {/* Reward / Done */}
              <motion.button
                whileHover={!isDone ? { scale: 1.05 } : {}}
                whileTap={!isDone ? { scale: 0.95 } : {}}
                onClick={() => handleComplete(c.id, c.points)}
                disabled={isDone}
                className={`shrink-0 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg font-black text-xs transition-all ${
                  isDone
                    ? "bg-emerald-500/15 text-emerald-400 cursor-default"
                    : isHard
                    ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/40 text-orange-400 shadow-[0_0_12px_rgba(245,130,0,0.15)] hover:border-orange-500/60"
                    : "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 shadow-[0_0_12px_rgba(245,166,35,0.15)] hover:border-yellow-500/50"
                }`}
              >
                {isDone ? (
                  <>
                    <CheckCircle2 size={14} className="fill-emerald-400/20" />
                    <span>Done</span>
                  </>
                ) : (
                  <>
                    <span className={isHard ? "text-orange-400" : "text-yellow-400"}>+{c.points}</span>
                    <span className={`text-[9px] font-bold ${isHard ? "text-orange-400/60" : "text-yellow-400/60"} uppercase`}>EXP</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          );
        })}

        {completedCount === totalCount && totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-3 rounded-xl text-center"
            style={{
              background: "linear-gradient(90deg, rgba(0,217,126,0.15), rgba(124,106,255,0.15))",
              border: "1px solid rgba(0,217,126,0.3)",
            }}
          >
            <p className="text-emerald-400 font-black text-sm">Tất cả nhiệm vụ hoàn thành!</p>
            <p className="text-gray-500 text-[10px] mt-1">Hẹn gặp lại vào ngày mai</p>
          </motion.div>
        )}

        {/* Chain hint */}
        {chainCount > 0 && chainCount < CHAIN_THRESHOLD && completedCount < totalCount && (
          <p className="text-center text-[9px] text-slate-500">
            Hoàn thành {CHAIN_THRESHOLD - chainCount} nhiệm vụ liên tiếp để nhận +{CHAIN_BONUS} EXP
          </p>
        )}
      </div>
    </div>
  );
}
