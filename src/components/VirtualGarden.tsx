import React, { useState, useEffect } from "react";
import { Leaf, Droplets, TreePine, Sprout, Sun, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  points: number;
  onReward?: (amount: number) => void;
}

export function VirtualGarden({ points, onReward }: Props) {
  const [cleaned, setCleaned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [petMood, setPetMood] = useState<"happy" | "neutral" | "sad">("neutral");
  const [showFact, setShowFact] = useState<string | null>(null);
  const [factHistory, setFactHistory] = useState<string[]>([]);

  const PET_FACTS = [
    "Nhong nhựa mất 400+ năm để phân hủy trong đại dương!",
    "1 con rùa biển có thể nuốt 1.000 miếng nhựa trong 1 tuần.",
    "80% rác nhựa trên biển đến từ đất liền.",
    "Rùa biển ăn nhựa vì nó có mùi như tảo biển.",
    "Mỗi năm có 1,3 tỷ tấn nhựa được thải ra môi trường.",
    "Đại dương hấp thụ 30% CO2 do con người tạo ra.",
    "1 triệu chim biển chết mỗi năm vì nuốt nhựa.",
    "Đến năm 2050, có thể sẽ có nhiều nhựa hơn cá trong đại dương.",
    "Tái chế 1 tấn nhựa tiết kiệm 2.000$ năng lượng.",
    "Rùa biển có thể sống hơn 100 tuổi!",
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const lastMood = localStorage.getItem("bmo:pet:moodDate");
    const today = new Date().toDateString();
    if (lastMood !== today) {
      const moodCount = parseInt(localStorage.getItem("bmo:pet:moodCount") || "0", 10);
      if (moodCount >= 3) setPetMood("happy");
      else if (moodCount === 0) setPetMood("sad");
      else setPetMood("neutral");
    } else {
      const mood = localStorage.getItem("bmo:pet:mood");
      if (mood === "happy" || mood === "neutral" || mood === "sad") setPetMood(mood);
    }
  }, []);

  const tapPet = () => {
    const available = PET_FACTS.filter((f) => !factHistory.includes(f));
    const pool = available.length > 0 ? available : PET_FACTS;
    const fact = pool[Math.floor(Math.random() * pool.length)];
    setFactHistory((prev) => [...prev.slice(-4), fact]);
    setShowFact(fact);
    setTimeout(() => setShowFact(null), 3000);
    const today = new Date().toDateString();
    localStorage.setItem("bmo:pet:moodDate", today);
    localStorage.setItem("bmo:pet:mood", "happy");
    const prevCount = parseInt(localStorage.getItem("bmo:pet:moodCount") || "0", 10);
    localStorage.setItem("bmo:pet:moodCount", String(prevCount + 1));
    setPetMood("happy");
    const bonus = Math.floor(Math.random() * 6) + 3;
    onReward?.(bonus);
  };

  const getPetStage = () => {
    const moodIcon = petMood === "happy" ? "✨" : petMood === "sad" ? "💧" : "🌿";
    if (points < 50)
      return {
        level: 1,
        icon: <div className="text-gray-800 text-6xl drop-shadow-md grayscale opacity-80 relative">{moodIcon}<span className="absolute -top-1 -right-1 text-xs">{moodIcon}</span></div>,
        name: "Trứng Rùa Kẹt Rác",
        desc: "Rùa con chưa thể nở vì bãi biển quá nhiều rác nhựa.",
        target: 50,
      };
    if (points < 100)
      return {
        level: 2,
        icon: <div className="text-emerald-400 text-7xl drop-shadow-lg relative">{petMood === "happy" ? "🐢✨" : petMood === "sad" ? "💧🐢" : "🌿🐢"}</div>,
        name: "Rùa Biển Nhỏ",
        desc: "Tuyệt vời, rùa con đã nở nhờ bạn dọn dẹp bãi biển!",
        target: 100,
      };
    if (points < 200)
      return {
        level: 3,
        icon: <div className="text-green-500 text-7xl drop-shadow-xl h-16 w-24 flex items-center justify-center text-[80px] relative">🐢{petMood === "happy" && <span className="text-blue-500 text-2xl absolute -top-2 -right-2 animate-pulse">✨</span>}</div>,
        name: "Rùa Biển Khỏe Mạnh",
        desc: "Rùa đang lớn lên trong làn nước sạch bóng.",
        target: 200,
      };
    return {
      level: 4,
      icon: <div className="text-green-700 text-7xl drop-shadow-2xl h-24 w-32 flex items-center justify-center text-[100px] relative">🐢{petMood === "happy" && <span className="text-yellow-400 text-4xl absolute -top-4 -right-4">👑</span>}</div>,
      name: "Rùa Thần Biển Cả",
      desc: "Thật kỳ diệu! Rùa đã trở thành biểu tượng của đại dương xanh.",
      target: 500,
    };
  };

  const stage = getPetStage();
  const progress = Math.min((points / stage.target) * 100, 100);

  const handleClean = () => {
    setCleaned(true);
    const bonus = Math.floor(Math.random() * 11) + 5; // 5-15 EXP
    onReward?.(bonus);
    setTimeout(() => setCleaned(false), 2500);
  };

  return (
    <div className="bg-gradient-to-b from-sky-50 to-blue-100 rounded-3xl p-6 shadow-[inset_0_2px_20px_rgba(255,255,255,0.5)] border border-blue-100/50 flex flex-col items-center text-center relative overflow-hidden group">
      {isLoading ? (
        <>
          <div className="animate-pulse bg-white/60 rounded-xl h-6 w-48 mb-1" />
          <div className="animate-pulse bg-white/40 rounded h-3 w-32 mb-8" />
          <div className="animate-pulse bg-white/40 rounded-xl h-40 w-full mb-6" />
          <div className="animate-pulse bg-white/40 rounded-full h-3.5 w-full max-w-[240px]" />
        </>
      ) : (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-6 -right-6 text-amber-400 opacity-80"
          >
            <Sun size={80} className="fill-amber-200" />
          </motion.div>

          <motion.div
            animate={{ x: [0, 20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-8 left-4 w-12 h-4 bg-white/60 rounded-full blur-[2px]"
          />
          <motion.div
            animate={{ x: [0, -15, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-16 right-8 w-16 h-5 bg-white/50 rounded-full blur-[2px]"
          />

          <h3 className="text-lg font-black text-blue-800 flex items-center gap-2 mb-1 relative z-10 drop-shadow-sm">
            <Leaf className="fill-emerald-400" /> Trạm Cứu Hộ Thú Cưng
          </h3>
          <p className="text-xs font-bold text-blue-600/70 mb-8 uppercase tracking-widest relative z-10">
            Nuôi rùa biển bằng EXP
          </p>

          <div className="relative h-40 flex items-end justify-center w-full mb-6 relative z-10">

            <div className="absolute bottom-0 w-32 h-8 bg-gradient-to-t from-blue-900/40 to-blue-700/10 rounded-[100%] blur-sm pointer-events-none" />

            {stage.level === 1 && (
              <div className="absolute bottom-0 text-xl flex gap-4 text-gray-500 opacity-70">
                <span>🥤</span>
                <span>🛍️</span>
              </div>
            )}

            <AnimatePresence>
              {cleaned && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.2, transition: { duration: 0.3 } }}
                  className="absolute top-0 flex gap-4 text-emerald-400"
                >
                  <Sparkles size={24} className="animate-bounce" style={{ animationDelay: "0ms" }} />
                  <Sparkles size={20} className="animate-bounce" style={{ animationDelay: "150ms" }} />
                  <Sparkles size={28} className="animate-bounce" style={{ animationDelay: "300ms" }} />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              layout
              key={stage.level}
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{
                scale: cleaned ? [1, 1.1, 1, 1.1, 1] : 1,
                opacity: 1,
                y: cleaned ? -10 : 0,
                filter: cleaned ? "saturate(1.5) brightness(1.2)" : "saturate(1) brightness(1)",
              }}
              transition={{
                scale: { duration: 2 },
                default: { type: "spring", bounce: 0.5 },
              }}
              className="relative z-10 pb-4 cursor-pointer select-none"
              onClick={tapPet}
              title="Chạm để nhận kỳ diệm!"
            >
              {stage.icon}

              <AnimatePresence>
                {cleaned && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], rotate: [0, 90, 180] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -top-4 -right-4 text-yellow-400"
                  >
                    <Sparkles size={20} className="fill-current" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Fact bubble */}
          <AnimatePresence>
            {showFact && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="relative z-20 w-full max-w-[280px] bg-white/90 backdrop-blur-sm border border-blue-200 rounded-xl px-3 py-2 mb-2 shadow-lg text-center"
              >
                <p className="text-[11px] text-blue-800 font-medium leading-relaxed">🌊 {showFact}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div layout className="relative z-10 w-full max-w-[240px]">
            <h4 className="font-black text-gray-800 text-xl mb-1">{stage.name}</h4>
            <p className="text-gray-500 text-xs mb-4 min-h-[32px] leading-relaxed">{stage.desc}</p>

            <div className="w-full bg-white/50 rounded-full h-3.5 mb-1 relative overflow-hidden shadow-inner border border-white/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={`h-full bg-gradient-to-r ${points >= stage.target ? "from-amber-400 to-yellow-400" : "from-blue-400 to-cyan-500"} rounded-full relative`}
              >
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMCcgaGVpZ2h0PScxMCc+CiAgPHJlY3Qgd2lkdGg9JzEwJyBoZWlnaHQ9JzEwJyBmaWxsPSd0cmFuc3BhcmVudCcgLz4KICA8bGluZSB4MT0nMCcgeTE9JzEwJyB4Mj0nMTAnIHkyPScwJyBzdHJva2U9J3doaXRlJyBzdHJva2Utd2lkdGg9JzEnIG9wYWNpdHk9JzAuMyc+PC9saW5lPgo8L3N2Zz4=')] bg-repeat opacity-30" />
              </motion.div>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase text-blue-700/70 mb-4 px-1">
              <span>{points} EXP</span>
              <span>{stage.target} EXP</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClean}
              disabled={cleaned}
              className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white px-6 py-3 rounded-2xl font-black shadow-[0_4px_15px_-3px_rgba(16,185,129,0.4)] disabled:opacity-70 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles size={18} className="fill-emerald-200" />
              {cleaned ? "Bien Da Sach!" : `Don Rac Dai Duong (+5-15 EXP)`}
            </motion.button>
          </motion.div>
        </>
      )}
    </div>
  );
}
