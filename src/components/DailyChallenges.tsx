import React, { useState, useEffect } from "react";
import { Target, CheckCircle2, ChevronRight, Gift, Zap } from "lucide-react";
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
  },
  {
    id: 2,
    title: "Tắt đèn 1 giờ",
    desc: "Tắt đèn và thiết bị điện không dùng trong 1 giờ",
    points: 15,
  },
  {
    id: 3,
    title: "Chuyên gia AI",
    desc: "Dùng AI Scanner phân loại 1 món rác",
    points: 10,
  },
];

export function DailyChallenges({ onReward, userId, progress, onRefresh }: Props) {
  const [completed, setCompleted] = useState<number[]>([]);
  const [floatingPoints, setFloatingPoints] = useState<{ id: number; points: number; textId: number }[]>([]);
  const [nextTextId, setNextTextId] = useState(0);

  useEffect(() => {
    if (progress) {
      if (progress.challengesCompleted) setCompleted(progress.challengesCompleted);
    }
  }, [progress]);

  const handleComplete = (id: number, points: number) => {
    if (completed.includes(id)) return;
    const newCompleted = [...completed, id];
    setCompleted(newCompleted);

    fetch('/api/user-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: userId, type: 'challenge', data: id })
    }).then(res => res.json()).then(result => {
      if (result.success && onRefresh) {
        onRefresh(result.progress);
      }
    });
    
    // Trigger floating animation
    const textId = nextTextId;
    setNextTextId(textId + 1);
    setFloatingPoints(prev => [...prev, { id, points, textId }]);
    
    // Delay actual reward until animation plays a bit
    setTimeout(() => {
      onReward(points);
    }, 600);
    
    setTimeout(() => {
      setFloatingPoints(prev => prev.filter(p => p.textId !== textId));
    }, 2000);
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mt-4 relative overflow-visible">
      {/* Floating Points Overlay */}
      <AnimatePresence>
        {floatingPoints.map((fp) => (
          <motion.div
            key={fp.textId}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -60, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none text-2xl font-black text-orange-500 drop-shadow-md flex items-center gap-1"
          >
            <Zap size={24} className="fill-current text-yellow-400" /> +{fp.points}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Target className="text-orange-500" /> Thử Thách Cá Nhân
        </h3>
        <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded-md shadow-sm">
          Mỗi ngày
        </span>
      </div>

      <div className="space-y-3 mb-6">
        {CHALLENGES.map((c) => {
          const isDone = completed.includes(c.id);
          return (
            <motion.div
              layout
              key={c.id}
              className={`flex items-center justify-between p-3 rounded-xl border relative overflow-hidden transition-all duration-300 ${
                isDone
                  ? "bg-green-50/50 border-green-100"
                  : "bg-gray-50 border-gray-100 hover:border-orange-200 hover:shadow-[0_4px_15px_-3px_rgba(251,146,60,0.15)]"
              }`}
            >
              {isDone && (
                <motion.div 
                  initial={{ opacity: 0, x: -100 }}
                  animate={{ opacity: 0.05, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 bg-green-500 z-0" 
                />
              )}
              
              <div className="flex-1 pr-2 relative z-10">
                <h4
                  className={`font-semibold text-sm transition-colors ${
                    isDone
                      ? "text-green-700 line-through opacity-70"
                      : "text-gray-800"
                  }`}
                >
                  {c.title}
                </h4>
                <p
                  className={`text-xs mt-0.5 transition-colors ${
                    isDone ? "text-green-600 opacity-70" : "text-gray-500"
                  }`}
                >
                  {c.desc}
                </p>
              </div>
              <motion.button
                whileHover={!isDone ? { scale: 1.05 } : {}}
                whileTap={!isDone ? { scale: 0.95 } : {}}
                onClick={() => handleComplete(c.id, c.points)}
                disabled={isDone}
                className={`shrink-0 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg font-bold text-sm transition-all relative z-10 ${
                  isDone
                    ? "bg-green-100 text-green-600 cursor-default"
                    : "bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md shadow-orange-500/20"
                }`}
              >
                {isDone ? (
                  <>
                    <CheckCircle2 size={16} /> Đã xong
                  </>
                ) : (
                  <>
                    <Gift size={16} /> +{c.points}đ
                  </>
                )}
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
