import React, { useState, useEffect } from "react";
import { CheckCircle2, Zap, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserProgress } from "../types";
import { useTranslation } from "react-i18next";

interface Props {
  onReward: (points: number) => void;
  userId: string;
  progress?: UserProgress;
  onRefresh?: (progress?: any) => void;
}

const CHALLENGE_POOL = [
  { id: 1, titleKey: "dailyChallenges.challenges.personalBottle", desc: "Mang bình nước cá nhân thay vì mua chai nhựa", points: 10, icon: "💧", rarity: "common" },
  { id: 2, titleKey: "dailyChallenges.challenges.turnOffLight", desc: "Tắt đèn và thiết bị điện không dùng trong 1 giờ", points: 20, icon: "💡", rarity: "hard" },
  { id: 3, titleKey: "dailyChallenges.challenges.aiExpert", desc: "Dùng AI Scanner phân loại 1 món rác", points: 10, icon: "🤖", rarity: "common" },
  { id: 4, titleKey: "dailyChallenges.challenges.noPlastic", desc: "Từ chối túi nilon và đồ nhựa dùng một lần", points: 15, icon: "🚫", rarity: "common" },
  { id: 5, titleKey: "dailyChallenges.challenges.recycleProper", desc: "Phân loại rác để tái chế cho gia đình hoặc khu phố", points: 20, icon: "♻️", rarity: "hard" },
  { id: 6, titleKey: "dailyChallenges.challenges.walkOrBike", desc: "Di chuyển bằng đi bộ hoặc xe đạp thay vì xe máy/ô tô", points: 10, icon: "🚶", rarity: "common" },
  { id: 7, titleKey: "dailyChallenges.challenges.saveEnergy", desc: "Tắt máy tính/TV khi không sử dụng trước khi ra khỏi phòng", points: 10, icon: "🔌", rarity: "common" },
];

const CHAIN_BONUS = 25;
const CHAIN_THRESHOLD = 3;

function getDailyChallenges() {
  const today = new Date().toDateString();
  const stored = localStorage.getItem("dailyChallengeSet");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) return parsed.challenges;
    } catch { /* ignore */ }
  }
  const seed = today.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shuffled = [...CHALLENGE_POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed;
    const j = (i * 7 + seed) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const hards = shuffled.filter((c) => c.rarity === "hard");
  const commons = shuffled.filter((c) => c.rarity === "common");
  const result = [hards[0], commons[0], commons[1]].filter(Boolean);
  localStorage.setItem("dailyChallengeSet", JSON.stringify({ date: today, challenges: result }));
  return result;
}

export function DailyChallenges({ onReward, userId, progress, onRefresh }: Props) {
  const { t } = useTranslation();
  const [completed, setCompleted] = useState<number[]>([]);
  const [completedAnim, setCompletedAnim] = useState<number | null>(null);
  const [chainCount, setChainCount] = useState(() => {
    try { return parseInt(localStorage.getItem("bmo:challengeChain") || "0", 10); } catch { return 0; }
  });
  const [dailyChallenges, setDailyChallenges] = useState<typeof CHALLENGE_POOL>([]);
  const [toast, setToast] = useState<{ text: string; points: number } | null>(null);

  useEffect(() => {
    setDailyChallenges(getDailyChallenges());
    if (progress?.challengesCompleted) {
      const todayChallenges = getDailyChallenges();
      const validCompletions = (progress.challengesCompleted as number[]).filter((id) =>
        todayChallenges.some((c) => c.id === id)
      );
      setCompleted(validCompletions);
    }
  }, [progress]);

  const showToast = (text: string, points: number) => {
    setToast({ text, points });
    setTimeout(() => setToast(null), 2200);
  };

  const handleComplete = (id: number, points: number) => {
    if (completed.includes(id)) return;
    const newChain = chainCount + 1;
    setChainCount(newChain);
    localStorage.setItem("bmo:challengeChain", String(newChain));
    const chainBonus = newChain >= CHAIN_THRESHOLD ? CHAIN_BONUS : 0;
    const totalReward = points + chainBonus;
    setCompleted((prev) => [...prev, id]);
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

    setTimeout(() => {
      onReward(totalReward);
      if (chainBonus > 0) {
              showToast(t("dailyChallenges.chainComplete"), chainBonus);
      }
      setCompletedAnim(null);
    }, 400);
  };

  const completedCount = completed.length;
  const totalCount = dailyChallenges.length;

  return (
    <div className="surface-card rounded-2xl overflow-hidden">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2"
          >
            <span className="text-amber-500 font-bold text-sm">+{toast.points} EXP</span>
            <span className="text-xs text-amber-700">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h3 className="font-bold text-gray-800 text-sm">{t("dailyChallenges.dailyQuests")}</h3>
          {chainCount >= CHAIN_THRESHOLD && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
              {t("dailyChallenges.chainProgress", { current: chainCount, total: CHAIN_THRESHOLD })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-500">{completedCount}/{totalCount}</span>
          <div className="flex gap-0.5">
            {[...Array(totalCount)].map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i < completedCount ? "bg-emerald-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Quest List */}
      <div className="p-3 space-y-1.5">
        {dailyChallenges.map((c) => {
          const isDone = completed.includes(c.id);
          const isAnimating = completedAnim === c.id;

          return (
            <motion.div
              layout
              key={c.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isAnimating ? "border-emerald-300 bg-emerald-50" :
                isDone ? "border-gray-100 bg-gray-50/50" :
                c.rarity === "hard" ? "border-orange-100 bg-orange-50/50" :
                "border-gray-100 bg-white"
              }`}
            >
              {/* Icon */}
              <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base bg-gray-100">
                {c.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-semibold truncate ${isDone ? "text-gray-400 line-through" : "text-gray-700"}`}>
                  {t(c.titleKey)}
                </h4>
                <p className={`text-[11px] ${isDone ? "text-gray-300" : "text-gray-500"}`}>
                  {c.desc}
                </p>
              </div>

              {/* Reward / Done */}
              <button
                onClick={() => handleComplete(c.id, c.points)}
                disabled={isDone}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isDone
                    ? "bg-emerald-100 text-emerald-600 cursor-default"
                    : c.rarity === "hard"
                    ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                    : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                }`}
              >
                {isDone ? (
                  <><CheckCircle2 size={13} /> {t("common.done")}</>
                ) : (
                  <><Zap size={11} className="fill-current" /> +{c.points}</>
                )}
              </button>
            </motion.div>
          );
        })}

        {completedCount === totalCount && totalCount > 0 && (
          <div className="mt-2 p-3 rounded-xl text-center bg-emerald-50 border border-emerald-200">
            <p className="text-emerald-700 font-semibold text-sm">{t("dailyChallenges.allComplete")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
