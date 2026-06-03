import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Library, Layers, Lock, Search, Filter, Swords, Shield, Zap, X, Info } from "lucide-react";
import { UserProgress } from "../types";
import { ALL_CARDS, TOTAL_CARDS, RARITIES } from "../lib/cards";
import { CardBattle } from "./CardBattle";
import { EmptyState } from "../lib/ui";

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
        Object.keys(progress.flashcardCounts).forEach(k => readSet.add(Number(k)));
      }
      setUnlockedCards(Array.from(readSet));
    }
  }, [progress]);

  const getCardCount = (cardId: number) => {
    // Firestore serializes Record<number, number> as Record<string, number>
    if (progress?.flashcardCounts?.[cardId.toString()]) return progress.flashcardCounts![cardId.toString()];
    if (progress?.flashcardsRead?.includes(cardId)) return 1;
    return 0;
  };

  const totalCards = 300;
  const collectedCount = unlockedCards.length;
  const progressPercent = Math.round((collectedCount / totalCards) * 100);
  
  const totalPulls = progress ? (() => {
    let pulls = 0;
    const counts = progress.flashcardCounts || {};
    const read = progress.flashcardsRead || [];
    pulls += Object.values(counts).reduce((a: any, b: any) => Number(a) + Number(b), 0);
    for (const cardId of read) {
      if (!counts[cardId.toString()] && !counts[cardId]) {
        pulls += 1;
      }
    }
    return pulls;
  })() : 0;

  const countByRarity = (rarityName: string) =>
    ALL_CARDS.filter(c => c.rarity.id === rarityName && unlockedCards.includes(c.id)).length;

  const cards = ALL_CARDS;

  const handlePullGacha = () => {
    if (points >= PULL_COST) {
      setIsPulling(true);
      if (onSpend) onSpend(PULL_COST, "Mở Gói Thẻ Bài");

      fetch('/api/user-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: userId, type: 'flashcard', data: null })
      })
        .then(res => res.json())
        .then(result => {
          if (result.success && result.card) {
            const serverCard = result.card;
            // Map server card format to client card format
            const clientCard = ALL_CARDS.find(c => c.id === serverCard.id) || {
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
            const newUnlocked = [...unlockedCards];
            if (result.isNew) {
              newUnlocked.push(serverCard.id);
              setUnlockedCards(newUnlocked);
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
    }
  };

  const filteredCards = cards.filter(c => filterRarity === "all" || c.rarity.id === filterRarity);

  return (
    <div className="bg-slate-50 rounded-2xl p-4 shadow-inner border border-slate-200 flex flex-col h-full max-h-[80vh]">
      <div className="flex items-center justify-between mb-3">
        <div>
           <h3 className="font-black text-slate-800 flex items-center gap-2 text-xl tracking-tight">
             <Library className="text-indigo-500" /> Sưu Tập Thẻ
           </h3>
           <p className="text-xs text-slate-500 font-medium">Tổng lượt mở: {totalPulls} gói</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-slate-200/60 rounded-xl p-1 mb-3">
        <button
          onClick={() => setActiveSection("collection")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSection === "collection"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers size={14} /> Bộ sưu tập
        </button>
        <button
          onClick={() => setActiveSection("gacha")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSection === "gacha"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles size={14} /> Mở gói
        </button>
        <button
          onClick={() => setActiveSection("battle")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSection === "battle"
              ? "bg-white text-red-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Swords size={14} /> Đấu trường
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSection === "collection" && (
          <motion.div
            key="collection"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
      {/* Collection Stats Panel */}
      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-gray-700">Bộ sưu tập: {collectedCount}/{totalCards} thẻ</span>
          <span className="text-xs font-bold text-emerald-600">{progressPercent}%</span>
        </div>
        <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
               style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex gap-2 mt-2 text-[10px]">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-gray-400 font-bold">Phổ thông</span>
            <span className="font-black text-gray-600">{countByRarity('common')}/{ALL_CARDS.filter(c => c.rarity.id === 'common').length}</span>
            <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gray-400 rounded-full transition-all" style={{ width: `${ALL_CARDS.filter(c => c.rarity.id === 'common').length > 0 ? (countByRarity('common') / ALL_CARDS.filter(c => c.rarity.id === 'common').length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-blue-500 font-bold">Hiếm</span>
            <span className="font-black text-blue-600">{countByRarity('rare')}/{ALL_CARDS.filter(c => c.rarity.id === 'rare').length}</span>
            <div className="w-12 h-1 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${ALL_CARDS.filter(c => c.rarity.id === 'rare').length > 0 ? (countByRarity('rare') / ALL_CARDS.filter(c => c.rarity.id === 'rare').length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-purple-500 font-bold">Sử thi</span>
            <span className="font-black text-purple-600">{countByRarity('epic')}/{ALL_CARDS.filter(c => c.rarity.id === 'epic').length}</span>
            <div className="w-12 h-1 bg-purple-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${ALL_CARDS.filter(c => c.rarity.id === 'epic').length > 0 ? (countByRarity('epic') / ALL_CARDS.filter(c => c.rarity.id === 'epic').length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-amber-500 font-bold">Huyền thoại</span>
            <span className="font-black text-amber-600">{countByRarity('legendary')}/{ALL_CARDS.filter(c => c.rarity.id === 'legendary').length}</span>
            <div className="w-12 h-1 bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${ALL_CARDS.filter(c => c.rarity.id === 'legendary').length > 0 ? (countByRarity('legendary') / ALL_CARDS.filter(c => c.rarity.id === 'legendary').length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-emerald-100 flex items-center justify-center">
          <span className="text-[10px] text-gray-500 font-bold">Tổng lượt mở gói: <span className="text-emerald-600">{totalPulls}</span> lần</span>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
         <button onClick={() => setFilterRarity("all")} className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterRarity === "all" ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Tất cả</button>
         {RARITIES.map(r => (
           <button key={r.id} onClick={() => setFilterRarity(r.id)} className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterRarity === r.id ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
             {r.name}
           </button>
         ))}
      </div>
          </motion.div>
        )}

        {activeSection === "gacha" && (
          <motion.div
            key="gacha"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col items-center justify-center gap-6 py-8"
          >
            <div className="text-center">
              <div className="text-6xl mb-4 drop-shadow-xl animate-pulse">
                <Sparkles size={80} className="text-indigo-400 fill-indigo-100" />
              </div>
              <h4 className="text-xl font-black text-slate-800 mb-2">Mở Gói Thẻ Bài</h4>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Dùng <span className="font-bold text-indigo-600">{PULL_COST} EXP</span> để mở một gói thẻ may mắn!
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center w-full max-w-xs">
              <p className="text-xs text-slate-400 font-bold mb-3 uppercase tracking-wide">Điểm hiện có</p>
              <p className="text-3xl font-black text-indigo-600">{points} <span className="text-sm font-bold text-slate-400">EXP</span></p>
              <button
                onClick={handlePullGacha}
                disabled={points < PULL_COST || isPulling}
                className={`mt-4 w-full py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                  points >= PULL_COST && !isPulling
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 active:scale-95"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Sparkles size={18} className={points >= PULL_COST && !isPulling ? "animate-pulse" : ""} />
                {points < PULL_COST ? `Cần ${PULL_COST} EXP` : isPulling ? "Đang mở..." : `Mở gói (${PULL_COST} EXP)`}
              </button>
            </div>

            <div className="flex gap-4 text-center">
              <div className="bg-orange-50 rounded-xl px-4 py-2 border border-orange-100">
                <p className="text-lg font-black text-orange-600">{countByRarity('legendary')}</p>
                <p className="text-[10px] text-orange-400 font-bold uppercase">Huyền thoại</p>
              </div>
              <div className="bg-purple-50 rounded-xl px-4 py-2 border border-purple-100">
                <p className="text-lg font-black text-purple-600">{countByRarity('epic')}</p>
                <p className="text-[10px] text-purple-400 font-bold uppercase">Sử thi</p>
              </div>
              <div className="bg-blue-50 rounded-xl px-4 py-2 border border-blue-100">
                <p className="text-lg font-black text-blue-600">{countByRarity('rare')}</p>
                <p className="text-[10px] text-blue-400 font-bold uppercase">Hiếm</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
                <p className="text-lg font-black text-slate-600">{countByRarity('common')}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Phổ thông</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === "battle" && (
          <motion.div
            key="battle"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {unlockedCards.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8">
                <EmptyState
                  icon={<Swords size={48} className="text-slate-300" />}
                  title="Chưa có thẻ nào"
                  subtitle="Mở gói thẻ để có thẻ chiến đấu!"
                  action={{ label: "Mở gói ngay", onClick: () => setActiveSection("gacha") }}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
                <div className="text-6xl drop-shadow-xl animate-pulse">
                  <Swords size={80} className="text-red-400" />
                </div>
                <h4 className="text-xl font-black text-slate-800">Đấu Trường Sinh Thái</h4>
                <p className="text-sm text-slate-500 text-center max-w-xs">
                  Bạn có <span className="font-bold text-slate-700">{unlockedCards.length}</span> thẻ. Sẵn sàng chiến đấu?
                </p>
                <button
                  onClick={() => setShowBattle(true)}
                  className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-red-500/30 active:scale-95 transition-all"
                >
                  VÀO ĐẤU TRƯỜNG
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Detail Modal */}
      <AnimatePresence>
        {viewingCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setViewingCard(null)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="relative w-full max-w-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setViewingCard(null)}
                className="absolute -top-3 -right-3 bg-white text-gray-600 p-2 rounded-full shadow-lg hover:bg-gray-100 z-10"
              >
                <X size={18} />
              </button>

              <div className={`rounded-2xl overflow-hidden shadow-2xl ${viewingCard.rarity.glow}`}>
                <div className={`bg-gradient-to-br ${viewingCard.element.gradient} p-1.5`}>
                  <div className="bg-white/95 rounded-xl p-5 relative overflow-hidden">
                    {viewingCard.rarity.shiny && (
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black uppercase text-slate-400">#{viewingCard.id.toString().padStart(3, '0')}</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{viewingCard.rarity.name}</span>
                    </div>

                    <div className="flex items-center justify-center text-8xl my-6 drop-shadow-xl">
                      {viewingCard.element.icon}
                    </div>

                    <div className={`text-xl font-black text-center mb-4 ${viewingCard.element.text}`}>
                      {viewingCard.name}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-red-50 rounded-xl p-3">
                        <Swords size={16} className="text-red-500 mx-auto mb-1" />
                        <p className="text-lg font-black text-red-600">{viewingCard.atk}</p>
                        <p className="text-[9px] text-red-400 font-bold uppercase">ATK</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3">
                        <Shield size={16} className="text-emerald-500 mx-auto mb-1" />
                        <p className="text-lg font-black text-emerald-600">{viewingCard.hp}</p>
                        <p className="text-[9px] text-emerald-400 font-bold uppercase">HP</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3">
                        <Zap size={16} className="text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-black text-blue-600">{viewingCard.element.name}</p>
                        <p className="text-[9px] text-blue-400 font-bold uppercase">He</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-amber-500">
                        <Sparkles size={12} /> {viewingCard.rarity.name}
                      </div>
                      {getCardCount(viewingCard.id) > 0 && (
                        <div className="bg-amber-400 text-white text-[10px] font-black px-2 py-1 rounded-full shadow">
                          x{getCardCount(viewingCard.id)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {unlockedCards.includes(viewingCard.id) && (
                <button
                  onClick={() => {
                    setViewingCard(null);
                    setActiveSection("battle");
                    setShowBattle(true);
                  }}
                  className="w-full mt-4 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black py-3 rounded-xl shadow-lg hover:shadow-red-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Swords size={18} /> Vào Đấu Trường
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card grid — only show when in collection tab */}
      <AnimatePresence>
        {activeSection === "collection" && (
          <motion.div
            key="card-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-y-auto bg-slate-100/50 rounded-xl p-3 border border-slate-200 shadow-inner align-content-start"
          >
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredCards.map(card => {
                const isUnlocked = unlockedCards.includes(card.id);
                const cardCount = getCardCount(card.id);
                return (
                  <div
                    key={card.id}
                    onClick={() => setViewingCard(card)}
                    className={`aspect-[2.5/3.5] rounded-xl relative overflow-hidden transition-all duration-300 ${isUnlocked ? 'cursor-pointer hover:scale-105 hover:-translate-y-1 shadow-sm hover:shadow-xl ' + card.rarity.glow : 'opacity-40 grayscale cursor-pointer hover:opacity-60'}`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.element.gradient} p-0.5`}>
                      <div className="w-full h-full bg-white/90 rounded-[10px] flex flex-col p-2 relative overflow-hidden backdrop-blur-sm">
                         {isUnlocked && card.rarity.shiny && (
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                         )}

                         {cardCount > 0 && (
                            <div className="absolute top-1 right-1 bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow z-10">
                              x{cardCount}
                            </div>
                         )}

                         <div className="flex justify-between items-start mb-1 text-[8px] font-black uppercase text-slate-400">
                            <span>#{card.id.toString().padStart(3, '0')}</span>
                            <span>{card.rarity.name.charAt(0)}</span>
                         </div>

                        <div className="flex-1 flex items-center justify-center text-3xl drop-shadow-md">
                           {isUnlocked ? card.element.icon : <Lock size={20} className="text-slate-400" />}
                        </div>

                        {isUnlocked && (
                          <div className="mt-auto">
                            <div className={`text-[9px] font-black leading-tight line-clamp-1 mb-1 ${card.element.text}`}>
                              {card.name}
                            </div>
                            <div className="flex gap-1 text-[8px] font-bold">
                              <span className="bg-red-50 text-red-600 px-1 rounded">ATK {card.atk}</span>
                              <span className="bg-green-50 text-green-600 px-1 rounded">HP {card.hp}</span>
                            </div>
                          </div>
                        )}
                     </div>
                   </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gacha Modal */}
      <AnimatePresence>
         {(isPulling || gachaResult) && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
               <div className="relative flex flex-col items-center">
                  {isPulling && !gachaResult && (
                    <motion.div 
                      animate={{ rotateY: 360, scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="w-48 h-64 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl border-4 border-indigo-300 shadow-[0_0_50px_rgba(99,102,241,0.5)] flex items-center justify-center"
                    >
                       <Sparkles size={48} className="text-white animate-pulse" />
                    </motion.div>
                  )}
                  
                  {gachaResult && !isPulling && (
                    <motion.div 
                      className="flex flex-col items-center"
                      initial={{ scale: 0.8, y: 50, rotateY: 90 }}
                      animate={{ scale: 1, y: 0, rotateY: 0 }}
                      transition={{ type: "spring", damping: 15, stiffness: 100 }}
                    >
                      <div className="mb-6 text-center">
                         <motion.h2
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className={`text-3xl font-black drop-shadow-lg mb-2 ${
                              gachaResult.rarity.id === 'legendary' ? 'text-yellow-300' :
                              gachaResult.rarity.id === 'epic' ? 'text-purple-400' :
                              gachaResult.rarity.id === 'rare' ? 'text-blue-400' : 'text-emerald-400'
                            }`}
                         >
                           {gachaResult.rarity.name}!
                         </motion.h2>
                         <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className={`font-bold ${
                              !unlockedCards.includes(gachaResult.id) ? 'text-yellow-200' : 'text-slate-400'
                            }`}
                         >
                           {!unlockedCards.includes(gachaResult.id)
                             ? 'Ban da nhan duoc the moi!'
                             : 'Ban da co the nay roi!'}
                         </motion.p>
                      </div>

                      <div className={`w-64 aspect-[2.5/3.5] rounded-2xl relative overflow-hidden shadow-2xl ${gachaResult.rarity.glow}`}>
                         <div className={`absolute inset-0 bg-gradient-to-br ${gachaResult.element.gradient} p-1.5`}>
                           <div className="w-full h-full bg-white/95 rounded-[12px] flex flex-col p-4 relative overflow-hidden">
                              {gachaResult.rarity.shiny && (
                                 <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                              )}

                              {!unlockedCards.includes(gachaResult.id) ? (
                                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                                  <Sparkles size={16} className="text-yellow-500 fill-yellow-300 animate-pulse" />
                                  <span className="text-[10px] font-black text-yellow-600">MOI!</span>
                                </div>
                              ) : (
                                <div className="absolute top-2 right-2 z-10">
                                  <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">+1</span>
                                </div>
                              )}

                              <div className="flex justify-between items-start mb-2 font-black uppercase text-slate-400">
                                 <span>#{gachaResult.id.toString().padStart(3, '0')}</span>
                                 <span>{gachaResult.element.name}</span>
                              </div>

                              <div className="flex-1 flex items-center justify-center text-7xl drop-shadow-xl animate-[bounce_2s_infinite]">
                                 {gachaResult.element.icon}
                              </div>

                              <div className="mt-auto">
                                <div className={`text-xl font-black leading-tight mb-3 ${gachaResult.element.text}`}>
                                  {gachaResult.name}
                                </div>
                                <div className="flex gap-2 font-bold text-sm">
                                  <span className="bg-red-50 border border-red-100 text-red-600 px-2 py-1 rounded">ATK {gachaResult.atk}</span>
                                  <span className="bg-green-50 border border-green-100 text-green-600 px-2 py-1 rounded">HP {gachaResult.hp}</span>
                                </div>
                              </div>
                           </div>
                         </div>
                      </div>

                      <motion.button
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 1 }}
                         onClick={() => setGachaResult(null)}
                         className="mt-8 bg-white hover:bg-slate-100 text-slate-900 px-8 py-3 rounded-full font-bold shadow-xl transition-all active:scale-95"
                      >
                        {unlockedCards.includes(gachaResult.id) ? 'Dong' : 'Thu nhan'}
                      </motion.button>
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
    </div>
  );
}
