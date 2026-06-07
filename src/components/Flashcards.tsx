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
import { ALL_CARDS, RARITIES, getElementIcon, ELEMENTS, calcPower, getXpForLevel, getFusedXp, getCardAbility, ABILITIES } from "../lib/cards";
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
}> = {
  common: {
    name: "Phổ thông", bg: "from-slate-100 to-slate-200", bgDark: "from-slate-800 to-slate-900",
    border: "border-slate-400", borderGlow: "#94a3b8",
    accent: "#64748b", badgeBg: "bg-slate-200", badgeText: "text-slate-600",
    glow: "shadow-slate-400/20", cardGradient: "from-slate-50 to-slate-100",
  },
  rare: {
    name: "Hiếm", bg: "from-blue-100 to-indigo-200", bgDark: "from-blue-900 to-indigo-900",
    border: "border-blue-400", borderGlow: "#3b82f6",
    accent: "#2563eb", badgeBg: "bg-blue-100", badgeText: "text-blue-700",
    glow: "shadow-blue-500/30", cardGradient: "from-blue-50 to-indigo-100",
  },
  epic: {
    name: "Siêu hiếm", bg: "from-purple-100 to-pink-200", bgDark: "from-purple-900 to-pink-900",
    border: "border-purple-400", borderGlow: "#a855f7",
    accent: "#9333ea", badgeBg: "bg-purple-100", badgeText: "text-purple-700",
    glow: "shadow-purple-500/40", cardGradient: "from-purple-50 to-pink-100",
  },
  legendary: {
    name: "Huyền thoại", bg: "from-amber-100 to-orange-200", bgDark: "from-amber-900 to-orange-900",
    border: "border-amber-400", borderGlow: "#f59e0b",
    accent: "#d97706", badgeBg: "bg-amber-100", badgeText: "text-amber-700",
    glow: "shadow-amber-500/50", cardGradient: "from-amber-50 to-orange-100",
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

// ─── Stat bar ────────────────────────────────────────────────────────────────
function StatBar({ stat, value, max, color }: { stat: string; value: number; max: number; color: string }) {
  const cfg = STAT_CONFIG[stat];
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-6 flex items-center justify-center text-slate-400">{cfg?.icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[8px] font-bold text-slate-500 uppercase">{cfg?.label}</span>
          <span className="text-[9px] font-black" style={{ color }}>{value}{cfg?.unit}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Element art SVG ─────────────────────────────────────────────────────────
function ElementArt({ elementId, size = 48 }: { elementId: string; size?: number }) {
  return getElementIcon(elementId, size);
}

// ─── Ability badge ───────────────────────────────────────────────────────────
function AbilityBadge({ card }: { card: any }) {
  const ability = getCardAbility(card);
  if (!ability) return null;
  const typeColor = ability.type === "ultimate" ? "#f59e0b" : ability.type === "active" ? "#3b82f6" : "#64748b";
  return (
    <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[7px] font-bold text-white"
      style={{ backgroundColor: typeColor + "cc", border: `1px solid ${typeColor}80` }}>
      <span>{ability.icon}</span>
      <span>{ability.name}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: ability.power }).map((_, i) => (
          <Star key={i} size={5} className="fill-amber-400 text-amber-400" />
        ))}
      </div>
    </div>
  );
}

// ─── Card Grid Item (modern card) ─────────────────────────────────────────────
function CardTile({ card, level = 1, count = 1, selected = false, onClick }: {
  card: any; level?: number; count?: number; selected?: boolean; onClick?: () => void;
}) {
  const rs = RARITY[card.rarity.id] || RARITY.common;
  const ability = getCardAbility(card);

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`
        relative w-full cursor-pointer overflow-hidden rounded-2xl border-2 text-left
        transition-all duration-200
        ${rs.border} ${selected ? `ring-2 ring-amber-400 ring-offset-1 ${rs.glow}` : rs.glow}
      `}
      style={{ aspectRatio: "3/4" }}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${rs.cardGradient}`} />

      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-[14px]"
        style={{ background: `linear-gradient(to right, ${rs.borderGlow}40, ${rs.accent}, ${rs.borderGlow}40)` }} />

      {/* Element art area */}
      <div className="absolute inset-0 flex items-center justify-center p-2 pt-4">
        <motion.div
          className="relative"
          animate={card.rarity.id === "legendary" ? { filter: `drop-shadow(0 0 8px ${rs.borderGlow})` } : {}}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        >
          <ElementArt elementId={card.element.id} size={44} />
        </motion.div>
      </div>

      {/* Bottom info panel */}
      <div className="absolute inset-x-0 bottom-0 rounded-b-[14px] bg-gradient-to-t from-black/90 via-black/70 to-transparent p-1.5 pt-4">
        {/* Rarity badge + count */}
        <div className="flex items-center justify-between mb-0.5">
          <span className="rounded-full border px-1 py-0.5 text-[5px] font-black uppercase tracking-wider"
            style={{ backgroundColor: rs.accent + "20", color: rs.accent, borderColor: rs.accent + "60" }}>
            {rs.name}
          </span>
          {count > 1 && (
            <span className="rounded-full bg-amber-400 px-1 py-0.5 text-[5px] font-black text-white">
              x{count}
            </span>
          )}
        </div>

        {/* Level stars */}
        {level > 1 && (
          <div className="flex gap-0.5 mb-0.5">
            {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
              <Star key={i} size={5} className="fill-amber-400 text-amber-400" />
            ))}
          </div>
        )}

        {/* Name */}
        <p className="line-clamp-2 text-center text-[6px] font-black leading-tight text-white">
          {card.name}
        </p>

        {/* Ability */}
        {ability && (
          <p className="mt-0.5 line-clamp-1 text-center text-[5px] text-white/60">
            {ability.icon} {ability.name}
          </p>
        )}
      </div>

      {/* Shimmer for epic+ */}
      {(card.rarity.id === "epic" || card.rarity.id === "legendary") && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            style={{ width: "25%", transform: "skewX(-15deg)" }}
          />
        </div>
      )}

      {/* Selected ring */}
      {selected && (
        <div className="absolute inset-0 z-20 rounded-2xl ring-4 ring-amber-400 ring-offset-1" />
      )}
    </motion.button>
  );
}

// ─── Card Detail View ─────────────────────────────────────────────────────────
function CardDetail({ card, level = 1, count = 1, onClose, onAddDeck }: {
  card: any; level: number; count: number; onClose: () => void; onAddDeck?: () => void;
}) {
  const rs = RARITY[card.rarity.id] || RARITY.common;
  const ability = getCardAbility(card);
  const power = calcPower(card, level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3 p-4"
    >
      {/* Card art */}
      <div className="flex justify-center">
        <div className={`relative rounded-3xl border-2 p-2 ${rs.border} ${rs.glow}`}
          style={{ boxShadow: `0 0 24px ${rs.borderGlow}40` }}>
          <div className={`rounded-2xl bg-gradient-to-br ${rs.cardGradient} p-4`}>
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0.7 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
              >
                <ElementArt elementId={card.element.id} size={96} />
              </motion.div>
            </div>
            <p className="mt-2 text-center text-sm font-black text-slate-800">{card.name}</p>
            <p className="text-center text-[10px] text-slate-500">{card.element.name}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Chỉ số</h4>
          <div className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5">
            <Zap size={10} className="text-amber-400" />
            <span className="text-xs font-black text-white">{power}</span>
          </div>
        </div>
        {(["atk", "hp", "def", "spd", "crt", "int"] as const).map((stat) => (
          <StatBar key={stat} stat={stat} value={card[stat]} max={STAT_CONFIG[stat].max} color={STAT_CONFIG[stat].color} />
        ))}
      </div>

      {/* Ability */}
      {ability && (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Chiêu thức</h4>
            <div className={`rounded-full px-2 py-0.5 text-[7px] font-black text-white ${
              ability.type === "ultimate" ? "bg-amber-500" : ability.type === "active" ? "bg-blue-500" : "bg-slate-500"
            }`}>
              {ability.type === "ultimate" ? "Tuyệt chiêu" : ability.type === "active" ? "Chủ động" : "Bị động"}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
              {ability.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-slate-800">{ability.name}</p>
                <div className="flex gap-0.5">
                  {Array.from({ length: ability.power }).map((_, i) => (
                    <Star key={i} size={8} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{ability.desc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500">
        <span>Cấp {level} · Sở hữu x{count}</span>
        {card.element.id && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-400">Hệ:</span>
            <ElementArt elementId={card.element.id} size={12} />
          </div>
        )}
      </div>

      {/* Action */}
      {onAddDeck && (
        <Button onClick={onAddDeck} className="w-full text-sm font-bold" size="md">
          <Swords size={13} />Vào đội hình
        </Button>
      )}
      <Button onClick={onClose} variant="ghost" className="w-full text-sm text-slate-400">
        Đóng
      </Button>
    </motion.div>
  );
}

// ─── Gacha reveal ───────────────────────────────────────────────────────────
function GachaReveal({ result, onClose }: { result: any; onClose: () => void }) {
  if (!result) return null;
  const rs = RARITY[result.rarity?.id] || RARITY.common;
  const ability = getCardAbility(result);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md"
    >
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: "50%", y: "50%", scale: 0, opacity: 1 }}
            animate={{
              x: `${50 + (Math.random() - 0.5) * 160}%`,
              y: `${50 + (Math.random() - 0.5) * 160}%`,
              scale: [0, 1.5, 0], opacity: [1, 1, 0],
            }}
            transition={{ duration: 2, delay: i * 0.02, ease: "easeOut" }}
            className="absolute h-2 w-2 rounded-full"
            style={{ background: i % 5 === 0 ? "#f59e0b" : i % 5 === 1 ? "#a855f7" : i % 5 === 2 ? "#3b82f6" : i % 5 === 3 ? "#22c55e" : "#ef4444", boxShadow: `0 0 6px ${["#f59e0b", "#a855f7", "#3b82f6", "#22c55e", "#ef4444"][i % 5]}` }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`mb-3 rounded-full px-6 py-2 text-sm font-black uppercase tracking-widest ${
            result.rarity?.id === "legendary" ? "bg-amber-500/20 text-amber-400 ring-2 ring-amber-400/40"
              : result.rarity?.id === "epic" ? "bg-purple-500/20 text-purple-400 ring-2 ring-purple-400/40"
              : result.rarity?.id === "rare" ? "bg-blue-500/20 text-blue-400 ring-2 ring-blue-400/40"
              : "bg-slate-500/20 text-slate-400 ring-2 ring-slate-400/40"
          }`}
        >
          {rs.name}!
        </motion.div>

        <motion.div
          initial={{ scale: 0.5, rotateY: 90 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
          className={`w-52 rounded-3xl border-2 p-1 ${rs.border}`}
          style={{ boxShadow: `0 0 40px ${rs.borderGlow}60, 0 0 80px ${rs.borderGlow}20` }}
        >
          <div className={`rounded-2xl bg-gradient-to-br ${rs.cardGradient} p-5`}>
            <div className="flex justify-center">
              <ElementArt elementId={result.element?.id || "plastic"} size={80} />
            </div>
            <p className="mt-2 text-center text-base font-black text-slate-800">{result.name}</p>
            <p className="text-center text-xs text-slate-500">Hệ {result.element?.name}</p>

            {/* Stats row */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["atk", "hp", "def"] as const).map((stat) => (
                <div key={stat} className="flex flex-col items-center rounded-xl bg-white/60 p-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">{STAT_CONFIG[stat].label}</span>
                  <span className="text-sm font-black" style={{ color: STAT_CONFIG[stat].color }}>{result[stat]}</span>
                </div>
              ))}
            </div>

            {ability && (
              <div className="mt-2 flex items-center justify-center gap-1 rounded-xl bg-black/5 p-2">
                <span className="text-sm">{ability.icon}</span>
                <span className="text-[9px] font-bold text-slate-600">{ability.name}</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className={`mt-4 text-sm font-bold ${result.isNew ? "text-amber-400" : "text-slate-400"}`}
        >
          {result.isNew ? "Thẻ mới! Du nhập bộ sưu tập" : "Bạn đã có thẻ này"}
        </motion.p>

        <Button onClick={onClose} size="lg" className="mt-3 font-bold text-sm">
          {result.isNew ? "Thu thập" : "Đóng"}
        </Button>
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
    const elData = ELEMENTS.find((e) => e.id === (raw as any).elementId || (raw as any).element?.id);
    const rData = RARITIES.find((r) => r.id === (raw as any).rarityId || (raw as any).rarity?.id);
    return {
      id,
      name: raw.name || "Thẻ Rác",
      element: elData || { id: (raw as any).elementId, name: (raw as any).element?.name || "??", gradient: "" },
      rarity: rData || { id: (raw as any).rarityId, name: (raw as any).rarity?.name || "Phổ thông" },
      hp: Number(raw.hp) || 0, atk: Number(raw.atk) || 0,
      def: Number(raw.def) || 0, spd: Number(raw.spd) || 0,
      crt: Number(raw.crt) || 0, int: Number(raw.int) || 0,
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
    (searchQuery === "" || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* ─── Header ─── */}
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

        {/* Search */}
        <div className="mt-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm thẻ..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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
          <div className="space-y-3 p-4">
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
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {displayCards.map((card) => (
                  <CardTile
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

        {/* FUSION */}
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
                    <div key={id} className={`flex flex-col items-center rounded-2xl border-2 p-3 text-center ${rs.border} ${rs.cardGradient}`}>
                      <div className="relative">
                        <ElementArt elementId={card.element.id} size={40} />
                        <div className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[8px] font-black text-white shadow">x{count}</div>
                      </div>
                      <p className="mt-1 text-[8px] font-black line-clamp-1" style={{ color: rs.accent }}>{card.name}</p>
                      <AbilityBadge card={card} />
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

        {/* LEVEL UP */}
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
                      <p className="mt-1 text-[8px] font-black line-clamp-1" style={{ color: rs.accent }}>{card.name}</p>
                      <AbilityBadge card={card} />
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

        {/* GACHA */}
        {activeSection === "gacha" && (
          <div className="flex flex-col items-center gap-5 p-6 text-center">
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [0, 2, -2, 0] }}
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

            {/* Rarity summary */}
            <div className="grid w-full max-w-xs grid-cols-4 gap-2">
              {RARITY_ORDER.map((rid) => (
                <div key={rid} className={`flex flex-col items-center rounded-2xl border-2 p-2 ${RARITY[rid].border} ${RARITY[rid].cardGradient}`}>
                  <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase ${RARITY[rid].badgeBg} ${RARITY[rid].badgeText}`}>{RARITY[rid].name}</span>
                  <p className="mt-1 text-sm font-black" style={{ color: RARITY[rid].accent }}>{countByRarity(rid)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BATTLE */}
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
                        <Plus size={16} className="text-slate-300" />
                      </div>
                    );
                  }
                  const rs = RARITY[card.rarity.id] || RARITY.common;
                  return (
                    <div key={i} className={`relative aspect-[3/4] overflow-hidden rounded-xl border-2 ${rs.border} ${rs.glow}`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${rs.cardGradient}`} />
                      <div className="relative z-10 flex h-full flex-col items-center justify-center p-1">
                        <ElementArt elementId={card.element.id} size={28} />
                        <p className="mt-0.5 text-[6px] font-black leading-tight line-clamp-1" style={{ color: rs.accent }}>
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
                          <Check size={8} />
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
