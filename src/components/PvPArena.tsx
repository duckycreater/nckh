import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy, Zap, ArrowLeft, X, Loader2, ChevronRight, User, Star, Crown, Target, Shield, Heart, Flame, Skull } from "lucide-react";
import { Button, Card } from "../lib/ui";
import { getCardById, getElementIcon } from "../lib/cards";
import type { CardDef } from "../lib/cards";

// ─── Types ──────────────────────────────────────────────────────────────

interface BattleCard {
  id: number; name: string; subtitle: string;
  elementId: string; rarityId: string;
  atk: number; hp: number; maxHp: number;
  def: number; spd: number; crt: number; int: number;
  level: number; isAlive: boolean;
  moves: BattleMove[];
  energy: number; maxEnergy: number;
  dodgeActive: boolean; dodgeCooldown: number;
  poisonStacks: number; shieldActive: boolean; shieldTurns: number; shieldValue: number;
  burnStacks: number; regenStacks: number;
  stunned: number; defDownStacks: number;
  atkBuff: number;
  totalDamage: number;
  specialAbility?: string; // arena-exclusive: "second_wind" | "last_stand" | "iron_will"
  secondWindUsed?: boolean;
  lastStandUsed?: boolean;
  ironWillUsed?: boolean;
}

interface BattleMove {
  id: string; name: string; desc: string; icon: string;
  type: "tackle" | "skill" | "ultimate" | "dodge";
  energyCost: number; cooldown: number; currentCooldown: number;
  power: number;
  effect?: { type: string; value: number; duration?: number };
}

interface Props {
  onClose: () => void;
  onBattle?: (won: boolean, xpGained: number) => void;
  currentUserNick: string;
  userCards?: number[];
}

type ArenaStage = "idle" | "team_select" | "searching" | "matched" | "battling" | "result";

interface MatchResult { won: boolean; reward: number; opponentName: string; }

// ─── Helpers ────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildBattleCard(id: number, level = 5): BattleCard {
  const base = getCardById(id);
  if (!base) {
    return {
      id, name: `Card #${id}`, subtitle: "",
      elementId: "hazard", rarityId: "epic",
      atk: 25, hp: 150, maxHp: 150, def: 5, spd: 5, crt: 5, int: 5,
      level, isAlive: true,
      moves: [],
      energy: 100, maxEnergy: 100, dodgeActive: false, dodgeCooldown: 0,
      poisonStacks: 0, shieldActive: false, shieldTurns: 0, shieldValue: 0,
      burnStacks: 0, regenStacks: 0, stunned: 0, defDownStacks: 0,
      atkBuff: 0, totalDamage: 0,
    };
  }
  const hp = Math.floor(base.hp * (1 + (level - 1) * 0.15));
  const atk = Math.floor(base.atk * (1 + (level - 1) * 0.15));
  const def = Math.floor((base.def || 5) * (1 + (level - 1) * 0.10));
  const spd = Math.floor((base.spd || 5) * (1 + (level - 1) * 0.05));
  const crt = Math.min(35, Math.floor((base.crt || 5) * (1 + (level - 1) * 0.03)));
  const evasion = Math.min(85, 55 + spd);
  return {
    id, name: base.name, subtitle: base.subtitle,
    elementId: base.elementId, rarityId: base.rarityId,
    atk, hp, maxHp: hp, def, spd, crt, int: Math.floor((base.int || 5) * (1 + (level - 1) * 0.05)),
    level, isAlive: true,
    moves: [
      { id: "tackle", name: "Tấn Công", desc: "Đòn cơ bản", icon: "⚔️", type: "tackle", energyCost: 0, cooldown: 0, currentCooldown: 0, power: Math.floor(atk * 0.9) },
      { id: "skill", name: "Kỹ Năng", desc: "Đòn mạnh +15% DEF", icon: "💥", type: "skill", energyCost: 25, cooldown: 2, currentCooldown: 0, power: Math.floor(atk * 1.4) },
      { id: "defend", name: "Phòng Thủ", desc: "Tạo khiên", icon: "🛡️", type: "skill", energyCost: 15, cooldown: 2, currentCooldown: 0, power: 0, effect: { type: "shield", value: Math.floor(def * 2 + level * 12), duration: 2 } },
      { id: "ultimate", name: "Chiêu Cuối", desc: "Sát thương cao nhất", icon: "🌟", type: "ultimate", energyCost: 70, cooldown: 0, currentCooldown: 0, power: Math.floor(atk * 2.5) },
      { id: "dodge", name: "Né Tránh", desc: "Tăng né 40%", icon: "💨", type: "dodge", energyCost: 12, cooldown: 3, currentCooldown: 0, power: 0, effect: { type: "dodge", value: 40, duration: 1 } },
    ],
    energy: 100, maxEnergy: 100, dodgeActive: false, dodgeCooldown: 0,
    poisonStacks: 0, shieldActive: false, shieldTurns: 0, shieldValue: 0,
    burnStacks: 0, regenStacks: 0, stunned: 0, defDownStacks: 0,
    atkBuff: 0, totalDamage: 0,
  };
}

function buildOpponentCard(id: number, tier: RivalTier = "bronze", tierConfig?: RivalTierConfig): BattleCard {
  const tc = tierConfig || RIVAL_TIERS.find(t => t.tier === tier) || RIVAL_TIERS[0];
  const base = getCardById(id);
  if (!base) {
    return {
      id, name: `Rival #${id}`, subtitle: "",
      elementId: "hazard", rarityId: "epic",
      atk: Math.floor(25 * tc.atkMult), hp: Math.floor(150 * tc.hpMult), maxHp: Math.floor(150 * tc.hpMult),
      def: Math.floor(5 * tc.defMult), spd: Math.floor(5 * tc.spdMult), crt: Math.min(40, 5 + tc.crtBonus), int: 5,
      level: 5, isAlive: true,
      moves: [],
      energy: 100, maxEnergy: 100, dodgeActive: false, dodgeCooldown: 0,
      poisonStacks: 0, shieldActive: false, shieldTurns: 0, shieldValue: 0,
      burnStacks: 0, regenStacks: 0, stunned: 0, defDownStacks: 0,
      atkBuff: 0, totalDamage: 0,
    };
  }
  const level = 5;
  const hpBase = Math.floor(base.hp * (1 + (level - 1) * 0.15));
  const atkBase = Math.floor(base.atk * (1 + (level - 1) * 0.15));
  const defBase = Math.floor((base.def || 5) * (1 + (level - 1) * 0.10));
  const hp = Math.floor(hpBase * tc.hpMult);
  const atk = Math.floor(atkBase * tc.atkMult);
  const def = Math.floor(defBase * tc.defMult);
  const spd = Math.floor((base.spd || 5) * tc.spdMult);
  const crt = Math.min(40, Math.floor((base.crt || 5) * 1.1) + tc.crtBonus);

  // Tier-specific moves
  const hasStun = tier !== "bronze";
  const hasPoison = tier === "silver" || tier === "gold" || tier === "diamond";
  const hasBurn = tier === "gold" || tier === "diamond";
  const hasDefDown = tier === "silver" || tier === "gold" || tier === "diamond";
  const hasHeal = tier === "silver" || tier === "gold" || tier === "diamond";
  const hasUltimate = true;
  const moves: BattleMove[] = [
    { id: "tackle", name: "Tấn Công", desc: "Đòn cơ bản", icon: "⚔️", type: "tackle", energyCost: 0, cooldown: 0, currentCooldown: 0, power: Math.floor(atk * 0.9) },
    { id: "skill", name: "Kỹ Năng", desc: "Đòn mạnh", icon: "💥", type: "skill", energyCost: 25, cooldown: 2, currentCooldown: 0, power: Math.floor(atk * 1.4) },
    { id: "defend", name: "Phòng Thủ", desc: "Tạo khiên", icon: "🛡️", type: "skill", energyCost: 15, cooldown: 2, currentCooldown: 0, power: 0, effect: { type: "shield", value: Math.floor(def * 2 + level * 12), duration: 2 } },
  ];
  if (hasStun) moves.push({ id: "stun_hit", name: "Khiến Choáng", desc: "Có thể làm choáng", icon: "⚡", type: "skill", energyCost: 30, cooldown: 3, currentCooldown: 0, power: Math.floor(atk * 1.0), effect: { type: "stun", value: 1 } });
  if (hasPoison) moves.push({ id: "poison_hit", name: "Nhiễm Độc", desc: "Gây độc", icon: "☠️", type: "skill", energyCost: 28, cooldown: 2, currentCooldown: 0, power: Math.floor(atk * 0.8), effect: { type: "poison", value: 2 } });
  if (hasBurn) moves.push({ id: "burn_hit", name: "Đốt Cháy", desc: "Gây cháy", icon: "🔥", type: "skill", energyCost: 32, cooldown: 3, currentCooldown: 0, power: Math.floor(atk * 0.9), effect: { type: "burn", value: 2 } });
  if (hasDefDown) moves.push({ id: "def_break", name: "Phá Giáp", desc: "Giảm phòng thủ", icon: "🔨", type: "skill", energyCost: 22, cooldown: 2, currentCooldown: 0, power: Math.floor(atk * 0.7), effect: { type: "def_down", value: 15 } });
  if (hasHeal) moves.push({ id: "heal_up", name: "Hồi Máu", desc: "Hồi HP", icon: "💚", type: "skill", energyCost: 20, cooldown: 3, currentCooldown: 0, power: 0, effect: { type: "heal", value: Math.floor(hp * 0.25) } });
  if (hasUltimate) moves.push({ id: "ultimate", name: "Chiêu Cuối", desc: "Sát thương cao nhất", icon: "🌟", type: "ultimate", energyCost: 70, cooldown: 0, currentCooldown: 0, power: Math.floor(atk * 2.5) });
  moves.push({ id: "dodge", name: "Né Tránh", desc: "Tăng né", icon: "💨", type: "dodge", energyCost: 12, cooldown: 3, currentCooldown: 0, power: 0, effect: { type: "dodge", value: 40, duration: 1 } });

  return {
    id, name: base.name, subtitle: base.subtitle,
    elementId: base.elementId, rarityId: base.rarityId,
    atk, hp, maxHp: hp, def, spd, crt,
    int: Math.floor((base.int || 5) * (1 + (level - 1) * 0.05)),
    level, isAlive: true,
    moves,
    energy: 100, maxEnergy: 100, dodgeActive: false, dodgeCooldown: 0,
    poisonStacks: 0, shieldActive: false, shieldTurns: 0, shieldValue: 0,
    burnStacks: 0, regenStacks: 0, stunned: 0, defDownStacks: 0,
    atkBuff: 0, totalDamage: 0,
    specialAbility: tc.specialAbility,
  };
}

// ─── RIVAL AI PROFILES ───────────────────────────────────────────────────────
// ─── Rival Tier System ───────────────────────────────────────────────────
type RivalTier = "bronze" | "silver" | "gold" | "diamond";

interface RivalTierConfig {
  tier: RivalTier;
  label: string;
  atkMult: number;
  hpMult: number;
  defMult: number;
  spdMult: number;
  crtBonus: number;
  enrageThreshold: number; // HP % when enrage triggers
  enrageAtkBoost: number; // ATK boost on enrage
  specialAbility?: string; // arena-exclusive ability
  rewardBase: number;
  xpBase: number;
}

const RIVAL_TIERS: RivalTierConfig[] = [
  {
    tier: "bronze", label: "Bronze", atkMult: 1.0, hpMult: 1.0, defMult: 1.0, spdMult: 1.0, crtBonus: 0,
    enrageThreshold: 0.25, enrageAtkBoost: 0.25,
    rewardBase: 30, xpBase: 20,
  },
  {
    tier: "silver", label: "Bạc", atkMult: 1.2, hpMult: 1.2, defMult: 1.1, spdMult: 1.05, crtBonus: 5,
    enrageThreshold: 0.30, enrageAtkBoost: 0.35,
    specialAbility: "second_wind",
    rewardBase: 50, xpBase: 35,
  },
  {
    tier: "gold", label: "Vàng", atkMult: 1.4, hpMult: 1.4, defMult: 1.2, spdMult: 1.1, crtBonus: 10,
    enrageThreshold: 0.35, enrageAtkBoost: 0.5,
    specialAbility: "last_stand",
    rewardBase: 80, xpBase: 60,
  },
  {
    tier: "diamond", label: "Kim Cương", atkMult: 1.6, hpMult: 1.6, defMult: 1.3, spdMult: 1.15, crtBonus: 15,
    enrageThreshold: 0.40, enrageAtkBoost: 0.65,
    specialAbility: "iron_will",
    rewardBase: 120, xpBase: 100,
  },
];

const RIVAL_PROFILES = [
  { name: "Rival", style: "balanced", tier: "bronze" },
  { name: "Dark Challenger", style: "aggressive", tier: "bronze" },
  { name: "Shadow Knight", style: "defensive", tier: "silver" },
  { name: "Storm Bringer", style: "tactical", tier: "silver" },
  { name: "Inferno Lord", style: "aggressive", tier: "gold" },
  { name: "Iron Guardian", style: "defensive", tier: "gold" },
  { name: "Arcane Master", style: "tactical", tier: "diamond" },
  { name: "Dragon Slayer", style: "balanced", tier: "diamond" },
];

function pickRivalProfile(playerRank: RivalTier = "bronze") {
  // Only pick rivals at or above player rank
  const tierOrder: RivalTier[] = ["bronze", "silver", "gold", "diamond"];
  const minIdx = tierOrder.indexOf(playerRank);
  const candidates = RIVAL_PROFILES.filter(r => tierOrder.indexOf(r.tier) >= minIdx);
  return candidates[Math.floor(Math.random() * candidates.length)] || RIVAL_PROFILES[0];
}

// Smart AI: picks best move based on game state
function pickSmartMove(
  card: BattleCard,
  playerTeam: BattleCard[],
  playerIdx: number,
  profile: string
): BattleMove | null {
  const alivePlayers = playerTeam.filter(c => c.isAlive);
  if (alivePlayers.length === 0) return null;

  // Find target: low-HP player card or random
  const targetIdx = playerTeam.findIndex(c =>
    c.isAlive && c.hp === Math.min(...alivePlayers.map(p => p.hp))
  );

  const moves = card.moves.filter(m => m.currentCooldown === 0 && m.energyCost <= card.energy);
  if (moves.length === 0) {
    const fallback = card.moves.filter(m => m.energyCost <= card.energy);
    if (fallback.length > 0) return pickRandom(fallback);
    return null;
  }

  const hpRatio = card.hp / card.maxHp;
  const targetCard = playerTeam[targetIdx];
  const elementalAdv = getElementAdvantage(card.elementId, targetCard?.elementId || "plastic");

  // ─── Defensive style: prioritize survival ───
  if (profile === "defensive") {
    if (hpRatio < 0.4) {
      const shieldMove = moves.find(m => m.effect?.type === "shield");
      if (shieldMove) return shieldMove;
      const dodgeMove = moves.find(m => m.type === "dodge");
      if (dodgeMove) return dodgeMove;
    }
    if (hpRatio < 0.6) {
      const healMove = moves.find(m => m.effect?.type === "heal");
      if (healMove) return healMove;
    }
  }

  // ─── Aggressive style: prioritize damage ───
  if (profile === "aggressive") {
    if (card.energy >= 70) {
      const ult = moves.find(m => m.type === "ultimate");
      if (ult) return ult;
    }
    if (moves.some(m => m.type === "skill")) {
      const skills = moves.filter(m => m.type === "skill");
      return pickRandom(skills);
    }
    return moves[0];
  }

  // ─── Tactical style: exploit elements and status ───
  if (profile === "tactical") {
    // Use poison if target has no poison immunity and isn't already heavily poisoned
    if (!targetCard?.poisonImmune && (targetCard?.poisonStacks || 0) < 3) {
      const poisonMove = moves.find(m => m.effect?.type === "poison");
      if (poisonMove) return poisonMove;
    }
    // Use burn if target has no burn immunity
    if (!targetCard?.burnImmune) {
      const burnMove = moves.find(m => m.effect?.type === "burn");
      if (burnMove) return burnMove;
    }
    // Use stun if player has no stun yet
    if ((targetCard?.stunned || 0) === 0) {
      const stunMove = moves.find(m => m.effect?.type === "stun");
      if (stunMove) return stunMove;
    }
    // Use def_down to break through tanky cards
    if (targetCard && targetCard.def > 20) {
      const defMove = moves.find(m => m.effect?.type === "def_down");
      if (defMove) return defMove;
    }
    // Chain ultimate when energy is high
    if (card.energy >= 70) {
      const ult = moves.find(m => m.type === "ultimate");
      if (ult) return ult;
    }
    // Prefer skills with elemental advantage
    if (elementalAdv) {
      const skillMoves = moves.filter(m => m.type === "skill" || m.type === "ultimate");
      if (skillMoves.length > 0) return pickRandom(skillMoves);
    }
  }

  // ─── Balanced style: fallback priority ───
  if (hpRatio < 0.25) {
    const shieldMove = moves.find(m => m.effect?.type === "shield");
    if (shieldMove) return shieldMove;
    const dodgeMove = moves.find(m => m.type === "dodge");
    if (dodgeMove) return dodgeMove;
  }
  if (card.energy >= 70) {
    const ult = moves.find(m => m.type === "ultimate");
    if (ult) return ult;
  }
  if (hpRatio < 0.5) {
    const healMove = moves.find(m => m.effect?.type === "heal");
    if (healMove) return healMove;
    const shieldMove = moves.find(m => m.effect?.type === "shield");
    if (shieldMove) return shieldMove;
  }

  // Prefer tackle if nothing else fits
  const tackle = moves.find(m => m.type === "tackle");
  if (tackle) return tackle;
  return moves[0];
}

function getElementAdvantage(attackerEl: string, defenderEl: string): { mult: number; label: string } | null {
  const adv: Record<string, string> = {
    plastic: "organic", organic: "hazard", hazard: "plastic",
    paper: "plastic", metal: "paper", glass: "organic",
  };
  if (adv[attackerEl] === defenderEl) return { mult: 1.5, label: "Hiệu quả!" };
  if (adv[defenderEl] === attackerEl) return { mult: 0.75, label: "Yếu hơn!" };
  return null;
}

function calcDamage(
  attacker: BattleCard,
  defender: BattleCard,
  basePower: number,
  isPlayer: boolean,
): { dmg: number; isCrit: boolean; notes: string[] } {
  const notes: string[] = [];
  let dmg = basePower;

  // Dodge check
  if (defender.dodgeActive) {
    notes.push("Né!");
    return { dmg: 0, isCrit: false, notes };
  }

  // Evasion
  if (Math.random() * 100 < defender.sp * 0.5) {
    notes.push("Trượt!");
    return { dmg: 0, isCrit: false, notes };
  }

  // INT bonus
  dmg = Math.floor(dmg * (1 + attacker.int * 0.015));

  // ATK buff
  if (attacker.atkBuff > 0) {
    dmg = Math.floor(dmg * (1 + attacker.atkBuff * 0.02));
  }

  // Random variance
  dmg = Math.floor(dmg * (0.85 + Math.random() * 0.30));

  // Critical
  const isCrit = Math.random() * 100 < attacker.crt;
  if (isCrit) { dmg = Math.floor(dmg * 2); notes.push("Chí mạng!"); }

  // Element advantage
  const adv = getElementAdvantage(attacker.elementId, defender.elementId);
  if (adv) { dmg = Math.floor(dmg * adv.mult); notes.push(adv.label); }

  // DEF reduction
  if (defender.defDownStacks > 0) {
    const defEffective = Math.max(0, defender.def - defender.defDownStacks * 3);
    dmg = Math.floor(dmg * (1 - defEffective * 0.004));
  } else {
    dmg = Math.floor(dmg * (1 - defender.def * 0.004));
  }

  // Shield
  if (defender.shieldActive && dmg > 0) {
    const blocked = Math.min(defender.shieldValue, dmg);
    dmg = Math.max(0, dmg - blocked);
    defender.shieldValue -= blocked;
    notes.push(`Khiên -${blocked}`);
    if (defender.shieldValue <= 0) {
      defender.shieldActive = false;
      defender.shieldValue = 0;
    }
  }

  dmg = Math.max(1, dmg);
  return { dmg, isCrit, notes };
}

// Fix: defender.sp doesn't exist, use spd instead
function calcDmg(
  attacker: BattleCard,
  defender: BattleCard,
  basePower: number,
  isPlayer: boolean,
): { dmg: number; isCrit: boolean; notes: string[] } {
  const notes: string[] = [];
  let dmg = basePower;

  if (defender.dodgeActive) { notes.push("Né!"); return { dmg: 0, isCrit: false, notes }; }

  if (Math.random() * 100 < defender.spd * 0.5) { notes.push("Trượt!"); return { dmg: 0, isCrit: false, notes }; }

  dmg = Math.floor(dmg * (1 + attacker.int * 0.015));
  if (attacker.atkBuff > 0) dmg = Math.floor(dmg * (1 + attacker.atkBuff * 0.02));
  dmg = Math.floor(dmg * (0.85 + Math.random() * 0.30));

  const isCrit = Math.random() * 100 < attacker.crt;
  if (isCrit) { dmg = Math.floor(dmg * 2); notes.push("Chí mạng!"); }

  const adv = getElementAdvantage(attacker.elementId, defender.elementId);
  if (adv) { dmg = Math.floor(dmg * adv.mult); notes.push(adv.label); }

  if (defender.defDownStacks > 0) {
    const defEff = Math.max(0, defender.def - defender.defDownStacks * 3);
    dmg = Math.floor(dmg * (1 - defEff * 0.004));
  } else {
    dmg = Math.floor(dmg * (1 - defender.def * 0.004));
  }

  if (defender.shieldActive && dmg > 0) {
    const blocked = Math.min(defender.shieldValue, dmg);
    dmg = Math.max(0, dmg - blocked);
    defender.shieldValue -= blocked;
    notes.push(`Khiên -${blocked}`);
    if (defender.shieldValue <= 0) { defender.shieldActive = false; defender.shieldValue = 0; }
  }

  dmg = Math.max(1, dmg);
  return { dmg, isCrit, notes };
}

// ─── Component ───────────────────────────────────────────────────────────

export function PvPArena({ onClose, onBattle, currentUserNick, userCards }: Props) {
  const [stage, setStage] = useState<ArenaStage>("idle");
  const [battleResult, setBattleResult] = useState<MatchResult | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [rivalProfile, setRivalProfile] = useState<{ name: string; style: string; tier: RivalTier }>({ name: "Rival", style: "balanced", tier: "bronze" });
  const [rivalEnraged, setRivalEnraged] = useState(false);
  const [rankStreak, setRankStreak] = useState(0); // consecutive wins
  const [playerRank, setPlayerRank] = useState<RivalTier>("bronze");

  // Team selection state
  const [selectedTeam, setSelectedTeam] = useState<number[]>([]);
  const [selectableCards, setSelectableCards] = useState<number[]>([]);

  // Battle state
  const [playerTeam, setPlayerTeam] = useState<BattleCard[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<BattleCard[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentOpponentIdx, setCurrentOpponentIdx] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<"idle" | "animating" | "opponent_turn">("idle");
  const [selectedMove, setSelectedMove] = useState<BattleMove | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [roundHistory, setRoundHistory] = useState<Array<{ round: number; winner: "player" | "opponent" | "draw"; playerDmg: number; oppDmg: number }>>([]);

  const currentPlayerCard = playerTeam[currentPlayerIdx];
  const currentOppCard = opponentTeam[currentOpponentIdx];

  // ─── Team Selection ─────────────────────────────────────
  const handleFindMatch = () => {
    const cards = userCards ?? [];
    if (cards.length === 0) {
      alert("Bạn cần có thẻ bài để tham gia PvP!");
      return;
    }
    // Pick random 5 cards as selectable pool
    const pool = shuffle(cards).slice(0, Math.min(10, cards.length));
    setSelectableCards(pool);
    setSelectedTeam([]);
    setStage("team_select");
  };

  const toggleCard = (cardId: number) => {
    setSelectedTeam(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : prev.length < 3 ? [...prev, cardId] : prev
    );
  };

  const handleStartPvP = () => {
    if (selectedTeam.length !== 3) return;

    // Pick rival profile
    const rival = pickRivalProfile(playerRank);
    setRivalProfile(rival);
    setRivalEnraged(false);

    // Build player team (level 5)
    const pTeam = selectedTeam.map(id => buildBattleCard(id, 5));
    setPlayerTeam(pTeam);

    // Build opponent team with tier multipliers
    const tierConfig = RIVAL_TIERS.find(t => t.tier === rival.tier) || RIVAL_TIERS[0];
    const cards = userCards ?? [];
    const oppPool = shuffle(cards.filter(id => !selectedTeam.includes(id))).slice(0, 3);
    const oTeam = oppPool.length >= 3
      ? oppPool.map(id => buildOpponentCard(id, rival.tier, tierConfig))
      : [buildOpponentCard(cards[0] || 1, rival.tier, tierConfig), buildOpponentCard(cards[1] || 2, rival.tier, tierConfig), buildOpponentCard(cards[2] || 3, rival.tier, tierConfig)];
    setOpponentTeam(oTeam);

    setBattleLog([`⚔️ Trận đấu bắt đầu!`, `👤 ${currentUserNick} vs Rival!`]);
    setTurnCount(0);
    setRoundHistory([]);
    setCurrentPlayerIdx(0);
    setCurrentOpponentIdx(0);
    setIsPlayerTurn(true);
    setStage("battling");
  };

  // ─── Battle Logic ──────────────────────────────────────
  const selectMove = (move: BattleMove) => {
    if (turn !== "idle" || !currentPlayerCard?.isAlive || currentPlayerCard.stunned > 0) return;
    if (move.currentCooldown > 0) return;
    if (move.energyCost > currentPlayerCard.energy) return;
    setSelectedMove(move);
    setTurn("animating");
  };

  // AI opponent move - must be defined before executePlayerMove so it can be called
  const executeOpponentMove = useCallback((prevP: BattleCard[], prevO: BattleCard[], pIdx: number, oIdx: number, prevLog: string[], rivalStyle: string, rivalHp: number, rivalMaxHp: number, enrageThreshold: number = 0.30, enrageAtkBoost: number = 0.5) => {
    const newP = [...prevP];
    const newO = [...prevO];
    let newLog = [...prevLog];
    let turnDmg = 0;

    // Status ticks on opponent card
    if (newO[oIdx].poisonStacks > 0) {
      const pd = Math.floor(newO[oIdx].maxHp * 0.04 * newO[oIdx].poisonStacks);
      newO[oIdx].hp -= pd; newLog.push(`☠️ ${newO[oIdx].name} nhận ${pd} độc!`);
    }
    if (newO[oIdx].burnStacks > 0) {
      const bd = Math.floor(newO[oIdx].maxHp * 0.03 * newO[oIdx].burnStacks);
      newO[oIdx].hp -= bd; newLog.push(`🔥 ${newO[oIdx].name} nhận ${bd} cháy!`);
    }

    if (newO[oIdx].hp <= 0) { newO[oIdx].hp = 0; newO[oIdx].isAlive = false; newLog.push(`💀 ${newO[oIdx].name} bị loại!`); }

    // ─── Special Abilities ───
    if (!newO[oIdx].isAlive && newO[oIdx].specialAbility === "second_wind" && !newO[oIdx].secondWindUsed) {
      newO[oIdx].isAlive = true;
      newO[oIdx].hp = Math.floor(newO[oIdx].maxHp * 0.25);
      newO[oIdx].secondWindUsed = true;
      newO[oIdx].energy = newO[oIdx].maxEnergy;
      newLog.push(`✨ ${newO[oIdx].name} dùng SECOND WIND! Hồi sinh với 25% HP!`);
    } else if (!newO[oIdx].isAlive && newO[oIdx].specialAbility === "last_stand" && !newO[oIdx].lastStandUsed) {
      newO[oIdx].isAlive = true;
      newO[oIdx].hp = Math.floor(newO[oIdx].maxHp * 0.15);
      newO[oIdx].atkBuff += 15;
      newO[oIdx].atk = Math.floor(newO[oIdx].atk * 1.5);
      newO[oIdx].lastStandUsed = true;
      newO[oIdx].energy = newO[oIdx].maxEnergy;
      newLog.push(`⚡ ${newO[oIdx].name} dùng LAST STAND! Tấn công tăng 50%!`);
    } else if (!newO[oIdx].isAlive && newO[oIdx].specialAbility === "iron_will" && !newO[oIdx].ironWillUsed) {
      newO[oIdx].isAlive = true;
      newO[oIdx].hp = Math.floor(newO[oIdx].maxHp * 0.30);
      newO[oIdx].ironWillUsed = true;
      newO[oIdx].energy = newO[oIdx].maxEnergy;
      newLog.push(`🛡️ ${newO[oIdx].name} dùng IRON WILL! Hồi sinh với 30% HP!`);
    }

    // Check if opponent team wiped
    const oppAlive = newO.filter(c => c.isAlive);
    if (oppAlive.length === 0) {
      setPlayerTeam(newP); setOpponentTeam(newO); setBattleLog(newLog);
      setTurn("idle");
      handlePvPEnd(true, newP, newO, turnCount);
      return;
    }

    // Find next alive opponent
    const nextO = newO.findIndex((c, i) => i > oIdx && c.isAlive);
    const realOIdx = nextO >= 0 ? nextO : newO.findIndex(c => c.isAlive);
    if (realOIdx !== oIdx) { oIdx = realOIdx; setCurrentOpponentIdx(realOIdx); }

    // AI: pick smart move using rival profile
    const oppCard = newO[oIdx];
    const effectiveHpRatio = rivalHp / rivalMaxHp;
    // Check enrage at tier-specific HP threshold
    if (!rivalEnraged && effectiveHpRatio <= enrageThreshold) {
      setRivalEnraged(true);
      oppCard.atk = Math.floor(oppCard.atk * (1 + enrageAtkBoost));
      newLog.push(`👹🔥 ${oppCard.name} CUỒNG NGẠO! ATK +${Math.round(enrageAtkBoost * 100)}%!`);
    }

    const move = pickSmartMove(oppCard, newP, pIdx, rivalStyle);
    if (!move) {
      newLog.push(`⚡ ${oppCard.name} không có lượt!`);
    } else {
    if (move.type === "dodge") {
      newO[oIdx].dodgeActive = true; newO[oIdx].dodgeCooldown = 3;
      newLog.push(`💨 ${oppCard.name} né!`);
    } else if (move.effect?.type === "shield") {
      newO[oIdx].shieldActive = true;
      newO[oIdx].shieldValue = move.effect.value;
      newO[oIdx].shieldTurns = move.effect.duration || 2;
      newLog.push(`🛡️ ${oppCard.name} tạo khiên ${move.effect.value}!`);
    } else if (move.effect?.type === "def_down") {
      newP[pIdx].defDownStacks = (newP[pIdx].defDownStacks || 0) + Math.floor(move.effect.value / 5);
      newLog.push(`🛡️ ${newP[pIdx]?.name} DEF giảm!`);
    } else if (move.effect?.type === "stun") {
      newP[pIdx].stunned = move.effect.value || 1;
      newLog.push(`⚡ ${newP[pIdx]?.name} bị choáng!`);
    } else if (move.effect?.type === "poison") {
      newP[pIdx].poisonStacks = (newP[pIdx].poisonStacks || 0) + (move.effect.value || 1);
      newLog.push(`☠️ ${newP[pIdx]?.name} bị nhiễm độc!`);
    } else if (move.effect?.type === "burn") {
      newP[pIdx].burnStacks = (newP[pIdx].burnStacks || 0) + (move.effect.value || 1);
      newLog.push(`🔥 ${newP[pIdx]?.name} bị cháy!`);
    } else if (move.type === "tackle" || move.type === "skill" || move.type === "ultimate") {
      const effAtk = Math.floor(newO[oIdx].atk * (1 + newO[oIdx].atkBuff * 0.02));
      const { dmg, isCrit, notes } = calcDmg({ ...newO[oIdx], atk: effAtk }, newP[pIdx], move.power, false);
      newP[pIdx].hp -= dmg;
      turnDmg += dmg;
      let msg = `👹 ${oppCard.name} → ${newP[pIdx]?.name}: ${dmg} sát thương!`;
      if (isCrit) msg += " 💥";
      const extraNotes = notes.filter(n => !["Chí mạng!", "Né!", "Trượt!"].includes(n));
      if (extraNotes.length > 0) msg += " " + extraNotes.join(" ");
      newLog.push(msg);
    }
    }

    if (move.energyCost > 0) newO[oIdx].energy -= move.energyCost;
    newO[oIdx].energy = Math.min(newO[oIdx].maxEnergy, newO[oIdx].energy + 8);

    // Check player card dead
    if (newP[pIdx].hp <= 0) {
      newP[pIdx].hp = 0; newP[pIdx].isAlive = false;
      newLog.push(`💀 ${newP[pIdx]?.name} bị loại!`);
      // Find next alive player card
      const nextP = newP.findIndex((c, i) => i > pIdx && c.isAlive);
      if (nextP >= 0) {
        pIdx = nextP; setCurrentPlayerIdx(nextP);
      } else {
        // Opponent wins!
        setPlayerTeam(newP); setOpponentTeam(newO); setBattleLog(newLog);
        setTurn("idle");
        handlePvPEnd(false, newP, newO, turnCount);
        return;
      }
    }

    // Update cooldowns
    newO.forEach(c => {
      if (c.dodgeCooldown > 0) { c.dodgeCooldown--; if (c.dodgeCooldown === 0) c.dodgeActive = false; }
      if (c.shieldTurns > 0) { c.shieldTurns--; if (c.shieldTurns === 0) { c.shieldActive = false; c.shieldValue = 0; } }
      if (c.stunned > 0) c.stunned--;
      if (c.defDownStacks > 0) c.defDownStacks--;
    });
    newP.forEach(c => {
      if (c.dodgeCooldown > 0) { c.dodgeCooldown--; if (c.dodgeCooldown === 0) c.dodgeActive = false; }
      if (c.shieldTurns > 0) { c.shieldTurns--; if (c.shieldTurns === 0) { c.shieldActive = false; c.shieldValue = 0; } }
      if (c.stunned > 0) c.stunned--;
      if (c.defDownStacks > 0) c.defDownStacks--;
    });

    setPlayerTeam(newP); setOpponentTeam(newO); setBattleLog(newLog);
    setTurnCount(t => t + 1);
    setTurn("idle");
    setIsPlayerTurn(true);
  }, [rivalEnraged, turnCount]);

  const executePlayerMove = useCallback(() => {
    if (!selectedMove || !currentPlayerCard) return;
    const move = selectedMove;
    setSelectedMove(null);

    const newP = [...playerTeam];
    const newO = [...opponentTeam];
    const pIdx = currentPlayerIdx;
    let oIdx = currentOpponentIdx;
    let newLog = [...battleLog];

    // Status ticks
    if (newP[pIdx].poisonStacks > 0) {
      const pd = Math.floor(newP[pIdx].maxHp * 0.04 * newP[pIdx].poisonStacks);
      newP[pIdx].hp -= pd; newLog.push(`☠️ ${newP[pIdx].name} nhận ${pd} độc!`);
    }
    if (newP[pIdx].burnStacks > 0) {
      const bd = Math.floor(newP[pIdx].maxHp * 0.03 * newP[pIdx].burnStacks);
      newP[pIdx].hp -= bd; newLog.push(`🔥 ${newP[pIdx].name} nhận ${bd} cháy!`);
    }
    if (newP[pIdx].regenStacks > 0) {
      const rd = Math.floor(newP[pIdx].maxHp * 0.04 * newP[pIdx].regenStacks);
      newP[pIdx].hp = Math.min(newP[pIdx].maxHp, newP[pIdx].hp + rd);
      newLog.push(`💚 ${newP[pIdx].name} hồi ${rd} HP!`);
    }

    // Apply move
    if (move.type === "dodge") {
      newP[pIdx].dodgeActive = true; newP[pIdx].dodgeCooldown = 3;
      newLog.push(`💨 ${currentPlayerCard.name} né!`);
    } else if (move.effect?.type === "shield") {
      newP[pIdx].shieldActive = true;
      newP[pIdx].shieldValue = move.effect.value;
      newP[pIdx].shieldTurns = move.effect.duration || 2;
      newLog.push(`🛡️ ${currentPlayerCard.name} tạo khiên ${move.effect.value}!`);
    } else if (move.effect?.type === "heal") {
      newP[pIdx].hp = Math.min(newP[pIdx].maxHp, newP[pIdx].hp + move.effect.value);
      newLog.push(`💚 ${currentPlayerCard.name} hồi ${move.effect.value} HP!`);
    } else if (move.effect?.type === "regen") {
      newP[pIdx].regenStacks = (newP[pIdx].regenStacks || 0) + (move.effect.value || 1);
      newLog.push(`💚 ${currentPlayerCard.name} có hồi máu!`);
    } else if (move.effect?.type === "def_down") {
      newO[oIdx].defDownStacks = (newO[oIdx].defDownStacks || 0) + Math.floor(move.effect.value / 5);
      newLog.push(`🛡️ ${newO[oIdx].name} DEF giảm!`);
    } else if (move.effect?.type === "stun") {
      newO[oIdx].stunned = move.effect.value || 1;
      newLog.push(`⚡ ${newO[oIdx].name} bị choáng!`);
    } else if (move.effect?.type === "poison") {
      newO[oIdx].poisonStacks = (newO[oIdx].poisonStacks || 0) + (move.effect.value || 1);
      newLog.push(`☠️ ${newO[oIdx].name} bị nhiễm độc!`);
    } else if (move.effect?.type === "burn") {
      newO[oIdx].burnStacks = (newO[oIdx].burnStacks || 0) + (move.effect.value || 1);
      newLog.push(`🔥 ${newO[oIdx].name} bị cháy!`);
    } else if (move.type === "tackle" || move.type === "skill" || move.type === "ultimate") {
      const effAtk = Math.floor(newP[pIdx].atk * (1 + newP[pIdx].atkBuff * 0.02));
      const { dmg, isCrit, notes } = calcDmg({ ...newP[pIdx], atk: effAtk }, newO[oIdx], move.power, true);
      newO[oIdx].hp -= dmg;
      newP[pIdx].totalDamage += dmg;
      let msg = `⚔️ ${currentPlayerCard.name} → ${newO[oIdx].name}: ${dmg} sát thương!`;
      if (isCrit) msg += " 💥";
      const extraNotes = notes.filter(n => !["Chí mạng!", "Né!", "Trượt!"].includes(n));
      if (extraNotes.length > 0) msg += " " + extraNotes.join(" ");
      newLog.push(msg);
    }

    if (move.energyCost > 0) newP[pIdx].energy -= move.energyCost;
    newP[pIdx].energy = Math.min(newP[pIdx].maxEnergy, newP[pIdx].energy + 8);

    // Check opponent card dead
    if (newO[oIdx].hp <= 0) {
      newO[oIdx].hp = 0; newO[oIdx].isAlive = false;
      newLog.push(`💀 ${newO[oIdx].name} bị loại!`);
      // Find next alive
      const nextO = newO.findIndex((c, i) => i > oIdx && c.isAlive);
      if (nextO >= 0) oIdx = nextO;
      else {
        // Player wins!
        setPlayerTeam(newP); setOpponentTeam(newO); setBattleLog(newLog);
        setTurn("idle");
        handlePvPEnd(true, newP, newO, turnCount);
        return;
      }
    }

    // Update cooldowns
    newP.forEach(c => {
      if (c.dodgeCooldown > 0) { c.dodgeCooldown--; if (c.dodgeCooldown === 0) c.dodgeActive = false; }
      if (c.shieldTurns > 0) { c.shieldTurns--; if (c.shieldTurns === 0) { c.shieldActive = false; c.shieldValue = 0; } }
      if (c.stunned > 0) c.stunned--;
      if (c.defDownStacks > 0) c.defDownStacks--;
    });

    setPlayerTeam(newP); setOpponentTeam(newO); setBattleLog(newLog);
    setCurrentOpponentIdx(oIdx);
    setIsPlayerTurn(false);
    setTurn("opponent_turn");
    const rivalHp = newO[oIdx]?.hp ?? 0;
    const rivalMaxHp = newO[oIdx]?.maxHp ?? 1;
    const tc = RIVAL_TIERS.find(t => t.tier === rivalProfile.tier) || RIVAL_TIERS[0];
    setTimeout(() => executeOpponentMove(newP, newO, pIdx, oIdx, newLog, rivalProfile.style, rivalHp, rivalMaxHp, tc.enrageThreshold, tc.enrageAtkBoost), 800);
  }, [selectedMove, currentPlayerCard, playerTeam, opponentTeam, currentPlayerIdx, currentOpponentIdx, battleLog, rivalProfile, executeOpponentMove]);

  const handlePvPEnd = (playerWon: boolean, finalP?: BattleCard[], finalO?: BattleCard[], round?: number) => {
    const tierConfig = RIVAL_TIERS.find(t => t.tier === rivalProfile.tier) || RIVAL_TIERS[0];
    const reward = playerWon ? tierConfig.rewardBase : -20;
    const xpGained = playerWon ? tierConfig.xpBase : 0;
    const rivalName = rivalProfile.name;

    // Update rank streak
    if (playerWon) {
      const newStreak = rankStreak + 1;
      setRankStreak(newStreak);
      // Advance rank every 3 consecutive wins
      const tierOrder: RivalTier[] = ["bronze", "silver", "gold", "diamond"];
      const currentIdx = tierOrder.indexOf(playerRank);
      if (newStreak >= 3 && currentIdx < tierOrder.length - 1) {
        const nextTier = tierOrder[currentIdx + 1];
        setPlayerRank(nextTier);
        setRankStreak(0);
      }
    } else {
      setRankStreak(0);
    }

    setBattleResult({ won: playerWon, reward, opponentName: rivalName });
    setRoundHistory(prev => [...prev, {
      round: (round ?? turnCount) + 1,
      winner: playerWon ? "player" : "opponent",
      playerDmg: (finalP ?? playerTeam).reduce((s, c) => s + c.totalDamage, 0),
      oppDmg: (finalO ?? opponentTeam).reduce((s, c) => s + c.totalDamage, 0),
    }]);
    setStage("result");
    if (onBattle) onBattle(playerWon, xpGained);
  };

  // Trigger player move execution
  useEffect(() => {
    if (turn === "animating" && selectedMove === null) {
      executePlayerMove();
    }
  }, [turn, selectedMove, executePlayerMove]);

  // Auto-switch to next alive player card
  useEffect(() => {
    if (stage === "battling" && turn === "idle") {
      const aliveIdx = playerTeam.findIndex(c => c.isAlive);
      if (aliveIdx >= 0 && aliveIdx !== currentPlayerIdx) setCurrentPlayerIdx(aliveIdx);
    }
  }, [playerTeam, stage, turn, currentPlayerIdx]);

  // ─── UI ──────────────────────────────────────────────────
  const stageBg = stage === "result" && battleResult?.won
    ? "from-amber-400 to-orange-500"
    : "from-red-500 via-orange-500 to-red-600";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="h-full w-full max-w-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className={`px-4 py-3 flex items-center justify-between bg-gradient-to-r ${stageBg}`}>
          <div className="flex items-center gap-2">
            {stage !== "idle" && stage !== "team_select" && (
              <button onClick={() => stage === "battling" ? null : setStage("idle")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30">
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="font-black text-white">PvP Arena</h2>
              <p className="text-[10px] font-bold text-white/60">Đấu trường 1v1 · Thẻ bài đối kháng</p>
            </div>
          </div>
          {stage === "battling" && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white">Hiệp {turnCount}</span>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30">
                <X size={16} />
              </button>
            </div>
          )}
          {stage !== "battling" && (
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="bg-slate-900 min-h-[calc(100%-56px)] p-4 space-y-4">

          {/* ── IDLE ── */}
          {stage === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-900/50">
                  <Swords size={32} className="text-red-400" />
                </div>
                <div className="mb-2 flex items-center justify-center gap-2">
                  <h3 className="text-2xl font-black text-white">PvP Arena</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-black ${playerRank === "diamond" ? "bg-cyan-500/20 text-cyan-300" : playerRank === "gold" ? "bg-amber-500/20 text-amber-300" : playerRank === "silver" ? "bg-slate-400/20 text-slate-300" : "bg-orange-700/30 text-orange-400"}`}>
                    {RIVAL_TIERS.find(t => t.tier === playerRank)?.label || "Bronze"}
                  </span>
                </div>
                {rankStreak > 0 && (
                  <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-400">
                    🔥 Chuỗi thắng: {rankStreak}/3
                  </div>
                )}
                <p className="text-sm text-slate-400">Đấu thẻ bài 1v1 với người chơi khác</p>
                <p className="mt-1 text-xs text-slate-600">Thắng 3 trận liên tiếp để thăng hạng</p>
              </div>

              <div className="mb-6 space-y-2">
                {[
                  ["🃏", "Chọn 3 thẻ bài mạnh nhất"],
                  ["⚔️", "Đấu theo lượt: chọn kỹ năng và đòn đánh"],
                  ["💥", "Chiến thuật: né, phòng thủ, kỹ năng đặc biệt"],
                  ["🏆", "Thắng: +50 EXP · Thua: -20 EXP"],
                  ["⚡", "Thẻ bị loại → chuyển thẻ tiếp theo"],
                ].map(([icon, text]) => (
                  <div key={text} className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-300">
                    <span className="text-xl">{icon}</span> {text}
                  </div>
                ))}
              </div>

              <Button onClick={handleFindMatch} size="lg" className="w-full gap-2" variant="primary">
                <Swords size={18} /> Tìm trận đấu
              </Button>
            </motion.div>
          )}

          {/* ── TEAM SELECT ── */}
          {stage === "team_select" && (
            <motion.div key="team_select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-4 text-center">
                <h3 className="text-lg font-black text-white">Chọn Đội Hình</h3>
                <p className="text-sm text-slate-400">Chọn 3 thẻ bài để chiến đấu</p>
                <p className="text-sm font-black text-amber-400 mt-1">{selectedTeam.length}/3 đã chọn</p>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {selectableCards.map(cardId => {
                  const card = getCardById(cardId);
                  const isSel = selectedTeam.includes(cardId);
                  return (
                    <button
                      key={cardId}
                      onClick={() => toggleCard(cardId)}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${isSel ? "border-amber-400 bg-amber-950/30" : "border-slate-700 bg-slate-800 hover:border-slate-600"}`}
                    >
                      <span className="text-2xl">{getElementIcon(card?.elementId || "hazard")}</span>
                      <p className="text-[9px] font-bold text-slate-300 mt-1">{card?.name || `#${cardId}`}</p>
                      <p className="text-[8px] text-slate-500">ATK {card?.atk} · HP {card?.hp}</p>
                      {isSel && <div className="mt-1 text-xs">✓</div>}
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={handleStartPvP}
                disabled={selectedTeam.length !== 3}
                size="lg" className="w-full gap-2" variant="primary"
              >
                <Swords size={18} /> Chiến đấu!
              </Button>
            </motion.div>
          )}

          {/* ── BATTLING ── */}
          {stage === "battling" && currentPlayerCard && currentOppCard && (
            <motion.div key="battling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Battle header */}
              <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-3">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">{currentUserNick}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${playerRank === "diamond" ? "bg-cyan-500/20 text-cyan-300" : playerRank === "gold" ? "bg-amber-500/20 text-amber-300" : playerRank === "silver" ? "bg-slate-400/20 text-slate-300" : "bg-orange-700/30 text-orange-400"}`}>{RIVAL_TIERS.find(t => t.tier === playerRank)?.label || "Bronze"}</span>
                  {rankStreak > 0 && <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300">🔥{rankStreak}/3</span>}
                  <span className="text-xs text-slate-500">· {playerTeam.filter(c => c.isAlive).length}/3</span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-slate-500">VS</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{opponentTeam.filter(c => c.isAlive).length}/3 ·</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${rivalProfile.tier === "diamond" ? "bg-cyan-500/20 text-cyan-300" : rivalProfile.tier === "gold" ? "bg-amber-500/20 text-amber-300" : rivalProfile.tier === "silver" ? "bg-slate-400/20 text-slate-300" : "bg-orange-700/30 text-orange-400"}`}>{RIVAL_TIERS.find(t => t.tier === rivalProfile.tier)?.label || "Bronze"}</span>
                  <Target size={16} className={rivalEnraged ? "text-amber-400 animate-pulse" : "text-red-400"} />
                  <span className={`text-sm font-bold ${rivalEnraged ? "text-amber-400" : "text-red-400"}`}>{rivalProfile.name}{rivalEnraged && " ⚡"}</span>
                </div>
              </div>

              {/* Opponent card */}
              <div className="rounded-xl border border-red-800 bg-red-950/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-900/60 text-lg">
                      {getElementIcon(currentOppCard.elementId)}
                    </div>
                    <div>
                      <p className="font-black text-red-300">{currentOppCard.name}</p>
                      <p className="text-[9px] font-bold text-red-500">{RIVAL_TIERS.find(t => t.tier === rivalProfile.tier)?.label || "Bronze"} · LV{currentOppCard.level}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-red-300">{Math.max(0, currentOppCard.hp)}/{currentOppCard.maxHp}</p>
                    <p className="text-[9px] font-bold text-red-500">HP</p>
                  </div>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-red-900/60">
                  <motion.div
                    animate={{ width: `${Math.max(0, (currentOppCard.hp / currentOppCard.maxHp) * 100)}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500"
                  />
                </div>
                <div className="mt-1 flex gap-2">
                  {currentOppCard.poisonStacks > 0 && <span className="text-[10px] text-green-400">☠️x{currentOppCard.poisonStacks}</span>}
                  {currentOppCard.burnStacks > 0 && <span className="text-[10px] text-orange-400">🔥x{currentOppCard.burnStacks}</span>}
                  {currentOppCard.shieldActive && <span className="text-[10px] text-blue-400">🛡️{currentOppCard.shieldValue}</span>}
                  {currentOppCard.stunned > 0 && <span className="text-[10px] text-yellow-400">⚡stun</span>}
                </div>
              </div>

              {/* Player card */}
              <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-900/60 text-lg">
                      {getElementIcon(currentPlayerCard.elementId)}
                    </div>
                    <div>
                      <p className="font-black text-emerald-300">{currentPlayerCard.name}</p>
                      <p className="text-[9px] font-bold text-emerald-500">LV{currentPlayerCard.level}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-300">{Math.max(0, currentPlayerCard.hp)}/{currentPlayerCard.maxHp}</p>
                    <p className="text-[9px] font-bold text-emerald-500">HP</p>
                  </div>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-900/60">
                  <motion.div
                    animate={{ width: `${Math.max(0, (currentPlayerCard.hp / currentPlayerCard.maxHp) * 100)}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400"
                  />
                </div>
                <div className="mt-1 flex gap-2 text-[10px] text-slate-400">
                  <span>⚡{currentPlayerCard.energy}</span>
                  <span>ATK {currentPlayerCard.atk}</span>
                  <span>DEF {currentPlayerCard.def}</span>
                  <span>CRT {currentPlayerCard.crt}%</span>
                  {currentPlayerCard.poisonStacks > 0 && <span className="text-green-400">☠️x{currentPlayerCard.poisonStacks}</span>}
                  {currentPlayerCard.burnStacks > 0 && <span className="text-orange-400">🔥x{currentPlayerCard.burnStacks}</span>}
                  {currentPlayerCard.shieldActive && <span className="text-blue-400">🛡️{currentPlayerCard.shieldValue}</span>}
                  {currentPlayerCard.stunned > 0 && <span className="text-yellow-400">⚡stun</span>}
                </div>
              </div>

              {/* Team strip */}
              <div className="flex gap-2 overflow-x-auto">
                {playerTeam.map((card, i) => (
                  <div
                    key={card.id}
                    className={`relative flex-shrink-0 rounded-xl border-2 p-2.5 text-center ${i === currentPlayerIdx ? "border-emerald-400 bg-emerald-950/30" : card.isAlive ? "border-slate-700 bg-slate-800" : "border-slate-800 bg-slate-900 opacity-40"}`}
                  >
                    <p className="text-lg">{getElementIcon(card.elementId)}</p>
                    <p className="text-[9px] font-bold text-slate-300 truncate w-14">{card.name.slice(0, 8)}</p>
                    <p className="text-[10px] font-black text-red-400">{Math.max(0, card.hp)}/{card.maxHp}</p>
                    {!card.isAlive && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60"><span className="text-lg">💀</span></div>}
                  </div>
                ))}
              </div>

              {/* Move buttons */}
              <div className="grid grid-cols-2 gap-2">
                {currentPlayerCard.moves.map(move => {
                  const canAfford = move.energyCost <= currentPlayerCard.energy;
                  const onCd = move.currentCooldown > 0;
                  const stunned = currentPlayerCard.stunned > 0;
                  const disabled = !canAfford || onCd || stunned || turn !== "idle" || !isPlayerTurn;
                  return (
                    <button
                      key={move.id}
                      onClick={() => !disabled && selectMove(move)}
                      disabled={disabled}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all ${disabled ? "border-slate-700 bg-slate-800/50 text-slate-600" : "border-slate-600 bg-slate-800 text-slate-200 hover:border-emerald-500 hover:bg-slate-700 active:scale-95"}`}
                    >
                      <span className="text-xl">{move.icon}</span>
                      <span className="text-xs font-bold">{move.name}</span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {move.energyCost > 0 ? `${move.energyCost}⚡` : "0⚡"}{onCd ? ` · CD:${move.currentCooldown}` : ""}
                      </span>
                      {move.power > 0 && <span className="text-[10px] font-black text-amber-400">{move.power} DMG</span>}
                    </button>
                  );
                })}
              </div>

              {/* Battle log */}
              <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-0.5">
                {battleLog.slice(-8).map((entry, i) => (
                  <p key={i} className="text-xs text-slate-400">{entry}</p>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── RESULT ── */}
          {stage === "result" && battleResult && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
              {battleResult.won ? (
                <>
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30"
                  >
                    <Trophy size={40} className="text-white" />
                  </motion.div>
                  <h3 className="mb-2 text-3xl font-black text-amber-400">Chiến Thắng!</h3>
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${rivalProfile.tier === "diamond" ? "bg-cyan-500/20 text-cyan-300" : rivalProfile.tier === "gold" ? "bg-amber-500/20 text-amber-300" : "bg-slate-500/20 text-slate-300"}`}>
                      {RIVAL_TIERS.find(t => t.tier === rivalProfile.tier)?.label || "Bronze"}
                    </span>
                    <span className="text-sm text-slate-400">{rivalProfile.name}</span>
                  </div>
                  {rankStreak >= 0 && (
                    <p className="mb-4 text-xs text-slate-500">
                      Chuỗi thắng: <span className="font-black text-amber-400">🔥 {rankStreak}/3</span>
                      {rankStreak >= 2 ? " · Thăng hạng sắp tới!" : ""}
                    </p>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mx-auto mb-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-950/40 px-6 py-3 font-black text-2xl text-emerald-400"
                  >
                    <Zap size={24} className="fill-current" />
                    +{battleResult.reward} EXP
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800"
                  >
                    <Skull size={40} className="text-slate-500" />
                  </motion.div>
                  <h3 className="mb-2 text-3xl font-black text-slate-400">Thất Bại</h3>
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${rivalProfile.tier === "diamond" ? "bg-cyan-500/20 text-cyan-300" : rivalProfile.tier === "gold" ? "bg-amber-500/20 text-amber-300" : "bg-slate-500/20 text-slate-300"}`}>
                      {RIVAL_TIERS.find(t => t.tier === rivalProfile.tier)?.label || "Bronze"}
                    </span>
                    <span className="text-sm text-slate-500">{rivalProfile.name} đã chiến thắng</span>
                  </div>
                  <p className="mb-4 text-xs text-slate-600">Chuỗi thắng bị reset · Thử lại!</p>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mx-auto mb-6 inline-flex items-center gap-2 rounded-2xl bg-red-950/40 px-6 py-3 font-black text-2xl text-red-400"
                  >
                    {battleResult.reward} EXP
                  </motion.div>
                </>
              )}

              {/* Stats */}
              <div className="mb-6 grid grid-cols-2 gap-2 text-center">
                {[
                  ["Sát thương", playerTeam.reduce((s, c) => s + c.totalDamage, 0), "text-amber-400"],
                  ["Thẻ còn sống", playerTeam.filter(c => c.isAlive).length, "text-emerald-400"],
                  ["Thẻ bị loại", playerTeam.filter(c => !c.isAlive).length, "text-red-400"],
                  ["Số hiệp", turnCount, "text-blue-400"],
                ].map(([label, val, color]) => (
                  <div key={label as string} className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <p className={`text-xl font-black ${color}`}>{val}</p>
                    <p className="text-[9px] font-bold text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStage("idle")} variant="secondary" className="flex-1 gap-1">
                  <ArrowLeft size={16} /> Quay về
                </Button>
                <Button onClick={onClose} variant="primary" className="flex-1 gap-1">
                  <Trophy size={16} /> Nhận thưởng
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
