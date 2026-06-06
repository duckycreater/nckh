import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Layers, Lock, Swords, X, Wand2,
  ArrowUp, TrendingUp, GitMerge, Squirrel,
} from "lucide-react";
import { UserProgress } from "../types";
import { ALL_CARDS, RARITIES, getElementIcon, ELEMENTS, calcPower, getXpForLevel, getFusedXp, ELEMENT_COUNTER } from "../lib/cards";
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
type Section = "collection" | "fusion" | "levelup" | "gacha" | "battle";
const DECK_SIZE = 5;

function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const TABS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "collection", label: "Bộ sưu tập", icon: <Layers size={14} /> },
  { id: "fusion", label: "Hợp nhất", icon: <GitMerge size={14} /> },
  { id: "levelup", label: "Lên cấp", icon: <ArrowUp size={14} /> },
  { id: "gacha", label: "Mở gói", icon: <Sparkles size={14} /> },
  { id: "battle", label: "Đấu trường", icon: <Swords size={14} /> },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Design tokens: each rarity gets a distinct, readable color scheme
// ─────────────────────────────────────────────────────────────────────────────
const RARITY_STYLE: Record<string, {
  bg: string;           // card background gradient
  border: string;       // border class
  frameAccent: string;  // accent color for name, stats, badge
  badgeClass: string;   // badge background
  badgeText: string;    // badge text
  iconBg: string;       // icon circle background
  nameBg: string;       // rarity name chip bg
  nameText: string;     // rarity name chip text
  glow: string;         // shadow
}> = {
  common: {
    bg: "from-slate-50 to-slate-100",
    border: "border-slate-300",
    frameAccent: "#475569",
    badgeClass: "bg-slate-200 text-slate-700",
    iconBg: "bg-slate-200",
    nameBg: "bg-slate-200",
    nameText: "text-slate-600",
    glow: "",
  },
  rare: {
    bg: "from-blue-50 to-indigo-100",
    border: "border-blue-400",
    frameAccent: "#2563eb",
    badgeClass: "bg-blue-100 text-blue-700",
    iconBg: "bg-blue-100",
    nameBg: "bg-blue-100",
    nameText: "text-blue-700",
    glow: "shadow-blue-400/30",
  },
  epic: {
    bg: "from-purple-50 to-pink-100",
    border: "border-purple-400",
    frameAccent: "#9333ea",
    badgeClass: "bg-purple-100 text-purple-700",
    iconBg: "bg-purple-100",
    nameBg: "bg-purple-100",
    nameText: "text-purple-700",
    glow: "shadow-purple-400/40",
  },
  legendary: {
    bg: "from-amber-50 to-orange-100",
    border: "border-amber-400",
    frameAccent: "#d97706",
    badgeClass: "bg-amber-100 text-amber-700",
    iconBg: "bg-amber-100",
    nameBg: "bg-amber-100",
    nameText: "text-amber-700",
    glow: "shadow-amber-400/50",
  },
};

function getAdvEl(elId: string): string | null {
  return Object.entries(ELEMENT_COUNTER).find(([, v]) => v === elId)?.[0] ?? null;
}
function getDisEl(elId: string): string | null {
  return ELEMENT_COUNTER[elId] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Card thumbnail — minimal, highly readable
// ─────────────────────────────────────────────────────────────────────────────
function GameCard({ card, count, onClick, selected }: {
  card: any; count?: number; onClick?: () => void; selected?: boolean;
}) {
  const rs = RARITY_STYLE[card.rarity.id] || RARITY_STYLE.common;
  const level = 1; // passed as prop later

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full overflow-hidden rounded-2xl border-2 text-left
        transition-all duration-150 active:scale-95
        ${rs.border}
        ${selected ? rs.glow + " ring-2 ring-offset-2 ring-amber-400" : rs.glow}
      `}
      style={{ aspectRatio: "3/4" }}
    >
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${rs.bg}`} />

      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-[18px]" style={{ background: rs.frameAccent }} />

      {/* Content */}
      <div className="relative flex h-full flex-col p-2">
        {/* Rarity badge */}
        <div className="flex items-center justify-between">
          <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide ${rs.nameBg} ${rs.nameText}`}>
            {card.rarity.name}
          </span>
          {count != null && count > 1 && (
            <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[8px] font-black text-white">
              x{count}
            </span>
          )}
        </div>

        {/* Icon */}
        <div className="my-auto flex flex-1 items-center justify-center">
          <div className={`rounded-2xl p-2 ${rs.iconBg}`}>
            {getElementIcon(card.element.id, 28)}
          </div>
        </div>

        {/* Name + Stats */}
        <div className="mt-auto space-y-1">
          <p className="line-clamp-2 text-center text-[8px] font-black leading-tight" style={{ color: rs.frameAccent }}>
            {card.name}
          </p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-[8px] font-black text-red-500">ATK {card.atk}</span>
            <span className="text-slate-300">·</span>
            <span className="text-[8px] font-black text-green-600">HP {card.hp}</span>
          </div>
        </div>
      </div>

      {/* Shimmer for legendary */}
      {card.rarity.hasShimmer && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ width: "35%", transform: "skewX(-20deg)" }}
          />
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Full card detail modal — large, beautiful, with element counter
// ─────────────────────────────────────────────────────────────────────────────
function CardModal({ card, unlocked, count, level, onAddToDeck }: {
  card: any; unlocked: boolean; count: number; level: number; onAddToDeck?: () => void;
}) {
  const rs = RARITY_STYLE[card.rarity.id] || RARITY_STYLE.common;
  const power = calcPower(card, level);
  const advEl = getAdvEl(card.element.id);
  const disEl = getDisEl(card.element.id);
  const advElData = ELEMENTS.find((e) => e.id === advEl);
  const disElData = ELEMENTS.find((e) => e.id === disEl);

  return (
    <motion.div
      initial={{ scale: 0.88, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.88, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="relative"
    >
      <button
        onClick={() => {/* close handled by ModalShell */}}
        className="absolute -right-2 -top-2 z-30 rounded-full bg-white p-2 text-slate-400 shadow-lg transition hover:bg-slate-100 hover:text-slate-700"
      >
        <X size={16} />
      </button>

      {/* Card frame */}
      <div className={`overflow-hidden rounded-3xl border-2 ${rs.border} ${rs.glow}`}>
        <div className={`bg-gradient-to-br ${rs.bg} p-1`}>
          <div className="relative rounded-2xl bg-white/95 p-5 backdrop-blur-sm">

            {/* Rarity + ID */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                #{String(card.id).padStart(3, "0")}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${rs.badgeClass}`}>
                  {card.rarity.name}
                </span>
              </div>
            </div>

            {/* Element icon */}
            <div className="mb-4 flex justify-center">
              <div className={`rounded-3xl p-5 ${rs.iconBg}`}>
                {getElementIcon(card.element.id, 64)}
              </div>
            </div>

            {/* Name */}
            <p className="mb-1 text-center text-lg font-black" style={{ color: rs.frameAccent }}>
              {card.name}
            </p>
            <p className="mb-5 text-center text-xs text-slate-400">
              Hệ {card.element.name}
            </p>

            {/* Stats */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center rounded-2xl bg-red-50 p-3">
                <svg width="14" height="14" viewBox="0 0 10 10">
                  <path d="M5 0L6.5 3.5L10 4 7.5 6.5 8 10 5 8 2 10l.5-3.5L0 4l3.5-.5z" fill="#ef4444" />
                </svg>
                <p className="mt-1 text-xl font-black text-red-600">{card.atk}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider text-red-400">ATK</p>
              </div>
              <div className="flex flex-col items-center rounded-2xl bg-emerald-50 p-3">
                <svg width="14" height="14" viewBox="0 0 10 10">
                  <path d="M5 0C5 0 1 3 1 6a4 4 0 008 0C9 3 5 0 5 0z" fill="#22c55e" />
                </svg>
                <p className="mt-1 text-xl font-black text-emerald-600">{card.hp}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-400">HP</p>
              </div>
              <div className="flex flex-col items-center rounded-2xl bg-slate-100 p-3">
                <TrendingUp size={14} className="text-slate-400" />
                <p className="mt-1 text-xl font-black text-slate-700">{power}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">PWR</p>
              </div>
            </div>

            {/* Element counter */}
            {(advEl || disEl) && (
              <div className="mb-4 flex flex-wrap gap-2">
                {advEl && advElData && (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5">
                    <span className="text-[10px] font-bold text-emerald-700">+</span>
                    {getElementIcon(advEl, 16)}
                    <span className="text-[10px] font-bold text-emerald-700">vs {advElData.name} +50%</span>
                  </div>
                )}
                {disEl && disElData && (
                  <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5">
                    <span className="text-[10px] font-bold text-red-700">-</span>
                    {getElementIcon(disEl, 16)}
                    <span className="text-[10px] font-bold text-red-700">vs {disElData.name} -25%</span>
                  </div>
                )}
              </div>
            )}

            {/* Meta */}
            {unlocked && (
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-500">
                <span>Cấp {level} · Sở hữu</span>
                <span className="text-amber-600">x{count}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add to deck button */}
      {unlocked && onAddToDeck && (
        <Button onClick={onAddToDeck} className="mt-3 w-full" size="md">
          <Swords size={14} />Vào đội hình
        </Button>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────────
export function Flashcards({ onReward, onSpend, points = 0, userId, progress, onRefresh }: Props) {
  const [unlockedCards, setUnlockedCards] = useState<number[]>([]);
  const [gachaResult, setGachaResult] = useState<any>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [showBattle, setShowBattle] = useState(false);
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
      const readSet = new Set<number>(progress.flashcardsRead?.map(Number) || []);
      if (progress.flashcardCounts) {
        Object.keys(progress.flashcardCounts).forEach((k) => readSet.add(Number(k)));
      }
      setUnlockedCards(Array.from(readSet));
    }
    fetchCardLevels();
  }, [progress, fetchCardLevels]);

  // Always resolve cards from ALL_CARDS so we get full data (element gradient, rarity colors, etc.)
  const resolveCard = (raw: any): any => {
    if (!raw) return null;
    if (raw.element?.gradient) return raw; // already full client card
    const id = Number(raw.id);
    const found = ALL_CARDS.find((c) => c.id === id);
    if (found) return found;
    // truly unknown card — build from server fields
    const elData = ELEMENTS.find((e) => e.id === raw.elementId || e.id === raw.element?.id);
    const rData = RARITIES.find((r) => r.id === raw.rarityId || r.id === raw.rarity?.id);
    return {
      id,
      name: raw.name || "Thẻ Rác",
      element: elData || { id: raw.elementId, name: raw.element?.name || "??", gradient: "", accent: "" },
      rarity: rData || { id: raw.rarityId, name: raw.rarity?.name || "Phổ thông", bgGradient: "", frameAccent: "", hasShimmer: false },
      hp: Number(raw.hp) || 0,
      atk: Number(raw.atk) || 0,
    };
  };

  const getCardCount = (cardId: number) => {
    const key = String(cardId);
    if (progress?.flashcardCounts?.[key]) return progress.flashcardCounts[key];
    return 0;
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

  // Display list
  let displayCards = ALL_CARDS.filter((c) => filterRarity === "all" || c.rarity.id === filterRarity);
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

  // ─── Gacha ─────────────────────────────────────────────────────────────────
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

  // ─── Fusion ─────────────────────────────────────────────────────────────────
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
      if (data.success && onRefresh) onRefresh();
      fetchCardLevels();
    } catch { setFuseMsg("Lỗi kết nối."); }
    setFusing(false);
    setTimeout(() => setFuseMsg(null), 4000);
  };

  // ─── Level Up ───────────────────────────────────────────────────────────────
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
        if (onRefresh) onRefresh();
      } else {
        setLevelupMsg(data.error || "Thất bại.");
      }
    } catch { setLevelupMsg("Lỗi kết nối."); }
    setLevelingUp(false);
    setTimeout(() => setLevelupMsg(null), 4000);
  };

  return (
    <div className="flex h-full max-h-[88vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* ── HEADER ── */}
      <div className="flex-shrink-0 border-b border-slate-100 bg-white px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone="accent">Thẻ bài</Badge>
            <span className="text-sm text-slate-500">{collectedCount}/{totalCards}</span>
          </div>
          <div className="flex items-center gap-3">
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
        <div className="mt-3 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                activeSection === tab.id
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto thin-scrollbar">

        {/* ─── COLLECTION ─── */}
        {activeSection === "collection" && (
          <div className="space-y-3 p-4">
            {/* Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              {["all", "common", "rare", "epic", "legendary"].map((f) => (
                <button key={f} onClick={() => setFilterRarity(f)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    filterRarity === f ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {f === "all" ? "Tất cả" : RARITIES.find((r) => r.id === f)?.name}
                </button>
              ))}
              <button onClick={() => setShowLocked(!showLocked)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${showLocked ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
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

            <p className="text-xs text-slate-400">{displayCards.length} thẻ · {collectionPower} PWR tổng</p>

            {displayCards.length === 0 ? (
              <EmptyState icon={<Layers size={40} className="text-slate-300" />}
                title="Không có thẻ" subtitle="Thử bộ lọc khác." />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {displayCards.map((card) => (
                  <GameCard
                    key={card.id}
                    card={card}
                    count={getCardCount(card.id)}
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
                  const rs = RARITY_STYLE[card.rarity.id] || RARITY_STYLE.common;
                  return (
                    <div key={id} className={`flex flex-col items-center rounded-2xl border-2 p-3 text-center ${rs.border} ${rs.bg}`}>
                      <div className={`rounded-xl p-1.5 ${rs.iconBg}`}>{getElementIcon(card.element.id, 28)}</div>
                      <p className="mt-1 text-[8px] font-black line-clamp-1" style={{ color: rs.frameAccent }}>{card.name}</p>
                      <p className="text-[8px] text-slate-400">x{count}</p>
                      <div className="mt-1 rounded-full bg-amber-400 px-2 py-0.5 text-[8px] font-black text-white">+{xpGain} EXP</div>
                      <Button onClick={() => handleFuse(id)} disabled={fusing} loading={fusing}
                        size="sm" variant="secondary" className="mt-2 w-full text-[10px] py-1">
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
                  const rs = RARITY_STYLE[card.rarity.id] || RARITY_STYLE.common;
                  return (
                    <div key={id} className={`flex flex-col items-center rounded-2xl border p-2.5 text-center ${isMax ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
                      {level > 1 && (
                        <div className="mb-1 rounded-full bg-amber-400 px-2 py-0.5 text-[8px] font-black text-white">Lv{level}</div>
                      )}
                      <div className={`rounded-xl p-1 ${rs.iconBg}`}>{getElementIcon(card.element.id, 24)}</div>
                      <p className="mt-1 text-[8px] font-black line-clamp-1" style={{ color: rs.frameAccent }}>{card.name}</p>
                      <p className="text-[8px] text-slate-400">ATK {card.atk} · HP {card.hp}</p>
                      {isMax ? (
                        <div className="mt-1 rounded-full bg-amber-200 px-2 py-0.5 text-[8px] font-black text-amber-800">Cấp tối đa</div>
                      ) : (
                        <>
                          <div className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold text-slate-600">{xpCost} EXP</div>
                          <Button onClick={() => handleLevelUp(id)} disabled={!hasXp || levelingUp}
                            size="sm" variant={hasXp ? "secondary" : "ghost"} className="mt-1 w-full text-[9px] py-1">
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
            <div className="rounded-2xl bg-indigo-50 p-4 text-indigo-400">
              <Wand2 size={48} />
            </div>
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
                loading={isPulling} size="lg" className="mt-4 w-full" variant="secondary">
                <Sparkles size={16} />
                {points < PULL_COST ? `Cần ${PULL_COST} EXP` : isPulling ? "Đang mở..." : `Mở gói (${PULL_COST} EXP)`}
              </Button>
            </div>
            {/* Rarity summary */}
            <div className="grid w-full max-w-xs grid-cols-4 gap-2">
              {RARITIES.map((r) => {
                const rs = RARITY_STYLE[r.id];
                return (
                  <div key={r.id} className={`flex flex-col items-center rounded-2xl border p-2 ${r.borderStyle} ${r.bgGradient}`}>
                    <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase ${rs.badgeClass}`}>{r.name}</span>
                    <p className="mt-1 text-base font-black" style={{ color: r.frameAccent }}>{countByRarity(r.id)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── BATTLE ─── */}
        {activeSection === "battle" && (
          <div className="space-y-4 p-4">
            {/* Deck slots */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-black text-sm text-slate-800">Đội hình ({deck.length}/{DECK_SIZE})</h4>
                {deck.length > 0 && (
                  <span className="text-xs font-bold text-amber-600">{deckPower} PWR</span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: DECK_SIZE }).map((_, i) => {
                  const card = deckCards[i];
                  if (!card) {
                    return (
                      <div key={i} className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                        <span className="text-xl text-slate-300">+</span>
                      </div>
                    );
                  }
                  const rs = RARITY_STYLE[card.rarity.id] || RARITY_STYLE.common;
                  return (
                    <div key={i} className={`relative aspect-[3/4] overflow-hidden rounded-xl border-2 ${rs.border} ${rs.glowColor || ""}`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${rs.bg}`} />
                      <div className="relative z-10 flex h-full flex-col items-center justify-center p-1">
                        <div className={`rounded-lg p-0.5 ${rs.iconBg}`}>{getElementIcon(card.element.id, 18)}</div>
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
              <div className="grid max-h-[200px] grid-cols-4 gap-1.5 overflow-y-auto thin-scrollbar pr-1">
                {unlockedCards.map((id) => {
                  const card = ALL_CARDS.find((c) => c.id === id)!;
                  const inDeck = deck.includes(id);
                  const rs = RARITY_STYLE[card.rarity.id] || RARITY_STYLE.common;
                  return (
                    <button key={id}
                      onClick={() => inDeck ? setDeck((d) => d.filter((x) => x !== id)) : deck.length < DECK_SIZE ? setDeck((d) => [...d, id]) : null}
                      className={`relative flex flex-col items-center rounded-xl border-2 p-1.5 transition-all ${inDeck ? `${rs.border} ${rs.glow} ring-2 ring-amber-400` : "border-slate-200 hover:border-slate-300"}`}>
                      {inDeck && (
                        <div className="absolute -left-0.5 -top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white">
                          <span className="text-[7px] font-black">✓</span>
                        </div>
                      )}
                      <div className={`rounded-lg p-0.5 ${rs.iconBg}`}>{getElementIcon(card.element.id, 20)}</div>
                      <p className="text-[6px] font-black leading-tight line-clamp-1 mt-0.5">{card.name.split(" ")[0]}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button onClick={() => setShowBattle(true)} disabled={!canBattle} size="lg" className="w-full">
              <Swords size={16} />
              {canBattle ? "Xông trận!" : `Chọn thêm ${DECK_SIZE - deck.length} thẻ`}
            </Button>
          </div>
        )}
      </div>

      {/* ── CARD DETAIL MODAL ── */}
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

      {/* ── GACHA REVEAL ── */}
      <AnimatePresence>
        {(isPulling || gachaResult) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          >
            <div className="flex flex-col items-center">
              {/* Spinner */}
              {isPulling && !gachaResult && (
                <motion.div
                  animate={{ rotateY: 360, scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-56 w-44 items-center justify-center rounded-3xl border-4 border-indigo-300 bg-gradient-to-br from-indigo-600 to-purple-600 shadow-[0_0_60px_rgba(99,102,241,0.5)]"
                >
                  <Sparkles size={48} className="animate-pulse text-white" />
                </motion.div>
              )}

              {/* Result */}
              {gachaResult && !isPulling && (
                <motion.div
                  className="flex flex-col items-center"
                  initial={{ scale: 0.7, y: 60, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ type: "spring", damping: 14, stiffness: 120 }}
                >
                  <motion.h2
                    className={`mb-4 text-3xl font-black drop-shadow-lg ${
                      gachaResult.rarity?.id === "legendary" ? "text-yellow-300"
                        : gachaResult.rarity?.id === "epic" ? "text-purple-400"
                        : gachaResult.rarity?.id === "rare" ? "text-blue-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {gachaResult.rarity?.name}!
                  </motion.h2>

                  <CardModal
                    card={gachaResult}
                    unlocked={true}
                    count={1}
                    level={1}
                  />

                  <p className={`mt-4 text-sm font-bold ${gachaResult.isNew ? "text-amber-400" : "text-slate-400"}`}>
                    {gachaResult.isNew ? "Thẻ mới!" : "Bạn đã có thẻ này."}
                  </p>

                  <Button onClick={() => setGachaResult(null)} className="mt-3" size="md" variant="ghost">
                    {gachaResult.isNew ? "Thu thập" : "Đóng"}
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BATTLE ── */}
      {showBattle && deck.length === DECK_SIZE && (
        <CardBattle
          deckCardIds={deck}
          onClose={() => setShowBattle(false)}
          onWin={(exp) => { onReward(exp); }}
        />
      )}
    </div>
  );
}
