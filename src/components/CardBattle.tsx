import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Zap, Trophy, ArrowLeft, Play, Sparkles, RotateCcw, Star,
  Shield, Heart, Flame, Activity, Skull, Wind, Target, Clock,
  ChevronDown, ChevronUp, Info, AlertTriangle,
} from "lucide-react";
import {
  ALL_CARDS, getElementIcon, ELEMENTS, getAdvantage, getDisadvantage,
  getCardAbility, getCardById, getCardArt, ALL_ABILITIES,
} from "../lib/cards";
import { Badge, Button } from "../lib/ui";

// ─── Campaign Levels ────────────────────────────────────────────────────────
const CAMPAIGN_LEVELS = [
  { id: 1, name: "Vùng Đất Rác Thiếc",    bossIds: [101, 102, 103], bossHpMult: 0.6, bossAtkMult: 0.5, reward: 30,  element: "plastic" },
  { id: 2, name: "Đầm Lầy Nhựa Độc",      bossIds: [201, 202, 203], bossHpMult: 0.9, bossAtkMult: 0.8, reward: 60,  element: "hazard" },
  { id: 3, name: "Núi Chế Phẩm Hữu Cơ",   bossIds: [151, 152, 153], bossHpMult: 1.2, bossAtkMult: 1.0, reward: 120, element: "organic" },
  { id: 4, name: "Rừng Kim Loại Gỉ",       bossIds: [251, 252, 253], bossHpMult: 1.6, bossAtkMult: 1.5, reward: 200, element: "metal" },
  { id: 5, name: "Lõi Lò Đốt Rác",         bossIds: [301, 302, 303], bossHpMult: 2.8, bossAtkMult: 2.2, reward: 500, element: "hazard" },
];

// ─── Types ─────────────────────────────────────────────────────────────────
type BattleStage = "intro" | "battle" | "victory" | "defeat";
type TurnPhase   = "idle" | "player_attack" | "boss_attack" | "ability" | "status_ticks" | "boss_intro";

interface BattleCard {
  id: number; name: string; subtitle: string; elementId: string; rarityId: string;
  atk: number; hp: number; maxHp: number; def: number; spd: number; crt: number; int: number;
  level: number; isAlive: boolean; abilityId: string;
  ultimateCharge: number; abilityCooldown: number;
  // Status effects
  poisonStacks: number; shieldActive: boolean; shieldTurns: number;
  burnStacks: number; speedBoost: boolean; regenStacks: number;
}

interface DmgNum {
  id: string; value: number; target: "player" | "boss";
  isCrit: boolean; isSuper: boolean; isWeak: boolean; isPoison: boolean;
  isBurn: boolean; isShield: boolean;
}

interface BattleLogEntry {
  id: number; text: string; type: "damage" | "ability" | "status" | "ko" | "turn" | "info";
  color: string;
}

// ─── Build battle card from card data ──────────────────────────────────────
function buildBattleCard(
  cardId: number, level: number, atkMult = 1, hpMult = 1,
): BattleCard {
  const base = getCardById(cardId);
  if (!base) {
    return {
      id: cardId, name: `Boss #${cardId}`, subtitle: "", elementId: "plastic",
      rarityId: "common", atk: 0, hp: 0, maxHp: 0, def: 0, spd: 0, crt: 0, int: 0,
      level: 1, isAlive: false, abilityId: "man_nhua", ultimateCharge: 0,
      abilityCooldown: 0, poisonStacks: 0, shieldActive: false, shieldTurns: 0,
      burnStacks: 0, speedBoost: false, regenStacks: 0,
    };
  }
  const hp  = Math.floor(base.hp  * (1 + (level - 1) * 0.15) * hpMult);
  const atk  = Math.floor(base.atk  * (1 + (level - 1) * 0.15) * atkMult);
  const def  = Math.floor((base.def  || 0) * (1 + (level - 1) * 0.10));
  const spd  = Math.floor((base.spd  || 0) * (1 + (level - 1) * 0.05));
  const crt  = Math.min(30, Math.floor((base.crt  || 0) * (1 + (level - 1) * 0.02)));
  const int  = Math.floor((base.int  || 0) * (1 + (level - 1) * 0.05));
  return {
    id: cardId, name: base.name, subtitle: base.rarity.name,
    elementId: base.element.id, rarityId: base.rarity.id,
    atk, hp, maxHp: hp, def, spd, crt, int, level,
    isAlive: true, abilityId: base.rarity.id === "legendary"
      ? "phan_huy" : base.element.id === "hazard"
        ? "chat_doc" : base.element.id === "plastic"
          ? "man_nhua" : base.element.id === "paper"
            ? "giay_doc" : base.element.id === "glass"
              ? "kien_thuy_tinh" : base.element.id === "metal"
                ? "lop_vo" : "phan_huy",
    ultimateCharge: 0, abilityCooldown: 0,
    poisonStacks: 0, shieldActive: false, shieldTurns: 0,
    burnStacks: 0, speedBoost: false, regenStacks: 0,
  };
}

// ─── Element advantage helpers ───────────────────────────────────────────────
function getAdvantageInfo(
  attackerEl: string, defenderEl: string,
): { mult: number; label: string; color: string } | null {
  if (getAdvantage(attackerEl) === defenderEl)
    return { mult: 1.5, label: "Hiệu quả!", color: "#22c55e" };
  if (getDisadvantage(attackerEl) === defenderEl)
    return { mult: 0.75, label: "Yếu hơn!", color: "#ef4444" };
  return null;
}

// ─── Damage formula (full 6-stat) ──────────────────────────────────────────
function calcBattleDamage(
  attacker: BattleCard, defender: BattleCard, isUltimate: boolean,
  isSpeedBoost = false,
): { dmg: number; isCrit: boolean; notes: string[] } {
  const notes: string[] = [];
  const intBonus = 1 + attacker.int * 0.02;
  const baseDmg = isUltimate
    ? Math.floor(attacker.atk * 3.0 * intBonus)
    : Math.floor(attacker.atk * (0.85 + Math.random() * 0.30));

  const crtRoll = Math.random() * 100 < attacker.crt;
  const isCrit  = crtRoll;
  const critMult = isCrit ? 2.0 : 1.0;
  if (isCrit) notes.push("Chí mạng!");

  const advInfo = getAdvantageInfo(attacker.elementId, defender.elementId);
  const advMult = advInfo ? advInfo.mult : 1.0;
  if (advInfo) notes.push(advInfo.label);

  let dmg = Math.floor(baseDmg * critMult * advMult * intBonus);

  // Speed boost
  if (isSpeedBoost) { dmg = Math.floor(dmg * 1.2); notes.push("Tăng tốc!"); }

  // Shield reduction: blocks 30% + INT*1%, capped at 60%
  if (defender.shieldActive) {
    const shieldPct = Math.min(0.60, 0.30 + defender.int * 0.01);
    dmg = Math.floor(dmg * (1 - shieldPct));
    notes.push("Khiên chặn!");
  } else {
    dmg = Math.floor(dmg * (1 - defender.def * 0.003));
  }
  dmg = Math.max(1, dmg);

  return { dmg, isCrit, notes };
}

// ─── Status effect tick damage ───────────────────────────────────────────────
function calcStatusDmg(card: BattleCard): number {
  return Math.floor(
    card.maxHp * (card.poisonStacks * 0.05 + card.burnStacks * 0.03),
  );
}

// ─── Screen Shake ───────────────────────────────────────────────────────────
function ScreenShake({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.div animate={active ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}} transition={{ duration: 0.4 }}>
      {children}
    </motion.div>
  );
}

// ─── Projectile ────────────────────────────────────────────────────────────
function Projectile({ from, to, elementId, isUltimate, onDone }: {
  from: "player" | "boss"; to: "player" | "boss";
  elementId: string; isUltimate: boolean; onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, isUltimate ? 600 : 450);
    return () => clearTimeout(t);
  }, [onDone, isUltimate]);

  const el = ELEMENTS.find((e) => e.id === elementId);
  const color = el?.accent ?? "#94a3b8";
  const fromX = from === "player" ? "10%" : "90%";
  const toX   = to   === "player" ? "30%" : "70%";
  const yPos  = "45%";
  const size  = isUltimate ? 40 : 22;

  return (
    <motion.div
      initial={{ left: fromX, top: yPos, opacity: 1, scale: 0.5 }}
      animate={{ left: toX, opacity: [1, 1, 0], scale: [0.5, 1.2, 1.8] }}
      transition={{ duration: isUltimate ? 0.55 : 0.40, ease: "easeIn" }}
      className="absolute z-40 pointer-events-none"
      style={{ transform: "translate(-50%, -50%)" }}
    >
      {isUltimate && (
        <motion.div
          className="absolute rounded-full"
          style={{ width: size * 2.5, height: size * 2.5, background: `radial-gradient(circle, ${color}80, transparent)`, left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 0.3, repeat: Infinity }}
        />
      )}
      <div
        className="rounded-full flex items-center justify-center shadow-lg"
        style={{
          width: size, height: size,
          background: `radial-gradient(circle, ${color}ff, ${color}80)`,
          boxShadow: `0 0 ${isUltimate ? 24 : 12}px ${color}`,
        }}
      >
        {getElementIcon(elementId, size * 0.6)}
      </div>
    </motion.div>
  );
}

// ─── Damage Number ───────────────────────────────────────────────────────────
function DamageNumber({ num }: { num: DmgNum }) {
  const color = num.isPoison  ? "#a855f7"
              : num.isBurn    ? "#f97316"
              : num.isSuper   ? "#22c55e"
              : num.isWeak    ? "#ef4444"
              : num.isCrit    ? "#f59e0b"
              : num.isShield  ? "#60a5fa"
              : num.target === "boss" ? "#ef4444" : "#60a5fa";
  const scale = num.isCrit ? 1.5 : num.isSuper || num.isWeak ? 1.2 : 1.0;

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.2, rotate: -15 }}
      animate={{ opacity: [1, 1, 0], y: -60, scale, rotate: [0, 5, -5, 0] }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="absolute left-1/2 z-50 font-black text-white pointer-events-none text-center"
      style={{ color, textShadow: `0 0 12px ${color}, 0 2px 6px rgba(0,0,0,0.9)`, transform: "translate(-50%, -50%)" }}
    >
      <div className="text-4xl leading-none drop-shadow-lg">-{num.value}</div>
      <div className="text-[11px] font-black uppercase tracking-wider mt-0.5">
        {num.isCrit && "Chí mạng!"}
        {num.isSuper && "Hiệu quả!"}
        {num.isWeak  && "Yếu hơn!"}
        {num.isPoison && "Độc!"}
        {num.isBurn   && "Cháy!"}
        {num.isShield && "Khiên!"}
      </div>
    </motion.div>
  );
}

// ─── Effectiveness Banner ────────────────────────────────────────────────────
function EffectivenessBanner({ info, side }: { info: { label: string; color: string }; side: "player" | "boss" }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "player" ? -100 : 100, scale: 0.4 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.3, y: -30 }}
      transition={{ type: "spring", stiffness: 380, damping: 18 }}
      className="absolute z-50 rounded-2xl px-4 py-2 text-sm font-black text-white shadow-xl"
      style={{
        background: `${info.color}ee`, boxShadow: `0 0 24px ${info.color}80`,
        top: "42%", [side === "player" ? "left" : "right"]: "3%",
      }}
    >
      {info.label}
    </motion.div>
  );
}

// ─── Type Badge ─────────────────────────────────────────────────────────────
function TypeBadge({ elementId, size = "sm" }: { elementId: string; size?: "sm" | "lg" }) {
  const el = ELEMENTS.find((e) => e.id === elementId);
  if (!el) return null;
  const sz = size === "lg" ? 16 : 11;
  return (
    <div className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-white" style={{ backgroundColor: el.accent + "cc" }}>
      {getElementIcon(elementId, sz)}
      {size === "lg" && <span className="text-[10px] font-black">{el.name}</span>}
    </div>
  );
}

// ─── HP Bar ─────────────────────────────────────────────────────────────────
function HpBar({ current, max, accent, height = 10 }: { current: number; max: number; accent: string; height?: number }) {
  if (max === 0) return null;
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const barColor = pct > 55 ? "#22c55e" : pct > 28 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-full">
      <div
        className="w-full overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10"
        style={{ height }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`, boxShadow: `0 0 6px ${barColor}80` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent" />
    </div>
  );
}

// ─── Status Icons ───────────────────────────────────────────────────────────
function StatusIcons({ card }: { card: BattleCard }) {
  const icons: React.ReactNode[] = [];
  if (card.poisonStacks > 0)
    icons.push(
      <div key="poison" className="flex items-center gap-0.5 rounded-full bg-purple-900/80 px-1 py-0.5 text-[9px] font-black text-purple-300">
        ☠️ {card.poisonStacks}
      </div>
    );
  if (card.burnStacks > 0)
    icons.push(
      <div key="burn" className="flex items-center gap-0.5 rounded-full bg-orange-900/80 px-1 py-0.5 text-[9px] font-black text-orange-300">
        🔥 {card.burnStacks}
      </div>
    );
  if (card.shieldActive)
    icons.push(
      <div key="shield" className="flex items-center gap-0.5 rounded-full bg-blue-900/80 px-1 py-0.5 text-[9px] font-black text-blue-300">
        🛡️ {card.shieldTurns}
      </div>
    );
  if (card.speedBoost)
    icons.push(
      <div key="speed" className="flex items-center gap-0.5 rounded-full bg-green-900/80 px-1 py-0.5 text-[9px] font-black text-green-300">
        ⚡
      </div>
    );
  if (card.regenStacks > 0)
    icons.push(
      <div key="regen" className="flex items-center gap-0.5 rounded-full bg-emerald-900/80 px-1 py-0.5 text-[9px] font-black text-emerald-300">
        💚 {card.regenStacks}
      </div>
    );
  if (icons.length === 0) return null;
  return <div className="flex items-center gap-1 flex-wrap justify-center">{icons}</div>;
}

// ─── Battle Card Display (Pokemon GO style) ─────────────────────────────────
function BattleCardAvatar({
  card, team, isActive, shake, isHit, attackAnim, isUltimate, showStatus,
}: {
  card: BattleCard; team: "player" | "boss"; isActive: boolean;
  shake?: boolean; isHit?: boolean; attackAnim?: boolean;
  isUltimate?: boolean; showStatus?: boolean;
}) {
  const dead = !card.isAlive;
  const el   = ELEMENTS.find((e) => e.id === card.elementId);
  const activeGlow = isActive && card.isAlive
    ? `0 0 24px ${card.elementId === "hazard" ? "#ef4444" : el?.accent ?? "#06b6d4"}80, 0 0 48px ${card.elementId === "hazard" ? "#ef4444" : el?.accent ?? "#06b6d4"}30`
    : "none";

  return (
    <motion.div
      animate={[
        dead ? {} : isActive ? { scale: [1, 1.04, 1] } : {},
        shake ? { x: [-8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.35 } } : { x: 0 },
        isHit ? { filter: ["brightness(1)", "brightness(3)", "brightness(1)"], transition: { duration: 0.25 } } : {},
        attackAnim
          ? (team === "player"
              ? { x: [0, 90], transition: { duration: isUltimate ? 0.35 : 0.25, ease: "easeOut" } }
              : { x: [0, -90], transition: { duration: isUltimate ? 0.35 : 0.25, ease: "easeOut" } })
          : { x: 0 },
      ]}
      className="relative flex flex-col items-center gap-1"
    >
      {/* Name tag */}
      <p className={`text-[8px] font-black whitespace-nowrap ${team === "boss" ? "text-red-400/80" : "text-emerald-400/70"}`}>
        {card.name.length > 14 ? card.name.slice(0, 12) + "…" : card.name}
      </p>

      {/* Avatar circle */}
      <motion.div
        className="relative"
        style={{ filter: dead ? "grayscale(1) brightness(0.45)" : undefined }}
      >
        {isActive && card.isAlive && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: `radial-gradient(circle, ${el?.accent ?? "#06b6d4"}30, transparent 70%)` }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.15, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
        )}
        <div
          className="relative flex items-center justify-center rounded-full border-2 backdrop-blur-sm"
          style={{
            width: 72, height: 72,
            background: `linear-gradient(135deg, ${el?.accent ?? "#06b6d4"}30, ${el?.accent ?? "#06b6d4"}10)`,
            borderColor: isActive && card.isAlive ? (el?.accent ?? "#06b6d4") : "rgba(255,255,255,0.08)",
            boxShadow: activeGlow,
          }}
        >
          {/* Card art */}
          <div className="scale-[0.52] origin-center">
            {getCardArt(card.id, card.elementId, undefined, card.rarityId)}
          </div>
          {/* Level star */}
          {card.level > 1 && !dead && (
            <div className="absolute -right-1 -top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-black text-white shadow-lg">
              <Star size={7} className="fill-white" />
            </div>
          )}
          {/* KO overlay */}
          {dead && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-black/70">
              <span className="text-[10px] font-black text-red-400">KO</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* HP bar */}
      <div className="w-[72px]">
        <HpBar current={card.hp} max={card.maxHp} accent={el?.accent ?? "#06b6d4"} height={8} />
      </div>
      <p className={`text-[9px] font-black ${team === "player" ? "text-emerald-400" : "text-red-400"}`}>
        {Math.max(0, card.hp)}/{card.maxHp}
      </p>

      {/* Mini stats */}
      <div className="flex items-center gap-0.5">
        <span className="text-[7px] font-black text-red-400">⚔{card.atk}</span>
        <span className="text-[7px] text-slate-600">·</span>
        <span className="text-[7px] font-black text-blue-400">🛡{card.def}</span>
        <span className="text-[7px] text-slate-600">·</span>
        <span className="text-[7px] font-black text-cyan-400">⚡{card.spd}</span>
      </div>

      {/* Status icons */}
      {showStatus && card.isAlive && <StatusIcons card={card} />}

      {/* Active indicator */}
      {isActive && card.isAlive && team === "player" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[7px] font-black text-white shadow"
        >
          ĐẠI DIỆN
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Ultimate Charge Bar ───────────────────────────────────────────────────
function UltimateBar({ charge, canUse }: { charge: number; canUse: boolean }) {
  const ready = charge >= 100;
  return (
    <div className="flex items-center gap-1.5">
      <Zap size={12} className={ready ? "text-amber-400 animate-pulse" : "text-slate-500"} />
      <div className="relative h-2.5 w-28 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: ready ? "#f59e0b" : "#3b82f6" }}
          animate={{ width: `${Math.min(100, charge)}%` }}
          transition={{ duration: 0.4 }}
        />
        {ready && (
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          />
        )}
      </div>
      <span className="text-[10px] font-bold" style={{ color: ready ? "#f59e0b" : "#64748b" }}>{charge}%</span>
      {ready && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-full bg-amber-400/20 border border-amber-400/60 px-1.5 py-0.5 text-[8px] font-black text-amber-400">
          Sẵn sàng!
        </motion.div>
      )}
    </div>
  );
}

// ─── Confetti ──────────────────────────────────────────────────────────────
function VictoryConfetti() {
  const particles = Array.from({ length: 80 }, (_, i) => ({
    id: i, x: Math.random() * 100,
    delay: Math.random() * 1.2,
    color: ["#f59e0b","#22c55e","#3b82f6","#a855f7","#ef4444","#f97316","#06b6d4","#ec4899"][Math.floor(Math.random() * 8)],
    size: Math.random() * 10 + 4,
    shape: Math.random() > 0.5 ? "circle" : "square",
    rot: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: "-5%", x: `${p.x}%`, opacity: 1, scale: 0, rotate: 0 }}
          animate={{ y: "115%", opacity: [1, 1, 0], scale: [0, 1.2, 0.6], rotate: Math.random() * 900 - 450 }}
          transition={{ duration: 3.0, delay: p.delay, ease: "easeIn" }}
          className="absolute"
          style={{
            width: p.size, height: p.size, background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : "3px",
            boxShadow: `0 0 8px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Ultimate Flash Overlay ────────────────────────────────────────────────
function UltimateFlash({ active, color }: { active: boolean; color: string }) {
  if (!active) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.9, 0] }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0 z-50 pointer-events-none"
      style={{ background: `radial-gradient(circle at 50% 45%, ${color}90, transparent 65%)` }}
    />
  );
}

// ─── Turn Announcement ──────────────────────────────────────────────────────
function TurnAnnouncement({ text, color }: { text: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.4, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.2, y: -20 }}
      transition={{ type: "spring", stiffness: 350, damping: 18 }}
      className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl px-6 py-3 font-black text-white shadow-2xl"
      style={{ background: `${color}ee`, boxShadow: `0 0 40px ${color}80, 0 8px 32px rgba(0,0,0,0.5)` }}
    >
      {text}
    </motion.div>
  );
}

// ─── Stats tooltip ───────────────────────────────────────────────────────────
function StatTooltip({ card }: { card: BattleCard }) {
  const ability = ALL_ABILITIES[card.abilityId];
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl border border-white/20 bg-black/90 p-3 text-xs shadow-2xl backdrop-blur-sm">
      <p className="font-black text-white mb-2">{card.name}</p>
      <div className="grid grid-cols-3 gap-1 mb-2">
        {[
          { label: "ATK", value: card.atk, color: "#ef4444" },
          { label: "DEF", value: card.def, color: "#3b82f6" },
          { label: "SPD", value: card.spd, color: "#06b6d4" },
          { label: "CRT", value: card.crt, color: "#f59e0b" },
          { label: "INT", value: card.int, color: "#a855f7" },
          { label: "MAX", value: card.maxHp, color: "#22c55e" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center rounded-lg bg-white/5 p-1">
            <span className="text-[9px] font-bold" style={{ color: s.color }}>{s.label}</span>
            <span className="font-black text-white">{s.value}</span>
          </div>
        ))}
      </div>
      {ability && (
        <div className="border-t border-white/10 pt-2">
          <p className="font-bold text-amber-400 mb-0.5">{ability.icon} {ability.name}</p>
          <p className="text-slate-400 leading-tight">{ability.desc}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${ability.type === "passive" ? "bg-blue-900 text-blue-300" : ability.type === "ultimate" ? "bg-amber-900 text-amber-300" : "bg-green-900 text-green-300"}`}>
              {ability.type === "passive" ? "BỊ ĐỘNG" : ability.type === "ultimate" ? "CUỐI CÙNG" : "CHỦ ĐỘNG"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
interface Props {
  deckCardIds: number[];
  cardLevels: Record<string, number>;
  onClose: () => void;
  onWin: (exp: number) => void;
}

export function CardBattle({ deckCardIds, cardLevels, onClose, onWin }: Props) {
  // ─── State ────────────────────────────────────────────────────────────────
  const [stage, setStage]               = useState<BattleStage>("intro");
  const [selectedLevelId, setSelectedLevelId] = useState<number>(1);
  const [playerTeam, setPlayerTeam]     = useState<BattleCard[]>([]);
  const [bossTeam, setBossTeam]         = useState<BattleCard[]>([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState<number>(0);
  const [turnCount, setTurnCount]       = useState(0);
  const [battleReward, setBattleReward] = useState(0);
  const [phase, setPhase]               = useState<TurnPhase>("idle");
  const [log, setLog]                   = useState<BattleLogEntry[]>([]);
  const [dmgNums, setDmgNums]           = useState<DmgNum[]>([]);
  const [effectBanner, setEffectBanner]  = useState<{ info: { label: string; color: string }; side: "player" | "boss" } | null>(null);
  const [isShaking, setIsShaking]       = useState(false);
  const [isHit, setIsHit]               = useState<"player" | "boss" | null>(null);
  const [attackAnim, setAttackAnim]     = useState<"player" | "boss" | null>(null);
  const [projectile, setProjectile]     = useState<{ from: "player" | "boss"; to: "player" | "boss"; elementId: string; isUltimate: boolean } | null>(null);
  const [ultimateFlash, setUltimateFlash] = useState(false);
  const [comboCount, setComboCount]     = useState(0);
  const [maxDmg, setMaxDmg]             = useState(0);
  const [showIntro, setShowIntro]       = useState(false);
  const [showAbilityTooltip, setShowAbilityTooltip] = useState(false);
  const [turnAnnounce, setTurnAnnounce] = useState<string | null>(null);
  const [announceColor, setAnnounceColor] = useState("#3b82f6");
  const [bossIntro, setBossIntro]       = useState<number>(-1); // which boss is being introduced
  const [logVisible, setLogVisible]     = useState(true);

  const pRef          = useRef<BattleCard[]>([]);
  const bRef          = useRef<BattleCard[]>([]);
  const isRunningRef  = useRef(false);
  const logIdRef      = useRef(0);
  const activeBossIdxRef = useRef(0);

  const level = CAMPAIGN_LEVELS.find((l) => l.id === selectedLevelId) || CAMPAIGN_LEVELS[0];
  const bossAlive = bossTeam.filter((c) => c.isAlive);
  const playerAlive = playerTeam.filter((c) => c.isAlive);
  const activePlayer = playerTeam[activePlayerIdx];
  const activeBossIdx = bossAlive.length > 0 ? bossTeam.findIndex((c) => c.isAlive) : -1;
  const canUltimate = activePlayer?.isAlive && activePlayer?.ultimateCharge >= 100 && phase === "idle";

  useEffect(() => { pRef.current = playerTeam; }, [playerTeam]);
  useEffect(() => { bRef.current = bossTeam; }, [bossTeam]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const addLog = useCallback((text: string, type: BattleLogEntry["type"] = "info") => {
    const colors: Record<string, string> = {
      damage: "#ef4444", ability: "#a855f7", status: "#22c55e",
      ko: "#f59e0b", turn: "#3b82f6", info: "#94a3b8",
    };
    setLog((prev) => [...prev.slice(-14), { id: ++logIdRef.current, text, type, color: colors[type] ?? "#94a3b8" }]);
  }, []);

  const spawnDmg = useCallback((
    value: number, target: "player" | "boss",
    isCrit = false, isSuper = false, isWeak = false,
    isPoison = false, isBurn = false, isShield = false,
  ) => {
    const key = `dmg-${Date.now()}-${Math.random()}`;
    setDmgNums((prev) => [...prev.filter((d) => d.id !== key), {
      id: key, value, target, isCrit, isSuper, isWeak, isPoison, isBurn, isShield,
    }]);
    setTimeout(() => setDmgNums((prev) => prev.filter((d) => d.id !== key)), 1400);
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  }, []);

  const triggerHit = useCallback((target: "player" | "boss") => {
    setIsHit(target);
    setTimeout(() => setIsHit(null), 250);
  }, []);

  const showBanner = useCallback((info: { label: string; color: string }, side: "player" | "boss") => {
    setEffectBanner({ info, side });
    setTimeout(() => setEffectBanner(null), 1800);
  }, []);

  const announce = useCallback((text: string, color: string) => {
    setAnnounceColor(color);
    setTurnAnnounce(text);
    setTimeout(() => setTurnAnnounce(null), 1200);
  }, []);

  // ─── Check end ────────────────────────────────────────────────────────────
  const checkEnd = useCallback((p: BattleCard[], b: BattleCard[]) => {
    const bAlive = b.filter((c) => c.isAlive);
    const pAlive = p.filter((c) => c.isAlive);
    if (bAlive.length === 0) {
      setPhase("idle");
      setStage("victory");
      isRunningRef.current = false;
      return true;
    }
    if (pAlive.length === 0) {
      setPhase("idle");
      setStage("defeat");
      isRunningRef.current = false;
      return true;
    }
    return false;
  }, []);

  // ─── Apply damage to a team ───────────────────────────────────────────────
  const applyDamage = useCallback((
    team: "player" | "boss", idx: number, dmg: number,
  ): { newHp: number; died: boolean } => {
    const newHp = Math.max(0, team === "player"
      ? pRef.current[idx].hp - dmg
      : bRef.current[idx].hp - dmg);
    const died = newHp === 0;
    if (team === "player") {
      setPlayerTeam((prev) => prev.map((c, i) => i === idx ? { ...c, hp: newHp, isAlive: newHp > 0 } : c));
    } else {
      setBossTeam((prev) => prev.map((c, i) => i === idx ? { ...c, hp: newHp, isAlive: newHp > 0 } : c));
    }
    return { newHp, died };
  }, []);

  // ─── Status tick: poison/burn/regen ───────────────────────────────────────
  const tickStatus = useCallback((team: "player" | "boss", idx: number, card: BattleCard): boolean => {
    let tickDmg = 0;
    const updates: Partial<BattleCard> = {};

    // Poison + burn
    if (card.poisonStacks > 0 || card.burnStacks > 0) {
      tickDmg = calcStatusDmg(card);
      if (tickDmg > 0) {
        spawnDmg(tickDmg, team, false, false, false, card.poisonStacks > 0, card.burnStacks > 0);
        setTimeout(() => {
          const { died } = applyDamage(team, idx, tickDmg);
          addLog(`${card.name} chịu ${tickDmg} sát thương trạng thái`, "status");
          if (died) {
            setComboCount((c) => c + 1);
            addLog(`💀 ${card.name} đã bị đánh bại!`, "ko");
          }
        }, 100);
      }
      updates.poisonStacks = 0;
      updates.burnStacks    = 0;
    }

    // Regen
    if (card.regenStacks > 0) {
      const heal = Math.floor(card.maxHp * card.regenStacks * 0.05);
      if (heal > 0) {
        if (team === "player") {
          setPlayerTeam((prev) => prev.map((c, i) => i === idx
            ? { ...c, hp: Math.min(c.maxHp, c.hp + heal), regenStacks: Math.max(0, c.regenStacks - 1) }
            : c));
        } else {
          setBossTeam((prev) => prev.map((c, i) => i === idx
            ? { ...c, hp: Math.min(c.maxHp, c.hp + heal), regenStacks: Math.max(0, c.regenStacks - 1) }
            : c));
        }
        addLog(`💚 ${card.name} hồi ${heal} HP`, "status");
      }
    }

    // Shield countdown
    if (card.shieldActive) {
      updates.shieldTurns = card.shieldTurns - 1;
      if (updates.shieldTurns <= 0) {
        updates.shieldActive = false;
        updates.shieldTurns  = 0;
        addLog(`🛡️ Khiên của ${card.name} đã hết`, "status");
      }
    }

    // Speed boost consumed after use
    updates.speedBoost = false;

    if (Object.keys(updates).length > 0) {
      if (team === "player") {
        setPlayerTeam((prev) => prev.map((c, i) => i === idx ? { ...c, ...updates } as BattleCard : c));
      } else {
        setBossTeam((prev) => prev.map((c, i) => i === idx ? { ...c, ...updates } as BattleCard : c));
      }
    }

    return tickDmg > 0;
  }, [spawnDmg, applyDamage, addLog]);

  // ─── Apply ability ────────────────────────────────────────────────────────
  const runAbility = useCallback((attacker: BattleCard, targetIdx: number, targetTeam: "player" | "boss") => {
    const ability = ALL_ABILITIES[attacker.abilityId];
    if (!ability) return;
    const target = targetTeam === "boss" ? bRef.current[targetIdx] : pRef.current[targetIdx];
    if (!target?.isAlive) return;

    setPhase("ability");
    announce(`⚡ ${attacker.name} dùng ${ability.icon} ${ability.name}!`, "#a855f7");
    addLog(`${attacker.name} dùng ${ability.icon} ${ability.name}!`, "ability");

    setTimeout(() => {
      switch (ability.id) {
        // Màn Nhựa (passive shown as shield)
        case "man_nhua": {
          const shieldPct = 0.20 + attacker.int * 0.02;
          if (attacker.elementId === "plastic") {
            if (targetTeam === "player") {
              setPlayerTeam((prev) => prev.map((c, i) => i === targetIdx
                ? { ...c, shieldActive: true, shieldTurns: 2 }
                : c));
            } else {
              setBossTeam((prev) => prev.map((c, i) => i === targetIdx
                ? { ...c, shieldActive: true, shieldTurns: 2 }
                : c));
            }
            addLog(`🛡️ ${target.name} được tạo khiên nhựa (${Math.round(shieldPct * 100)}%)`, "status");
          }
          break;
        }
        // Giấy Độc (poison)
        case "giay_doc": {
          const stacks = Math.min(3, 1 + Math.floor(attacker.int * 0.1));
          if (targetTeam === "boss") {
            setBossTeam((prev) => prev.map((c, i) => i === targetIdx
              ? { ...c, poisonStacks: c.poisonStacks + stacks }
              : c));
          } else {
            setPlayerTeam((prev) => prev.map((c, i) => i === targetIdx
              ? { ...c, poisonStacks: c.poisonStacks + stacks }
              : c));
          }
          addLog(`☠️ ${target.name} bị trúng độc (${stacks} stack)`, "status");
          break;
        }
        // Khiên Thủy Tinh (shield)
        case "kien_thuy_tinh": {
          if (targetTeam === "player") {
            setPlayerTeam((prev) => prev.map((c, i) => i === targetIdx
              ? { ...c, shieldActive: true, shieldTurns: 2 }
              : c));
          } else {
            setBossTeam((prev) => prev.map((c, i) => i === targetIdx
              ? { ...c, shieldActive: true, shieldTurns: 2 }
              : c));
          }
          addLog(`🪟 ${target.name} được Khiên Thủy Tinh bảo vệ!`, "status");
          break;
        }
        // Lớp Vỏ (burn)
        case "lop_vo": {
          const stacks = Math.min(3, 1 + Math.floor(attacker.int * 0.1));
          if (targetTeam === "boss") {
            setBossTeam((prev) => prev.map((c, i) => i === targetIdx
              ? { ...c, burnStacks: c.burnStacks + stacks }
              : c));
          } else {
            setPlayerTeam((prev) => prev.map((c, i) => i === targetIdx
              ? { ...c, burnStacks: c.burnStacks + stacks }
              : c));
          }
          addLog(`🔥 ${target.name} bị cháy (${stacks} stack)`, "status");
          break;
        }
        // Phân Hủy (heal + regen)
        case "phan_huy": {
          const heal = Math.floor(target.maxHp * 0.20);
          if (targetTeam === "player") {
            setPlayerTeam((prev) => prev.map((c, i) => i === targetIdx
              ? { ...c, hp: Math.min(c.maxHp, c.hp + heal), regenStacks: c.regenStacks + 2 }
              : c));
          } else {
            setBossTeam((prev) => prev.map((c, i) => i === targetIdx
              ? { ...c, hp: Math.min(c.maxHp, c.hp + heal), regenStacks: c.regenStacks + 2 }
              : c));
          }
          addLog(`🌱 ${target.name} hồi ${heal} HP và được phân hủy sinh trưởng`, "status");
          break;
        }
        // Chất Độc (hazard passive poison)
        case "chat_doc": {
          if (Math.random() < 0.25 + attacker.int * 0.01) {
            if (targetTeam === "boss") {
              setBossTeam((prev) => prev.map((c, i) => i === targetIdx
                ? { ...c, poisonStacks: c.poisonStacks + 2 }
                : c));
            } else {
              setPlayerTeam((prev) => prev.map((c, i) => i === targetIdx
                ? { ...c, poisonStacks: c.poisonStacks + 2 }
                : c));
            }
            addLog(`☣️ ${target.name} bị nhiễm Chất Độc!`, "status");
          }
          break;
        }
        default: {
          // Generic damage ability
          const dmg = Math.floor(attacker.atk * 1.5 * (1 + attacker.int * 0.02));
          spawnDmg(dmg, targetTeam === "boss" ? "boss" : "player");
          applyDamage(targetTeam, targetIdx, dmg);
          addLog(`${attacker.name} dùng ${ability.name} gây ${dmg} sát thương!`, "ability");
          break;
        }
      }

      // Cooldown
      if (attacker.elementId === "plastic") {
        setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx
          ? { ...c, abilityCooldown: 3 }
          : c));
      }

      setTimeout(() => {
        if (!checkEnd(pRef.current, bRef.current)) {
          setPhase("boss_attack");
          setTimeout(() => runBossAttack(), 1000);
        }
      }, 800);
    }, 600);
  }, [announce, addLog, spawnDmg, applyDamage, checkEnd, activePlayerIdx]);

  // ─── Player attack ────────────────────────────────────────────────────────
  const runPlayerAttack = useCallback((type: "normal" | "ultimate") => {
    if (!isRunningRef.current || phase !== "idle") return;
    const p = pRef.current;
    const b = bRef.current;
    const attacker = p[activePlayerIdx];
    if (!attacker?.isAlive) { setPhase("idle"); return; }
    const targetIdx = b.findIndex((c) => c.isAlive);
    if (targetIdx === -1) return;
    const target = b[targetIdx];

    setPhase("player_attack");
    setAttackAnim("player");
    if (type === "ultimate") { setUltimateFlash(true); setTimeout(() => setUltimateFlash(false), 650); }

    // Projectile
    setTimeout(() => {
      setProjectile({ from: "player", to: "boss", elementId: attacker.elementId, isUltimate: type === "ultimate" });
    }, type === "ultimate" ? 200 : 150);

    setTimeout(() => {
      setProjectile(null);
      setAttackAnim(null);
      triggerHit("boss");
      triggerShake();

      const { dmg, isCrit, notes } = calcBattleDamage(attacker, target, type === "ultimate", attacker.speedBoost);

      if (dmg > maxDmg) setMaxDmg(dmg);

      const advInfo = getAdvantageInfo(attacker.elementId, target.elementId);
      if (advInfo) showBanner(advInfo, "boss");
      spawnDmg(dmg, "boss", isCrit, !!advInfo && advInfo.mult > 1, !!advInfo && advInfo.mult < 1);

      const noteStr = notes.length > 0 ? ` [${notes.join(", ")}]` : "";
      addLog(`${type === "ultimate" ? "💥" : "⚔️"} ${attacker.name} → ${dmg} dmg${noteStr}`, "damage");

      if (type === "normal") {
        setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx
          ? { ...c, ultimateCharge: Math.min(100, c.ultimateCharge + 30), abilityCooldown: Math.max(0, c.abilityCooldown - 1) }
          : c));
      } else {
        setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx
          ? { ...c, ultimateCharge: 0 }
          : c));
      }

      const { newHp, died } = applyDamage("boss", targetIdx, dmg);

      if (died) {
        setComboCount((c) => c + 1);
        addLog(`🔥 ${target.name} đã bị đánh bại!`, "ko");
        announce("💀 KO!", "#f59e0b");
      }

      setTurnCount((t) => t + 1);

      // Status tick on player after their action
      setTimeout(() => {
        const pStatusDied = tickStatus("player", activePlayerIdx, attacker);

        setTimeout(() => {
          if (!checkEnd(pRef.current, bRef.current)) {
            setPhase("boss_attack");
            setTimeout(() => runBossAttack(), 1000);
          }
        }, 600);
      }, 400);

    }, type === "ultimate" ? 500 : 350);
  }, [phase, activePlayerIdx, maxDmg, triggerShake, triggerHit, spawnDmg, showBanner, addLog, applyDamage, tickStatus, checkEnd, announce]);

  // ─── Boss attack ─────────────────────────────────────────────────────────
  const runBossAttack = useCallback(() => {
    if (!isRunningRef.current) return;
    const p = pRef.current;
    const b = bRef.current;
    const bossIdx = b.findIndex((c) => c.isAlive);
    if (bossIdx === -1) return;
    const boss = b[bossIdx];
    const aliveIdx = p.findIndex((c) => c.isAlive);
    if (aliveIdx === -1) return;
    const target = p[aliveIdx];

    // Boss intro fanfare
    if (bossIntro === -1) {
      setBossIntro(bossIdx);
      announce(`👹 ${boss.name} xuất hiện!`, "#ef4444");
      addLog(`Boss mới: ${boss.name} (Lv.${boss.level})`, "turn");
      setTimeout(() => setBossIntro(-1), 1500);
      setTimeout(() => {
        setAttackAnim("boss");
        setTimeout(() => executeBossHit(), 500);
      }, 1600);
    } else {
      setAttackAnim("boss");
      setTimeout(() => executeBossHit(), 400);
    }

    function executeBossHit() {
      setAttackAnim(null);
      setProjectile({ from: "boss", to: "player", elementId: boss.elementId, isUltimate: false });

      setTimeout(() => {
        setProjectile(null);
        triggerHit("player");
        triggerShake();

        const { dmg, isCrit, notes } = calcBattleDamage(boss, target, false);
        const advInfo = getAdvantageInfo(boss.elementId, target.elementId);
        if (advInfo) showBanner(advInfo, "player");
        spawnDmg(dmg, "player", isCrit, !!advInfo && advInfo.mult > 1, !!advInfo && advInfo.mult < 1);

        const noteStr = notes.length > 0 ? ` [${notes.join(", ")}]` : "";
        addLog(`👹 ${boss.name} → ${dmg} dmg${noteStr}`, "damage");

        const { newHp, died } = applyDamage("player", aliveIdx, dmg);

        if (died) {
          setComboCount(0);
          addLog(`💀 ${target.name} đã bị đánh bại!`, "ko");
          announce("💀 KO!", "#ef4444");
          // Switch to next alive player
          setTimeout(() => {
            const nextAlive = pRef.current.findIndex((c, i) => i > aliveIdx && c.isAlive);
            const newIdx = nextAlive !== -1 ? nextAlive : pRef.current.findIndex((c) => c.isAlive);
            if (newIdx !== -1) setActivePlayerIdx(newIdx);
          }, 300);
        }

        // Boss status tick
        setTimeout(() => {
          tickStatus("boss", bossIdx, boss);

          setTimeout(() => {
            if (!checkEnd(pRef.current, bRef.current)) {
              setPhase("idle");
            }
          }, 400);
        }, 300);
      }, 400);
    }
  }, [bossIntro, triggerShake, triggerHit, spawnDmg, showBanner, addLog, applyDamage, tickStatus, checkEnd, announce]);

  // ─── Start battle ─────────────────────────────────────────────────────────
  const startBattle = useCallback(() => {
    const team = deckCardIds.map((id) => buildBattleCard(id, cardLevels[String(id)] ?? 1));
    const firstAlive = team.findIndex((c) => c.isAlive);
    setPlayerTeam(team);
    setActivePlayerIdx(firstAlive >= 0 ? firstAlive : 0);

    const bosses = level.bossIds.map((bossId) => buildBattleCard(bossId, 1, level.bossAtkMult, level.bossHpMult));
    setBossTeam(bosses);

    setLog([]);
    addLog(`⚔️ Chiến dịch: ${level.name}`, "turn");
    addLog(`👹 Boss: ${ELEMENTS.find((e) => e.id === level.element)?.name ?? level.element} (x3)`, "info");
    setTurnCount(0);
    setBattleReward(level.reward);
    setPhase("idle");
    setComboCount(0);
    setMaxDmg(0);
    activeBossIdxRef.current = 0;
    isRunningRef.current = true;
    setStage("battle");
    setShowIntro(true);
    setTimeout(() => setShowIntro(false), 2200);
  }, [deckCardIds, cardLevels, level, addLog]);

  // ─── Switch card ───────────────────────────────────────────────────────────
  const switchCard = useCallback((newIdx: number) => {
    if (phase !== "idle" || !playerTeam[newIdx]?.isAlive || newIdx === activePlayerIdx) return;
    const oldCard = playerTeam[activePlayerIdx];
    setActivePlayerIdx(newIdx);
    addLog(`🔄 Đổi ${oldCard.name} → ${playerTeam[newIdx].name}`, "info");
    setTimeout(() => {
      setPhase("boss_attack");
      setTimeout(() => runBossAttack(), 1000);
    }, 400);
  }, [phase, playerTeam, activePlayerIdx, addLog, runBossAttack]);

  // ─── Use ability ───────────────────────────────────────────────────────────
  const useAbility = useCallback(() => {
    if (phase !== "idle" || !activePlayer?.isAlive) return;
    const ability = ALL_ABILITIES[activePlayer.abilityId];
    if (!ability || ability.type !== "active") return;
    if (activePlayer.abilityCooldown > 0) {
      addLog(`⏳ ${ability.name} đang trong thời gian chờ (${activePlayer.abilityCooldown}l)`, "info");
      return;
    }
    const targetIdx = bossAlive.length > 0 ? bossTeam.findIndex((c) => c.isAlive) : -1;
    if (targetIdx === -1) return;
    runAbility(activePlayer, targetIdx, "boss");
  }, [phase, activePlayer, bossAlive, bossTeam, addLog, runAbility]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 40%, #16213e 70%, #0f0f1a 100%)" }}>

      {/* ─── Top bar ──────────────────────────────────────────────────────── */}
      <div className="relative z-30 flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <Button onClick={() => { isRunningRef.current = false; onClose(); }}
          variant="ghost" className="bg-white/8 text-white/80 border border-white/10 hover:bg-white/15 text-xs px-2.5 py-1 gap-1">
          <ArrowLeft size={13} /> Thoát
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 border border-white/10">
            <Flame size={11} className={comboCount > 0 ? "text-amber-400" : "text-slate-500"} />
            {comboCount > 0 && <span className="text-[10px] font-black text-amber-400">{comboCount}x combo</span>}
          </div>
          <Badge tone="warning">⚔️ Đấu Trường</Badge>
          <span className="rounded-full bg-black/50 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-white/40">
            {turnCount} lượt
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 border border-white/10">
            <Shield size={10} className="text-red-400" />
            <span className="text-[10px] font-black text-red-400">{bossAlive.length}/3</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 border border-white/10">
            <Heart size={10} className="text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400">{playerAlive.length}/{playerTeam.length}</span>
          </div>
        </div>
      </div>

      {/* ─── INTRO ─────────────────────────────────────────────────────────── */}
      {stage === "intro" && (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 overflow-y-auto p-4">
          <div className="text-center pt-2">
            <h2 className="text-2xl font-black text-white">Chọn Chiến Dịch</h2>
            <p className="mt-1 text-sm text-slate-400">Đánh bại 3 boss liên tiếp để chiến thắng!</p>
          </div>

          <div className="w-full max-w-sm space-y-2 pb-4">
            {CAMPAIGN_LEVELS.map((lvl) => {
              const bossEl = ELEMENTS.find((e) => e.id === lvl.element);
              return (
                <button key={lvl.id} onClick={() => setSelectedLevelId(lvl.id)}
                  className={`w-full rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                    selectedLevelId === lvl.id
                      ? "border-amber-400 bg-amber-950/25 shadow-[0_0_20px_rgba(234,179,8,0.18)]"
                      : "border-slate-700/60 bg-slate-900/60 hover:bg-slate-800/60"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedLevelId === lvl.id ? "bg-amber-500 text-white shadow-amber-500/30" : "bg-slate-800 text-slate-500"}`}>
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

          {deckCardIds.length >= 1 ? (
            <Button onClick={startBattle} size="lg"
              className="w-full max-w-sm text-base font-black py-3 shadow-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border-0">
              <Swords size={18} />Xông trận!
            </Button>
          ) : (
            <div className="w-full max-w-sm rounded-xl border border-red-900/50 bg-red-950/20 p-3 text-center">
              <p className="text-sm font-bold text-red-400">Cần ít nhất 1 thẻ để chiến đấu!</p>
            </div>
          )}
        </div>
      )}

      {/* ─── BATTLE ─────────────────────────────────────────────────────────── */}
      {stage === "battle" && (
        <ScreenShake active={isShaking}>
          <div className="relative flex flex-1 flex-col overflow-hidden">

            {/* Intro overlay */}
            <AnimatePresence>
              {showIntro && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85"
                >
                  <motion.div
                    initial={{ scale: 0.4, opacity: 0, rotateY: 90 }}
                    animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 250, damping: 16 }}
                    className="text-center"
                  >
                    <p className="text-sm font-bold text-amber-400 mb-1">Chiến Dịch</p>
                    <h2 className="text-4xl font-black text-white">{level.name}</h2>
                    <p className="mt-3 text-sm text-slate-400">Đánh bại tất cả boss!</p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <TypeBadge elementId={level.element} size="lg" />
                      <span className="text-xs text-slate-500">x3 Boss</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Turn announcement */}
            <AnimatePresence>
              {turnAnnounce && <TurnAnnouncement key="announce" text={turnAnnounce} color={announceColor} />}
            </AnimatePresence>

            {/* ─── Boss zone ─────────────────────────────────────────────────── */}
            <div className="relative z-10 border-b border-white/10 bg-gradient-to-b from-red-950/20 to-transparent px-2 pt-2 pb-3">
              <div className="mb-2 flex items-center justify-center">
                <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 border border-white/10">
                  <TypeBadge elementId={level.element} size="lg" />
                  <span className="text-[10px] font-black text-white/60">
                    {ELEMENTS.find((e) => e.id === level.element)?.name} Boss
                  </span>
                  <span className="rounded-full bg-red-900/80 px-1.5 py-0.5 text-[9px] font-black text-red-300">
                    {bossAlive.length} còn lại
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-center gap-4">
                {bossTeam.map((b, i) => (
                  <BattleCardAvatar
                    key={b.id}
                    card={b}
                    team="boss"
                    isActive={b.id === bossAlive[0]?.id && b.isAlive}
                    shake={isHit === "boss" && b.id === bossAlive[0]?.id}
                    isHit={isHit === "boss" && b.id === bossAlive[0]?.id}
                    attackAnim={attackAnim === "player" && b.id === bossAlive[0]?.id}
                    showStatus
                  />
                ))}
              </div>
            </div>

            {/* VS divider */}
            <div className="relative flex items-center justify-center py-1.5">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="relative z-10 px-4 text-center">
                <span className="text-2xl font-black italic text-amber-500/15 select-none">VS</span>
                <div className="mt-1">
                  {phase === "idle" && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-full bg-blue-600/20 border border-blue-500/40 px-2.5 py-0.5 text-[8px] font-black text-blue-400 shadow shadow-blue-500/20">
                      Lượt của bạn
                    </motion.div>
                  )}
                  {phase === "boss_attack" && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-full bg-red-600/20 border border-red-500/40 px-2.5 py-0.5 text-[8px] font-black text-red-400 shadow shadow-red-500/20">
                      Lượt Boss
                    </motion.div>
                  )}
                  {phase === "ability" && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-full bg-purple-600/20 border border-purple-500/40 px-2.5 py-0.5 text-[8px] font-black text-purple-400 shadow shadow-purple-500/20">
                      Dùng chiêu thức!
                    </motion.div>
                  )}
                </div>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* ─── Player zone ───────────────────────────────────────────────── */}
            <div className="relative z-10 flex-1 px-2 py-2">
              {/* Team lineup */}
              <div className="flex items-start justify-center gap-2 mb-2">
                {playerTeam.map((p, i) => (
                  <div key={p.id} className="relative">
                    <BattleCardAvatar
                      card={p}
                      team="player"
                      isActive={i === activePlayerIdx}
                      shake={isHit === "player" && i === activePlayerIdx}
                      isHit={isHit === "player" && i === activePlayerIdx}
                      attackAnim={attackAnim === "boss" && i === activePlayerIdx}
                      showStatus
                    />
                    {/* Switch button */}
                    {i !== activePlayerIdx && p.isAlive && phase === "idle" && (
                      <motion.button
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                        onClick={() => switchCard(i)}
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-blue-600/80 border border-blue-400/50 px-1 py-0.5 text-[7px] font-black text-white shadow"
                      >
                        Đổi
                      </motion.button>
                    )}
                  </div>
                ))}
              </div>

              {/* Ultimate bar */}
              {activePlayer?.isAlive && (
                <div className="flex items-center justify-center">
                  <UltimateBar charge={activePlayer.ultimateCharge} canUse={canUltimate} />
                </div>
              )}
            </div>

            {/* Projectile */}
            <AnimatePresence>
              {projectile && (
                <Projectile
                  key="proj"
                  from={projectile.from}
                  to={projectile.to}
                  elementId={projectile.elementId}
                  isUltimate={projectile.isUltimate}
                  onDone={() => setProjectile(null)}
                />
              )}
            </AnimatePresence>

            {/* Effectiveness banner */}
            <AnimatePresence>
              {effectBanner && <EffectivenessBanner key="banner" info={effectBanner.info} side={effectBanner.side} />}
            </AnimatePresence>

            {/* Ultimate flash */}
            <UltimateFlash active={ultimateFlash} color={activePlayer?.elementId ? ELEMENTS.find(e => e.id === activePlayer.elementId)?.accent ?? "#f59e0b" : "#f59e0b"} />

            {/* Damage numbers */}
            <div className="absolute inset-0 z-50 pointer-events-none">
              {dmgNums.map((d) => (
                <div
                  key={d.id}
                  className="absolute"
                  style={{
                    top: d.target === "boss" ? "33%" : "58%",
                    left: "50%", transform: "translateX(-50%)",
                  }}
                >
                  <DamageNumber num={d} />
                </div>
              ))}
            </div>

            {/* Battle log */}
            <div className="mx-3 mb-2 max-h-16 overflow-y-auto rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Nhật ký</span>
                <button onClick={() => setLogVisible(!logVisible)} className="text-slate-500 hover:text-slate-300">
                  {logVisible ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                </button>
              </div>
              {logVisible && log.slice(-4).map((l, i) => (
                <p key={l.id} className="text-[10px] font-medium leading-relaxed" style={{ color: l.color }}>
                  {l.text}
                </p>
              ))}
            </div>

            {/* ─── Action buttons ─────────────────────────────────────────────── */}
            <div className="relative z-20 flex gap-2 px-3 pb-4">
              {/* Ability button */}
              {activePlayer?.isAlive && ALL_ABILITIES[activePlayer.abilityId]?.type === "active" && (
                <Button
                  onClick={useAbility}
                  disabled={phase !== "idle" || activePlayer.abilityCooldown > 0}
                  size="lg" variant="secondary"
                  className="text-xs font-bold py-3 px-2 disabled:opacity-30 bg-purple-900/40 border-purple-500/30 hover:bg-purple-900/60 text-purple-300"
                >
                  <Activity size={14} />
                  <span className="hidden sm:inline">
                    {ALL_ABILITIES[activePlayer.abilityId]?.name ?? "Chiêu thức"}
                  </span>
                  <span className="sm:hidden">Chiêu</span>
                  {activePlayer.abilityCooldown > 0 && (
                    <span className="rounded-full bg-purple-700/80 px-1 text-[9px] font-black">
                      {activePlayer.abilityCooldown}
                    </span>
                  )}
                </Button>
              )}

              {/* Info button for active card */}
              {activePlayer?.isAlive && (
                <div className="relative">
                  <Button
                    onClick={() => setShowAbilityTooltip(!showAbilityTooltip)}
                    variant="ghost"
                    className="text-xs font-bold py-3 px-2 bg-white/8 border border-white/10 text-slate-300 hover:bg-white/15"
                  >
                    <Info size={14} />
                  </Button>
                  {showAbilityTooltip && <StatTooltip card={activePlayer} />}
                </div>
              )}

              {/* Normal attack */}
              <Button
                onClick={() => runPlayerAttack("normal")}
                disabled={phase !== "idle"}
                size="lg" variant="secondary"
                className="flex-1 text-sm font-bold py-3 disabled:opacity-30 bg-slate-800/60 border-slate-600/30 hover:bg-slate-700/60"
              >
                <Swords size={15} />Đánh thường
              </Button>

              {/* Ultimate attack */}
              <Button
                onClick={() => runPlayerAttack("ultimate")}
                disabled={!canUltimate}
                size="lg"
                className={`flex-1 text-sm font-bold py-3 transition-all ${
                  canUltimate
                    ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/40 shadow-lg border-0"
                    : "bg-amber-900/30 text-amber-700/50 border-amber-800/20"
                }`}
              >
                <Zap size={15} />
                {canUltimate ? "Tuyệt chiêu!" : "Tuyệt chiêu"}
              </Button>
            </div>
          </div>
        </ScreenShake>
      )}

      {/* ─── VICTORY ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {stage === "victory" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <VictoryConfetti />
            <motion.div
              initial={{ scale: 0.3, y: 60, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 250, damping: 16, delay: 0.1 }}
              className="relative z-10 w-full max-w-sm rounded-3xl border-2 border-amber-400/50 bg-gradient-to-b from-slate-900 to-slate-950 p-8 text-center shadow-[0_0_80px_rgba(245,158,11,0.25)]"
            >
              {/* Trophy */}
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, delay: 0.3 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20 shadow-[0_0_50px_rgba(234,179,8,0.5)]"
              >
                <Trophy size={44} className="text-amber-400" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="text-3xl font-black uppercase tracking-wider text-amber-400"
              >
                Chiến Thắng!
              </motion.h2>

              {comboCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55 }}
                  className="mt-2 flex items-center justify-center gap-1 text-sm font-bold text-amber-300"
                >
                  <Flame size={14} className="text-amber-400" />
                  {comboCount}x KO liên tiếp!
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="mt-3 space-y-1 text-sm text-slate-400">
                <p>Hoàn thành trong <span className="font-black text-white">{turnCount}</span> lượt</p>
                <p>Sát thương lớn nhất: <span className="font-black text-red-400">{maxDmg}</span></p>
                <p>Boss còn lại: <span className="font-black text-emerald-400">{bossAlive.length}/3</span></p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-amber-500/20 px-6 py-3 ring-1 ring-amber-500/30 shadow shadow-amber-500/20"
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

      {/* ─── DEFEAT ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {stage === "defeat" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.2 }}
              className="w-full max-w-sm rounded-3xl border-2 border-red-900/50 bg-gradient-to-b from-slate-900 to-black p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: [0, -8, 8, 0] }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mx-auto mb-4 text-6xl"
              >
                💀
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="text-3xl font-black uppercase tracking-wider text-slate-200"
              >
                Thất Bại
              </motion.h2>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
                className="mt-3 text-sm text-slate-400">
                Đội hình đã bị đánh bại hoàn toàn.
              </motion.p>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
                <AlertTriangle size={12} />
                <span className="text-[11px]">Hãy lên cấp thẻ hoặc đổi chiến thuật!</span>
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="mt-3 text-xs text-slate-600">
                <p>💡 Gợi ý: Xem thông tin chiêu thức (nút <Info size={9} className="inline" />) để hiểu rõ sức mạnh từng thẻ</p>
                <p className="mt-0.5">💡 Tận dụng lợi thế nguyên tố để tăng 50% sát thương!</p>
              </motion.div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    setStage("intro"); setPlayerTeam([]); setBossTeam([]);
                    setPhase("idle"); setComboCount(0); setTurnCount(0);
                    setLog([]); isRunningRef.current = false;
                  }}
                  size="lg" variant="secondary"
                  className="text-sm font-bold py-3 bg-slate-800/60 border-slate-600/30"
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
