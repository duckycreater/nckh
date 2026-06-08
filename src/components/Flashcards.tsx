import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Layers, Lock, Swords, X, Wand2,
  ArrowUp, GitMerge, Zap, Trophy, Star, Shield,
  Heart, Target, Wind, Crosshair, Brain, Flame,
  ChevronDown, Info, Plus, Check, RefreshCw,
  Activity, Award, Cpu, Skull, Eye, Search,
  ChevronRight, Battery, Lightning, Gauge,
  Filter, SortAsc, Sparkle,
} from "lucide-react";
import { UserProgress } from "../types";
import {
  ALL_CARDS, RARITIES, getElementIcon, ELEMENTS, calcPower,
  getXpForLevel, getFusedXp, getCardAbility, getCardById,
  getCardArt, getAvatarEmoji,
} from "../lib/cards";
import { CardBattle } from "./CardBattle";
import { Badge, Button, Card, EmptyState } from "../lib/ui";

// ─── Types ─────────────────────────────────────────────────────────────────
type Section = "collection" | "fusion" | "levelup" | "gacha" | "battle";

// ─── Auth helper ────────────────────────────────────────────────────────────
function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Rarity tokens ─────────────────────────────────────────────────────────
const RARITY: Record<string, {
  name: string; shortName: string;
  accent: string; bgLight: string; bgDark: string;
  border: string; glow: string; badgeBg: string; badgeText: string;
  shimmer: boolean; starCount: number;
}> = {
  common:    { name: "Phổ thông", shortName: "PT", accent: "#94a3b8", bgLight: "#f8fafc", bgDark: "#1e293b", border: "border-slate-300", glow: "shadow-slate-200", badgeBg: "bg-slate-100", badgeText: "text-slate-600", shimmer: false, starCount: 1 },
  rare:      { name: "Hiếm",     shortName: "HM", accent: "#3b82f6", bgLight: "#eff6ff", bgDark: "#1e3a8a", border: "border-blue-400", glow: "shadow-blue-200", badgeBg: "bg-blue-100", badgeText: "text-blue-700", shimmer: false, starCount: 2 },
  uncommon:  { name: "Thường",   shortName: "T",  accent: "#64748b", bgLight: "#f8fafc", bgDark: "#1e293b", border: "border-slate-300", glow: "shadow-slate-200", badgeBg: "bg-slate-100", badgeText: "text-slate-600", shimmer: false, starCount: 1 },
  epic:      { name: "Siêu hiếm", shortName: "SH", accent: "#a855f7", bgLight: "#faf5ff", bgDark: "#581c87", border: "border-purple-400", glow: "shadow-purple-200", badgeBg: "bg-purple-100", badgeText: "text-purple-700", shimmer: true, starCount: 3 },
  legendary:  { name: "Huyền thoại", shortName: "HT", accent: "#f59e0b", bgLight: "#fffbeb", bgDark: "#78350f", border: "border-amber-400", glow: "shadow-amber-200", badgeBg: "bg-amber-100", badgeText: "text-amber-700", shimmer: true, starCount: 4 },
};
const RARITY_ORDER = ["legendary", "epic", "rare", "uncommon", "common"];
const PULL_COST = 50;
const DECK_SIZE = 5;

// ─── Element colors ────────────────────────────────────────────────────────
const ELEM_COLOR: Record<string, string> = {
  plastic: "#06b6d4", paper: "#f59e0b", glass: "#14b8a6",
  metal: "#64748b", organic: "#22c55e", hazard: "#ef4444",
};

// ─── Stat config ───────────────────────────────────────────────────────────
const STAT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  atk: { icon: "⚔️", label: "Tấn công", color: "#ef4444" },
  hp:  { icon: "❤️", label: "Máu",     color: "#22c55e" },
  def: { icon: "🛡️", label: "Phòng thủ", color: "#3b82f6" },
  spd: { icon: "💨", label: "Tốc độ",  color: "#06b6d4" },
  crt: { icon: "💥", label: "Bạo kích", color: "#f59e0b" },
  int: { icon: "🧠", label: "Trí tuệ",  color: "#a855f7" },
};

// ─── Card Avatar Circle ────────────────────────────────────────────────────
function CardAvatar({ elementId, size = 36, sm }: { elementId: string; size?: number; sm?: number }) {
  const emoji = getAvatarEmoji(elementId);
  const color = ELEM_COLOR[elementId] || "#94a3b8";
  return (
    <div
      className="flex items-center justify-center rounded-full select-none flex-shrink-0"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${color}20, ${color}08)`,
        border: `2px solid ${color}40`,
        boxShadow: `0 0 12px ${color}20`,
      }}
    >
      <span className="text-[70%]" style={{ fontSize: sm ?? size * 0.55 }}>{emoji}</span>
    </div>
  );
}

// ─── Rarity Stars ──────────────────────────────────────────────────────────
function RarityStars({ rarityId, size = 10 }: { rarityId: string; size?: number }) {
  const rs = RARITY[rarityId] || RARITY.common;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: rs.starCount }).map((_, i) => (
        <Star key={i} size={size} className={rarityId === "legendary" ? "fill-amber-400 text-amber-400" : rarityId === "epic" ? "fill-purple-400 text-purple-400" : rarityId === "rare" ? "fill-blue-400 text-blue-400" : "fill-slate-400 text-slate-400"} />
      ))}
    </div>
  );
}

// ─── Level indicator ────────────────────────────────────────────────────────
function LevelBadge({ level }: { level: number }) {
  if (level <= 1) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
        <Star key={i} size={7} className="fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

// ─── Power Badge ───────────────────────────────────────────────────────────
function PowerBadge({ power, size = "sm" }: { power: number; size?: "sm" | "lg" }) {
  return (
    <div className={`flex items-center gap-1 rounded-full font-black text-white ${size === "lg" ? "bg-slate-900 px-4 py-2 text-sm" : "bg-slate-800 px-2.5 py-1 text-[10px]"}`}
      style={{ fontFamily: "monospace" }}>
      <Zap size={size === "lg" ? 13 : 9} className="text-amber-400" />
      {power.toLocaleString()}
    </div>
  );
}

// ─── Stat Bar ─────────────────────────────────────────────────────────
function StatBar({ stat, value, max = 200 }: { stat: string; value: number; max?: number }) {
  const cfg = STAT_CONFIG[stat];
  const barPct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 text-center text-[11px]">{cfg.icon}</div>
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{cfg.label}</span>
          <span className="text-[11px] font-black tabular-nums" style={{ color: cfg.color }}>{value}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: cfg.color }}
            initial={{ width: 0 }}
            animate={{ width: `${barPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Card Tile (grid) ───────────────────────────────────────────────────────
function CardTile({ card, level = 1, count = 1, selected = false, locked = false, inDeck = false, isNew = false, onClick }: {
  card: any; level?: number; count?: number; selected?: boolean; locked?: boolean; inDeck?: boolean; isNew?: boolean; onClick?: () => void;
}) {
  const rs = RARITY[card.rarity.id] || RARITY.common;
  const ability = getCardAbility(card);
  const elemColor = ELEM_COLOR[card.element.id] || "#94a3b8";
  const isEpic = card.rarity.id === "epic" || card.rarity.id === "legendary";
  const isLegendary = card.rarity.id === "legendary";

  const [flipped, setFlipped] = useState(false);

  if (locked) {
    return (
      <motion.button
        whileHover={{ opacity: 0.7 }}
        onClick={onClick}
        className="relative w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-200 text-left bg-slate-50"
        style={{ aspectRatio: "2/3" }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <CardAvatar elementId={card.element.id} size={48} />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
            <Lock size={16} className="text-slate-400" />
          </div>
          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Khóa</span>
        </div>
      </motion.button>
    );
  }

  const handleClick = () => {
    setFlipped((f) => !f);
    if (onClick) onClick();
  };

  const glowClass = isLegendary
    ? "card-shimmer-glow"
    : isEpic
    ? "card-shimmer-glow"
    : "";

  return (
    <div
      className="relative w-full cursor-pointer"
      style={{ perspective: "800px", aspectRatio: "2/3" }}
    >
      <motion.button
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        onClick={handleClick}
        onMouseLeave={() => setFlipped(false)}
        className={`
          absolute inset-0 w-full h-full cursor-pointer overflow-hidden rounded-2xl border-2 text-left
          backface-hidden preserve-3d
          ${rs.border}
          ${selected ? "ring-2 ring-amber-400 ring-offset-2" : ""}
          ${inDeck ? "ring-2 ring-amber-400 ring-offset-1" : ""}
        `}
        style={{
          background: `linear-gradient(145deg, ${rs.bgLight}, ${elemColor}10)`,
          boxShadow: `0 4px 20px ${rs.accent}25, 0 1px 4px rgba(0,0,0,0.08)`,
          ["--glow-color" as string]: `${rs.accent}60`,
        }}
      >
        {/* ── FRONT ── */}
        <div className="absolute inset-0 backface-hidden">
          {/* Element top bar */}
          <div className="absolute inset-x-0 top-0 z-10 h-1.5 rounded-t-[14px]"
            style={{ background: `linear-gradient(90deg, ${elemColor}50, ${elemColor})` }} />

          {/* Legendary outer glow */}
          {isLegendary && (
            <div className="absolute inset-0 z-0 rounded-2xl"
              style={{ boxShadow: `0 0 16px ${rs.accent}40, inset 0 0 30px ${rs.accent}10` }} />
          )}

          {/* NEW badge */}
          {isNew && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="absolute left-1 top-1 z-20 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 text-[7px] font-black text-white shadow-lg"
            >
              NEW
            </motion.div>
          )}

          {/* Card art area */}
          <div className="absolute inset-0 flex items-center justify-center pt-3 pb-14 px-1">
            <div className="w-full h-full">
              {getCardArt(card.id, card.element.id, card.artVariant || 1, card.rarity.id)}
            </div>
          </div>

          {/* Bottom info */}
          <div className="absolute inset-x-0 bottom-0 z-10 rounded-b-2xl bg-white/95 backdrop-blur-sm px-2 pt-4 pb-1.5">
            <div className="flex items-center justify-between mb-0.5">
              <RarityStars rarityId={card.rarity.id} size={7} />
              <div className="flex items-center gap-1">
                {count > 1 && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-black text-amber-700">x{count}</span>
                )}
                {inDeck && (
                  <span className="rounded-full bg-amber-400 p-0.5">
                    <Check size={8} className="text-white" />
                  </span>
                )}
              </div>
            </div>
            <p className="line-clamp-1 text-center text-[8px] font-black text-slate-800 leading-tight">{card.name}</p>
            {level > 1 && (
              <div className="flex items-center justify-center">
                <LevelBadge level={level} />
              </div>
            )}
          </div>

          {/* Flip hint */}
          <div className="absolute bottom-1 right-1 z-20 opacity-0 group-hover:opacity-30 transition-opacity">
            <span className="text-[6px] text-slate-400">tap to flip</span>
          </div>

          {/* Shimmer overlay for epic+ */}
          {isEpic && (
            <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl opacity-50">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                style={{ width: "30%", transform: "skewX(-15deg)" }}
              />
            </div>
          )}
        </div>

        {/* ── BACK (flipped) ── */}
        <div
          className="absolute inset-0 backface-hidden rounded-2xl border-2 overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${elemColor}15, ${rs.bgLight})`,
            borderColor: rs.accent,
            transform: "rotateY(180deg)",
          }}
        >
          {/* Element color bar */}
          <div className="absolute inset-x-0 top-0 h-1.5"
            style={{ background: `linear-gradient(90deg, ${elemColor}, ${rs.accent})` }} />

          {/* Stats panel */}
          <div className="flex flex-col h-full p-2 pt-4">
            <p className="text-[8px] font-black text-center text-slate-800 mb-1 leading-tight">{card.name}</p>
            {ability && (
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-sm">{ability.icon}</span>
                <span className="text-[7px] font-bold text-slate-600">{ability.name}</span>
              </div>
            )}
            <div className="flex-1 space-y-0.5 overflow-hidden">
              {(["atk", "hp", "def", "spd"] as const).map((stat) => {
                const cfg = STAT_CONFIG[stat];
                const val = card[stat] * (stat === "atk" || stat === "hp" ? level : 1);
                return (
                  <div key={stat} className="flex items-center gap-1.5">
                    <span className="text-[8px] w-4 text-center">{cfg.icon}</span>
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ backgroundColor: cfg.color, width: `${Math.min(100, (val / (stat === "hp" ? 100 : 50)) * 100}%` }
                      />
                    </div>
                    <span className="text-[7px] font-black tabular-nums" style={{ color: cfg.color }}>{val}</span>
                  </div>
                );
              })}
            </div>
            {ability && (
              <p className="text-[6px] text-center text-slate-400 leading-tight mt-1 line-clamp-2">
                {ability.desc}
              </p>
            )}
          </div>

          {/* Back glow */}
          {isLegendary && (
            <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: `inset 0 0 20px ${rs.accent}30` }} />
          )}
        </div>
      </motion.button>
    </div>
  );
}

// ─── Card Detail Modal ─────────────────────────────────────────────────────
function CardDetail({ card, level = 1, count = 1, onClose, onAddDeck }: {
  card: any; level: number; count: number; onClose: () => void; onAddDeck?: () => void;
}) {
  const rs = RARITY[card.rarity.id] || RARITY.common;
  const ability = getCardAbility(card);
  const power = calcPower(card, level);
  const elemColor = ELEM_COLOR[card.element.id] || "#94a3b8";
  const elem = ELEMENTS.find((e) => e.id === card.element.id);
  const isEpic = card.rarity.id === "epic" || card.rarity.id === "legendary";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xs sm:max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        style={{ boxShadow: `0 0 0 1.5px ${rs.accent}40, 0 25px 80px rgba(0,0,0,0.18)` }}
      >
        {/* ── Hero Header ── */}
        <div className="relative px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6" style={{ background: `linear-gradient(145deg, ${elemColor}12, ${elemColor}05, transparent)` }}>
          {/* Element color accent bar */}
          <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${elemColor}80, ${rs.accent})` }} />

          {/* Count badge */}
          {count > 1 && (
            <div className="absolute right-3 sm:right-5 top-6 sm:top-8 z-20 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] sm:text-xs font-black text-white shadow-lg">
              <span>x{count}</span>
            </div>
          )}

          {/* Close button */}
          <button onClick={onClose}
            className="absolute right-3 sm:right-4 top-6 sm:top-8 rounded-full border border-slate-200 bg-white/80 p-1.5 sm:p-2 text-slate-400 backdrop-blur-sm transition-all hover:border-slate-300 hover:text-slate-600 hover:bg-white">
            <X size={14} sm:size={16} />
          </button>

          {/* Main content: Avatar + info */}
          <div className="flex items-start gap-3 sm:gap-5">
            {/* SVG Card Art */}
            <div className="flex-shrink-0 w-24 sm:w-32 h-32 sm:h-44">
              <div className="relative w-full h-full transform scale-[0.85] sm:scale-100 origin-top-left">
                {getCardArt(card.id, card.element.id, card.artVariant || 1, card.rarity.id)}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
              {/* Rarity row */}
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 flex-wrap">
                <RarityStars rarityId={card.rarity.id} size={10} sm={12} />
                <span className="rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider"
                  style={{ backgroundColor: rs.accent + "18", color: rs.accent, border: `1px solid ${rs.accent}40` }}>
                  {rs.name}
                </span>
                {level > 1 && <LevelBadge level={level} />}
              </div>
              {/* Name */}
              <h3 className="text-base sm:text-xl font-black text-slate-900 leading-tight truncate">{card.name}</h3>
              {card.subtitle && <p className="text-xs sm:text-sm text-slate-400 font-medium truncate">{card.subtitle}</p>}
              {/* Element + Power */}
              <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2">
                {elem && (
                  <div className="flex items-center gap-1 rounded-full px-1.5 sm:px-2.5 py-0.5" style={{ backgroundColor: elemColor + "18" }}>
                    <span className="text-xs">{getAvatarEmoji(card.element.id)}</span>
                    <span className="text-[9px] sm:text-[10px] font-bold" style={{ color: elemColor }}>{elem.name}</span>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1 rounded-full bg-slate-900 px-2 sm:px-3 py-1 sm:py-1.5">
                  <Zap size={10} sm={12} className="text-amber-400" />
                  <span className="text-xs sm:text-sm font-black text-white" style={{ fontFamily: "monospace" }}>{power}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shimmer for epic */}
          {isEpic && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                style={{ width: "25%", transform: "skewX(-15deg)" }}
              />
            </div>
          )}
        </div>

        {/* ── Stats Section ── */}
        <div className="px-4 sm:px-6 pb-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chỉ số</span>
            <span className="text-xs font-bold text-slate-300">Level {level}</span>
          </div>
          <div className="space-y-2">
            {(["atk", "hp", "def", "spd", "crt", "int"] as const).map((stat) => (
              <StatBar key={stat} stat={stat} value={card[stat]} max={stat === "hp" ? 200 : stat === "atk" ? 80 : 50} />
            ))}
          </div>
        </div>

        {/* ── Ability Section ── */}
        {ability && (
          <div className="mx-3 sm:mx-6 mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100">
                <span className="text-xl sm:text-2xl">{ability.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-black text-slate-900">{ability.name}</p>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  <span className={`rounded-full px-1.5 py-0.5 text-[7px] sm:text-[8px] font-black uppercase ${
                    ability.type === "ultimate" ? "bg-amber-100 text-amber-700" :
                    ability.type === "active" ? "bg-blue-100 text-blue-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {ability.type === "ultimate" ? "Tuyệt chiêu" : ability.type === "active" ? "Chủ động" : "Bị động"}
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: ability.power }).map((_, i) => (
                      <Star key={i} size={8} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs leading-relaxed text-slate-500 pl-[36px] sm:pl-[44px]">{ability.desc}</p>
          </div>
        )}

        {/* ── Action Button ── */}
        {onAddDeck && (
          <div className="mx-3 sm:mx-6 mb-4 sm:mb-6">
            <Button onClick={onAddDeck} size="lg"
              className="w-full text-xs sm:text-sm font-bold shadow-md py-2 sm:py-3"
              style={{ backgroundColor: rs.accent, color: "#fff" }}>
              <Plus size={14} />Thêm vào đội hình
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Gacha Reveal ──────────────────────────────────────────────────────────
function GachaReveal({ result, onClose }: { result: any; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { const t = setTimeout(() => setFlipped(true), 600); return () => clearTimeout(t); }, []);
  if (!result) return null;

  const rs = RARITY[result.rarity?.id] || RARITY.common;
  const ability = getCardAbility(result);
  const elemColor = ELEM_COLOR[result.element?.id] || "#94a3b8";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => {
          const colors = ["#f59e0b","#a855f7","#3b82f6","#22c55e","#ef4444","#06b6d4","#ec4899"];
          const c = colors[i % colors.length];
          const a = (i / 60) * 360;
          const d = 80 + Math.random() * 180;
          return (
            <motion.div key={i}
              initial={{ x: "50%", y: "50%", scale: 0, opacity: 1 }}
              animate={{ x: `calc(50% + ${Math.cos(a * Math.PI / 180) * d}%)`, y: `calc(50% + ${Math.sin(a * Math.PI / 180) * d}%)`, scale: [0, 1.5, 0], opacity: [1, 1, 0] }}
              transition={{ duration: 2.5, delay: Math.random() * 0.5, ease: "easeOut" }}
              className="absolute h-2 w-2 rounded-full"
              style={{ background: c, boxShadow: `0 0 8px ${c}` }}
            />
          );
        })}
      </div>

      <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {/* Rarity banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="mb-6 rounded-2xl px-8 py-3 text-center font-black uppercase tracking-[0.2em]"
          style={{ backgroundColor: rs.accent + "20", color: rs.accent, border: `2px solid ${rs.accent}60`, boxShadow: `0 0 40px ${rs.accent}40` }}
        >
          {rs.name}!
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ rotateY: 180 }} animate={{ rotateY: flipped ? 0 : 180 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          className="relative w-44 sm:w-56 overflow-hidden rounded-2xl sm:rounded-3xl"
          style={{ perspective: "1000px", background: `linear-gradient(145deg, ${elemColor}20, ${rs.accent}15)`, border: `3px solid ${rs.accent}60`, boxShadow: `0 0 40px ${rs.accent}40, 0 20px 60px rgba(0,0,0,0.4)` }}
        >
          {/* Color bar */}
          <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${elemColor}, ${rs.accent})` }} />

          {/* Avatar */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6">
            <div className="w-20 sm:w-24 h-28 sm:h-32">
              {getCardArt(result.id || 1, result.element?.id || "plastic", result.artVariant || 1, result.rarity?.id ?? "common")}
            </div>
            <div className="text-center">
              <RarityStars rarityId={result.rarity?.id ?? "common"} size={12} />
              <h3 className="mt-2 text-xl font-black text-white">{result.name}</h3>
              {result.subtitle && <p className="text-xs text-white/60">{result.subtitle}</p>}
            </div>

            {/* Quick stats */}
            <div className="grid w-full grid-cols-3 gap-1.5 sm:gap-2">
              {(["atk", "hp", "def"] as const).map((stat) => (
                <div key={stat} className="flex flex-col items-center rounded-lg sm:rounded-xl bg-black/30 p-1.5 sm:p-2">
                  <span className="text-[7px] sm:text-[9px] font-bold uppercase text-white/50">{STAT_CONFIG[stat].label}</span>
                  <span className="text-sm sm:text-base font-black" style={{ color: STAT_CONFIG[stat].color }}>{result[stat]}</span>
                </div>
              ))}
            </div>

            {/* Ability */}
            {ability && (
              <div className="w-full rounded-xl bg-black/40 p-2.5 sm:p-3 text-center">
                <span className="text-xl sm:text-2xl">{ability.icon}</span>
                <p className="mt-1 text-xs font-black text-white">{ability.name}</p>
                <p className="text-[9px] sm:text-[10px] text-white/50">{ability.desc}</p>
              </div>
            )}
          </div>

          {/* Shimmer */}
          {rs.shimmer && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ width: "25%", transform: "skewX(-15deg)" }}
              />
            </div>
          )}
        </motion.div>

        {/* Status */}
        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className={`mt-4 sm:mt-6 text-xs sm:text-base font-black ${result.isNew ? "text-amber-400" : "text-slate-400"}`}
        >
          {result.isNew ? "Thẻ mới! Đã thêm vào bộ sưu tập" : "Bạn đã có thẻ này"}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
          <Button onClick={onClose} size="lg" className="mt-3 px-10 font-bold bg-white text-slate-900 hover:bg-slate-100">
            {result.isNew ? "Thu thập" : "Đóng"}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
interface Props {
  onReward: (points: number) => void;
  onSpend?: (cost: number, reason: string) => void;
  points?: number;
  userId: string;
  progress?: UserProgress;
  onRefresh?: (progress?: any) => void;
}

export function Flashcards({ onReward, onSpend, points = 0, userId, progress, onRefresh }: Props) {
  // ─── State ───────────────────────────────────────────────────────────
  const [unlockedCards, setUnlockedCards] = useState<number[]>([]);
  const [gachaResult, setGachaResult] = useState<any>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [filterElement, setFilterElement] = useState<string>("all");
  const [viewingCard, setViewingCard] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<Section>("collection");
  const [sortBy, setSortBy] = useState<"power" | "atk" | "hp" | "level" | "rarity" | "name">("power");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showLocked, setShowLocked] = useState(false);
  const [cardLevels, setCardLevels] = useState<Record<string, number>>({});
  const [deck, setDeck] = useState<number[]>([]);
  const [showBattle, setShowBattle] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fuseMsg, setFuseMsg] = useState<string | null>(null);
  const [fusing, setFusing] = useState(false);
  const [levelingUp, setLevelingUp] = useState(false);
  const [levelupMsg, setLevelupMsg] = useState<string | null>(null);
  const [fuseAnimCard, setFuseAnimCard] = useState<{ card: any; xpGained: number } | null>(null);
  const [newCardIds, setNewCardIds] = useState<Set<number>>(new Set());

  // ─── Daily Challenge Card ─────────────────────────────────────────
  const getDailyChallenge = () => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem("dailyChallenge");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) return parsed;
      } catch { /* ignore */ }
    }
    if (unlockedCards.length === 0) return null;
    const idx = Math.floor(Math.random() * unlockedCards.length);
    const cardId = unlockedCards[idx];
    const challenge = { date: today, cardId, buff: 2 };
    localStorage.setItem("dailyChallenge", JSON.stringify(challenge));
    return challenge;
  };

  const dailyChallenge = getDailyChallenge();

  // ─── Helpers ───────────────────────────────────────────────────────
  const getCardCount = (id: number) => {
    const read = progress?.flashcardsRead || [];
    const counts = progress?.flashcardCounts || {};
    const owned = new Set<number>();
    (Array.isArray(read) ? read : []).map(Number).forEach((n) => owned.add(n));
    Object.keys(counts).forEach((k) => owned.add(Number(k)));
    return owned.has(id) ? (counts[String(id)] || 1) : 0;
  };
  const getCardLevel = (id: number) => cardLevels[String(id)] ?? 1;

  const resolveCard = (card: any) => {
    const level = getCardLevel(card.id);
    return { ...card, level };
  };

  const countByRarity = (rarityId: string) => {
    const total = ALL_CARDS.filter((c) => c.rarity.id === rarityId).length;
    const unlocked = ALL_CARDS.filter((c) => c.rarity.id === rarityId && unlockedCards.includes(c.id)).length;
    return `${unlocked}/${total}`;
  };

  // ─── Load data ───────────────────────────────────────────────────
  const fetchCardLevels = useCallback(async () => {
    try {
      const res = await fetch(`/api/cards/levels/${userId}`, getAuthHeaders());
      if (res.ok) {
        const data = await res.json();
        if (data.levels) setCardLevels(data.levels);
      }
    } catch { /* silent */ }
  }, [userId]);

  useEffect(() => {
    fetchCardLevels();
    const read = progress?.flashcardsRead || [];
    const counts = progress?.flashcardCounts || {};
    const owned = new Set<number>();
    (Array.isArray(read) ? read : []).map(Number).forEach((n) => owned.add(n));
    Object.keys(counts).forEach((k) => owned.add(Number(k)));
    setUnlockedCards(Array.from(owned));
  }, [progress, userId, fetchCardLevels]);

  // ─── Filter & sort cards ────────────────────────────────────────────
  const RARITY_SCORE: Record<string, number> = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
  let displayCards = ALL_CARDS.filter((c) =>
    (filterRarity === "all" || c.rarity.id === filterRarity) &&
    (filterElement === "all" || c.element.id === filterElement) &&
    (selectedElement === null || c.element.id === selectedElement) &&
    (searchQuery === "" || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.subtitle && c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())))
  );
  if (!showLocked) displayCards = displayCards.filter((c) => unlockedCards.includes(c.id));
  displayCards = [...displayCards].sort((a, b) => {
    const la = getCardLevel(a.id), lb = getCardLevel(b.id);
    if (sortBy === "atk") return (b.atk * lb) - (a.atk * la);
    if (sortBy === "hp") return (b.hp * lb) - (a.hp * la);
    if (sortBy === "level") return lb - la;
    if (sortBy === "rarity") return (RARITY_SCORE[b.rarity.id] || 0) - (RARITY_SCORE[a.rarity.id] || 0);
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return calcPower(b, lb) - calcPower(a, la);
  });

  const collectedCount = unlockedCards.length;
  const totalCards = ALL_CARDS.length;
  const collectionPower = unlockedCards.reduce((s, id) => {
    const card = ALL_CARDS.find((c) => c.id === id);
    return s + (card ? calcPower(card, getCardLevel(id)) : 0);
  }, 0);
  const fuseableCount = unlockedCards.filter((id) => getCardCount(id) >= 3).length;
  const deckCards = deck.map((id) => ALL_CARDS.find((c) => c.id === id)!).filter(Boolean);
  const deckPower = deckCards.reduce((s, card) => s + calcPower(card, getCardLevel(card.id)), 0);
  const canBattle = deck.length === DECK_SIZE;

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
            // Mark card as new in localStorage
            try {
              const stored = localStorage.getItem("newCardIds");
              const current = stored ? JSON.parse(stored) : [];
              const updated = current.filter((e: any) => e.id !== id);
              updated.push({ id, timestamp: Date.now() });
              localStorage.setItem("newCardIds", JSON.stringify(updated));
              setNewCardIds((prev) => new Set([...prev, id]));
            } catch { /* silent */ }
          }
        }
        if (result.success && onRefresh) onRefresh(result.progress);
        setIsPulling(false);
      })
      .catch(() => setIsPulling(false));
  };

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
      if (data.success) {
        setFuseAnimCard({ card: { ...card, level: getCardLevel(cardId) }, xpGained: data.xpGained || getFusedXp(card.atk + card.hp) });
        setFuseMsg(`Hợp nhất thành công! +${data.xpGained || getFusedXp(card.atk + card.hp)} EXP`);
        if (onSpend) onSpend(data.xpGained || getFusedXp(card.atk + card.hp), "Hợp nhất thẻ");
        await refreshProgress();
        fetchCardLevels();
      } else {
        setFuseMsg(data.error || "Thất bại.");
      }
    } catch { setFuseMsg("Lỗi kết nối."); }
    setFusing(false);
    setTimeout(() => setFuseMsg(null), 4000);
  };

  const handleLevelUp = async (cardId: number) => {
    setLevelingUp(true);
    setLevelupMsg(null);
    const card = ALL_CARDS.find((c) => c.id === cardId);
    if (!card) { setLevelingUp(false); return; }
    const cost = getXpForLevel(getCardLevel(cardId) + 1);
    if (points < cost) { setLevelupMsg("Không đủ EXP!"); setLevelingUp(false); return; }
    try {
      const res = await fetch("/api/cards/levelup", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ nickname: userId, cardId, expUsed: cost }),
      });
      const data = await res.json();
      if (data.success) {
        let bonusXp = 0;
        if (dailyChallenge && cardId === dailyChallenge.cardId) {
          bonusXp = Math.floor(cost);
          setLevelupMsg(`Nâng cấp thành công lên Lv.${data.newLevel}! +${bonusXp} bonus EXP (Challenge)!`);
          if (onSpend) onSpend(cost - bonusXp, "Nâng cấp thẻ");
        } else {
          setLevelupMsg(`Nâng cấp thành công lên Lv.${data.newLevel}!`);
          if (onSpend) onSpend(cost, "Nâng cấp thẻ");
        }
        await fetchCardLevels();
        if (onRefresh) onRefresh();
      } else {
        setLevelupMsg(data.error || "Thất bại.");
      }
    } catch { setLevelupMsg("Lỗi kết nối."); }
    setLevelingUp(false);
    setTimeout(() => setLevelupMsg(null), 4000);
  };

  // ─── Deck Slot (clean horizontal) ──────────────────────────────────
  function DeckSlot({ cardId, index }: { cardId: number; index: number }) {
    const card = ALL_CARDS.find((c) => c.id === cardId)!;
    if (!card) return null;
    const rs = RARITY[card.rarity.id] || RARITY.common;
    const level = getCardLevel(cardId);
    const ability = getCardAbility(card);
    const elemColor = ELEM_COLOR[card.element.id] || "#94a3b8";

    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0, x: -10 }}
        animate={{ scale: 1, opacity: 1, x: 0 }}
        className="group relative flex items-center gap-3 rounded-2xl border-2 p-3 bg-white transition-all hover:shadow-md"
        style={{ borderColor: rs.accent + "60", boxShadow: `0 2px 8px ${rs.accent}15` }}
      >
        {/* Slot number */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-black"
          style={{ backgroundColor: elemColor + "20", color: elemColor }}>
          {index + 1}
        </div>

        {/* Avatar */}
        <CardAvatar elementId={card.element.id} size={44} />

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs font-black text-slate-800">{card.name}</p>
            {level > 1 && <LevelBadge level={level} />}
          </div>
          <div className="flex items-center gap-2">
            <RarityStars rarityId={card.rarity.id} size={8} />
            {ability && (
              <span className="text-[9px] text-slate-400">{ability.icon} {ability.name}</span>
            )}
          </div>
        </div>

        {/* Power */}
        <PowerBadge power={calcPower(card, level)} />

        {/* Remove */}
        <button
          onClick={() => setDeck((d) => d.filter((x) => x !== cardId))}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
        >
          <X size={12} />
        </button>
      </motion.div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────
  const TABS: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "collection", label: "Bộ sưu tập", icon: <Layers size={13} /> },
    { id: "fusion",    label: "Hợp nhất",   icon: <GitMerge size={13} /> },
    { id: "levelup",   label: "Lên cấp",    icon: <ArrowUp size={13} /> },
    { id: "gacha",    label: "Mở gói",      icon: <Sparkles size={13} /> },
    { id: "battle",   label: "Đấu trường",  icon: <Swords size={13} /> },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm max-h-full">

      {/* ─── Header ─── */}
      <div className="flex-shrink-0 border-b border-slate-100 bg-white px-3 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
            <Badge tone="accent">Thẻ bài</Badge>
            <span className="text-xs sm:text-sm font-medium text-slate-500 whitespace-nowrap">{collectedCount}/{totalCards}</span>
            {collectionPower > 0 && <PowerBadge power={collectionPower} />}
            {fuseableCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-purple-600">
                <GitMerge size={10} />{fuseableCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-slate-400">EXP</p>
              <p className="text-base sm:text-lg font-black leading-none tabular-nums text-slate-900">{points}</p>
            </div>
          </div>
        </div>

        {/* Element Filter Buttons */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <button
            onClick={() => setSelectedElement(null)}
            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all ${selectedElement === null ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
          >Tất cả</button>
          {Array.isArray(ELEMENTS) && ELEMENTS.map((el) => (
            <button
              key={el.id}
              onClick={() => setSelectedElement(el.id === selectedElement ? null : el.id)}
              className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all ${selectedElement === el.id ? "ring-2 ring-offset-1" : "opacity-70 hover:opacity-100"}`}
              style={{ backgroundColor: el.id === selectedElement ? el.accent || el.color : `${el.accent || el.color}22`, color: el.id === selectedElement ? "white" : (el.accent || el.color), borderColor: el.accent || el.color, ...(selectedElement !== el.id ? { border: `1px solid ${(el.accent || el.color)}44` } : {}) }}
            >
              {el.icon} {el.name}
            </button>
          ))}
        </div>

        {/* Search & Sort Row */}
        <div className="relative mt-2 flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm thẻ theo tên..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pl-9 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="power">Power</option>
            <option value="level">Level</option>
            <option value="rarity">Rarity</option>
            <option value="name">Name</option>
          </select>
        </div>

        {/* Collection progress map */}
        <div className="mt-2 p-3 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bộ sưu tập</span>
            <span className="text-[10px] font-black text-white tabular-nums">
              {collectedCount}/{totalCards}
            </span>
          </div>
          {/* Progress bar */}
          <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (collectedCount / Math.max(totalCards, 1)) * 100}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: "linear-gradient(90deg, #06b6d4, #22c55e, #f59e0b, #a855f7, #ef4444)" }}
            />
            {/* Milestone markers */}
            {[25, 50, 75, 100].map((milestone) => (
              <div key={milestone} className="absolute top-0 bottom-0 z-10"
                style={{ left: `${milestone}%`, marginLeft: -1, width: 2, background: milestone <= (collectedCount / Math.max(totalCards, 1) * 100 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)" }}
              />
            ))}
          </div>
          {/* Milestone labels */}
          <div className="flex justify-between mt-0.5 px-0.5">
            {[25, 50, 75, 100].map((m) => (
              <span key={m} className={`text-[7px] font-bold ${m <= (collectedCount / Math.max(totalCards, 1) * 100) ? "text-white" : "text-slate-500"}`}>
                {m}%
              </span>
            ))}
          </div>
          {/* Power total */}
          {collectionPower > 0 && <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[9px] font-medium text-slate-500">Tổng Power</span>
            <PowerBadge power={collectionPower} />
          </div>}
        </div>

        {/* Daily Challenge Card */}
        {dailyChallenge && (() => {
          const challengeCard = ALL_CARDS.find((c) => c.id === dailyChallenge.cardId);
          if (!challengeCard) return null;
          const elemColor = ELEM_COLOR[challengeCard.element.id] || "#94a3b8";
          return (
            <div className="mt-2 flex items-center gap-2 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 p-2.5"
              style={{ boxShadow: "0 0 20px rgba(245, 158, 11, 0.2)" }}>
              <div className="flex items-center gap-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 shadow">
                  <Sparkle size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-amber-600">Thử thách ngày</p>
                  <p className="text-[10px] font-bold text-amber-700">+100% EXP khi lên cấp</p>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative flex-shrink-0" style={{ width: 36, height: 48 }}>
                  {getCardArt(challengeCard.id, challengeCard.element.id, challengeCard.artVariant || 1, challengeCard.rarity.id)}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-800">{challengeCard.name}</p>
                  <p className="text-[9px] font-bold" style={{ color: elemColor }}>
                    {challengeCard.element.id === 'plastic' ? '🔵 Nhựa' :
                     challengeCard.element.id === 'paper' ? '📄 Giấy' :
                     challengeCard.element.id === 'glass' ? '🥛 Thủy Tinh' :
                     challengeCard.element.id === 'metal' ? '🥫 Kim Loại' :
                     challengeCard.element.id === 'organic' ? '🍃 Hữu Cơ' : '☣️ Nguy Hại'}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tabs */}
        <div className="mt-2 sm:mt-3 flex gap-1 overflow-x-auto thin-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex flex-shrink-0 items-center gap-1 rounded-xl px-2 sm:px-3.5 py-1.5 text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                activeSection === tab.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto thin-scrollbar">

        {/* COLLECTION */}
        {activeSection === "collection" && (
          <div className="space-y-3 p-4">
            {/* Filters */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button onClick={() => setFilterRarity("all")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${filterRarity === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  Tất cả
                </button>
                {RARITY_ORDER.map((rid) => (
                  <button key={rid} onClick={() => setFilterRarity(rid)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                      filterRarity === rid ? "text-white" : "text-slate-500 bg-slate-100 border-transparent hover:bg-slate-200"
                    }`}
                    style={filterRarity === rid ? { backgroundColor: RARITY[rid].accent, borderColor: RARITY[rid].accent } : {}}>
                    {RARITY[rid].name}
                  </button>
                ))}
                <button onClick={() => setShowLocked(!showLocked)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${showLocked ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  <Lock size={10} className="inline mr-1" />
                  {showLocked ? "Ẩn khóa" : "Hiện khóa"}
                </button>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                  className="ml-auto rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-indigo-400">
                  <option value="power">PWR</option>
                  <option value="atk">ATK</option>
                  <option value="hp">HP</option>
                </select>
              </div>
              {/* Element filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto thin-scrollbar pb-0.5">
                <button onClick={() => setFilterElement("all")}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${filterElement === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
                  Tất cả
                </button>
                {Array.isArray(ELEMENTS) && ELEMENTS.map((el) => (
                  <button key={el.id} onClick={() => setFilterElement(el.id)}
                    className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${filterElement === el.id ? "text-white" : "bg-slate-100 text-slate-500"}`}
                    style={filterElement === el.id ? { backgroundColor: el.accent || el.color } : {}}>
                    <span>{getAvatarEmoji(el.id)}</span>{el.name}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] sm:text-xs text-slate-400">{displayCards.length} thẻ · {collectedCount} đã mở</p>

            {displayCards.length === 0 ? (
              <EmptyState icon={<Layers size={40} className="text-slate-300" />} title="Không có thẻ" subtitle="Thử thay đổi bộ lọc." />
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 overflow-x-auto pb-3 thin-scrollbar">
                {displayCards.map((card) => {
                  const isLocked = !unlockedCards.includes(card.id);
                  const inDeck = deck.includes(card.id);
                  return (
                    <div key={card.id} className="card-grid-item">
                      <CardTile
                        card={card}
                        count={getCardCount(card.id)}
                        level={getCardLevel(card.id)}
                        locked={isLocked && showLocked}
                        inDeck={inDeck}
                        isNew={newCardIds.has(card.id)}
                        onClick={() => !isLocked && setViewingCard(resolveCard(card))}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FUSION */}
        {activeSection === "fusion" && (
          <div className="space-y-3 p-4">
            {fuseMsg && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                  fuseMsg.includes("thành") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                }`}>
                {fuseMsg}
              </motion.div>
            )}
            {/* Dramatic Fusion Animation */}
            {fuseAnimCard && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={() => setFuseAnimCard(null)}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="relative flex flex-col items-center gap-4"
                >
                  {/* Flash effect */}
                  <motion.div
                    animate={{ opacity: [0, 1, 0], scale: [1, 2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-300 to-orange-500 blur-xl"
                  />
                  {/* XP Indicator */}
                  <motion.div
                    animate={{ y: [0, -20, 0] }}
                    transition={{ repeat: 3, duration: 0.5, ease: "easeInOut" }}
                    className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-2 text-xl font-black text-white shadow-lg"
                  >
                    +{fuseAnimCard.xpGained} EXP
                  </motion.div>
                  {/* Result Card */}
                  <div className="relative">
                    <CardAvatar elementId={fuseAnimCard.card.element.id} size={80} />
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5 }}
                      className="absolute -inset-2 rounded-2xl border-4 border-amber-400 bg-amber-400/20"
                    />
                  </div>
                  <p className="text-lg font-black text-white">{fuseAnimCard.card.name}</p>
                  <p className="text-sm text-amber-300">Hợp nhất thành công!</p>
                </motion.div>
              </motion.div>
            )}
            {unlockedCards.filter((id) => getCardCount(id) >= 3).length === 0 ? (
              <EmptyState icon={<GitMerge size={40} className="text-slate-300" />} title="Chưa có thẻ hợp nhất" subtitle="Cần 3 bản sao trở lên để hợp nhất." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {unlockedCards.filter((id) => getCardCount(id) >= 3).map((id) => {
                  const card = ALL_CARDS.find((c) => c.id === id)!;
                  const count = getCardCount(id);
                  const xpGain = getFusedXp(card.atk + card.hp);
                  const rs = RARITY[card.rarity.id] || RARITY.common;
                  const ability = getCardAbility(card);
                  const power = calcPower(card, getCardLevel(id));
                  return (
                    <div key={id} className={`flex flex-col items-center rounded-2xl border-2 p-3 bg-white text-center ${rs.border}`}
                      style={{ boxShadow: `0 2px 8px ${rs.accent}15` }}>
                      <div className="relative mb-2">
                        <CardAvatar elementId={card.element.id} size={52} />
                        <div className="absolute -right-2 -top-2 z-10 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-white shadow">x{count}</div>
                      </div>
                      <RarityStars rarityId={card.rarity.id} size={8} />
                      <p className="mt-1 text-[10px] font-black text-slate-800 leading-tight">{card.name}</p>
                      {ability && <p className="text-[9px] text-slate-400">{ability.icon} {ability.name}</p>}
                      <PowerBadge power={power} />
                      <div className="mt-1.5 flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-bold text-amber-600">
                        <Sparkles size={8} />+{xpGain} EXP
                      </div>
                      <Button onClick={() => handleFuse(id)} disabled={fusing}
                        size="sm" className="mt-2 w-full text-[10px] py-1.5 font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg">
                        <GitMerge size={9} />Hợp nhất
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LEVEL UP */}
        {activeSection === "levelup" && (
          <div className="space-y-3 p-4">
            {/* Level Up Animation */}
            {levelupMsg && levelupMsg.includes("thành") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={() => setLevelupMsg(null)}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 150, damping: 12 }}
                  className="flex flex-col items-center gap-4"
                >
                  {/* Stars Burst */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 1, scale: 0 }}
                      animate={{ opacity: 0, scale: 2, x: Math.cos(i * Math.PI / 4) * 100, y: Math.sin(i * Math.PI / 4) * 100 }}
                      transition={{ duration: 1, delay: i * 0.05 }}
                      className="absolute text-2xl"
                    >
                      ⭐
                    </motion.div>
                  ))}
                  <div className="rounded-3xl border-4 border-amber-400 bg-gradient-to-br from-amber-400 to-orange-500 p-8 shadow-2xl">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <Star size={64} className="text-white drop-shadow-lg" />
                    </motion.div>
                  </div>
                  <p className="text-2xl font-black text-white drop-shadow-lg">{levelupMsg}</p>
                  <p className="text-sm text-amber-300">Nâng cấp thành công!</p>
                </motion.div>
              </motion.div>
            )}
            {levelupMsg && !levelupMsg.includes("thành") && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border px-4 py-3 text-sm font-bold border-red-200 bg-red-50 text-red-700">
                {levelupMsg}
              </motion.div>
            )}
            {collectedCount === 0 ? (
              <EmptyState icon={<ArrowUp size={40} className="text-slate-300" />} title="Chưa có thẻ" subtitle="Thu thập thẻ để nâng cấp." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {unlockedCards.map((id) => {
                  const card = ALL_CARDS.find((c) => c.id === id)!;
                  const level = getCardLevel(id);
                  const isMax = level >= 20;
                  const xpCost = getXpForLevel(level + 1);
                  const hasXp = points >= xpCost;
                  const rs = RARITY[card.rarity.id] || RARITY.common;
                  const ability = getCardAbility(card);
                  const power = calcPower(card, level);
                  return (
                    <div key={id} className={`flex flex-col items-center rounded-2xl border-2 p-3 bg-white text-center ${rs.border}`}
                      style={{ boxShadow: `0 2px 8px ${rs.accent}15` }}>
                      <div className="relative mb-2">
                        <CardAvatar elementId={card.element.id} size={52} />
                        {isMax && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="rounded-full bg-amber-400/90 px-2 py-0.5 text-[8px] font-black text-white shadow">MAX</div>
                          </div>
                        )}
                      </div>
                      <RarityStars rarityId={card.rarity.id} size={8} />
                      <p className="mt-1 text-[10px] font-black text-slate-800 leading-tight">{card.name}</p>
                      {ability && <p className="text-[9px] text-slate-400">{ability.icon} {ability.name}</p>}
                      <div className="mt-1 flex items-center gap-1">
                        <LevelBadge level={level} />
                        <span className="text-[9px] font-bold text-slate-400">Lv.{level}</span>
                      </div>
                      <PowerBadge power={power} />
                      {isMax ? (
                        <div className="mt-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-bold text-amber-700">Cấp tối đa</div>
                      ) : (
                        <>
                          {/* Before/After Stats */}
                          <div className="mt-1 flex flex-col gap-0.5 w-full px-1">
                            <div className="flex justify-between text-[8px] text-slate-400">
                              <span>ATK</span><span>{card.atk * level} → {card.atk * (level + 1)}</span>
                            </div>
                            <div className="flex justify-between text-[8px] text-slate-400">
                              <span>HP</span><span>{card.hp * level} → {card.hp * (level + 1)}</span>
                            </div>
                          </div>
                          <div className={`mt-1.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold ${hasXp ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}>
                            <Sparkles size={8} className={hasXp ? "text-amber-500" : "text-red-400"} />{xpCost} EXP
                          </div>
                          <Button onClick={() => handleLevelUp(id)} disabled={!hasXp || levelingUp}
                            size="sm"
                            className={`mt-1.5 w-full text-[10px] py-1.5 font-bold ${hasXp ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg" : "bg-slate-100 text-slate-400"}`}>
                            <ArrowUp size={9} />Nâng cấp
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

        {/* GACHA */}
        {activeSection === "gacha" && (
          <div className="flex flex-col items-center gap-5 p-6 text-center">
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              {[0, 72, 144, 216, 288].map((angle, i) => (
                <motion.div key={angle}
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: ["#f59e0b", "#a855f7", "#3b82f6", "#22c55e", "#ef4444"][i],
                    boxShadow: `0 0 8px ${["#f59e0b", "#a855f7", "#3b82f6", "#22c55e", "#ef4444"][i]}`,
                    top: `calc(50% + ${Math.cos(angle * Math.PI / 180) * 50}px - 4px)`,
                    left: `calc(50% + ${Math.sin(angle * Math.PI / 180) * 50}px - 4px)`,
                  }}
                  className="absolute rounded-full animate-pulse"
                />
              ))}
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
                <Wand2 size={48} className="text-white/90" />
              </div>
              <div className="absolute -right-3 -top-3 z-10 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
                {PULL_COST} EXP
              </div>
            </motion.div>

            <div>
              <h3 className="text-2xl font-black text-slate-900">Mở gói thẻ bài</h3>
              <p className="mt-1 text-sm text-slate-500">
                Dùng <span className="font-black text-slate-900">{PULL_COST} EXP</span> để nhận thẻ ngẫu nhiên
              </p>
            </div>

            <div className="w-full max-w-xs space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div>
                <p className="text-xs text-slate-400">EXP hiện có</p>
                <p className="text-3xl font-black text-slate-900">{points}</p>
              </div>
              {points < PULL_COST && (
                <p className="text-xs font-medium text-red-500">Cần thêm {PULL_COST - points} EXP để mở gói</p>
              )}
              <Button onClick={handlePullGacha} disabled={points < PULL_COST || isPulling}
                loading={isPulling} size="lg" className="w-full text-sm font-bold bg-slate-900 text-white hover:bg-slate-800">
                <Sparkles size={14} />
                {points < PULL_COST ? `Cần ${PULL_COST} EXP` : isPulling ? "Đang mở..." : `Mở gói (${PULL_COST} EXP)`}
              </Button>
            </div>

            {/* Rarity rates */}
            <div className="w-full max-w-xs space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tỉ lệ rơi</p>
              <div className="grid grid-cols-4 gap-2">
                {RARITY_ORDER.map((rid) => (
                  <div key={rid} className={`flex flex-col items-center rounded-2xl border-2 p-2.5 ${RARITY[rid].border} ${RARITY[rid].bgLight}`}>
                    <RarityStars rarityId={rid} size={8} />
                    <span className={`mt-1 rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase ${RARITY[rid].badgeBg} ${RARITY[rid].badgeText}`}>
                      {RARITY[rid].shortName}
                    </span>
                    <p className="mt-1 text-sm font-black" style={{ color: RARITY[rid].accent }}>
                      {countByRarity(rid)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BATTLE */}
        {activeSection === "battle" && (
          <div className="space-y-4 p-4">
            {/* Deck display */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-black text-base text-slate-900">Đội hình chiến đấu</h4>
                <div className="flex items-center gap-3">
                  {deck.length > 0 && <PowerBadge power={deckPower} />}
                  <span className="text-xs font-medium text-slate-400">{deck.length}/{DECK_SIZE} thẻ</span>
                </div>
              </div>
              <div className="space-y-2">
                {Array.from({ length: DECK_SIZE }).map((_, i) => {
                  const cardId = deck[i];
                  if (!cardId) {
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-3 text-slate-400">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-black">{i + 1}</div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-slate-300">
                          <Plus size={16} className="text-slate-300" />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Chọn thẻ</span>
                      </div>
                    );
                  }
                  return <DeckSlot key={i} cardId={cardId} index={i} />;
                })}
              </div>
            </div>

            {/* Battle Tips */}
            <div className="space-y-2">
              {!canBattle && (
                <div className="flex items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2">
                  <Trophy size={16} className="text-amber-500" />
                  <p className="text-xs font-bold text-amber-700">Cần 5 thẻ để chiến đấu tốt nhất</p>
                </div>
              )}
              {/* Element Synergy Bonus */}
              {deckCards.length >= 3 && (() => {
                const elements = deckCards.map((c) => c.element.id);
                const counts: Record<string, number> = {};
                elements.forEach((e) => { counts[e] = (counts[e] || 0) + 1; });
                const synergyEntries = Object.entries(counts).filter(([, n]) => n >= 3);
                if (synergyEntries.length === 0) {
                  // Show composition hint when no synergy
                  const unique = new Set(elements).size;
                  const balanceRatio = unique / deckCards.length;
                  if (balanceRatio >= 0.6) return (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
                      <Sparkles size={14} className="text-amber-500" />
                      <p className="text-xs font-medium text-amber-700">Đội hình cân bằng nguyên tố — cần 3+ thẻ cùng loại để kích hoạt Synergy!</p>
                    </div>
                  );
                  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                  return (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                      <Zap size={14} className="text-indigo-500" />
                      <p className="text-xs font-medium text-slate-600">
                        Thế mạnh: {dominant?.[0]} ({dominant?.[1]}/5) — cần thêm thẻ cùng loại để kích hoạt Synergy!
                      </p>
                    </div>
                  );
                }
                const [synEl, synCount] = synergyEntries[0];
                const synElem = ELEMENTS.find((e) => e.id === synEl);
                const bonus = Math.floor(synCount * 5);
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-2 shadow-md"
                    style={{ boxShadow: `0 0 20px ${synElem?.accent || '#22c55e'}25` }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={16} className="text-emerald-500 animate-pulse" />
                      <span className="text-lg">{synElem?.id === 'plastic' ? '🔵' : synElem?.id === 'paper' ? '📄' : synElem?.id === 'glass' ? '🥛' : synElem?.id === 'metal' ? '🥫' : synElem?.id === 'organic' ? '🍃' : '☣️'}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-emerald-700">SYNERGY KÍCH HOẠT!</p>
                      <p className="text-[10px] text-emerald-600">
                        {synCount}x {synElem?.name || synEl} — +{bonus}% ATK tất cả thẻ {synElem?.name || synEl}
                      </p>
                    </div>
                    <div className="rounded-full bg-emerald-500 px-2 py-1 text-xs font-black text-white shadow">
                      +{bonus}%
                    </div>
                  </motion.div>
                );
              })()}
              {deck.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
                  <span className="text-xs font-bold text-emerald-700">Tổng sức mạnh đội hình</span>
                  <PowerBadge power={deckPower} />
                </div>
              )}
            </div>

            {/* Card picker */}
            <div>
              <h4 className="mb-3 font-black text-base text-slate-900">Chọn thẻ vào đội hình</h4>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                {unlockedCards.map((id) => {
                  const card = ALL_CARDS.find((c) => c.id === id)!;
                  if (!card) return null;
                  const inDeck = deck.includes(id);
                  const rs = RARITY[card.rarity.id] || RARITY.common;
                  return (
                    <motion.button
                      key={id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (inDeck) {
                          setDeck((d) => d.filter((x) => x !== id));
                        } else if (deck.length < DECK_SIZE) {
                          setDeck((d) => [...d, id]);
                        }
                      }}
                      className={`relative flex flex-col items-center rounded-xl border-2 p-1.5 transition-all overflow-hidden ${
                        inDeck ? `${rs.border} ring-2 ring-amber-400` : "border-slate-200 hover:border-slate-300"
                      }`}
                      style={{ aspectRatio: "3/4" }}
                    >
                      <CardAvatar elementId={card.element.id} size={40} />
                      <p className="mt-1 line-clamp-1 text-center text-[8px] font-bold text-slate-700 leading-tight">{card.name}</p>
                      <RarityStars rarityId={card.rarity.id} size={7} />
                      {inDeck && (
                        <div className="absolute -left-0.5 -top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 shadow">
                          <Check size={8} className="text-white" />
                        </div>
                      )}
                      {getCardLevel(id) > 1 && (
                        <div className="absolute right-0.5 top-0.5 z-10 rounded-full bg-black/70 px-1 py-0.5">
                          <span className="text-[7px] font-black text-amber-400">Lv.{getCardLevel(id)}</span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Dramatic Battle Button */}
            <motion.div
              whileHover={canBattle ? { scale: 1.02 } : {}}
              whileTap={canBattle ? { scale: 0.98 } : {}}
            >
              <Button
                onClick={() => setShowBattle(true)}
                disabled={!canBattle}
                size="lg"
                className={`w-full text-sm font-black py-4 rounded-2xl shadow-xl ${canBattle ? "bg-gradient-to-r from-red-600 via-rose-500 to-pink-500 hover:from-red-700 hover:via-rose-600 hover:to-pink-600 text-white animate-pulse" : "bg-slate-200 text-slate-400"}`}
              >
                <Swords size={18} className="mr-2" />
                {canBattle ? "⚔️ XÔNG TRẬN! ⚔️" : `Chọn thêm ${DECK_SIZE - deck.length} thẻ`}
              </Button>
            </motion.div>
          </div>
        )}
      </div>

      {/* ─── Card Detail Modal ─── */}
      <AnimatePresence>
        {viewingCard && (
          <CardDetail
            card={viewingCard}
            level={viewingCard.level || 1}
            count={getCardCount(viewingCard.id)}
            onClose={() => setViewingCard(null)}
            onAddDeck={
              !deck.includes(viewingCard.id) && deck.length < DECK_SIZE
                ? () => { setDeck((d) => [...d, viewingCard.id]); setViewingCard(null); setActiveSection("battle"); }
                : undefined
            }
          />
        )}
      </AnimatePresence>

      {/* ─── Gacha Reveal ─── */}
      <AnimatePresence>
        {gachaResult && (
          <GachaReveal key="gacha-reveal" result={gachaResult} onClose={() => setGachaResult(null)} />
        )}
      </AnimatePresence>

      {/* ─── Battle ─── */}
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
