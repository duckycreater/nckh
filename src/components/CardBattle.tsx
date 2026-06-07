import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Swords, Zap, X, Trophy, ChevronLeft, Play, Sparkles, ArrowLeft } from "lucide-react";
import { ALL_CARDS, generateCard, getElementIcon, ELEMENTS, getAdvantage, getDisadvantage, calcPower } from "../lib/cards";
import { Badge, Button, Card, ModalShell } from "../lib/ui";

interface Props {
  deckCardIds: number[];
  cardLevels: Record<string, number>;
  onClose: () => void;
  onWin: (exp: number) => void;
}

const CAMPAIGN_LEVELS = [
  { id: 1, name: "Vùng Đất Rác Thiếc", desc: "Khu vực phế liệu hoen gỉ, rác thải tích tụ.", bossId: 301, bossHpMult: 0.6, bossAtkMult: 0.5, reward: 30, element: "plastic" },
  { id: 2, name: "Đầm Lầy Nhựa Độc", desc: "Bùn nhựa đặc quánh, mùi hôi tanh.", bossId: 320, bossHpMult: 0.9, bossAtkMult: 0.8, reward: 60, element: "hazard" },
  { id: 3, name: "Núi Chế Phẩm Hữu Cơ", desc: "Đống phân hủy cao như núi, nhiệt độ cao.", bossId: 350, bossHpMult: 1.2, bossAtkMult: 1.0, reward: 120, element: "organic" },
  { id: 4, name: "Rừng Kim Loại Gỉ", desc: "Cây cối biến dạng từ kim loại gỉ sét.", bossId: 400, bossHpMult: 1.6, bossAtkMult: 1.5, reward: 200, element: "metal" },
  { id: 5, name: "Lõi Lò Đốt Rác", desc: "Biển lửa rác thải, nơi tận cùng của chuỗi.", bossId: 500, bossHpMult: 2.8, bossAtkMult: 2.2, reward: 500, element: "hazard" },
];

const BATTLE_STAGES = ["intro", "select", "battling", "victory", "defeat"] as const;
type BattleStage = typeof BATTLE_STAGES[number];

interface BattleCard {
  id: number;
  card: any;
  hp: number;
  maxHp: number;
  atk: number;
  level: number;
  isAlive: boolean;
  ultimateCharge: number;
}

function buildBattleCard(cardId: number, level: number, atkMult = 1, hpMult = 1): BattleCard {
  const base = ALL_CARDS.find((c) => c.id === cardId)!;
  const hp = Math.floor(base.hp * (1 + (level - 1) * 0.15) * hpMult);
  const atk = Math.floor(base.atk * (1 + (level - 1) * 0.15) * atkMult);
  return { id: cardId, card: base, hp, maxHp: hp, atk, level, isAlive: true, ultimateCharge: 0 };
}

export function CardBattle({ deckCardIds, cardLevels, onClose, onWin }: Props) {
  const [stage, setStage] = useState<BattleStage>("intro");
  const [selectedLevelId, setSelectedLevelId] = useState<number>(1);
  const [playerTeam, setPlayerTeam] = useState<BattleCard[]>([]);
  const [bossTeam, setBossTeam] = useState<BattleCard[]>([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState<number>(0);
  const [log, setLog] = useState<string[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [battleReward, setBattleReward] = useState(0);
  const [damageFlash, setDamageFlash] = useState<"player" | "boss" | null>(null);

  const level = CAMPAIGN_LEVELS.find((l) => l.id === selectedLevelId) || CAMPAIGN_LEVELS[0];

  // cardLevels passed as prop so battle reflects actual upgrade levels
  const startBattle = () => {
    // Build player team
    const team = deckCardIds.map((id) => buildBattleCard(id, cardLevels[String(id)] || 1));
    setPlayerTeam(team);
    setActivePlayerIdx(team.findIndex((c) => c.isAlive));

    // Build boss team (3 copies of boss)
    const bossTeamCards = [level.bossId, level.bossId + 10, level.bossId + 20];
    const boss = bossTeamCards.map((bossId) => buildBattleCard(bossId, 1, level.bossHpMult, level.bossAtkMult));
    setBossTeam(boss);

    setLog([`Chiến dịch: ${level.name}`, `Đối thủ: 3 boss hệ ${ELEMENTS.find((e) => e.id === level.element)?.name || level.element}`]);
    setTurnCount(0);
    setBattleReward(level.reward);
    setStage("intro");

    setTimeout(() => setStage("select"), 1800);
  };

  // ─── Attack logic ──────────────────────────────────────────────────────────
  const playerAttack = (type: "normal" | "ultimate") => {
    const attacker = playerTeam[activePlayerIdx];
    if (!attacker || !attacker.isAlive) return;

    const bossAlive = bossTeam.filter((b) => b.isAlive);
    if (bossAlive.length === 0) return;

    const target = bossAlive[0];
    const baseDmg = type === "ultimate" ? Math.floor(attacker.atk * 2.5) : Math.floor(attacker.atk * (0.8 + Math.random() * 0.4));
    const multiplier = getAdvantage(attacker.card.element.id) === target.card.element.id ? 1.5
      : getDisadvantage(attacker.card.element.id) === target.card.element.id ? 0.75 : 1.0;
    const dmg = Math.floor(baseDmg * multiplier);

    const counterNote = multiplier > 1 ? " 💥 Hiệu quả!" : multiplier < 1 ? " ⚠️ Yếu hơn!" : "";

    if (type === "ultimate") {
      setLog((prev) => [...prev.slice(-5), `💥 ${attacker.card.name} dùng tuyệt chiêu! Gây ${dmg} sát thương${counterNote}`]);
    } else {
      setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx ? { ...c, ultimateCharge: Math.min(100, c.ultimateCharge + 35) } : c));
      setLog((prev) => [...prev.slice(-5), `⚔️ ${attacker.card.name} tấn công! Gây ${dmg} sát thương${counterNote}`]);
    }

    setDamageFlash("boss");
    setTimeout(() => setDamageFlash(null), 400);

    setBossTeam((prev) => prev.map((b) => b.id === target.id ? { ...b, hp: Math.max(0, b.hp - dmg), isAlive: b.hp - dmg > 0 } : b));
    setTurnCount((t) => t + 1);

    setTimeout(() => bossTurn(attacker.atk, multiplier > 1), 1200);
  };

  const bossTurn = (playerAtk: number, wasEffective: boolean) => {
    const bossAlive = bossTeam.filter((b) => b.isAlive);
    const playerAlive = playerTeam.filter((p) => p.isAlive);
    if (bossAlive.length === 0) { setStage("victory"); return; }
    if (playerAlive.length === 0) { setStage("defeat"); return; }

    const boss = bossAlive[0];
    const playerAliveIdx = playerTeam.findIndex((p) => p.isAlive);
    if (playerAliveIdx === -1) { setStage("defeat"); return; }

    const playerTarget = playerTeam[playerAliveIdx];
    const bossDmg = Math.floor(boss.atk * (0.8 + Math.random() * 0.4));
    const bossMult = getAdvantage(boss.card.element.id) === playerTarget.card.element.id ? 1.5
      : getDisadvantage(boss.card.element.id) === playerTarget.card.element.id ? 0.75 : 1.0;
    const bossFinalDmg = Math.floor(bossDmg * bossMult);

    const counterNote = bossMult > 1 ? " 💥 Hiệu quả!" : bossMult < 1 ? " ⚠️ Yếu hơn!" : "";

    setLog((prev) => [...prev.slice(-5), `👹 ${boss.card.name} phản công! Gây ${bossFinalDmg} sát thương${counterNote}`]);
    setDamageFlash("player");
    setTimeout(() => setDamageFlash(null), 400);

    const newHp = playerTarget.hp - bossFinalDmg;
    const newAlive = newHp > 0;
    setPlayerTeam((prev) => prev.map((p, i) => i === playerAliveIdx ? { ...p, hp: Math.max(0, newHp), isAlive: newAlive } : p));
    setActivePlayerIdx(playerAliveIdx);

    const stillAlive = playerTeam.some((p, i) => i !== playerAliveIdx && p.isAlive);
    if (!newAlive && !stillAlive) {
      setTimeout(() => setStage("defeat"), 600);
      return;
    }

    // Switch to next alive player
    const nextIdx = playerTeam.findIndex((p, i) => i > playerAliveIdx && p.isAlive);
    setActivePlayerIdx(nextIdx !== -1 ? nextIdx : playerAliveIdx);
  };

  const checkVictory = () => {
    if (bossTeam.every((b) => !b.isAlive)) setStage("victory");
  };

  useEffect(() => { if (stage === "select") checkVictory(); }, [bossTeam, stage]);

  const getElementAdvantageLabel = (el1: string, el2: string) => {
    if (getAdvantage(el1) === el2) return { text: "Yếu hơn!", color: "text-red-400" };
    if (getDisadvantage(el1) === el2) return { text: "Hiệu quả!", color: "text-emerald-400" };
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 overflow-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <Button onClick={onClose} variant="ghost" className="bg-white/10 text-white border-white/10 hover:bg-white/20 text-xs">
          <ArrowLeft size={15} /> Thoát
        </Button>
        <Badge tone="warning">Đấu Trường Sinh Thái</Badge>
        <span className="text-xs text-white/50">Lượt: {turnCount}</span>
      </div>

      {/* ─── LEVEL SELECT ─── */}
      {stage === "intro" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
          <div className="text-center">
            <h2 className="text-4xl font-black text-white tracking-tight">Chọn Chiến Dịch</h2>
            <p className="mt-2 text-slate-400">Xây dựng đội hình và tiến vào chiến trường.</p>
          </div>

          <div className="w-full max-w-2xl space-y-3">
            {CAMPAIGN_LEVELS.map((lvl) => (
              <button key={lvl.id} onClick={() => setSelectedLevelId(lvl.id)}
                className={`w-full rounded-2xl border-2 p-5 text-left transition-all ${
                  selectedLevelId === lvl.id
                    ? "border-amber-400 bg-slate-900 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                    : "border-slate-700 bg-slate-900/70 hover:bg-slate-900"
                }`}>
                <div className="flex items-center gap-4">
                  <div className={`rounded-2xl p-3 ${lvl.id === selectedLevelId ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                    <Trophy size={22} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-white">{lvl.name}</h3>
                    <p className="text-sm text-slate-400">{lvl.desc}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Sparkles size={11} className="text-amber-400" />{lvl.reward} EXP
                      </span>
                      <span className="flex items-center gap-1">
                        Hệ: {ELEMENTS.find((e) => e.id === lvl.element)?.name || lvl.element}
                      </span>
                    </div>
                  </div>
                  {selectedLevelId === lvl.id && (
                    <div className="rounded-full bg-amber-500 p-3 text-white shadow-lg shadow-amber-500/30">
                      <Play size={18} className="ml-0.5" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <Button onClick={startBattle} size="lg" className="w-full max-w-2xl">
            <Swords size={18} /> Xông trận!
          </Button>
        </div>
      )}

      {/* ─── BATTLE SCREEN ─── */}
      {(stage === "select" || stage === "battling") && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Boss team */}
          <div className="border-b border-white/10 bg-red-950/30 px-4 py-3">
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-red-400">Đội quân thù</p>
            <div className="flex items-center justify-center gap-3">
              {bossTeam.map((b, i) => {
                const hpPct = b.maxHp > 0 ? (b.hp / b.maxHp) * 100 : 0;
                return (
                  <div key={b.id} className={`relative flex w-24 flex-col items-center rounded-2xl border-2 p-2 transition-all ${b.isAlive ? (damageFlash === "boss" ? "animate-pulse ring-2 ring-red-500" : "border-red-700 bg-red-900/50") : "border-red-900 bg-red-950/30 opacity-40"}`}>
                    <div className={`w-16 rounded-xl bg-gradient-to-br ${b.card.element.gradient} flex items-center justify-center p-1 ${!b.isAlive ? "grayscale" : ""}`}>
                      {getElementIcon(b.card.element.id, 28)}
                    </div>
                    <p className="mt-1 text-[9px] font-bold text-slate-400 line-clamp-1">{b.card.name.split(" ")[0]}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-red-900/50">
                      <div className={`h-full rounded-full transition-all ${hpPct > 50 ? "bg-red-500" : hpPct > 25 ? "bg-amber-500" : "bg-red-700"}`} style={{ width: `${hpPct}%` }} />
                    </div>
                    <p className="text-[9px] font-black text-red-300">{Math.max(0, b.hp)}</p>
                    {!b.isAlive && <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60"><span className="text-xs font-black text-red-400">KO</span></div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* VS divider */}
          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-x-4 top-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="z-10 select-none text-3xl font-black italic text-amber-500/20">VS</span>
          </div>

          {/* Player team */}
          <div className="flex-1 px-4 py-3">
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-blue-400">Đội của bạn</p>
            <div className="flex items-center justify-center gap-3">
              {playerTeam.map((p, i) => {
                const hpPct = p.maxHp > 0 ? (p.hp / p.maxHp) * 100 : 0;
                const isActive = i === activePlayerIdx && p.isAlive;
                return (
                  <div key={p.id} className={`relative flex w-24 flex-col items-center rounded-2xl border-2 p-2 transition-all ${
                    !p.isAlive ? "border-slate-800 bg-slate-900/30 opacity-40"
                      : isActive ? `border-blue-400 bg-blue-900/40 shadow-[0_0_15px_rgba(59,130,246,0.3)] ${damageFlash === "player" ? "animate-pulse" : ""}`
                      : "border-slate-700 bg-slate-900/50"
                  }`}>
                    {p.level > 1 && (
                      <div className="absolute -right-1 -top-1 z-10 flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[8px] font-black text-white shadow">
                        <Sparkles size={6} />{p.level}
                      </div>
                    )}
                    <div className={`w-16 rounded-xl bg-gradient-to-br ${p.card.element.gradient} flex items-center justify-center p-1 ${!p.isAlive ? "grayscale" : ""}`}>
                      {getElementIcon(p.card.element.id, 28)}
                    </div>
                    <p className="mt-1 text-[9px] font-bold text-slate-400 line-clamp-1">{p.card.name.split(" ")[0]}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-900/50">
                      <div className={`h-full rounded-full transition-all ${hpPct > 50 ? "bg-emerald-500" : hpPct > 25 ? "bg-amber-500" : "bg-red-700"}`} style={{ width: `${hpPct}%` }} />
                    </div>
                    <p className="text-[9px] font-black text-emerald-300">{Math.max(0, p.hp)}</p>
                    {!p.isAlive && <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60"><span className="text-xs font-black text-red-400">KO</span></div>}
                    {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-2 py-0.5 text-[7px] font-black text-white shadow">ĐẠI DIỆN</div>}
                  </div>
                );
              })}
            </div>

            {/* Element matchup */}
            {playerTeam[activePlayerIdx] && bossTeam.find((b) => b.isAlive) && (
              <div className="mt-4 flex items-center justify-center gap-2">
                {(() => {
                  const p = playerTeam[activePlayerIdx];
                  const adv = getElementAdvantageLabel(p.card.element.id, bossTeam.find((b) => b.isAlive)!.card.element.id);
                  if (!adv) return <span className="text-xs text-slate-500">Tương khắc: Trung lập</span>;
                  return <span className={`text-xs font-bold ${adv.color}`}>{adv.text}</span>;
                })()}
              </div>
            )}
          </div>

          {/* Battle log */}
          <div className="mx-4 mb-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <AnimatePresence mode="popLayout">
              {log.slice(-4).map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="py-0.5 text-xs font-medium text-slate-300">
                  {l}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Action buttons */}
          {stage === "select" && (
            <div className="flex gap-3 px-4 pb-4">
              <Button onClick={() => playerAttack("normal")} size="lg" variant="secondary" className="flex-1">
                <Swords size={16} />Đánh thường
              </Button>
              <Button
                onClick={() => playerAttack("ultimate")}
                disabled={!playerTeam[activePlayerIdx]?.isAlive}
                size="lg"
                className="flex-1 bg-amber-600 hover:bg-amber-500"
              >
                <Zap size={16} />Tuyệt chiêu
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── RESULT OVERLAY ─── */}
      <AnimatePresence>
        {(stage === "victory" || stage === "defeat") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
            <Card className="max-w-md w-full rounded-[32px] border border-slate-700 bg-slate-900 p-8 text-center text-white shadow-2xl">
              {stage === "victory" ? (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                    <Trophy size={48} className="text-amber-400" />
                  </motion.div>
                  <h2 className="text-3xl font-black uppercase tracking-[0.14em] text-amber-400">Chiến thắng!</h2>
                  <p className="mt-2 text-slate-400">Bạn đã đánh bại đội quân thù.</p>
                  <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-amber-500/20 px-6 py-4 text-2xl font-black text-amber-300">
                    <Sparkles size={22} />+{battleReward} EXP
                  </div>
                  <Button onClick={() => { onWin(battleReward); onClose(); }} size="lg" className="mt-6 w-full">
                    Nhận thưởng
                  </Button>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 text-6xl">💀</div>
                  <h2 className="text-3xl font-black uppercase tracking-[0.14em] text-slate-200">Thất bại</h2>
                  <p className="mt-2 text-sm text-slate-400">Đội hình của bạn chưa đủ mạnh. Hãy lên cấp thẻ hoặc thay đổi chiến thuật.</p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <Button onClick={() => setStage("intro")} variant="ghost" size="lg" className="bg-white/10 text-white border-white/10">
                      Thử lại
                    </Button>
                    <Button onClick={onClose} variant="ghost" size="lg" className="bg-white/10 text-white border-white/10">
                      Thoát
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
