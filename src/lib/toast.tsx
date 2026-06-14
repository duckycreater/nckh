import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, TrendingUp, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

type ToastTone = "success" | "warning" | "info" | "error";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  points?: number;
  multiplier?: number;
}

let toastId = 0;

export function showPointsToast(points: number, multiplier: number, reason: string) {
  const event = new CustomEvent<ToastItem>("ecoquest:toast", {
    detail: {
      id: ++toastId,
      title: reason,
      description: multiplier > 1 ? `Nhân thưởng x${multiplier.toFixed(1)}` : "Điểm thưởng đã được cộng vào tài khoản của bạn.",
      tone: "success",
      points,
      multiplier,
    },
  });
  window.dispatchEvent(event);
}

export function showToast(title: string, description?: string, tone: ToastTone = "info") {
  const event = new CustomEvent<ToastItem>("ecoquest:toast", {
    detail: {
      id: ++toastId,
      title,
      description,
      tone,
    },
  });
  window.dispatchEvent(event);
}

function toneMeta(tone: ToastTone) {
  if (tone === "success") {
    return {
      icon: <CheckCircle2 size={18} className="text-emerald-600" />,
      iconBg: "bg-emerald-100",
      border: "border-emerald-100",
    };
  }
  if (tone === "warning") {
    return {
      icon: <AlertTriangle size={18} className="text-amber-600" />,
      iconBg: "bg-amber-100",
      border: "border-amber-100",
    };
  }
  if (tone === "error") {
    return {
      icon: <XCircle size={18} className="text-red-600" />,
      iconBg: "bg-red-100",
      border: "border-red-100",
    };
  }
  return {
    icon: <Info size={18} className="text-indigo-600" />,
    iconBg: "bg-indigo-100",
    border: "border-indigo-100",
  };
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
    window.addEventListener("ecoquest:toast", handler);
    return () => window.removeEventListener("ecoquest:toast", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const meta = toneMeta(t.tone);
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className={`flex items-center gap-3 rounded-2xl border bg-white/95 px-5 py-3 shadow-xl backdrop-blur ${meta.border}`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm ${meta.iconBg}`}>
                {t.points ? <TrendingUp size={18} className="text-emerald-600" /> : meta.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold leading-tight text-gray-800">{t.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  {typeof t.points === "number" && (
                    <span className="text-base font-black text-emerald-600">+{t.points}</span>
                  )}
                  {t.description && <span>{t.description}</span>}
                  {t.multiplier && t.multiplier > 1 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15, type: "spring" }}
                      className="flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[11px] font-black text-orange-600"
                    >
                      <Flame size={10} className="fill-current" />
                      x{t.multiplier.toFixed(1)}
                    </motion.span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
