import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Swords, Zap, X, Trophy, ChevronLeft, Info, Play } from "lucide-react";
import { ALL_CARDS, generateCard } from "../lib/cards";

interface Props {
  unlockedCardIds: number[];
  onClose: () => void;
  onWin: (exp: number) => void;
}

const CAMPAIGN_LEVELS = [
  { id: 1, name: "Cấp 1: Vùng Đất Rác Thiếc", bossId: 301, bossHpMult: 0.5, bossAtkMult: 0.5, reward: 20 },
  { id: 2, name: "Cấp 2: Đầm Lầy Nhựa Độc", bossId: 320, bossHpMult: 0.8, bossAtkMult: 0.8, reward: 50 },
  { id: 3, name: "Cấp 3: Núi Chế Phẩm Hữu Cơ", bossId: 350, bossHpMult: 1.2, bossAtkMult: 1.0, reward: 100 },
  { id: 4, name: "Cấp 4: Rừng Kim Loại Gỉ", bossId: 400, bossHpMult: 1.5, bossAtkMult: 1.5, reward: 200 },
  { id: 5, name: "Cấp 5: Lõi Lò Đốt Rác (Boss Cuối)", bossId: 500, bossHpMult: 2.5, bossAtkMult: 2.0, reward: 500 },
];

export function CardBattle({ unlockedCardIds, onClose, onWin }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [viewingCard, setViewingCard] = useState<any>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<number>(1);
  const [battleState, setBattleState] = useState<"card_select" | "level_select" | "intro" | "battling" | "won" | "lost">("card_select");
  
  const [playerCard, setPlayerCard] = useState<any>(null);
  const [bossCard, setBossCard] = useState<any>(null);
  
  const [playerHp, setPlayerHp] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [ultimateCharge, setUltimateCharge] = useState(0); // 0 to 100
  
  const [log, setLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<"player" | "boss">("player");
  
  const unlockedCards = ALL_CARDS.filter(c => unlockedCardIds.includes(c.id));
  
  const level = CAMPAIGN_LEVELS.find(l => l.id === selectedLevelId) || CAMPAIGN_LEVELS[0];

  const startBattle = () => {
    if (!selectedCardId) return;
    const pCard = ALL_CARDS.find(c => c.id === selectedCardId);
    if (!pCard) return;
    
    const bCard = generateCard(level.bossId);
    bCard.name = "Boss " + bCard.name;
    bCard.hp = Math.floor(pCard.hp * level.bossHpMult);
    bCard.atk = Math.floor(pCard.atk * level.bossAtkMult);
    
    setPlayerCard(pCard);
    setBossCard(bCard);
    setPlayerHp(pCard.hp);
    setBossHp(bCard.hp);
    setUltimateCharge(0);
    setTurn("player");
    
    setBattleState("intro");
    setTimeout(() => {
        setBattleState("battling");
        setLog(["Trận chiến bắt đầu! Lượt của bạn."]);
    }, 2000);
  };

  const handlePlayerAttack = (type: "normal" | "ultimate") => {
    if (turn !== "player" || battleState !== "battling") return;
    
    let dmg = Math.floor(playerCard.atk * (0.8 + Math.random() * 0.4));
    let logMsg = `Bạn tấn công gây ${dmg} sát thương!`;
    
    if (type === "ultimate") {
      dmg = Math.floor(playerCard.atk * 2.5);
      logMsg = `🔥 TUYỆT CHIÊU! Bạn giáng đòn sấm sét gây ${dmg} sát thương!`;
      setUltimateCharge(0);
    } else {
      setUltimateCharge(prev => Math.min(100, prev + 35));
    }
    
    setBossHp(prev => Math.max(0, prev - dmg));
    setLog(prev => [...prev.slice(-4), logMsg]);
    setTurn("boss");
  };
  
  useEffect(() => {
    if (battleState !== "battling") return;
    
    if (playerHp <= 0) {
        setBattleState("lost");
        return;
    }
    if (bossHp <= 0) {
        setBattleState("won");
        return;
    }
    
    if (turn === "boss") {
      const timer = setTimeout(() => {
          const dmg = Math.floor(bossCard.atk * (0.8 + Math.random() * 0.4));
          setPlayerHp(prev => Math.max(0, prev - dmg));
          setLog(prev => [...prev.slice(-4), `Boss phản công gây ${dmg} sát thương!`]);
          setTurn("player");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, battleState, playerHp, bossHp]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm p-4 flex flex-col pt-10">
      <button onClick={onClose} className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors z-50">
         <X size={24} />
      </button>

      {viewingCard && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-800 p-6 rounded-3xl max-w-sm w-full relative">
            <button onClick={() => setViewingCard(null)} className="absolute top-4 right-4 text-white p-2 bg-white/10 rounded-full"><X size={20}/></button>
            <div className={`h-48 rounded-2xl flex items-center justify-center bg-gradient-to-br ${viewingCard.element.gradient} mb-6`}>
              <span className="text-8xl">{viewingCard.element.icon}</span>
            </div>
            <h3 className="text-2xl font-black text-white text-center mb-2">{viewingCard.name}</h3>
            <p className={`text-center font-bold mb-6 ${viewingCard.rarity.border.replace('border-', 'text-')}`}>{viewingCard.rarity.name}</p>
            
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl">
              <div className="text-center">
                <Shield className="text-emerald-400 mx-auto mb-1" size={24}/>
                <p className="text-white font-bold text-xl">{viewingCard.hp}</p>
                <p className="text-xs text-slate-400 uppercase">HP</p>
              </div>
              <div className="text-center">
                <Swords className="text-blue-400 mx-auto mb-1" size={24}/>
                <p className="text-white font-bold text-xl">{viewingCard.atk}</p>
                <p className="text-xs text-slate-400 uppercase">Tấn Công</p>
              </div>
              <div className="text-center">
                <Zap className="text-yellow-400 mx-auto mb-1" size={24}/>
                <p className="text-white font-bold text-xl">{viewingCard.element.name}</p>
                <p className="text-xs text-slate-400 uppercase">Hệ</p>
              </div>
            </div>
            
            <button onClick={() => { setSelectedCardId(viewingCard.id); setViewingCard(null); setBattleState("level_select"); }} className="w-full mt-6 bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-400">
               Chọn Thẻ Này Đi Chiến
            </button>
          </motion.div>
        </div>
      )}

      {battleState === "card_select" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 w-full max-w-4xl mx-auto flex flex-col">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white tracking-tight uppercase [text-shadow:_0_2px_10px_rgb(0_0_0_/_40%)]">Đội Hình Của Bạn</h2>
            <p className="text-slate-300 mt-2">Chọn một Thẻ Bài mạnh nhất để tham gia chiến dịch</p>
          </div>
          
          <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar grid grid-cols-2 lg:grid-cols-4 gap-4 pb-20">
            {unlockedCards.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center text-center py-16 gap-4">
                  <div className="text-6xl opacity-40">🃏</div>
                  <div>
                    <p className="text-slate-300 font-bold text-lg">Chưa có thẻ bài nào!</p>
                    <p className="text-slate-500 text-sm mt-1">Thu thập thẻ bài để tham gia Đấu Trường</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-400 transition-colors"
                  >
                    Mở gói thẻ ngay
                  </button>
                </div>
            ) : (
                unlockedCards.map(card => (
                  <div key={card.id} className="relative group">
                    <div 
                      onClick={() => setViewingCard(card)}
                      className={`cursor-pointer rounded-2xl border-4 transition-all overflow-hidden bg-slate-800 border-slate-700 hover:border-slate-500`}
                    >
                      <div className={`h-28 flex items-center justify-center bg-gradient-to-br ${card.element.gradient}`}>
                         <span className="text-5xl">{card.element.icon}</span>
                      </div>
                      <div className="p-3">
                         <h3 className="font-bold text-white text-sm truncate">{card.name}</h3>
                         <div className="flex justify-between text-xs mt-2">
                             <span className="text-emerald-400 flex items-center gap-1"><Shield size={12}/>{card.hp}</span>
                             <span className="text-blue-400 flex items-center gap-1"><Swords size={12}/>{card.atk}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </motion.div>
      )}

      {battleState === "level_select" && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-center">
            <button onClick={() => setBattleState("card_select")} className="absolute top-4 left-16 bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 px-4 py-2 rounded-full transition-colors z-50">
               <ChevronLeft size={20}/> Chọn lại thẻ
            </button>
            <h2 className="text-3xl font-black text-white mb-8 uppercase">Chiến Dịch Lọc Rác</h2>
            <div className="w-full space-y-4">
              {CAMPAIGN_LEVELS.map(lvl => (
                <button 
                  key={lvl.id}
                  onClick={() => setSelectedLevelId(lvl.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedLevelId === lvl.id ? 'bg-slate-800 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}
                >
                  <div className="text-left">
                    <h3 className="font-bold text-white text-lg">{lvl.name}</h3>
                    <p className="text-slate-400 text-sm flex items-center gap-1"><Trophy size={14}/> Phần thưởng: {lvl.reward} EXP</p>
                  </div>
                  {selectedLevelId === lvl.id && (
                    <div className="bg-amber-500 text-white rounded-full p-2 animate-pulse"><Play size={20} className="ml-1"/></div>
                  )}
                </button>
              ))}
            </div>
            
            <button onClick={startBattle} className="w-full mt-10 bg-gradient-to-r from-red-500 to-rose-600 text-white py-4 rounded-xl font-black text-xl uppercase tracking-widest shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:scale-[1.02] active:scale-95 transition-all">
               Xông Trận!
            </button>
        </motion.div>
      )}

      {(battleState === "intro" || battleState === "battling" || battleState === "won" || battleState === "lost") && playerCard && bossCard && (
         <div className="flex-1 flex flex-col items-center justify-center relative w-full max-w-4xl mx-auto">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black italic text-amber-500/20 z-0 select-none">VS</div>

            <div className="flex flex-col md:flex-row items-center justify-between w-full h-full md:h-auto gap-8 z-10 px-4 mt-16 md:mt-0">
               {/* Boss side */}
               <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={`w-full max-w-[280px] bg-slate-800 rounded-3xl border-2 border-slate-600 overflow-hidden shadow-2xl relative ${turn === "boss" && battleState === "battling" ? "ring-4 ring-red-500/50" : ""}`}>
                 <div className="h-3 bg-slate-700">
                    <motion.div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${Math.max(0, (bossHp/bossCard.hp)*100)}%` }} />
                 </div>
                 <div className={`h-40 flex items-center justify-center bg-gradient-to-br ${bossCard.element.gradient}`}>
                    <span className="text-7xl opacity-80">{bossCard.element.icon}</span>
                 </div>
                 <div className="p-4 text-center">
                    <h3 className="font-black text-xl text-white tracking-tight">{bossCard.name}</h3>
                    <div className="mt-4 gap-4 flex justify-center">
                       <span className="text-red-400 font-bold flex items-center gap-1"><Shield size={16}/> {bossHp}/{bossCard.hp}</span>
                       <span className="text-blue-400 font-bold flex items-center gap-1"><Swords size={16}/> {bossCard.atk}</span>
                    </div>
                 </div>
               </motion.div>

               {/* Player side */}
               <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={`w-full max-w-[280px] bg-slate-800 rounded-3xl border-2 ${playerCard.rarity.border} overflow-hidden shadow-2xl relative ${turn === "player" && battleState === "battling" ? "ring-4 ring-blue-500/50" : ""}`}>
                 <div className="h-3 bg-slate-700">
                    <motion.div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${Math.max(0, (playerHp/playerCard.hp)*100)}%` }} />
                 </div>
                 <div className={`h-40 flex items-center justify-center bg-gradient-to-br ${playerCard.element.gradient}`}>
                    <span className="text-7xl">{playerCard.element.icon}</span>
                 </div>
                 <div className="p-4 text-center">
                    <h3 className="font-black text-xl text-white tracking-tight">{playerCard.name}</h3>
                    <div className="mt-4 gap-4 flex justify-center">
                       <span className="text-emerald-400 font-bold flex items-center gap-1"><Shield size={16}/> {playerHp}/{playerCard.hp}</span>
                       <span className="text-blue-400 font-bold flex items-center gap-1"><Swords size={16}/> {playerCard.atk}</span>
                    </div>
                 </div>
               </motion.div>
            </div>

            {/* Action Bar & Log */}
            <div className="w-full max-w-4xl mt-8 flex flex-col md:flex-row gap-4 px-4 pb-10 z-20">
               <div className="flex-1 bg-slate-800/80 rounded-2xl p-4 overflow-hidden h-32 flex flex-col justify-end border border-slate-700">
                 <AnimatePresence>
                   {log.map((l, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-slate-300 text-sm py-1 font-medium z-10">
                         {l}
                      </motion.div>
                   ))}
                 </AnimatePresence>
               </div>
               
               {turn === "player" && battleState === "battling" && (
                 <div className="w-full md:w-64 flex flex-col gap-2">
                    <button onClick={() => handlePlayerAttack("normal")} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
                       <Swords size={18}/> Đánh Thường
                    </button>
                    <div className="relative">
                      <button 
                         disabled={ultimateCharge < 100} 
                         onClick={() => handlePlayerAttack("ultimate")} 
                         className="w-full bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 hover:bg-amber-400 text-white font-black py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 overflow-hidden"
                      >
                         <Zap size={18}/> Tuyệt Chiêu Đục Phá
                        {ultimateCharge < 100 && (
                            <div className="absolute bottom-0 left-0 h-4 w-full bg-slate-900/70 rounded-b-xl overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all shadow-[0_0_8px_rgba(251,191,36,0.5)]" style={{ width: `${ultimateCharge}%` }} />
                            </div>
                         )}
                      </button>
                    </div>
                 </div>
               )}
            </div>
            
            {/* Results Overlay */}
            <AnimatePresence>
               {(battleState === "won" || battleState === "lost") && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
                   <div className="bg-slate-800 p-8 rounded-3xl text-center border-2 border-slate-700 shadow-2xl">
                      {battleState === "won" ? (
                         <>
                           <Trophy className="text-amber-400 mx-auto mb-4" size={64}/>
                           <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">Chiến Thắng!</h2>
                           <p className="text-emerald-400 font-bold mb-6">+{level.reward} Lõi Năng Lượng</p>
                           <button onClick={() => { onWin(level.reward); onClose(); }} className="bg-amber-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-amber-400 transition-colors">Nhận Thưởng</button>
                         </>
                      ) : (
                         <>
                           <div className="text-6xl mb-4">💀</div>
                           <h2 className="text-3xl font-black text-slate-300 mb-2 uppercase tracking-widest">Thất Bại</h2>
                           <p className="text-slate-500 font-bold mb-6">Thẻ của bạn chưa đủ mạnh hoặc xui xẻo.</p>
                           <button onClick={onClose} className="bg-slate-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-500 transition-colors">Rút Lui</button>
                         </>
                      )}
                   </div>
                 </motion.div>
               )}
            </AnimatePresence>
         </div>
      )}
    </div>
  );
}
