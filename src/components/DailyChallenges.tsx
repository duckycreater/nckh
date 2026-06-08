import React, { useState, useEffect } from "react";
import { CheckCircle2, Zap } from "lucide-react";
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
    points: 15,
    icon: "💡",
    rarity: "rare",
  },
  {
    id: 3,
    title: "Chuyên gia AI",
    desc: "Dùng AI Scanner phân loại 1 món rác",
    points: 10,
    icon: "🤖",
    rarity: "common",
  },
];

export function DailyChallenges({ onReward, userId, progress, onRefresh }: Props) {
  const [completed, setCompleted] = useState<number[]>([]);
  const [floatingPoints, setFloatingPoints] = useState<{ id: number; points: number; textId: number }[]>([]);
  const [nextTextId, setNextTextId] = useState(0);
  const [completedAnim, setCompletedAnim] = useState<number | null>(null);

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
      if (result.success && onRefresh) {
        onRefresh(result.progress);
      }
    });

    const textId = nextTextId;
    setNextTextId(textId + 1);
    setFloatingPoints(prev => [...prev, { id, points, textId }]);

    setTimeout(() => {
      onReward(points);
    }, 600);

    setTimeout(() => {
      setFloatingPoints(prev => prev.filter(p => p.textId !== textId));
      setCompletedAnim(null);
    }, 2000);
  };

  const completedCount = completed.length;
  const totalCount = CHALLENGES.length;

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

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5" style={{background: 'linear-gradient(90deg, rgba(245,166,35,0.1), rgba(245,166,35,0.05))'}}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📜</span>
          <h3 className="font-black text-yellow-400 text-sm tracking-wide">NHIỆM VỤ NGÀY</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Progress</span>
          <div className="flex gap-1">
            {[...Array(totalCount)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < completedCount
                    ? 'bg-yellow-400 shadow-[0_0_6px_rgba(245,166,35,0.8)]'
                    : 'bg-gray-700 border border-gray-600'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-black text-yellow-400">{completedCount}/{totalCount}</span>
        </div>
      </div>

      {/* Quest List */}
      <div className="p-3 space-y-2">
        {CHALLENGES.map((c) => {
          const isDone = completed.includes(c.id);
          const isAnimating = completedAnim === c.id;

          return (
            <motion.div
              layout
              key={c.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`quest-card rounded-xl p-3 flex items-center gap-3 ${isAnimating ? 'quest-complete-anim' : ''}`}
            >
              {/* Icon */}
              <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                isDone
                  ? 'bg-emerald-500/20'
                  : c.rarity === 'rare' ? 'bg-accent/10' : 'bg-white/5'
              }`}>
                {c.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className={`font-bold text-sm truncate transition-all ${
                  isDone ? 'text-gray-500 line-through' : 'text-gray-200'
                }`}>
                  {c.title}
                </h4>
                <p className={`text-[10px] leading-relaxed transition-all ${
                  isDone ? 'text-gray-600' : 'text-gray-500'
                }`}>
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
                    ? 'bg-emerald-500/15 text-emerald-400 cursor-default'
                    : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 shadow-[0_0_12px_rgba(245,166,35,0.15)] hover:border-yellow-500/50'
                }`}
              >
                {isDone ? (
                  <>
                    <CheckCircle2 size={14} className="fill-emerald-400/20" />
                    <span>Done</span>
                  </>
                ) : (
                  <>
                    <span className="text-yellow-400">+{c.points}</span>
                    <span className="text-[9px] font-bold text-yellow-400/60 uppercase">EXP</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          );
        })}

        {completedCount === totalCount && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-3 rounded-xl text-center"
            style={{background: 'linear-gradient(90deg, rgba(0,217,126,0.15), rgba(124,106,255,0.15))', border: '1px solid rgba(0,217,126,0.3)'}}
          >
            <p className="text-emerald-400 font-black text-sm">🎉 Tất cả nhiệm vụ hoàn thành!</p>
            <p className="text-gray-500 text-[10px] mt-1">Hẹn gặp lại vào ngày mai</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

