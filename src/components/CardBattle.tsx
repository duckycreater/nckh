import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Zap, Trophy, ArrowLeft, Play, Sparkles, RotateCcw, X, Info } from "lucide-react";
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

type BattleStage = "intro" | "battle" | "victory" | "defeat";
type BattlePhase = "player" | "boss" | "waiting";

interface BattleCard {
  id: number;
  name: string;
  elementId: string;
  elementName: string;
  gradient: string;
  hp: number;
  maxHp: number;
  atk: number;
  level: number;
  isAlive: boolean;
  ultimateCharge: number;
}

const BOSS_NAMES = ["Tướng Quân", "Đại Sư", "Vương Giả"];

function getElementGradient(elementId: string): string {
  const el = ELEMENTS.find((e) => e.id === elementId);
  return el?.gradient || "from-slate-600 to-slate-800";
}

function buildBattleCard(cardId: number, level: number, atkMult = 1, hpMult = 1): BattleCard {
  const base = ALL_CARDS.find((c) => c.id === cardId);
  if (!base) {
    return { id: cardId, name: `Boss #${cardId}`, elementId: "plastic", elementName: "Nhựa", gradient: "from-slate-600 to-slate-800", hp: 0, maxHp: 0, atk: 0, level: 1, isAlive: false, ultimateCharge: 0 };
  }
  const hp = Math.floor(base.hp * (1 + (level - 1) * 0.15) * hpMult);
  const atk = Math.floor(base.atk * (1 + (level - 1) * 0.15) * atkMult);
  const el = ELEMENTS.find((e) => e.id === base.element.id);
  return {
    id: cardId, name: base.name, elementId: base.element.id,
    elementName: el?.name || base.element.name, gradient: el?.gradient || "from-slate-600 to-slate-800",
    hp, maxHp: hp, atk, level, isAlive: true, ultimateCharge: 0,
  };
}

function getAdvMult(attackerEl: string, defenderEl: string): number {
  if (getAdvantage(attackerEl) === defenderEl) return 1.5;
  if (getDisadvantage(attackerEl) === defenderEl) return 0.75;
  return 1.0;
}

function getAdvLabel(attackerEl: string, defenderEl: string): string | null {
  if (getAdvantage(attackerEl) === defenderEl) return "💥 Hiệu quả!";
  if (getDisadvantage(attackerEl) === defenderEl) return "⚠️ Yếu hơn!";
  return null;
}

// Element SVG art
function ElementArtMini({ elementId, size = 24 }: { elementId: string; size?: number }) {
  return getElementIcon(elementId, size);
}

// HP bar
function HpBar({ current, max, team }: { current: number; max: number; team: "player" | "boss" }) {
  if (max === 0) return null;
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const color = pct > 50 ? "bg-emerald-500" : pct > 25 ? "bg-amber-500" : "bg-red-500";
  const trackColor = team === "player" ? "bg-slate-700" : "bg-red-900";
  return (
    <div className={`w-full h-1.5 rounded-full overflow-hidden ${trackColor}`}>
      <motion.div
        className={`h-full rounded-full ${color}`}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}

// Card sprite in battle
function BattleCardSprite({ card, team, isActive, hpPct, showName }: {
  card: BattleCard; team: "player" | "boss"; isActive: boolean; hpPct: number; showName?: boolean;
}) {
  const deadOverlay = !card.isAlive;
  const activeBorder = isActive && card.isAlive ? (team === "player" ? "border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]" : "border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)]") : "border-slate-600";
  return (
    <div className={`flex flex-col items-center gap-1 ${card.isAlive ? "" : "opacity-40"}`}>
      {team === "boss" && (
        <span className="text-[8px] font-black text-red-400/70">{card.name.split(" ")[0]}</span>
      )}
      <motion.div
        animate={isActive && card.isAlive ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1.2, repeat: Infinity }}
        className={`relative flex flex-col items-center rounded-xl border-2 p-1.5 transition-all w-16 sm:w-20 ${activeBorder} ${
          team === "boss" ? "bg-gradient-to-b from-red-950/60 to-slate-900" : "bg-gradient-to-b from-blue-950/60 to-slate-900"
        }`}
      >
        {/* Element icon */}
        <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center ${!card.isAlive ? "grayscale" : ""}`}>
          <ElementArtMini elementId={card.elementId} size={28} />
        </div>

        {/* Level badge */}
        {card.level > 1 && (
          <div className="absolute -right-1 -top-1 z-10 rounded-full bg-amber-400 px-1 py-0.5 text-[7px] font-black text-white shadow">
            Lv{card.level}
          </div>
        )}

        {/* Name */}
        <p className="mt-0.5 text-[7px] font-bold text-slate-300 line-clamp-1 text-center leading-tight w-full">{showName !== false ? card.name.split(" ")[0] : ""}</p>

        {/* HP bar */}
        <div className="mt-0.5 w-full">
          <HpBar current={card.hp} max={card.maxHp} team={team} />
        </div>
        <p className={`text-[8px] font-black ${team === "player" ? "text-emerald-400" : "text-red-400"}`}>
          {Math.max(0, card.hp)}
        </p>

        {/* KO overlay */}
        {deadOverlay && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/70">
            <span className="text-xs font-black text-red-400">KO</span>
          </div>
        )}
        {isActive && card.isAlive && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-1.5 py-0.5 text-[6px] font-black text-white shadow">
            ĐẠI DIỆN
          </div>
        )}
      </motion.div>
      {team === "player" && (
        <span className="text-[8px] font-bold text-slate-300">{card.name.split(" ")[0]}</span>
      )}
    </div>
  );
}

// Attack projectile animation
function AttackProjectile({ from, to, type, onDone }: { from: "player" | "boss"; to: "player" | "boss"; type: "normal" | "ultimate"; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ x: from === "player" ? "-60%" : "60%", opacity: 1, scale: 1 }}
      animate={{ x: from === "player" ? "60%" : "-60%", opacity: [1, 1, 0], scale: [1, 1.5, 0.5] }}
      transition={{ duration: 0.5, ease: "easeIn" }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
    >
      <div className={`rounded-full flex items-center justify-center ${
        type === "ultimate"
          ? "w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_20px_rgba(251,191,36,0.8)]"
          : "w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
      }`}>
        {type === "ultimate" ? <Zap size={20} className="text-white" /> : <Swords size={14} className="text-white" />}
      </div>
    </motion.div>
  );
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
  const [phase, setPhase] = useState<BattlePhase>("waiting");
  const [projectile, setProjectile] = useState<{ from: "player" | "boss"; type: "normal" | "ultimate" } | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<{ id: string; value: number; target: "player" | "boss" }[]>([]);
  const playerRef = useRef<BattleCard[]>([]);
  const bossRef = useRef<BattleCard[]>([]);
  const isRunningRef = useRef(false);

  useEffect(() => { playerRef.current = playerTeam; }, [playerTeam]);
  useEffect(() => { bossRef.current = bossTeam; }, [bossTeam]);

  const level = CAMPAIGN_LEVELS.find((l) => l.id === selectedLevelId) || CAMPAIGN_LEVELS[0];

  const addDamageNumber = (id: string, value: number, target: "player" | "boss") => {
    const key = `${id}-${Date.now()}`;
    setDamageNumbers((prev) => [...prev, { id: key, value, target }]);
    setTimeout(() => setDamageNumbers((prev) => prev.filter((d) => d.id !== key)), 1200);
  };

  // ─── Start battle ─────────────────────────────────────────────────────────
  const startBattle = useCallback(() => {
    const team = deckCardIds.map((id) => buildBattleCard(id, cardLevels[String(id)] || 1));
    const firstAlive = team.findIndex((c) => c.isAlive);
    setPlayerTeam(team);
    setActivePlayerIdx(firstAlive >= 0 ? firstAlive : 0);

    const bosses = level.bossIds.map((bossId) => buildBattleCard(bossId, 1, level.bossAtkMult, level.bossHpMult));
    setBossTeam(bosses);

    setLog([`⚔️ Bắt đầu: ${level.name}`, `👹 Đối thủ: ${ELEMENTS.find((e) => e.id === level.element)?.name || level.element} (x3)`]);
    setTurnCount(0);
    setBattleReward(level.reward);
    setPhase("player");
    isRunningRef.current = true;
    setStage("battle");
  }, [deckCardIds, cardLevels, level]);

  // ─── Check end ────────────────────────────────────────────────────────────
  const checkEnd = useCallback((p: BattleCard[], b: BattleCard[]) => {
    const bAlive = b.filter((c) => c.isAlive);
    const pAlive = p.filter((c) => c.isAlive);
    if (bAlive.length === 0) { setPhase("waiting"); setStage("victory"); isRunningRef.current = false; return true; }
    if (pAlive.length === 0) { setPhase("waiting"); setStage("defeat"); isRunningRef.current = false; return true; }
    return false;
  }, []);

  // ─── Player attack ─────────────────────────────────────────────────────────
  const runPlayerAttack = useCallback((type: "normal" | "ultimate") => {
    if (!isRunningRef.current || phase !== "player") return;
    const p = playerRef.current;
    const b = bossRef.current;
    const attacker = p[activePlayerIdx];
    if (!attacker?.isAlive) { setPhase("player"); return; }
    const target = b.find((c) => c.isAlive);
    if (!target) return;

    setPhase("waiting");

    // Charge ultimate
    if (type === "normal") {
      setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx ? { ...c, ultimateCharge: Math.min(100, c.ultimateCharge + 35) } : c));
    }

    // Multiplier
    const mult = getAdvMult(attacker.elementId, target.elementId);
    const baseDmg = type === "ultimate"
      ? Math.floor(attacker.atk * 2.5)
      : Math.floor(attacker.atk * (0.8 + Math.random() * 0.4));
    const dmg = Math.floor(baseDmg * mult);
    const note = getAdvLabel(attacker.elementId, target.elementId) || "";

    // Projectile
    setProjectile({ from: "player", type });

    setTimeout(() => {
      setProjectile(null);
      setLog((prev) => [...prev.slice(-4), `${type === "ultimate" ? "💥" : "⚔️"} ${attacker.name} → ${dmg} dmg${note ? " " + note : ""}`]);
      addDamageNumber(String(target.id), dmg, "boss");

      setBossTeam((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== target.id || !c.isAlive) return c;
          const newHp = Math.max(0, c.hp - dmg);
          return { ...c, hp: newHp, isAlive: newHp > 0 };
        });
        if (type === "ultimate") {
          setPlayerTeam((pp) => pp.map((c, i) => i === activePlayerIdx ? { ...c, ultimateCharge: 0 } : c));
        }
        setTimeout(() => {
          if (!checkEnd(playerRef.current, updated)) {
            // Switch to boss turn
            setTimeout(() => runBossTurn(), 800);
          }
        }, 300);
        return updated;
      });

      setTurnCount((t) => t + 1);
    }, 500);
  }, [phase, activePlayerIdx, checkEnd]);

  // ─── Boss turn ────────────────────────────────────────────────────────────
  const runBossTurn = useCallback(() => {
    if (!isRunningRef.current) return;
    const p = playerRef.current;
    const b = bossRef.current;
    const boss = b.find((c) => c.isAlive);
    const pAlive = p.filter((c) => c.isAlive);
    if (!boss || pAlive.length === 0) return;

    const aliveIdx = p.findIndex((c) => c.isAlive);
    if (aliveIdx === -1) return;
    const target = p[aliveIdx];

    setProjectile({ from: "boss", type: "normal" });

    setTimeout(() => {
      setProjectile(null);
      const mult = getAdvMult(boss.elementId, target.elementId);
      const bossDmg = Math.floor(boss.atk * (0.8 + Math.random() * 0.4));
      const finalDmg = Math.floor(bossDmg * mult);
      const note = getAdvLabel(boss.elementId, target.elementId) || "";

      setLog((prev) => [...prev.slice(-4), `👹 ${boss.name} → ${finalDmg} dmg${note ? " " + note : ""}`]);
      addDamageNumber(`p${target.id}`, finalDmg, "player");

      setPlayerTeam((prev) => {
        const updated = prev.map((c, i) => {
          if (i !== aliveIdx || !c.isAlive) return c;
          const newHp = Math.max(0, c.hp - finalDmg);
          return { ...c, hp: newHp, isAlive: newHp > 0 };
        });

        // Switch active to next alive
        const nextAlive = updated.findIndex((c, i) => i > aliveIdx && c.isAlive);
        setActivePlayerIdx(nextAlive !== -1 ? nextAlive : updated.findIndex((c) => c.isAlive));

        setTimeout(() => {
          if (!checkEnd(updated, bossRef.current)) {
            setPhase("player");
          }
        }, 300);
        return updated;
      });
    }, 500);
  }, [checkEnd]);

  const canUseUltimate = playerTeam[activePlayerIdx]?.ultimateCharge >= 100 && phase === "player";
  const bossAlive = bossTeam.filter((c) => c.isAlive);
  const playerAlive = playerTeam.filter((c) => c.isAlive);
  const activePlayer = playerTeam[activePlayerIdx];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <Button
          onClick={() => { isRunningRef.current = false; onClose(); }}
          variant="ghost"
          className="bg-white/10 text-white border-white/10 hover:bg-white/20 text-xs px-2 py-1"
        >
          <ArrowLeft size={13} /> Thoát
        </Button>
        <div className="flex items-center gap-2">
          <Badge tone="warning">Đấu Trường</Badge>
          <span className="text-[10px] text-white/40 font-mono">{turnCount} lượt</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-black text-red-400">
            {bossAlive.length}/3
          </span>
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-black text-blue-400">
            {playerAlive.length}/5
          </span>
        </div>
      </div>

      {/* ─── INTRO ─── */}
      {stage === "intro" && (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 overflow-y-auto p-4">
          <div className="text-center pt-4">
            <h2 className="text-2xl font-black text-white">Chọn Chiến Dịch</h2>
            <p className="mt-1 text-sm text-slate-400">Đánh bại 3 boss để thắng. Auto-battle!</p>
          </div>

          <div className="w-full max-w-sm space-y-2 pb-4">
            {CAMPAIGN_LEVELS.map((lvl) => {
              const bossEl = ELEMENTS.find((e) => e.id === lvl.element);
              return (
                <button key={lvl.id} onClick={() => setSelectedLevelId(lvl.id)}
                  className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                    selectedLevelId === lvl.id
                      ? "border-amber-400 bg-amber-950/20 shadow-[0_0_16px_rgba(234,179,8,0.1)]"
                      : "border-slate-700 bg-slate-900/70 hover:bg-slate-900"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      selectedLevelId === lvl.id ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-500"
                    }`}>
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
                            {getElementIcon(lvl.element, 10)} {bossEl.name}
                          </span>
                        )}
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
            <Button onClick={startBattle} size="lg" className="w-full max-w-sm text-base font-black py-3 shadow-lg">
              <Swords size={18} />Xông trận!
            </Button>
          ) : (
            <div className="w-full max-w-sm rounded-xl border border-red-900/50 bg-red-950/20 p-3 text-center">
              <p className="text-sm font-bold text-red-400">Cần 5 thẻ trong đội hình</p>
            </div>
          )}
        </div>
      )}

      {/* ─── BATTLE ─── */}
      {stage === "battle" && (
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Boss zone */}
          <div className="border-b border-white/10 bg-gradient-to-b from-red-950/30 to-transparent px-3 py-3">
            <div className="mb-2 flex items-center justify-center gap-4">
              {bossTeam.map((b) => (
                <div key={b.id} className="relative">
                  <BattleCardSprite
                    card={b} team="boss"
                    isActive={b.id === bossAlive[0]?.id && b.isAlive}
                    hpPct={b.maxHp > 0 ? b.hp / b.maxHp : 0}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center py-1.5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="px-3 text-lg font-black italic text-amber-500/25 select-none">VS</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Player zone */}
          <div className="flex-1 px-3 py-3">
            <div className="mb-2 flex items-center justify-center gap-3">
              {playerTeam.map((p, i) => (
                <BattleCardSprite
                  key={p.id} card={p} team="player"
                  isActive={i === activePlayerIdx}
                  hpPct={p.maxHp > 0 ? p.hp / p.maxHp : 0}
                />
              ))}
            </div>

            {/* Ultimate bar */}
            {activePlayer?.isAlive && phase === "player" && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <Zap size={12} className={canUseUltimate ? "text-amber-400" : "text-slate-500"} />
                <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    className={`h-full rounded-full ${canUseUltimate ? "bg-amber-400" : "bg-blue-500"}`}
                    animate={{ width: `${activePlayer.ultimateCharge}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{activePlayer.ultimateCharge}%</span>
              </div>
            )}
          </div>

          {/* Log */}
          <div className="mx-3 mb-2 max-h-16 overflow-y-auto rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            {log.slice(-3).map((l, i) => (
              <p key={i} className="text-[10px] font-medium text-slate-300 leading-relaxed">{l}</p>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 px-3 pb-4">
            <Button
              onClick={() => runPlayerAttack("normal")}
              disabled={phase !== "player" || !activePlayer?.isAlive}
              size="lg" variant="secondary"
              className="flex-1 text-sm font-bold py-3 disabled:opacity-30"
            >
              <Swords size={14} />Đánh
            </Button>
            <Button
              onClick={() => runPlayerAttack("ultimate")}
              disabled={!canUseUltimate}
              size="lg"
              className={`flex-1 text-sm font-bold py-3 ${canUseUltimate ? "bg-amber-600 hover:bg-amber-500 shadow-amber-500/30" : "bg-amber-900/30"}`}
            >
              <Zap size={14} />Tuyệt chiêu
            </Button>
          </div>

          {/* Projectile overlay */}
          <AnimatePresence>
            {projectile && (
              <div className="pointer-events-none absolute inset-0 z-30">
                <AttackProjectile from={projectile.from} to={projectile.from === "player" ? "boss" : "player"} type={projectile.type} onDone={() => setProjectile(null)} />
              </div>
            )}
          </AnimatePresence>

          {/* Damage numbers */}
          {damageNumbers.map((d) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -40, scale: 1.2 }}
              transition={{ duration: 1 }}
              className={`absolute left-1/2 z-40 text-2xl font-black drop-shadow-lg ${
                d.target === "boss" ? "-translate-x-1/2 top-1/3 text-red-400" : "-translate-x-1/2 top-1/2 text-blue-400"
              }`}
            >
              -{d.value}
            </motion.div>
          ))}
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
              initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 20 }}
              className="w-full max-w-sm rounded-3xl border-2 border-slate-700 bg-slate-900 p-8 text-center shadow-2xl"
            >
              {stage === "victory" ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10 }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 shadow-[0_0_30px_rgba(234,179,8,0.3)]"
                  >
                    <Trophy size={36} className="text-amber-400" />
                  </motion.div>
                  <h2 className="text-2xl font-black uppercase tracking-wider text-amber-400">Chiến Thắng!</h2>
                  <p className="mt-2 text-sm text-slate-400">Đánh bại tất cả boss.</p>
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
                    <Button onClick={() => { setStage("intro"); setPlayerTeam([]); setBossTeam([]); }} size="lg" variant="secondary" className="text-sm font-bold py-3">
                      <RotateCcw size={14} />Thử lại
                    </Button>
                    <Button onClick={onClose} size="lg" variant="ghost" className="bg-white/10 text-white border-white/10 text-sm font-bold py-3">
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
