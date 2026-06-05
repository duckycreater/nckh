import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Swords, Zap, X, Trophy, ChevronLeft, Play, Sparkles } from "lucide-react";
import { ALL_CARDS, generateCard } from "../lib/cards";
import { Badge, Button, Card, EmptyState, ModalShell } from "../lib/ui";

interface Props {
  unlockedCardIds: number[];
  onClose: () => void;
  onWin: (exp: number) => void;
}

const CAMPAIGN_LEVELS = [
  { id: 1, name: "Vùng Đất Rác Thiếc", bossId: 301, bossHpMult: 0.5, bossAtkMult: 0.5, reward: 20 },
  { id: 2, name: "Đầm Lầy Nhựa Độc", bossId: 320, bossHpMult: 0.8, bossAtkMult: 0.8, reward: 50 },
  { id: 3, name: "Núi Chế Phẩm Hữu Cơ", bossId: 350, bossHpMult: 1.2, bossAtkMult: 1.0, reward: 100 },
  { id: 4, name: "Rừng Kim Loại Gỉ", bossId: 400, bossHpMult: 1.5, bossAtkMult: 1.5, reward: 200 },
  { id: 5, name: "Lõi Lò Đốt Rác", bossId: 500, bossHpMult: 2.5, bossAtkMult: 2.0, reward: 500 },
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
  const [ultimateCharge, setUltimateCharge] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<"player" | "boss">("player");

  const unlockedCards = ALL_CARDS.filter((c) => unlockedCardIds.includes(c.id));
  const level = CAMPAIGN_LEVELS.find((l) => l.id === selectedLevelId) || CAMPAIGN_LEVELS[0];

  const startBattle = () => {
    if (!selectedCardId) return;
    const pCard = ALL_CARDS.find((c) => c.id === selectedCardId);
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
    }, 1500);
  };

  const handlePlayerAttack = (type: "normal" | "ultimate") => {
    if (turn !== "player" || battleState !== "battling") return;

    let dmg = Math.floor(playerCard.atk * (0.8 + Math.random() * 0.4));
    let logMsg = `Bạn tấn công gây ${dmg} sát thương!`;

    if (type === "ultimate") {
      dmg = Math.floor(playerCard.atk * 2.5);
      logMsg = `Tuyệt chiêu! Bạn gây ${dmg} sát thương!`;
      setUltimateCharge(0);
    } else {
      setUltimateCharge((prev) => Math.min(100, prev + 35));
    }

    setBossHp((prev) => Math.max(0, prev - dmg));
    setLog((prev) => [...prev.slice(-4), logMsg]);
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
        setPlayerHp((prev) => Math.max(0, prev - dmg));
        setLog((prev) => [...prev.slice(-4), `Boss phản công gây ${dmg} sát thương!`]);
        setTurn("player");
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [turn, battleState, playerHp, bossHp, bossCard]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md p-4">
      <div className="mx-auto flex h-full max-w-6xl flex-col">
        <div className="mb-4 flex items-center justify-between">
          <Button onClick={onClose} variant="ghost" className="bg-white/10 text-white border-white/10 hover:bg-white/20">
            <X size={18} />
            Đóng đấu trường
          </Button>
          <Badge tone="warning">Đấu Trường Sinh Thái</Badge>
        </div>

        {viewingCard && (
          <ModalShell onClose={() => setViewingCard(null)} className="max-w-sm overflow-hidden p-0">
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-6">
              <button onClick={() => setViewingCard(null)} className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500">
                <X size={18} />
              </button>
              <div className={`mb-6 flex h-48 items-center justify-center rounded-[28px] bg-gradient-to-br ${viewingCard.element.gradient}`}>
                <span className="text-8xl">{viewingCard.element.icon}</span>
              </div>
              <h3 className="mb-2 text-center text-2xl font-black text-slate-900">{viewingCard.name}</h3>
              <p className="mb-6 text-center font-bold text-slate-500">{viewingCard.rarity.name}</p>
              <div className="grid grid-cols-3 gap-3 rounded-[24px] bg-slate-50 p-4">
                <div className="text-center">
                  <Shield className="mx-auto mb-1 text-emerald-400" size={22} />
                  <p className="text-xl font-black text-slate-800">{viewingCard.hp}</p>
                  <p className="text-[10px] uppercase text-slate-400">HP</p>
                </div>
                <div className="text-center">
                  <Swords className="mx-auto mb-1 text-blue-400" size={22} />
                  <p className="text-xl font-black text-slate-800">{viewingCard.atk}</p>
                  <p className="text-[10px] uppercase text-slate-400">ATK</p>
                </div>
                <div className="text-center">
                  <Zap className="mx-auto mb-1 text-amber-400" size={22} />
                  <p className="text-sm font-black text-slate-800">{viewingCard.element.name}</p>
                  <p className="text-[10px] uppercase text-slate-400">Hệ</p>
                </div>
              </div>
              <Button onClick={() => { setSelectedCardId(viewingCard.id); setViewingCard(null); setBattleState("level_select"); }} className="mt-6 w-full">
                Chọn thẻ này đi chiến
              </Button>
            </motion.div>
          </ModalShell>
        )}

        {battleState === "card_select" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-black tracking-tight text-white">Chọn đội hình của bạn</h2>
              <p className="mt-2 text-slate-300">Chọn thẻ mạnh nhất để tham gia chiến dịch.</p>
            </div>
            <div className="thin-scrollbar grid max-h-[72vh] grid-cols-2 gap-4 overflow-y-auto pr-1 lg:grid-cols-4">
              {unlockedCards.length === 0 ? (
                <div className="col-span-full py-16">
                  <EmptyState title="Chưa có thẻ bài nào" subtitle="Thu thập thẻ để mở khóa đấu trường." action={{ label: "Quay lại", onClick: onClose }} />
                </div>
              ) : (
                unlockedCards.map((card) => (
                  <button key={card.id} onClick={() => setViewingCard(card)} className="overflow-hidden rounded-[28px] border border-slate-700 bg-slate-900 text-left transition hover:-translate-y-1 hover:border-slate-500 hover:shadow-2xl">
                    <div className={`flex h-32 items-center justify-center bg-gradient-to-br ${card.element.gradient}`}>
                      <span className="text-5xl">{card.element.icon}</span>
                    </div>
                    <div className="p-4">
                      <h3 className="truncate font-bold text-white">{card.name}</h3>
                      <div className="mt-3 flex justify-between text-xs">
                        <span className="flex items-center gap-1 text-emerald-400"><Shield size={12} />{card.hp}</span>
                        <span className="flex items-center gap-1 text-blue-400"><Swords size={12} />{card.atk}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}

        {battleState === "level_select" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center">
            <Button onClick={() => setBattleState("card_select")} variant="ghost" className="mb-6 self-start bg-white/10 text-white border-white/10 hover:bg-white/20">
              <ChevronLeft size={18} />
              Chọn lại thẻ
            </Button>
            <h2 className="mb-8 text-4xl font-black text-white">Chọn chiến dịch</h2>
            <div className="w-full space-y-4">
              {CAMPAIGN_LEVELS.map((lvl) => (
                <button key={lvl.id} onClick={() => setSelectedLevelId(lvl.id)} className={`w-full rounded-[28px] border-2 p-5 text-left transition-all ${selectedLevelId === lvl.id ? "border-amber-400 bg-slate-900 shadow-[0_0_15px_rgba(251,191,36,0.15)]" : "border-slate-700 bg-slate-900/70 hover:bg-slate-900"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-white">{lvl.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">Phần thưởng: {lvl.reward} EXP</p>
                    </div>
                    {selectedLevelId === lvl.id && <div className="rounded-full bg-amber-500 p-3 text-white"><Play size={18} className="ml-0.5" /></div>}
                  </div>
                </button>
              ))}
            </div>
            <Button onClick={startBattle} size="lg" className="mt-8 w-full max-w-xl">
              Xông trận
            </Button>
          </motion.div>
        )}

        {(battleState === "intro" || battleState === "battling" || battleState === "won" || battleState === "lost") && playerCard && bossCard && (
          <div className="relative flex flex-1 flex-col justify-center">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-6xl font-black italic text-amber-500/10">VS</div>
            <div className="grid items-center gap-8 md:grid-cols-2">
              <Card className={`overflow-hidden rounded-[30px] border border-slate-700 bg-slate-900 ${turn === "boss" && battleState === "battling" ? "ring-4 ring-red-500/40" : ""}`}>
                <div className="h-3 bg-slate-700">
                  <motion.div className="h-full bg-red-500" style={{ width: `${Math.max(0, (bossHp / bossCard.hp) * 100)}%` }} />
                </div>
                <div className={`flex h-44 items-center justify-center bg-gradient-to-br ${bossCard.element.gradient}`}>
                  <span className="text-7xl opacity-85">{bossCard.element.icon}</span>
                </div>
                <div className="p-5 text-center">
                  <h3 className="text-2xl font-black text-white">{bossCard.name}</h3>
                  <div className="mt-4 flex justify-center gap-5">
                    <span className="flex items-center gap-1 font-bold text-red-400"><Shield size={16} /> {bossHp}/{bossCard.hp}</span>
                    <span className="flex items-center gap-1 font-bold text-blue-400"><Swords size={16} /> {bossCard.atk}</span>
                  </div>
                </div>
              </Card>

              <Card className={`overflow-hidden rounded-[30px] border border-slate-700 bg-slate-900 ${turn === "player" && battleState === "battling" ? "ring-4 ring-blue-500/40" : ""}`}>
                <div className="h-3 bg-slate-700">
                  <motion.div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, (playerHp / playerCard.hp) * 100)}%` }} />
                </div>
                <div className={`flex h-44 items-center justify-center bg-gradient-to-br ${playerCard.element.gradient}`}>
                  <span className="text-7xl">{playerCard.element.icon}</span>
                </div>
                <div className="p-5 text-center">
                  <h3 className="text-2xl font-black text-white">{playerCard.name}</h3>
                  <div className="mt-4 flex justify-center gap-5">
                    <span className="flex items-center gap-1 font-bold text-emerald-400"><Shield size={16} /> {playerHp}/{playerCard.hp}</span>
                    <span className="flex items-center gap-1 font-bold text-blue-400"><Swords size={16} /> {playerCard.atk}</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-[1fr_280px]">
              <Card className="min-h-[132px] rounded-[28px] border border-slate-700 bg-slate-900/85 p-4">
                <AnimatePresence>
                  {log.map((l, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="py-1 text-sm font-medium text-slate-300">
                      {l}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </Card>

              {turn === "player" && battleState === "battling" && (
                <div className="flex flex-col gap-3">
                  <Button onClick={() => handlePlayerAttack("normal")} size="lg" variant="secondary">
                    <Swords size={18} />
                    Đánh thường
                  </Button>
                  <div className="relative overflow-hidden rounded-2xl">
                    <Button disabled={ultimateCharge < 100} onClick={() => handlePlayerAttack("ultimate")} size="lg" className="w-full bg-amber-500 hover:bg-amber-400 text-white disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none">
                      <Zap size={18} />
                      Tuyệt chiêu
                    </Button>
                    {ultimateCharge < 100 && (
                      <div className="absolute bottom-0 left-0 h-2 w-full overflow-hidden rounded-b-2xl bg-slate-900/60">
                        <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all" style={{ width: `${ultimateCharge}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="rounded-[20px] bg-white/6 px-4 py-3 text-xs text-slate-300 border border-white/8">
                    Nạp tuyệt chiêu bằng các đòn đánh thường.
                  </div>
                </div>
              )}
            </div>

            <AnimatePresence>
              {(battleState === "won" || battleState === "lost") && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/82 backdrop-blur-md">
                  <Card className="rounded-[32px] border border-slate-700 bg-slate-900 p-8 text-center text-white shadow-2xl max-w-md w-full">
                    {battleState === "won" ? (
                      <>
                        <Trophy className="mx-auto mb-4 text-amber-400" size={64} />
                        <h2 className="mb-2 text-3xl font-black uppercase tracking-[0.14em]">Chiến thắng</h2>
                        <p className="mb-6 font-bold text-emerald-400">+{level.reward} EXP</p>
                        <Button onClick={() => { onWin(level.reward); onClose(); }} size="lg" className="w-full">
                          Nhận thưởng
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="mb-4 text-6xl">💀</div>
                        <h2 className="mb-2 text-3xl font-black uppercase tracking-[0.14em] text-slate-200">Thất bại</h2>
                        <p className="mb-6 font-bold text-slate-400">Thẻ của bạn chưa đủ mạnh hoặc cần chiến thuật khác.</p>
                        <Button onClick={onClose} variant="ghost" size="lg" className="w-full bg-white/10 text-white border-white/10 hover:bg-white/20">
                          Rút lui
                        </Button>
                      </>
                    )}
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
