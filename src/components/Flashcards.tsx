import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Library, Layers, Lock, Swords, Shield, Zap, X, Wand2, Trophy } from "lucide-react";
import { UserProgress } from "../types";
import { ALL_CARDS, RARITIES } from "../lib/cards";
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
type Section = "collection" | "gacha" | "battle";

export function Flashcards({ onReward, onSpend, points = 0, userId, progress, onRefresh }: Props) {
  const [unlockedCards, setUnlockedCards] = useState<number[]>([]);
  const [gachaResult, setGachaResult] = useState<any>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [showBattle, setShowBattle] = useState(false);
  const [viewingCard, setViewingCard] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<Section>("collection");

  useEffect(() => {
    if (progress) {
      const readSet = new Set<number>(progress.flashcardsRead || []);
      if (progress.flashcardCounts) {
        Object.keys(progress.flashcardCounts).forEach((k) => readSet.add(Number(k)));
      }
      setUnlockedCards(Array.from(readSet));
    }
  }, [progress]);

  const getCardCount = (cardId: number) => {
    if (progress?.flashcardCounts?.[cardId.toString()]) return progress.flashcardCounts[cardId.toString()];
    if (progress?.flashcardsRead?.includes(cardId)) return 1;
    return 0;
  };

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
          if (!counts[cardId.toString()] && !counts[cardId as any]) {
            pulls += 1;
          }
        }
        return pulls;
      })()
    : 0;

  const countByRarity = (rarityName: string) =>
    ALL_CARDS.filter((c) => c.rarity.id === rarityName && unlockedCards.includes(c.id)).length;

  const handlePullGacha = () => {
    if (points < PULL_COST) return;
    setIsPulling(true);
    if (onSpend) onSpend(PULL_COST, "Mở Gói Thẻ Bài");

    fetch("/api/user-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: userId, type: "flashcard", data: null }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.card) {
          const serverCard = result.card;
          const clientCard =
            ALL_CARDS.find((c) => c.id === serverCard.id) || {
              id: serverCard.id,
              name: serverCard.name,
              element: {
                id: serverCard.elementId,
                name: serverCard.elementName,
                icon: serverCard.elementIcon,
              },
              rarity: {
                id: serverCard.rarityId,
                name: serverCard.rarityName,
              },
              hp: serverCard.hp,
              atk: serverCard.atk,
            };
          setGachaResult({ ...clientCard, isNew: result.isNew });
          if (result.isNew) {
            setUnlockedCards((prev) => [...prev, serverCard.id]);
          }
        }
        if (result.success && onRefresh) {
          onRefresh(result.progress);
        }
        setIsPulling(false);
      })
      .catch(() => {
        setIsPulling(false);
      });
  };

  const filteredCards = ALL_CARDS.filter((c) => filterRarity === "all" || c.rarity.id === filterRarity);
  const rarityMeta = [
    { id: "common", label: "Phổ thông", tone: "default" as const },
    { id: "rare", label: "Hiếm", tone: "accent" as const },
    { id: "epic", label: "Sử thi", tone: "warning" as const },
    { id: "legendary", label: "Huyền thoại", tone: "success" as const },
  ];

  return (
    <Card className="flex h-full max-h-[82vh] flex-col overflow-hidden rounded-[32px] p-0">
      <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-5 pb-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="accent">Card Universe</Badge>
            <h3 className="mt-3 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
              <Library className="text-indigo-500" /> Sưu tập thẻ
            </h3>
            <p className="mt-1 text-sm text-slate-500">Tổng lượt mở: {totalPulls} gói · Bộ sưu tập sinh thái của bạn.</p>
          </div>
          <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-indigo-400">Hiện có</p>
            <p className="mt-1 text-2xl font-black text-indigo-600">{points} <span className="text-sm">EXP</span></p>
          </div>
        </div>

        <div className="mt-5 flex gap-2 rounded-[24px] bg-slate-100 p-1">
          {[
            { id: "collection", label: "Bộ sưu tập", icon: <Layers size={14} /> },
            { id: "gacha", label: "Mở gói", icon: <Sparkles size={14} /> },
            { id: "battle", label: "Đấu trường", icon: <Swords size={14} /> },
          ].map((section) => (
            <TabButton key={section.id} active={activeSection === section.id} onClick={() => setActiveSection(section.id as Section)} className="flex-1 justify-center gap-2 py-3">
              {section.icon}
              <span>{section.label}</span>
            </TabButton>
          ))}
        </div>
      </div>

      <div className="thin-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
        <AnimatePresence mode="wait">
          {activeSection === "collection" && (
            <motion.div key="collection" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-4">
              <Card className="rounded-[28px] border-0 bg-[linear-gradient(140deg,#edf8f4,#f9fcfb)] p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-slate-900">Tiến độ bộ sưu tập</p>
                    <p className="text-xs text-slate-500">{collectedCount}/{totalCards} thẻ đã được mở khoá</p>
                  </div>
                  <Badge tone="success">{progressPercent}%</Badge>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-emerald-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {rarityMeta.map((rarity) => {
                    const total = ALL_CARDS.filter((c) => c.rarity.id === rarity.id).length;
                    return (
                      <div key={rarity.id} className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-center shadow-sm">
                        <Badge tone={rarity.tone}>{rarity.label}</Badge>
                        <p className="mt-2 text-sm font-black text-slate-800">{countByRarity(rarity.id)}/{total}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button onClick={() => setFilterRarity("all")} variant={filterRarity === "all" ? "secondary" : "ghost"} size="sm">Tất cả</Button>
                {RARITIES.map((r) => (
                  <Button key={r.id} onClick={() => setFilterRarity(r.id)} variant={filterRarity === r.id ? "secondary" : "ghost"} size="sm">
                    {r.name}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {filteredCards.map((card) => {
                  const isUnlocked = unlockedCards.includes(card.id);
                  const cardCount = getCardCount(card.id);
                  return (
                    <button
                      key={card.id}
                      onClick={() => setViewingCard(card)}
                      className={`group aspect-[2.5/3.5] overflow-hidden rounded-[24px] text-left transition-all duration-300 ${
                        isUnlocked ? `shadow-sm hover:-translate-y-1 hover:shadow-xl ${card.rarity.glow}` : "opacity-45 grayscale hover:opacity-70"
                      }`}
                    >
                      <div className={`relative h-full bg-gradient-to-br ${card.element.gradient} p-[3px]`}>
                        <div className="relative flex h-full flex-col rounded-[20px] bg-white/95 p-3 backdrop-blur-sm">
                          {isUnlocked && card.rarity.shiny && (
                            <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-br from-transparent via-white/40 to-transparent -translate-x-full" />
                          )}
                          {cardCount > 0 && (
                            <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black text-white shadow">
                              x{cardCount}
                            </span>
                          )}

                          <div className="mb-2 flex items-start justify-between text-[10px] font-black uppercase text-slate-400">
                            <span>#{card.id.toString().padStart(3, "0")}</span>
                            <span>{card.rarity.name}</span>
                          </div>

                          <div className="flex flex-1 items-center justify-center text-4xl drop-shadow-md">
                            {isUnlocked ? card.element.icon : <Lock size={24} className="text-slate-400" />}
                          </div>

                          {isUnlocked && (
                            <div className="mt-auto">
                              <p className={`line-clamp-1 text-sm font-black ${card.element.text}`}>{card.name}</p>
                              <div className="mt-2 flex gap-2 text-[10px] font-bold">
                                <span className="rounded-full bg-red-50 px-2 py-1 text-red-600">ATK {card.atk}</span>
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-600">HP {card.hp}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeSection === "gacha" && (
            <motion.div key="gacha" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="flex min-h-[440px] flex-col items-center justify-center gap-6 text-center">
              <div className="rounded-full bg-indigo-50 p-5 text-indigo-500 shadow-sm">
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
                <p className="mt-2 text-4xl font-black text-indigo-600">{points} <span className="text-base text-slate-400">EXP</span></p>
                <Button onClick={handlePullGacha} disabled={points < PULL_COST || isPulling} loading={isPulling} size="lg" className="mt-5 w-full" variant="secondary">
                  <Sparkles size={18} />
                  {points < PULL_COST ? `Cần ${PULL_COST} EXP` : isPulling ? "Đang mở..." : `Mở gói (${PULL_COST} EXP)`}
                </Button>
              </Card>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {rarityMeta.map((rarity) => (
                  <Card key={rarity.id} className="rounded-[22px] px-4 py-3 text-center">
                    <Badge tone={rarity.tone}>{rarity.label}</Badge>
                    <p className="mt-2 text-xl font-black text-slate-800">{countByRarity(rarity.id)}</p>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === "battle" && (
            <motion.div key="battle" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="flex min-h-[440px] flex-col justify-center">
              {unlockedCards.length === 0 ? (
                <EmptyState icon={<Swords size={48} className="text-slate-300" />} title="Chưa có thẻ nào để chiến đấu" subtitle="Mở gói để thu thập thẻ và mở khoá Đấu Trường Sinh Thái." action={{ label: "Mở gói ngay", onClick: () => setActiveSection("gacha") }} />
              ) : (
                <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 text-center">
                  <div className="rounded-full bg-red-50 p-5 text-red-500 shadow-sm">
                    <Trophy size={52} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900">Đấu Trường Sinh Thái</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Bạn đang sở hữu <span className="font-black text-slate-800">{unlockedCards.length}</span> thẻ. Chọn chiến dịch và đưa đội hình của bạn vào trận.
                    </p>
                  </div>
                  <Button onClick={() => setShowBattle(true)} size="lg" className="w-full max-w-xs">
                    <Swords size={18} />
                    Vào đấu trường
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {viewingCard && (
          <ModalShell onClose={() => setViewingCard(null)} className="max-w-sm overflow-hidden bg-transparent p-0 shadow-none">
            <motion.div initial={{ scale: 0.86, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.86, y: 24 }} className="relative">
              <button onClick={() => setViewingCard(null)} className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-2 text-slate-600 shadow-lg transition hover:bg-slate-100">
                <X size={18} />
              </button>

              <div className={`overflow-hidden rounded-[30px] shadow-2xl ${viewingCard.rarity.glow}`}>
                <div className={`bg-gradient-to-br ${viewingCard.element.gradient} p-1.5`}>
                  <div className="relative rounded-[24px] bg-white/95 p-5 backdrop-blur-sm">
                    {viewingCard.rarity.shiny && <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-br from-transparent via-white/50 to-transparent -translate-x-full" />}
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400">#{viewingCard.id.toString().padStart(3, "0")}</span>
                      <Badge tone="accent">{viewingCard.rarity.name}</Badge>
                    </div>
                    <div className="my-6 flex items-center justify-center text-8xl drop-shadow-xl">{viewingCard.element.icon}</div>
                    <p className={`text-center text-2xl font-black ${viewingCard.element.text}`}>{viewingCard.name}</p>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-red-50 p-3">
                        <Swords size={16} className="mx-auto mb-1 text-red-500" />
                        <p className="text-lg font-black text-red-600">{viewingCard.atk}</p>
                        <p className="text-[9px] font-bold uppercase text-red-400">ATK</p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 p-3">
                        <Shield size={16} className="mx-auto mb-1 text-emerald-500" />
                        <p className="text-lg font-black text-emerald-600">{viewingCard.hp}</p>
                        <p className="text-[9px] font-bold uppercase text-emerald-400">HP</p>
                      </div>
                      <div className="rounded-2xl bg-blue-50 p-3">
                        <Zap size={16} className="mx-auto mb-1 text-blue-500" />
                        <p className="text-sm font-black text-blue-600">{viewingCard.element.name}</p>
                        <p className="text-[9px] font-bold uppercase text-blue-400">Hệ</p>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
                      <span>Số lượng sở hữu</span>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">x{getCardCount(viewingCard.id) || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {unlockedCards.includes(viewingCard.id) && (
                <Button
                  onClick={() => {
                    setViewingCard(null);
                    setActiveSection("battle");
                    setShowBattle(true);
                  }}
                  className="mt-4 w-full"
                  size="lg"
                >
                  <Swords size={18} />
                  Vào đấu trường
                </Button>
              )}
            </motion.div>
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isPulling || gachaResult) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
            <div className="flex flex-col items-center">
              {isPulling && !gachaResult && (
                <motion.div
                  animate={{ rotateY: 360, scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-64 w-48 items-center justify-center rounded-[28px] border-4 border-indigo-300 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_50px_rgba(99,102,241,0.5)]"
                >
                  <Sparkles size={48} className="animate-pulse text-white" />
                </motion.div>
              )}

              {gachaResult && !isPulling && (
                <motion.div className="flex flex-col items-center" initial={{ scale: 0.8, y: 50, rotateY: 90 }} animate={{ scale: 1, y: 0, rotateY: 0 }} transition={{ type: "spring", damping: 15, stiffness: 100 }}>
                  <div className="mb-6 text-center">
                    <h2 className={`mb-2 text-3xl font-black drop-shadow-lg ${gachaResult.rarity.id === "legendary" ? "text-yellow-300" : gachaResult.rarity.id === "epic" ? "text-purple-400" : gachaResult.rarity.id === "rare" ? "text-blue-400" : "text-emerald-400"}`}>
                      {gachaResult.rarity.name}!
                    </h2>
                    <p className={`font-bold ${gachaResult.isNew ? "text-yellow-200" : "text-slate-400"}`}>{gachaResult.isNew ? "Bạn đã nhận được thẻ mới!" : "Bạn đã có thẻ này rồi."}</p>
                  </div>

                  <div className={`relative aspect-[2.5/3.5] w-64 overflow-hidden rounded-[28px] shadow-2xl ${gachaResult.rarity.glow}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${gachaResult.element.gradient} p-1.5`}>
                      <div className="relative flex h-full flex-col rounded-[22px] bg-white/95 p-4">
                        {gachaResult.rarity.shiny && <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-br from-transparent via-white/50 to-transparent -translate-x-full" />}
                        <div className="absolute right-2 top-2 z-10">
                          <Badge tone={gachaResult.isNew ? "warning" : "accent"}>{gachaResult.isNew ? "Mới" : "+1"}</Badge>
                        </div>
                        <div className="mb-2 flex justify-between text-xs font-black uppercase text-slate-400">
                          <span>#{gachaResult.id.toString().padStart(3, "0")}</span>
                          <span>{gachaResult.element.name}</span>
                        </div>
                        <div className="flex flex-1 items-center justify-center text-7xl drop-shadow-xl">{gachaResult.element.icon}</div>
                        <div className="mt-auto">
                          <div className={`mb-3 text-xl font-black ${gachaResult.element.text}`}>{gachaResult.name}</div>
                          <div className="flex gap-2 text-sm font-bold">
                            <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-red-600">ATK {gachaResult.atk}</span>
                            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-600">HP {gachaResult.hp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button onClick={() => setGachaResult(null)} className="mt-8" size="lg" variant="ghost">
                    {gachaResult.isNew ? "Thu nhận" : "Đóng"}
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showBattle && (
        <CardBattle
          unlockedCardIds={unlockedCards}
          onClose={() => setShowBattle(false)}
          onWin={(exp) => {
            onReward(exp);
          }}
        />
      )}
    </Card>
  );
}
