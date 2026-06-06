import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Library, Layers, Lock, Swords, Zap, X, Wand2, Trophy,
  ChevronUp, ChevronDown, ArrowUp, Flame, Grid3X3, Sliders,
  Check, Info, RefreshCw, TrendingUp, Star, GitMerge, Shield,
} from "lucide-react";
import { UserProgress } from "../types";
import { ALL_CARDS, RARITIES, getElementIcon, ELEMENTS, getAdvantage, getDisadvantage, calcPower, getXpForLevel, getFusedXp } from "../lib/cards";
import { CardBattle } from "./CardBattle";
import { Badge, Button, Card, EmptyState, ModalShell, TabButton } from "../lib/ui";

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

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  const [fuseCardId, setFuseCardId] = useState<number | null>(null);
  const [fusing, setFusing] = useState(false);
  const [fuseMsg, setFuseMsg] = useState<string | null>(null);
  const [levelupTarget, setLevelupTarget] = useState<any>(null);
  const [levelingUp, setLevelingUp] = useState(false);
  const [levelupMsg, setLevelupMsg] = useState<string | null>(null);

  // ── Load card levels from server ──────────────────────────────────────────────
  const fetchCardLevels = useCallback(async () => {
    try {
      const res = await fetch(`/api/cards/levels/${userId}`, getAuthHeaders());
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") setCardLevels(data);
      }
    } catch {}
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
  const progressPercent = Math.round((collectedCount / totalCards) * 100);

  const totalPulls = progress
    ? (() => {
        let pulls = 0;
        const counts = progress.flashcardCounts || {};
        const read = progress.flashcardsRead || [];
        pulls += Object.values(counts).reduce((a: any, b: any) => Number(a) + Number(b), 0);
        for (const cardId of read) {
          if (!counts[cardId.toString()] && !counts[cardId as any]) pulls += 1;
        }
        return pulls;
      })()
    : 0;

  // ── Collection stats ─────────────────────────────────────────────────────────
  const collectionPower = unlockedCards.reduce((sum, id) => {
    const card = ALL_CARDS.find((c) => c.id === id);
    return sum + (card ? calcPower(card, getCardLevel(id)) : 0);
  }, 0);
  const maxPower = ALL_CARDS.reduce((sum, c) => sum + calcPower(c, 5), 0);
  const collectionRating = totalCards > 0 ? Math.round((collectionPower / maxPower) * 9999) : 0;

  const countByRarity = (rarityId: string) =>
    ALL_CARDS.filter((c) => c.rarity.id === rarityId && unlockedCards.includes(c.id)).length;

  // ── Gacha ───────────────────────────────────────────────────────────────────
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
          setGachaResult({
            ...clientCard,
            isNew: result.isNew,
            cardLevel: result.cardLevel || 1,
          });
          if (result.isNew) setUnlockedCards((prev) => [...prev, sc.id]);
        }
        if (result.success && onRefresh) onRefresh(result.progress);
        setIsPulling(false);
      })
      .catch(() => setIsPulling(false));
  };

  // ── Fusion ───────────────────────────────────────────────────────────────────
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
        setFuseMsg(`Hợp nhất thành công! +${data.xpGained} EXP`);
        if (onRefresh) onRefresh();
        fetchCardLevels();
        if (fuseCardId === cardId) setFuseCardId(null);
      } else {
        setFuseMsg(data.error || "Hợp nhất thất bại.");
      }
    } catch {
      setFuseMsg("Lỗi kết nối.");
    }
    setFusing(false);
    setTimeout(() => setFuseMsg(null), 4000);
  };

  // ── Level Up ─────────────────────────────────────────────────────────────────
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
        const updatedLevels = { ...cardLevels, [String(cardId)]: data.newLevel };
        setCardLevels(updatedLevels);
        setLevelupMsg(`Lên cấp ${data.newLevel}! -${data.xpCost} EXP`);
        if (onRefresh) onRefresh();
      } else {
        setLevelupMsg(data.error || "Lên cấp thất bại.");
      }
    } catch {
      setLevelupMsg("Lỗi kết nối.");
    }
    setLevelingUp(false);
    setTimeout(() => setLevelupMsg(null), 4000);
  };

  // ── Filter + sort cards ──────────────────────────────────────────────────────
  let displayCards = ALL_CARDS.filter((c) => filterRarity === "all" || c.rarity.id === filterRarity);
  if (!showLocked) displayCards = displayCards.filter((c) => unlockedCards.includes(c.id));
  displayCards = [...displayCards].sort((a, b) => {
    const la = getCardLevel(a.id), lb = getCardLevel(b.id);
    if (sortBy === "atk") return b.atk * lb - a.atk * la;
    if (sortBy === "hp") return b.hp * lb - a.hp * la;
    return calcPower(b, lb) - calcPower(a, la);
  });

  // Cards eligible for fusion (count >= 3)
  const fuseableCards = unlockedCards
    .map((id) => ({ id, count: getCardCount(id) }))
    .filter((c) => c.count >= 3)
    .map((c) => ({ ...ALL_CARDS.find((card) => card.id === c.id)!, count: c.count }));

  const rarityMeta = RARITIES.map((r) => ({
    id: r.id, label: r.name, tone: r.badgeTone as "default" | "accent" | "warning" | "success",
  }));

  // ── Deck ─────────────────────────────────────────────────────────────────────
  const deckCards = deck.map((id) => ALL_CARDS.find((c) => c.id === id)!).filter(Boolean);
  const deckPower = deckCards.reduce((sum, card) => sum + calcPower(card, getCardLevel(card.id)), 0);
  const canBattle = deck.length === DECK_SIZE;

  // ─────────────────────────────────────────────────────────────────────────────
  //   Card Frame Component
  // ─────────────────────────────────────────────────────────────────────────────
  function GameCard({ card, onClick, count, compact = false, selected = false, showPower = true }: {
    card: any; onClick?: () => void; count?: number; compact?: boolean; selected?: boolean; showPower?: boolean;
  }) {
    const isUnlocked = unlockedCards.includes(card.id);
    const level = getCardLevel(card.id);
    const power = calcPower(card, level);
    const r = card.rarity;

    return (
      <motion.button
        onClick={onClick}
        whileHover={isUnlocked ? { y: compact ? -4 : -8, scale: 1.05 } : {}}
        whileTap={isUnlocked ? { scale: 0.96 } : {}}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl text-left transition-shadow ${
          isUnlocked
            ? selected
              ? `${r.glowColor} ring-2 ring-offset-2 ring-offset-white ${r.borderColor}`
              : `${r.shadowColor} ${r.glowColor} hover:shadow-xl`
            : "opacity-45 grayscale"
        }`}
        style={{ aspectRatio: compact ? "3/4" : undefined }}
      >
        {/* Border */}
        <div className={`absolute inset-0 rounded-2xl ${r.borderStyle}`} />

        {/* Background */}
        <div className={`absolute inset-0 rounded-2xl ${isUnlocked ? `bg-gradient-to-br ${r.bgGradient}` : "bg-gradient-to-br from-slate-800 to-slate-900"}`} />

        {/* Level badge */}
        {isUnlocked && level > 1 && (
          <div className="absolute left-1.5 top-1.5 z-20 flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-white shadow">
            <ArrowUp size={7} />
            {level}
          </div>
        )}

        {/* Shimmer */}
        {isUnlocked && r.hasShimmer && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
            <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "40%", transform: "skewX(-20deg)" }}
            />
          </div>
        )}

        {/* Locked overlay */}
        {!isUnlocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2">
            <div className="rounded-full bg-white/10 p-3 backdrop-blur-sm"><Lock className="text-white/60" size={compact ? 20 : 28} /></div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Chưa mở khóa</span>
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col p-2.5">
          <div className="flex items-start justify-between">
            <div className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${isUnlocked ? r.bannerBg + " " + r.bannerText : "bg-white/10 text-white/50"}`}>
              {r.name}
            </div>
            {count != null && count > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-white shadow">
                ×{count}
              </span>
            )}
          </div>

          <div className="mt-1 flex gap-0.5">
            {Array.from({ length: r.starCount }).map((_, i) => (
              <svg key={i} width="7" height="7" viewBox="0 0 8 8" fill={isUnlocked ? r.frameAccent : "#6b7280"}>
                <path d="M4 0l1.2 2.4L8 2.8 6 4.6l.5 2.9L4 6l-2.5 1.5.5-2.9L0 2.8l2.8-.4z" />
              </svg>
            ))}
          </div>

          <div className="my-auto flex flex-1 items-center justify-center">
            {isUnlocked ? (
              <div className={`relative drop-shadow-xl ${compact ? "scale-75" : "scale-100"} transition-transform duration-300 group-hover:scale-110`}>
                {getElementIcon(card.element.id, compact ? 28 : 48)}
              </div>
            ) : (
              <div className="opacity-20">{getElementIcon(card.element.id, compact ? 24 : 40)}</div>
            )}
          </div>

          <div className="mt-auto space-y-1.5">
            {isUnlocked && (
              <p className={`line-clamp-1 text-center text-[10px] font-black leading-tight ${isUnlocked ? r.bannerText : "text-white/60"}`}>{card.name}</p>
            )}
            {isUnlocked && showPower && (
              <div className="flex items-center justify-center rounded-xl bg-white/20 px-2 py-1 backdrop-blur-sm">
                <TrendingUp size={8} className="mr-1 text-white/60" />
                <span className="text-[10px] font-black text-white/80">PWR {power}</span>
              </div>
            )}
            {isUnlocked && (
              <div className="flex items-center justify-between rounded-xl bg-white/10 px-1.5 py-1">
                <div className="flex items-center gap-0.5">
                  <svg width="8" height="8" viewBox="0 0 10 10"><path d="M5 0L6.5 3.5L10 4 7.5 6.5 8 10 5 8 2 10l.5-3.5L0 4l3.5-.5z" fill="#ef4444" /></svg>
                  <span className="text-[9px] font-black text-red-200">{card.atk}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <svg width="8" height="8" viewBox="0 0 10 10"><path d="M5 0C5 0 1 3 1 6a4 4 0 008 0C9 3 5 0 5 0z" fill="#22c55e" /></svg>
                  <span className="text-[9px] font-black text-emerald-200">{card.hp}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.button>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //   Element Counter Panel
  // ─────────────────────────────────────────────────────────────────────────────
  function ElementCounterPanel() {
    return (
      <Card className="rounded-[24px] border-0 bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
        <div className="mb-3 flex items-center gap-2">
          <Shield size={16} className="text-blue-400" />
          <h4 className="font-black text-sm">Hệ tương khắc</h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ELEMENTS.map((el) => {
            const adv = getAdvantage(el.id);
            const dis = getDisadvantage(el.id);
            const advEl = ELEMENTS.find((e) => e.id === adv);
            const disEl = ELEMENTS.find((e) => e.id === dis);
            return (
              <div key={el.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
                <div className="flex-shrink-0">{getElementIcon(el.id, 22)}</div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  {advEl && (
                    <div className="flex items-center gap-1 text-[9px] text-emerald-400">
                      <span className="font-bold">+</span>
                      <span className="truncate">{advEl.name}</span>
                      <span className="flex-shrink-0 text-emerald-500">+50%</span>
                    </div>
                  )}
                  {disEl && (
                    <div className="flex items-center gap-1 text-[9px] text-red-400">
                      <span className="font-bold">-</span>
                      <span className="truncate">{disEl.name}</span>
                      <span className="flex-shrink-0 text-red-500">-25%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Tấn công đúng hệ để nhận bonus sát thương.</p>
      </Card>
    );
  }

  return (
    <Card className="flex h-full max-h-[82vh] flex-col overflow-hidden rounded-[32px] p-0">
      {/* ── Header ── */}
      <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="accent">Card Universe</Badge>
            <h3 className="mt-3 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
              <Library className="text-indigo-500" /> Sưu tập thẻ
            </h3>
            <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
              <span>{collectedCount}/{totalCards} thẻ</span>
              <span className="flex items-center gap-1 text-amber-600">
                <TrendingUp size={12} />
                <span className="font-black">{collectionPower}</span> PWR
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-600">
                Rank {collectionRating}
              </span>
            </div>
          </div>
          <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-indigo-400">Hiện có</p>
            <p className="mt-1 text-2xl font-black text-indigo-600">
              {points} <span className="text-sm font-normal text-indigo-300">EXP</span>
            </p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto rounded-[24px] bg-slate-100 p-1 pb-1">
          {[
            { id: "collection" as Section, label: "Bộ sưu tập", icon: <Layers size={13} /> },
            { id: "fusion" as Section, label: "Hợp nhất", icon: <GitMerge size={13} />, badge: fuseableCards.length },
            { id: "levelup" as Section, label: "Lên cấp", icon: <ArrowUp size={13} /> },
            { id: "gacha" as Section, label: "Mở gói", icon: <Sparkles size={13} /> },
            { id: "battle" as Section, label: "Đấu trường", icon: <Swords size={13} /> },
          ].map((section) => (
            <TabButton
              key={section.id}
              active={activeSection === section.id}
              onClick={() => setActiveSection(section.id)}
              className="relative flex-shrink-0 gap-1.5 px-3 py-2.5 text-xs"
            >
              {section.icon}
              <span>{section.label}</span>
              {(section as any).badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-white shadow">
                  {(section as any).badge}
                </span>
              )}
            </TabButton>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="thin-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
        <AnimatePresence mode="wait">

          {/* ─── COLLECTION ─── */}
          {activeSection === "collection" && (
            <motion.div key="collection" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-3">

              {/* Stats overview */}
              <Card className="rounded-[24px] border-0 bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-black">{collectionPower}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/60">Tổng PWR</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black">{Math.round((collectionPower / maxPower) * 100)}%</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/60">Hoàn thành</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black">{collectedCount}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/60">Thẻ</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                  <motion.div className="h-full rounded-full bg-white"
                    initial={{ width: 0 }} animate={{ width: `${Math.round((collectionPower / maxPower) * 100)}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </Card>

              {/* Rarity progress */}
              <Card className="rounded-[24px] border-0 bg-[linear-gradient(140deg,#edf8f4,#f9fcfb)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black text-slate-900">Tiến độ theo độ hiếm</p>
                  <Badge tone="success">{progressPercent}%</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {RARITIES.map((r) => {
                    const total = ALL_CARDS.filter((c) => c.rarity.id === r.id).length;
                    const owned = countByRarity(r.id);
                    return (
                      <div key={r.id} className="flex flex-col items-center gap-1 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm">
                        <div className="flex gap-0.5">
                          {Array.from({ length: r.starCount }).map((_, i) => (
                            <svg key={i} width="9" height="9" viewBox="0 0 8 8" fill={r.frameAccent}>
                              <path d="M4 0l1.2 2.4L8 2.8 6 4.6l.5 2.9L4 6l-2.5 1.5.5-2.9L0 2.8l2.8-.4z" />
                            </svg>
                          ))}
                        </div>
                        <Badge tone={r.badgeTone as any}>{r.name}</Badge>
                        <p className="text-sm font-black text-slate-800">{owned}/{total}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Filter + Sort bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  <Button onClick={() => { setFilterRarity("all"); setShowLocked(false); }}
                    variant={filterRarity === "all" && !showLocked ? "secondary" : "ghost"} size="sm">Tất cả</Button>
                  {RARITIES.map((r) => (
                    <Button key={r.id} onClick={() => { setFilterRarity(r.id); setShowLocked(false); }}
                      variant={filterRarity === r.id ? "secondary" : "ghost"} size="sm">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: r.starCount }).map((_, i) => (
                          <svg key={i} width="7" height="7" viewBox="0 0 8 8" fill="currentColor">
                            <path d="M4 0l1.2 2.4L8 2.8 6 4.6l.5 2.9L4 6l-2.5 1.5.5-2.9L0 2.8l2.8-.4z" />
                          </svg>
                        ))}
                        {r.name}
                      </div>
                    </Button>
                  ))}
                  <Button onClick={() => setShowLocked(!showLocked)}
                    variant={showLocked ? "secondary" : "ghost"} size="sm">
                    <Lock size={11} />{showLocked ? "Ẩn khóa" : "Hiện khóa"}
                  </Button>
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                  <span>Sắp xếp:</span>
                  {[{ id: "power", label: "PWR" }, { id: "atk", label: "ATK" }, { id: "hp", label: "HP" }].map((s) => (
                    <button key={s.id} onClick={() => setSortBy(s.id as any)}
                      className={`rounded-lg px-2 py-1 transition-colors ${sortBy === s.id ? "bg-indigo-100 text-indigo-600" : "hover:bg-slate-100"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {displayCards.length === 0 ? (
                <EmptyState icon={<Library size={48} className="text-slate-300" />}
                  title="Không có thẻ nào" subtitle="Thử bộ lọc khác hoặc mở gói."
                  action={{ label: "Mở gói", onClick: () => setActiveSection("gacha") }} />
              ) : (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                  {displayCards.map((card) => (
                    <GameCard key={card.id} card={card} count={getCardCount(card.id)}
                      onClick={() => setViewingCard(card)} compact />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ─── FUSION ─── */}
          {activeSection === "fusion" && (
            <motion.div key="fusion" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-4">
              <Card className="rounded-[24px] border-0 bg-gradient-to-r from-purple-600 to-pink-600 p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/20 p-3">
                    <GitMerge size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black">Hợp nhất thẻ bài</h4>
                    <p className="text-sm text-white/70">Chọn 1 thẻ có từ 3 bản sao trở lên để hợp nhất thành EXP.</p>
                  </div>
                </div>
              </Card>

              {/* Fuse result message */}
              <AnimatePresence>
                {fuseMsg && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                      fuseMsg.includes("thành công") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                    }`}>
                    {fuseMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {fuseableCards.length === 0 ? (
                <EmptyState icon={<GitMerge size={48} className="text-slate-300" />}
                  title="Chưa có thẻ nào hợp nhất được"
                  subtitle="Thu thập 3 bản sao cùng một thẻ để mở khóa tính năng Hợp nhất."
                  action={{ label: "Mở gói ngay", onClick: () => setActiveSection("gacha") }} />
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {fuseableCards.length} thẻ có thể hợp nhất
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {fuseableCards.map((card) => {
                      const count = getCardCount(card.id);
                      const xpGain = getFusedXp(card.atk + card.hp);
                      const canFuse = count >= 3;
                      return (
                        <div key={card.id} className={`relative rounded-2xl border-2 p-3 text-center transition-all ${
                          canFuse ? "border-purple-300 bg-purple-50" : "border-slate-200 bg-white"
                        }`}>
                          <div className="mb-2 flex items-center justify-center">
                            {getElementIcon(card.element.id, 36)}
                          </div>
                          <p className="text-[10px] font-black text-slate-700 line-clamp-1">{card.name}</p>
                          <p className="mt-1 text-[9px] text-slate-400">x{count} bản sao</p>
                          <div className="mt-2 flex items-center justify-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700">
                            <Sparkles size={8} />
                            +{xpGain} EXP
                          </div>
                          <Button
                            onClick={() => handleFuse(card.id)}
                            disabled={!canFuse || fusing}
                            loading={fusing && fuseCardId === card.id}
                            size="sm"
                            className="mt-2 w-full"
                            variant={canFuse ? "secondary" : "ghost"}
                          >
                            <GitMerge size={11} />
                            Hợp nhất
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── LEVEL UP ─── */}
          {activeSection === "levelup" && (
            <motion.div key="levelup" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-4">
              <Card className="rounded-[24px] border-0 bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/20 p-3">
                    <ArrowUp size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black">Lên cấp thẻ bài</h4>
                    <p className="text-sm text-white/70">Chi EXP để tăng ATK & HP vĩnh viễn của thẻ.</p>
                  </div>
                </div>
              </Card>

              <AnimatePresence>
                {levelupMsg && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                      levelupMsg.includes("Lên cấp") ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700"
                    }`}>
                    {levelupMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {unlockedCards.length === 0 ? (
                <EmptyState icon={<ArrowUp size={48} className="text-slate-300" />}
                  title="Chưa có thẻ nào"
                  subtitle="Thu thập thẻ bài để bắt đầu lên cấp."
                  action={{ label: "Mở gói", onClick: () => setActiveSection("gacha") }} />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {unlockedCards.map((cardId) => {
                    const card = ALL_CARDS.find((c) => c.id === cardId)!;
                    const level = getCardLevel(cardId);
                    const nextLevel = level + 1;
                    const xpCost = getXpForLevel(nextLevel);
                    const newAtk = Math.floor(card.atk * (1 + (nextLevel - 1) * 0.15));
                    const newHp = Math.floor(card.hp * (1 + (nextLevel - 1) * 0.15));
                    const hasXp = (points || 0) >= xpCost;
                    const isMaxLevel = level >= 5;

                    return (
                      <div key={cardId} className={`relative rounded-2xl border p-3 text-center transition-all ${
                        isMaxLevel ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
                      }`}>
                        {level > 1 && (
                          <div className="absolute left-1.5 top-1.5 z-10 flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-white shadow">
                            <ArrowUp size={7} />{level}
                          </div>
                        )}
                        <div className="mb-1.5 flex items-center justify-center">
                          {getElementIcon(card.element.id, 32)}
                        </div>
                        <p className="text-[9px] font-black text-slate-700 line-clamp-1">{card.name}</p>
                        <p className="text-[8px] text-slate-400">
                          ATK {card.atk} → {newAtk} / HP {card.hp} → {newHp}
                        </p>
                        {isMaxLevel ? (
                          <div className="mt-2 flex items-center justify-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-[9px] font-black text-amber-800">
                            <Star size={8} />Cấp tối đa
                          </div>
                        ) : (
                          <>
                            <div className="mt-1.5 flex items-center justify-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700">
                              {xpCost} EXP
                            </div>
                            <Button
                              onClick={() => handleLevelUp(cardId)}
                              disabled={!hasXp || levelingUp}
                              loading={levelingUp && levelupTarget === cardId}
                              size="sm"
                              className="mt-1.5 w-full"
                              variant={hasXp ? "secondary" : "ghost"}
                            >
                              <ArrowUp size={10} />
                              Lên cấp
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ─── GACHA ─── */}
          {activeSection === "gacha" && (
            <motion.div key="gacha" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              className="flex flex-col items-center gap-5 text-center">
              <div className="rounded-full bg-indigo-50 p-5 text-indigo-400 shadow-sm">
                <Wand2 size={52} />
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-900">Mở gói thẻ may mắn</h4>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Dùng <span className="font-black text-indigo-600">{PULL_COST} EXP</span> để nhận ngẫu nhiên một thẻ mới hoặc nâng số lượng thẻ bạn đã có.
                </p>
              </div>

              <Card className="w-full max-w-sm rounded-[30px] p-6 text-center">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Điểm hiện có</p>
                <p className="mt-2 text-4xl font-black text-indigo-600">
                  {points} <span className="text-base font-normal text-slate-400">EXP</span>
                </p>
                <Button onClick={handlePullGacha} disabled={points < PULL_COST || isPulling}
                  loading={isPulling} size="lg" className="mt-5 w-full" variant="secondary">
                  <Sparkles size={18} />
                  {points < PULL_COST ? `Cần ${PULL_COST} EXP` : isPulling ? "Đang mở..." : `Mở gói (${PULL_COST} EXP)`}
                </Button>
              </Card>

              {/* Rarity odds */}
              <div className="w-full max-w-sm space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tỷ lệ rút thẻ</p>
                <div className="grid grid-cols-4 gap-2">
                  {RARITIES.map((r, idx) => {
                    const pct = idx === 0 ? `${Math.round(r.chance * 100)}%`
                      : `${Math.round((r.chance - (RARITIES[idx - 1]?.chance ?? 0)) * 100)}%`;
                    return (
                      <div key={r.id} className="flex flex-col items-center gap-1 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                        <div className="flex gap-0.5">
                          {Array.from({ length: r.starCount }).map((_, i) => (
                            <svg key={i} width="9" height="9" viewBox="0 0 8 8" fill={r.frameAccent}>
                              <path d="M4 0l1.2 2.4L8 2.8 6 4.6l.5 2.9L4 6l-2.5 1.5.5-2.9L0 2.8l2.8-.4z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: r.frameAccent }}>{pct}</span>
                        <p className="text-[9px] font-semibold text-slate-400">{r.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid w-full max-w-sm grid-cols-2 gap-3 sm:grid-cols-4">
                {RARITIES.map((r) => (
                  <Card key={r.id} className="rounded-[22px] px-4 py-3 text-center">
                    <Badge tone={r.badgeTone as any}>{r.name}</Badge>
                    <p className="mt-2 text-xl font-black text-slate-800">{countByRarity(r.id)}</p>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── BATTLE ─── */}
          {activeSection === "battle" && (
            <motion.div key="battle" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              className="flex flex-col gap-4">
              <Card className="rounded-[24px] border-0 bg-gradient-to-r from-red-500 to-orange-500 p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/20 p-3">
                    <Swords size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black">Đấu Trường Sinh Thái</h4>
                    <p className="text-sm text-white/70">Chọn đội hình {DECK_SIZE} thẻ để tham chiến chiến dịch.</p>
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Deck builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-black text-slate-800">Đội hình của bạn</h5>
                    <span className="text-xs text-slate-400">{deck.length}/{DECK_SIZE} thẻ</span>
                  </div>

                  {/* Deck slots */}
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: DECK_SIZE }).map((_, i) => {
                      const card = deckCards[i];
                      return (
                        <div key={i} className={`relative aspect-[3/4] rounded-xl border-2 transition-all ${
                          card
                            ? `${card.rarity.borderColor} ${card.rarity.glowColor}`
                            : "border-dashed border-slate-300 bg-slate-50"
                        }`}>
                          {card ? (
                            <>
                              <div className={`absolute inset-0 rounded-lg bg-gradient-to-br ${card.rarity.bgGradient}`} />
                              <div className="relative z-10 flex h-full flex-col items-center justify-center p-1">
                                {getElementIcon(card.element.id, 22)}
                                <p className="mt-0.5 text-[7px] font-black text-center line-clamp-1 leading-tight" style={{ color: card.rarity.frameAccent }}>
                                  {card.name.split(" ")[0]}
                                </p>
                              </div>
                              <button
                                onClick={() => setDeck((d) => d.filter((id) => id !== card.id))}
                                className="absolute -right-1 -top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                              >
                                <X size={10} />
                              </button>
                            </>
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <span className="text-lg text-slate-300">+</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {deck.length > 0 && (
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2 text-sm">
                      <span className="font-bold text-slate-500">Tổng PWR đội hình</span>
                      <span className="flex items-center gap-1 font-black text-slate-800">
                        <TrendingUp size={14} className="text-amber-500" />
                        {deckPower}
                      </span>
                    </div>
                  )}

                  <Button onClick={() => setShowBattle(true)} disabled={!canBattle} size="lg" className="w-full">
                    <Swords size={18} />
                    {canBattle ? "Xông trận!" : `Chọn ${DECK_SIZE - deck.length} thẻ nữa`}
                  </Button>
                </div>

                {/* Card picker */}
                <div className="space-y-2">
                  <h5 className="font-black text-slate-800">Chọn thẻ tham gia đội hình</h5>
                  <div className="thin-scrollbar grid max-h-[340px] grid-cols-4 gap-2 overflow-y-auto pr-1">
                    {unlockedCards.map((cardId) => {
                      const card = ALL_CARDS.find((c) => c.id === cardId)!;
                      const isInDeck = deck.includes(cardId);
                      const power = calcPower(card, getCardLevel(cardId));
                      return (
                        <button key={cardId}
                          onClick={() => {
                            if (isInDeck) setDeck((d) => d.filter((id) => id !== cardId));
                            else if (deck.length < DECK_SIZE) setDeck((d) => [...d, cardId]);
                          }}
                          className={`relative overflow-hidden rounded-xl border-2 p-1.5 text-center transition-all ${
                            isInDeck
                              ? `${card.rarity.borderColor} ${card.rarity.glowColor} ring-2 ring-offset-1 ring-amber-400`
                              : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                          }`}>
                          {isInDeck && (
                            <div className="absolute left-0.5 top-0.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-white shadow">
                              <Check size={8} />
                            </div>
                          )}
                          <div className="flex items-center justify-center">{getElementIcon(card.element.id, 22)}</div>
                          <p className="mt-0.5 text-[7px] font-black leading-tight text-slate-600 line-clamp-1">{card.name.split(" ")[0]}</p>
                          <p className="text-[7px] font-bold text-amber-600">PWR {power}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <ElementCounterPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Card Detail Modal ── */}
      <AnimatePresence>
        {viewingCard && (
          <ModalShell onClose={() => setViewingCard(null)} className="max-w-sm overflow-hidden bg-transparent p-0 shadow-none">
            <motion.div initial={{ scale: 0.85, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 30, opacity: 0 }} transition={{ type: "spring", stiffness: 280, damping: 22 }} className="relative">
              <button onClick={() => setViewingCard(null)}
                className="absolute -right-2 -top-2 z-20 rounded-full bg-white p-2.5 text-slate-500 shadow-xl transition hover:bg-slate-100 hover:text-slate-800">
                <X size={18} />
              </button>

              <div className={`overflow-hidden rounded-[32px] shadow-2xl ${viewingCard.rarity.shadowColor} ${viewingCard.rarity.glowColor}`}>
                <div className={`p-1.5 bg-gradient-to-br ${viewingCard.rarity.bgGradient}`}>
                  <div className="relative overflow-hidden rounded-[26px] bg-white/95 backdrop-blur-sm">
                    {viewingCard.rarity.hasShimmer && (
                      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[26px]">
                        <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                          animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                          style={{ width: "40%", transform: "skewX(-20deg)" }} />
                      </div>
                    )}
                    <div className="relative z-10 p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          #{viewingCard.id.toString().padStart(3, "0")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {Array.from({ length: viewingCard.rarity.starCount }).map((_, i) => (
                              <svg key={i} width="10" height="10" viewBox="0 0 8 8" fill={viewingCard.rarity.frameAccent}>
                                <path d="M4 0l1.2 2.4L8 2.8 6 4.6l.5 2.9L4 6l-2.5 1.5.5-2.9L0 2.8l2.8-.4z" />
                              </svg>
                            ))}
                          </div>
                          <Badge tone={viewingCard.rarity.badgeTone as any}>{viewingCard.rarity.name}</Badge>
                        </div>
                      </div>

                      <div className="my-6 flex items-center justify-center drop-shadow-xl">
                        {getElementIcon(viewingCard.element.id, 72)}
                      </div>
                      <p className="text-center text-xl font-black text-slate-900">{viewingCard.name}</p>
                      <p className="mt-1 text-center text-xs text-slate-400">Hệ {viewingCard.element.name}</p>

                      <div className="mt-6 grid grid-cols-3 gap-3">
                        <div className="flex flex-col items-center gap-1 rounded-2xl bg-red-50 p-3">
                          <svg width="14" height="14" viewBox="0 0 10 10"><path d="M5 0L6.5 3.5L10 4 7.5 6.5 8 10 5 8 2 10l.5-3.5L0 4l3.5-.5z" fill="#ef4444" /></svg>
                          <p className="text-2xl font-black text-red-600">{viewingCard.atk}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-red-400">ATK</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-2xl bg-emerald-50 p-3">
                          <svg width="14" height="14" viewBox="0 0 10 10"><path d="M5 0C5 0 1 3 1 6a4 4 0 008 0C9 3 5 0 5 0z" fill="#22c55e" /></svg>
                          <p className="text-2xl font-black text-emerald-600">{viewingCard.hp}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">HP</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-2xl bg-amber-50 p-3">
                          <TrendingUp size={14} className="text-amber-500" />
                          <p className="text-2xl font-black text-amber-600">
                            {calcPower(viewingCard, getCardLevel(viewingCard.id))}
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400">PWR</p>
                        </div>
                      </div>

                      {/* Element counter */}
                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tương khắc</p>
                        <div className="flex items-center gap-4">
                          {(() => {
                            const adv = getAdvantage(viewingCard.element.id);
                            const dis = getDisadvantage(viewingCard.element.id);
                            const advEl = ELEMENTS.find((e) => e.id === adv);
                            const disEl = ELEMENTS.find((e) => e.id === dis);
                            return (
                              <>
                                {advEl && (
                                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5">
                                    <span className="text-sm">+</span>
                                    {getElementIcon(advEl.id, 18)}
                                    <span className="text-[10px] font-bold text-emerald-700">+50%</span>
                                  </div>
                                )}
                                {disEl && (
                                  <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5">
                                    <span className="text-sm">-</span>
                                    {getElementIcon(disEl.id, 18)}
                                    <span className="text-[10px] font-bold text-red-700">-25%</span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {unlockedCards.includes(viewingCard.id) && (
                        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <span className="text-xs font-bold text-slate-500">
                            Cấp {getCardLevel(viewingCard.id)} · Sở hữu ×{getCardCount(viewingCard.id)}
                          </span>
                          <span className="flex items-center gap-1 text-lg font-black text-amber-600">
                            <Sparkles size={14} className="text-amber-400" />
                            ×{getCardCount(viewingCard.id)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {unlockedCards.includes(viewingCard.id) && (
                <Button onClick={() => { setViewingCard(null); setActiveSection("battle"); }}
                  className="mt-4 w-full" size="lg">
                  <Swords size={18} />
                  Thêm vào đội hình
                </Button>
              )}
            </motion.div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ── Gacha Reveal Overlay ── */}
      <AnimatePresence>
        {(isPulling || gachaResult) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
            <div className="flex flex-col items-center">
              {isPulling && !gachaResult && (
                <motion.div animate={{ rotateY: 360, scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-64 w-48 items-center justify-center rounded-[32px] border-4 border-indigo-300 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_60px_rgba(99,102,241,0.6)]">
                  <motion.div animate={{ scale: [0.9, 1.1, 0.9] }} transition={{ duration: 1, repeat: Infinity }}>
                    <Sparkles size={56} className="animate-pulse text-white" />
                  </motion.div>
                </motion.div>
              )}

              {gachaResult && !isPulling && (
                <motion.div className="flex flex-col items-center"
                  initial={{ scale: 0.7, y: 60, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ type: "spring", damping: 14, stiffness: 120 }}>
                  <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
                    className="mb-6 text-center">
                    <h2 className={`text-4xl font-black drop-shadow-lg ${
                      gachaResult.rarity.id === "legendary" ? "text-yellow-300"
                        : gachaResult.rarity.id === "epic" ? "text-purple-400"
                        : gachaResult.rarity.id === "rare" ? "text-blue-400"
                        : "text-emerald-400"
                    }`}>
                      {gachaResult.rarity.name}!
                    </h2>
                    <p className={`mt-1 font-bold ${gachaResult.isNew ? "text-yellow-200" : "text-slate-400"}`}>
                      {gachaResult.isNew ? "Thẻ mới! Bạn đã thu thập được thẻ này." : "Bạn đã có thẻ này rồi."}
                    </p>
                  </motion.div>

                  <div className={`relative overflow-hidden rounded-[32px] shadow-2xl ${gachaResult.rarity.shadowColor} ${gachaResult.rarity.glowColor}`}>
                    <div className={`p-1.5 bg-gradient-to-br ${gachaResult.rarity.bgGradient}`}>
                      <div className="relative overflow-hidden rounded-[26px] bg-white/95 p-5 backdrop-blur-sm">
                        {gachaResult.rarity.hasShimmer && (
                          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[26px]">
                            <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                              animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              style={{ width: "40%", transform: "skewX(-20deg)" }} />
                          </div>
                        )}
                        <div className="relative z-10">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                              #{gachaResult.id.toString().padStart(3, "0")}
                            </span>
                            <Badge tone={gachaResult.isNew ? "warning" : gachaResult.rarity.badgeTone as any}>
                              {gachaResult.isNew ? "Mới thu thập" : "+1"}
                            </Badge>
                          </div>
                          <div className="my-5 flex items-center justify-center">{getElementIcon(gachaResult.element.id, 64)}</div>
                          <p className="text-center text-lg font-black text-slate-900">{gachaResult.name}</p>
                          <div className="mt-4 flex items-center justify-center gap-4">
                            <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2">
                              <svg width="12" height="12" viewBox="0 0 10 10"><path d="M5 0L6.5 3.5L10 4 7.5 6.5 8 10 5 8 2 10l.5-3.5L0 4l3.5-.5z" fill="#ef4444" /></svg>
                              <span className="text-base font-black text-red-600">ATK {gachaResult.atk}</span>
                            </div>
                            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2">
                              <svg width="12" height="12" viewBox="0 0 10 10"><path d="M5 0C5 0 1 3 1 6a4 4 0 008 0C9 3 5 0 5 0z" fill="#22c55e" /></svg>
                              <span className="text-base font-black text-emerald-600">HP {gachaResult.hp}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button onClick={() => setGachaResult(null)} className="mt-8" size="lg" variant="ghost">
                    {gachaResult.isNew ? "Thu thập" : "Đóng"}
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Battle overlay */}
      {showBattle && deck.length === DECK_SIZE && (
        <CardBattle
          deckCardIds={deck}
          onClose={() => setShowBattle(false)}
          onWin={(exp) => { onReward(exp); }}
        />
      )}
    </Card>
  );
}
