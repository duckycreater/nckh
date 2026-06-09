import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Layers, Lock, Swords, X, Wand2,
  ArrowUp, GitMerge, Zap, Trophy, Star, Shield,
  Heart, ChevronDown, Info, Plus, Check, RefreshCw,
  Activity, Award, Cpu, Skull, Eye, Search,
  ChevronRight, Battery, Gauge,
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
function getAuthHeaders(): Record<string, string> {
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
  common:    { name: "Phổ thông", shortName: "PT", accent: "#94a3b8", bgLight: "#f8fafc", bgDark: "#1e293b", border: "border-slate-400/50", glow: "shadow-slate-400/30", badgeBg: "bg-slate-700", badgeText: "text-slate-300", shimmer: false, starCount: 1 },
  rare:      { name: "Hiếm",     shortName: "HM", accent: "#3b82f6", bgLight: "#1e3a8a", bgDark: "#1e3a8a", border: "border-blue-500/60", glow: "shadow-blue-400/40", badgeBg: "bg-blue-600", badgeText: "text-blue-100", shimmer: false, starCount: 2 },
  uncommon:  { name: "Thường",   shortName: "T",  accent: "#64748b", bgLight: "#1e293b", bgDark: "#1e293b", border: "border-slate-500/50", glow: "shadow-slate-400/30", badgeBg: "bg-slate-600", badgeText: "text-slate-200", shimmer: false, starCount: 1 },
  epic:      { name: "Siêu hiếm", shortName: "SH", accent: "#a855f7", bgLight: "#581c87", bgDark: "#581c87", border: "border-purple-500/70", glow: "shadow-purple-400/50", badgeBg: "bg-purple-600", badgeText: "text-purple-100", shimmer: true, starCount: 3 },
  legendary:  { name: "Huyền thoại", shortName: "HT", accent: "#f59e0b", bgLight: "#78350f", bgDark: "#78350f", border: "border-amber-400/80", glow: "shadow-amber-400/60", badgeBg: "bg-amber-600", badgeText: "text-amber-100", shimmer: true, starCount: 4 },
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
  atk: { icon: "ATK", label: "Tấn công", color: "#ef4444" },
  hp:  { icon: "HP",  label: "Máu",     color: "#22c55e" },
  def: { icon: "DEF", label: "Phòng thủ", color: "#3b82f6" },
  spd: { icon: "SPD", label: "Tốc độ",  color: "#06b6d4" },
  crt: { icon: "CRT", label: "Bạo kích", color: "#f59e0b" },
  int: { icon: "INT", label: "Trí tuệ",  color: "#a855f7" },
};

// ─── Card Avatar Circle ────────────────────────────────────────────────────
function CardAvatar({ elementId, size = 36 }: { elementId: string; size?: number }) {
  const emoji = getAvatarEmoji(elementId);
  const color = ELEM_COLOR[elementId] || "#94a3b8";
  return (
    <div
      className="flex items-center justify-center rounded-full select-none flex-shrink-0"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${color}30, ${color}10)`,
        border: `2px solid ${color}50`,
        boxShadow: `0 0 12px ${color}30`,
      }}
    >
      <span className="text-[65%]" style={{ fontSize: Math.max(size ?? 36, 12) * 0.5 }}>{emoji}</span>
    </div>
  );
}

// ─── Rarity Stars ──────────────────────────────────────────────────────────
function RarityStars({ rarityId, size = 10 }: { rarityId: string; size?: number }) {
  const rs = RARITY[rarityId] || RARITY.common;
  const colorCls = rarityId === "legendary" ? "fill-amber-400 text-amber-400"
    : rarityId === "epic" ? "fill-purple-400 text-purple-400"
    : rarityId === "rare" ? "fill-blue-400 text-blue-400"
    : "fill-slate-400 text-slate-400";
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: rs.starCount }).map((_, i) => (
        <Star key={i} size={size} className={colorCls} />
      ))}
    </div>
  );
}

// ─── Level Badge ────────────────────────────────────────────────────────────
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
      <div className="w-8 text-center text-[10px] font-black" style={{ color: cfg.color }}>{cfg.icon}</div>
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{cfg.label}</span>
          <span className="text-[11px] font-black tabular-nums" style={{ color: cfg.color }}>{value}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
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

// ─── Card Tile (dark glassmorphism) ────────────────────────────────────────
function CardTile({ card, level = 1, count = 1, selected = false, locked = false, inDeck = false, isNew = false, onClick }: {
  card: any; level?: number; count?: number; selected?: boolean; locked?: boolean; inDeck?: boolean; isNew?: boolean; onClick?: () => void;
}) {
  const rs = RARITY[card.rarity.id] || RARITY.common;
  const ability = getCardAbility(card);
  const elemColor = ELEM_COLOR[card.element.id] || "#94a3b8";
  const isEpic = card.rarity.id === "epic" || card.rarity.id === "legendary";
  const isLegendary = card.rarity.id === "legendary";
  const power = calcPower(card, level);

  const [flipped, setFlipped] = useState(false);

  if (locked) {
    return (
      <motion.button
        whileHover={{ opacity: 0.7 }}
        onClick={onClick}
        className="relative w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900 text-left"
        style={{ aspectRatio: "2/3" }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <CardAvatar elementId={card.element.id} size={48} />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
            <Lock size={16} className="text-slate-500" />
          </div>
          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Khóa</span>
        </div>
      </motion.button>
    );
  }

  return (
    <div
      className="relative w-full cursor-pointer"
      style={{ perspective: "800px", aspectRatio: "2/3" }}
    >
      <motion.button
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        onClick={() => { setFlipped((f) => !f); if (onClick) onClick(); }}
        onMouseLeave={() => setFlipped(false)}
        className={`
          absolute inset-0 w-full h-full cursor-pointer overflow-hidden rounded-2xl border-2 text-left
          ${rs.border}
          ${selected ? "ring-2 ring-amber-400 ring-offset-2" : ""}
          ${inDeck ? "ring-2 ring-amber-400 ring-offset-1" : ""}
        `}
        style={{
          background: `linear-gradient(180deg, ${rs.bgDark} 0%, ${rs.bgDark}BB 60%, ${elemColor}15 100%)`,
          boxShadow: `0 4px 24px ${rs.accent}30, 0 1px 4px rgba(0,0,0,0.4), inset 0 1px 0 ${rs.accent}30`,
        }}
      >
        {/* ── FRONT ── */}
        <div className="absolute inset-0">
          {/* Neon element accent bar at top */}
          <div className="absolute inset-x-0 top-0 z-10 h-1 rounded-t-2xl"
            style={{ background: `linear-gradient(90deg, ${elemColor}CC, ${rs.accent}CC, ${elemColor}CC)` }} />

          {/* NEW badge */}
          {isNew && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="absolute left-1 top-2 z-20 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 text-[7px] font-black text-white shadow-lg"
            >
              NEW
            </motion.div>
          )}

          {/* Level badge top-left */}
          {level > 1 && (
            <div className="absolute left-1 top-2 z-20">
              <LevelBadge level={level} />
            </div>
          )}

          {/* Card art area */}
          <div className="absolute inset-0 flex items-center justify-center pt-3 pb-12 px-1">
            {getCardArt(card.id, card.element.id, card.artVariant || 1, card.rarity.id)}
          </div>

          {/* Glassmorphism bottom panel */}
          <div className="absolute inset-x-0 bottom-0 z-10 rounded-b-2xl border-t border-white/10 bg-black/70 backdrop-blur-md px-2 pt-3 pb-1.5">
            {/* Rarity stars + count row */}
            <div className="flex items-center justify-between mb-0.5">
              <RarityStars rarityId={card.rarity.id} size={7} />
              <div className="flex items-center gap-1">
                {count > 1 && (
                  <span className="rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[8px] font-black text-white shadow">x{count}</span>
                )}
                {inDeck && (
                  <span className="rounded-full bg-emerald-500 p-0.5">
                    <Check size={8} className="text-white" />
                  </span>
                )}
              </div>
            </div>
            {/* Name */}
            <p className="line-clamp-1 text-center text-[8px] font-black text-white leading-tight tracking-wide">{card.name}</p>
            {/* Power */}
            <div className="flex items-center justify-center mt-0.5 gap-0.5">
              <Zap size={7} className="text-amber-400" />
              <span className="text-[8px] font-black text-amber-400" style={{ fontFamily: "monospace" }}>{power}</span>
            </div>
          </div>

          {/* Legendary outer glow */}
          {isLegendary && (
            <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl"
              style={{ boxShadow: `0 0 20px ${rs.accent}50, inset 0 0 30px ${rs.accent}15` }} />
          )}

          {/* Shimmer overlay for epic+ */}
          {isEpic && (
            <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl opacity-60">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                style={{ width: "30%", transform: "skewX(-15deg)" }}
              />
            </div>
          )}
        </div>

        {/* ── BACK (flipped) ── */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border-2"
          style={{
            background: `linear-gradient(180deg, ${elemColor}25, ${rs.bgDark})`,
            borderColor: rs.accent,
            transform: "rotateY(180deg)",
            boxShadow: `0 0 20px ${rs.accent}30`,
          }}
        >
          {/* Neon top bar */}
          <div className="absolute inset-x-0 top-0 h-1"
            style={{ background: `linear-gradient(90deg, ${elemColor}, ${rs.accent})` }} />

          {/* Stats panel */}
          <div className="flex flex-col h-full p-2 pt-3">
            <p className="text-[8px] font-black text-center text-white mb-1 leading-tight tracking-wide">{card.name}</p>
            {ability && (
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-sm">{ability.icon}</span>
                <span className="text-[7px] font-bold text-slate-400">{ability.name}</span>
              </div>
            )}
            <div className="flex-1 space-y-0.5 overflow-hidden">
              {(["atk", "hp", "def", "spd"] as const).map((stat) => {
                const cfg2 = STAT_CONFIG[stat];
                const val = card[stat] * (stat === "atk" || stat === "hp" ? level : 1);
                const barPct = Math.min(100, (val / (stat === "hp" ? 100 : 50)) * 100);
                return (
                  <div key={stat} className="flex items-center gap-1.5">
                    <div className="w-5 text-center text-[7px] font-black" style={{ color: cfg2.color }}>{cfg2.icon}</div>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: cfg2.color, width: `${barPct}%` }} />
                    </div>
                    <span className="text-[7px] font-black tabular-nums w-6 text-right" style={{ color: cfg2.color }}>{val}</span>
                  </div>
                );
              })}
            </div>
            {ability && (
              <p className="text-[6px] text-center text-slate-500 leading-tight mt-1 line-clamp-2">
                {ability.desc}
              </p>
            )}
          </div>
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
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm sm:max-w-md overflow-hidden rounded-3xl"
        style={{ boxShadow: `0 0 0 1.5px ${rs.accent}50, 0 25px 80px rgba(0,0,0,0.25)` }}
      >
        {/* ── Dark Hero Header ── */}
        <div className="relative px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-5"
          style={{ background: `linear-gradient(145deg, ${rs.bgDark}, ${elemColor}20, ${rs.bgDark})` }}>

          {/* Neon accent bar */}
          <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl"
            style={{ background: `linear-gradient(90deg, ${elemColor}AA, ${rs.accent}, ${elemColor}AA)` }} />

          {/* NEW + Count badges */}
          <div className="absolute right-3 sm:right-5 top-6 sm:top-8 z-20 flex items-center gap-1.5">
            {count > 1 && (
              <div className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] sm:text-xs font-black text-white shadow-lg">
                x{count}
              </div>
            )}
          </div>

          {/* Close button */}
          <button onClick={onClose}
            className="absolute left-3 sm:left-4 top-6 sm:top-8 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-sm transition-all hover:border-white/20 hover:text-white">
            <X size={14} />
          </button>

          {/* Main: Art + Info */}
          <div className="flex items-start gap-3 sm:gap-5">
            {/* SVG Card Art */}
            <div className="flex-shrink-0 w-24 sm:w-32 h-32 sm:h-44 relative">
              <div className="relative w-full h-full transform scale-[0.85] sm:scale-100 origin-top-left">
                {getCardArt(card.id, card.element.id, card.artVariant || 1, card.rarity.id)}
              </div>
              {/* Art glow */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ boxShadow: `0 0 30px ${elemColor}40, inset 0 0 20px ${elemColor}20` }} />
            </div>

            {/* Info panel */}
            <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
              {/* Rarity + Level */}
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 flex-wrap">
                <RarityStars rarityId={card.rarity.id} size={10} />
                <span className="rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider"
                  style={{ backgroundColor: rs.accent + "25", color: rs.accent, border: `1px solid ${rs.accent}60` }}>
                  {rs.name}
                </span>
                {level > 1 && <LevelBadge level={level} />}
              </div>

              {/* Name */}
              <h3 className="text-base sm:text-xl font-black text-white leading-tight truncate">{card.name}</h3>
              {card.subtitle && <p className="text-xs sm:text-sm text-slate-400 font-medium truncate">{card.subtitle}</p>}

              {/* Element + Power */}
              <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2">
                {elem && (
                  <div className="flex items-center gap-1 rounded-full px-1.5 sm:px-2.5 py-0.5"
                    style={{ backgroundColor: elemColor + "25", border: `1px solid ${elemColor}50` }}>
                    <span className="text-xs">{getAvatarEmoji(card.element.id)}</span>
                    <span className="text-[9px] sm:text-[10px] font-bold" style={{ color: elemColor }}>{elem.name}</span>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1 rounded-full bg-black/60 px-2 sm:px-3 py-1 sm:py-1.5 border border-white/10">
                  <Zap size={10} className="text-amber-400" />
                  <span className="text-xs sm:text-sm font-black text-white" style={{ fontFamily: "monospace" }}>{power}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shimmer for epic+ */}
          {isEpic && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-25">
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
        <div className="px-4 sm:px-6 pb-4" style={{ background: `linear-gradient(180deg, ${rs.bgDark}, ${rs.bgDark}CC)` }}>
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
          <div className="mx-3 sm:mx-6 mb-4 rounded-2xl border border-white/10 p-3 sm:p-4"
            style={{ background: `linear-gradient(145deg, ${rs.bgDark}CC, ${elemColor}10)` }}>
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10"
                style={{ backgroundColor: rs.accent + "25", boxShadow: `0 0 12px ${rs.accent}30` }}>
                <span className="text-xl sm:text-2xl">{ability.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-black text-white">{ability.name}</p>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  <span className={`rounded-full px-1.5 py-0.5 text-[7px] sm:text-[8px] font-black uppercase ${
                    ability.type === "ultimate" ? "bg-amber-500/30 text-amber-300" :
                    ability.type === "active" ? "bg-blue-500/30 text-blue-300" :
                    "bg-slate-700 text-slate-300"
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
            <p className="text-[10px] sm:text-xs leading-relaxed text-slate-400 pl-[36px] sm:pl-[44px]">{ability.desc}</p>
          </div>
        )}

        {/* ── Action Button ── */}
        {onAddDeck && (
          <div className="mx-3 sm:mx-6 mb-4 sm:mb-6">
            <Button onClick={onAddDeck} size="lg"
              className="w-full text-xs sm:text-sm font-bold shadow-lg py-2 sm:py-3"
              style={{ background: `linear-gradient(135deg, ${rs.accent}, ${elemColor})`, color: "#fff" }}>
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
          style={{ perspective: "1000px", background: `linear-gradient(145deg, ${elemColor}30, ${rs.accent}20)`, border: `3px solid ${rs.accent}70`, boxShadow: `0 0 50px ${rs.accent}50, 0 20px 60px rgba(0,0,0,0.5)` }}
        >
          {/* Neon bar */}
          <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${elemColor}, ${rs.accent})` }} />

          <div className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6">
            <div className="w-20 sm:w-24 h-28 sm:h-32">
              {getCardArt(result.id || 1, result.element?.id || "plastic", result.artVariant || 1, result.rarity?.id ?? "common")}
            </div>
            <div className="text-center">
              <RarityStars rarityId={result.rarity?.id ?? "common"} size={12} />
              <h3 className="mt-2 text-xl font-black text-white">{result.name}</h3>
              {result.subtitle && <p className="text-xs text-white/50">{result.subtitle}</p>}
            </div>

            {/* Quick stats */}
            <div className="grid w-full grid-cols-3 gap-1.5 sm:gap-2">
              {(["atk", "hp", "def"] as const).map((stat) => (
                <div key={stat} className="flex flex-col items-center rounded-lg sm:rounded-xl bg-black/40 p-1.5 sm:p-2">
                  <span className="text-[7px] sm:text-[9px] font-bold uppercase text-white/40">{STAT_CONFIG[stat].icon}</span>
                  <span className="text-sm sm:text-base font-black" style={{ color: STAT_CONFIG[stat].color }}>{result[stat]}</span>
                </div>
              ))}
            </div>

            {/* Ability */}
            {ability && (
              <div className="w-full rounded-xl bg-black/50 p-2.5 sm:p-3 text-center">
                <span className="text-xl sm:text-2xl">{ability.icon}</span>
                <p className="mt-1 text-xs font-black text-white">{ability.name}</p>
                <p className="text-[9px] sm:text-[10px] text-white/40">{ability.desc}</p>
              </div>
            )}
          </div>

          {/* Shimmer */}
          {rs.shimmer && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
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
            const id = Number(result.card.id);
            setUnlockedCards((prev) => {
              const next = [...prev];
              if (!next.includes(id)) next.push(id);
              return next;
            });
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
    const card = ALL_CARDS.find((c) => c.id === cardId) || ALL_CARDS[0];
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

  // ─── Deck Slot ──────────────────────────────────────────────────────────
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
        className="group relative flex items-center gap-3 rounded-2xl border p-3 transition-all hover:shadow-md"
        style={{ borderColor: rs.accent + "60", boxShadow: `0 2px 8px ${rs.accent}15`, background: `linear-gradient(135deg, ${rs.bgDark}CC, ${elemColor}15)` }}
      >
        {/* Slot number */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-black"
          style={{ backgroundColor: elemColor + "25", color: elemColor }}>
          {index + 1}
        </div>

        {/* Avatar */}
        <CardAvatar elementId={card.element.id} size={44} />

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs font-black text-white">{card.name}</p>
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
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400 opacity-0 transition-all hover:bg-red-500/40 hover:text-red-300 group-hover:opacity-100"
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
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-sm max-h-full">

      {/* ─── Header ─── */}
      <div className="flex-shrink-0 border-b border-slate-700 bg-slate-900 px-3 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
            <Badge tone="accent">Thẻ bài</Badge>
            <span className="text-xs sm:text-sm font-medium text-slate-400 whitespace-nowrap">{collectedCount}/{totalCards}</span>
            {collectionPower > 0 && <PowerBadge power={collectionPower} />}
            {fuseableCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-purple-400">
                <GitMerge size={10} />{fuseableCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-slate-500">EXP</p>
              <p className="text-base sm:text-lg font-black leading-none tabular-nums text-amber-400">{points.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Element Filter Buttons */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <button
            onClick={() => setSelectedElement(null)}
            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all ${selectedElement === null ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"}`}
          >Tất cả</button>
          {Array.isArray(ELEMENTS) && ELEMENTS.map((el) => (
            <button
              key={el.id}
              onClick={() => setSelectedElement(el.id === selectedElement ? null : el.id)}
              className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all ${selectedElement === el.id ? "ring-2 ring-offset-1 ring-offset-slate-900" : "opacity-70 hover:opacity-100"}`}
              style={{ backgroundColor: selectedElement === el.id ? el.accent : `${el.accent}22`, color: selectedElement === el.id ? "white" : el.accent, borderColor: el.accent, ...(selectedElement !== el.id ? { border: `1px solid ${el.accent}44` } : {}) }}
            >
              {getAvatarEmoji(el.id)} {el.name}
            </button>
          ))}
        </div>

        {/* Search & Sort Row */}
        <div className="relative mt-2 flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm thẻ theo tên..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 pl-9 text-sm font-medium text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="power">Power</option>
            <option value="level">Level</option>
            <option value="rarity">Rarity</option>
            <option value="name">Name</option>
          </select>
        </div>

        {/* Collection progress map */}
        <div className="mt-2 p-3 rounded-2xl bg-black/60 border border-slate-700">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bộ sưu tập</span>
            <span className="text-[10px] font-black text-white tabular-nums">
              {collectedCount}/{totalCards}
            </span>
          </div>
          <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (collectedCount / Math.max(totalCards, 1)) * 100)}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: "linear-gradient(90deg, #06b6d4, #22c55e, #f59e0b, #a855f7, #ef4444)" }}
            />
            {[25, 50, 75, 100].map((milestone) => {
              const pct = milestone <= (collectedCount / Math.max(totalCards, 1)) * 100;
              return (
                <div key={milestone}
                  className="absolute top-0 bottom-0 z-10"
                  style={{ left: `${milestone}%`, marginLeft: -1, width: 2, background: pct ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)" }}
                />
              );
            })}
          </div>
          {/* Milestone labels */}
          <div className="flex justify-between mt-0.5 px-0.5">
            {[25, 50, 75, 100].map((m) => (
              <span key={m} className={`text-[7px] font-bold ${m <= (collectedCount / Math.max(totalCards, 1)) * 100 ? "text-white" : "text-slate-600"}`}>
                {m}%
              </span>
            ))}
          </div>
          {collectionPower > 0 && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[9px] font-medium text-slate-500">Tổng Power</span>
              <PowerBadge power={collectionPower} />
            </div>
          )}
        </div>

        {/* Daily Challenge Card */}
        {dailyChallenge && (() => {
          const challengeCard = ALL_CARDS.find((c) => c.id === dailyChallenge.cardId);
          if (!challengeCard) return null;
          const elemColor2 = ELEM_COLOR[challengeCard.element.id] || "#94a3b8";
          return (
            <div className="mt-2 flex items-center gap-2 rounded-xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-950/80 to-orange-950/80 p-2.5"
              style={{ boxShadow: "0 0 20px rgba(245,158,11,0.15)" }}>
              <div className="flex items-center gap-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/80 shadow">
                  <Sparkle size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-amber-400">Thử thách ngày</p>
                  <p className="text-[10px] font-bold text-amber-500">+100% EXP khi lên cấp</p>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative flex-shrink-0" style={{ width: 36, height: 48 }}>
                  {getCardArt(challengeCard.id, challengeCard.element.id, challengeCard.artVariant || 1, challengeCard.rarity.id)}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-white">{challengeCard.name}</p>
                  <p className="text-[9px] font-bold" style={{ color: elemColor2 }}>
                    {getAvatarEmoji(challengeCard.element.id)} {challengeCard.element.id === 'plastic' ? '🔵 Nhựa' :
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
                  ? "bg-indigo-500 text-white shadow-md"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"
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
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${filterRarity === "all" ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"}`}>
                  Tất cả
                </button>
                {RARITY_ORDER.map((rid) => (
                  <button key={rid} onClick={() => setFilterRarity(rid)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                      filterRarity === rid ? "text-white" : "text-slate-400 bg-slate-800 border-slate-700 hover:bg-slate-700"
                    }`}
                    style={filterRarity === rid ? { backgroundColor: RARITY[rid].accent, borderColor: RARITY[rid].accent } : {}}>
                    {RarityStars && <RarityStars rarityId={rid} size={8} />} {RARITY[rid].name}
                  </button>
                ))}
                <button onClick={() => setShowLocked(!showLocked)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${showLocked ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"}`}>
                  <Lock size={10} className="inline mr-1" />
                  {showLocked ? "Ẩn khóa" : "Hiện khóa"}
                </button>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                  className="ml-auto rounded-xl border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs font-bold text-slate-300 outline-none focus:border-indigo-500 cursor-pointer">
                  <option value="power">PWR</option>
                  <option value="atk">ATK</option>
                  <option value="hp">HP</option>
                </select>
              </div>
              {/* Element filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto thin-scrollbar pb-0.5">
                <button onClick={() => setFilterElement("all")}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${filterElement === "all" ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 border border-slate-700"}`}>
                  Tất cả
                </button>
                {Array.isArray(ELEMENTS) && ELEMENTS.map((el) => (
                  <button key={el.id} onClick={() => setFilterElement(el.id)}
                    className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${filterElement === el.id ? "text-white" : "text-slate-400 bg-slate-800 border border-slate-700"}`}
                    style={filterElement === el.id ? { backgroundColor: el.accent } : {}}>
                    <span>{getAvatarEmoji(el.id)}</span>{el.name}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] sm:text-xs text-slate-500">{displayCards.length} thẻ · {collectedCount} đã mở</p>

            {displayCards.length === 0 ? (
              <EmptyState icon={<Layers size={40} className="text-slate-600" />} title="Không có thẻ" subtitle="Thử thay đổi bộ lọc." />
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
            {/* Status message */}
            {fuseMsg && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                  fuseMsg.includes("thành") ? "border-emerald-500/50 bg-emerald-950/60 text-emerald-300" : "border-red-500/50 bg-red-950/60 text-red-300"
                }`}>
                {fuseMsg}
              </motion.div>
            )}

            {/* Fusion Animation overlay */}
            {fuseAnimCard && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={() => setFuseAnimCard(null)}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="flex flex-col items-center gap-6"
                >
                  {/* Flash burst */}
                  <motion.div
                    animate={{ opacity: [0, 1, 0], scale: [1, 2.5, 1] }}
                    transition={{ duration: 0.6, repeat: 2 }}
                    className="absolute inset-0 -m-20 rounded-full bg-gradient-to-br from-amber-400 via-yellow-300 to-orange-500 blur-3xl"
                  />
                  {/* Stars burst */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 1, scale: 0 }}
                      animate={{ opacity: 0, scale: 3, x: Math.cos(i * Math.PI / 6) * 120, y: Math.sin(i * Math.PI / 6) * 120 }}
                      transition={{ duration: 1, delay: i * 0.04 }}
                      className="absolute text-xl"
                    >
                      <Star size={16} className="fill-amber-400 text-amber-400" />
                    </motion.div>
                  ))}
                  {/* XP badge */}
                  <motion.div
                    animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
                    transition={{ repeat: 3, duration: 0.5, ease: "easeInOut" }}
                    className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-3 text-2xl font-black text-white shadow-2xl z-10"
                    style={{ boxShadow: "0 0 60px rgba(245,158,11,0.5)" }}
                  >
                    +{fuseAnimCard.xpGained} EXP
                  </motion.div>
                  {/* Card */}
                  <div className="relative z-10">
                    <CardAvatar elementId={fuseAnimCard.card.element.id} size={100} />
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.8 }}
                      className="absolute -inset-4 rounded-3xl border-4 border-amber-400"
                      style={{ boxShadow: "0 0 40px rgba(245,158,11,0.4)" }}
                    />
                  </div>
                  <div className="text-center z-10">
                    <p className="text-2xl font-black text-white">{fuseAnimCard.card.name}</p>
                    <p className="text-amber-300 font-bold">Hợp nhất thành công!</p>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {unlockedCards.filter((id) => getCardCount(id) >= 3).length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="relative">
                  <GitMerge size={64} className="text-slate-700" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-black text-slate-600">3x</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-slate-300">Chưa có thẻ hợp nhất</p>
                  <p className="text-sm text-slate-500 mt-1">Thu thập 3 bản sao cùng loại để hợp nhất</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <GitMerge size={14} className="text-purple-400" />
                  <p className="text-xs font-bold text-slate-400">Chọn thẻ để hợp nhất — tiêu tốn 3 bản sao</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {unlockedCards.filter((id) => getCardCount(id) >= 3).map((id) => {
                    const card = ALL_CARDS.find((c) => c.id === id)!;
                    const count = getCardCount(id);
                    const xpGain = getFusedXp(card.atk + card.hp);
                    const rs = RARITY[card.rarity.id] || RARITY.common;
                    const ability = getCardAbility(card);
                    const power = calcPower(card, getCardLevel(id));
                    const elemColor2 = ELEM_COLOR[card.element.id] || "#94a3b8";
                    const copiesNeeded = Math.min(count, 3);

                    return (
                      <div key={id}
                        className="relative flex flex-col items-center rounded-2xl border p-3 text-center transition-all hover:scale-[1.02]"
                        style={{
                          background: `linear-gradient(180deg, ${rs.bgDark} 0%, ${elemColor2}15 100%)`,
                          borderColor: rs.accent + "70",
                          boxShadow: `0 4px 20px ${rs.accent}25`,
                        }}
                      >
                        {/* Top neon bar */}
                        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
                          style={{ background: `linear-gradient(90deg, ${elemColor2}, ${rs.accent})` }} />

                        {/* Count badges */}
                        <div className="absolute -right-1 -top-1 z-10 flex gap-0.5">
                          {Array.from({ length: copiesNeeded }).map((_, i) => (
                            <div key={i} className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-800 bg-amber-500 text-[8px] font-black text-white shadow">
                              {i + 1}
                            </div>
                          ))}
                        </div>

                        {/* Card art */}
                        <div className="relative mb-2 mt-1">
                          <CardAvatar elementId={card.element.id} size={56} />
                        </div>

                        {/* Stars */}
                        <RarityStars rarityId={card.rarity.id} size={7} />

                        {/* Name */}
                        <p className="mt-1 text-[10px] font-black text-white leading-tight">{card.name}</p>

                        {/* Ability */}
                        {ability && (
                          <p className="text-[9px] text-slate-400">{ability.icon} {ability.name}</p>
                        )}

                        {/* Power */}
                        <PowerBadge power={power} />

                        {/* XP reward */}
                        <div className="mt-1 flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[9px] font-bold text-amber-400">
                          <Sparkles size={8} className="text-amber-400" />
                          +{xpGain} EXP
                        </div>

                        {/* Fuse button */}
                        <Button
                          onClick={() => handleFuse(id)}
                          disabled={fusing}
                          size="sm"
                          className="mt-2 w-full text-[10px] py-1.5 font-bold"
                          style={{ background: `linear-gradient(135deg, ${rs.accent}, ${elemColor2})`, color: "#fff" }}
                        >
                          <GitMerge size={9} />Hợp nhất
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* LEVEL UP */}
        {activeSection === "levelup" && (
          <div className="space-y-3 p-4">
            {/* Success animation */}
            {levelupMsg && levelupMsg.includes("thành") && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onClick={() => setLevelupMsg(null)}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 150, damping: 12 }}
                  className="relative flex flex-col items-center gap-4"
                >
                  {/* Stars burst */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 1, scale: 0 }}
                      animate={{ opacity: 0, scale: 2.5, x: Math.cos(i * Math.PI / 4) * 100, y: Math.sin(i * Math.PI / 4) * 100 }}
                      transition={{ duration: 1, delay: i * 0.05 }}
                      className="absolute text-2xl"
                    >
                      <Star size={16} className="fill-amber-400 text-amber-400" />
                    </motion.div>
                  ))}
                  <div className="relative rounded-3xl border-4 border-amber-400 bg-gradient-to-br from-amber-400 to-orange-500 p-8 shadow-2xl"
                    style={{ boxShadow: "0 0 80px rgba(245,158,11,0.5)" }}>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <Star size={64} className="text-white drop-shadow-lg" />
                    </motion.div>
                  </div>
                  <p className="relative text-2xl font-black text-white drop-shadow-lg">{levelupMsg}</p>
                  <p className="relative text-sm text-amber-300">Nâng cấp thành công!</p>
                </motion.div>
              </motion.div>
            )}

            {/* Error message */}
            {levelupMsg && !levelupMsg.includes("thành") && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/50 bg-red-950/60 px-4 py-3 text-sm font-bold text-red-300">
                {levelupMsg}
              </motion.div>
            )}

            {/* Header info */}
            <div className="flex items-center gap-2">
              <ArrowUp size={14} className="text-amber-400" />
              <p className="text-xs font-bold text-slate-400">
                Chọn thẻ để nâng cấp · EXP hiện có: <span className="text-amber-400 font-black">{points.toLocaleString()}</span>
              </p>
            </div>

            {collectedCount === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <ArrowUp size={64} className="text-slate-700" />
                <div className="text-center">
                  <p className="text-lg font-black text-slate-300">Chưa có thẻ</p>
                  <p className="text-sm text-slate-500 mt-1">Thu thập thẻ để nâng cấp</p>
                </div>
              </div>
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
                  const elemColor2 = ELEM_COLOR[card.element.id] || "#94a3b8";
                  const nextPower = calcPower(card, level + 1);
                  const atkNow = card.atk * level;
                  const atkNext = card.atk * (level + 1);
                  const hpNow = card.hp * level;
                  const hpNext = card.hp * (level + 1);

                  return (
                    <div key={id}
                      className="relative flex flex-col items-center rounded-2xl border p-3 text-center transition-all hover:scale-[1.02]"
                      style={{
                        background: `linear-gradient(180deg, ${rs.bgDark} 0%, ${elemColor2}10 100%)`,
                        borderColor: rs.accent + "70",
                        boxShadow: isMax ? `0 0 20px ${rs.accent}40` : `0 4px 16px ${rs.accent}20`,
                      }}
                    >
                      {/* Top neon bar */}
                      <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
                        style={{ background: `linear-gradient(90deg, ${elemColor2}, ${rs.accent})` }} />

                      {/* MAX badge */}
                      {isMax && (
                        <div className="absolute -right-1 -top-1 z-10 rounded-full bg-amber-400 px-2 py-0.5 text-[8px] font-black text-slate-900 shadow-lg">
                          MAX
                        </div>
                      )}

                      {/* Level badge */}
                      {!isMax && (
                        <div className="absolute -right-1 -top-1 z-10 rounded-full bg-slate-800 border border-slate-600 px-1.5 py-0.5 text-[8px] font-black text-slate-300">
                          Lv.{level}
                        </div>
                      )}

                      {/* Card avatar */}
                      <div className="relative mb-2 mt-1">
                        <CardAvatar elementId={card.element.id} size={56} />
                        {level > 1 && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                            <LevelBadge level={level} />
                          </div>
                        )}
                      </div>

                      {/* Stars */}
                      <RarityStars rarityId={card.rarity.id} size={7} />

                      {/* Name */}
                      <p className="mt-1 text-[10px] font-black text-white leading-tight">{card.name}</p>

                      {/* Ability */}
                      {ability && (
                        <p className="text-[9px] text-slate-400">{ability.icon} {ability.name}</p>
                      )}

                      {/* Power */}
                      <PowerBadge power={power} />

                      {isMax ? (
                        <div className="mt-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[9px] font-bold text-amber-400">
                          Cấp tối đa
                        </div>
                      ) : (
                        <>
                          {/* Before/After stat comparison */}
                          <div className="mt-1 flex w-full flex-col gap-0.5 px-1">
                            {/* ATK */}
                            <div className="flex justify-between text-[8px]">
                              <span className="text-slate-500">ATK</span>
                              <span className="text-slate-300">{atkNow} <span className="text-emerald-400">→</span> <span className="text-emerald-400 font-black">{atkNext}</span></span>
                            </div>
                            {/* ATK bar */}
                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: `${Math.min(100, (atkNow / (card.atk * 20)) * 100)}%` }}
                                animate={{ width: `${Math.min(100, (atkNext / (card.atk * 20)) * 100)}%` }}
                                transition={{ duration: 0.5 }}
                                className="h-full rounded-full bg-red-500"
                              />
                            </div>
                            {/* HP */}
                            <div className="flex justify-between text-[8px]">
                              <span className="text-slate-500">HP</span>
                              <span className="text-slate-300">{hpNow} <span className="text-emerald-400">→</span> <span className="text-emerald-400 font-black">{hpNext}</span></span>
                            </div>
                            {/* HP bar */}
                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: `${Math.min(100, (hpNow / (card.hp * 20)) * 100)}%` }}
                                animate={{ width: `${Math.min(100, (hpNext / (card.hp * 20)) * 100)}%` }}
                                transition={{ duration: 0.5 }}
                                className="h-full rounded-full bg-emerald-500"
                              />
                            </div>
                          </div>

                          {/* Cost */}
                          <div className={`mt-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold ${hasXp ? "text-amber-400 bg-amber-500/15 border border-amber-500/30" : "text-red-400 bg-red-500/15 border border-red-500/30"}`}>
                            <Sparkles size={8} />{xpCost.toLocaleString()} EXP
                          </div>

                          {/* Upgrade button */}
                          <Button
                            onClick={() => handleLevelUp(id)}
                            disabled={!hasXp || levelingUp}
                            size="sm"
                            className={`mt-1.5 w-full text-[10px] py-1.5 font-bold ${hasXp ? "text-white" : "text-slate-500"}`}
                            style={hasXp ? { background: `linear-gradient(135deg, #f59e0b, #ef4444)` } : { background: "#1e293b" }}
                          >
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
            {/* Animated orb */}
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
              <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl"
                style={{ boxShadow: "0 0 40px rgba(99,102,241,0.3)" }}>
                <Wand2 size={48} className="text-indigo-400" />
              </div>
              <div className="absolute -right-3 -top-3 z-10 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
                {PULL_COST} EXP
              </div>
            </motion.div>

            <div>
              <h3 className="text-2xl font-black text-white">Mở gói thẻ bài</h3>
              <p className="mt-1 text-sm text-slate-400">
                Dùng <span className="font-black text-amber-400">{PULL_COST} EXP</span> để nhận thẻ ngẫu nhiên
              </p>
            </div>

            {/* Pull panel */}
            <div className="w-full max-w-xs space-y-3 rounded-2xl border border-slate-700 bg-slate-800/80 p-5">
              <div>
                <p className="text-xs text-slate-500">EXP hiện có</p>
                <p className="text-3xl font-black text-amber-400">{points.toLocaleString()}</p>
              </div>
              {points < PULL_COST && (
                <p className="text-xs font-medium text-red-400">Cần thêm {(PULL_COST - points).toLocaleString()} EXP để mở gói</p>
              )}
              <Button
                onClick={handlePullGacha}
                disabled={points < PULL_COST || isPulling}
                loading={isPulling}
                size="lg"
                className="w-full text-sm font-bold py-3"
                style={points >= PULL_COST ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" } : {}}
              >
                <Sparkles size={14} />
                {points < PULL_COST ? `Cần ${PULL_COST.toLocaleString()} EXP` : isPulling ? "Đang mở..." : `Mở gói (${PULL_COST} EXP)`}
              </Button>
            </div>

            {/* Rarity rates */}
            <div className="w-full max-w-xs space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tỉ lệ rơi</p>
              <div className="grid grid-cols-4 gap-2">
                {RARITY_ORDER.map((rid) => (
                  <div key={rid} className="flex flex-col items-center rounded-2xl border p-2.5"
                    style={{ backgroundColor: RARITY[rid].bgDark + "CC", borderColor: RARITY[rid].accent + "50" }}>
                    <RarityStars rarityId={rid} size={8} />
                    <span className="mt-1 rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase"
                      style={{ backgroundColor: RARITY[rid].accent + "30", color: RARITY[rid].accent }}>
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
                <h4 className="font-black text-base text-white">Đội hình chiến đấu</h4>
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
                      <div key={i} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/40 p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-slate-500">{i + 1}</div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-slate-700">
                          <Plus size={16} className="text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Chọn thẻ</span>
                      </div>
                    );
                  }
                  return <DeckSlot key={i} cardId={cardId} index={i} />;
                })}
              </div>
            </div>

            {/* Synergy + Battle Tips */}
            <div className="space-y-2">
              {!canBattle && (
                <div className="flex items-center gap-2 rounded-xl border-2 border-amber-500/30 bg-amber-950/40 px-4 py-2">
                  <Trophy size={16} className="text-amber-400" />
                  <p className="text-xs font-bold text-amber-300">Cần {DECK_SIZE} thẻ để chiến đấu tốt nhất</p>
                </div>
              )}

              {/* Element Synergy */}
              {deckCards.length >= 3 && (() => {
                const elements = deckCards.map((c) => c.element.id);
                const counts: Record<string, number> = {};
                elements.forEach((e) => { counts[e] = (counts[e] || 0) + 1; });
                const synergyEntries = Object.entries(counts).filter(([, n]) => n >= 3);
                if (synergyEntries.length === 0) {
                  const unique = new Set(elements).size;
                  if (unique >= 3) {
                    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                    return (
                      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2">
                        <Sparkles size={14} className="text-indigo-400" />
                        <p className="text-xs font-medium text-slate-400">
                          Thế mạnh: {dominant?.[0]} ({dominant?.[1]}/5) — cần thêm thẻ cùng loại để kích hoạt Synergy!
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2">
                      <Zap size={14} className="text-amber-400" />
                      <p className="text-xs font-medium text-slate-400">Cần 3+ thẻ cùng nguyên tố để kích hoạt Synergy!</p>
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
                    className="flex items-center gap-2 rounded-xl border-2 px-4 py-2"
                    style={{ borderColor: synElem?.accent || '#22c55e', background: `linear-gradient(135deg, ${synElem?.accent || '#22c55e'}15, transparent)`, boxShadow: `0 0 20px ${synElem?.accent || '#22c55e'}25` }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={16} className="text-emerald-400 animate-pulse" />
                      <span className="text-lg">{getAvatarEmoji(synEl)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-white">SYNERGY KÍCH HOẠT!</p>
                      <p className="text-[10px] text-slate-400">
                        {synCount}x {synElem?.name || synEl} — +{bonus}% ATK tất cả thẻ {synElem?.name || synEl}
                      </p>
                    </div>
                    <div className="rounded-full px-2 py-1 text-xs font-black text-white"
                      style={{ backgroundColor: synElem?.accent || '#22c55e' }}>
                      +{bonus}%
                    </div>
                  </motion.div>
                );
              })()}

              {deck.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2">
                  <span className="text-xs font-bold text-slate-300">Tổng sức mạnh đội hình</span>
                  <PowerBadge power={deckPower} />
                </div>
              )}
            </div>

            {/* Card picker */}
            <div>
              <h4 className="mb-3 font-black text-base text-white">Chọn thẻ vào đội hình</h4>
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
                        if (inDeck) setDeck((d) => d.filter((x) => x !== id));
                        else if (deck.length < DECK_SIZE) setDeck((d) => [...d, id]);
                      }}
                      className={`relative flex flex-col items-center rounded-xl border-2 p-1.5 transition-all overflow-hidden ${
                        inDeck ? `${rs.border} ring-2 ring-amber-400` : "border-slate-700 hover:border-slate-500"
                      }`}
                      style={{ aspectRatio: "3/4", background: inDeck ? rs.bgDark : rs.bgDark + "99" }}
                    >
                      <CardAvatar elementId={card.element.id} size={36} />
                      <p className="mt-1 line-clamp-1 text-center text-[8px] font-bold text-white leading-tight">{card.name}</p>
                      <RarityStars rarityId={card.rarity.id} size={6} />
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

            {/* Battle Button */}
            <motion.div
              whileHover={canBattle ? { scale: 1.02 } : {}}
              whileTap={canBattle ? { scale: 0.98 } : {}}
            >
              <Button
                onClick={() => setShowBattle(true)}
                disabled={!canBattle}
                size="lg"
                className={`w-full text-sm font-black py-4 rounded-2xl shadow-xl ${canBattle ? "bg-gradient-to-r from-red-600 via-rose-500 to-pink-500 hover:from-red-700 hover:via-rose-600 hover:to-pink-600 text-white animate-pulse" : "bg-slate-800 text-slate-500 border border-slate-700"}`}
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

      {/* ─── Gacha Result Reveal ─── */}
      <AnimatePresence>
        {gachaResult && (
          <GachaReveal result={gachaResult} onClose={() => setGachaResult(null)} />
        )}
      </AnimatePresence>

      {/* ─── CardBattle Modal ─── */}
      <AnimatePresence>
        {showBattle && (
          <CardBattle
            deckCardIds={deck}
            cardLevels={Object.fromEntries(deck.map((id) => [id, getCardLevel(id)]))}
            onClose={() => setShowBattle(false)}
            onWin={(xp) => onReward(xp)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
