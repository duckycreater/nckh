import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Zap, Trophy, ArrowLeft, Play, Sparkles, RotateCcw, Star, Shield, Heart, Flame } from "lucide-react";
import { ALL_CARDS, getElementIcon, ELEMENTS, getAdvantage, getDisadvantage } from "../lib/cards";
import { Badge, Button } from "../lib/ui";

interface Props {
  deckCardIds: number[];
  cardLevels: Record<string, number>;
  onClose: () => void;
  onWin: (exp: number) => void;
}

const CAMPAIGN_LEVELS = [
  { id: 1, name: "Vùng Đất Rác Thiếc", bossIds: [101, 102, 103], bossHpMult: 0.6, bossAtkMult: 0.5, reward: 30, element: "plastic" },
  { id: 2, name: "Đầm Lầy Nhựa Độc", bossIds: [201, 202, 203], bossHpMult: 0.9, bossAtkMult: 0.8, reward: 60, element: "hazard" },
  { id: 3, name: "Núi Chế Phẩm Hữu Cơ", bossIds: [151, 152, 153], bossHpMult: 1.2, bossAtkMult: 1.0, reward: 120, element: "organic" },
  { id: 4, name: "Rừng Kim Loại Gỉ", bossIds: [251, 252, 253], bossHpMult: 1.6, bossAtkMult: 1.5, reward: 200, element: "metal" },
  { id: 5, name: "Lõi Lò Đốt Rác", bossIds: [301, 302, 303], bossHpMult: 2.8, bossAtkMult: 2.2, reward: 500, element: "hazard" },
];

type BattleStage = "intro" | "battle" | "victory" | "defeat";
type TurnPhase = "idle" | "player_attack" | "boss_attack" | "ultimate_hit" | "victory_anim" | "defeat_anim";

interface BattleCard {
  id: number;
  name: string;
  elementId: string;
  gradient: string;
  accentColor: string;
  hp: number;
  maxHp: number;
  atk: number;
  level: number;
  isAlive: boolean;
  ultimateCharge: number;
}

interface DmgNum {
  id: string;
  value: number;
  target: "player" | "boss";
  isCrit: boolean;
  isSuper: boolean;
}

function buildBattleCard(cardId: number, level: number, atkMult = 1, hpMult = 1): BattleCard {
  const base = ALL_CARDS.find((c) => c.id === cardId);
  if (!base) {
    return { id: cardId, name: `Boss #${cardId}`, elementId: "plastic", gradient: "from-cyan-600 to-blue-800", accentColor: "#06b6d4", hp: 0, maxHp: 0, atk: 0, level: 1, isAlive: false, ultimateCharge: 0 };
  }
  const el = ELEMENTS.find((e) => e.id === base.element.id);
  const hp = Math.floor(base.hp * (1 + (level - 1) * 0.15) * hpMult);
  const atk = Math.floor(base.atk * (1 + (level - 1) * 0.15) * atkMult);
  return { id: cardId, name: base.name, elementId: base.element.id, gradient: el?.gradient || "from-slate-600 to-slate-800", accentColor: el?.accent || "#94a3b8", hp, maxHp: hp, atk, level, isAlive: true, ultimateCharge: 0 };
}

function getAdvantageInfo(attackerEl: string, defenderEl: string): { mult: number; label: string; color: string } | null {
  if (getAdvantage(attackerEl) === defenderEl) return { mult: 1.5, label: "Hiệu quả!", color: "#22c55e" };
  if (getDisadvantage(attackerEl) === defenderEl) return { mult: 0.75, label: "Yếu hơn!", color: "#ef4444" };
  return null;
}

// ─── Type Badge ───────────────────────────────────────────────────────────────
function TypeBadge({ elementId, size = "sm" }: { elementId: string; size?: "sm" | "lg" }) {
  const el = ELEMENTS.find((e) => e.id === elementId);
  if (!el) return null;
  const sz = size === "lg" ? 18 : 12;
  return (
    <div className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-white" style={{ backgroundColor: el.accent + "cc" }}>
      {getElementIcon(elementId, sz)}
      {size === "lg" && <span className="text-[10px] font-black">{el.name}</span>}
    </div>
  );
}

// ─── HP Bar ───────────────────────────────────────────────────────────────────
function HpBar({ current, max, accent }: { current: number; max: number; accent: string }) {
  if (max === 0) return null;
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const barColor = pct > 50 ? "#22c55e" : pct > 25 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-full">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Shine overlay */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </div>
  );
}

// ─── Battle Card (Pokemon GO style circular avatar) ─────────────────────────────
function BattleCardAvatar({ card, team, isActive, shake, isHit, attackAnim, isUltimate }: {
  card: BattleCard; team: "player" | "boss"; isActive: boolean; shake?: boolean;
  isHit?: boolean; attackAnim?: boolean; isUltimate?: boolean;
}) {
  const dead = !card.isAlive;
  const activeGlow = isActive && card.isAlive
    ? (team === "player" ? `0 0 20px ${card.accentColor}80, 0 0 40px ${card.accentColor}40` : "0 0 20px #ef444480")
    : "none";

  return (
    <motion.div
      animate={[
        dead ? {} : isActive ? { scale: [1, 1.05, 1] } : {},
        shake ? { x: [-6, 6, -4, 4, 0] } : {},
        isHit ? { filter: ["brightness(1)", "brightness(2)", "brightness(1)"] } : {},
        attackAnim ? (team === "player" ? { x: [0, 60] } : { x: [0, -60] }) : { x: 0 },
      ]}
      transition={[
        { duration: 1.2, repeat: Infinity },
        { duration: 0.15 },
        { duration: 0.15 },
        { duration: isUltimate ? 0.25 : 0.2, ease: "easeOut" },
      ]}
      className="relative flex flex-col items-center gap-1"
    >
      {/* Level / name tag */}
      {team === "boss" && (
        <motion.p
          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className="text-[8px] font-black text-red-400/80 whitespace-nowrap"
        >
          {card.name.split(" ")[0]}
        </motion.p>
      )}

      {/* Avatar circle */}
      <motion.div
        className="relative"
        style={{ filter: dead ? "grayscale(1) brightness(0.5)" : undefined }}
      >
        {/* Outer glow ring */}
        {isActive && card.isAlive && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: `radial-gradient(circle, ${card.accentColor}40, transparent 70%)` }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Main avatar circle */}
        <div
          className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 backdrop-blur-sm"
          style={{
            background: `linear-gradient(135deg, ${card.accentColor}40, ${card.accentColor}15)`,
            borderColor: isActive && card.isAlive ? card.accentColor : "rgba(255,255,255,0.1)",
            boxShadow: activeGlow,
          }}
        >
          {/* Element gradient bg */}
          <div className={`absolute inset-1 rounded-full bg-gradient-to-br ${card.gradient} opacity-80`} />

          {/* Element icon */}
          <div className="relative z-10">
            {getElementIcon(card.elementId, 32)}
          </div>

          {/* KO overlay */}
          {dead && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-black/70">
              <span className="text-[10px] font-black text-red-400">KO</span>
            </div>
          )}

          {/* Level badge */}
          {card.level > 1 && !dead && (
            <div className="absolute -right-1 -top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-black text-white shadow-lg">
              <Star size={7} className="fill-white" />
            </div>
          )}
        </div>
      </motion.div>

      {/* HP bar */}
      <div className="w-16">
        <HpBar current={card.hp} max={card.maxHp} accent={card.accentColor} />
      </div>
      <p className={`text-[9px] font-black ${team === "player" ? "text-emerald-400" : "text-red-400"}`}>
        {Math.max(0, card.hp)}/{card.maxHp}
      </p>

      {/* Active indicator */}
      {isActive && card.isAlive && team === "player" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-1.5 py-0.5 text-[7px] font-black text-white shadow"
        >
          ĐẠI DIỆN
        </motion.div>
      )}

      {team === "player" && (
        <p className="text-[7px] font-bold text-slate-400 whitespace-nowrap">{card.name.split(" ")[0]}</p>
      )}
    </motion.div>
  );
}

// ─── Damage Number ─────────────────────────────────────────────────────────────
function DamageNumber({ num }: { num: DmgNum }) {
  const color = num.isSuper ? "#22c55e" : num.isCrit ? "#f59e0b" : num.target === "boss" ? "#ef4444" : "#60a5fa";
  const scale = num.isCrit ? 1.4 : num.isSuper ? 1.2 : 1.0;

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.3, rotate: -10 }}
      animate={{ opacity: 0, y: -50, scale, rotate: 5 }}
      transition={{ duration: 1.0, ease: "easeOut" }}
      className="absolute left-1/2 z-50 font-black text-white pointer-events-none text-center"
      style={{ color, textShadow: `0 0 10px ${color}, 0 2px 4px rgba(0,0,0,0.8)` }}
    >
      <div className="text-3xl leading-none">-{num.value}</div>
      {num.isCrit && <div className="text-[10px] font-black uppercase tracking-wider">Chí mạng!</div>}
      {num.isSuper && <div className="text-[10px] font-black uppercase tracking-wider">Hiệu quả!</div>}
    </motion.div>
  );
}

// ─── Effectiveness Banner ──────────────────────────────────────────────────────
function EffectivenessBanner({ info, side }: { info: { label: string; color: string }; side: "player" | "boss" }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "player" ? -80 : 80, scale: 0.5 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 0, scale: 0.5, y: -20 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="absolute z-40 rounded-full px-3 py-1.5 text-xs font-black text-white shadow-lg"
      style={{ backgroundColor: info.color + "ee", boxShadow: `0 0 16px ${info.color}80`, top: "50%", [side === "player" ? "left" : "right"]: "5%" }}
    >
      {info.label}
    </motion.div>
  );
}

// ─── Confetti for victory ─────────────────────────────────────────────────────
function VictoryConfetti() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    color: ["#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#f97316"][Math.floor(Math.random() * 6)],
    size: Math.random() * 8 + 4,
    shape: Math.random() > 0.5 ? "circle" : "square",
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: "-10%", x: `${p.x}%`, opacity: 1, scale: 0, rotate: 0 }}
          animate={{ y: "120%", opacity: [1, 1, 0], scale: [0, 1, 0.8], rotate: Math.random() * 720 - 360 }}
          transition={{ duration: 2.5, delay: p.delay, ease: "easeIn" }}
          className="absolute"
          style={{
            width: p.size, height: p.size,
            background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            boxShadow: `0 0 6px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Ultimate explosion overlay ────────────────────────────────────────────────
function UltimateFlash({ active, color }: { active: boolean; color: string }) {
  if (!active) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.8, 0] }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 z-40 pointer-events-none"
      style={{ background: `radial-gradient(circle at center, ${color}60, transparent 70%)` }}
    />
  );
}

// ─── Screen shake wrapper ──────────────────────────────────────────────────────
function ScreenShake({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      animate={active ? { x: [-4, 4, -3, 3, -2, 2, 0] } : {}}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function CardBattle({ deckCardIds, cardLevels, onClose, onWin }: Props) {
  const [stage, setStage] = useState<BattleStage>("intro");
  const [selectedLevelId, setSelectedLevelId] = useState<number>(1);
  const [playerTeam, setPlayerTeam] = useState<BattleCard[]>([]);
  const [bossTeam, setBossTeam] = useState<BattleCard[]>([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState<number>(0);
  const [log, setLog] = useState<string[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [battleReward, setBattleReward] = useState(0);
  const [phase, setPhase] = useState<TurnPhase>("idle");
  const [dmgNums, setDmgNums] = useState<DmgNum[]>([]);
  const [effectBanner, setEffectBanner] = useState<{ info: { label: string; color: string }; side: "player" | "boss" } | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isHit, setIsHit] = useState<"player" | "boss" | null>(null);
  const [attackAnim, setAttackAnim] = useState<"player" | "boss" | null>(null);
  const [ultimateFlash, setUltimateFlash] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [showIntro, setShowIntro] = useState(false);
  const pRef = useRef<BattleCard[]>([]);
  const bRef = useRef<BattleCard[]>([]);
  const isRunningRef = useRef(false);
  const activeBossIdxRef = useRef(0);

  useEffect(() => { pRef.current = playerTeam; }, [playerTeam]);
  useEffect(() => { bRef.current = bossTeam; }, [bossTeam]);

  const level = CAMPAIGN_LEVELS.find((l) => l.id === selectedLevelId) || CAMPAIGN_LEVELS[0];

  const spawnDmg = useCallback((id: string, value: number, target: "player" | "boss", isCrit = false, isSuper = false) => {
    const key = `${id}-${Date.now()}-${Math.random()}`;
    setDmgNums((prev) => [...prev.filter((d) => d.id !== key), { id: key, value, target, isCrit, isSuper }]);
    setTimeout(() => setDmgNums((prev) => prev.filter((d) => d.id !== key)), 1200);
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);
  }, []);

  const triggerHit = useCallback((target: "player" | "boss") => {
    setIsHit(target);
    setTimeout(() => setIsHit(null), 200);
  }, []);

  const showBanner = useCallback((info: { label: string; color: string }, side: "player" | "boss") => {
    setEffectBanner({ info, side });
    setTimeout(() => setEffectBanner(null), 1500);
  }, []);

  // ─── Start battle ─────────────────────────────────────────────────────────
  const startBattle = useCallback(() => {
    const team = deckCardIds.map((id) => buildBattleCard(id, cardLevels[String(id)] || 1));
    const firstAlive = team.findIndex((c) => c.isAlive);
    setPlayerTeam(team);
    setActivePlayerIdx(firstAlive >= 0 ? firstAlive : 0);

    const bosses = level.bossIds.map((bossId) => buildBattleCard(bossId, 1, level.bossAtkMult, level.bossHpMult));
    setBossTeam(bosses);

    setLog([`⚔️ Chiến dịch: ${level.name}`, `👹 Đối thủ: ${ELEMENTS.find((e) => e.id === level.element)?.name || level.element} (x3)`]);
    setTurnCount(0);
    setBattleReward(level.reward);
    setPhase("idle");
    setComboCount(0);
    activeBossIdxRef.current = 0;
    isRunningRef.current = true;
    setStage("battle");
    setShowIntro(true);
    setTimeout(() => setShowIntro(false), 2000);
  }, [deckCardIds, cardLevels, level]);

  // ─── Check end ────────────────────────────────────────────────────────────
  const checkEnd = useCallback((p: BattleCard[], b: BattleCard[]) => {
    const bAlive = b.filter((c) => c.isAlive);
    const pAlive = p.filter((c) => c.isAlive);
    if (bAlive.length === 0) {
      setPhase("victory_anim");
      setStage("victory");
      isRunningRef.current = false;
      return true;
    }
    if (pAlive.length === 0) {
      setPhase("defeat_anim");
      setStage("defeat");
      isRunningRef.current = false;
      return true;
    }
    return false;
  }, []);

  // ─── Player attacks ────────────────────────────────────────────────────────
  const runPlayerAttack = useCallback((type: "normal" | "ultimate") => {
    if (!isRunningRef.current || (phase !== "idle" && phase !== "player_attack")) return;
    const p = pRef.current;
    const b = bRef.current;
    const attacker = p[activePlayerIdx];
    if (!attacker?.isAlive) { setPhase("idle"); return; }
    const targetIdx = b.findIndex((c) => c.isAlive);
    if (targetIdx === -1) return;
    const target = b[targetIdx];

    setPhase("idle");
    setAttackAnim("player");

    setTimeout(() => {
      setAttackAnim(null);
      triggerHit("boss");
      if (type === "ultimate") { setUltimateFlash(true); setTimeout(() => setUltimateFlash(false), 600); }
      triggerShake();

      const advInfo = getAdvantageInfo(attacker.elementId, target.elementId);
      const mult = advInfo?.mult ?? 1;
      const baseDmg = type === "ultimate"
        ? Math.floor(attacker.atk * 3.0)
        : Math.floor(attacker.atk * (0.85 + Math.random() * 0.3));
      const dmg = Math.floor(baseDmg * mult);
      const isCrit = type === "ultimate" || Math.random() < 0.1;

      if (advInfo) showBanner(advInfo, "boss");
      spawnDmg(String(target.id), dmg, "boss", isCrit, mult > 1);

      if (type === "normal") {
        setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx ? { ...c, ultimateCharge: Math.min(100, c.ultimateCharge + 30) } : c));
      }

      setLog((prev) => [...prev.slice(-4), `${type === "ultimate" ? "💥" : "⚔️"} ${attacker.name} → ${dmg} dmg${advInfo ? ` (${advInfo.label})` : ""}${isCrit ? " [Chí mạng!]" : ""}`]);

      const newDmg = Math.max(0, target.hp - dmg);
      const targetDied = newDmg === 0 && target.isAlive;

      setBossTeam((prev) => prev.map((c, i) => {
        if (i !== targetIdx) return c;
        return { ...c, hp: newDmg, isAlive: newDmg > 0 };
      }));

      if (targetDied) {
        setComboCount((c) => c + 1);
        activeBossIdxRef.current = prev => {
          const next = prev.filter((c) => c.isAlive);
          return next.length > 0 ? prev.indexOf(next[0]) : 0;
        };
        setLog((prev) => [...prev, `🔥 ${target.name} đã bị đánh bại!`]);
      }

      setTurnCount((t) => t + 1);

      setTimeout(() => {
        if (!checkEnd(pRef.current, bRef.current.map((c, i) => i === targetIdx ? { ...c, hp: newDmg, isAlive: newDmg > 0 } : c))) {
          setPhase("boss_attack");
          setTimeout(() => runBossAttack(), 1200);
        }
      }, 600);
    }, type === "ultimate" ? 400 : 300);
  }, [phase, activePlayerIdx, checkEnd, triggerShake, triggerHit, spawnDmg, showBanner]);

  // ─── Boss attacks ─────────────────────────────────────────────────────────
  const runBossAttack = useCallback(() => {
    if (!isRunningRef.current) return;
    const p = pRef.current;
    const b = bRef.current;
    const bossAlive = b.filter((c) => c.isAlive);
    const playerAlive = p.filter((c) => c.isAlive);
    if (bossAlive.length === 0 || playerAlive.length === 0) return;

    const bossIdx = b.findIndex((c) => c.isAlive);
    if (bossIdx === -1) return;
    const boss = b[bossIdx];
    const aliveIdx = p.findIndex((c) => c.isAlive);
    if (aliveIdx === -1) return;
    const target = p[aliveIdx];

    setAttackAnim("boss");

    setTimeout(() => {
      setAttackAnim(null);
      triggerHit("player");
      triggerShake();

      const advInfo = getAdvantageInfo(boss.elementId, target.elementId);
      const mult = advInfo?.mult ?? 1;
      const bossDmg = Math.floor(boss.atk * (0.85 + Math.random() * 0.3) * mult);
      const isCrit = Math.random() < 0.08;

      if (advInfo) showBanner(advInfo, "player");
      spawnDmg(`p${target.id}`, bossDmg, "player", isCrit, mult > 1);

      setLog((prev) => [...prev.slice(-4), `👹 ${boss.name} → ${bossDmg} dmg${advInfo ? ` (${advInfo.label})` : ""}`]);

      const newHp = Math.max(0, target.hp - bossDmg);
      const died = newHp === 0 && target.isAlive;

      setPlayerTeam((prev) => {
        const updated = prev.map((c, i) => {
          if (i !== aliveIdx) return c;
          return { ...c, hp: newHp, isAlive: newHp > 0 };
        });

        // Switch active to next alive
        const nextAlive = updated.findIndex((c, i) => i > aliveIdx && c.isAlive);
        const newIdx = nextAlive !== -1 ? nextAlive : updated.findIndex((c) => c.isAlive);
        if (newIdx !== -1 && newIdx !== activePlayerIdx) setActivePlayerIdx(newIdx);

        setTimeout(() => {
          if (!checkEnd(updated, bRef.current)) {
            setPhase("idle");
          }
        }, 400);
        return updated;
      });
    }, 300);
  }, [checkEnd, triggerShake, triggerHit, spawnDmg, showBanner, activePlayerIdx]);

  const canUltimate = playerTeam[activePlayerIdx]?.isAlive && playerTeam[activePlayerIdx]?.ultimateCharge >= 100 && (phase === "idle" || phase === "player_attack");
  const bossAlive = bossTeam.filter((c) => c.isAlive);
  const playerAlive = playerTeam.filter((c) => c.isAlive);
  const activePlayer = playerTeam[activePlayerIdx];
  const activeBossIdx = bossAlive.length > 0 ? bossTeam.findIndex((c) => c.isAlive) : -1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <Button
          onClick={() => { isRunningRef.current = false; onClose(); }}
          variant="ghost"
          className="bg-white/10 text-white border-white/10 hover:bg-white/20 text-xs px-2 py-1"
        >
          <ArrowLeft size={13} /> Thoát
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 border border-white/10">
            <Flame size={11} className={comboCount > 0 ? "text-amber-400" : "text-slate-500"} />
            {comboCount > 0 && <span className="text-[10px] font-black text-amber-400">{comboCount} combo</span>}
          </div>
          <Badge tone="warning">Đấu Trường</Badge>
          <span className="rounded-full bg-black/40 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-white/40">{turnCount} lượt</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 border border-white/10">
            <Shield size={10} className="text-red-400" />
            <span className="text-[10px] font-black text-red-400">{bossAlive.length}/3</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 border border-white/10">
            <Heart size={10} className="text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400">{playerAlive.length}/5</span>
          </div>
        </div>
      </div>

      {/* ─── INTRO ─── */}
      {stage === "intro" && (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 overflow-y-auto p-4">
          <div className="text-center pt-4">
            <h2 className="text-2xl font-black text-white">Chọn Chiến Dịch</h2>
            <p className="mt-1 text-sm text-slate-400">Đánh bại 3 boss để thắng!</p>
          </div>

          <div className="w-full max-w-sm space-y-2 pb-4">
            {CAMPAIGN_LEVELS.map((lvl) => {
              const bossEl = ELEMENTS.find((e) => e.id === lvl.element);
              return (
                <button key={lvl.id} onClick={() => setSelectedLevelId(lvl.id)}
                  className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                    selectedLevelId === lvl.id
                      ? "border-amber-400 bg-amber-950/20 shadow-[0_0_16px_rgba(234,179,8,0.15)]"
                      : "border-slate-700 bg-slate-900/70 hover:bg-slate-900"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedLevelId === lvl.id ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-500"}`}>
                      <Trophy size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-white truncate">{lvl.name}</h3>
                      <div className="mt-1 flex items-center gap-2 text-[10px]">
                        <span className="flex items-center gap-0.5 font-bold text-amber-400">
                          <Sparkles size={9} />{lvl.reward} EXP
                        </span>
                        {bossEl && (
                          <span className="flex items-center gap-0.5 text-slate-500">
                            {getElementIcon(lvl.element, 10)} {bossEl.name}
                          </span>
                        )}
                        <TypeBadge elementId={lvl.element} />
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
            <Button onClick={startBattle} size="lg" className="w-full max-w-sm text-base font-black py-3 shadow-lg shadow-amber-500/20">
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
        <ScreenShake active={isShaking}>
          <div className="relative flex flex-1 flex-col overflow-hidden">

            {/* Intro overlay */}
            <AnimatePresence>
              {showIntro && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center bg-black/80"
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="text-center"
                  >
                    <h2 className="text-3xl font-black text-white">Chiến Dịch</h2>
                    <p className="mt-1 text-lg font-black text-amber-400">{level.name}</p>
                    <p className="mt-3 text-sm text-slate-400">Hãy đánh bại tất cả boss!</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Boss zone */}
            <div className="relative z-10 border-b border-white/10 bg-gradient-to-b from-red-950/20 to-transparent px-2 py-3">
              {/* Campaign element banner */}
              <div className="mb-2 flex items-center justify-center">
                <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 border border-white/10">
                  <TypeBadge elementId={level.element} size="lg" />
                  <span className="text-[10px] font-black text-white/60">{ELEMENTS.find((e) => e.id === level.element)?.name} Boss</span>
                </div>
              </div>

              <div className="flex items-end justify-center gap-3">
                {bossTeam.map((b, i) => (
                  <BattleCardAvatar
                    key={b.id}
                    card={b}
                    team="boss"
                    isActive={b.id === bossAlive[0]?.id && b.isAlive}
                    shake={isHit === "boss" && b.id === bossAlive[0]?.id}
                    isHit={isHit === "boss" && b.id === bossAlive[0]?.id}
                    attackAnim={attackAnim === "player" && b.id === bossAlive[0]?.id}
                  />
                ))}
              </div>
            </div>

            {/* VS divider */}
            <div className="relative flex items-center justify-center py-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="relative z-10 px-3 text-center">
                <span className="text-xl font-black italic text-amber-500/20 select-none">VS</span>
                {/* Turn indicator */}
                <div className="mt-1">
                  {phase === "idle" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-full bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 text-[8px] font-black text-blue-400">
                      Lượt bạn
                    </motion.div>
                  )}
                  {phase === "boss_attack" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[8px] font-black text-red-400">
                      Lượt Boss
                    </motion.div>
                  )}
                </div>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Player zone */}
            <div className="relative z-10 flex-1 px-2 py-3">
              <div className="flex items-start justify-center gap-2">
                {playerTeam.map((p, i) => (
                  <BattleCardAvatar
                    key={p.id}
                    card={p}
                    team="player"
                    isActive={i === activePlayerIdx}
                    shake={isHit === "player" && i === activePlayerIdx}
                    isHit={isHit === "player" && i === activePlayerIdx}
                    attackAnim={attackAnim === "boss" && i === activePlayerIdx}
                  />
                ))}
              </div>

              {/* Ultimate charge bar */}
              {activePlayer?.isAlive && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Zap size={12} className={canUltimate ? "text-amber-400" : "text-slate-500"} />
                  <div className="relative h-2.5 w-32 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: canUltimate ? "#f59e0b" : "#3b82f6" }}
                      animate={{ width: `${activePlayer.ultimateCharge}%` }}
                      transition={{ duration: 0.3 }}
                    />
                    {canUltimate && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent"
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: canUltimate ? "#f59e0b" : "#64748b" }}>
                    {activePlayer.ultimateCharge}%
                  </span>
                  {canUltimate && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="rounded-full bg-amber-400/20 border border-amber-400/50 px-1.5 py-0.5 text-[8px] font-black text-amber-400"
                    >
                      Sẵn sàng!
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Effectiveness banner */}
            <AnimatePresence>
              {effectBanner && <EffectivenessBanner key="banner" info={effectBanner.info} side={effectBanner.side} />}
            </AnimatePresence>

            {/* Ultimate flash */}
            <UltimateFlash active={ultimateFlash} color={activePlayer?.accentColor || "#f59e0b"} />

            {/* Damage numbers (centered) */}
            <div className="absolute inset-0 z-50 pointer-events-none">
              {dmgNums.map((d) => (
                <div
                  key={d.id}
                  className="absolute"
                  style={{
                    top: d.target === "boss" ? "35%" : "55%",
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                >
                  <DamageNumber num={d} />
                </div>
              ))}
            </div>

            {/* Log */}
            <div className="mx-3 mb-2 max-h-14 overflow-y-auto rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-sm">
              {log.slice(-3).map((l, i) => (
                <p key={i} className="text-[10px] font-medium text-slate-300 leading-relaxed">{l}</p>
              ))}
            </div>

            {/* Action buttons */}
            <div className="relative z-20 flex gap-2 px-3 pb-4">
              <Button
                onClick={() => runPlayerAttack("normal")}
                disabled={phase !== "idle"}
                size="lg" variant="secondary"
                className="flex-1 text-sm font-bold py-3 disabled:opacity-30"
              >
                <Swords size={14} />Đánh thường
              </Button>
              <Button
                onClick={() => runPlayerAttack("ultimate")}
                disabled={!canUltimate}
                size="lg"
                className={`flex-1 text-sm font-bold py-3 transition-all ${canUltimate ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/40 shadow-lg" : "bg-amber-900/30"}`}
              >
                <Zap size={14} />Tuyệt chiêu
              </Button>
            </div>
          </div>
        </ScreenShake>
      )}

      {/* ─── VICTORY ─── */}
      <AnimatePresence>
        {stage === "victory" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <VictoryConfetti />
            <motion.div
              initial={{ scale: 0.5, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.2 }}
              className="relative z-10 w-full max-w-sm rounded-3xl border-2 border-amber-400/50 bg-gradient-to-b from-slate-900 to-slate-950 p-8 text-center shadow-[0_0_60px_rgba(245,158,11,0.2)]"
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, delay: 0.4 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20 shadow-[0_0_40px_rgba(234,179,8,0.4)]"
              >
                <Trophy size={44} className="text-amber-400" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-black uppercase tracking-wider text-amber-400"
              >
                Chiến Thắng!
              </motion.h2>

              {comboCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-2 flex items-center justify-center gap-1 text-sm font-bold text-amber-300"
                >
                  <Flame size={14} className="text-amber-400" />
                  {comboCount} lần KO liên tiếp!
                </motion.div>
              )}

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-2 text-sm text-slate-400">
                Đánh bại tất cả boss trong {turnCount} lượt.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-amber-500/20 px-6 py-3 ring-1 ring-amber-500/30"
              >
                <Sparkles size={20} className="text-amber-400" />
                <span className="text-2xl font-black text-amber-300">+{battleReward} EXP</span>
              </motion.div>

              <Button
                onClick={() => { onWin(battleReward); onClose(); }}
                size="lg"
                className="mt-6 w-full text-sm font-bold py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg"
              >
                Nhận thưởng
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── DEFEAT ─── */}
      <AnimatePresence>
        {stage === "defeat" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
              className="w-full max-w-sm rounded-3xl border-2 border-red-900/50 bg-gradient-to-b from-slate-900 to-black p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, -5, 5, 0] }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mx-auto mb-4 text-6xl"
              >
                💀
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-3xl font-black uppercase tracking-wider text-slate-200"
              >
                Thất Bại
              </motion.h2>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-3 text-sm text-slate-400">
                Đội hình đã bị đánh bại hoàn toàn.
              </motion.p>

              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
                <span>💡</span>
                <span className="text-[11px]">Hãy lên cấp thẻ hoặc đổi chiến thuật!</span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  onClick={() => { setStage("intro"); setPlayerTeam([]); setBossTeam([]); setPhase("idle"); setComboCount(0); isRunningRef.current = false; }}
                  size="lg" variant="secondary"
                  className="text-sm font-bold py-3"
                >
                  <RotateCcw size={14} />Thử lại
                </Button>
                <Button onClick={onClose} size="lg" variant="ghost"
                  className="bg-white/10 text-white border-white/10 text-sm font-bold py-3">
                  Thoát
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
