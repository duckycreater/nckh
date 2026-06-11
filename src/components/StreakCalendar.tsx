import React from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

interface Props {
  streakDays: number;
  lastUpdateDate: string;
}

export function StreakCalendar({ streakDays, lastUpdateDate }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build last 7 days (today = last element)
  const days: { date: Date; label: string; dayLabel: string; isToday: boolean; isActive: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const isToday = i === 0;
    // A day is "active" if the user's lastUpdateDate matches that day
    const dateStr = d.toDateString();
    const isActive = dateStr === lastUpdateDate || (streakDays > 1 && !isToday);
    days.push({
      date: d,
      label: dateStr,
      dayLabel: d.toLocaleDateString("vi-VN", { weekday: "short" }),
      isToday,
      isActive,
    });
  }

  const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const getFireLevel = () => {
    if (streakDays >= 7) return 3;
    if (streakDays >= 4) return 2;
    if (streakDays >= 2) return 1;
    return 0;
  };
  const fireLevel = getFireLevel();

  return (
    <div className="bg-gradient-to-b from-sky-50 to-blue-100 rounded-3xl p-5 shadow-sm border border-blue-100/50 flex flex-col items-center text-center relative overflow-hidden">
      {/* Decorative sun */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-6 -right-6 text-amber-400 opacity-80"
      >
        <svg width="80" height="80" viewBox="0 0 80 80" className="fill-amber-200">
          <circle cx="40" cy="40" r="20" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <line
              key={angle}
              x1="40"
              y1="40"
              x2={40 + 28 * Math.cos((angle * Math.PI) / 180)}
              y2={40 + 28 * Math.sin((angle * Math.PI) / 180)}
              stroke="#fbbf24"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </motion.div>

      <h3 className="text-base font-black text-blue-800 flex items-center gap-2 mb-1 relative z-10 drop-shadow-sm">
        <Calendar className="text-blue-500" size={18} /> Lịch Sử Check-in
      </h3>
      <p className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest mb-5 relative z-10">
        7 ngày gần nhất
      </p>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1.5 w-full mb-2 relative z-10">
        {dayNames.map((name) => (
          <div key={name} className="text-center text-[9px] font-bold text-blue-500/60 uppercase">
            {name}
          </div>
        ))}
      </div>

      {/* Day bubbles */}
      <div className="grid grid-cols-7 gap-1.5 w-full mb-4 relative z-10">
        {days.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05, type: "spring", damping: 15 }}
              className={`relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                day.isToday
                  ? day.isActive
                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/40 ring-2 ring-blue-300"
                    : "bg-white text-blue-400 border-2 border-blue-300 shadow-sm"
                  : day.isActive
                  ? "bg-emerald-400 text-white shadow-sm"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {day.date.getDate()}
              {day.isToday && (
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-blue-400"
                />
              )}
              {day.isActive && !day.isToday && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white shadow-sm" />
              )}
            </motion.div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-blue-600/70 relative z-10">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
          <span>Hôm nay</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span>Đã check</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-200" />
          <span>Chưa</span>
        </div>
      </div>

      {/* Streak summary */}
      {streakDays > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-white/70 backdrop-blur rounded-xl px-4 py-2 border border-blue-200/50 relative z-10"
        >
          {/* Fire animation based on streak level */}
          {fireLevel > 0 && (
            <motion.div
              animate={fireLevel === 3 ? {
                scale: [1, 1.08, 1],
                filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"],
              } : { scale: [1, 1.04, 1] }}
              transition={fireLevel === 3 ? { duration: 0.8, repeat: Infinity } : { duration: 1.2, repeat: Infinity }}
              className="inline-block mr-2 align-middle"
            >
              {fireLevel === 1 ? (
                <span className="text-orange-400 text-base">🔥</span>
              ) : fireLevel === 2 ? (
                <span className="text-orange-500 text-lg">🔥</span>
              ) : (
                <span className="text-red-500 text-xl">🔥</span>
              )}
            </motion.div>
          )}
          <span className="text-sm font-black text-blue-700">
            Chuỗi hiện tại:{" "}
            <span className="text-orange-500">{streakDays}</span> ngày liên tiếp
          </span>
          {fireLevel === 3 && (
            <motion.div
              animate={{ y: [0, -4, 0], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -top-1 right-2 text-red-400 text-xs"
            >
              ⚡
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
