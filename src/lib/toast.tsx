import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";

interface ToastItem {
  id: number;
  points: number;
  multiplier: number;
  reason: string;
}

let toastId = 0;

export function showPointsToast(points: number, multiplier: number, reason: string) {
  const event = new CustomEvent<ToastItem>("ecoquest:points-toast", {
    detail: { id: ++toastId, points, multiplier, reason },
  });
  window.dispatchEvent(event);
}

export function PointsToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const item = (e as CustomEvent<ToastItem>).detail;
      setToasts((prev) => [...prev, item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 3200);
    };
    window.addEventListener("ecoquest:points-toast", handler);
    return () => window.removeEventListener("ecoquest:points-toast", handler);
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -24, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white/95 backdrop-blur shadow-xl rounded-2xl px-5 py-3 flex items-center gap-3 border border-emerald-100"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <TrendingUp size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-800 leading-tight">{t.reason}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-base font-black text-emerald-600">+{t.points}</span>
                {t.multiplier > 1 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: "spring" }}
                    className="flex items-center gap-0.5 bg-orange-100 text-orange-600 text-[11px] font-black px-1.5 py-0.5 rounded-full"
                  >
                    <Flame size={10} className="fill-current" />
                    x{t.multiplier.toFixed(1)}
                  </motion.span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
