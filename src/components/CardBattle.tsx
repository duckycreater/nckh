import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Zap, Trophy, ArrowLeft, Play, Sparkles, RotateCcw, Star,
  Shield, Heart, Flame, Activity, Skull, Target, Clock,
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
type TurnPhase   = "idle" | "animating" | "status_ticks" | "boss_turn" | "player_turn";

interface BattleMove {
  id: string;
  name: string;
  desc: string;
  icon: string;
  type: "tackle" | "skill" | "ultimate" | "dodge";
  energyCost: number;
  cooldown: number;
  currentCooldown: number;
  power: number;
  effect?: {
    type: "damage" | "heal" | "shield" | "poison" | "burn" | "buff_def" | "buff_atk"
        | "speed_down" | "stun" | "drain" | "regen" | "dodge";
    value: number;
    duration?: number;
  };
}

interface BattleCard {
  id: number; name: string; subtitle: string;
  elementId: string; rarityId: string;
  atk: number; hp: number; maxHp: number;
  def: number; spd: number; crt: number; int: number;
  level: number; isAlive: boolean;
  moves: BattleMove[];
  energy: number; maxEnergy: number;
  ultimateCharge: number;
  evasionChance: number;
  dodgeActive: boolean; dodgeCooldown: number;
  poisonStacks: number; shieldActive: boolean; shieldTurns: number;
  shieldValue: number;
  burnStacks: number; speedBoost: boolean; regenStacks: number;
  stunned: number; silenced: number;
  comboStreak: number; totalDamage: number;
}

interface DmgNum {
  id: string; value: number; target: "player" | "boss";
  isCrit: boolean; isSuper: boolean; isWeak: boolean;
  isPoison: boolean; isBurn: boolean; isDodge: boolean;
  isHeal: boolean; isShield: boolean;
}

interface BattleLogEntry {
  id: number; text: string;
  type: "damage" | "ability" | "status" | "ko" | "turn" | "info" | "dodge" | "heal";
  color: string;
}

// ─── Element Emojis ────────────────────────────────────────────────────────
const ELEMENT_EMOJI: Record<string, string> = {
  plastic: "🔵",
  paper: "📄",
  glass: "🥛",
  metal: "🥫",
  organic: "🍃",
  hazard: "☣️",
};

const RARITY_EMOJI: Record<string, string> = {
  common: "⚪",
  rare: "🔵",
  epic: "🟣",
  legendary: "🟡",
};

// ─── Move Generator ────────────────────────────────────────────────────────
function generateMoves(
  cardId: number, elementId: string, atk: number, def: number, int: number,
): BattleMove[] {
  const baseMoves: BattleMove[] = [
    {
      id: `${cardId}-tackle`,
      name: "Tấn Công",
      desc: "Đòn tấn công cơ bản",
      icon: "⚔️",
      type: "tackle",
      energyCost: 0,
      cooldown: 0,
      currentCooldown: 0,
      power: atk,
      effect: { type: "damage", value: atk },
    },
  ];

  // Pick 1 active skill based on element
  const skillMap: Record<string, string[]> = {
    plastic: ["def_01", "def_06", "def_15", "utl_10"],
    paper: ["def_14", "utl_18", "off_02", "def_11"],
    glass: ["def_02", "def_05", "def_07", "utl_01"],
    metal: ["def_03", "def_16", "off_08", "def_18"],
    organic: ["def_17", "utl_03", "def_19", "utl_05"],
    hazard: ["off_04", "off_09", "off_13", "off_05"],
  };
  const skillIds = skillMap[elementId] || ["def_01"];
  skillIds.slice(0, 2).forEach((sid, i) => {
    const ab = ALL_ABILITIES[sid];
    if (!ab) return;
    const isDef = sid.startsWith("def_");
    const isOff = sid.startsWith("off_");
    const isUtl = sid.startsWith("utl_");
    baseMoves.push({
      id: `${cardId}-skill${i + 1}`,
      name: ab.name,
      desc: ab.desc,
      icon: ab.icon,
      type: "skill",
      energyCost: isOff ? 30 : 25,
      cooldown: 2,
      currentCooldown: 0,
      power: ab.power,
      effect: {
        type: isDef ? "shield"
             : isOff ? "damage"
             : ab.effect.type === "heal" ? "heal"
             : ab.effect.type === "poison" ? "poison"
             : ab.effect.type === "shield" ? "shield"
             : ab.effect.type === "regen" ? "regen"
             : "damage",
        value: ab.effect.value,
        duration: ab.effect.duration,
      },
    });
  });

  // Ultimate
  baseMoves.push({
    id: `${cardId}-ultimate`,
    name: "Tuyệt Chiêu",
    desc: "Sát thương khủng khiếp!",
    icon: "💥",
    type: "ultimate",
    energyCost: 0,
    cooldown: 0,
    currentCooldown: 0,
    power: atk * 3,
    effect: { type: "damage", value: atk * 3 },
  });

  // Dodge
  baseMoves.push({
    id: `${cardId}-dodge`,
    name: "Né Đòn",
    desc: "Né sát thương, bảo toàn combo",
    icon: "💨",
    type: "dodge",
    energyCost: 30,
    cooldown: 2,
    currentCooldown: 0,
    power: 0,
    effect: { type: "dodge", value: 0 },
  });

  return baseMoves;
}

// ─── Build battle card ────────────────────────────────────────────────────
function buildBattleCard(
  cardId: number, level: number, atkMult = 1, hpMult = 1,
): BattleCard {
  const base = getCardById(cardId);
  if (!base) {
    return {
      id: cardId, name: `Boss #${cardId}`, subtitle: "",
      elementId: "plastic", rarityId: "common",
      atk: 0, hp: 0, maxHp: 0,
      def: 0, spd: 0, crt: 0, int: 0,
      level: 1, isAlive: false,
      moves: [], energy: 100, maxEnergy: 100,
      ultimateCharge: 0, evasionChance: 0,
      dodgeActive: false, dodgeCooldown: 0,
      poisonStacks: 0, shieldActive: false, shieldTurns: 0, shieldValue: 0,
      burnStacks: 0, speedBoost: false, regenStacks: 0,
      stunned: 0, silenced: 0,
      comboStreak: 0, totalDamage: 0,
    };
  }
  const hp  = Math.floor(base.hp  * (1 + (level - 1) * 0.15) * hpMult);
  const atk  = Math.floor(base.atk  * (1 + (level - 1) * 0.15) * atkMult);
  const def  = Math.floor((base.def  || 0) * (1 + (level - 1) * 0.10));
  const spd  = Math.floor((base.spd  || 0) * (1 + (level - 1) * 0.05));
  const crt  = Math.min(30, Math.floor((base.crt  || 0) * (1 + (level - 1) * 0.02)));
  const int  = Math.floor((base.int  || 0) * (1 + (level - 1) * 0.05));
  const moves = generateMoves(base.id, base.elementId, atk, def, int);
  const evasion = Math.min(85, 60 + (spd - 10) * 1);

  return {
    id: cardId,
    name: base.name,
    subtitle: base.subtitle,
    elementId: base.elementId,
    rarityId: base.rarityId,
    atk, hp, maxHp: hp,
    def, spd, crt, int,
    level,
    isAlive: true,
    moves,
    energy: 100,
    maxEnergy: 100,
    ultimateCharge: 0,
    evasionChance: evasion,
    dodgeActive: false,
    dodgeCooldown: 0,
    poisonStacks: 0,
    shieldActive: false,
    shieldTurns: 0,
    shieldValue: 0,
    burnStacks: 0,
    speedBoost: false,
    regenStacks: 0,
    stunned: 0,
    silenced: 0,
    comboStreak: 0,
    totalDamage: 0,
  };
}

// ─── Element advantage ────────────────────────────────────────────────────
function getAdvantageInfo(
  attackerEl: string, defenderEl: string,
): { mult: number; label: string; color: string } | null {
  if (getAdvantage(attackerEl) === defenderEl)
    return { mult: 1.5, label: "Hiệu quả!", color: "#22c55e" };
  if (getDisadvantage(attackerEl) === defenderEl)
    return { mult: 0.75, label: "Yếu hơn!", color: "#ef4444" };
  return null;
}

// ─── Damage formula ───────────────────────────────────────────────────────
function calcBattleDamage(
  attacker: BattleCard, defender: BattleCard,
  power: number, comboMult = 1,
): { dmg: number; isCrit: boolean; notes: string[] } {
  const notes: string[] = [];
  const intBonus = 1 + attacker.int * 0.02;
  const baseDmg = Math.floor(power * (0.85 + Math.random() * 0.30) * intBonus * comboMult);

  const crtRoll = Math.random() * 100 < attacker.crt;
  const isCrit = crtRoll;
  const critMult = isCrit ? 2.0 : 1.0;
  if (isCrit) notes.push("Chí mạng!");

  const advInfo = getAdvantageInfo(attacker.elementId, defender.elementId);
  const advMult = advInfo ? advInfo.mult : 1.0;
  if (advInfo) notes.push(advInfo.label);

  let dmg = Math.floor(baseDmg * critMult * advMult);

  // Shield reduction
  if (defender.shieldActive) {
    const shieldBlock = Math.min(defender.shieldValue, dmg);
    dmg = Math.max(1, dmg - shieldBlock);
    notes.push("Khiên chặn!");
  } else {
    dmg = Math.floor(dmg * (1 - defender.def * 0.003));
  }
  dmg = Math.max(1, dmg);

  return { dmg, isCrit, notes };
}

// ─── Screen Shake ─────────────────────────────────────────────────────────
function ScreenShake({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.div animate={active ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}} transition={{ duration: 0.45 }}>
      {children}
    </motion.div>
  );
}

// ─── HP Bar ───────────────────────────────────────────────────────────────
function HpBar({ current, max, accent, height = 12 }: { current: number; max: number; accent: string; height?: number }) {
  if (max === 0) return null;
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const barColor = pct > 55 ? "#22c55e" : pct > 28 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-full">
      <div className="w-full overflow-hidden rounded-full bg-black/60 ring-1 ring-white/10" style={{ height }}>
        <motion.div
          className="rounded-full"
          style={{ background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`, boxShadow: `0 0 8px ${barColor}80` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent" />
    </div>
  );
}

// ─── Energy Bar ───────────────────────────────────────────────────────────
function EnergyBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="relative w-full">
      <div className="w-full overflow-hidden rounded-full bg-black/60 ring-1 ring-cyan-500/20" style={{ height: 6 }}>
        <motion.div
          className="rounded-full"
          style={{ background: "linear-gradient(90deg, #0891b2, #06b6d4, #22d3ee)", boxShadow: "0 0 6px #06b6d480" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-cyan-300/30 to-transparent" />
    </div>
  );
}

// ─── Ultimate Bar ──────────────────────────────────────────────────────────
function UltimateBar({ charge }: { charge: number }) {
  const ready = charge >= 100;
  return (
    <div className="relative w-full">
      <div className="w-full overflow-hidden rounded-full bg-black/60 ring-1 ring-amber-500/20" style={{ height: 6 }}>
        <motion.div
          className="rounded-full"
          style={{ background: ready ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #78350f, #92400e)", boxShadow: ready ? "0 0 10px #f59e0b" : "none" }}
          animate={{ width: `${Math.min(100, charge)}%` }}
          transition={{ duration: 0.4 }}
        />
        {ready && (
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent"
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Status Icons ───────────────────────────────────────────────────────────
function StatusIcons({ card }: { card: BattleCard }) {
  const icons: React.ReactNode[] = [];
  if (card.poisonStacks > 0) icons.push(
    <div key="poison" className="flex items-center gap-0.5 rounded-full bg-purple-900/80 px-1.5 py-0.5 text-[9px] font-black text-purple-300">
      ☠️ {card.poisonStacks}
    </div>
  );
  if (card.burnStacks > 0) icons.push(
    <div key="burn" className="flex items-center gap-0.5 rounded-full bg-orange-900/80 px-1.5 py-0.5 text-[9px] font-black text-orange-300">
      🔥 {card.burnStacks}
    </div>
  );
  if (card.shieldActive) icons.push(
    <div key="shield" className="flex items-center gap-0.5 rounded-full bg-blue-900/80 px-1.5 py-0.5 text-[9px] font-black text-blue-300">
      🛡️ {card.shieldValue}
    </div>
  );
  if (card.stunned > 0) icons.push(
    <div key="stun" className="flex items-center gap-0.5 rounded-full bg-yellow-900/80 px-1.5 py-0.5 text-[9px] font-black text-yellow-300">
      ⚡ {card.stunned}
    </div>
  );
  if (card.dodgeCooldown > 0) icons.push(
    <div key="dodgecd" className="flex items-center gap-0.5 rounded-full bg-green-900/80 px-1.5 py-0.5 text-[9px] font-black text-green-300">
      💨 CD:{card.dodgeCooldown}
    </div>
  );
  if (card.regenStacks > 0) icons.push(
    <div key="regen" className="flex items-center gap-0.5 rounded-full bg-emerald-900/80 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">
      💚 {card.regenStacks}
    </div>
  );
  if (icons.length === 0) return null;
  return <div className="flex items-center gap-1 flex-wrap justify-center">{icons}</div>;
}

// ─── Move Button ───────────────────────────────────────────────────────────
function MoveButton({
  move, disabled, energy, onClick,
}: {
  move: BattleMove; disabled: boolean; energy: number; onClick: () => void;
}) {
  const noEnergy = energy < move.energyCost;
  const onCd = move.currentCooldown > 0;
  const isReady = !disabled && !noEnergy && !onCd;
  const glowColor = move.type === "ultimate" ? "#f59e0b" : move.type === "dodge" ? "#22c55e" : move.type === "skill" ? "#a855f7" : "#94a3b8";
  const typeLabel = move.type === "ultimate" ? "TUYỆT CHIÊU" : move.type === "dodge" ? "NÉ ĐÒN" : move.type === "skill" ? "CHIÊU" : "TẤN CÔNG";

  return (
    <motion.button
      whileHover={isReady ? { scale: 1.06, y: -3 } : {}}
      whileTap={isReady ? { scale: 0.94 } : {}}
      onClick={onClick}
      disabled={!isReady}
      className={`
        relative flex flex-col items-center justify-center rounded-2xl border-2 p-2.5
        transition-all duration-150 select-none overflow-hidden
        ${isReady ? "cursor-pointer shadow-lg" : "cursor-not-allowed opacity-40"}
      `}
      style={{
        minWidth: 76, minHeight: 72,
        background: `linear-gradient(135deg, ${glowColor}30, ${glowColor}15)`,
        borderColor: glowColor + "80",
        boxShadow: isReady ? `0 0 16px ${glowColor}40` : undefined,
      }}
    >
      {/* Glow overlay */}
      {isReady && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-30"
          style={{ background: `radial-gradient(circle at center, ${glowColor}60, transparent 70%)` }}
        />
      )}

      {/* Type label */}
      <div className="absolute top-1 left-1 right-1 text-center">
        <span className="text-[6px] font-black uppercase tracking-wider text-white/60">{typeLabel}</span>
      </div>

      {/* Icon */}
      <span className="text-2xl leading-none mt-2">{move.icon}</span>

      {/* Name */}
      <span className="text-[8px] font-black text-white/90 leading-tight text-center mt-0.5">{move.name}</span>

      {/* Energy + Cooldown */}
      <div className="flex items-center gap-1 mt-0.5">
        {move.energyCost > 0 && (
          <span className={`text-[8px] font-black ${noEnergy ? "text-red-400" : "text-cyan-300"}`}>
            ⚡{move.energyCost}
          </span>
        )}
        {move.currentCooldown > 0 && (
          <span className="text-[8px] font-black text-yellow-400">CD{move.currentCooldown}</span>
        )}
      </div>

      {/* Ultimate ready pulse */}
      {move.type === "ultimate" && isReady && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-amber-300 pointer-events-none"
          animate={{ opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}

// ─── Combo Meter ───────────────────────────────────────────────────────────
function ComboMeter({ combo, maxDmg }: { combo: number; maxDmg: number }) {
  if (combo < 2) return null;
  const scale = Math.min(1 + combo * 0.08, 1.5);
  return (
    <motion.div
      animate={{ scale: [scale * 0.9, scale, scale * 0.95], rotate: [-1, 1, -1] }}
      transition={{ duration: 0.4, repeat: Infinity }}
      className="flex flex-col items-center"
    >
      <div className="rounded-2xl bg-gradient-to-b from-amber-700 to-red-800 px-4 py-2 shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-amber-500/40">
        <p className="text-center text-lg font-black text-amber-300 leading-none">
          🔥 {combo}x
        </p>
        <p className="text-[8px] font-black text-amber-600 uppercase tracking-wider text-center">COMBO</p>
        <p className="text-[8px] font-black text-red-400 text-center">MAX {maxDmg} DMG</p>
      </div>
    </motion.div>
  );
}

// ─── Type Badge ─────────────────────────────────────────────────────────────
function TypeBadge({ elementId }: { elementId: string }) {
  const el = ELEMENTS.find((e) => e.id === elementId);
  if (!el) return null;
  return (
    <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-white text-[9px] font-black"
      style={{ backgroundColor: el.accent + "cc" }}>
      <span className="text-xs">{ELEMENT_EMOJI[elementId]}</span>
      <span>{el.name}</span>
    </div>
  );
}

// ─── Battle Avatar ─────────────────────────────────────────────────────────
function BattleAvatar({
  card, team, isActive, shake, isHit,
  attackAnim, isDodging, showStatus,
}: {
  card: BattleCard; team: "player" | "boss";
  isActive: boolean; shake?: boolean; isHit?: boolean;
  attackAnim?: boolean; isDodging?: boolean; showStatus?: boolean;
}) {
  const dead = !card.isAlive;
  const el = ELEMENTS.find((e) => e.id === card.elementId);
  const emoji = ELEMENT_EMOJI[card.elementId] || "⚪";

  const glowColor = card.elementId === "hazard" ? "#ef4444"
    : card.elementId === "organic" ? "#22c55e"
    : card.elementId === "metal" ? "#64748b"
    : card.elementId === "glass" ? "#14b8a6"
    : card.elementId === "paper" ? "#f59e0b"
    : "#06b6d4";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getAvatarAnim(): any {
    if (dead) return { opacity: 0.3, scale: 0.85 };
    if (isDodging) return { x: team === "player" ? 60 : -60, opacity: 0.3, transition: { duration: 0.2 } };
    if (attackAnim) return { x: team === "player" ? 80 : -80, transition: { duration: 0.3, ease: "easeOut" } };
    if (isActive) return { scale: [1, 1.05, 1], transition: { duration: 1.5, repeat: Infinity } };
    return { opacity: 1, scale: 1 };
  }

  return (
    <motion.div
      animate={getAvatarAnim()}
      className={`relative flex flex-col items-center gap-1 ${shake ? "shake-card" : ""}`}
    >
      {/* Hit flash */}
      <AnimatePresence>
        {isHit && (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 rounded-2xl bg-white/60 z-10 pointer-events-none"
          />
        )}
      </AnimatePresence>
      {/* Name */}
      <p className={`text-[10px] font-black whitespace-nowrap max-w-[90px] truncate ${
        team === "boss" ? "text-red-400/80" : "text-emerald-400/80"
      }`}>
        {card.name}
      </p>

      {/* Avatar ring */}
      <motion.div
        className="relative"
        style={{ filter: dead ? "grayscale(1) brightness(0.4)" : undefined }}
      >
        {/* Active glow */}
        {isActive && card.isAlive && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: `radial-gradient(circle, ${glowColor}30, transparent 70%)` }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        {/* Dodge white flash */}
        {isDodging && (
          <motion.div
            className="absolute inset-0 rounded-full bg-white/80 z-10"
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.4 }}
          />
        )}
        {/* Main avatar circle */}
        <div
          className="relative flex items-center justify-center rounded-full border-2 backdrop-blur-sm overflow-hidden"
          style={{
            width: 100, height: 100,
            background: `linear-gradient(135deg, ${glowColor}25, ${glowColor}10)`,
            borderColor: isActive && card.isAlive ? glowColor : "rgba(255,255,255,0.1)",
            boxShadow: isActive && card.isAlive
              ? `0 0 30px ${glowColor}80, 0 0 60px ${glowColor}30, inset 0 0 20px ${glowColor}20`
              : "none",
          }}
        >
          {/* Emoji character */}
          <motion.span
            className="text-5xl select-none"
            animate={isHit ? { scale: [1, 1.3, 0.9, 1] } : attackAnim ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {dead ? "💀" : emoji}
          </motion.span>

          {/* KO overlay */}
          {dead && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-black/60">
              <span className="text-xs font-black text-red-400">KO</span>
            </div>
          )}

          {/* Rarity indicator */}
          <div className="absolute bottom-0 right-0 z-20 text-xs">
            {RARITY_EMOJI[card.rarityId]}
          </div>

          {/* Level star */}
          {card.level > 1 && !dead && (
            <div className="absolute -right-1 -top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-black text-white shadow-lg">
              <Star size={7} className="fill-white" />
            </div>
          )}
        </div>
      </motion.div>

      {/* HP Bar */}
      <div className="w-[90px]">
        <HpBar current={card.hp} max={card.maxHp} accent={glowColor} height={10} />
        <div className="flex justify-between mt-0.5">
          <span className={`text-[9px] font-black ${team === "player" ? "text-emerald-400" : "text-red-400"}`}>
            {Math.max(0, card.hp)}/{card.maxHp}
          </span>
          <span className="text-[8px] font-black text-slate-500">LV{card.level}</span>
        </div>
      </div>

      {/* Status icons */}
      {showStatus && card.isAlive && <StatusIcons card={card} />}

      {/* Active label */}
      {isActive && card.isAlive && team === "player" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-full bg-blue-600 px-2 py-0.5 text-[8px] font-black text-white shadow"
        >
          ĐẠI DIỆN
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Damage Number ───────────────────────────────────────────────────────────
function DamageNumber({ num }: { num: DmgNum }) {
  let color = "#ffffff";
  let label = "";
  if (num.isDodge)   { color = "#22c55e"; label = "NÉ!"; }
  else if (num.isHeal)  { color = "#22c55e"; label = "+HP"; }
  else if (num.isShield) { color = "#60a5fa"; label = "KHIÊN"; }
  else if (num.isCrit)  { color = "#f59e0b"; label = "CHÍ MẠNG!"; }
  else if (num.isSuper) { color = "#22c55e"; label = "HIỆU QUẢ!"; }
  else if (num.isWeak)  { color = "#ef4444"; label = "YẾU HƠN!"; }
  else if (num.isPoison){ color = "#a855f7"; label = "ĐỘC"; }
  else if (num.isBurn)  { color = "#f97316"; label = "CHÁY"; }
  else color = num.target === "boss" ? "#ef4444" : "#60a5fa";

  const scale = num.isCrit ? 1.6 : num.isDodge ? 1.3 : 1.1;
  const valueStr = num.isHeal ? `+${num.value}` : `-${num.value}`;

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.2, rotate: -15 }}
      animate={{ opacity: [1, 1, 0], y: -80, scale, rotate: [0, 5, -5, 0] }}
      transition={{ duration: 1.4, ease: "easeOut" }}
      className="absolute left-1/2 z-50 font-black text-white pointer-events-none text-center"
      style={{ color, textShadow: `0 0 16px ${color}, 0 2px 8px rgba(0,0,0,0.9)`, transform: "translate(-50%,-50%)" }}
    >
      <div className="text-4xl leading-none drop-shadow-lg">{valueStr}</div>
      {label && <div className="text-[11px] font-black uppercase tracking-wider mt-0.5">{label}</div>}
    </motion.div>
  );
}

// ─── Effectiveness Banner ────────────────────────────────────────────────────
function EffectivenessBanner({ info, side }: { info: { label: string; color: string }; side: "player" | "boss" }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "player" ? -120 : 120, scale: 0.4 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.3, y: -30 }}
      transition={{ type: "spring", stiffness: 380, damping: 18 }}
      className="absolute z-50 rounded-2xl px-4 py-2 text-sm font-black text-white shadow-xl"
      style={{
        background: `${info.color}ee`, boxShadow: `0 0 28px ${info.color}80`,
        top: "40%", [side === "player" ? "left" : "right"]: "2%",
      }}
    >
      {info.label}
    </motion.div>
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

// ─── Confetti ──────────────────────────────────────────────────────────────
function VictoryConfetti() {
  const particles = Array.from({ length: 100 }, (_, i) => ({
    id: i, x: Math.random() * 100,
    delay: Math.random() * 1.5,
    color: ["#f59e0b","#22c55e","#3b82f6","#a855f7","#ef4444","#f97316","#06b6d4","#ec4899"][Math.floor(Math.random() * 8)],
    size: Math.random() * 12 + 4,
    shape: Math.random() > 0.5 ? "circle" : "square",
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: "-5%", x: `${p.x}%`, opacity: 1, scale: 0 }}
          animate={{ y: "115%", opacity: [1, 1, 0], scale: [0, 1.3, 0.6], rotate: Math.random() * 900 - 450 }}
          transition={{ duration: 3.2, delay: p.delay, ease: "easeIn" }}
          className="absolute"
          style={{
            width: p.size, height: p.size, background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : "3px",
            boxShadow: `0 0 10px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Projectile ────────────────────────────────────────────────────────────
function Projectile({ from, to, elementId, onDone }: {
  from: "player" | "boss"; to: "player" | "boss";
  elementId: string; onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 450);
    return () => clearTimeout(t);
  }, [onDone]);

  const emoji = ELEMENT_EMOJI[elementId] || "⚪";
  const fromX = from === "player" ? "15%" : "85%";
  const toX   = to   === "player" ? "35%" : "65%";

  return (
    <motion.div
      initial={{ left: fromX, top: "48%", opacity: 1, scale: 0.5 }}
      animate={{ left: toX, opacity: [1, 1, 0], scale: [0.5, 1.2, 1.6] }}
      transition={{ duration: 0.42, ease: "easeIn" }}
      className="absolute z-40 pointer-events-none"
      style={{ transform: "translate(-50%,-50%)" }}
    >
      <span className="text-2xl" style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.8))" }}>
        {emoji}
      </span>
    </motion.div>
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
  const [playerTeam, setPlayerTeam]    = useState<BattleCard[]>([]);
  const [bossTeam, setBossTeam]        = useState<BattleCard[]>([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState<number>(0);
  const [turnCount, setTurnCount]      = useState(0);
  const [battleReward, setBattleReward] = useState(0);
  const [phase, setPhase]              = useState<TurnPhase>("idle");
  const [log, setLog]                  = useState<BattleLogEntry[]>([]);
  const [dmgNums, setDmgNums]          = useState<DmgNum[]>([]);
  const [effectBanner, setEffectBanner] = useState<{ info: { label: string; color: string }; side: "player" | "boss" } | null>(null);
  const [isShaking, setIsShaking]       = useState(false);
  const [isHit, setIsHit]              = useState<"player" | "boss" | null>(null);
  const [attackAnim, setAttackAnim]     = useState<"player" | "boss" | null>(null);
  const [projectile, setProjectile]     = useState<{ from: "player" | "boss"; to: "player" | "boss"; elementId: string } | null>(null);
  const [isDodging, setIsDodging]      = useState(false);
  const [turnAnnounce, setTurnAnnounce] = useState<string | null>(null);
  const [announceColor, setAnnounceColor] = useState("#3b82f6");
  const [bossIntro, setBossIntro]      = useState<number>(-1);
  const [maxDmg, setMaxDmg]            = useState(0);
  const [logVisible, setLogVisible]     = useState(true);
  const [playerEnergy, setPlayerEnergy] = useState(100);
  const [showIntro, setShowIntro]       = useState(false);
  const [turnIndicator, setTurnIndicator] = useState<"player" | "boss" | null>(null);

  const pRef          = useRef<BattleCard[]>([]);
  const bRef          = useRef<BattleCard[]>([]);
  const isRunningRef  = useRef(false);
  const logIdRef      = useRef(0);
  const energyRef     = useRef(100);
  const comboRef      = useRef(0);
  const maxComboRef   = useRef(0);
  const totalDmgRef   = useRef(0);

  const level = CAMPAIGN_LEVELS.find((l) => l.id === selectedLevelId) || CAMPAIGN_LEVELS[0];
  const bossAlive = bossTeam.filter((c) => c.isAlive);
  const playerAlive = playerTeam.filter((c) => c.isAlive);
  const activePlayer = playerTeam[activePlayerIdx];

  useEffect(() => { pRef.current = playerTeam; }, [playerTeam]);
  useEffect(() => { bRef.current = bossTeam; }, [bossTeam]);
  useEffect(() => { energyRef.current = playerEnergy; }, [playerEnergy]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const addLog = useCallback((text: string, type: BattleLogEntry["type"] = "info") => {
    const colors: Record<string, string> = {
      damage: "#ef4444", ability: "#a855f7", status: "#22c55e",
      ko: "#f59e0b", turn: "#3b82f6", info: "#94a3b8",
      dodge: "#22c55e", heal: "#22c55e",
    };
    setLog((prev) => [...prev.slice(-14), { id: ++logIdRef.current, text, type, color: colors[type] ?? "#94a3b8" }]);
  }, []);

  const spawnDmg = useCallback((
    value: number, target: "player" | "boss",
    isCrit = false, isSuper = false, isWeak = false,
    isPoison = false, isBurn = false, isDodge = false,
    isHeal = false, isShield = false,
  ) => {
    const key = `dmg-${Date.now()}-${Math.random()}`;
    setDmgNums((prev) => [...prev.filter((d) => d.id !== key), {
      id: key, value, target, isCrit, isSuper, isWeak, isPoison, isBurn, isDodge, isHeal, isShield,
    }]);
    setTimeout(() => setDmgNums((prev) => prev.filter((d) => d.id !== key)), 1600);
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  }, []);

  const triggerHit = useCallback((target: "player" | "boss") => {
    setIsHit(target);
    setTimeout(() => setIsHit(null), 300);
  }, []);

  const showBanner = useCallback((info: { label: string; color: string }, side: "player" | "boss") => {
    setEffectBanner({ info, side });
    setTimeout(() => setEffectBanner(null), 1800);
  }, []);

  const announce = useCallback((text: string, color: string) => {
    setAnnounceColor(color);
    setTurnAnnounce(text);
    setTimeout(() => setTurnAnnounce(null), 1300);
  }, []);

  // ─── Apply damage ────────────────────────────────────────────────────────
  const applyDamage = useCallback((
    team: "player" | "boss", idx: number, dmg: number,
  ): { newHp: number; died: boolean } => {
    const target = team === "player" ? pRef.current[idx] : bRef.current[idx];
    let actualDmg = dmg;
    if (target.shieldActive) {
      const blocked = Math.min(target.shieldValue, dmg);
      actualDmg = dmg - blocked;
    }
    const newHp = Math.max(0, (team === "player"
      ? pRef.current[idx].hp
      : bRef.current[idx].hp) - actualDmg);
    const died = newHp === 0;
    if (team === "player") {
      setPlayerTeam((prev) => prev.map((c, i) => i === idx ? { ...c, hp: newHp, isAlive: newHp > 0 } : c));
    } else {
      setBossTeam((prev) => prev.map((c, i) => i === idx ? { ...c, hp: newHp, isAlive: newHp > 0 } : c));
    }
    return { newHp, died };
  }, []);

  // ─── Check end ────────────────────────────────────────────────────────────
  const checkEnd = useCallback(() => {
    const bAlive = bRef.current.filter((c) => c.isAlive);
    const pAlive = pRef.current.filter((c) => c.isAlive);
    if (bAlive.length === 0) { setStage("victory"); isRunningRef.current = false; return true; }
    if (pAlive.length === 0) { setStage("defeat"); isRunningRef.current = false; return true; }
    return false;
  }, []);

  // ─── Status tick ───────────────────────────────────────────────────────────
  const tickStatus = useCallback((team: "player" | "boss", idx: number, card: BattleCard) => {
    let totalTickDmg = 0;
    const updates: Partial<BattleCard> = {};

    if (card.poisonStacks > 0 || card.burnStacks > 0) {
      const tickDmg = Math.floor(card.maxHp * (card.poisonStacks * 0.05 + card.burnStacks * 0.03));
      if (tickDmg > 0) {
        totalTickDmg += tickDmg;
        spawnDmg(tickDmg, team, false, false, false, card.poisonStacks > 0, card.burnStacks > 0);
        setTimeout(() => applyDamage(team, idx, tickDmg), 100);
        addLog(`${card.name} chịu ${tickDmg} sát thương trạng thái`, "status");
      }
      updates.poisonStacks = 0;
      updates.burnStacks = 0;
    }

    if (card.regenStacks > 0) {
      const heal = Math.floor(card.maxHp * card.regenStacks * 0.06);
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
        spawnDmg(heal, team, false, false, false, false, false, false, true);
        addLog(`${card.name} hồi ${heal} HP`, "heal");
      }
    }

    if (card.shieldActive) {
      updates.shieldTurns = card.shieldTurns - 1;
      if (updates.shieldTurns! <= 0) {
        updates.shieldActive = false;
        updates.shieldTurns = 0;
        updates.shieldValue = 0;
        addLog(`🛡️ Khiên của ${card.name} đã hết`, "status");
      }
    }

    if (Object.keys(updates).length > 0) {
      if (team === "player") {
        setPlayerTeam((prev) => prev.map((c, i) => i === idx ? { ...c, ...updates } as BattleCard : c));
      } else {
        setBossTeam((prev) => prev.map((c, i) => i === idx ? { ...c, ...updates } as BattleCard : c));
      }
    }
    return totalTickDmg > 0;
  }, [spawnDmg, applyDamage, addLog]);

  // ─── Boss AI ──────────────────────────────────────────────────────────────
  const runBossAI = useCallback(() => {
    if (!isRunningRef.current) return;
    const p = pRef.current;
    const b = bRef.current;
    const bossIdx = b.findIndex((c) => c.isAlive);
    if (bossIdx === -1) return;
    const boss = b[bossIdx];
    const aliveP = p.findIndex((c) => c.isAlive);
    if (aliveP === -1) return;
    const target = p[aliveP];

    // Boss intro
    if (bossIntro === -1) {
      setBossIntro(bossIdx);
      announce(`☠️ ${boss.name} xuất hiện!`, "#ef4444");
      addLog(`Boss mới: ${boss.name} (Lv.${boss.level})`, "turn");
      setTimeout(() => setBossIntro(-1), 1500);
      setTimeout(() => executeBossAction(), 1600);
    } else {
      executeBossAction();
    }

    function executeBossAction() {
      setAttackAnim("boss");
      setTimeout(() => {
        setAttackAnim(null);

        // Boss attacks
        const dodgeRoll = Math.random() * 100;
        const playerCard = pRef.current[aliveP];
        const evaded = dodgeRoll < playerCard.evasionChance && playerCard.dodgeActive;

        if (evaded) {
          // Player dodged
          setIsDodging(true);
          spawnDmg(0, "player", false, false, false, false, false, true);
          announce("💨 NÉ!", "#22c55e");
          addLog(`${playerCard.name} né được đòn!`, "dodge");
          setTimeout(() => setIsDodging(false), 400);
        } else {
          // Boss hits
          setProjectile({ from: "boss", to: "player", elementId: boss.elementId });
          setTimeout(() => {
            setProjectile(null);
            triggerHit("player");
            triggerShake();

            const { dmg, isCrit, notes } = calcBattleDamage(boss, playerCard, boss.atk * 0.9);
            const advInfo = getAdvantageInfo(boss.elementId, playerCard.elementId);
            if (advInfo) showBanner(advInfo, "player");
            spawnDmg(dmg, "player", isCrit, !!advInfo && advInfo.mult > 1, !!advInfo && advInfo.mult < 1);
            const noteStr = notes.length > 0 ? ` [${notes.join(", ")}]` : "";
            addLog(`${ELEMENT_EMOJI[boss.elementId] || "👹"} ${boss.name} → ${dmg} dmg${noteStr}`, "damage");

            const { died } = applyDamage("player", aliveP, dmg);
            comboRef.current = 0;

            if (died) {
              addLog(`${target.name} đã bị đánh bại!`, "ko");
              announce("💀 KO!", "#f59e0b");
              setTimeout(() => {
                const nextAlive = pRef.current.findIndex((c, i) => i > aliveP && c.isAlive);
                const newIdx = nextAlive !== -1 ? nextAlive : pRef.current.findIndex((c) => c.isAlive);
                if (newIdx !== -1) setActivePlayerIdx(newIdx);
              }, 300);
            }
          }, 400);
        }

        // Status tick boss
        setTimeout(() => {
          tickStatus("boss", bossIdx, boss);

          // End turn: reset cooldowns, regen energy, charge ultimates
          setTimeout(() => {
            // Reset dodge for player
            setPlayerTeam((prev) => prev.map((c) => ({
              ...c,
              dodgeActive: false,
              energy: c.maxEnergy,
              moves: c.moves.map((m) => ({ ...m, currentCooldown: Math.max(0, m.currentCooldown - 1) })),
              ultimateCharge: Math.min(100, c.ultimateCharge + 33),
              stunned: Math.max(0, c.stunned - 1),
              silenced: Math.max(0, c.silenced - 1),
            })));
            setBossTeam((prev) => prev.map((c) => ({
              ...c,
              ultimateCharge: Math.min(100, c.ultimateCharge + 33),
            })));
            setPlayerEnergy(100);

            if (!checkEnd()) {
              setPhase("idle");
              setTurnCount((t) => t + 1);
            }
          }, 500);
        }, 600);
      }, 350);
    }
  }, [bossIntro, triggerHit, triggerShake, spawnDmg, showBanner, addLog, applyDamage, tickStatus, announce, checkEnd]);

  // ─── Execute player move ─────────────────────────────────────────────────
  const executeMove = useCallback((move: BattleMove) => {
    if (!isRunningRef.current || phase !== "idle") return;
    const p = pRef.current;
    const b = bRef.current;
    const attacker = p[activePlayerIdx];
    if (!attacker?.isAlive || attacker.stunned > 0) { setPhase("idle"); return; }
    if (attacker.energy < move.energyCost) {
      addLog(`⚡ Không đủ năng lượng!`, "info");
      return;
    }

    setPhase("animating");
    setAttackAnim("player");
    setPlayerEnergy((e) => Math.max(0, e - move.energyCost));

    // Apply cooldown
    if (move.cooldown > 0) {
      setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx
        ? {
            ...c,
            moves: c.moves.map((m) => m.id === move.id
              ? { ...m, currentCooldown: move.cooldown }
              : { ...m, currentCooldown: Math.max(0, m.currentCooldown - 1) }
            ),
          }
        : { ...c, moves: c.moves.map((m) => ({ ...m, currentCooldown: Math.max(0, m.currentCooldown - 1) })) }
      ));
    }

    setTimeout(() => {
      setAttackAnim(null);

      // ── DODGE ──
      if (move.type === "dodge") {
        setIsDodging(true);
        spawnDmg(0, "player", false, false, false, false, false, true);
        announce("💨 NÉ ĐÒN!", "#22c55e");
        addLog(`${attacker.name} né đòn!`, "dodge");

        setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx
          ? { ...c, dodgeActive: true, dodgeCooldown: 2, moves: c.moves.map((m) => m.id === move.id ? { ...m, currentCooldown: 2 } : m) }
          : c
        ));

        setTimeout(() => setIsDodging(false), 500);
        setTimeout(() => {
          setPhase("boss_turn");
          setTimeout(() => runBossAI(), 800);
        }, 600);
        return;
      }

      const bossIdx = b.findIndex((c) => c.isAlive);
      if (bossIdx === -1) return;
      const boss = b[bossIdx];

      // Projectile
      setProjectile({ from: "player", to: "boss", elementId: attacker.elementId });

      setTimeout(() => {
        setProjectile(null);
        triggerHit("boss");
        triggerShake();

        if (move.type === "ultimate") {
          // Ultimate: 3x damage, bypass shield, clear debuffs
          const { dmg, isCrit, notes } = calcBattleDamage(attacker, boss, attacker.atk * 3);
          const comboMult = 1 + comboRef.current * 0.1;
          const finalDmg = Math.floor(dmg * comboMult);
          const advInfo = getAdvantageInfo(attacker.elementId, boss.elementId);
          if (advInfo) showBanner(advInfo, "boss");
          spawnDmg(finalDmg, "boss", isCrit, !!advInfo && advInfo.mult > 1, !!advInfo && advInfo.mult < 1);

          if (finalDmg > maxDmg) setMaxDmg(finalDmg);
          comboRef.current++;
          if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;

          const noteStr = notes.length > 0 ? ` [${notes.join(", ")}]` : "";
          addLog(`💥 ${attacker.name} Tuyệt Chiêu! → ${finalDmg} dmg${noteStr}`, "ability");

          const { died } = applyDamage("boss", bossIdx, finalDmg);
          totalDmgRef.current += finalDmg;

          // Clear debuffs on player
          setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx
            ? { ...c, ultimateCharge: 0, poisonStacks: 0, burnStacks: 0 }
            : c
          ));

          if (died) {
            comboRef.current++;
            addLog(`${boss.name} đã bị đánh bại!`, "ko");
            announce("💀 KO!", "#f59e0b");
          }

          setTimeout(() => {
            if (!checkEnd()) {
              setPhase("boss_turn");
              setTimeout(() => runBossAI(), 800);
            }
          }, 600);
          return;
        }

        // ── SKILL EFFECTS ──
        const effect = move.effect;
        if (effect?.type === "damage") {
          const { dmg, isCrit, notes } = calcBattleDamage(attacker, boss, move.power);
          const comboMult = 1 + comboRef.current * 0.1;
          const finalDmg = Math.floor(dmg * comboMult);
          const advInfo = getAdvantageInfo(attacker.elementId, boss.elementId);
          if (advInfo) showBanner(advInfo, "boss");
          spawnDmg(finalDmg, "boss", isCrit, !!advInfo && advInfo.mult > 1, !!advInfo && advInfo.mult < 1);

          if (finalDmg > maxDmg) setMaxDmg(finalDmg);
          comboRef.current++;
          if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;

          const noteStr = notes.length > 0 ? ` [${notes.join(", ")}]` : "";
          addLog(`${move.icon} ${attacker.name} → ${finalDmg} dmg${noteStr}`, "damage");

          const { died } = applyDamage("boss", bossIdx, finalDmg);
          totalDmgRef.current += finalDmg;

          if (died) {
            comboRef.current++;
            addLog(`${boss.name} đã bị đánh bại!`, "ko");
            announce("💀 KO!", "#f59e0b");
          }
        } else if (effect?.type === "shield") {
          const shieldVal = Math.floor(attacker.maxHp * effect.value / 100);
          spawnDmg(0, "player", false, false, false, false, false, false, false, true);
          setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx
            ? { ...c, shieldActive: true, shieldValue: shieldVal, shieldTurns: effect.duration || 2 }
            : c
          ));
          addLog(`${attacker.name} tạo khiên ${shieldVal} HP`, "ability");
        } else if (effect?.type === "heal") {
          const heal = Math.floor(attacker.maxHp * effect.value / 100);
          spawnDmg(heal, "player", false, false, false, false, false, false, true);
          setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx
            ? { ...c, hp: Math.min(c.maxHp, c.hp + heal) }
            : c
          ));
          addLog(`${attacker.name} hồi ${heal} HP`, "heal");
        } else if (effect?.type === "poison") {
          setBossTeam((prev) => prev.map((c, i) => i === bossIdx
            ? { ...c, poisonStacks: c.poisonStacks + (effect.duration || 2) }
            : c
          ));
          addLog(`${boss.name} bị trúng độc!`, "status");
        } else if (effect?.type === "burn") {
          setBossTeam((prev) => prev.map((c, i) => i === bossIdx
            ? { ...c, burnStacks: c.burnStacks + (effect.duration || 2) }
            : c
          ));
          addLog(`${boss.name} bị cháy!`, "status");
        } else if (effect?.type === "regen") {
          setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx
            ? { ...c, regenStacks: c.regenStacks + (effect.duration || 3) }
            : c
          ));
          addLog(`${attacker.name} được hồi máu!`, "status");
        } else if (effect?.type === "stun") {
          setBossTeam((prev) => prev.map((c, i) => i === bossIdx
            ? { ...c, stunned: effect.duration || 1 }
            : c
          ));
          addLog(`${boss.name} bị choáng!`, "status");
        } else if (effect?.type === "buff_def") {
          setPlayerTeam((prev) => prev.map((c, i) => i === activePlayerIdx
            ? { ...c, shieldActive: true, shieldValue: effect.value, shieldTurns: effect.duration || 2 }
            : c
          ));
          addLog(`${attacker.name} tăng phòng thủ!`, "status");
        }

        // Status tick player
        setTimeout(() => {
          tickStatus("player", activePlayerIdx, attacker);

          // Update combo streak display
          setPlayerTeam((prev) => prev.map((c) => ({ ...c, comboStreak: comboRef.current })));

          setTimeout(() => {
            if (!checkEnd()) {
              setPhase("boss_turn");
              setTimeout(() => runBossAI(), 800);
            }
          }, 600);
        }, 400);
      }, 400);
    }, 300);
  }, [phase, activePlayerIdx, maxDmg, triggerHit, triggerShake, spawnDmg, showBanner, addLog, applyDamage, tickStatus, runBossAI, checkEnd, announce]);

  // ─── Switch card ─────────────────────────────────────────────────────────
  const switchCard = useCallback((newIdx: number) => {
    if (phase !== "idle" || !playerTeam[newIdx]?.isAlive || newIdx === activePlayerIdx) return;
    const oldCard = playerTeam[activePlayerIdx];
    setActivePlayerIdx(newIdx);
    addLog(`🔄 Đổi ${oldCard.name} → ${playerTeam[newIdx].name}`, "info");
    setTimeout(() => {
      setPhase("boss_turn");
      setTimeout(() => runBossAI(), 800);
    }, 400);
  }, [phase, playerTeam, activePlayerIdx, addLog, runBossAI]);

  // ─── Start battle ────────────────────────────────────────────────────────
  const startBattle = useCallback(() => {
    const team = deckCardIds.map((id) => buildBattleCard(id, cardLevels[String(id)] ?? 1));
    const firstAlive = team.findIndex((c) => c.isAlive);
    setPlayerTeam(team);
    setActivePlayerIdx(firstAlive >= 0 ? firstAlive : 0);
    setPlayerEnergy(100);
    energyRef.current = 100;
    comboRef.current = 0;
    maxComboRef.current = 0;
    totalDmgRef.current = 0;
    setMaxDmg(0);

    const bosses = level.bossIds.map((bossId) => buildBattleCard(bossId, 1, level.bossAtkMult, level.bossHpMult));
    setBossTeam(bosses);

    setLog([]);
    addLog(`⚔️ Chiến dịch: ${level.name}`, "turn");
    addLog(`Boss: ${ELEMENTS.find((e) => e.id === level.element)?.name ?? level.element} (x3)`, "info");
    setTurnCount(0);
    setBattleReward(level.reward);
    setPhase("idle");
    isRunningRef.current = true;
    setStage("battle");
    setShowIntro(true);
    setTimeout(() => setShowIntro(false), 2200);
  }, [deckCardIds, cardLevels, level, addLog]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0a14 0%, #12121f 40%, #1a1030 70%, #0a0a14 100%)" }}>

      {/* ─── Top bar ──────────────────────────────────────────────────────── */}
      <div className="relative z-30 flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <Button onClick={() => { isRunningRef.current = false; onClose(); }}
          variant="ghost" className="bg-white/8 text-white/80 border border-white/10 hover:bg-white/15 text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 gap-1">
          <ArrowLeft size={12} sm={13} /> <span className="hidden sm:inline">Thoát</span>
        </Button>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Badge tone="warning" className="text-[9px] sm:text-xs">⚔️ Đấu Trường</Badge>
          <span className="rounded-full bg-black/50 border border-white/10 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-mono text-white/40">
            Lượt {turnCount}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="flex items-center gap-0.5 sm:gap-1 rounded-full bg-black/50 px-1.5 sm:px-2 py-0.5 border border-white/10">
            <Shield size={9} sm={10} className="text-red-400" />
            <span className="text-[9px] sm:text-[10px] font-black text-red-400">{bossAlive.length}/3</span>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 rounded-full bg-black/50 px-1.5 sm:px-2 py-0.5 border border-white/10">
            <Heart size={9} sm={10} className="text-emerald-400" />
            <span className="text-[9px] sm:text-[10px] font-black text-emerald-400">{playerAlive.length}/{playerTeam.length}</span>
          </div>
        </div>
      </div>

      {/* ─── INTRO ─────────────────────────────────────────────────────────── */}
      {stage === "intro" && (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 overflow-y-auto p-3 sm:p-4">
          <div className="text-center pt-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">Chọn Chiến Dịch</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">Đánh bại 3 boss liên tiếp!</p>
          </div>
          <div className="w-full max-w-sm space-y-2 pb-4">
            {CAMPAIGN_LEVELS.map((lvl) => {
              const bossEl = ELEMENTS.find((e) => e.id === lvl.element);
              return (
                <button key={lvl.id} onClick={() => setSelectedLevelId(lvl.id)}
                  className={`w-full rounded-2xl border-2 p-3 sm:p-4 text-left transition-all duration-200 ${
                    selectedLevelId === lvl.id
                      ? "border-amber-400 bg-amber-950/25 shadow-[0_0_20px_rgba(234,179,8,0.18)]"
                      : "border-slate-700/60 bg-slate-900/60 hover:bg-slate-800/60"
                  }`}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${selectedLevelId === lvl.id ? "bg-amber-500 text-white shadow-amber-500/30" : "bg-slate-800 text-slate-500"}`}>
                      <Trophy size={18} sm={20} />
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
              className="w-full max-w-sm text-sm sm:text-base font-black py-2.5 sm:py-3 shadow-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border-0">
              <Swords size={16} sm={18} />Xông trận!
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
                      <TypeBadge elementId={level.element} />
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
            <div className="relative z-10 border-b border-white/10 bg-gradient-to-b from-red-950/20 to-transparent px-1 sm:px-2 pt-1.5 sm:pt-2 pb-2 sm:pb-3">
              <div className="mb-1.5 sm:mb-2 flex items-center justify-center">
                <div className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-black/50 px-2 sm:px-3 py-0.5 border border-white/10">
                  <TypeBadge elementId={level.element} />
                  <span className="text-[9px] sm:text-[10px] font-black text-white/60 hidden sm:inline">
                    {ELEMENTS.find((e) => e.id === level.element)?.name} Boss
                  </span>
                  <span className="rounded-full bg-red-900/80 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black text-red-300">
                    {bossAlive.length} còn
                  </span>
                </div>
              </div>
              <div className="flex items-end justify-center gap-2 sm:gap-4">
                {bossTeam.map((b, i) => (
                  <BattleAvatar
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
                  {(phase === "boss_turn" || phase === "animating") && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-full bg-red-600/20 border border-red-500/40 px-2.5 py-0.5 text-[8px] font-black text-red-400 shadow shadow-red-500/20">
                      Boss đánh
                    </motion.div>
                  )}
                </div>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* ─── Player zone ───────────────────────────────────────────────── */}
            <div className="relative z-10 flex-1 px-1 sm:px-2 py-1.5 sm:py-2 flex gap-1 sm:gap-2">
              {/* Main card + stats */}
              <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1">
                {/* Team lineup */}
                <div className="flex items-start justify-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                  {playerTeam.map((p, i) => (
                    <div key={p.id} className="relative">
                      <BattleAvatar
                        card={p}
                        team="player"
                        isActive={i === activePlayerIdx}
                        shake={isHit === "player" && i === activePlayerIdx}
                        isHit={isHit === "player" && i === activePlayerIdx}
                        attackAnim={attackAnim === "boss" && i === activePlayerIdx}
                        isDodging={isDodging && i === activePlayerIdx}
                        showStatus
                      />
                      {i !== activePlayerIdx && p.isAlive && phase === "idle" && (
                        <motion.button
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          whileHover={{ scale: 1.1 }}
                          onClick={() => switchCard(i)}
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-blue-600/80 border border-blue-400/50 px-1 py-0.5 text-[6px] sm:text-[7px] font-black text-white shadow whitespace-nowrap">
                          Đổi
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Energy + Ultimate bars */}
                {activePlayer?.isAlive && (
                  <div className="w-full max-w-[150px] sm:max-w-[200px] space-y-0.5 sm:space-y-1">
                    <div className="flex items-center justify-between text-[7px] sm:text-[9px]">
                      <span className="text-cyan-400 font-bold">⚡</span>
                      <span className="text-cyan-300 font-black">{playerEnergy}/{activePlayer.maxEnergy}</span>
                    </div>
                    <EnergyBar current={playerEnergy} max={activePlayer.maxEnergy} />
                    <div className="flex items-center justify-between text-[7px] sm:text-[9px]">
                      <span className="text-amber-400 font-bold">💥</span>
                      <span className="text-amber-300 font-black">{activePlayer.ultimateCharge}%</span>
                    </div>
                    <UltimateBar charge={activePlayer.ultimateCharge} />
                  </div>
                )}
              </div>

              {/* Combo meter */}
              <div className="flex items-start pt-1 sm:pt-4">
                <ComboMeter combo={activePlayer?.comboStreak || 0} maxDmg={maxDmg} />
              </div>
            </div>

            {/* ─── Move buttons ─────────────────────────────────────────────── */}
            {phase === "idle" && activePlayer?.isAlive && (
              <div className="relative z-20 px-1.5 sm:px-3 pb-2">
                <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
                  {activePlayer.moves.map((move) => (
                    <MoveButton
                      key={move.id}
                      move={move}
                      disabled={phase !== "idle"}
                      energy={playerEnergy}
                      onClick={() => executeMove(move)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Idle / waiting state */}
            {phase !== "idle" && activePlayer?.isAlive && (
              <div className="relative z-20 flex items-center justify-center pb-3">
                <div className="rounded-full bg-black/60 border border-white/10 px-4 py-1.5">
                  <span className="text-xs font-bold text-slate-400 animate-pulse">
                    ⚔️ {phase === "boss_turn" ? "Boss đang đánh..." : phase === "animating" ? "Thực hiện chiêu..." : "Xử lý..."}
                  </span>
                </div>
              </div>
            )}

            {/* Projectile */}
            <AnimatePresence>
              {projectile && (
                <Projectile
                  key="proj"
                  from={projectile.from}
                  to={projectile.to}
                  elementId={projectile.elementId}
                  onDone={() => setProjectile(null)}
                />
              )}
            </AnimatePresence>

            {/* Effectiveness banner */}
            <AnimatePresence>
              {effectBanner && <EffectivenessBanner key="banner" info={effectBanner.info} side={effectBanner.side} />}
            </AnimatePresence>

            {/* Damage numbers */}
            <div className="absolute inset-0 z-50 pointer-events-none">
              {dmgNums.map((d) => (
                <div
                  key={d.id}
                  className="absolute"
                  style={{
                    top: d.target === "boss" ? "30%" : "58%",
                    left: "50%", transform: "translateX(-50%)",
                  }}
                >
                  <DamageNumber num={d} />
                </div>
              ))}
            </div>

            {/* Battle log */}
            <div className="mx-2 sm:mx-3 mb-2 max-h-14 sm:max-h-16 overflow-y-auto rounded-xl border border-white/10 bg-black/50 px-2 sm:px-3 py-1 sm:py-1.5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider">Nhật ký</span>
                <button onClick={() => setLogVisible(!logVisible)} className="text-slate-500 hover:text-slate-300">
                  {logVisible ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                </button>
              </div>
              {logVisible && log.slice(-4).map((l) => (
                <p key={l.id} className="text-[10px] font-medium leading-relaxed" style={{ color: l.color }}>
                  {l.text}
                </p>
              ))}
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
              {maxComboRef.current >= 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55 }}
                  className="mt-2 flex items-center justify-center gap-1 text-sm font-bold text-amber-300"
                >
                  <Flame size={14} className="text-amber-400" />
                  {maxComboRef.current}x Combo!
                </motion.div>
              )}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="mt-3 space-y-1 text-sm text-slate-400">
                <p>Hoàn thành trong <span className="font-black text-white">{turnCount}</span> lượt</p>
                <p>Tổng sát thương: <span className="font-black text-red-400">{totalDmgRef.current}</span></p>
                <p>Damage lớn nhất: <span className="font-black text-red-400">{maxDmg}</span></p>
                <p>Max combo: <span className="font-black text-amber-400">{maxComboRef.current}x</span></p>
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
                <span className="text-[11px]">Lên cấp thẻ hoặc đổi chiến thuật!</span>
              </div>
              <div className="mt-3 text-xs text-slate-600">
                <p>💡 Tận dụng lợi thế nguyên tố để tăng 50% sát thương!</p>
                <p>💡 Né đòn để bảo toàn combo!</p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    setStage("intro"); setPlayerTeam([]); setBossTeam([]);
                    setPhase("idle"); setTurnCount(0); setLog([]);
                    isRunningRef.current = false;
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
