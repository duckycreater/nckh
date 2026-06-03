import React, { useState } from "react";
import { Leaf, Droplets, TreePine, Sprout, Sun, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  points: number;
}

export function VirtualGarden({ points }: Props) {
  const [cleaned, setCleaned] = useState(false);

  const getPetStage = () => {
    if (points < 50)
      return {
        level: 1,
        icon: <div className="text-gray-800 text-6xl drop-shadow-md grayscale opacity-80">🥚</div>,
        name: "Trứng Rùa Kẹt Rác",
        desc: "Rùa con chưa thể nở vì bãi biển quá nhiều rác nhựa.",
        target: 50,
      };
    if (points < 100)
      return {
        level: 2,
        icon: <div className="text-emerald-400 text-7xl drop-shadow-lg">🐢</div>,
        name: "Rùa Biển Nhỏ",
        desc: "Tuyệt vời, rùa con đã nở nhờ bạn dọn dẹp bãi biển!",
        target: 100,
      };
    if (points < 200)
      return {
        level: 3,
        icon: <div className="text-green-500 text-7xl drop-shadow-xl h-16 w-24 flex items-center justify-center text-[80px]">🐢<span className="text-blue-500 text-2xl absolute -top-2 -right-2">✨</span></div>,
        name: "Rùa Biển Khỏe Mạnh",
        desc: "Rùa đang lớn lên trong làn nước sạch bóng.",
        target: 200,
      };
    return {
      level: 4,
      icon: <div className="text-green-700 text-7xl drop-shadow-2xl h-24 w-32 flex items-center justify-center text-[100px]">🐢<span className="text-yellow-400 text-4xl absolute -top-4 -right-4">👑</span></div>,
      name: "Rùa Thần Biển Cả",
      desc: "Thật kỳ diệu! Rùa đã trở thành biểu tượng của đại dương xanh.",
      target: 500,
    };
  };

  const stage = getPetStage();
  const progress = Math.min((points / stage.target) * 100, 100);

  const handleClean = () => {
    setCleaned(true);
    setTimeout(() => setCleaned(false), 2500);
  };

  return (
    <div className="bg-gradient-to-b from-sky-50 to-blue-100 rounded-3xl p-6 shadow-[inset_0_2px_20px_rgba(255,255,255,0.5)] border border-blue-100/50 flex flex-col items-center text-center relative overflow-hidden group">
      {/* Sun decoration */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-6 -right-6 text-amber-400 opacity-80"
      >
        <Sun size={80} className="fill-amber-200" />
      </motion.div>

      {/* Cloud decorations */}
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

      {/* Plant Area */}
      <div className="relative h-40 flex items-end justify-center w-full mb-6 relative z-10">
        
        {/* Ground */}
        <div className="absolute bottom-0 w-32 h-8 bg-gradient-to-t from-blue-900/40 to-blue-700/10 rounded-[100%] blur-sm pointer-events-none" />
        
        {/* Trash decoration if level 1 */}
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
              <Sparkles size={24} className="animate-bounce" style={{ animationDelay: '0ms' }} />
              <Sparkles size={20} className="animate-bounce" style={{ animationDelay: '150ms' }} />
              <Sparkles size={28} className="animate-bounce" style={{ animationDelay: '300ms' }} />
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
            filter: cleaned ? 'saturate(1.5) brightness(1.2)' : 'saturate(1) brightness(1)'
          }}
          transition={{ 
            scale: { duration: 2 },
            default: { type: "spring", bounce: 0.5 }
          }}
          className="relative z-10 pb-4"
        >
          {stage.icon}
          
          {/* Sparkles when watered */}
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

      <motion.div layout className="relative z-10 w-full max-w-[240px]">
        <h4 className="font-black text-gray-800 text-xl mb-1">{stage.name}</h4>
        <p className="text-gray-500 text-xs mb-4 min-h-[32px] leading-relaxed">{stage.desc}</p>
        
        {/* EXP Bar */}
        <div className="w-full bg-white/50 rounded-full h-3.5 mb-1 relative overflow-hidden shadow-inner border border-white/60">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`h-full bg-gradient-to-r ${points >= stage.target ? 'from-amber-400 to-yellow-400' : 'from-blue-400 to-cyan-500'} rounded-full relative`}
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
          {cleaned ? "Bien Da Sach!" : "Don Rac Dai Duong"}
        </motion.button>
      </motion.div>
    </div>
  );
}
