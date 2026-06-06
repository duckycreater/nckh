import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Library, Layers, Lock, Swords, X, Wand2,
  ArrowUp, TrendingUp, GitMerge, Shield, Zap, ChevronDown,
} from "lucide-react";
import { UserProgress } from "../types";
import { ALL_CARDS, RARITIES, getElementIcon, ELEMENTS, getAdvantage, getDisadvantage, calcPower, getXpForLevel, getFusedXp } from "../lib/cards";
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
  { id: "collection", label: "Bộ sưu tập", icon: <Layers size={13} /> },
  { id: "fusion", label: "Hợp nhất", icon: <GitMerge size={13} /> },
  { id: "levelup", label: "Lên cấp", icon: <ArrowUp size={13} /> },
  { id: "gacha", label: "Mở gói", icon: <Sparkles size={13} /> },
  { id: "battle", label: "Đấu trường", icon: <Swords size={13} /> },
];

const TIER_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  common:    { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300", glow: "shadow-slate-300/40" },
  rare:      { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-400", glow: "shadow-blue-400/40" },
  epic:      { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-400", glow: "shadow-purple-400/50" },
  legendary: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-400", glow: "shadow-amber-400/60" },
};

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
      const readSet = new Set<number>(progress.flashcardsRead || []);
      if (progress.flashcardCounts) {
        Object.keys(progress.flashcardCounts).forEach((k) => readSet.add(Number(k)));
      }
      setUnlockedCards(Array.from(readSet));
    }
    fetchCardLevels();
  }, [progress, fetchCardLevels]);

  const getCardCount = (cardId: number) => {
    if (progress?.flashcardCounts?.[cardId.toString()]) return progress.flashcardCounts[cardId.toString()];
    if (progress?.flashcardsRead?.includes(cardId)) return 1;
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

  // Build display card list
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

  // ─── Gacha ───────────────────────────────────────────────────────────────────
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
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.card) {
          const sc = result.card;
          const clientCard = ALL_CARDS.find((c) => c.id === sc.id) || {
            id: sc.id, name: sc.name,
            element: { id: sc.elementId, name: sc.elementName },
            rarity: { id: sc.rarityId, name: sc.rarityName },
            hp: sc.hp, atk: sc.atk,
          };
          setGachaResult({ ...clientCard, isNew: result.isNew });
          if (result.isNew) setUnlockedCards((prev) => [...prev, sc.id]);
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
      setFuseMsg(data.success ? `Hợp nhất thành công! +${data.xpGained} EXP` : (data.error || "Thất bại."));
      if (data.success && onRefresh) onRefresh();
      fetchCardLevels();
    } catch { setFuseMsg("Lỗi kết nối."); }
    setFusing(false);
    setTimeout(() => setFuseMsg(null), 4000);
  };

  // ─── Level Up ──────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  //   CARD COMPONENT — compact & readable
  // ─────────────────────────────────────────────────────────────────────────────
  function GameCard({ card, count, compact = true, selected = false, onClick }: {
    card: any; count?: number; compact?: boolean; selected?: boolean; onClick?: () => void;
  }) {
    const isUnlocked = unlockedCards.includes(card.id);
    const level = getCardLevel(card.id);
    const power = calcPower(card, level);
    const r = card.rarity;
    const tc = TIER_COLORS[r.id];

    return (
      <motion.button
        onClick={onClick}
        whileHover={isUnlocked ? { scale: 1.04 } : {}}
        whileTap={isUnlocked ? { scale: 0.97 } : {}}
        className={`group relative w-full overflow-hidden rounded-xl text-left transition-shadow ${
          isUnlocked
            ? selected
              ? `${tc.glow} ring-2 ring-amber-400 ring-offset-1 ${tc.border}`
              : `${tc.glow} ${tc.border}`
            : "opacity-40 grayscale border border-slate-300"
        }`}
        style={{ aspectRatio: compact ? "3/4" : undefined }}
      >
        {/* Card body */}
        <div className={`absolute inset-0 rounded-xl ${isUnlocked ? `bg-gradient-to-br ${r.bgGradient}` : "bg-slate-700"}`} />

        {/* Rarity accent bar */}
        {isUnlocked && <div className={`absolute inset-x-0 top-0 h-0.5 rounded-t-xl opacity-60`} style={{ background: r.frameAccent }} />}

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col p-2">
          {/* Top row: rarity + count */}
          <div className="flex items-start justify-between">
            <div className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${isUnlocked ? tc.bg + " " + tc.text : "bg-white/10 text-white/40"}`}>
              {Array.from({ length: r.starCount }).map((_, i) => (
                <svg key={i} width="6" height="6" viewBox="0 0 8 8" fill={isUnlocked ? r.frameAccent : "#6b7280"}>
                  <path d="M4 0l1.2 2.4L8 2.8 6 4.6l.5 2.9L4 6l-2.5 1.5.5-2.9L0 2.8l2.8-.4z" />
                </svg>
              ))}
              <span className="ml-0.5">{r.name}</span>
            </div>
            {count != null && count > 0 && (
              <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-white">x{count}</span>
            )}
          </div>

          {/* Level badge */}
          {isUnlocked && level > 1 && (
            <div className="mt-0.5 flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[8px] font-black text-white w-fit">
              <ArrowUp size={6} />Lv{level}
            </div>
          )}

          {/* Icon */}
          <div className="my-auto flex flex-1 items-center justify-center">
            {isUnlocked
              ? <div className="drop-shadow-sm">{getElementIcon(card.element.id, compact ? 26 : 40)}</div>
              : <Lock className="text-white/40" size={compact ? 18 : 28} />
            }
          </div>

          {/* Bottom: name + stats */}
          <div className="mt-auto space-y-1">
            {isUnlocked && (
              <p className={`line-clamp-2 text-center text-[9px] font-black leading-tight ${tc.text}`}>{card.name}</p>
            )}
            <div className={`flex items-center justify-center gap-1 rounded-lg py-0.5 ${isUnlocked ? "bg-white/15" : "bg-white/5"}`}>
              <span className="text-[8px] font-black text-red-200">ATK {card.atk}</span>
              <span className="text-white/20">·</span>
              <span className="text-[8px] font-black text-emerald-200">HP {card.hp}</span>
            </div>
          </div>
        </div>

        {/* Shimmer for legendary */}
        {isUnlocked && r.hasShimmer && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-xl">
            <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2.5, repeat: Infinity }}
              style={{ width: "35%", transform: "skewX(-20deg)" }} />
          </div>
        )}

        {/* Locked overlay */}
        {!isUnlocked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="text-[8px] font-bold uppercase tracking-widest text-white/30">Khóa</span>
          </div>
        )}
      </motion.button>
    );
  }

  return (
    <div className="flex h-full max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* ── COMPACT HEADER ── */}
      <div className="flex-shrink-0 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone="accent">Thẻ bài</Badge>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">EXP</p>
              <p className="text-lg font-black leading-none text-indigo-600">{points}</p>
            </div>
          </div>
        </div>

        {/* Compact stats row */}
        <div className="mt-2 flex items-center gap-3 overflow-x-auto text-xs">
          <span className="flex-shrink-0 text-slate-500">{collectedCount}/{totalCards} thẻ</span>
          <span className="flex-shrink-0 font-bold text-amber-600">
            <TrendingUp size={10} className="inline" /> {collectionPower} PWR
          </span>
          <span className="flex-shrink-0 text-slate-400">·</span>
          <span className="flex-shrink-0 font-bold text-blue-600">Cấp {Object.values(cardLevels).filter((l) => (l as number) > 1).length} thẻ</span>
          {fuseableCount > 0 && (
            <span className="flex-shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-purple-700 font-bold">
              <GitMerge size={10} className="inline" /> {fuseableCount} hợp nhất
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-1 overflow-x-auto pb-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                activeSection === tab.id
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto thin-scrollbar">

        {/* ─── COLLECTION ─── */}
        {activeSection === "collection" && (
          <div className="space-y-3 p-4">
            {/* Filter + sort bar */}
            <div className="flex flex-wrap items-center gap-2">
              {["all", "common", "rare", "epic", "legendary"].map((f) => (
                <button key={f} onClick={() => setFilterRarity(f)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                    filterRarity === f ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {f === "all" ? "Tất cả" : RARITIES.find((r) => r.id === f)?.name}
                </button>
              ))}
              <button onClick={() => setShowLocked(!showLocked)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${showLocked ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                <Lock size={10} className="inline mr-1" />{showLocked ? "Ẩn khóa" : "Hiện khóa"}
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="ml-auto rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 outline-none focus:border-indigo-400"
              >
                <option value="power">PWR</option>
                <option value="atk">ATK</option>
                <option value="hp">HP</option>
              </select>
            </div>

            {/* Results count */}
            <p className="text-xs text-slate-400">{displayCards.length} thẻ · {collectedCount} đã mở</p>

            {/* Grid */}
            {displayCards.length === 0 ? (
              <EmptyState icon={<Library size={40} className="text-slate-300" />}
                title="Không có thẻ" subtitle="Thử bộ lọc khác." />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {displayCards.map((card) => (
                  <GameCard key={card.id} card={card} count={getCardCount(card.id)} onClick={() => setViewingCard(card)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── FUSION ─── */}
        {activeSection === "fusion" && (
          <div className="space-y-3 p-4">
            {fuseMsg && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={`rounded-xl border px-4 py-2.5 text-sm font-bold ${
                  fuseMsg.includes("thành công") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                }`}>
                {fuseMsg}
              </motion.div>
            )}

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {unlockedCards
                .filter((id) => getCardCount(id) >= 3)
                .map((id) => {
                  const card = ALL_CARDS.find((c) => c.id === id)!;
                  const count = getCardCount(id);
                  const xpGain = getFusedXp(card.atk + card.hp);
                  return (
                    <div key={id} className={`relative flex flex-col items-center rounded-xl border-2 p-3 text-center ${card.rarity.border} ${card.rarity.bgGradient}`}>
                      {getElementIcon(card.element.id, 30)}
                      <p className="mt-1 text-[9px] font-black line-clamp-1">{card.name}</p>
                      <p className="text-[9px] text-slate-500">x{count}</p>
                      <div className="mt-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-white">+{xpGain} EXP</div>
                      <Button onClick={() => handleFuse(id)} disabled={fusing} loading={fusing}
                        size="sm" variant="secondary" className="mt-2 w-full text-[10px] py-1">
                        <GitMerge size={10} />Hợp nhất
                      </Button>
                    </div>
                  );
                })}
            </div>

            {unlockedCards.filter((id) => getCardCount(id) >= 3).length === 0 && (
              <EmptyState icon={<GitMerge size={40} className="text-slate-300" />}
                title="Chưa có thẻ hợp nhất" subtitle="Cần 3 bản sao trở lên." />
            )}
          </div>
        )}

        {/* ─── LEVEL UP ─── */}
        {activeSection === "levelup" && (
          <div className="space-y-3 p-4">
            {levelupMsg && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={`rounded-xl border px-4 py-2.5 text-sm font-bold ${
                  levelupMsg.includes("Lên cấp") ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700"
                }`}>
                {levelupMsg}
              </motion.div>
            )}

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {unlockedCards.map((id) => {
                const card = ALL_CARDS.find((c) => c.id === id)!;
                const level = getCardLevel(id);
                const nextLevel = level + 1;
                const xpCost = getXpForLevel(nextLevel);
                const hasXp = (points || 0) >= xpCost;
                const isMax = level >= 5;

                return (
                  <div key={id} className={`relative flex flex-col items-center rounded-xl border p-2.5 text-center ${isMax ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
                    {level > 1 && (
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-white shadow">
                        <ArrowUp size={6} className="inline" />Lv{level}
                      </div>
                    )}
                    {getElementIcon(card.element.id, 28)}
                    <p className="mt-1 text-[9px] font-black line-clamp-1">{card.name}</p>
                    <p className="text-[8px] text-slate-400">ATK {card.atk} · HP {card.hp}</p>
                    {isMax ? (
                      <div className="mt-1 rounded-full bg-amber-200 px-2 py-0.5 text-[8px] font-black text-amber-800">Cấp tối đa</div>
                    ) : (
                      <>
                        <div className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">{xpCost} EXP</div>
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

            {unlockedCards.length === 0 && (
              <EmptyState icon={<ArrowUp size={40} className="text-slate-300" />}
                title="Chưa có thẻ nào" subtitle="Mở gói để bắt đầu." />
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
            <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs text-slate-400">EXP hiện có</p>
              <p className="text-3xl font-black text-indigo-600">{points}</p>
              <Button onClick={handlePullGacha} disabled={points < PULL_COST || isPulling}
                loading={isPulling} size="lg" className="mt-3 w-full" variant="secondary">
                <Sparkles size={16} />
                {points < PULL_COST ? `Cần ${PULL_COST} EXP` : isPulling ? "Đang mở..." : `Mở gói (${PULL_COST} EXP)`}
              </Button>
            </div>
            {/* Rarity summary */}
            <div className="grid w-full max-w-xs grid-cols-4 gap-2">
              {RARITIES.map((r) => (
                <div key={r.id} className={`rounded-xl border p-2 text-center ${r.borderStyle} ${r.bgGradient}`}>
                  <div className="flex justify-center gap-0.5">
                    {Array.from({ length: r.starCount }).map((_, i) => (
                      <svg key={i} width="8" height="8" viewBox="0 0 8 8" fill={r.frameAccent}>
                        <path d="M4 0l1.2 2.4L8 2.8 6 4.6l.5 2.9L4 6l-2.5 1.5.5-2.9L0 2.8l2.8-.4z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] font-bold" style={{ color: r.frameAccent }}>{countByRarity(r.id)}</p>
                </div>
              ))}
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
                  <span className="text-xs font-bold text-amber-600"><TrendingUp size={10} className="inline" /> {deckPower} PWR</span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: DECK_SIZE }).map((_, i) => {
                  const card = deckCards[i];
                  return card ? (
                    <div key={i} className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden ${card.rarity.border} ${card.rarity.glowColor}`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${card.rarity.bgGradient}`} />
                      <div className="relative z-10 flex h-full flex-col items-center justify-center p-1">
                        {getElementIcon(card.element.id, 20)}
                        <p className="mt-0.5 text-[7px] font-black leading-tight line-clamp-1" style={{ color: card.rarity.frameAccent }}>
                          {card.name.split(" ")[0]}
                        </p>
                      </div>
                      <button onClick={() => setDeck((d) => d.filter((id) => id !== card.id))}
                        className="absolute -right-1 -top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600">
                        <X size={8} />
                      </button>
                    </div>
                  ) : (
                    <div key={i} className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                      <span className="text-slate-300 text-lg">+</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card picker */}
            <div>
              <h4 className="mb-2 font-black text-sm text-slate-800">Chọn thẻ</h4>
              <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto thin-scrollbar pr-1">
                {unlockedCards.map((id) => {
                  const card = ALL_CARDS.find((c) => c.id === id)!;
                  const inDeck = deck.includes(id);
                  const power = calcPower(card, getCardLevel(id));
                  return (
                    <button key={id}
                      onClick={() => inDeck ? setDeck((d) => d.filter((x) => x !== id)) : deck.length < DECK_SIZE ? setDeck((d) => [...d, id]) : null}
                      className={`relative rounded-xl border-2 p-1.5 text-center transition-all ${inDeck ? `${card.rarity.border} ${card.rarity.glowColor} ring-2 ring-amber-400` : "border-slate-200 hover:border-slate-300"}`}>
                      {inDeck && (
                        <div className="absolute -left-0.5 -top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white">
                          <span className="text-[7px] font-black">✓</span>
                        </div>
                      )}
                      {getElementIcon(card.element.id, 22)}
                      <p className="text-[7px] font-black leading-tight line-clamp-1 mt-0.5">{card.name.split(" ")[0]}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Element counter */}
            <div className={`rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-3 ${activeSection === "battle" ? "" : "hidden"}`}>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Hệ tương khắc</p>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                {ELEMENTS.map((el) => {
                  const adv = Object.entries({ plastic: "organic", organic: "hazard", hazard: "plastic", paper: "plastic", metal: "paper", glass: "metal" }).find(([, v]) => v === el.id)?.[0];
                  const dis = { plastic: "organic", organic: "hazard", hazard: "plastic", paper: "plastic", metal: "paper", glass: "metal" }[el.id] as string;
                  return (
                    <div key={el.id} className="flex items-center gap-1 rounded-lg bg-white/5 p-1.5">
                      <div className="flex-shrink-0">{getElementIcon(el.id, 18)}</div>
                      <div className="space-y-0.5 min-w-0">
                        {adv && (
                          <div className="flex items-center gap-0.5 text-[8px] text-emerald-400">
                            <span>+</span>
                            <span className="truncate">{ELEMENTS.find((e) => e.id === adv)?.name}</span>
                          </div>
                        )}
                        {dis && (
                          <div className="flex items-center gap-0.5 text-[8px] text-red-400">
                            <span>-</span>
                            <span className="truncate">{ELEMENTS.find((e) => e.id === dis)?.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
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
          <ModalShell onClose={() => setViewingCard(null)} className="max-w-xs overflow-hidden p-0">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="relative">
              <button onClick={() => setViewingCard(null)}
                className="absolute -right-2 -top-2 z-20 rounded-full bg-white p-2 text-slate-500 shadow-lg hover:bg-slate-100 hover:text-slate-800">
                <X size={16} />
              </button>

              <div className={`overflow-hidden rounded-2xl ${viewingCard.rarity.glowColor} ${viewingCard.rarity.border}`}>
                <div className={`p-1 bg-gradient-to-br ${viewingCard.rarity.bgGradient}`}>
                  <div className="relative z-10 rounded-xl bg-white/95 p-4 backdrop-blur-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{viewingCard.id}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: viewingCard.rarity.starCount }).map((_, i) => (
                          <svg key={i} width="9" height="9" viewBox="0 0 8 8" fill={viewingCard.rarity.frameAccent}>
                            <path d="M4 0l1.2 2.4L8 2.8 6 4.6l.5 2.9L4 6l-2.5 1.5.5-2.9L0 2.8l2.8-.4z" />
                          </svg>
                        ))}
                        <Badge tone={viewingCard.rarity.badgeTone as any}>{viewingCard.rarity.name}</Badge>
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="flex justify-center my-3">{getElementIcon(viewingCard.element.id, 56)}</div>

                    {/* Name */}
                    <p className="text-center text-base font-black text-slate-900">{viewingCard.name}</p>
                    <p className="text-center text-xs text-slate-400 mt-0.5">Hệ {viewingCard.element.name}</p>

                    {/* Stats */}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center rounded-xl bg-red-50 p-2">
                        <svg width="12" height="12" viewBox="0 0 10 10"><path d="M5 0L6.5 3.5L10 4 7.5 6.5 8 10 5 8 2 10l.5-3.5L0 4l3.5-.5z" fill="#ef4444" /></svg>
                        <p className="text-lg font-black text-red-600">{viewingCard.atk}</p>
                        <p className="text-[8px] font-bold uppercase text-red-400">ATK</p>
                      </div>
                      <div className="flex flex-col items-center rounded-xl bg-emerald-50 p-2">
                        <svg width="12" height="12" viewBox="0 0 10 10"><path d="M5 0C5 0 1 3 1 6a4 4 0 008 0C9 3 5 0 5 0z" fill="#22c55e" /></svg>
                        <p className="text-lg font-black text-emerald-600">{viewingCard.hp}</p>
                        <p className="text-[8px] font-bold uppercase text-emerald-400">HP</p>
                      </div>
                      <div className="flex flex-col items-center rounded-xl bg-slate-100 p-2">
                        <TrendingUp size={12} className="text-slate-400" />
                        <p className="text-lg font-black text-slate-700">{calcPower(viewingCard, getCardLevel(viewingCard.id))}</p>
                        <p className="text-[8px] font-bold uppercase text-slate-400">PWR</p>
                      </div>
                    </div>

                    {/* Counter */}
                    {(() => {
                      const adv = Object.entries({ plastic: "organic", organic: "hazard", hazard: "plastic", paper: "plastic", metal: "paper", glass: "metal" }).find(([, v]) => v === viewingCard.element.id)?.[0];
                      const dis = ({ plastic: "organic", organic: "hazard", hazard: "plastic", paper: "plastic", metal: "paper", glass: "metal" } as Record<string, string>)[viewingCard.element.id];
                      return (
                        <div className="mt-2 flex gap-2">
                          {adv && (
                            <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1">
                              <span className="text-[9px] font-bold text-emerald-700">+</span>
                              {getElementIcon(adv, 14)}
                              <span className="text-[9px] font-bold text-emerald-700">+50%</span>
                            </div>
                          )}
                          {dis && (
                            <div className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-1">
                              <span className="text-[9px] font-bold text-red-700">-</span>
                              {getElementIcon(dis, 14)}
                              <span className="text-[9px] font-bold text-red-700">-25%</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Meta */}
                    {unlockedCards.includes(viewingCard.id) && (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                        <span>Cấp {getCardLevel(viewingCard.id)} · Sở hữu</span>
                        <span className="text-amber-600">x{getCardCount(viewingCard.id)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {unlockedCards.includes(viewingCard.id) && (
                <Button onClick={() => { setViewingCard(null); setActiveSection("battle"); }}
                  className="mt-3 w-full" size="md">
                  <Swords size={14} />Vào đội hình
                </Button>
              )}
            </motion.div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ── GACHA REVEAL ── */}
      <AnimatePresence>
        {(isPulling || gachaResult) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
            <div className="flex flex-col items-center">
              {isPulling && !gachaResult && (
                <motion.div animate={{ rotateY: 360, scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-56 w-44 items-center justify-center rounded-3xl border-4 border-indigo-300 bg-gradient-to-br from-indigo-600 to-purple-600 shadow-[0_0_60px_rgba(99,102,241,0.5)]">
                  <Sparkles size={48} className="animate-pulse text-white" />
                </motion.div>
              )}

              {gachaResult && !isPulling && (
                <motion.div className="flex flex-col items-center"
                  initial={{ scale: 0.7, y: 60, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ type: "spring", damping: 14, stiffness: 120 }}>
                  <h2 className={`mb-4 text-3xl font-black drop-shadow-lg ${
                    gachaResult.rarity.id === "legendary" ? "text-yellow-300"
                      : gachaResult.rarity.id === "epic" ? "text-purple-400"
                      : gachaResult.rarity.id === "rare" ? "text-blue-400"
                      : "text-emerald-400"
                  }`}>{gachaResult.rarity.name}!</h2>

                  <div className={`overflow-hidden rounded-2xl ${gachaResult.rarity.glowColor} ${gachaResult.rarity.border}`}>
                    <div className={`p-1 bg-gradient-to-br ${gachaResult.rarity.bgGradient}`}>
                      <div className="relative z-10 rounded-xl bg-white/95 p-5 text-center">
                        {gachaResult.rarity.hasShimmer && (
                          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-xl">
                            <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                              animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity }}
                              style={{ width: "35%", transform: "skewX(-20deg)" }} />
                          </div>
                        )}
                        <div className="mb-2 flex items-center justify-center">{getElementIcon(gachaResult.element.id, 52)}</div>
                        <p className="text-base font-black text-slate-900">{gachaResult.name}</p>
                        <div className="mt-3 flex justify-center gap-3">
                          <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-600">ATK {gachaResult.atk}</span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-600">HP {gachaResult.hp}</span>
                        </div>
                        <p className={`mt-2 text-xs font-bold ${gachaResult.isNew ? "text-amber-600" : "text-slate-400"}`}>
                          {gachaResult.isNew ? "Thẻ mới!" : "Bạn đã có thẻ này."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={() => setGachaResult(null)} className="mt-6" size="md" variant="ghost">
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
