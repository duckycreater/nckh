import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Layers, Lock, Swords, X, Wand2,
  ArrowUp, GitMerge, Zap, Trophy, Star, Shield,
  Heart, ChevronDown, Info, Plus, Check, RefreshCw,
  Activity, Award, Cpu, Skull, Eye, Search,
  ChevronRight, Battery, Gauge,
  Filter, SortAsc, Sparkle, Brain, Coffee, Timer,
} from "lucide-react";
import { UserProgress } from "../types";
import {
  ALL_CARDS, RARITIES, getElementIcon, ELEMENTS, calcPower,
  getXpForLevel, getFusedXp, getCardAbility, getCardById,
  getCardArt, getAvatarEmoji, tCardName,
} from "../lib/cards";
import { CardBattle } from "./CardBattle";
import { RoguelikeRun } from "./RoguelikeRun";
import { Badge, Button, Card, EmptyState } from "../lib/ui";

// ─── Types ─────────────────────────────────────────────────────────────────
type Section = "collection" | "fusion" | "levelup" | "gacha" | "battle" | "shards" | "practice" | "roguelike";

// ─── Auth helper ────────────────────────────────────────────────────────────
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Rarity tokens ─────────────────────────────────────────────────────────
// Note: `name` stores a translation key; call `t("cards.rarity.xxx")` inside components
const RARITY: Record<string, {
  name: string; shortName: string;
  accent: string; bgLight: string; bgDark: string;
  border: string; glow: string; badgeBg: string; badgeText: string;
  shimmer: boolean; starCount: number;
}> = {
  common:    { name: "cards.rarity.common",    shortName: "PT", accent: "#94a3b8", bgLight: "#f8fafc", bgDark: "#1e293b", border: "border-slate-400/50", glow: "shadow-slate-400/30", badgeBg: "bg-slate-700", badgeText: "text-slate-300", shimmer: false, starCount: 1 },
  rare:      { name: "cards.rarity.rare",      shortName: "HM", accent: "#3b82f6", bgLight: "#1e3a8a", bgDark: "#1e3a8a", border: "border-blue-500/60", glow: "shadow-blue-400/40", badgeBg: "bg-blue-600", badgeText: "text-blue-100", shimmer: false, starCount: 2 },
  uncommon:  { name: "cards.rarity.uncommon",   shortName: "T",  accent: "#64748b", bgLight: "#1e293b", bgDark: "#1e293b", border: "border-slate-500/50", glow: "shadow-slate-400/30", badgeBg: "bg-slate-600", badgeText: "text-slate-200", shimmer: false, starCount: 1 },
  epic:      { name: "cards.rarity.superRare",  shortName: "SH", accent: "#a855f7", bgLight: "#581c87", bgDark: "#581c87", border: "border-purple-500/70", glow: "shadow-purple-400/50", badgeBg: "bg-purple-600", badgeText: "text-purple-100", shimmer: true, starCount: 3 },
  legendary:  { name: "cards.rarity.legendary", shortName: "HT", accent: "#f59e0b", bgLight: "#78350f", bgDark: "#78350f", border: "border-amber-400/80", glow: "shadow-amber-400/60", badgeBg: "bg-amber-600", badgeText: "text-amber-100", shimmer: true, starCount: 4 },
};
const RARITY_ORDER = ["legendary", "epic", "rare", "uncommon", "common"];
const PULL_COST = 50;
const DECK_SIZE = 5;
const PITY_EPIC = 30; // guaranteed epic every 30 pulls
const PITY_LEGENDARY = 100; // guaranteed legendary every 100 pulls

// ─── Element colors ────────────────────────────────────────────────────────
const ELEM_COLOR: Record<string, string> = {
  plastic: "#06b6d4", paper: "#f59e0b", glass: "#14b8a6",
  metal: "#64748b", organic: "#22c55e", hazard: "#ef4444",
  energy: "#f97316", water: "#0ea5e9", tech: "#8b5cf6",
};

// ─── Stat config (translation key → config) ──────────────────────────────────
const STAT_CONFIG: Record<string, { icon: string; key: string; color: string }> = {
  atk: { icon: "ATK", key: "flashcards.stats.atk",   color: "#ef4444" },
  hp:  { icon: "HP",  key: "flashcards.stats.hp",    color: "#22c55e" },
  def: { icon: "DEF", key: "flashcards.stats.def",   color: "#3b82f6" },
  spd: { icon: "SPD", key: "flashcards.stats.spd",   color: "#06b6d4" },
  crt: { icon: "CRT", key: "flashcards.stats.crt",   color: "#f59e0b" },
  int: { icon: "INT", key: "flashcards.stats.int",   color: "#a855f7" },
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

// ─── Rarity Label (with i18n) ──────────────────────────────────────────
function RarityLabel({ rarityId }: { rarityId: string }) {
  const { t } = useTranslation();
  const key = RARITY[rarityId]?.name || "cards.rarity.common";
  return <>{t(key)}</>;
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
  const { t } = useTranslation();
  const cfg = STAT_CONFIG[stat];
  const barPct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 text-center text-[10px] font-black" style={{ color: cfg.color }}>{cfg.icon}</div>
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t(cfg.key)}</span>
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
  const { t } = useTranslation();
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
          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">{t("flashcards.locked")}</span>
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
            <p className="line-clamp-1 text-center text-[9px] sm:text-[10px] font-black text-white leading-tight tracking-wide">{tCardName(card.name)}</p>
            {/* Power */}
            <div className="flex items-center justify-center mt-0.5 gap-0.5">
              <Zap size={8} className="text-amber-400" />
              <span className="text-[9px] sm:text-[10px] font-black text-amber-400" style={{ fontFamily: "monospace" }}>{power}</span>
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
            <p className="text-[9px] sm:text-[10px] font-black text-center text-white mb-1 leading-tight tracking-wide">{tCardName(card.name)}</p>
            {ability && (
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-sm">{ability.icon}</span>
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-400">{ability.name}</span>
              </div>
            )}
            <div className="flex-1 space-y-0.5 overflow-hidden">
              {(["atk", "hp", "def", "spd"] as const).map((stat) => {
                const cfg2 = STAT_CONFIG[stat];
                const val = card[stat] * (stat === "atk" || stat === "hp" ? level : 1);
                const barPct = Math.min(100, (val / (stat === "hp" ? 100 : 50)) * 100);
                return (
                  <div key={stat} className="flex items-center gap-1.5">
                    <div className="w-5 text-center text-[8px] sm:text-[9px] font-black" style={{ color: cfg2.color }}>{cfg2.icon}</div>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: cfg2.color, width: `${barPct}%` }} />
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-black tabular-nums w-6 text-right" style={{ color: cfg2.color }}>{val}</span>
                  </div>
                );
              })}
            </div>
            {ability && (
              <p className="text-[7px] sm:text-[8px] text-center text-slate-500 leading-tight mt-1 line-clamp-2">
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
  const { t } = useTranslation();
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
                  {t(rs.name)}
                </span>
                {level > 1 && <LevelBadge level={level} />}
              </div>

              {/* Name */}
              <h3 className="text-base sm:text-xl font-black text-white leading-tight truncate">{tCardName(card.name)}</h3>
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
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("flashcards.stats")}</span>
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
function GachaReveal({ result, onClose, pullCount = 0 }: { result: any; onClose: () => void; pullCount?: number }) {
  const { t } = useTranslation();
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
        {/* Sparkle trail — follows card during flip */}
        {flipped && Array.from({ length: 20 }).map((_, i) => {
          const colors = ["#f59e0b","#a855f7","#3b82f6","#22c55e","#ef4444","#06b6d4","#ec4899"];
          const c = colors[i % colors.length];
          const a = (i / 20) * 360;
          const d = 30 + Math.random() * 80;
          return (
            <motion.div key={`trail-${i}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], x: `calc(50% + ${Math.cos(a * Math.PI / 180) * d}%)`, y: `calc(50% + ${Math.sin(a * Math.PI / 180) * d}%)` }}
              transition={{ duration: 1.8, delay: 0.2 + i * 0.05, ease: "easeOut" }}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{ background: c, boxShadow: `0 0 6px ${c}` }}
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
          {t(rs.name)}!
        </motion.div>

        {/* Pull count */}
        {pullCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4 rounded-full border border-slate-600/50 bg-slate-900/80 px-4 py-1.5 text-xs font-black text-slate-400"
          >
            Lần mở #{pullCount}
          </motion.div>
        )}

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
              <h3 className="mt-2 text-xl font-black text-white">{tCardName(result.name)}</h3>
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
          {result.isNew ? t("flashcards.gacha.newCard") : t("flashcards.gacha.duplicate")}
        </motion.p>

        {/* Shards awarded for duplicate */}
        {result.shardsAwarded > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-2 flex items-center gap-1.5 rounded-full bg-purple-500/30 border border-purple-500/50 px-3 py-1"
          >
            <Cpu size={12} className="text-purple-400" />
            <span className="text-xs font-black text-purple-300">{t("flashcards.shardCount", { count: result.shardsAwarded })}</span>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
          <Button onClick={onClose} size="lg" className="mt-3 px-10 font-bold bg-white text-slate-900 hover:bg-slate-100">
            {result.isNew ? t("flashcards.gacha.collect") : t("common.close")}
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
  const { t } = useTranslation();

  // ─── Rarity & stat labels (computed from translations) ──────────────────
  const rarityLabels = {
    common:    { name: t("cards.rarity.common"),    shortName: "PT", accent: "#94a3b8", bgLight: "#f8fafc", bgDark: "#1e293b", border: "border-slate-400/50", glow: "shadow-slate-400/30", badgeBg: "bg-slate-700", badgeText: "text-slate-300", shimmer: false, starCount: 1 },
    rare:      { name: t("cards.rarity.rare"),       shortName: "HM", accent: "#3b82f6", bgLight: "#1e3a8a", bgDark: "#1e3a8a", border: "border-blue-500/60", glow: "shadow-blue-400/40", badgeBg: "bg-blue-600", badgeText: "text-blue-100", shimmer: false, starCount: 2 },
    uncommon:  { name: t("cards.rarity.uncommon"),   shortName: "T",  accent: "#64748b", bgLight: "#1e293b", bgDark: "#1e293b", border: "border-slate-500/50", glow: "shadow-slate-400/30", badgeBg: "bg-slate-600", badgeText: "text-slate-200", shimmer: false, starCount: 1 },
    epic:      { name: t("cards.rarity.epic"),        shortName: "SH", accent: "#a855f7", bgLight: "#581c87", bgDark: "#581c87", border: "border-purple-500/70", glow: "shadow-purple-400/50", badgeBg: "bg-purple-600", badgeText: "text-purple-100", shimmer: true, starCount: 3 },
    legendary: { name: t("cards.rarity.legendary"),   shortName: "HT", accent: "#f59e0b", bgLight: "#78350f", bgDark: "#78350f", border: "border-amber-400/80", glow: "shadow-amber-400/60", badgeBg: "bg-amber-600", badgeText: "text-amber-100", shimmer: true, starCount: 4 },
  };

  const statLabels = {
    atk: { icon: "ATK", label: t("cards.stat.atk"), color: "#ef4444" },
    hp:  { icon: "HP",  label: t("cards.stat.hp"),  color: "#22c55e" },
    def: { icon: "DEF", label: t("cards.stat.def"), color: "#3b82f6" },
    spd: { icon: "SPD", label: t("cards.stat.spd"), color: "#06b6d6" },
    crt: { icon: "CRT", label: t("cards.stat.crt"), color: "#f59e0b" },
    int: { icon: "INT", label: t("cards.stat.int"), color: "#a855f7" },
  };

  // ─── State ───────────────────────────────────────────────────────────
  const [unlockedCards, setUnlockedCards] = useState<number[]>([]);
  const [gachaResult, setGachaResult] = useState<any>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullCount, setPullCount] = useState(() => {
    try { return parseInt(localStorage.getItem("bmo:gacha:pullCount") || "0", 10); } catch { return 0; }
  });
  const [showPullCount, setShowPullCount] = useState(false);
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
  const [showRoguelike, setShowRoguelike] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fuseMsg, setFuseMsg] = useState<string | null>(null);
  const [fusing, setFusing] = useState(false);
  const [levelingUp, setLevelingUp] = useState(false);
  const [levelupMsg, setLevelupMsg] = useState<string | null>(null);
  const [fuseAnimCard, setFuseAnimCard] = useState<{ card: any; xpGained: number } | null>(null);
  const [newCardIds, setNewCardIds] = useState<Set<number>>(new Set());
  const [shardCount, setShardCount] = useState(0);
  const [shardMsg, setShardMsg] = useState<string | null>(null);

  // ─── Practice / Zen Mode ───────────────────────────────────────────
  const [practiceCards, setPracticeCards] = useState<any[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceFlipped, setPracticeFlipped] = useState(false);
  const [practiceCount, setPracticeCount] = useState(0);
  const [practiceSpeedLabel, setPracticeSpeedLabel] = useState<string | null>(null);
  const [practiceStartTime, setPracticeStartTime] = useState<number>(0);
  const [practiceSessionCount, setPracticeSessionCount] = useState(() => {
    try { return parseInt(localStorage.getItem("bmo:practice:sessionCount") || "0", 10); } catch { return 0; }
  });

  const bestTimesKey = "bmo:practice:bestTimes";
  const [bestTimes, setBestTimes] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem(bestTimesKey) || "{}"); } catch { return {}; }
  });

  const startPractice = () => {
    if (unlockedCards.length === 0) return;
    const shuffled = [...unlockedCards]
      .map((id) => ALL_CARDS.find((c) => c.id === id))
      .filter(Boolean) as any[];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setPracticeCards(shuffled);
    setPracticeIndex(0);
    setPracticeFlipped(false);
    setPracticeCount(0);
    setPracticeSpeedLabel(null);
    const now = Date.now();
    setPracticeStartTime(now);
  };

  const handleFlipCard = () => {
    if (!practiceFlipped) {
      const elapsed = Date.now() - practiceStartTime;
      const isQuick = elapsed < 2000;
      setPracticeSpeedLabel(isQuick ? "Nhanh!" : null);
      setPracticeCount((c) => c + 1);
    }
    setPracticeFlipped((f) => !f);
  };

  const handleNextCard = () => {
    const next = practiceIndex + 1;
    if (next >= practiceCards.length) {
      // session done
      setPracticeSessionCount((c) => {
        const next2 = c + 1;
        localStorage.setItem("bmo:practice:sessionCount", String(next2));
        return next2;
      });
      setPracticeFlipped(false);
      return;
    }
    setPracticeIndex(next);
    setPracticeFlipped(false);
    setPracticeSpeedLabel(null);
    setPracticeStartTime(Date.now());
  };

  const setBestTime = (cardId: number, time: number) => {
    const existing = bestTimes[cardId];
    if (!existing || time < existing) {
      const updated = { ...bestTimes, [cardId]: time };
      setBestTimes(updated);
      localStorage.setItem(bestTimesKey, JSON.stringify(updated));
    }
  };

  const challengeTypes = [
    { id: "multi_element",  label: t("flashcards.challenge.multiElement"),  desc: t("flashcards.challenge.multiElementDesc"), reward: 150, icon: "🎨" },
    { id: "speed_win",      label: t("flashcards.challenge.speedWin"),   desc: t("flashcards.challenge.speedWinDesc"),   reward: 100, icon: "⚡" },
    { id: "no_damage",     label: t("flashcards.challenge.noDamage"),   desc: t("flashcards.challenge.noDamageDesc"),  reward: 200, icon: "🛡️" },
    { id: "ko_all",        label: t("flashcards.challenge.koAll"),      desc: t("flashcards.challenge.koAllDesc"),    reward: 180, icon: "💀" },
    { id: "epic_win",      label: t("flashcards.challenge.epicWin"),    desc: t("flashcards.challenge.epicWinDesc"),  reward: 250, icon: "🌟" },
  ];

  const achievements = [
    { id: "multi_element",  label: t("flashcards.challenge.multiElement"),  desc: t("flashcards.challenge.multiElementDesc"), reward: 150, icon: "🎨" },
    { id: "speed_win",      label: t("flashcards.challenge.speedWin"),   desc: t("flashcards.challenge.speedWinDesc"),   reward: 100, icon: "⚡" },
    { id: "no_damage",     label: t("flashcards.challenge.noDamage"),   desc: t("flashcards.challenge.noDamageDesc"),  reward: 200, icon: "🛡️" },
    { id: "ko_all",        label: t("flashcards.challenge.koAll"),      desc: t("flashcards.challenge.koAllDesc"),    reward: 180, icon: "💀" },
    { id: "epic_win",      label: t("flashcards.challenge.epicWin"),    desc: t("flashcards.challenge.epicWinDesc"),  reward: 250, icon: "🌟" },
  ];

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
    const cardIdx = Math.floor(Math.random() * unlockedCards.length);
    const cardId = unlockedCards[cardIdx];
    const challengeIdx = Math.floor(Math.random() * challengeTypes.length);
    const challenge = {
      date: today,
      cardId,
      buff: 2,
      type: challengeTypes[challengeIdx].id,
      reward: challengeTypes[challengeIdx].reward,
    };
    localStorage.setItem("dailyChallenge", JSON.stringify(challenge));
    return challenge;
  };

  const dailyChallenge = getDailyChallenge();
  const activeChallengeInfo = dailyChallenge ? challengeTypes.find((c) => c.id === dailyChallenge.type) : null;

  // ─── Rarity name helper ───────────────────────────────────────────
  const getRarityName = (rid: string) => rarityLabels[rid as keyof typeof rarityLabels]?.name || rid;
  const getRarityKey = (rid: string) => `cards.rarity.${rid}`;

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
    // Normalize server card format → component format
    const normalized = {
      ...card,
      level,
      element: { id: card.element?.id ?? card.elementId ?? "plastic" },
      rarity: { id: card.rarity?.id ?? card.rarityId ?? "common" },
      abilityId: card.abilityId ?? "def_01",
    };
    return normalized;
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
    setShardCount((progress as any)?.shards ?? 0);
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
        if (result.progress.shards !== undefined) {
          setShardCount(result.progress.shards);
        }
        if (onRefresh) onRefresh(result.progress);
      }
    } catch { /* silent */ }
  }, [userId, onRefresh]);

  const handlePullGacha = () => {
    if (points < PULL_COST) return;
    const nextPull = pullCount + 1;
    setPullCount(nextPull);
    localStorage.setItem("bmo:gacha:pullCount", String(nextPull));
    setShowPullCount(true);
    setTimeout(() => setShowPullCount(false), 2000);
    setIsPulling(true);
    setGachaResult(null);
    if (onSpend) onSpend(PULL_COST, "Mở Gói Thẻ Bài");
    fetch("/api/user-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: userId, type: "flashcard", data: null, pullCount: nextPull }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.success && result.card) {
          const resolved = resolveCard(result.card);
          setGachaResult({ ...resolved, isNew: result.isNew, shardsAwarded: result.shardsAwarded || 0 });
          if (result.shardsAwarded > 0) {
            setShardCount((prev) => prev + result.shardsAwarded);
          }
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
        setFuseMsg(t("flashcards.fusionSuccess", { exp: data.xpGained || getFusedXp(card.atk + card.hp) }));
        if (onSpend) onSpend(data.xpGained || getFusedXp(card.atk + card.hp), t("flashcards.fusing"));
        await refreshProgress();
        fetchCardLevels();
      } else {
        setFuseMsg(data.error || t("common.failed"));
      }
    } catch { setFuseMsg(t("common.connectionError")); }
    setFusing(false);
    setTimeout(() => setFuseMsg(null), 4000);
  };

  const handleLevelUp = async (cardId: number) => {
    setLevelingUp(true);
    setLevelupMsg(null);
    const card = ALL_CARDS.find((c) => c.id === cardId);
    if (!card) { setLevelingUp(false); return; }
    const cost = getXpForLevel(getCardLevel(cardId) + 1);
    if (points < cost) { setLevelupMsg(t("flashcards.levelup.notEnough")); setLevelingUp(false); return; }
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
          setLevelupMsg(t("flashcards.levelup.successWithBonus", { level: data.newLevel, exp: bonusXp }));
          if (onSpend) onSpend(cost - bonusXp, t("flashcards.levelup.upgrading"));
        } else {
          setLevelupMsg(t("flashcards.levelup.success", { level: data.newLevel }));
          if (onSpend) onSpend(cost, t("flashcards.levelup.upgrading"));
        }
        await fetchCardLevels();
        if (onRefresh) onRefresh();
      } else {
        setLevelupMsg(data.error || t("common.failed"));
      }
    } catch { setLevelupMsg(t("common.connectionError")); }
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
            <p className="truncate text-xs font-black text-white">{tCardName(card.name)}</p>
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
  const TABS: { id: Section; key: string; icon: React.ReactNode }[] = [
    { id: "collection", key: "flashcards.tabs.collection", icon: <Layers size={13} /> },
    { id: "fusion",    key: "flashcards.tabs.fusion",    icon: <GitMerge size={13} /> },
    { id: "levelup",   key: "flashcards.tabs.levelup",   icon: <ArrowUp size={13} /> },
    { id: "practice",  key: "flashcards.tabs.practice",  icon: <Brain size={13} /> },
    { id: "gacha",     key: "flashcards.tabs.gacha",     icon: <Sparkles size={13} /> },
    { id: "battle",    key: "flashcards.tabs.battle",    icon: <Swords size={13} /> },
    { id: "roguelike",  key: "flashcards.tabs.roguelike", icon: <Skull size={13} /> },
    { id: "shards",    key: "flashcards.tabs.shards",    icon: <Cpu size={13} /> },
  ];

  // ─── Shard Shop ────────────────────────────────────────────────────
  const SHARD_SHOP_ITEMS: Array<{
    id: string; name: string; desc: string; type: string;
    cost: number; elementColor: string;
    elementId?: string; rarity?: string; cardId?: number; icon?: React.ReactNode;
  }> = [
    { id: "xp_50",  name: "Bùa EXP nhỏ",   desc: "+50 EXP cho thẻ bất kỳ", type: "EXP",    cost: 5,  elementColor: "#22c55e", icon: <Zap size={16} className="text-emerald-400" /> },
    { id: "xp_200", name: "Bùa EXP lớn",   desc: "+200 EXP cho thẻ bất kỳ", type: "EXP",    cost: 15, elementColor: "#3b82f6", icon: <Zap size={16} className="text-blue-400" /> },
    { id: "xp_1000",name: "Bùa EXP khổng lồ", desc: "+1000 EXP cho thẻ bất kỳ", type: "EXP", cost: 60, elementColor: "#a855f7", icon: <Zap size={16} className="text-purple-400" /> },
    { id: "shard_rare_1",   name: "Thẻ Hiếm: Nhựa",    desc: "Mua thẻ hiếm theo nguyên tố",   type: "Thẻ Hiếm", cost: 20, elementColor: "#06b6d4", elementId: "plastic", rarity: "rare", cardId: 11   },
    { id: "shard_rare_2",   name: "Thẻ Hiếm: Hữu Cơ",  desc: "Mua thẻ hiếm theo nguyên tố",   type: "Thẻ Hiếm", cost: 20, elementColor: "#22c55e", elementId: "organic", rarity: "rare", cardId: 151 },
    { id: "shard_epic_1",   name: "Thẻ Siêu Hiếm: Nguy Hại", desc: "Mua thẻ siêu hiếm theo nguyên tố", type: "Thẻ Siêu Hiếm", cost: 50, elementColor: "#ef4444", elementId: "hazard", rarity: "epic", cardId: 201 },
    { id: "shard_epic_2",   name: "Thẻ Siêu Hiếm: Kim Loại", desc: "Mua thẻ siêu hiếm theo nguyên tố", type: "Thẻ Siêu Hiếm", cost: 50, elementColor: "#64748b", elementId: "metal", rarity: "epic", cardId: 251 },
    { id: "shard_legendary", name: "Thẻ Huyền Thoại",     desc: "Mua thẻ huyền thoại cực hiếm",   type: "Thẻ Huyền Thoại", cost: 120, elementColor: "#f59e0b", elementId: "hazard", rarity: "legendary", cardId: 301 },
  ];

  const duplicateCount = (() => {
    const counts = progress?.flashcardCounts || {};
    let total = 0;
    Object.entries(counts).forEach(([id, count]) => {
      if (Number(count) > 1) total += Number(count) - 1;
    });
    return total;
  })();

  const handleShardPurchase = async (item: typeof SHARD_SHOP_ITEMS[0]) => {
    setShardMsg(null);
    try {
      const res = await fetch("/api/shards/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ nickname: userId, itemId: item.id }),
      });
      const data = await res.json();
      if (data.success) {
        setShardCount(data.shardsRemaining ?? 0);
        if (data.xpAwarded) {
          setShardMsg(t("flashcards.xpAdded", { exp: data.xpAwarded }));
        } else if (data.card) {
          const id = Number(data.card.id);
          setUnlockedCards((prev) => prev.includes(id) ? prev : [...prev, id]);
          setShardMsg(data.isNew ? t("flashcards.newCardAdded") : t("flashcards.cardAdded"));
        }
        if (onRefresh) onRefresh(data.progress);
      } else {
        setShardMsg(data.error || t("flashcards.purchaseFailed"));
      }
    } catch { setShardMsg(t("common.connectionError")); }
    setTimeout(() => setShardMsg(null), 3500);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-sm max-h-full">

      {/* ─── Header ─── */}
      <div className="flex-shrink-0 border-b border-slate-700 bg-slate-900 px-3 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
            <Badge tone="accent">{t("flashcards.cards")}</Badge>
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
          >{t("flashcards.categories.all")}</button>
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
              placeholder={t("flashcards.searchPlaceholder") || "Tìm thẻ theo tên..."}
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

        {/* Collection Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: t('collection.totalCards') || 'Total Cards', value: '420', color: 'text-white' },
            { label: t('collection.uniqueCards') || 'Unique Cards', value: String(unlockedCards.length), color: 'text-emerald-400' },
            { label: t('collection.shinyCards') || 'Shiny Cards', value: String(unlockedCards.filter((id: number) => {
              const card = ALL_CARDS.find((c) => c.id === id);
              return card && card.rarity.id === 'legendary';
            }).length), color: 'text-amber-400' },
            { label: t('campaign.totalStars') || 'Total Stars', value: String(progress?.totalStars || 0), color: 'text-blue-400' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl bg-white/5 p-3 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-white/50 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Collection progress map */}
        <div className="mt-2 p-3 rounded-2xl bg-black/60 border border-slate-700">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("flashcards.collection.title")}</span>
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
        {dailyChallenge && activeChallengeInfo && (() => {
          const challengeCard = ALL_CARDS.find((c) => c.id === dailyChallenge.cardId);
          if (!challengeCard) return null;
          const elemColor2 = ELEM_COLOR[challengeCard.element.id] || "#94a3b8";
          return (
            <div className="mt-2 rounded-xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-950/80 to-orange-950/80 overflow-hidden"
              style={{ boxShadow: "0 0 20px rgba(245,158,11,0.15)" }}>
              {/* Top bar */}
              <div className="flex items-center gap-2 px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/80 shadow">
                    <Sparkle size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-400 leading-none">Thử thách ngày</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-sm">{activeChallengeInfo.icon}</span>
                      <p className="text-[10px] sm:text-[11px] font-black text-amber-300 leading-none">{activeChallengeInfo.label}</p>
                    </div>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="relative flex-shrink-0" style={{ width: 36, height: 48 }}>
                    {getCardArt(challengeCard.id, challengeCard.element.id, challengeCard.artVariant || 1, challengeCard.rarity.id)}
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold text-white/60">Thẻ nền</p>
                    <p className="text-[10px] font-black text-white leading-tight">{tCardName(challengeCard.name)}</p>
                  </div>
                </div>
              </div>
              {/* Challenge detail + reward row */}
              <div className="flex items-center justify-between gap-2 border-t border-amber-500/20 bg-black/20 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Trophy size={10} className="text-amber-400 flex-shrink-0" />
                  <p className="text-[9px] sm:text-[10px] text-amber-400/80 truncate">{activeChallengeInfo.desc}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star size={9} className="fill-amber-400 text-amber-400" />
                  <span className="text-[10px] sm:text-[11px] font-black text-amber-400">+{dailyChallenge.reward} EXP</span>
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
              <span>{t(tab.key)}</span>
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
                  {t("flashcards.categories.all")}
                </button>
                {RARITY_ORDER.map((rid) => (
                  <button key={rid} onClick={() => setFilterRarity(rid)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                      filterRarity === rid ? "text-white" : "text-slate-400 bg-slate-800 border-slate-700 hover:bg-slate-700"
                    }`}
                    style={filterRarity === rid ? { backgroundColor: RARITY[rid].accent, borderColor: RARITY[rid].accent } : {}}>
                    {RarityStars && <RarityStars rarityId={rid} size={8} />} {t(getRarityKey(rid))}
                  </button>
                ))}
                <button onClick={() => setShowLocked(!showLocked)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${showLocked ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"}`}>
                  <Lock size={10} className="inline mr-1" />
                  {showLocked ? t("flashcards.hideLocked") : t("flashcards.showLocked")}
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
                  {t("flashcards.categories.all")}
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
              <EmptyState icon={<Layers size={40} className="text-slate-600" />} title={t("flashcards.noCards")} subtitle={t("flashcards.tryChangingFilter")} />
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
                    <p className="text-2xl font-black text-white">{tCardName(fuseAnimCard.card.name)}</p>
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
                        <p className="mt-1 text-[11px] sm:text-xs font-black text-white leading-tight">{card.name}</p>

                        {/* Ability */}
                        {ability && (
                          <p className="text-[10px] text-slate-400">{ability.icon} {ability.name}</p>
                        )}

                        {/* Power */}
                        <PowerBadge power={power} />

                        {/* XP reward */}
                        <div className="mt-1 flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-amber-400">
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
                      <p className="mt-1 text-[11px] sm:text-xs font-black text-white leading-tight">{card.name}</p>

                      {/* Ability */}
                      {ability && (
                        <p className="text-[10px] text-slate-400">{ability.icon} {ability.name}</p>
                      )}

                      {/* Power */}
                      <PowerBadge power={power} />

                      {isMax ? (
                        <div className="mt-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-amber-400">
                          Cấp tối đa
                        </div>
                      ) : (
                        <>
                          {/* Before/After stat comparison */}
                          <div className="mt-1 flex w-full flex-col gap-0.5 px-1">
                            {/* ATK */}
                            <div className="flex justify-between text-[9px]">
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
                            <div className="flex justify-between text-[9px]">
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
                          <div className={`mt-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-bold ${hasXp ? "text-amber-400 bg-amber-500/15 border border-amber-500/30" : "text-red-400 bg-red-500/15 border border-red-500/30"}`}>
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

        {/* PRACTICE / ZEN MODE */}
        {activeSection === "practice" && (
          <div className="flex flex-col items-center gap-6 p-4">
            {practiceCards.length === 0 ? (
              /* ── Start screen ── */
              <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="relative"
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-indigo-500/50 bg-gradient-to-br from-indigo-950 to-purple-950 shadow-2xl"
                    style={{ boxShadow: "0 0 30px rgba(99,102,241,0.3)" }}>
                    <Brain size={44} className="text-indigo-400" />
                  </div>
                  <div className="absolute -right-2 -top-2 z-10 rounded-full bg-indigo-500 px-2 py-1 text-[10px] font-black text-white shadow">
                    Zen
                  </div>
                </motion.div>

                <div>
                  <h3 className="text-2xl font-black text-white">Chế Độ Luyện Tập</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Không có giới hạn thời gian. Lật thẻ để ghi nhớ. Lật nhanh dưới 2 giây để nhận nhãn "Nhanh!".
                  </p>
                </div>

                <div className="grid w-full grid-cols-3 gap-3 rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                  <div className="flex flex-col items-center gap-1">
                    <Coffee size={18} className="text-indigo-400" />
                    <p className="text-xs font-bold text-slate-300">Thư giãn</p>
                    <p className="text-[10px] text-slate-500">Không đếm ngược</p>
                  </div>
                  <div className="flex flex-col items-center gap-1 border-x border-slate-700">
                    <Zap size={18} className="text-amber-400" />
                    <p className="text-xs font-bold text-slate-300">Nhanh!</p>
                    <p className="text-[10px] text-slate-500">Lật dưới 2s</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Timer size={18} className="text-emerald-400" />
                    <p className="text-xs font-bold text-slate-300">Kỷ lục</p>
                    <p className="text-[10px] text-slate-500">Lưu thời gian</p>
                  </div>
                </div>

                {unlockedCards.length > 0 ? (
                  <div className="w-full space-y-3">
                    <p className="text-xs text-slate-500">{unlockedCards.length} thẻ đã mở khóa</p>
                    <Button
                      onClick={startPractice}
                      size="lg"
                      className="w-full font-bold py-3"
                      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                    >
                      <Brain size={16} />
                      Bắt đầu luyện tập
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-400">
                    Mở khóa thẻ bài để bắt đầu luyện tập.
                  </p>
                )}
              </div>
            ) : (
              /* ── Active practice ── */
              <div className="flex w-full flex-col items-center gap-4">
                {/* Progress bar */}
                <div className="flex w-full max-w-sm items-center justify-between text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1">
                    <Brain size={12} className="text-indigo-400" />
                    {practiceIndex + 1} / {practiceCards.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity size={12} className="text-indigo-400" />
                    {practiceCount} lần lật
                  </span>
                </div>
                <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    animate={{ width: `${((practiceIndex + 1) / practiceCards.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Card */}
                {practiceCards[practiceIndex] && (() => {
                  const card = practiceCards[practiceIndex];
                  const level = getCardLevel(card.id);
                  const rs = RARITY[card.rarity.id] || RARITY.common;
                  const elemColor = ELEM_COLOR[card.element.id] || "#94a3b8";
                  const ability = getCardAbility(card);
                  const power = calcPower(card, level);
                  const currentBest = bestTimes[card.id];

                  return (
                    <div className="flex w-full max-w-sm flex-col items-center gap-3">
                      {/* Speed label */}
                      <AnimatePresence>
                        {practiceSpeedLabel && (
                          <motion.div
                            key="speed"
                            initial={{ opacity: 0, y: -10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.8 }}
                            className="flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-950/80 px-4 py-1.5 text-xs font-black text-amber-400 shadow"
                            style={{ boxShadow: "0 0 20px rgba(245,158,11,0.3)" }}
                          >
                            <Zap size={12} />
                            {practiceSpeedLabel}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Card flip */}
                      <div
                        className="relative w-full cursor-pointer"
                        style={{ perspective: "800px", aspectRatio: "2/3" }}
                        onClick={handleFlipCard}
                      >
                        <motion.div
                          animate={{ rotateY: practiceFlipped ? 180 : 0 }}
                          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                          className="absolute inset-0 w-full overflow-hidden rounded-2xl border-2"
                          style={{
                            background: practiceFlipped
                              ? `linear-gradient(180deg, ${rs.bgDark} 0%, ${rs.bgDark}BB 60%, ${elemColor}15 100%)`
                              : `linear-gradient(180deg, #1e293b 0%, #1e293bBB 60%, ${elemColor}15 100%)`,
                            borderColor: practiceFlipped ? rs.accent + "CC" : elemColor + "80",
                            boxShadow: `0 4px 24px ${practiceFlipped ? rs.accent + "30" : elemColor + "30"}, 0 1px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
                          }}
                        >
                          {!practiceFlipped ? (
                            /* Front — hint */
                            <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
                              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-600 bg-slate-800">
                                <CardAvatar elementId={card.element.id} size={52} />
                              </div>
                              <p className="text-center text-sm font-bold text-slate-400">
                                Nhấn để lật thẻ
                              </p>
                              {currentBest && (
                                <p className="text-xs text-emerald-400/70">
                                  Kỷ lục: {currentBest}ms
                                </p>
                              )}
                            </div>
                          ) : (
                            /* Back — full card info */
                            <div className="flex h-full flex-col p-4">
                              {/* Element bar */}
                              <div className="h-1.5 w-full rounded-full"
                                style={{ background: `linear-gradient(90deg, ${elemColor}, ${rs.accent})` }} />
                              <div className="mt-3 flex items-start justify-between">
                                <div>
                                  <p className="text-base font-black text-white leading-tight">{card.name}</p>
                                  <p className="mt-0.5 text-[10px] font-bold capitalize text-slate-400">{card.element.name}</p>
                                </div>
                                <RarityStars rarityId={card.rarity.id} size={9} />
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                <CardAvatar elementId={card.element.id} size={52} />
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400">Tấn công</span>
                                    <span className="text-xs font-black text-red-400">{card.attack}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400">HP</span>
                                    <span className="text-xs font-black text-emerald-400">{card.hp}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400">Power</span>
                                    <PowerBadge power={power} />
                                  </div>
                                </div>
                              </div>
                              {ability && (
                                <div className="mt-3 flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-2">
                                  <span className="text-sm">{ability.icon}</span>
                                  <div>
                                    <p className="text-[10px] font-black text-indigo-300">{ability.name}</p>
                                    <p className="text-[9px] text-slate-400">{ability.desc}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex w-full max-w-sm items-center justify-between">
                        <span className="text-[10px] text-slate-500">
                          Tap to flip
                        </span>
                        {practiceFlipped && (
                          <Button
                            onClick={handleNextCard}
                            size="sm"
                            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                          >
                            {practiceIndex + 1 < practiceCards.length ? (
                              <>
                                <ChevronRight size={14} />
                                Tiếp theo
                              </>
                            ) : (
                              <>
                                <Check size={14} />
                                Xong
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Session counter */}
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Activity size={10} />
                        Lần luyện tập #{practiceSessionCount + 1}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* GACHA */}
        {activeSection === "gacha" && (
          <div className="flex flex-col items-center gap-5 p-4 text-center">
            {/* Pull counter badge */}
            <AnimatePresence>
              {showPullCount && (
                <motion.div
                  key="pullcnt"
                  initial={{ opacity: 0, scale: 0.5, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: -10 }}
                  className="absolute left-1/2 top-4 -translate-x-1/2 z-30 rounded-full border-2 border-amber-400/60 bg-amber-950/90 px-4 py-1.5 text-sm font-black text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                >
                  Lần #{pullCount}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pity progress */}
            <div className="w-full max-w-xs space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-purple-400">{t("flashcards.pity.epic", { n: PITY_EPIC - (pullCount % PITY_EPIC) })}</span>
                <span className="text-slate-500">{pullCount % PITY_EPIC}/{PITY_EPIC}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  animate={{ width: `${((pullCount % PITY_EPIC) / PITY_EPIC) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-amber-400">{t("flashcards.pity.legendary", { n: PITY_LEGENDARY - (pullCount % PITY_LEGENDARY) })}</span>
                <span className="text-slate-500">{pullCount % PITY_LEGENDARY}/{PITY_LEGENDARY}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                  animate={{ width: `${((pullCount % PITY_LEGENDARY) / PITY_LEGENDARY) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

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
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-1 sm:gap-2">
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
                      <p className="mt-1 line-clamp-1 text-center text-[8px] font-bold text-white leading-tight">{tCardName(card.name)}</p>
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

        {/* ROGUELIKE */}
        {activeSection === "roguelike" && (
          <div className="flex flex-col items-center gap-5 p-4">
            <div className="w-full max-w-sm text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl ring-2 ring-amber-400/50"
              >
                <span className="text-4xl">🏰</span>
              </motion.div>
              <div>
                <h3 className="mb-1 text-xl font-black text-white">Chế Độ Sinh Tồn</h3>
                <p className="text-sm text-slate-400">Đấu boss liên tiếp — build deck mạnh dần</p>
              </div>
            </div>

            {/* Rules */}
            <div className="w-full max-w-sm space-y-2 rounded-2xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-400">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-[9px] font-black text-amber-400">1</div>
                <span>Bắt đầu với <strong className="text-white">5 thẻ cơ bản</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-[9px] font-black text-amber-400">2</div>
                <span>Đánh bại <strong className="text-white">3 boss</strong> để hoàn thành lượt chơi</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-[9px] font-black text-amber-400">3</div>
                <span>Chọn <strong className="text-white">thẻ mới</strong> hoặc <strong className="text-white">nâng cấp</strong> sau mỗi chiến thắng</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-[9px] font-black text-amber-400">4</div>
                <span>Nhận <strong className="text-amber-400">thưởng EXP</strong> tùy số boss đánh bại</span>
              </div>
            </div>

            <Button
              onClick={() => setShowRoguelike(true)}
              size="lg"
              className="w-full max-w-sm font-black text-sm py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 hover:from-amber-700 hover:via-orange-600 hover:to-amber-700 text-white shadow-xl"
            >
              <Skull size={18} className="mr-2" />
              Bắt đầu lượt chơi
            </Button>
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
          <GachaReveal result={gachaResult} onClose={() => setGachaResult(null)} pullCount={pullCount} />
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

      {/* ─── Roguelike Run Modal ─── */}
      <AnimatePresence>
        {showRoguelike && (
          <RoguelikeRun
            onClose={() => setShowRoguelike(false)}
            onReward={(xp) => onReward(xp)}
            userCards={unlockedCards}
          />
        )}
      </AnimatePresence>

      {/* ─── Shard Shop ─── */}
      <AnimatePresence>
        {activeSection === "shards" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">{t("flashcards.shop.title")}</h3>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Đổi bản sao thừa lấy mảnh ghép</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-purple-500/20 border border-purple-500/40 px-3 py-1.5">
                <Cpu size={14} className="text-purple-400" />
                <span className="text-sm font-black text-purple-300">{shardCount}</span>
                <span className="text-[10px] text-purple-500">mảnh</span>
              </div>
            </div>

            {/* Shard message */}
            {shardMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-2.5 text-center"
              >
                <p className="text-[11px] sm:text-xs font-black text-emerald-400">{shardMsg}</p>
              </motion.div>
            )}

            {/* Info banner */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-[10px] sm:text-xs text-slate-400 leading-relaxed">
                  <p>{t("flashcards.shop.duplicateHint")}</p>
                  <p className="mt-1">{t("flashcards.shop.upgradeHint")}</p>
                </div>
              </div>
            </div>

            {/* Shop items */}
            <div className="space-y-2">
              {SHARD_SHOP_ITEMS.map((item) => {
                const canAfford = shardCount >= item.cost;
                return (
                  <motion.div
                    key={item.id}
                    whileHover={canAfford ? { scale: 1.01 } : {}}
                    whileTap={canAfford ? { scale: 0.99 } : {}}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                      canAfford
                        ? "border-slate-600 bg-slate-800/80 cursor-pointer hover:border-purple-500/50 hover:bg-slate-800"
                        : "border-slate-700/50 bg-slate-800/40 opacity-60 cursor-not-allowed"
                    }`}
                    onClick={() => canAfford && handleShardPurchase(item)}
                  >
                    {/* Item art */}
                    <div className="relative flex-shrink-0 w-12 h-16 rounded-lg overflow-hidden border-2"
                      style={{ borderColor: item.elementColor + "80", background: `linear-gradient(145deg, ${item.elementColor}20, ${item.elementColor}08)` }}>
                      {item.cardId ? (
                        getCardArt(item.cardId, item.elementId, 1, item.rarity)
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          {item.icon}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] sm:text-xs font-black text-white truncate">{item.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[9px] font-bold" style={{ color: item.elementColor }}>{item.type}</span>
                        {item.rarity && <RarityStars rarityId={item.rarity} size={7} />}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-black ${canAfford ? "bg-purple-500/30 text-purple-300" : "bg-slate-700 text-slate-500"}`}>
                        <Cpu size={9} />
                        {item.cost}
                      </div>
                      {canAfford ? (
                        <span className="text-[9px] text-emerald-400 font-bold">{t("common.buy")}</span>
                      ) : (
                        <span className="text-[9px] text-slate-600 font-bold">{t("flashcards.shard.notEnough")}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Duplicate count info */}
            {duplicateCount > 0 && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-center">
                <p className="text-[10px] sm:text-xs text-purple-400">
                  Bạn có <span className="font-black text-purple-300">{duplicateCount}</span> bản sao thẻ có thể chuyển đổi
                </p>
                <p className="text-[9px] text-purple-500/60 mt-0.5">{t("flashcards.shop.hint")}</p>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
