import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Layers, Lock, Swords, X, Wand2,
  ArrowUp, GitMerge, Zap, Trophy, Star, ChevronDown,
  Squirrel, RefreshCw, Info, ArrowRight
} from "lucide-react";
import { UserProgress } from "../types";
import { ALL_CARDS, RARITIES, getElementIcon, ELEMENTS, calcPower, getXpForLevel, getFusedXp, ELEMENT_COUNTER, getAdvantage, getDisadvantage } from "../lib/cards";
import { CardBattle } from "./CardBattle";
import { Badge, Button, Card, EmptyState, ModalShell } from "../lib/ui";

interface Props {
  onReward: (points: number) => void;
  onSpend?: (cost: number, reason: string) => void;
  points?: number;
  userId: string;
  progress?: UserProgress;
  onRefresh?: (progress?: any) => void;
}

const PULL_COST = 50;
const DECK_SIZE = 5;
type Section = "collection" | "fusion" | "levelup" | "gacha" | "battle";

function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Rarity design tokens ─────────────────────────────────────────────────────
const RARITY: Record<string, {
  name: string;
  bg: string;
  border: string;
  frameAccent: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  glow: string;
  glowColor: string;
  shimmerColor: string;
  bannerGrad: string;
  orbColor: string;
  orbGlow: string;
  atkColor: string;
  hpColor: string;
  pwrColor: string;
  frameBorder: string;
}> = {
  common: {
    name: "Phổ thông",
    bg: "from-slate-100 to-slate-200",
    border: "border-slate-400",
    frameAccent: "#64748b",
    badgeBg: "bg-slate-200",
    badgeText: "text-slate-600",
    badgeBorder: "border-slate-300",
    glow: "shadow-slate-400/20",
    glowColor: "#94a3b8",
    shimmerColor: "#cbd5e1",
    bannerGrad: "from-slate-500 to-slate-700",
    orbColor: "#94a3b8",
    orbGlow: "#cbd5e1",
    atkColor: "#ef4444",
    hpColor: "#22c55e",
    pwrColor: "#64748b",
    frameBorder: "#cbd5e1",
  },
  rare: {
    name: "Hiếm",
    bg: "from-blue-100 to-indigo-200",
    border: "border-blue-500",
    frameAccent: "#2563eb",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-300",
    glow: "shadow-blue-500/30",
    glowColor: "#3b82f6",
    shimmerColor: "#93c5fd",
    bannerGrad: "from-blue-500 to-indigo-600",
    orbColor: "#3b82f6",
    orbGlow: "#93c5fd",
    atkColor: "#ef4444",
    hpColor: "#22c55e",
    pwrColor: "#2563eb",
    frameBorder: "#93c5fd",
  },
  epic: {
    name: "Siêu hiếm",
    bg: "from-purple-100 to-pink-200",
    border: "border-purple-500",
    frameAccent: "#9333ea",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    badgeBorder: "border-purple-300",
    glow: "shadow-purple-500/40",
    glowColor: "#a855f7",
    shimmerColor: "#d8b4fe",
    bannerGrad: "from-purple-600 to-pink-600",
    orbColor: "#a855f7",
    orbGlow: "#d8b4fe",
    atkColor: "#ef4444",
    hpColor: "#22c55e",
    pwrColor: "#9333ea",
    frameBorder: "#d8b4fe",
  },
  legendary: {
    name: "Huyền thoại",
    bg: "from-amber-100 to-orange-200",
    border: "border-amber-500",
    frameAccent: "#d97706",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-300",
    glow: "shadow-amber-500/50",
    glowColor: "#f59e0b",
    shimmerColor: "#fde68a",
    bannerGrad: "from-amber-500 to-orange-600",
    orbColor: "#f59e0b",
    orbGlow: "#fde68a",
    atkColor: "#ef4444",
    hpColor: "#22c55e",
    pwrColor: "#d97706",
    frameBorder: "#fde68a",
  },
};

const RARITY_ORDER = ["legendary", "epic", "rare", "common"];

const TABS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "collection", label: "Bộ sưu tập", icon: <Layers size={13} /> },
  { id: "fusion", label: "Hợp nhất", icon: <GitMerge size={13} /> },
  { id: "levelup", label: "Lên cấp", icon: <ArrowUp size={13} /> },
  { id: "gacha", label: "Mở gói", icon: <Sparkles size={13} /> },
  { id: "battle", label: "Đấu trường", icon: <Swords size={13} /> },
];

// ─── Element art SVGs ─────────────────────────────────────────────────────────
function ElementArt({ elementId, size = 48 }: { elementId: string; size?: number }) {
  const s = size;
  switch (elementId) {
    case "plastic":
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" fill="url(#plastic-bg)" stroke="url(#plastic-stroke)" strokeWidth="2"/>
          <path d="M16 34V20a4 4 0 014-4h8a4 4 0 014 4v14" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M24 16v-2a4 4 0 00-4-4" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M24 14a4 4 0 014-4" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M20 24h8M24 20v8" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
          <defs>
            <radialGradient id="plastic-bg" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#e0f2fe"/><stop offset="100%" stopColor="#a5f3fc"/></radialGradient>
            <linearGradient id="plastic-stroke" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#0891b2"/></linearGradient>
          </defs>
        </svg>
      );
    case "paper":
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect x="10" y="6" width="28" height="36" rx="3" fill="url(#paper-bg)" stroke="url(#paper-stroke)" strokeWidth="2"/>
          <path d="M15 16h18M15 22h18M15 28h12" stroke="#d97706" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
          <path d="M18 6V4a2 2 0 012-2h8a2 2 0 012 2v2" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/>
          <path d="M30 6h6a2 2 0 012 2v8" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
          <defs>
            <linearGradient id="paper-bg" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#fef3c7"/><stop offset="100%" stopColor="#fde68a"/></linearGradient>
            <linearGradient id="paper-stroke" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#d97706"/></linearGradient>
          </defs>
        </svg>
      );
    case "glass":
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M14 40V18l10-10 10 10v22" fill="url(#glass-bg)" stroke="url(#glass-stroke)" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M14 18h20" stroke="#0d9488" strokeWidth="2" strokeLinecap="round"/>
          <path d="M18 26h12M18 32h8" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
          <path d="M20 14l4-4 4 4" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
          <defs>
            <linearGradient id="glass-bg" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#d1fae5"/><stop offset="100%" stopColor="#a7f3d0"/></linearGradient>
            <linearGradient id="glass-stroke" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#14b8a6"/><stop offset="100%" stopColor="#0d9488"/></linearGradient>
          </defs>
        </svg>
      );
    case "metal":
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <ellipse cx="24" cy="14" rx="12" ry="5" fill="url(#metal-top)" stroke="#64748b" strokeWidth="2"/>
          <path d="M12 14v22c0 2.76 5.37 5 12 5s12-2.24 12-5V14" fill="url(#metal-body)" stroke="#64748b" strokeWidth="2"/>
          <path d="M16 22h16M16 29h12" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
          <ellipse cx="24" cy="14" rx="6" ry="2" fill="#e2e8f0" opacity="0.4"/>
          <defs>
            <linearGradient id="metal-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f1f5f9"/><stop offset="100%" stopColor="#cbd5e1"/></linearGradient>
            <linearGradient id="metal-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e2e8f0"/><stop offset="100%" stopColor="#94a3b8"/></linearGradient>
          </defs>
        </svg>
      );
    case "organic":
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="18" fill="url(#organic-bg)" stroke="url(#organic-stroke)" strokeWidth="2"/>
          <path d="M24 14c-2-5 4-8 7-6s3 7 0 9-7 4-8 2" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M24 28v8M21 32h6" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="30" cy="18" r="2" fill="#22c55e" opacity="0.5"/>
          <circle cx="18" cy="20" r="1.5" fill="#22c55e" opacity="0.4"/>
          <defs>
            <radialGradient id="organic-bg" cx="35%" cy="30%" r="65%"><stop offset="0%" stopColor="#bbf7d0"/><stop offset="100%" stopColor="#86efac"/></radialGradient>
            <linearGradient id="organic-stroke" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#22c55e"/><stop offset="100%" stopColor="#15803d"/></linearGradient>
          </defs>
        </svg>
      );
    case "hazard":
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect x="10" y="16" width="28" height="20" rx="3" fill="url(#hazard-bg)" stroke="url(#hazard-stroke)" strokeWidth="2"/>
          <path d="M18 16v-4a6 6 0 0112 0v4" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M14 24h20M14 30h20" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
          <circle cx="24" cy="27" r="3" fill="#ef4444" opacity="0.7"/>
          <path d="M14 20h4M30 20h4" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
          <defs>
            <linearGradient id="hazard-bg" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#fee2e2"/><stop offset="100%" stopColor="#fecaca"/></linearGradient>
            <linearGradient id="hazard-stroke" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#ef4444"/><stop offset="100%" stopColor="#dc2626"/></linearGradient>
          </defs>
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="18" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2"/>
          <text x="24" y="30" textAnchor="middle" fontSize="20" fill="#64748b">?</text>
        </svg>
      );
  }
}

// ─── GameCard thumbnail ───────────────────────────────────────────────────────
function GameCard({ card, count, onClick, selected, level = 1 }: {
  card: any; count?: number; onClick?: () => void; selected?: boolean; level?: number;
}) {
  const rs = RARITY[card.rarity.id] || RARITY.common;
  const power = calcPower(card, level);

  return (
    <motion.button
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`
        relative w-full cursor-pointer overflow-hidden rounded-2xl border-2 text-left
        transition-all duration-200
        ${rs.border} ${selected ? `ring-2 ring-amber-400 ring-offset-1 ${rs.glow}` : rs.glow}
      `}
      style={{ aspectRatio: "3/4" }}
    >
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${rs.bg}`} />

      {/* Top frame bar */}
      <div className="absolute inset-x-0 top-0 h-2 rounded-t-[18px]" style={{ background: `linear-gradient(to right, ${rs.frameBorder}, ${rs.frameAccent}, ${rs.frameBorder})` }} />

      {/* Element art */}
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <motion.div
          className="relative"
          animate={card.rarity.id === "legendary" ? { filter: `drop-shadow(0 0 6px ${rs.glowColor})` } : {}}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
        >
          <ElementArt elementId={card.element.id} size={52} />
        </motion.div>
      </div>

      {/* Bottom info panel */}
      <div className="absolute inset-x-0 bottom-0 rounded-b-[18px] bg-gradient-to-t from-white/95 via-white/80 to-transparent p-2">
        {/* Rarity + count row */}
        <div className="flex items-center justify-between">
          <span className={`rounded-full border px-1.5 py-0.5 text-[6px] font-black uppercase tracking-wide ${rs.badgeBg} ${rs.badgeText} ${rs.badgeBorder}`}
            style={{ borderWidth: 0.5 }}>
            {rs.name}
          </span>
          {count != null && count > 1 && (
            <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[6px] font-black text-white">
              x{count}
            </span>
          )}
        </div>

        {/* Level stars */}
        {level > 1 && (
          <div className="mt-0.5 flex items-center gap-0.5">
            {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
              <Star key={i} size={7} className="fill-amber-400 text-amber-400" />
            ))}
          </div>
        )}

        {/* Name */}
        <p className="mt-0.5 line-clamp-2 text-center text-[7px] font-black leading-tight" style={{ color: rs.frameAccent }}>
          {card.name}
        </p>

        {/* Stats row */}
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-black" style={{ color: rs.atkColor }}>⚔{card.atk}</span>
            <span className="text-[7px] font-black" style={{ color: rs.hpColor }}>♥{card.hp}</span>
          </div>
          <span className="text-[7px] font-black" style={{ color: rs.pwrColor }}>⚡{power}</span>
        </div>
      </div>

      {/* Shimmer for epic+ */}
      {(card.rarity.id === "epic" || card.rarity.id === "legendary") && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            style={{ width: "30%", transform: "skewX(-15deg)" }}
          />
        </div>
      )}
    </motion.button>
  );
}

// ─── CardModal ────────────────────────────────────────────────────────────────
function CardModal({ card, unlocked, count, level = 1, onAddToDeck }: {
  card: any; unlocked: boolean; count: number; level: number; onAddToDeck?: () => void;
}) {
  const rs = RARITY[card.rarity.id] || RARITY.common;
  const power = calcPower(card, level);
  const advEl = getAdvantage(card.element.id);
  const disEl = getDisadvantage(card.element.id);
  const advData = ELEMENTS.find((e) => e.id === advEl);
  const disData = ELEMENTS.find((e) => e.id === disEl);

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0, rotateY: -15 }}
      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="relative px-2 pb-2"
    >
      <button
        onClick={() => {}}
        className="absolute -right-1 -top-1 z-30 rounded-full bg-white p-2 shadow-lg transition hover:bg-slate-100 text-slate-400 hover:text-slate-700"
      >
        <X size={14} />
      </button>

      {/* Card frame */}
      <div className={`overflow-hidden rounded-3xl border-2 ${rs.border} ${rs.glow}`} style={{ boxShadow: `0 0 20px ${rs.glowColor}40` }}>
        <div className={`bg-gradient-to-br ${rs.bg} p-1`}>
          <div className="relative rounded-2xl bg-white/95 p-5 backdrop-blur-sm">

            {/* ID + Rarity */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                #{String(card.id).padStart(3, "0")}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase ${rs.badgeBg} ${rs.badgeText}`}
                style={{ borderColor: rs.frameBorder, borderWidth: 1 }}>
                {rs.name}
              </span>
            </div>

            {/* Element art */}
            <div className="mb-3 flex justify-center">
              <motion.div
                className="relative"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
              >
                <div className="rounded-3xl bg-white/80 p-3 shadow-sm" style={{ boxShadow: `0 4px 20px ${rs.glowColor}30` }}>
                  <ElementArt elementId={card.element.id} size={80} />
                </div>
              </motion.div>
            </div>

            {/* Name + element */}
            <p className="mb-0.5 text-center text-lg font-black" style={{ color: rs.frameAccent }}>
              {card.name}
            </p>
            <p className="mb-4 text-center text-xs text-slate-400">
              Hệ {card.element.name}
            </p>

            {/* Stats */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <motion.div
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex flex-col items-center rounded-2xl bg-red-50 p-3"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">ATK</span>
                <motion.p
                  initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-2xl font-black" style={{ color: rs.atkColor }}
                >
                  {card.atk}
                </motion.p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center rounded-2xl bg-emerald-50 p-3"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">HP</span>
                <motion.p
                  initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.25, type: "spring" }}
                  className="text-2xl font-black" style={{ color: rs.hpColor }}
                >
                  {card.hp}
                </motion.p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-col items-center rounded-2xl bg-slate-100 p-3"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PWR</span>
                <motion.p
                  initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="text-2xl font-black" style={{ color: rs.pwrColor }}
                >
                  {power}
                </motion.p>
              </motion.div>
            </div>

            {/* Level bar */}
            {level > 1 && (
              <div className="mb-3 flex items-center gap-2">
                <span className="flex gap-0.5">
                  {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
                    <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                  ))}
                </span>
                <span className="text-[9px] font-bold text-amber-600">Lv{level}</span>
              </div>
            )}

            {/* Element counter */}
            {(advEl || disEl) && (
              <div className="mb-3 flex flex-wrap justify-center gap-2">
                {advEl && advData && (
                  <motion.div
                    initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5"
                  >
                    <span className="text-[10px] font-black text-emerald-700">VS</span>
                    <ElementArt elementId={advEl} size={16} />
                    <span className="text-[10px] font-bold text-emerald-700">{advData.name}</span>
                    <span className="rounded-full bg-emerald-200 px-1.5 py-0.5 text-[8px] font-black text-emerald-800">+50%</span>
                  </motion.div>
                )}
                {disEl && disData && (
                  <motion.div
                    initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 }}
                    className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5"
                  >
                    <span className="text-[10px] font-black text-red-700">VS</span>
                    <ElementArt elementId={disEl} size={16} />
                    <span className="text-[10px] font-bold text-red-700">{disData.name}</span>
                    <span className="rounded-full bg-red-200 px-1.5 py-0.5 text-[8px] font-black text-red-800">-25%</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500">
              <span>Cấp {level} · Sở hữu</span>
              <span className="text-amber-600">x{count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deck button */}
      {unlocked && onAddToDeck && (
        <Button onClick={onAddToDeck} className="mt-3 w-full text-sm font-bold" size="md">
          <Swords size={13} />Vào đội hình
        </Button>
      )}
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function Flashcards({ onReward, onSpend, points = 0, userId, progress, onRefresh }: Props) {
  const [unlockedCards, setUnlockedCards] = useState<number[]>([]);
  const [gachaResult, setGachaResult] = useState<any>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [viewingCard, setViewingCard] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<Section>("collection");
  const [sortBy, setSortBy] = useState<"power" | "atk" | "hp">("power");
  const [showLocked, setShowLocked] = useState(false);
  const [cardLevels, setCardLevels] = useState<Record<string, number>>({});
  const [deck, setDeck] = useState<number[]>([]);
  const [fusing, setFusing] = useState(false);
  const [fuseMsg, setFuseMsg] = useState<string | null>(null);
  const [levelingUp, setLevelingUp] = useState(false);
  const [levelupMsg, setLevelupMsg] = useState<string | null>(null);
  const [showBattle, setShowBattle] = useState(false);
  const [filterElement, setFilterElement] = useState<string>("all");

  const fetchCardLevels = useCallback(async () => {
    try {
      const res = await fetch(`/api/cards/levels/${userId}`, getAuthHeaders());
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") setCardLevels(data);
      }
    } catch { /* silent */ }
  }, [userId]);

  useEffect(() => {
    if (progress) {
      const readSet = new Set<number>((progress.flashcardsRead as any)?.map(Number) || []);
      if (progress.flashcardCounts) {
        Object.keys(progress.flashcardCounts as Record<string, number>).forEach((k) => readSet.add(Number(k)));
      }
      setUnlockedCards(Array.from(readSet));
    }
    fetchCardLevels();
  }, [progress, fetchCardLevels]);

  const resolveCard = (raw: any): any => {
    if (!raw) return null;
    if (raw.element?.gradient) return raw;
    const id = Number(raw.id);
    const found = ALL_CARDS.find((c) => c.id === id);
    if (found) return found;
    const elData = ELEMENTS.find((e) => e.id === (raw as any).elementId || (raw as any).element?.id);
    const rData = RARITIES.find((r) => r.id === (raw as any).rarityId || (raw as any).rarity?.id);
    return {
      id,
      name: raw.name || "Thẻ Rác",
      element: elData || { id: (raw as any).elementId, name: (raw as any).element?.name || "??", gradient: "" },
      rarity: rData || { id: (raw as any).rarityId, name: (raw as any).rarity?.name || "Phổ thông" },
      hp: Number(raw.hp) || 0,
      atk: Number(raw.atk) || 0,
    };
  };

  const getCardCount = (cardId: number) => {
    const key = String(cardId);
    return (progress as any)?.flashcardCounts?.[key] || 0;
  };
  const getCardLevel = (cardId: number) => cardLevels[String(cardId)] || 1;

  const totalCards = 300;
  const collectedCount = unlockedCards.length;
  const collectionPower = unlockedCards.reduce((sum, id) => {
    const card = ALL_CARDS.find((c) => c.id === id);
    return sum + (card ? calcPower(card, getCardLevel(id)) : 0);
  }, 0);
  const countByRarity = (rarityId: string) =>
    ALL_CARDS.filter((c) => c.rarity.id === rarityId && unlockedCards.includes(c.id)).length;
  const fuseableCount = unlockedCards.filter((id) => getCardCount(id) >= 3).length;

  let displayCards = ALL_CARDS.filter((c) =>
    (filterRarity === "all" || c.rarity.id === filterRarity) &&
    (filterElement === "all" || c.element.id === filterElement)
  );
  if (!showLocked) displayCards = displayCards.filter((c) => unlockedCards.includes(c.id));
  displayCards = [...displayCards].sort((a, b) => {
    const la = getCardLevel(a.id), lb = getCardLevel(b.id);
    if (sortBy === "atk") return b.atk * lb - a.atk * la;
    if (sortBy === "hp") return b.hp * lb - a.hp * la;
    return calcPower(b, lb) - calcPower(a, la);
  });

  const deckCards = deck.map((id) => ALL_CARDS.find((c) => c.id === id)!).filter(Boolean);
  const deckPower = deckCards.reduce((sum, card) => sum + calcPower(card, getCardLevel(card.id)), 0);
  const canBattle = deck.length === DECK_SIZE;

  // Fetch latest progress
  const refreshProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/user-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: userId, type: "flashcard", data: null }),
      });
      const result = await res.json();
      if (result.success && result.progress) {
        const readSet = new Set<number>((result.progress.flashcardsRead as any)?.map(Number) || []);
        if (result.progress.flashcardCounts) {
          Object.keys(result.progress.flashcardCounts as Record<string, number>).forEach((k) => readSet.add(Number(k)));
        }
        setUnlockedCards(Array.from(readSet));
        if (onRefresh) onRefresh(result.progress);
      }
    } catch { /* silent */ }
  }, [userId, onRefresh]);

  // Gacha
  const handlePullGacha = () => {
    if (points < PULL_COST) return;
    setIsPulling(true);
    setGachaResult(null);
    if (onSpend) onSpend(PULL_COST, "Mở Gói Thẻ Bài");
    fetch("/api/user-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: userId, type: "flashcard", data: null }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.success && result.card) {
          const resolved = resolveCard(result.card);
          setGachaResult({ ...resolved, isNew: result.isNew });
          if (result.isNew) {
            setUnlockedCards((prev) => {
              const next = [...prev];
              const id = Number(result.card.id);
              if (!next.includes(id)) next.push(id);
              return next;
            });
          }
        }
        if (result.success && onRefresh) onRefresh(result.progress);
        setIsPulling(false);
      })
      .catch(() => setIsPulling(false));
  };

  // Fusion
  const handleFuse = async (cardId: number) => {
    setFusing(true);
    setFuseMsg(null);
    try {
      const res = await fetch("/api/cards/fuse", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ nickname: userId, cardId }),
      });
      const data = await res.json();
      setFuseMsg(data.success ? `Hợp nhất! +${data.xpGained} EXP` : (data.error || "Thất bại."));
      if (data.success) {
        await refreshProgress();
        fetchCardLevels();
      }
    } catch { setFuseMsg("Lỗi kết nối."); }
    setFusing(false);
    setTimeout(() => setFuseMsg(null), 4000);
  };

  // Level up
  const handleLevelUp = async (cardId: number) => {
    setLevelingUp(true);
    setLevelupMsg(null);
    try {
      const res = await fetch("/api/cards/levelup", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ nickname: userId, cardId }),
      });
      const data = await res.json();
      if (data.success) {
        setCardLevels((prev) => ({ ...prev, [String(cardId)]: data.newLevel }));
        setLevelupMsg(`Lên cấp ${data.newLevel}! -${data.xpCost} EXP`);
        await refreshProgress();
      } else {
        setLevelupMsg(data.error || "Thất bại.");
      }
    } catch { setLevelupMsg("Lỗi kết nối."); }
    setLevelingUp(false);
    setTimeout(() => setLevelupMsg(null), 4000);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-100 bg-white px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone="accent">Thẻ bài</Badge>
            <span className="text-sm text-slate-500">{collectedCount}/{totalCards}</span>
            {collectionPower > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                ⚡{collectionPower.toLocaleString()} PWR
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {fuseableCount > 0 && (
              <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                {fuseableCount} hợp nhất
              </span>
            )}
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-widest text-slate-400">EXP</p>
              <p className="text-lg font-black leading-none text-indigo-600">{points}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-1 overflow-x-auto thin-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                activeSection === tab.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto thin-scrollbar">

        {/* ─── COLLECTION ─── */}
        {activeSection === "collection" && (
          <div className="space-y-3 p-4">
            {/* Filters */}
            <div className="space-y-2">
              {/* Rarity filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button onClick={() => setFilterRarity("all")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    filterRarity === "all" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  Tất cả
                </button>
                {RARITY_ORDER.map((rid) => (
                  <button key={rid} onClick={() => setFilterRarity(rid)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                      filterRarity === rid
                        ? `${RARITY[rid].badgeBg} ${RARITY[rid].badgeText} border-2`
                        : "bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200"
                    }`}
                    style={filterRarity === rid ? { borderColor: RARITY[rid].glowColor } : {}}
                  >
                    {RARITY[rid].name}
                  </button>
                ))}
                <button onClick={() => setShowLocked(!showLocked)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${showLocked ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  <Lock size={10} className="inline mr-1" />
                  {showLocked ? "Ẩn khóa" : "Hiện khóa"}
                </button>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                  className="ml-auto rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-indigo-400">
                  <option value="power">⚡ PWR</option>
                  <option value="atk">⚔ ATK</option>
                  <option value="hp">♥ HP</option>
                </select>
              </div>

              {/* Element filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto thin-scrollbar pb-0.5">
                <button onClick={() => setFilterElement("all")}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                    filterElement === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                  Tất cả hệ
                </button>
                {ELEMENTS.map((el) => (
                  <button key={el.id} onClick={() => setFilterElement(el.id)}
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                      filterElement === el.id ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                    <span className="text-xs">{getElementIcon(el.id, 10)}</span>
                    {el.name}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400">{displayCards.length} thẻ</p>

            {displayCards.length === 0 ? (
              <EmptyState icon={<Layers size={40} className="text-slate-300" />}
                title="Không có thẻ" subtitle="Thử bộ lọc khác." />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {displayCards.map((card) => (
                  <GameCard
                    key={card.id}
                    card={card}
                    count={getCardCount(card.id)}
                    level={getCardLevel(card.id)}
                    onClick={() => setViewingCard(resolveCard(card))}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── FUSION ─── */}
        {activeSection === "fusion" && (
          <div className="space-y-3 p-4">
            {fuseMsg && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border px-4 py-2.5 text-sm font-bold ${
                  fuseMsg.includes("Hợp nhất") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                }`}>
                {fuseMsg}
              </motion.div>
            )}
            {unlockedCards.filter((id) => getCardCount(id) >= 3).length === 0 ? (
              <EmptyState icon={<GitMerge size={40} className="text-slate-300" />}
                title="Chưa có thẻ hợp nhất" subtitle="Cần 3 bản sao trở lên." />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {unlockedCards.filter((id) => getCardCount(id) >= 3).map((id) => {
                  const card = ALL_CARDS.find((c) => c.id === id)!;
                  const count = getCardCount(id);
                  const xpGain = getFusedXp(card.atk + card.hp);
                  const rs = RARITY[card.rarity.id] || RARITY.common;
                  return (
                    <div key={id} className={`flex flex-col items-center rounded-2xl border-2 p-3 text-center ${rs.border} ${rs.bg}`}>
                      <div className="relative">
                        <ElementArt elementId={card.element.id} size={40} />
                        <div className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[8px] font-black text-white">x{count}</div>
                      </div>
                      <p className="mt-1 text-[8px] font-black line-clamp-1" style={{ color: rs.frameAccent }}>{card.name}</p>
                      <div className="mt-1 rounded-full bg-amber-400 px-2 py-0.5 text-[8px] font-black text-white">+{xpGain} EXP</div>
                      <Button onClick={() => handleFuse(id)} disabled={fusing} loading={fusing}
                        size="sm" variant="secondary" className="mt-2 w-full text-[10px] py-1 font-bold">
                        <GitMerge size={9} />Hợp nhất
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── LEVEL UP ─── */}
        {activeSection === "levelup" && (
          <div className="space-y-3 p-4">
            {levelupMsg && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border px-4 py-2.5 text-sm font-bold ${
                  levelupMsg.includes("Lên cấp") ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700"
                }`}>
                {levelupMsg}
              </motion.div>
            )}
            {unlockedCards.length === 0 ? (
              <EmptyState icon={<ArrowUp size={40} className="text-slate-300" />}
                title="Chưa có thẻ nào" subtitle="Mở gói để bắt đầu." />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {unlockedCards.map((id) => {
                  const card = ALL_CARDS.find((c) => c.id === id)!;
                  const level = getCardLevel(id);
                  const nextLevel = level + 1;
                  const xpCost = getXpForLevel(nextLevel);
                  const hasXp = (points || 0) >= xpCost;
                  const isMax = level >= 5;
                  const rs = RARITY[card.rarity.id] || RARITY.common;
                  return (
                    <div key={id} className={`flex flex-col items-center rounded-2xl border p-2.5 text-center ${
                      isMax ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
                    }`}>
                      {level > 1 && (
                        <div className="mb-1 flex gap-0.5">
                          {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
                            <Star key={i} size={7} className="fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      )}
                      <ElementArt elementId={card.element.id} size={36} />
                      <p className="mt-1 text-[8px] font-black line-clamp-1" style={{ color: rs.frameAccent }}>{card.name}</p>
                      <p className="text-[8px] text-slate-400">⚔{card.atk} ♥{card.hp}</p>
                      {isMax ? (
                        <div className="mt-1 rounded-full bg-amber-200 px-2 py-0.5 text-[8px] font-black text-amber-800">Cấp tối đa</div>
                      ) : (
                        <>
                          <div className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold text-slate-600">{xpCost} EXP</div>
                          <Button onClick={() => handleLevelUp(id)} disabled={!hasXp || levelingUp}
                            size="sm" variant={hasXp ? "secondary" : "ghost"} className="mt-1 w-full text-[9px] py-1 font-bold">
                            <ArrowUp size={9} />Lên cấp
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── GACHA ─── */}
        {activeSection === "gacha" && (
          <div className="flex flex-col items-center gap-5 p-6 text-center">
            <motion.div
              animate={{ rotate: [0, 3, -3, 0], y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                <Wand2 size={56} className="text-white/90" />
              </div>
              <div className="absolute -right-2 -top-2 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black text-white shadow">
                {PULL_COST} EXP
              </div>
            </motion.div>

            <div>
              <h3 className="text-xl font-black text-slate-900">Mở gói thẻ</h3>
              <p className="mt-1 text-sm text-slate-500">
                Dùng <span className="font-black text-indigo-600">{PULL_COST} EXP</span> để nhận thẻ ngẫu nhiên.
              </p>
            </div>

            <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
              <p className="text-xs text-slate-400">EXP hiện có</p>
              <p className="text-3xl font-black text-indigo-600">{points}</p>
              <Button onClick={handlePullGacha} disabled={points < PULL_COST || isPulling}
                loading={isPulling} size="lg" className="mt-4 w-full text-sm font-bold" variant="secondary">
                <Sparkles size={15} />
                {points < PULL_COST ? `Cần ${PULL_COST} EXP` : isPulling ? "Đang mở..." : `Mở gói (${PULL_COST} EXP)`}
              </Button>
            </div>

            {/* Rarity odds */}
            <div className="grid w-full max-w-xs grid-cols-4 gap-2">
              {RARITY_ORDER.map((rid) => {
                const rs = RARITY[rid];
                const r = RARITIES.find((r) => r.id === rid)!;
                return (
                  <div key={rid} className={`flex flex-col items-center rounded-2xl border-2 p-2 ${rs.border} ${rs.bg}`}>
                    <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase ${rs.badgeBg} ${rs.badgeText}`}>{rs.name}</span>
                    <p className="mt-1 text-sm font-black" style={{ color: rs.frameAccent }}>{countByRarity(rid)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── BATTLE ─── */}
        {activeSection === "battle" && (
          <div className="space-y-4 p-4">
            {/* Deck */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-black text-sm text-slate-800">Đội hình ({deck.length}/{DECK_SIZE})</h4>
                {deck.length > 0 && (
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-black text-white">
                    ⚡{deckPower} PWR
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {Array.from({ length: DECK_SIZE }).map((_, i) => {
                  const card = deckCards[i];
                  if (!card) {
                    return (
                      <div key={i} className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                        <span className="text-base text-slate-300">+</span>
                      </div>
                    );
                  }
                  const rs = RARITY[card.rarity.id] || RARITY.common;
                  return (
                    <div key={i} className={`relative aspect-[3/4] overflow-hidden rounded-xl border-2 ${rs.border} ${rs.glow}`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${rs.bg}`} />
                      <div className="relative z-10 flex h-full flex-col items-center justify-center p-1">
                        <ElementArt elementId={card.element.id} size={28} />
                        <p className="mt-0.5 text-[6px] font-black leading-tight line-clamp-1" style={{ color: rs.frameAccent }}>
                          {card.name.split(" ")[0]}
                        </p>
                      </div>
                      <button onClick={() => setDeck((d) => d.filter((x) => x !== card.id))}
                        className="absolute -right-1 -top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600">
                        <X size={8} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card picker */}
            <div>
              <h4 className="mb-2 font-black text-sm text-slate-800">Chọn thẻ</h4>
              <div className="grid grid-cols-4 gap-1.5 overflow-y-auto sm:max-h-[200px]">
                {unlockedCards.map((id) => {
                  const card = ALL_CARDS.find((c) => c.id === id)!;
                  const inDeck = deck.includes(id);
                  const rs = RARITY[card.rarity.id] || RARITY.common;
                  return (
                    <button key={id}
                      onClick={() => inDeck ? setDeck((d) => d.filter((x) => x !== id)) : deck.length < DECK_SIZE ? setDeck((d) => [...d, id]) : null}
                      className={`relative flex flex-col items-center rounded-xl border-2 p-1.5 transition-all ${
                        inDeck ? `${rs.border} ${rs.glow} ring-2 ring-amber-400` : "border-slate-200 hover:border-slate-300"
                      }`}>
                      {inDeck && (
                        <div className="absolute -left-0.5 -top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white">
                          <span className="text-[7px] font-black">✓</span>
                        </div>
                      )}
                      <ElementArt elementId={card.element.id} size={22} />
                      <p className="text-[6px] font-black leading-tight line-clamp-1 mt-0.5">{card.name.split(" ")[0]}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button onClick={() => setShowBattle(true)} disabled={!canBattle} size="lg" className="w-full text-sm font-bold">
              <Swords size={14} />
              {canBattle ? "Xông trận!" : `Chọn thêm ${DECK_SIZE - deck.length} thẻ`}
            </Button>
          </div>
        )}
      </div>

      {/* Card detail modal */}
      <AnimatePresence>
        {viewingCard && (
          <ModalShell onClose={() => setViewingCard(null)} className="max-w-sm overflow-hidden p-0">
            <CardModal
              card={viewingCard}
              unlocked={unlockedCards.includes(Number(viewingCard.id))}
              count={getCardCount(Number(viewingCard.id))}
              level={getCardLevel(Number(viewingCard.id))}
              onAddToDeck={() => { setViewingCard(null); setActiveSection("battle"); }}
            />
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Gacha reveal */}
      <AnimatePresence>
        {(isPulling || gachaResult) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black/90 backdrop-blur-md"
          >
            {/* Particles */}
            {gachaResult && !isPulling && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 30 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      x: "50%", y: "50%",
                      scale: 0,
                      opacity: 1,
                    }}
                    animate={{
                      x: `${Math.random() * 200 - 100}%`,
                      y: `${Math.random() * 200 - 100}%`,
                      scale: [0, 1, 0],
                      opacity: [1, 1, 0],
                    }}
                    transition={{ duration: 1.5, delay: i * 0.03, ease: "easeOut" }}
                    className="absolute h-2 w-2 rounded-full"
                    style={{
                      background: gachaResult.rarity?.id === "legendary" ? "#f59e0b"
                        : gachaResult.rarity?.id === "epic" ? "#a855f7"
                        : gachaResult.rarity?.id === "rare" ? "#3b82f6"
                        : "#94a3b8",
                    }}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-col items-center">
              {isPulling && !gachaResult && (
                <motion.div
                  animate={{ rotateY: 360, scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-40 w-32 items-center justify-center rounded-3xl border-4 border-indigo-400 bg-gradient-to-br from-indigo-600 to-purple-700 shadow-[0_0_60px_rgba(99,102,241,0.5)]"
                >
                  <Sparkles size={48} className="animate-pulse text-white" />
                </motion.div>
              )}

              {gachaResult && !isPulling && (
                <motion.div
                  className="flex flex-col items-center"
                  initial={{ scale: 0.5, rotateY: 90, opacity: 0 }}
                  animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                  transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.1 }}
                >
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`mb-3 text-2xl font-black uppercase tracking-wider drop-shadow-lg ${
                      gachaResult.rarity?.id === "legendary" ? "text-yellow-400"
                        : gachaResult.rarity?.id === "epic" ? "text-purple-400"
                        : gachaResult.rarity?.id === "rare" ? "text-blue-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {RARITY[gachaResult.rarity?.id]?.name || "Phổ thông"}!
                  </motion.h2>

                  <motion.div
                    initial={{ scale: 0.6, y: 30 }} animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", damping: 14, stiffness: 120, delay: 0.2 }}
                    className="w-48"
                  >
                    <div className={`rounded-2xl border-2 p-1 ${
                      gachaResult.rarity?.id === "legendary" ? "border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.5)]"
                        : gachaResult.rarity?.id === "epic" ? "border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.4)]"
                        : gachaResult.rarity?.id === "rare" ? "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                        : "border-slate-400"
                    }`}>
                      <div className={`rounded-xl bg-gradient-to-br ${
                        gachaResult.rarity?.id === "legendary" ? "from-amber-100 to-orange-200"
                          : gachaResult.rarity?.id === "epic" ? "from-purple-100 to-pink-200"
                          : gachaResult.rarity?.id === "rare" ? "from-blue-100 to-indigo-200"
                          : "from-slate-100 to-slate-200"
                      } p-4`}>
                        <div className="flex flex-col items-center">
                          <ElementArt elementId={gachaResult.element?.id || "plastic"} size={72} />
                          <p className="mt-2 text-sm font-black" style={{
                            color: gachaResult.rarity?.id === "legendary" ? "#d97706"
                              : gachaResult.rarity?.id === "epic" ? "#9333ea"
                              : gachaResult.rarity?.id === "rare" ? "#2563eb"
                              : "#64748b"
                          }}>
                            {gachaResult.name}
                          </p>
                          <p className="text-xs text-slate-400">Hệ {gachaResult.element?.name}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs font-black">
                            <span className="text-red-500">⚔{gachaResult.atk}</span>
                            <span className="text-emerald-600">♥{gachaResult.hp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className={`mt-4 text-sm font-bold ${gachaResult.isNew ? "text-amber-400" : "text-slate-400"}`}
                  >
                    {gachaResult.isNew ? "Thẻ mới! ✨" : "Bạn đã có thẻ này."}
                  </motion.p>

                  <Button
                    onClick={() => setGachaResult(null)}
                    className="mt-3 text-sm font-bold"
                    size="md" variant="ghost"
                  >
                    {gachaResult.isNew ? "Thu thập" : "Đóng"}
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle */}
      {showBattle && deck.length === DECK_SIZE && (
        <CardBattle
          deckCardIds={deck}
          cardLevels={cardLevels}
          onClose={() => setShowBattle(false)}
          onWin={(exp) => { onReward(exp); }}
        />
      )}
    </div>
  );
}
