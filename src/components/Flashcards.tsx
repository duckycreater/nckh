import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Layers, Lock, Swords, X, Wand2,
  ArrowUp, GitMerge, Zap, Trophy, Star, Shield,
  Heart, Target, Wind, Crosshair, Brain, Flame,
  ChevronDown, Info, ZapOff, Plus, Check, RefreshCw,
  Activity, Award, Cpu, Skull, Eye
} from "lucide-react";
import { UserProgress } from "../types";
import { ALL_CARDS, RARITIES, getElementIcon, ELEMENTS, calcPower, getXpForLevel, getFusedXp, getCardAbility, getCardById, getCardArt } from "../lib/cards";
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

// ─── Rarity tokens ───────────────────────────────────────────────────────────
const RARITY: Record<string, {
  name: string;
  bg: string;
  bgDark: string;
  border: string;
  borderGlow: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  glow: string;
  cardGradient: string;
  shimmer: boolean;
  starCount: number;
}> = {
  common: {
    name: "Phổ thông", bg: "from-slate-100 to-slate-200", bgDark: "from-slate-800 to-slate-900",
    border: "border-slate-400", borderGlow: "#94a3b8",
    accent: "#64748b", badgeBg: "bg-slate-200", badgeText: "text-slate-600",
    glow: "shadow-slate-400/20", cardGradient: "from-slate-50 to-slate-100",
    shimmer: false, starCount: 1,
  },
  rare: {
    name: "Hiếm", bg: "from-blue-100 to-indigo-200", bgDark: "from-blue-900 to-indigo-900",
    border: "border-blue-400", borderGlow: "#3b82f6",
    accent: "#2563eb", badgeBg: "bg-blue-100", badgeText: "text-blue-700",
    glow: "shadow-blue-500/30", cardGradient: "from-blue-50 to-indigo-100",
    shimmer: false, starCount: 2,
  },
  epic: {
    name: "Siêu hiếm", bg: "from-purple-100 to-pink-200", bgDark: "from-purple-900 to-pink-900",
    border: "border-purple-400", borderGlow: "#a855f7",
    accent: "#9333ea", badgeBg: "bg-purple-100", badgeText: "text-purple-700",
    glow: "shadow-purple-500/40", cardGradient: "from-purple-50 to-pink-100",
    shimmer: true, starCount: 3,
  },
  legendary: {
    name: "Huyền thoại", bg: "from-amber-100 to-orange-200", bgDark: "from-amber-900 to-orange-900",
    border: "border-amber-400", borderGlow: "#f59e0b",
    accent: "#d97706", badgeBg: "bg-amber-100", badgeText: "text-amber-700",
    glow: "shadow-amber-500/50", cardGradient: "from-amber-50 to-orange-100",
    shimmer: true, starCount: 4,
  },
};
const RARITY_ORDER = ["legendary", "epic", "rare", "common"];

// ─── Stat icons + configs ──────────────────────────────────────────────────────
const STAT_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; max: number; unit: string }> = {
  atk: { icon: <Crosshair size={10} />, label: "ATK", color: "#ef4444", max: 100, unit: "" },
  hp:  { icon: <Heart size={10} />, label: "HP", color: "#22c55e", max: 200, unit: "" },
  def: { icon: <Shield size={10} />, label: "DEF", color: "#3b82f6", max: 50, unit: "%" },
  spd: { icon: <Wind size={10} />, label: "SPD", color: "#06b6d4", max: 100, unit: "" },
  crt: { icon: <Target size={10} />, label: "CRT", color: "#f59e0b", max: 30, unit: "%" },
  int: { icon: <Brain size={10} />, label: "INT", color: "#a855f7", max: 30, unit: "" },
};

// ─── Stat bar (animated) ───────────────────────────────────────────────────────
function StatBar({ stat, value, max, color, delay = 0 }: { stat: string; value: number; max: number; color: string; delay?: number }) {
  const cfg = STAT_CONFIG[stat];
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 flex items-center justify-center text-slate-400 flex-shrink-0">{cfg?.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{cfg?.label}</span>
          <span className="text-[10px] font-black tabular-nums" style={{ color }}>{value}{cfg?.unit}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: "easeOut", delay }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Element art (legacy helper, kept for compatibility) ─────────────────────
function ElementArt({ elementId, size = 48 }: { elementId: string; size?: number }) {
  return getElementIcon(elementId, size);
}

// ─── Ability badge ───────────────────────────────────────────────────────────
function AbilityBadge({ card, size = "sm" }: { card: any; size?: "sm" | "lg" }) {
  const ability = getCardAbility(card);
  if (!ability) return null;
  const typeColor = ability.type === "ultimate" ? "#f59e0b" : ability.type === "active" ? "#3b82f6" : "#64748b";
  const cls = size === "lg" ? "text-[9px] px-2.5 py-1 gap-1.5" : "text-[7px] px-1.5 py-0.5 gap-1";
  return (
    <div className={`flex items-center rounded-full font-bold text-white ${cls}`}
      style={{ backgroundColor: typeColor + "cc", border: `1px solid ${typeColor}80` }}>
      <span>{ability.icon}</span>
      <span>{ability.name}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: ability.power }).map((_, i) => (
          <Star key={i} size={size === "lg" ? 7 : 5} className="fill-amber-400 text-amber-400" />
        ))}
      </div>
    </div>
  );
}

// ─── Rarity stars row ─────────────────────────────────────────────────────────
function RarityStars({ rarityId, size = 10 }: { rarityId: string; size?: number }) {
  const rs = RARITY[rarityId] || RARITY.common;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: rs.starCount }).map((_, i) => (
        <Star key={i} size={size} className={`${rarityId === "legendary" ? "fill-amber-400 text-amber-400" : rarityId === "epic" ? "fill-purple-400 text-purple-400" : rarityId === "rare" ? "fill-blue-400 text-blue-400" : "fill-slate-400 text-slate-400"}`} />
      ))}
    </div>
  );
}

// ─── Level stars row ──────────────────────────────────────────────────────────
function LevelStars({ level, size = 8 }: { level: number; size?: number }) {
  if (level <= 1) return null;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
        <Star key={i} size={size} className="fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

// ─── Power badge ─────────────────────────────────────────────────────────────
function PowerBadge({ power, size = "sm" }: { power: number; size?: "sm" | "lg" }) {
  return (
    <div className={`flex items-center gap-1 rounded-full bg-slate-800 font-black text-white ${size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[9px]"}`}>
      <Zap size={size === "lg" ? 12 : 8} className="text-amber-400" />
      {power.toLocaleString()} PWR
    </div>
  );
}

// ─── Card Tile (grid item with full-bleed art) ─────────────────────────────────
function CardTile({ card, level = 1, count = 1, selected = false, locked = false, onClick }: {
  card: any; level?: number; count?: number; selected?: boolean; locked?: boolean; onClick?: () => void;
}) {
  const rs = RARITY[card.rarity.id] || RARITY.common;
  const ability = getCardAbility(card);
  const artEl = getCardArt(card.id, card.element.id, card.artVariant ?? 0, card.rarity.id);

  if (locked) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={onClick}
        className="relative w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-700 text-left"
        style={{ aspectRatio: "3/4" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
        {/* Dark silhouette art */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <div className="h-full w-full">{artEl}</div>
        </div>
        {/* Lock icon */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="rounded-full bg-slate-800/80 p-3">
            <Lock size={16} className="text-slate-500" />
          </div>
          <div className="rounded-full border border-slate-700 px-2 py-0.5">
            <span className="text-[7px] font-bold uppercase tracking-widest text-slate-600">?</span>
          </div>
        </div>
        {/* Rarity hint */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
          <div className="rounded-full border border-slate-700 px-1.5 py-0.5">
            <span className="text-[6px] font-bold uppercase tracking-wider text-slate-600">{rs.name}</span>
          </div>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ y: -6, scale: 1.05, zIndex: 10 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`
        relative w-full cursor-pointer overflow-hidden rounded-2xl border-2 text-left
        transition-all duration-200
        ${rs.border} ${selected ? `ring-2 ring-amber-400 ring-offset-1 ${rs.glow}` : rs.glow}
      `}
      style={{ aspectRatio: "3/4" }}
    >
      {/* Full-bleed card art */}
      <div className="absolute inset-0">
        {artEl}
      </div>

      {/* Top rarity stripe */}
      <div className="absolute inset-x-0 top-0 z-10 h-1.5 rounded-t-[14px]"
        style={{ background: `linear-gradient(to right, ${rs.borderGlow}30, ${rs.accent}, ${rs.borderGlow}30)` }} />

      {/* Bottom overlay with name/stats */}
      <div className="absolute inset-x-0 bottom-0 z-10 rounded-b-[14px] bg-gradient-to-t from-black/95 via-black/80 to-black/30 p-1.5 pt-5">
        {/* Rarity + count row */}
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1">
            <RarityStars rarityId={card.rarity.id} size={6} />
            <span className="rounded-full border px-1 py-0.5 text-[5px] font-black uppercase tracking-wider"
              style={{ backgroundColor: rs.accent + "25", color: rs.accent, borderColor: rs.accent + "60" }}>
              {rs.name}
            </span>
          </div>
          {count > 1 && (
            <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[6px] font-black text-white shadow">
              x{count}
            </span>
          )}
        </div>

        {/* Level */}
        {level > 1 && (
          <div className="mb-0.5 flex items-center gap-0.5">
            <LevelStars level={level} size={6} />
          </div>
        )}

        {/* Card name */}
        <p className="line-clamp-2 text-center text-[6px] font-black leading-tight text-white drop-shadow-lg">
          {card.name}
        </p>
        {card.subtitle && (
          <p className="line-clamp-1 text-center text-[5px] text-white/50">{card.subtitle}</p>
        )}

        {/* Ability */}
        {ability && (
          <div className="mt-0.5 flex items-center justify-center">
            <div className="flex items-center gap-0.5 rounded-full bg-black/40 px-1.5 py-0.5">
              <span className="text-[6px]">{ability.icon}</span>
              <span className="text-[5px] font-bold text-white/70">{ability.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Shimmer for epic+ */}
      {rs.shimmer && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            style={{ width: "25%", transform: "skewX(-15deg)" }}
          />
        </div>
      )}

      {/* Selected ring */}
      {selected && (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-2xl ring-4 ring-amber-400 ring-offset-1" />
      )}

      {/* Hover ability popup */}
      {ability && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 pb-8">
          <div className="mx-2 rounded-xl border border-white/20 bg-black/85 px-2 py-1.5 backdrop-blur-sm">
            <p className="text-[7px] font-bold text-white">{ability.icon} {ability.name}</p>
            <p className="text-[6px] leading-relaxed text-slate-300">{ability.desc}</p>
          </div>
        </div>
      )}
    </motion.button>
  );
}

// ─── Card Detail View (full modal) ──────────────────────────────────────────────
function CardDetail({ card, level = 1, count = 1, onClose, onAddDeck }: {
  card: any; level: number; count: number; onClose: () => void; onAddDeck?: () => void;
}) {
  const rs = RARITY[card.rarity.id] || RARITY.common;
  const ability = getCardAbility(card);
  const power = calcPower(card, level);
  const artEl = getCardArt(card.id, card.element.id, card.artVariant ?? 0, card.rarity.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4 p-5"
    >
      {/* Header with close */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <RarityStars rarityId={card.rarity.id} size={12} />
            <span className="rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
              style={{ backgroundColor: rs.accent + "20", color: rs.accent, borderColor: rs.accent + "50" }}>
              {rs.name}
            </span>
            <LevelStars level={level} size={10} />
          </div>
          <h3 className="mt-1.5 text-xl font-black text-slate-900">{card.name}</h3>
          {card.subtitle && (
            <p className="text-sm text-slate-500">{card.subtitle}</p>
          )}
        </div>
        <button onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Full card art (tall display) */}
      <div className="relative mx-auto w-full overflow-hidden rounded-2xl border-2 p-1"
        style={{ borderColor: rs.borderGlow, boxShadow: `0 0 24px ${rs.borderGlow}30` }}>
        {/* Background gradient based on element */}
        <div className={`absolute inset-0 bg-gradient-to-br ${card.element.gradient ?? "from-slate-100 to-slate-200"} opacity-30`} />
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl">
          {artEl}
        </div>
        {/* Rarity shimmer */}
        {rs.shimmer && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{ width: "25%", transform: "skewX(-15deg)" }}
            />
          </div>
        )}
      </div>

      {/* Power + level */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center gap-2">
          <ElementArt elementId={card.element.id} size={18} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hệ</p>
            <p className="text-sm font-black text-slate-800">{card.element.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cấp</p>
          <p className="text-lg font-black text-slate-800">Lv.{level}</p>
        </div>
        <PowerBadge power={power} size="lg" />
      </div>

      {/* All 6 Stats */}
      <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Chỉ số</h4>
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5">
            <Zap size={9} className="text-amber-500" />
            <span className="text-[10px] font-black text-amber-600">{power}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {(["atk", "hp", "def", "spd", "crt", "int"] as const).map((stat, i) => (
            <StatBar key={stat} stat={stat} value={card[stat]} max={STAT_CONFIG[stat].max} color={STAT_CONFIG[stat].color} delay={i * 0.08} />
          ))}
        </div>
      </div>

      {/* Ability section */}
      {ability && (
        <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Chiêu thức</h4>
            <div className={`rounded-full px-2.5 py-0.5 text-[8px] font-black text-white ${
              ability.type === "ultimate" ? "bg-amber-500" : ability.type === "active" ? "bg-blue-500" : "bg-slate-500"
            }`}>
              {ability.type === "ultimate" ? "Tuyệt chiêu" : ability.type === "active" ? "Chủ động" : "Bị động"}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
              style={{ backgroundColor: rs.accent + "15", border: `1px solid ${rs.accent}30` }}>
              {ability.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-base font-black text-slate-800">{ability.name}</p>
                <div className="flex gap-0.5">
                  {Array.from({ length: ability.power }).map((_, i) => (
                    <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{ability.desc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500">
        <span>Sở hữu x{count}</span>
        <div className="flex items-center gap-1">
          <ElementArt elementId={card.element.id} size={12} />
          <span>{card.element.name}</span>
        </div>
      </div>

      {/* Actions */}
      {onAddDeck && (
        <Button onClick={onAddDeck} className="w-full text-sm font-bold" size="lg">
          <Check size={14} />Vào đội hình
        </Button>
      )}
      <Button onClick={onClose} variant="ghost" className="w-full text-sm text-slate-400">
        Đóng
      </Button>
    </motion.div>
  );
}

// ─── Gacha Reveal (dramatic 3D flip) ───────────────────────────────────────────
function GachaReveal({ result, onClose }: { result: any; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFlipped(true), 600);
    return () => clearTimeout(timer);
  }, []);

  if (!result) return null;
  const rs = RARITY[result.rarity?.id] || RARITY.common;
  const ability = getCardAbility(result);
  const artEl = getCardArt(result.id, result.element?.id ?? "plastic", (result.artVariant ?? 0), result.rarity?.id ?? "common");

  const rarityLabel = result.rarity?.id === "legendary" ? "Huyền thoại"
    : result.rarity?.id === "epic" ? "Siêu hiếm"
    : result.rarity?.id === "rare" ? "Hiếm"
    : "Phổ thông";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Particle explosion */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 80 }).map((_, i) => {
          const colors = ["#f59e0b", "#a855f7", "#3b82f6", "#22c55e", "#ef4444", "#06b6d4"];
          const color = colors[i % colors.length];
          const angle = (i / 80) * 360;
          const distance = 100 + Math.random() * 200;
          const delay = Math.random() * 0.5;
          return (
            <motion.div
              key={i}
              initial={{ x: "50%", y: "50%", scale: 0, opacity: 1 }}
              animate={{
                x: `calc(50% + ${Math.cos(angle * Math.PI / 180) * distance}%)`,
                y: `calc(50% + ${Math.sin(angle * Math.PI / 180) * distance}%)`,
                scale: [0, 1.5, 0], opacity: [1, 1, 0],
              }}
              transition={{ duration: 2.5, delay, ease: "easeOut" }}
              className="absolute h-2.5 w-2.5 rounded-full"
              style={{ background: color, boxShadow: `0 0 8px ${color}` }}
            />
          );
        })}
      </div>

      <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {/* Rarity badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className={`mb-4 rounded-full px-8 py-3 text-sm font-black uppercase tracking-[0.3em] ${
            result.rarity?.id === "legendary" ? "bg-amber-500/20 text-amber-400 ring-2 ring-amber-400/60"
              : result.rarity?.id === "epic" ? "bg-purple-500/20 text-purple-400 ring-2 ring-purple-400/60"
              : result.rarity?.id === "rare" ? "bg-blue-500/20 text-blue-400 ring-2 ring-blue-400/60"
              : "bg-slate-500/20 text-slate-400 ring-2 ring-slate-400/60"
          }`}
          style={{ boxShadow: result.rarity?.id === "legendary" ? "0 0 40px #f59e0b40" : result.rarity?.id === "epic" ? "0 0 40px #a855f740" : undefined }}
        >
          {rarityLabel}!
        </motion.div>

        {/* 3D Flip Card */}
        <motion.div
          className="relative w-56"
          style={{ perspective: "1000px" }}
          initial={{ rotateY: 180 }}
          animate={{ rotateY: flipped ? 0 : 180 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
        >
          {/* Back (face-down) */}
          <div className="absolute inset-0 w-full rounded-3xl overflow-hidden"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <div className="h-full w-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={48} className="text-white/60 animate-pulse" />
            </div>
            {/* Decorative back pattern */}
            <div className="absolute inset-4 rounded-2xl border-2 border-white/20" />
            <div className="absolute inset-8 rounded-xl border border-white/10" />
          </div>

          {/* Front (face-up card) */}
          <div
            className={`w-full overflow-hidden rounded-3xl border-2 p-1 ${rs.border}`}
            style={{ backfaceVisibility: "hidden", boxShadow: `0 0 50px ${rs.borderGlow}60, 0 0 100px ${rs.borderGlow}20` }}
          >
            {/* Full-bleed art */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl">
              <div className="absolute inset-0">
                {artEl}
              </div>
              {/* Bottom info */}
              <div className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3">
                <div className="mb-1 flex items-center justify-between">
                  <RarityStars rarityId={result.rarity?.id ?? "common"} size={8} />
                </div>
                <p className="text-base font-black text-white drop-shadow-lg">{result.name}</p>
                {result.subtitle && (
                  <p className="text-[9px] text-white/60">{result.subtitle}</p>
                )}
                <p className="mt-0.5 text-xs font-bold text-white/50">Hệ {result.element?.name}</p>
                {/* Stats */}
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {(["atk", "hp", "def"] as const).map((stat) => (
                    <div key={stat} className="flex flex-col items-center rounded-lg bg-black/40 p-1">
                      <span className="text-[7px] font-bold text-white/50 uppercase">{STAT_CONFIG[stat].label}</span>
                      <span className="text-sm font-black" style={{ color: STAT_CONFIG[stat].color }}>
                        {result[stat]}
                      </span>
                    </div>
                  ))}
                </div>
                {ability && (
                  <div className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-black/40 p-2">
                    <span className="text-lg">{ability.icon}</span>
                    <div>
                      <p className="text-[9px] font-bold text-white">{ability.name}</p>
                      <p className="text-[7px] text-white/50">{ability.desc}</p>
                    </div>
                  </div>
                )}
              </div>
              {/* Shimmer */}
              {rs.shimmer && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{ width: "25%", transform: "skewX(-15deg)" }}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Status */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className={`mt-4 text-base font-black ${result.isNew ? "text-amber-400" : "text-slate-400"}`}
        >
          {result.isNew ? "Thẻ mới! Du nhập bộ sưu tập" : "Bạn đã có thẻ này"}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <Button onClick={onClose} size="lg" className="mt-2 font-bold px-8">
            {result.isNew ? "Thu thập" : "Đóng"}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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
  const [searchQuery, setSearchQuery] = useState("");

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
    const byId = getCardById(id);
    if (byId) return byId;
    const elData = ELEMENTS.find((e) => e.id === (raw as any).elementId || (raw as any).element?.id);
    const rData = RARITIES.find((r) => r.id === (raw as any).rarityId || (raw as any).rarity?.id);
    return {
      id,
      name: raw.name || "Thẻ Rác",
      subtitle: raw.subtitle || "",
      element: elData || { id: (raw as any).elementId, name: (raw as any).element?.name || "??", gradient: "" },
      rarity: rData || { id: (raw as any).rarityId, name: (raw as any).rarity?.name || "Phổ thông", starCount: 1 },
      hp: Number(raw.hp) || 0, atk: Number(raw.atk) || 0,
      def: Number(raw.def) || 0, spd: Number(raw.spd) || 0,
      crt: Number(raw.crt) || 0, int: Number(raw.int) || 0,
      artVariant: (raw as any).artVariant ?? 0,
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
    (filterElement === "all" || c.element.id === filterElement) &&
    (searchQuery === "" || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.subtitle && c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())))
  );
  if (!showLocked) displayCards = displayCards.filter((c) => unlockedCards.includes(c.id));
  displayCards = [...displayCards].sort((a, b) => {
    const la = getCardLevel(a.id), lb = getCardLevel(b.id);
    if (sortBy === "atk") return (b.atk * lb) - (a.atk * la);
    if (sortBy === "hp") return (b.hp * lb) - (a.hp * la);
    return calcPower(b, lb) - calcPower(a, la);
  });

  const deckCards = deck.map((id) => ALL_CARDS.find((c) => c.id === id)!).filter(Boolean);
  const deckPower = deckCards.reduce((sum, card) => sum + calcPower(card, getCardLevel(card.id)), 0);
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
      setFuseMsg(data.success ? `Hợp nhất! +${data.xpGained} EXP` : (data.error || "Thất bại."));
      if (data.success) { await refreshProgress(); fetchCardLevels(); }
    } catch { setFuseMsg("Lỗi kết nối."); }
    setFusing(false);
    setTimeout(() => setFuseMsg(null), 4000);
  };

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

  // ── Deck Card (compact slot) ──────────────────────────────────────────────
  function DeckSlot({ cardId, index }: { cardId: number; index: number }) {
    const card = ALL_CARDS.find((c) => c.id === cardId)!;
    if (!card) return null;
    const rs = RARITY[card.rarity.id] || RARITY.common;
    const artEl = getCardArt(card.id, card.element.id, card.artVariant ?? 0, card.rarity.id);
    const ability = getCardAbility(card);
    const power = calcPower(card, getCardLevel(card.id));
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`relative aspect-[3/4] overflow-hidden rounded-2xl border-2 ${rs.border} ${rs.glow}`}
      >
        <div className="absolute inset-0">{artEl}</div>
        {/* Bottom overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1.5 pt-5">
          <p className="line-clamp-1 text-center text-[6px] font-black text-white drop-shadow">{card.name}</p>
          {ability && (
            <p className="text-center text-[5px] text-white/50">{ability.icon} {ability.name}</p>
          )}
        </div>
        {/* Remove button */}
        <button
          onClick={() => setDeck((d) => d.filter((x) => x !== cardId))}
          className="absolute -right-1.5 -top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors"
        >
          <X size={10} />
        </button>
        {/* Slot number */}
        <div className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[7px] font-black text-white">{index + 1}</div>
        {/* Shimmer */}
        {rs.shimmer && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              style={{ width: "25%", transform: "skewX(-15deg)" }}
            />
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* ─── Header ─── */}
      <div className="flex-shrink-0 border-b border-slate-100 bg-white px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone="accent">Thẻ bài</Badge>
            <span className="text-sm text-slate-500">{collectedCount}/{totalCards}</span>
            {collectionPower > 0 && (
              <PowerBadge power={collectionPower} />
            )}
            {fuseableCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                <GitMerge size={10} />
                {fuseableCount} hợp nhất
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-widest text-slate-400">EXP</p>
              <p className="text-lg font-black leading-none text-indigo-600">{points}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm thẻ theo tên..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-1 overflow-x-auto thin-scrollbar">
          {([
            { id: "collection" as Section, label: "Bộ sưu tập", icon: <Layers size={13} /> },
            { id: "fusion" as Section, label: "Hợp nhất", icon: <GitMerge size={13} /> },
            { id: "levelup" as Section, label: "Lên cấp", icon: <ArrowUp size={13} /> },
            { id: "gacha" as Section, label: "Mở gói", icon: <Sparkles size={13} /> },
            { id: "battle" as Section, label: "Đấu trường", icon: <Swords size={13} /> },
          ]).map((tab) => (
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

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto thin-scrollbar">

        {/* COLLECTION */}
        {activeSection === "collection" && (
          <div className="space-y-3 p-3">
            {/* Filters */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button onClick={() => setFilterRarity("all")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${filterRarity === "all" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  Tất cả
                </button>
                {RARITY_ORDER.map((rid) => (
                  <button key={rid} onClick={() => setFilterRarity(rid)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                      filterRarity === rid ? `${RARITY[rid].badgeBg} ${RARITY[rid].badgeText} border-2` : "bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200"
                    }`}
                    style={filterRarity === rid ? { borderColor: RARITY[rid].borderGlow } : {}}
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
              {/* Element filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto thin-scrollbar pb-0.5">
                <button onClick={() => setFilterElement("all")}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${filterElement === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"}`}>
                  Tất cả hệ
                </button>
                {ELEMENTS.map((el) => (
                  <button key={el.id} onClick={() => setFilterElement(el.id)}
                    className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${filterElement === el.id ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"}`}>
                    <span className="text-xs">{getElementIcon(el.id, 10)}</span>
                    {el.name}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400">{displayCards.length} thẻ · {collectedCount} đã mở khóa</p>

            {displayCards.length === 0 ? (
              <EmptyState icon={<Layers size={40} className="text-slate-300" />}
                title="Không có thẻ" subtitle="Thử bộ lọc khác." />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                {displayCards.map((card) => {
                  const isLocked = !unlockedCards.includes(card.id);
                  return (
                    <CardTile
                      key={card.id}
                      card={card}
                      count={getCardCount(card.id)}
                      level={getCardLevel(card.id)}
                      locked={isLocked && showLocked}
                      onClick={() => !isLocked && setViewingCard(resolveCard(card))}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FUSION */}
        {activeSection === "fusion" && (
          <div className="space-y-3 p-3">
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
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {unlockedCards.filter((id) => getCardCount(id) >= 3).map((id) => {
                  const card = ALL_CARDS.find((c) => c.id === id)!;
                  const count = getCardCount(id);
                  const xpGain = getFusedXp(card.atk + card.hp);
                  const rs = RARITY[card.rarity.id] || RARITY.common;
                  const artEl = getCardArt(card.id, card.element.id, card.artVariant ?? 0, card.rarity.id);
                  const ability = getCardAbility(card);
                  return (
                    <div key={id} className={`relative flex flex-col items-center rounded-2xl border-2 p-2.5 text-center ${rs.border} ${rs.cardGradient}`}>
                      {/* Count badge */}
                      <div className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-2 py-0.5 text-[8px] font-black text-white shadow-lg z-10">x{count}</div>
                      {/* Card art */}
                      <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "3/4" }}>
                        <div className="absolute inset-0">{artEl}</div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4">
                          <RarityStars rarityId={card.rarity.id} size={6} />
                          <p className="text-[8px] font-black leading-tight mt-0.5" style={{ color: rs.accent }}>{card.name}</p>
                        </div>
                        {rs.shimmer && (
                          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                              animate={{ x: ["-100%", "200%"] }}
                              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                              style={{ width: "25%", transform: "skewX(-15deg)" }}
                            />
                          </div>
                        )}
                      </div>
                      <AbilityBadge card={card} />
                      <div className="mt-1 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[8px] font-black text-white">
                        <Sparkles size={7} />+{xpGain} EXP
                      </div>
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

        {/* LEVEL UP */}
        {activeSection === "levelup" && (
          <div className="space-y-3 p-3">
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
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {unlockedCards.map((id) => {
                  const card = ALL_CARDS.find((c) => c.id === id)!;
                  const level = getCardLevel(id);
                  const nextLevel = level + 1;
                  const xpCost = getXpForLevel(nextLevel);
                  const hasXp = (points || 0) >= xpCost;
                  const isMax = level >= 5;
                  const rs = RARITY[card.rarity.id] || RARITY.common;
                  const artEl = getCardArt(card.id, card.element.id, card.artVariant ?? 0, card.rarity.id);
                  const ability = getCardAbility(card);
                  return (
                    <div key={id} className={`flex flex-col items-center rounded-2xl border p-2.5 text-center ${
                      isMax ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
                    }`}>
                      {/* Level badge */}
                      {level > 1 && (
                        <div className="mb-1 flex gap-0.5">
                          {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
                            <Star key={i} size={7} className="fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      )}
                      {/* Card art */}
                      <div className="relative w-full overflow-hidden rounded-xl border border-slate-100" style={{ aspectRatio: "3/4" }}>
                        <div className="absolute inset-0">{artEl}</div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4">
                          <RarityStars rarityId={card.rarity.id} size={5} />
                          <p className="text-[7px] font-black leading-tight mt-0.5 line-clamp-1" style={{ color: rs.accent }}>{card.name}</p>
                        </div>
                        {level > 1 && (
                          <div className="absolute left-0.5 top-0.5 flex items-center gap-0.5 rounded-full bg-black/60 px-1 py-0.5">
                            <span className="text-[6px] font-black text-amber-400">Lv.{level}</span>
                          </div>
                        )}
                        {isMax && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="rounded-full bg-amber-400/90 px-2 py-1">
                              <span className="text-[8px] font-black text-white">MAX</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <AbilityBadge card={card} />
                      {isMax ? (
                        <div className="mt-1 rounded-full bg-amber-200 px-2 py-0.5 text-[8px] font-black text-amber-800">Cấp tối đa</div>
                      ) : (
                        <>
                          <div className="mt-1 flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold text-slate-600">
                            <Sparkles size={7} className="text-indigo-400" />{xpCost} EXP
                          </div>
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

        {/* GACHA */}
        {activeSection === "gacha" && (
          <div className="flex flex-col items-center gap-5 p-5 text-center">
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              {/* Orbiting sparkles */}
              {[0, 72, 144, 216, 288].map((angle, i) => (
                <motion.div
                  key={angle}
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: ["#f59e0b", "#a855f7", "#3b82f6", "#22c55e", "#ef4444"][i],
                    boxShadow: `0 0 8px ${["#f59e0b", "#a855f7", "#3b82f6", "#22c55e", "#ef4444"][i]}`,
                    top: `calc(50% + ${Math.cos(angle * Math.PI / 180) * 50}px - 4px)`,
                    left: `calc(50% + ${Math.sin(angle * Math.PI / 180) * 50}px - 4px)`,
                    animationDelay: `${i * 0.4}s`,
                  }}
                  className="absolute rounded-full animate-pulse"
                />
              ))}
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_40px_rgba(99,102,241,0.5)]">
                <Wand2 size={52} className="text-white/90" />
              </div>
              <div className="absolute -right-2 -top-2 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-white shadow-lg z-10">
                {PULL_COST} EXP
              </div>
            </motion.div>

            <div>
              <h3 className="text-2xl font-black text-slate-900">Mở gói thẻ bài</h3>
              <p className="mt-1 text-sm text-slate-500">
                Dùng <span className="font-black text-indigo-600">{PULL_COST} EXP</span> để nhận thẻ ngẫu nhiên từ bộ sưu tập
              </p>
            </div>

            <div className="w-full max-w-xs space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
              <div>
                <p className="text-xs text-slate-400">EXP hiện có</p>
                <p className="text-3xl font-black text-indigo-600">{points}</p>
              </div>
              {points < PULL_COST && (
                <p className="text-xs text-red-500 font-medium">Cần thêm {PULL_COST - points} EXP để mở gói</p>
              )}
              <Button
                onClick={handlePullGacha}
                disabled={points < PULL_COST || isPulling}
                loading={isPulling}
                size="lg"
                className="w-full text-sm font-bold"
                variant="secondary"
              >
                <Sparkles size={15} />
                {points < PULL_COST ? `Cần ${PULL_COST} EXP` : isPulling ? "Đang mở gói..." : `Mở gói (${PULL_COST} EXP)`}
              </Button>
            </div>

            {/* Rarity drop rates */}
            <div className="w-full max-w-xs space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tỉ lệ rơi</p>
              <div className="grid grid-cols-4 gap-2">
                {RARITY_ORDER.map((rid) => (
                  <div key={rid} className={`flex flex-col items-center rounded-2xl border-2 p-2.5 ${RARITY[rid].border} ${RARITY[rid].cardGradient}`}>
                    <RarityStars rarityId={rid} size={8} />
                    <span className={`mt-1 rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase ${RARITY[rid].badgeBg} ${RARITY[rid].badgeText}`}>
                      {RARITY[rid].name}
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
          <div className="space-y-4 p-3">
            {/* Deck */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-black text-sm text-slate-800">Đội hình chiến đấu ({deck.length}/{DECK_SIZE})</h4>
                {deck.length > 0 && (
                  <PowerBadge power={deckPower} />
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {Array.from({ length: DECK_SIZE }).map((_, i) => {
                  const cardId = deck[i];
                  if (!cardId) {
                    return (
                      <div key={i} className="relative aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                        <Plus size={16} className="text-slate-300" />
                        <div className="absolute bottom-1 text-[7px] font-black text-slate-400">{i + 1}</div>
                      </div>
                    );
                  }
                  return <DeckSlot key={i} cardId={cardId} index={i} />;
                })}
              </div>
            </div>

            {/* Card picker */}
            <div>
              <h4 className="mb-2 font-black text-sm text-slate-800">Chọn thẻ vào đội hình</h4>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6 overflow-y-auto sm:max-h-[220px]">
                {unlockedCards.map((id) => {
                  const card = ALL_CARDS.find((c) => c.id === id)!;
                  if (!card) return null;
                  const inDeck = deck.includes(id);
                  const rs = RARITY[card.rarity.id] || RARITY.common;
                  const artEl = getCardArt(card.id, card.element.id, card.artVariant ?? 0, card.rarity.id);
                  const ability = getCardAbility(card);
                  const power = calcPower(card, getCardLevel(id));
                  return (
                    <motion.button
                      key={id}
                      whileHover={{ scale: inDeck ? 1 : 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (inDeck) {
                          setDeck((d) => d.filter((x) => x !== id));
                        } else if (deck.length < DECK_SIZE) {
                          setDeck((d) => [...d, id]);
                        }
                      }}
                      className={`relative flex flex-col items-center rounded-xl border-2 p-1 transition-all overflow-hidden ${
                        inDeck ? `${rs.border} ${rs.glow} ring-2 ring-amber-400` : "border-slate-200 hover:border-slate-300"
                      }`}
                      style={{ aspectRatio: "3/4" }}
                    >
                      {/* Card art */}
                      <div className="absolute inset-0">{artEl}</div>
                      {/* Bottom */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1 pt-4">
                        <p className="text-[6px] font-black leading-tight text-white line-clamp-1 drop-shadow">{card.name}</p>
                        {ability && (
                          <p className="text-[5px] text-white/50">{ability.icon}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[5px] font-black text-amber-400">{power}</span>
                          <RarityStars rarityId={card.rarity.id} size={5} />
                        </div>
                      </div>
                      {/* Selected check */}
                      {inDeck && (
                        <div className="absolute -left-0.5 -top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white shadow">
                          <Check size={8} />
                        </div>
                      )}
                      {/* Level */}
                      {getCardLevel(id) > 1 && (
                        <div className="absolute left-0.5 top-0.5 z-10 rounded-full bg-black/60 px-1 py-0.5">
                          <span className="text-[5px] font-black text-amber-400">Lv.{getCardLevel(id)}</span>
                        </div>
                      )}
                      {/* Shimmer */}
                      {rs.shimmer && (
                        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                            style={{ width: "25%", transform: "skewX(-15deg)" }}
                          />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={() => setShowBattle(true)}
              disabled={!canBattle}
              size="lg"
              className={`w-full text-sm font-bold ${canBattle ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-300"}`}
            >
              <Swords size={14} />
              {canBattle ? (
                <span>Xông trận! ⚔️</span>
              ) : (
                <span>Chọn thêm {DECK_SIZE - deck.length} thẻ</span>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Card detail modal */}
      <AnimatePresence>
        {viewingCard && (
          <ModalShell onClose={() => setViewingCard(null)} className="max-w-md overflow-hidden p-0">
            <CardDetail
              card={viewingCard}
              level={getCardLevel(Number(viewingCard.id))}
              count={getCardCount(Number(viewingCard.id))}
              onClose={() => setViewingCard(null)}
              onAddDeck={() => { setViewingCard(null); setActiveSection("battle"); }}
            />
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Gacha reveal */}
      <AnimatePresence>
        {(isPulling || gachaResult) && (
          <GachaReveal
            result={gachaResult}
            onClose={() => setGachaResult(null)}
          />
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
