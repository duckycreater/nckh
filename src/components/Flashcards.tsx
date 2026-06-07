import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Layers, Lock, Swords, X, Wand2,
  ArrowUp, GitMerge, Zap, Trophy, Star, Shield,
  Heart, Target, Wind, Crosshair, Brain, Flame,
  ChevronDown, Info, Plus, Check, RefreshCw,
  Activity, Award, Cpu, Skull, Eye, Search,
  ChevronRight, Battery, Lightning, Gauge,
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
  epic:      { name: "Siêu hiếm", shortName: "SH", accent: "#a855f7", bgLight: "#faf5ff", bgDark: "#581c87", border: "border-purple-400", glow: "shadow-purple-200", badgeBg: "bg-purple-100", badgeText: "text-purple-700", shimmer: true, starCount: 3 },
  legendary:  { name: "Huyền thoại", shortName: "HT", accent: "#f59e0b", bgLight: "#fffbeb", bgDark: "#78350f", border: "border-amber-400", glow: "shadow-amber-200", badgeBg: "bg-amber-100", badgeText: "text-amber-700", shimmer: true, starCount: 4 },
};
const RARITY_ORDER = ["legendary", "epic", "rare", "common"];
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
function CardAvatar({ elementId, size = 36 }: { elementId: string; size?: number }) {
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
      <span className="text-[70%]" style={{ fontSize: size * 0.55 }}>{emoji}</span>
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
function CardTile({ card, level = 1, count = 1, selected = false, locked = false, inDeck = false, onClick }: {
  card: any; level?: number; count?: number; selected?: boolean; locked?: boolean; inDeck?: boolean; onClick?: () => void;
}) {
  const rs = RARITY[card.rarity.id] || RARITY.common;
  const ability = getCardAbility(card);
  const elemColor = ELEM_COLOR[card.element.id] || "#94a3b8";
  const isEpic = card.rarity.id === "epic" || card.rarity.id === "legendary";

  if (locked) {
    return (
      <motion.button
        whileHover={{ opacity: 0.7 }}
        onClick={onClick}
        className="relative w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-200 text-left bg-slate-50"
        style={{ aspectRatio: "3/4" }}
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

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`
        relative w-full cursor-pointer overflow-hidden rounded-2xl border-2 text-left
        transition-all duration-200 bg-white
        ${rs.border}
        ${selected ? "ring-2 ring-amber-400 ring-offset-2" : ""}
        ${inDeck ? "ring-2 ring-amber-400 ring-offset-1" : ""}
      `}
      style={{ aspectRatio: "3/4", boxShadow: `0 2px 8px ${rs.accent}20, 0 1px 3px rgba(0,0,0,0.06)` }}
    >
      {/* Element color bar */}
      <div className="absolute inset-x-0 top-0 z-10 h-1.5 rounded-t-[14px]" style={{ background: `linear-gradient(90deg, ${elemColor}60, ${elemColor})` }} />

      {/* Avatar area */}
      <div className="absolute inset-0 flex items-center justify-center pt-3.5">
        <CardAvatar elementId={card.element.id} size={58} />
      </div>

      {/* Bottom info panel */}
      <div className="absolute inset-x-0 bottom-0 z-10 rounded-b-2xl bg-white/95 backdrop-blur-sm p-2 pt-5">
        {/* Rarity + element */}
        <div className="mb-1 flex items-center justify-between">
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

        {/* Card name */}
        <p className="line-clamp-1 text-center text-[8px] font-black text-slate-800 leading-tight">{card.name}</p>

        {/* Level */}
        {level > 1 && (
          <div className="mt-0.5 flex items-center justify-center">
            <LevelBadge level={level} />
          </div>
        )}

        {/* Ability */}
        {ability && (
          <div className="mt-1 flex items-center justify-center gap-1">
            <span className="text-[8px]">{ability.icon}</span>
            <span className="text-[7px] font-medium text-slate-500 truncate max-w-full">{ability.name}</span>
          </div>
        )}
      </div>

      {/* Shimmer for epic+ */}
      {isEpic && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl opacity-40">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            style={{ width: "30%", transform: "skewX(-15deg)" }}
          />
        </div>
      )}
    </motion.button>
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
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        style={{ boxShadow: `0 0 0 1.5px ${rs.accent}40, 0 25px 80px rgba(0,0,0,0.18)` }}
      >
        {/* ── Hero Header ── */}
        <div className="relative px-6 pt-8 pb-6" style={{ background: `linear-gradient(145deg, ${elemColor}12, ${elemColor}05, transparent)` }}>
          {/* Element color accent bar */}
          <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${elemColor}80, ${rs.accent})` }} />

          {/* Count badge */}
          {count > 1 && (
            <div className="absolute right-5 top-8 z-20 flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-black text-white shadow-lg">
              <span>x{count}</span>
            </div>
          )}

          {/* Close button */}
          <button onClick={onClose}
            className="absolute right-4 top-8 rounded-full border border-slate-200 bg-white/80 p-2 text-slate-400 backdrop-blur-sm transition-all hover:border-slate-300 hover:text-slate-600 hover:bg-white">
            <X size={15} />
          </button>

          {/* Main content: Avatar + info */}
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <CardAvatar elementId={card.element.id} size={72} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              {/* Rarity row */}
              <div className="flex items-center gap-2 mb-1.5">
                <RarityStars rarityId={card.rarity.id} size={12} />
                <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                  style={{ backgroundColor: rs.accent + "18", color: rs.accent, border: `1px solid ${rs.accent}40` }}>
                  {rs.name}
                </span>
                {level > 1 && <LevelBadge level={level} />}
              </div>
              {/* Name */}
              <h3 className="text-xl font-black text-slate-900 leading-tight">{card.name}</h3>
              {card.subtitle && <p className="text-sm text-slate-400 font-medium">{card.subtitle}</p>}
              {/* Element + Power */}
              <div className="mt-2 flex items-center gap-2">
                {elem && (
                  <div className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: elemColor + "18" }}>
                    <span className="text-sm">{getAvatarEmoji(card.element.id)}</span>
                    <span className="text-[10px] font-bold" style={{ color: elemColor }}>{elem.name}</span>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5">
                  <Zap size={12} className="text-amber-400" />
                  <span className="text-sm font-black text-white" style={{ fontFamily: "monospace" }}>{power}</span>
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
        <div className="px-6 pb-4">
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
          <div className="mx-6 mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100">
                <span className="text-2xl">{ability.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-900">{ability.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase ${
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
            <p className="text-xs leading-relaxed text-slate-500 pl-[52px]">{ability.desc}</p>
          </div>
        )}

        {/* ── Action Button ── */}
        {onAddDeck && (
          <div className="mx-6 mb-6">
            <Button onClick={onAddDeck} size="lg"
              className="w-full text-sm font-bold shadow-md"
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
          style={{ perspective: "1000px" }}
          initial={{ rotateY: 180 }} animate={{ rotateY: flipped ? 0 : 180 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          className="relative w-56 overflow-hidden rounded-3xl"
          style={{ background: `linear-gradient(145deg, ${elemColor}20, ${rs.accent}15)`, border: `3px solid ${rs.accent}60`, boxShadow: `0 0 40px ${rs.accent}40, 0 20px 60px rgba(0,0,0,0.4)` }}
        >
          {/* Color bar */}
          <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${elemColor}, ${rs.accent})` }} />

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 p-6">
            <CardAvatar elementId={result.element?.id || "plastic"} size={80} />
            <div className="text-center">
              <RarityStars rarityId={result.rarity?.id ?? "common"} size={12} />
              <h3 className="mt-2 text-xl font-black text-white">{result.name}</h3>
              {result.subtitle && <p className="text-xs text-white/60">{result.subtitle}</p>}
            </div>

            {/* Quick stats */}
            <div className="grid w-full grid-cols-3 gap-2">
              {(["atk", "hp", "def"] as const).map((stat) => (
                <div key={stat} className="flex flex-col items-center rounded-xl bg-black/30 p-2">
                  <span className="text-[9px] font-bold uppercase text-white/50">{STAT_CONFIG[stat].label}</span>
                  <span className="text-base font-black" style={{ color: STAT_CONFIG[stat].color }}>{result[stat]}</span>
                </div>
              ))}
            </div>

            {/* Ability */}
            {ability && (
              <div className="w-full rounded-xl bg-black/40 p-3 text-center">
                <span className="text-2xl">{ability.icon}</span>
                <p className="mt-1 text-xs font-black text-white">{ability.name}</p>
                <p className="text-[10px] text-white/50">{ability.desc}</p>
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
          className={`mt-6 text-base font-black ${result.isNew ? "text-amber-400" : "text-slate-400"}`}
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
  const [sortBy, setSortBy] = useState<"power" | "atk" | "hp">("power");
  const [showLocked, setShowLocked] = useState(false);
  const [cardLevels, setCardLevels] = useState<Record<string, number>>({});
  const [deck, setDeck] = useState<number[]>([]);
  const [showBattle, setShowBattle] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fuseMsg, setFuseMsg] = useState<string | null>(null);
  const [fusing, setFusing] = useState(false);
  const [levelingUp, setLevelingUp] = useState(false);
  const [levelupMsg, setLevelupMsg] = useState<string | null>(null);

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
      setFuseMsg(data.success ? `Hợp nhất thành công! +${data.xpGained} EXP` : (data.error || "Thất bại."));
      if (data.success) { await refreshProgress(); fetchCardLevels(); }
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
        setLevelupMsg(`Nâng cấp thành công lên Lv.${data.newLevel}!`);
        if (onSpend) onSpend(cost, "Nâng cấp thẻ");
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
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* ─── Header ─── */}
      <div className="flex-shrink-0 border-b border-slate-100 bg-white px-5 pt-4 pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge tone="accent">Thẻ bài</Badge>
            <span className="text-sm font-medium text-slate-500">{collectedCount}/{totalCards}</span>
            {collectionPower > 0 && <PowerBadge power={collectionPower} />}
            {fuseableCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-600">
                <GitMerge size={10} />{fuseableCount} hợp nhất
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">EXP</p>
              <p className="text-lg font-black leading-none tabular-nums text-slate-900">{points}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm thẻ theo tên..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pl-9 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-1 overflow-x-auto thin-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
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
                {ELEMENTS.map((el) => (
                  <button key={el.id} onClick={() => setFilterElement(el.id)}
                    className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${filterElement === el.id ? "text-white" : "bg-slate-100 text-slate-500"}`}
                    style={filterElement === el.id ? { backgroundColor: el.accent } : {}}>
                    <span>{getAvatarEmoji(el.id)}</span>{el.name}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400">{displayCards.length} thẻ · {collectedCount} đã mở</p>

            {displayCards.length === 0 ? (
              <EmptyState icon={<Layers size={40} className="text-slate-300" />} title="Không có thẻ" subtitle="Thử thay đổi bộ lọc." />
            ) : (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                {displayCards.map((card) => {
                  const isLocked = !unlockedCards.includes(card.id);
                  const inDeck = deck.includes(card.id);
                  return (
                    <CardTile
                      key={card.id}
                      card={card}
                      count={getCardCount(card.id)}
                      level={getCardLevel(card.id)}
                      locked={isLocked && showLocked}
                      inDeck={inDeck}
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
          <div className="space-y-3 p-4">
            {fuseMsg && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                  fuseMsg.includes("thành") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                }`}>
                {fuseMsg}
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
                        size="sm" variant="secondary" className="mt-2 w-full text-[10px] py-1.5 font-bold bg-slate-900 text-white hover:bg-slate-800">
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
            {levelupMsg && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                  levelupMsg.includes("thành") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                }`}>
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
                          <div className="mt-1.5 flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                            <Sparkles size={8} className="text-amber-500" />{xpCost} EXP
                          </div>
                          <Button onClick={() => handleLevelUp(id)} disabled={!hasXp || levelingUp}
                            size="sm" variant="secondary"
                            className={`mt-1.5 w-full text-[10px] py-1.5 font-bold ${hasXp ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-400"}`}>
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

            {/* Battle button */}
            <Button
              onClick={() => setShowBattle(true)}
              disabled={!canBattle}
              size="lg"
              className={`w-full text-sm font-bold py-3 ${canBattle ? "bg-slate-900 hover:bg-slate-800 text-white shadow-lg" : "bg-slate-200 text-slate-400"}`}
            >
              <Swords size={14} />
              {canBattle ? "Xông trận!" : `Chọn thêm ${DECK_SIZE - deck.length} thẻ`}
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
