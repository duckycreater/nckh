import React, { useState, useEffect } from "react";
import { CheckCircle2, Zap, Trophy, Star, Flame, Target, TrendingUp, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserProgress } from "../types";

interface Props {
  onReward: (points: number) => void;
  userId: string;
  progress?: UserProgress;
  onRefresh?: (progress?: any) => void;
}

const CHALLENGES = [
  {
    id: 1,
    title: "Quét thông minh",
    desc: "Dùng AI Scanner để phân loại rác",
    points: 30,
    icon: "🤖",
    color: "#06b6d4",
    type: "scan" as const,
  },
  {
    id: 2,
    title: "Thu thập 3 thẻ",
    desc: "Mở gói thẻ hoặc học thêm 3 thẻ mới",
    points: 20,
    icon: "📦",
    color: "#a855f7",
    type: "collect" as const,
  },
  {
    id: 3,
    title: "Chiến thắng trận đấu",
    desc: "Đánh bại 1 đối thủ ở Đấu trường",
    points: 40,
    icon: "⚔️",
    color: "#ef4444",
    type: "battle" as const,
  },
  {
    id: 4,
    title: "Lên cấp thẻ",
    desc: "Nâng cấp 1 thẻ bất kỳ lên cấp cao hơn",
    points: 15,
    icon: "⬆️",
    color: "#f59e0b",
    type: "levelup" as const,
  },
  {
    id: 5,
    title: "Hợp nhất thẻ",
    desc: "Hợp nhất 3 bản sao thành EXP",
    points: 25,
    icon: "🔀",
    color: "#22c55e",
    type: "fuse" as const,
  },
];

const ACHIEVEMENTS = [
  { id: "first_scan", title: "Khám phá đầu tiên", desc: "Quét rác lần đầu", icon: "🔍", color: "#06b6d4" },
  { id: "first_win", title: "Chiến thắng đầu tiên", desc: "Thắng trận đầu ở Đấu trường", icon: "🏆", color: "#f59e0b" },
  { id: "streak_3", title: "3 ngày liên tiếp", desc: "Đăng nhập 3 ngày liên tiếp", icon: "🔥", color: "#ef4444" },
  { id: "streak_7", title: "1 tuần kiên trì", desc: "Đăng nhập 7 ngày liên tiếp", icon: "💎", color: "#a855f7" },
  { id: "cards_10", title: "Sưu tập gia", desc: "Thu thập 10 thẻ khác nhau", icon: "📚", color: "#22c55e" },
  { id: "first_fuse", title: "Hợp nhất đầu", desc: "Hợp nhất thẻ lần đầu", icon: "🔀", color: "#f59e0b" },
];

export function DailyChallenges({ onReward, userId, progress, onRefresh }: Props) {
  const [completed, setCompleted] = useState<number[]>([]);
  const [floatingPoints, setFloatingPoints] = useState<{ id: number; points: number; textId: number }[]>([]);
  const [nextTextId, setNextTextId] = useState(0);
  const [completedAnim, setCompletedAnim] = useState<number | null>(null);
  const [showAchieve, setShowAchieve] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showClaimAll, setShowClaimAll] = useState(false);

  useEffect(() => {
    if (progress) {
      if (progress.challengesCompleted) setCompleted(progress.challengesCompleted);
    }
  }, [progress]);

  const handleComplete = (id: number, points: number) => {
    if (completed.includes(id)) return;
    const newCompleted = [...completed, id];
    setCompleted(newCompleted);
    setCompletedAnim(id);

    fetch('/api/user-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: userId, type: 'challenge', data: id })
    }).then(res => res.json()).then(result => {
      if (result.success && onRefresh) onRefresh(result.progress);
    });

    const textId = nextTextId;
    setNextTextId(textId + 1);
    setFloatingPoints(prev => [...prev, { id, points, textId }]);

    setTimeout(() => onReward(points), 600);
    setTimeout(() => {
      setFloatingPoints(prev => prev.filter(p => p.textId !== textId));
      setCompletedAnim(null);
    }, 2200);
  };

  const handleClaimAll = () => {
    const remaining = CHALLENGES.filter(c => !completed.includes(c.id));
    if (remaining.length === 0) return;
    const bonus = remaining.length * 10;
    remaining.forEach(c => handleComplete(c.id, c.points));
    setTimeout(() => onReward(bonus), 400);
    setShowClaimAll(false);
  };

  const completedCount = completed.length;
  const totalCount = CHALLENGES.length;
  const totalReward = CHALLENGES.reduce((s, c) => s + (completed.includes(c.id) ? 0 : c.points), 0);

  return (
    <div className="daily-challenges">
      {/* Floating Points Overlay */}
      <AnimatePresence>
        {floatingPoints.map((fp) => (
          <motion.div
            key={fp.textId}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -80, scale: 1.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] pointer-events-none"
          >
            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 rounded-2xl shadow-2xl border-2 border-amber-300">
              <Zap size={22} className="text-white fill-white" />
              <span className="text-xl font-black text-white">+{fp.points} EXP</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main Panel */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ background: "linear-gradient(90deg, #1e293b, #0f172a)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              <Target size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-white text-xs tracking-wider flex items-center gap-1.5">
                NHIỆM VỤ HÔM NAY
                {completedCount === totalCount && <span className="text-emerald-400">✓</span>}
              </h3>
              <p className="text-[10px] text-slate-400">
                {completedCount === totalCount ? "Tất cả hoàn thành!" : `${totalReward} EXP khả dụng`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Progress dots */}
            <div className="flex gap-1">
              {CHALLENGES.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i < completedCount
                    ? 'bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.8)]'
                    : 'bg-slate-600'
                }`} />
              ))}
            </div>
            <span className="text-xs font-black text-amber-400 tabular-nums">{completedCount}/{totalCount}</span>
            <button
              onClick={() => setShowAchieve(!showAchieve)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Trophy size={14} />
            </button>
          </div>
        </div>

        {/* Achievements dropdown */}
        <AnimatePresence>
          {showAchieve && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/80">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Huân chương</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ACHIEVEMENTS.map((a) => (
                    <div key={a.id}
                      className="flex items-center gap-2 rounded-xl p-2 border border-slate-700/50 bg-slate-800/60">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                        style={{ background: a.color + "20" }}>
                        {a.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-white truncate">{a.title}</p>
                        <p className="text-[8px] text-slate-500 truncate">{a.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quest List */}
        <div className="p-3 space-y-2">
          {CHALLENGES.map((c) => {
            const isDone = completed.includes(c.id);
            const isAnimating = completedAnim === c.id;

            return (
              <motion.div
                layout
                key={c.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
                  isDone
                    ? "border-emerald-500/30 bg-emerald-950/20"
                    : isAnimating
                    ? "border-amber-400 bg-amber-950/40"
                    : "border-slate-700/60 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"
                }`}
              >
                {/* Icon */}
                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl border"
                  style={{
                    background: isDone ? c.color + "20" : c.color + "15",
                    borderColor: c.color + "40"
                  }}>
                  {c.icon}
                  {isDone && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-emerald-400 fill-emerald-400/20" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className={`font-bold text-xs truncate ${isDone ? "text-slate-500 line-through" : "text-white"}`}>
                      {c.title}
                    </h4>
                    {isDone && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
                  </div>
                  <p className={`text-[10px] leading-relaxed ${isDone ? "text-slate-600" : "text-slate-400"}`}>
                    {c.desc}
                  </p>
                </div>

                {/* Reward / Done */}
                {isDone ? (
                  <div className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400">Hoàn thành</span>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleComplete(c.id, c.points)}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg font-black text-xs transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${c.color}cc, ${c.color}88)`,
                      color: "white",
                      boxShadow: `0 0 12px ${c.color}40`,
                    }}
                  >
                    <Zap size={11} className="text-white" />
                    +{c.points} EXP
                  </motion.button>
                )}
              </motion.div>
            );
          })}

          {/* All completed celebration */}
          {completedCount === totalCount && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-1 p-3 rounded-xl text-center border-2 border-amber-400/50"
              style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.1))" }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Gift size={16} className="text-amber-400" />
                <p className="text-sm font-black text-amber-400">TẤT CẢ NHIỆM VỤ HOÀN THÀNH!</p>
              </div>
              <p className="text-[10px] text-slate-400">Hẹn gặp lại vào ngày mai ▼</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
