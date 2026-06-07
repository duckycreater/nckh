import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Swords, Zap, X, Trophy, ChevronLeft, Play, Sparkles, ArrowLeft } from "lucide-react";
import { ALL_CARDS, getElementIcon, ELEMENTS, getAdvantage, getDisadvantage, calcPower } from "../lib/cards";
import { Badge, Button, Card, ModalShell } from "../lib/ui";

interface Props {
  deckCardIds: number[];
  cardLevels: Record<string, number>;
  onClose: () => void;
  onWin: (exp: number) => void;
}

const CAMPAIGN_LEVELS = [
  { id: 1, name: "Vùng Đất Rác Thiếc", desc: "Khu vực phế liệu hoen gỉ, rác thải tích tụ.", bossIds: [101, 102, 103], bossHpMult: 0.6, bossAtkMult: 0.5, reward: 30, element: "plastic" },
  { id: 2, name: "Đầm Lầy Nhựa Độc", desc: "Bùn nhựa đặc quánh, mùi hôi tanh.", bossIds: [201, 202, 203], bossHpMult: 0.9, bossAtkMult: 0.8, reward: 60, element: "hazard" },
  { id: 3, name: "Núi Chế Phẩm Hữu Cơ", desc: "Đống phân hủy cao như núi, nhiệt độ cao.", bossIds: [151, 152, 153], bossHpMult: 1.2, bossAtkMult: 1.0, reward: 120, element: "organic" },
  { id: 4, name: "Rừng Kim Loại Gỉ", desc: "Cây cối biến dạng từ kim loại gỉ sét.", bossIds: [251, 252, 253], bossHpMult: 1.6, bossAtkMult: 1.5, reward: 200, element: "metal" },
  { id: 5, name: "Lõi Lò Đốt Rác", desc: "Biển lửa rác thải, nơi tận cùng của chuỗi.", bossIds: [301, 302, 303], bossHpMult: 2.8, bossAtkMult: 2.2, reward: 500, element: "hazard" },
];

type BattleStage = "intro" | "battling" | "victory" | "defeat";

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

const BOSS_NAMES = ["Tướng Quân", "Đại Sư", "Vương Giả"];

function getCardElementGradient(elementId: string): string {
  const el = ELEMENTS.find((e) => e.id === elementId);
  return el?.gradient || "from-slate-600 to-slate-800";
}
function getCardElementName(elementId: string): string {
  const el = ELEMENTS.find((e) => e.id === elementId);
  return el?.name || elementId;
}

function buildBattleCard(cardId: number, level: number, atkMult = 1, hpMult = 1): BattleCard {
  const base = ALL_CARDS.find((c) => c.id === cardId);
  if (!base) {
    return {
      id: cardId,
      card: { id: cardId, name: `Boss #${cardId}`, element: { id: "plastic", name: "Nhựa" }, gradient: "from-slate-600 to-slate-800" },
      hp: 0, maxHp: 0, atk: 0, level: 1, isAlive: false, ultimateCharge: 0,
    };
  }
  const hp = Math.floor(base.hp * (1 + (level - 1) * 0.15) * hpMult);
  const atk = Math.floor(base.atk * (1 + (level - 1) * 0.15) * atkMult);
  return { id: cardId, card: base, hp, maxHp: hp, atk, level, isAlive: true, ultimateCharge: 0 };
}

function getAdvantageLabel(attackerEl: string, defenderEl: string): { text: string; color: string; positive: boolean } | null {
  if (getAdvantage(attackerEl) === defenderEl) return { text: "💥 Hiệu quả +50%", color: "text-emerald-400", positive: true };
  if (getDisadvantage(attackerEl) === defenderEl) return { text: "⚠️ Yếu hơn -25%", color: "text-red-400", positive: false };
  return null;
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
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  const playerTeamRef = useRef<BattleCard[]>([]);
  const bossTeamRef = useRef<BattleCard[]>([]);

  // Keep refs in sync
  useEffect(() => { playerTeamRef.current = playerTeam; }, [playerTeam]);
  useEffect(() => { bossTeamRef.current = bossTeam; }, [bossTeam]);

  const level = CAMPAIGN_LEVELS.find((l) => l.id === selectedLevelId) || CAMPAIGN_LEVELS[0];

  // ─── Start battle ─────────────────────────────────────────────────────────
  const startBattle = useCallback(() => {
    const team = deckCardIds.map((id) => buildBattleCard(id, cardLevels[String(id)] || 1));
    const firstAlive = team.findIndex((c) => c.isAlive);
    setPlayerTeam(team);
    setActivePlayerIdx(firstAlive >= 0 ? firstAlive : 0);

    const bosses = level.bossIds.map((bossId) => buildBattleCard(bossId, 1, level.bossAtkMult, level.bossHpMult));
    setBossTeam(bosses);

    setLog([
      `⚔️ Chiến dịch: ${level.name}`,
      `👹 Đối thủ: ${ELEMENTS.find((e) => e.id === level.element)?.name || level.element} (x3 boss)`,
    ]);
    setTurnCount(0);
    setBattleReward(level.reward);
    setIsPlayerTurn(true);
    setStage("battling");
  }, [deckCardIds, cardLevels, level]);

  // ─── Check win/lose ───────────────────────────────────────────────────────
  const checkBattleEnd = useCallback((pTeam: BattleCard[], bTeam: BattleCard[]) => {
    const bossAlive = bTeam.filter((b) => b.isAlive);
    const playerAlive = pTeam.filter((p) => p.isAlive);
    if (bossAlive.length === 0) { setStage("victory"); return true; }
    if (playerAlive.length === 0) { setStage("defeat"); return true; }
    return false;
  }, []);

  // ─── Player attacks ─────────────────────────────────────────────────────────
  const playerAttack = useCallback((type: "normal" | "ultimate") => {
    const team = playerTeamRef.current;
    const bTeam = bossTeamRef.current;
    const attacker = team[activePlayerIdx];
    if (!attacker?.isAlive) return;

    const bossAlive = bTeam.filter((b) => b.isAlive);
    if (bossAlive.length === 0) return;
    const target = bossAlive[0];

    const baseDmg = type === "ultimate"
      ? Math.floor(attacker.atk * 2.5)
      : Math.floor(attacker.atk * (0.8 + Math.random() * 0.4));
    const advLabel = getAdvantageLabel(attacker.card.element.id, target.card.element.id);
    const mult = advLabel ? (advLabel.positive ? 1.5 : 0.75) : 1.0;
    const dmg = Math.floor(baseDmg * mult);

    if (type === "ultimate") {
      setLog((prev) => [...prev.slice(-4), `💥 ${attacker.card.name} dùng tuyệt chiêu → ${dmg} sát thương${advLabel ? " " + advLabel.text : ""}`]);
    } else {
      setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx ? { ...c, ultimateCharge: Math.min(100, c.ultimateCharge + 35) } : c));
      setLog((prev) => [...prev.slice(-4), `⚔️ ${attacker.card.name} đánh → ${dmg} sát thương${advLabel ? " " + advLabel.text : ""}`]);
    }

    setDamageFlash("boss");
    setTimeout(() => setDamageFlash(null), 350);

    // Apply damage to boss
    setBossTeam((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== target.id || !b.isAlive) return b;
        const newHp = Math.max(0, b.hp - dmg);
        return { ...b, hp: newHp, isAlive: newHp > 0 };
      });
      // Check if boss died
      setTimeout(() => checkBattleEnd(playerTeamRef.current, updated), 200);
      return updated;
    });

    setTurnCount((t) => t + 1);
    setIsPlayerTurn(false);
    setTimeout(() => {
      if (type === "normal") bossTurn();
    }, 1000);
  }, [activePlayerIdx, checkBattleEnd]);

  // ─── Boss turn ─────────────────────────────────────────────────────────────
  const bossTurn = useCallback(() => {
    const team = playerTeamRef.current;
    const bTeam = bossTeamRef.current;
    const bossAlive = bTeam.filter((b) => b.isAlive);
    if (bossAlive.length === 0) return;

    const boss = bossAlive[0];
    const playerAlive = team.filter((p) => p.isAlive);
    if (playerAlive.length === 0) return;

    const aliveIdx = team.findIndex((p) => p.isAlive);
    if (aliveIdx === -1) return;
    const playerTarget = team[aliveIdx];

    const bossDmg = Math.floor(boss.atk * (0.8 + Math.random() * 0.4));
    const advLabel = getAdvantageLabel(boss.card.element.id, playerTarget.card.element.id);
    const mult = advLabel ? (advLabel.positive ? 1.5 : 0.75) : 1.0;
    const bossFinalDmg = Math.floor(bossDmg * mult);

    setLog((prev) => [...prev.slice(-4), `👹 Boss phản công → ${bossFinalDmg} sát thương${advLabel ? " " + advLabel.text : ""}`]);
    setDamageFlash("player");
    setTimeout(() => setDamageFlash(null), 350);

    setPlayerTeam((prev) => {
      const updated = prev.map((p, i) => {
        if (i !== aliveIdx || !p.isAlive) return p;
        const newHp = Math.max(0, p.hp - bossFinalDmg);
        return { ...p, hp: newHp, isAlive: newHp > 0 };
      });

      // Switch active to next alive player
      const nextAlive = updated.findIndex((p, i) => i > aliveIdx && p.isAlive);
      const nextIdx = nextAlive !== -1 ? nextAlive : updated.findIndex((p) => p.isAlive);
      setActivePlayerIdx(nextIdx !== -1 ? nextIdx : aliveIdx);

      setTimeout(() => checkBattleEnd(updated, bossTeamRef.current), 200);
      return updated;
    });

    setIsPlayerTurn(true);
  }, [checkBattleEnd]);

  // ─── Render helpers ────────────────────────────────────────────────────────
  const renderHpBar = (current: number, max: number) => {
    if (max === 0) return null;
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    const color = pct > 50 ? "bg-emerald-500" : pct > 25 ? "bg-amber-500" : "bg-red-500";
    return (
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  const renderTeamCard = (bc: BattleCard, team: "player" | "boss", isActive: boolean) => {
    const hpPct = bc.maxHp > 0 ? (bc.hp / bc.maxHp) * 100 : 0;
    const gradient = getCardElementGradient(bc.card.element?.id || "plastic");
    const name = bc.card.name || `Boss #${bc.id}`;

    const baseClasses = [
      "relative flex flex-col items-center rounded-2xl border-2 p-1.5 transition-all",
      !bc.isAlive
        ? "border-slate-800 bg-slate-900/40 opacity-40"
        : isActive && team === "player"
          ? "border-blue-400 bg-blue-900/40 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
          : isActive && team === "boss"
            ? "border-red-400 bg-red-900/40"
            : team === "player"
              ? "border-slate-600 bg-slate-900/40"
              : "border-red-800 bg-red-950/30",
      damageFlash === (team === "player" ? "player" : "boss") && bc.isAlive ? "animate-pulse" : "",
    ].join(" ");

    return (
      <div key={bc.id} className={baseClasses}>
        {bc.level > 1 && team === "player" && (
          <div className="absolute -right-1 -top-1 z-10 rounded-full bg-amber-400 px-1 py-0.5 text-[7px] font-black text-white shadow">
            <Sparkles size={5} className="inline" />{bc.level}
          </div>
        )}
        <div className={`w-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center p-0.5 ${!bc.isAlive ? "grayscale" : ""}`}>
          {getElementIcon(bc.card.element?.id || "plastic", 20)}
        </div>
        <p className="mt-0.5 text-[7px] font-bold text-slate-400 line-clamp-1 leading-tight">{name.split(" ")[0]}</p>
        {renderHpBar(bc.hp, bc.maxHp)}
        <p className={`text-[8px] font-black mt-0.5 ${team === "player" ? "text-emerald-300" : "text-red-300"}`}>
          {Math.max(0, bc.hp)}
        </p>
        {!bc.isAlive && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
            <span className="text-[9px] font-black text-red-400">KO</span>
          </div>
        )}
        {isActive && team === "player" && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-1.5 py-0.5 text-[6px] font-black text-white shadow">
            ĐẠI DIỆN
          </div>
        )}
      </div>
    );
  };

  const canUseUltimate = playerTeam[activePlayerIdx]?.isAlive && playerTeam[activePlayerIdx]?.ultimateCharge >= 100;
  const bossAlive = bossTeam.filter((b) => b.isAlive);
  const playerAlive = playerTeam.filter((p) => p.isAlive);
  const activePlayer = playerTeam[activePlayerIdx];
  const activeBoss = bossAlive[0];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <Button
          onClick={() => stage === "intro" ? onClose() : () => { setStage("intro"); setPlayerTeam([]); setBossTeam([]); }}
          variant="ghost"
          className="bg-white/10 text-white border-white/10 hover:bg-white/20 text-xs px-2 py-1"
        >
          <ArrowLeft size={14} />{stage === "intro" ? "Thoát" : "Về"}
        </Button>
        <Badge tone="warning">Đấu Trường</Badge>
        <span className="text-xs text-white/50 font-mono">{turnCount} lượt</span>
      </div>

      {/* ─── INTRO: Select campaign ─── */}
      {stage === "intro" && (
        <div className="flex flex-1 flex-col items-center justify-start gap-5 overflow-y-auto p-4">
          <div className="text-center pt-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Chọn Chiến Dịch</h2>
            <p className="mt-1 text-sm text-slate-400">Mỗi chiến dịch có 3 boss. Đánh bại tất cả để thắng.</p>
          </div>

          <div className="w-full max-w-sm space-y-2 pb-4">
            {CAMPAIGN_LEVELS.map((lvl) => {
              const bossEl = ELEMENTS.find((e) => e.id === lvl.element);
              return (
                <button key={lvl.id}
                  onClick={() => setSelectedLevelId(lvl.id)}
                  className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                    selectedLevelId === lvl.id
                      ? "border-amber-400 bg-amber-950/30 shadow-[0_0_16px_rgba(234,179,8,0.12)]"
                      : "border-slate-700 bg-slate-900/70 hover:bg-slate-900"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedLevelId === lvl.id ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-500"}`}>
                      <Trophy size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-white truncate">{lvl.name}</h3>
                      <p className="text-[10px] text-slate-400 truncate">{lvl.desc}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px]">
                        <span className="flex items-center gap-0.5 font-bold text-amber-400">
                          <Sparkles size={9} />{lvl.reward} EXP
                        </span>
                        {bossEl && (
                          <span className="flex items-center gap-0.5 text-slate-500">
                            {getElementIcon(lvl.element, 10)}
                            <span>{bossEl.name}</span>
                          </span>
                        )}
                        <span className="text-slate-600">x3 boss</span>
                      </div>
                    </div>
                    {selectedLevelId === lvl.id && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow shadow-amber-500/40">
                        <Play size={14} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {deckCardIds.length === 5 ? (
            <Button onClick={startBattle} size="lg" className="w-full max-w-sm text-base font-black py-3">
              <Swords size={18} />Xông trận!
            </Button>
          ) : (
            <div className="w-full max-w-sm rounded-xl border border-red-900/50 bg-red-950/30 p-3 text-center">
              <p className="text-sm font-bold text-red-400">Cần 5 thẻ trong đội hình</p>
              <p className="mt-0.5 text-xs text-red-300/60">Vào tab Đấu trường để chọn đội hình</p>
            </div>
          )}
        </div>
      )}

      {/* ─── BATTLING ─── */}
      {stage === "battling" && (
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Boss zone */}
          <div className="border-b border-white/10 bg-red-950/20 px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Boss ({bossAlive.length}/3)</p>
              {bossAlive.length > 0 && activeBoss && getAdvantageLabel(activeBoss.card.element?.id || "", activePlayer?.card.element?.id || "") && (
                <span className={`text-[9px] font-bold ${getAdvantageLabel(activeBoss.card.element?.id || "", activePlayer?.card.element?.id || "")?.color}`}>
                  {getAdvantageLabel(activeBoss.card.element?.id || "", activePlayer?.card.element?.id || "")?.text}
                </span>
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              {bossTeam.map((b, i) => (
                <div key={b.id} className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-0.5 text-[8px] text-red-400/50">
                    <span className="font-black">{BOSS_NAMES[i] || "Boss"}</span>
                  </div>
                  <div className="w-16">
                    {renderTeamCard(b, "boss", b.id === bossAlive[0]?.id)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center py-1">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="px-3 text-xl font-black italic text-amber-500/30 select-none">VS</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Player zone */}
          <div className="flex-1 px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Đội bạn ({playerAlive.length}/5)</p>
              {activePlayer && bossAlive.length > 0 && getAdvantageLabel(activePlayer.card.element?.id || "", bossAlive[0].card.element?.id || "") && (
                <span className={`text-[9px] font-bold ${getAdvantageLabel(activePlayer.card.element?.id || "", bossAlive[0].card.element?.id || "")?.color}`}>
                  {getAdvantageLabel(activePlayer.card.element?.id || "", bossAlive[0].card.element?.id || "")?.text}
                </span>
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              {playerTeam.map((p, i) => (
                <div key={p.id} className="w-16">
                  {renderTeamCard(p, "player", i === activePlayerIdx)}
                </div>
              ))}
            </div>

            {/* Ultimate charge bar */}
            {activePlayer?.isAlive && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <Zap size={12} className={canUseUltimate ? "text-amber-400" : "text-slate-500"} />
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full transition-all ${canUseUltimate ? "bg-amber-400" : "bg-blue-500"}`}
                    style={{ width: `${activePlayer.ultimateCharge}%` }} />
                </div>
                <span className="text-[9px] font-bold text-slate-400">{activePlayer.ultimateCharge}/100</span>
              </div>
            )}
          </div>

          {/* Battle log */}
          <div className="mx-3 mb-2 max-h-20 overflow-y-auto rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <AnimatePresence mode="popLayout">
              {log.slice(-4).map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-medium text-slate-300 leading-relaxed">
                  {l}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 px-3 pb-4">
            <Button
              onClick={() => playerAttack("normal")}
              disabled={!isPlayerTurn || !activePlayer?.isAlive || playerAlive.length === 0}
              size="lg" variant="secondary"
              className="flex-1 text-sm font-bold py-3 disabled:opacity-40"
            >
              <Swords size={15} />Đánh thường
            </Button>
            <Button
              onClick={() => playerAttack("ultimate")}
              disabled={!isPlayerTurn || !activePlayer?.isAlive || !canUseUltimate}
              size="lg"
              className={`flex-1 text-sm font-bold py-3 ${canUseUltimate ? "bg-amber-600 hover:bg-amber-500 shadow-amber-500/30" : "bg-amber-900/30"}`}
            >
              <Zap size={15} />Tuyệt chiêu
            </Button>
          </div>
        </div>
      )}

      {/* ─── RESULT ─── */}
      <AnimatePresence>
        {(stage === "victory" || stage === "defeat") && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 20 }}
              className="w-full max-w-sm rounded-3xl border-2 border-slate-700 bg-slate-900 p-8 text-center shadow-2xl"
            >
              {stage === "victory" ? (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 shadow-[0_0_24px_rgba(234,179,8,0.25)]">
                    <Trophy size={36} className="text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-wider text-amber-400">Chiến Thắng!</h2>
                  <p className="mt-2 text-sm text-slate-400">Bạn đánh bại tất cả boss.</p>
                  <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-amber-500/20 px-6 py-3">
                    <Sparkles size={18} className="text-amber-400" />
                    <span className="text-xl font-black text-amber-300">+{battleReward} EXP</span>
                  </div>
                  <Button onClick={() => { onWin(battleReward); onClose(); }} size="lg" className="mt-6 w-full text-sm font-bold py-3">
                    Nhận thưởng
                  </Button>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 text-5xl">💀</div>
                  <h2 className="text-2xl font-black uppercase tracking-wider text-slate-200">Thất Bại</h2>
                  <p className="mt-2 text-sm text-slate-400">Đội hình đã bị đánh bại hoàn toàn.</p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => { setStage("intro"); setPlayerTeam([]); setBossTeam([]); }}
                      size="lg" variant="secondary"
                      className="text-sm font-bold py-3"
                    >
                      Thử lại
                    </Button>
                    <Button onClick={onClose} size="lg" variant="ghost"
                      className="bg-white/10 text-white border-white/10 text-sm font-bold py-3">
                      Thoát
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
