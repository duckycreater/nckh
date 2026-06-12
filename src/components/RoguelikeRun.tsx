import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Zap, Trophy, ArrowLeft, Play, Sparkles, RotateCcw, Star, Shield, Heart,
  Skull, Target, X, Plus, ChevronRight, CheckCircle, Flame, Gem,
  Brain, Award, Coins, ShoppingBag, Crown, Skull as Skull2, RefreshCw, Lock,
} from "lucide-react";
import {
  getCardById, getElementIcon, ALL_ABILITIES, RARITIES,
} from "../lib/cards";
import { Button } from "../lib/ui";
import type { CardDef } from "../lib/cards";

// ═══════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const FLOOR_COUNT = 5;

const FLOOR_NAMES = [
  "Vùng Đất Rác Thiếc",
  "Đầm Lầy Nhựa Độc",
  "Núi Chế Phẩm Hữu Cơ",
  "Rừng Kim Loại Gỉ",
  "Lõi Lò Đốt Rác",
];

// Boss difficulty curve — much more aggressive
const BOSS_HP_MULTS = [1.0, 1.6, 2.5, 3.8, 5.5];
const BOSS_ATK_MULTS = [0.8, 1.1, 1.6, 2.2, 3.0];
const BOSS_DEF_MULTS = [0.0, 0.2, 0.5, 0.8, 1.2];

// Boss pool with unique abilities per boss
const BOSS_POOL = [
  { id: 101, name: "Túi Nilon Cổ Đại", element: "plastic", moves: ["poison_cloud", "grab", "endure", "plastic_surge"] },
  { id: 102, name: "Lon Bia Sắt Gỉ", element: "metal", moves: ["iron_bash", "rust_spray", "metal_clang", "metal_fury"] },
  { id: 201, name: "Pin Chết Đầu Độc", element: "hazard", moves: ["zap", "toxic_aura", "deadly_charge", "overload"] },
  { id: 202, name: "Hộp Xốp Khổng Lồ", element: "organic", moves: ["absorb", "grow", "spore_burst", "overgrow"] },
  { id: 151, name: "Bình Thuốc Trừ Sâu", element: "hazard", moves: ["spray", "corrode", "toxic_wave", "pesticide"] },
  { id: 251, name: "Mảnh Kính Vỡ", element: "glass", moves: ["cut", "shard_shield", "reflect", "shatter"] },
  { id: 301, name: "Lõi Pin Lithium", element: "hazard", moves: ["spark", "chain_lightning", "energy_drain", "explode"] },
  { id: 302, name: "Vỏ Hộp Sắt Nặng", element: "metal", moves: ["crush", "dent", "rust_cloud", "collapse"] },
];

// Boss abilities (unique per boss)
const BOSS_ABILITIES: Record<string, { name: string; desc: string; power: number; effect?: { type: string; value: number; duration?: number }; telegraph?: string; enrageOnly?: boolean }> = {
  // Plastic bosses
  poison_cloud:   { name: "Mây Độc",     desc: "Gây +poison 3 lượt",      power: 40, effect: { type: "poison", value: 3, duration: 3 } },
  grab:            { name: "Xiết Chặt",    desc: "Sát thương + giảm tốc",  power: 60, effect: { type: "speed_down", value: 20, duration: 2 } },
  endure:          { name: "Chịu Đựng",    desc: "Tạo khiên lớn",           power: 0, effect: { type: "shield", value: 80, duration: 3 }, telegraph: "Chuẩn bị tạo khiên lớn!" },
  plastic_surge:    { name: "Bùng Nổ Nhựa", desc: "Sát thương cao nhất",     power: 120, telegraph: "CẨN THẬN! Sắp tung chiêu mạnh!" },
  // Metal bosses
  iron_bash:       { name: "Đập Sắt",     desc: "Sát thương cứng",         power: 70 },
  rust_spray:       { name: "Phun Gỉ",      desc: "Gây sát thương + giảm def", power: 50, effect: { type: "def_down", value: 15, duration: 2 } },
  metal_clang:      { name: "Tiếng Sắt",    desc: "Stun 1 lượt",             power: 45, effect: { type: "stun", value: 1, duration: 1 } },
  metal_fury:       { name: "Cuồng Sắt",    desc: "3 đòn liên tiếp!",        power: 40, telegraph: "Sắp tấn công liên tục!", enrageOnly: true },
  // Hazard bosses
  zap:             { name: "Phóng Điện",   desc: "Sát thương điện",         power: 65 },
  toxic_aura:       { name: "Hào Quang Độc",  desc: "Gây burn 3 lượt",        power: 30, effect: { type: "burn", value: 3, duration: 3 } },
  deadly_charge:    { name: "Xung Kích",    desc: "Sát thương rất cao",       power: 100, telegraph: "Đang tích sức tấn công!" },
  overload:        { name: "Quá Tải",      desc: "Nổ điện, sát thương khắp", power: 80, enrageOnly: true },
  // Organic bosses
  absorb:          { name: "Hấp Thụ",     desc: "Hồi HP + gây sát thương", power: 30, effect: { type: "heal", value: 40 } },
  grow:            { name: "Phát Triển",   desc: "Tăng ATK permanently",      power: 0, effect: { type: "buff_atk", value: 20, duration: 99 } },
  spore_burst:     { name: "Bùng Nổ Bào Tử", desc: "Toàn bộ team -HP",   power: 35, effect: { type: "poison", value: 2, duration: 2 } },
  overgrow:        { name: "Bùng Phá",     desc: "Sát thương khổng lồ",    power: 130, telegraph: "Sinh trưởng thành sức mạnh!", enrageOnly: true },
  // Glass bosses
  cut:             { name: "Cắt Lát",      desc: "Sát thương cắt",          power: 55 },
  shard_shield:     { name: "Khiên Mảnh",   desc: "Tạo khiên",              power: 0, effect: { type: "shield", value: 60, duration: 3 }, telegraph: "Chuẩn bị khiên mảnh!" },
  reflect:         { name: "Phản Chiếu",    desc: "Phản 30% sát thương",    power: 0, effect: { type: "reflect", value: 30, duration: 2 } },
  shatter:         { name: "Vỡ Tan",        desc: "Sát thương phá hủy",       power: 110, telegraph: "Sắp phá hủy!", enrageOnly: true },
};

// Elite enemies (for elite encounters)
const ELITE_POOL = [
  { id: 9991, name: "Rác Sừng Sắt", element: "metal", hpMult: 1.5, atkMult: 1.3, moves: ["iron_bash", "rust_spray", "crush"] },
  { id: 9992, name: "Nilon Khổng Lồ", element: "plastic", hpMult: 1.4, atkMult: 1.2, moves: ["poison_cloud", "grab", "plastic_surge"] },
  { id: 9993, name: "Pin Cụ Sống", element: "hazard", hpMult: 1.6, atkMult: 1.4, moves: ["zap", "toxic_aura", "overload"] },
];

// Shop items
const SHOP_ITEMS = [
  { id: "hp_potion",  name: "Thuốc Trị Thương",    desc: "Hồi 50 HP team",         cost: 30, icon: Heart,    color: "text-red-500", action: "heal_team" },
  { id: "atk_up",     name: "Thực Phẩm Sức Mạnh",   desc: "+15% ATK permanent",     cost: 50, icon: Zap,      color: "text-amber-500", action: "atk_all" },
  { id: "hp_up",      name: "Thuốc Tăng Sức Bền",   desc: "+20% HP permanent",    cost: 50, icon: Heart,    color: "text-emerald-500", action: "hp_all" },
  { id: "shield_all",  name: "Lá Chắn Quân",         desc: "+Shield 30 cho team",    cost: 40, icon: Shield,   color: "text-blue-500", action: "shield_all" },
  { id: "crt_up",     name: "Viên Đạn Bạo Kích",     desc: "+10% CRIT permanent",   cost: 60, icon: Star,     color: "text-purple-500", action: "crt_all" },
  { id: "revive",     name: "Hồi Sinh",              desc: "Hồi sinh 1 lá ngã",    cost: 80, icon: RotateCcw, color: "text-yellow-500", action: "revive" },
];

// Power-ups (permanent run buffs)
const POWER_UPS = [
  { id: "hp+",      name: "Sức Bền",   desc: "+20% HP tất cả thẻ", icon: Heart,   color: "text-red-500" },
  { id: "atk+",     name: "Sức Mạnh",  desc: "+15% ATK tất cả thẻ", icon: Zap,      color: "text-amber-500" },
  { id: "spd+",     name: "Tốc Độ",    desc: "+10 SPD tất cả thẻ", icon: Target,  color: "text-blue-500" },
  { id: "crt+",      name: "Bạo Kích",  desc: "+5% CRIT tất cả thẻ", icon: Star,     color: "text-purple-500" },
  { id: "heal",     name: "Hồi Máu",   desc: "Hồi 30 HP mỗi hiệp", icon: Shield,   color: "text-emerald-500" },
  { id: "poison_r",  name: "Kháng Độc",  desc: "Miễn nhiễm Poison",  icon: Skull,    color: "text-green-500" },
  { id: "burn_r",    name: "Kháng Cháy",  desc: "Miễn nhiễm Burn",    icon: Flame,    color: "text-orange-500" },
  { id: "strike+",  name: "Chiến Sĩ",   desc: "+1 năng lượng/hiệp", icon: Swords,   color: "text-cyan-500" },
];

type PowerUp = typeof POWER_UPS[number];
type ShopItem = typeof SHOP_ITEMS[number];

// Encounter types between floors
type EncounterType = "boss" | "elite" | "rest" | "shop" | "treasure" | "gamble";

interface EncounterDef {
  type: EncounterType;
  label: string;
  desc: string;
  icon: string;
  color: string;
}

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════

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

// ─── Battle card ────────────────────────────────────────────────
interface BattleCard {
  id: number; name: string; subtitle: string;
  elementId: string; rarityId: string;
  atk: number; hp: number; maxHp: number;
  def: number; spd: number; crt: number; int: number;
  level: number; isAlive: boolean;
  moves: BattleMove[];
  energy: number; maxEnergy: number;
  ultimateCharge: number; evasionChance: number;
  dodgeActive: boolean; dodgeCooldown: number;
  poisonStacks: number; shieldActive: boolean; shieldTurns: number; shieldValue: number;
  burnStacks: number; speedBoost: boolean; regenStacks: number;
  stunned: number; silenced: number; defDownStacks: number; spSpeedDown: number;
  atkBuff: number; poisonImmune: boolean; burnImmune: boolean;
  comboStreak: number; totalDamage: number; reflects: boolean;
}

interface BattleMove {
  id: string; name: string; desc: string; icon: string;
  type: "tackle" | "skill" | "ultimate" | "dodge";
  energyCost: number; cooldown: number; currentCooldown: number;
  power: number;
  effect?: { type: string; value: number; duration?: number };
  isBossMove?: boolean;
  isBoss?: boolean;
}

function generateMoves(elementId: string, atk: number, def: number, int: number, level: number): BattleMove[] {
  const skillPower = Math.floor(atk * (1.0 + level * 0.15));
  const ultPower = Math.floor(atk * (2.0 + level * 0.2));
  return [
    {
      id: "tackle", name: "Tấn Công", desc: "Đòn tấn công cơ bản", icon: "⚔️",
      type: "tackle", energyCost: 0, cooldown: 0, currentCooldown: 0,
      power: Math.floor(atk * (0.8 + level * 0.1)),
    },
    {
      id: "skill", name: "Kỹ Năng", desc: "Đòn tấn công mạnh", icon: "💥",
      type: "skill", energyCost: 20, cooldown: 2, currentCooldown: 0,
      power: skillPower,
      effect: { type: "damage", value: skillPower },
    },
    {
      id: "defend", name: "Phòng Thủ", desc: "Tăng khiên chắn", icon: "🛡️",
      type: "skill", energyCost: 15, cooldown: 2, currentCooldown: 0,
      power: 0,
      effect: { type: "shield", value: Math.floor(def * 2.5 + level * 10), duration: 2 },
    },
    {
      id: "ultimate", name: "Chiêu Cuối", desc: "Sát thương cao nhất", icon: "🌟",
      type: "ultimate", energyCost: 60, cooldown: 0, currentCooldown: 0,
      power: ultPower,
    },
    {
      id: "dodge", name: "Né Tránh", desc: "Tăng khả năng né", icon: "💨",
      type: "dodge", energyCost: 12, cooldown: 3, currentCooldown: 0,
      power: 0,
      effect: { type: "dodge", value: 40, duration: 1 },
    },
  ];
}

function buildCard(id: number, level = 1, hpMult = 1, atkMult = 1, defMult = 1): BattleCard {
  const base = getCardById(id);
  if (!base) return buildDummyCard(id);
  const hp = Math.floor(base.hp * (1 + (level - 1) * 0.15) * hpMult);
  const atk = Math.floor(base.atk * (1 + (level - 1) * 0.15) * atkMult);
  const def = Math.floor((base.def || 5) * (1 + (level - 1) * 0.10) * defMult);
  const spd = Math.floor((base.spd || 5) * (1 + (level - 1) * 0.05));
  const crt = Math.min(35, Math.floor((base.crt || 5) * (1 + (level - 1) * 0.03)));
  const evasion = Math.min(85, 55 + spd);
  return {
    id, name: base.name, subtitle: base.subtitle,
    elementId: base.elementId, rarityId: base.rarityId,
    atk, hp, maxHp: hp, def, spd, crt, int: Math.floor((base.int || 5) * (1 + (level - 1) * 0.05)),
    level, isAlive: true,
    moves: generateMoves(base.elementId, atk, def, base.int || 5, level),
    energy: 100, maxEnergy: 100, ultimateCharge: 0, evasionChance: evasion,
    dodgeActive: false, dodgeCooldown: 0, poisonStacks: 0,
    shieldActive: false, shieldTurns: 0, shieldValue: 0,
    burnStacks: 0, speedBoost: false, regenStacks: 0,
    stunned: 0, silenced: 0, defDownStacks: 0, spSpeedDown: 0,
    atkBuff: 0, poisonImmune: false, burnImmune: false,
    comboStreak: 0, totalDamage: 0, reflects: false,
  };
}

function buildDummyCard(id: number): BattleCard {
  return {
    id, name: `Boss #${id}`, subtitle: "",
    elementId: "hazard", rarityId: "epic",
    atk: 30, hp: 200, maxHp: 200, def: 5, spd: 5, crt: 5, int: 5,
    level: 1, isAlive: true,
    moves: [],
    energy: 100, maxEnergy: 100, ultimateCharge: 0, evasionChance: 50,
    dodgeActive: false, dodgeCooldown: 0, poisonStacks: 0,
    shieldActive: false, shieldTurns: 0, shieldValue: 0,
    burnStacks: 0, speedBoost: false, regenStacks: 0,
    stunned: 0, silenced: 0, defDownStacks: 0, spSpeedDown: 0,
    atkBuff: 0, poisonImmune: false, burnImmune: false,
    comboStreak: 0, totalDamage: 0, reflects: false,
  };
}

function buildBoss(bossData: typeof BOSS_POOL[number], floor: number): BattleCard {
  const hpMult = BOSS_HP_MULTS[floor - 1];
  const atkMult = BOSS_ATK_MULTS[floor - 1];
  const defMult = BOSS_DEF_MULTS[floor - 1];
  const boss = buildCard(bossData.id, floor, hpMult, atkMult, defMult);
  boss.name = bossData.name;
  boss.elementId = bossData.element;

  // Build boss moves from pool
  boss.moves = bossData.moves.map((moveId) => {
    const ab = BOSS_ABILITIES[moveId];
    const baseAtk = boss.atk;
    return {
      id: moveId,
      name: ab.name,
      desc: ab.desc,
      icon: "👹",
      type: "skill" as const,
      energyCost: 0,
      cooldown: 0,
      currentCooldown: 0,
      power: ab.power > 0 ? Math.floor(baseAtk * (ab.power / 100) + ab.power) : 0,
      effect: ab.effect,
      isBossMove: true,
      isBoss: true,
    };
  });

  // Add a basic attack as fallback
  boss.moves.push({
    id: "boss_tackle",
    name: "Cú Đấm",
    desc: "Cú đấm cơ bản",
    icon: "👊",
    type: "tackle",
    energyCost: 0,
    cooldown: 0,
    currentCooldown: 0,
    power: Math.floor(boss.atk * 0.7),
    isBossMove: true,
    isBoss: true,
  });

  boss.ultimateCharge = 0;
  return boss;
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
  comboMult = 1,
  isBoss = false,
): { dmg: number; isCrit: boolean; notes: string[]; deflected: boolean } {
  const notes: string[] = [];
  let dmg = basePower;

  // Dodge check
  if (defender.dodgeActive && !isBoss) {
    notes.push("Né!");
    return { dmg: 0, isCrit: false, notes, deflected: false };
  }

  // Evasion
  if (!isBoss && Math.random() * 100 < defender.evasionChance) {
    notes.push("Trượt!");
    return { dmg: 0, isCrit: false, notes, deflected: false };
  }

  // INT bonus
  const intMult = 1 + attacker.int * 0.02;
  dmg = Math.floor(dmg * intMult);

  // Combo mult
  dmg = Math.floor(dmg * comboMult);

  // Random variance
  dmg = Math.floor(dmg * (0.85 + Math.random() * 0.30));

  // Critical
  const isCrit = !isBoss && Math.random() * 100 < attacker.crt;
  if (isCrit) { dmg = Math.floor(dmg * 2); notes.push("Chí mạng!"); }

  // Element advantage
  const adv = getElementAdvantage(attacker.elementId, defender.elementId);
  if (adv) { dmg = Math.floor(dmg * adv.mult); notes.push(adv.label); }

  // Reflect
  if (defender.reflects) {
    const reflectDmg = Math.floor(dmg * 0.30);
    attacker.hp -= reflectDmg;
    notes.push(`Phản ${reflectDmg}!`);
  }

  // DEF reduction
  if (defender.defDownStacks > 0) {
    const defEffective = Math.max(0, defender.def - defender.defDownStacks * 3);
    dmg = Math.floor(dmg * (1 - defEffective * 0.004));
  } else {
    dmg = Math.floor(dmg * (1 - defender.def * 0.004));
  }

  // Shield
  let deflected = false;
  if (defender.shieldActive && dmg > 0) {
    const blocked = Math.min(defender.shieldValue, dmg);
    dmg = Math.max(0, dmg - blocked);
    defender.shieldValue -= blocked;
    notes.push(`Khiên chắn -${blocked}`);
    deflected = blocked > 0;
    if (defender.shieldValue <= 0) {
      defender.shieldActive = false;
      defender.shieldValue = 0;
    }
  }

  dmg = Math.max(1, dmg);
  return { dmg, isCrit, notes, deflected };
}

function generateEncounters(floor: number, isFirst: boolean): EncounterDef[] {
  const pool: EncounterDef[] = [];
  if (!isFirst) pool.push({ type: "boss", label: "Boss", desc: "Đấu với Boss", icon: "👹", color: "text-red-400" });
  if (floor < 3) pool.push({ type: "elite", label: "Elite", desc: "Đấu với Elite", icon: "⚔️", color: "text-orange-400" });
  pool.push({ type: "rest", label: "Nghỉ Ngơi", desc: "Hồi máu team", icon: "🏕️", color: "text-emerald-400" });
  if (floor > 1) pool.push({ type: "shop", label: "Cửa Hàng", desc: "Mua vật phẩm", icon: "🛒", color: "text-amber-400" });
  pool.push({ type: "treasure", label: "Kho Báu", desc: "Nhận bài ngẫu nhiên", icon: "💎", color: "text-purple-400" });
  if (floor > 2) pool.push({ type: "gamble", label: "Cờ Bạc", desc: "Đỏ đen", icon: "🎲", color: "text-cyan-400" });
  return shuffle(pool);
}

// ═══════════════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface Props {
  onClose: () => void;
  onReward: (pts: number) => void;
  userCards: number[];
  playerHp?: number;
  playerMaxHp?: number;
}

type RunStage = "intro" | "encounter_select" | "battle" | "shop" | "rest" | "elite_battle" | "reward" | "gameover" | "victory";

export function RoguelikeRun({ onClose, onReward, userCards, playerHp = 200, playerMaxHp = 200 }: Props) {
  // ─── State ────────────────────────────────────────────
  const [stage, setStage] = useState<RunStage>("intro");
  const [floor, setFloor] = useState(1);
  const [deck, setDeck] = useState<number[]>([]);
  const [powerUps, setPowerUps] = useState<string[]>([]);
  const [playerTeam, setPlayerTeam] = useState<BattleCard[]>([]);
  const [boss, setBoss] = useState<BattleCard | null>(null);
  const [elite, setElite] = useState<BattleCard | null>(null);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<"idle" | "animating" | "boss_turn">("idle");
  const [selectedMove, setSelectedMove] = useState<BattleMove | null>(null);
  const [rewardOptions, setRewardOptions] = useState<{ cards: number[]; powerUps: PowerUp[] } | null>(null);
  const [totalDamage, setTotalDamage] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [bossTelegraph, setBossTelegraph] = useState<string | null>(null);
  const [bossEnraged, setBossEnraged] = useState(false);
  const [shopCoins, setShopCoins] = useState(0);
  const [encounters, setEncounters] = useState<EncounterDef[]>([]);
  const [selectedEncounter, setSelectedEncounter] = useState<EncounterDef | null>(null);
  const [restHealAmount, setRestHealAmount] = useState(0);
  const [treasureCards, setTreasureCards] = useState<number[]>([]);
  const [gambleWin, setGambleWin] = useState<boolean | null>(null);
  const [runStats, setRunStats] = useState({ totalDamage: 0, maxCombo: 0, bossesDefeated: 0, elitesDefeated: 0 });

  // Player avatar HP (persists across encounters)
  const [runPlayerHp, setRunPlayerHp] = useState(playerHp);
  const [runPlayerMaxHp, setRunPlayerMaxHp] = useState(playerMaxHp);
  const [runPlayerShield, setRunPlayerShield] = useState(0);

  const currentPlayer = playerTeam[currentPlayerIdx];

  // ─── Apply power-ups to a card ─────────────────────────
  const applyPowerUps = useCallback((cards: BattleCard[]): BattleCard[] => {
    let result = [...cards];
    for (const pu of powerUps) {
      if (pu === "hp+") result = result.map(c => ({ ...c, hp: Math.floor(c.hp * 1.20), maxHp: Math.floor(c.maxHp * 1.20) }));
      if (pu === "atk+") result = result.map(c => ({ ...c, atk: Math.floor(c.atk * 1.15) }));
      if (pu === "spd+") result = result.map(c => ({ ...c, spd: c.spd + 10, evasionChance: Math.min(85, c.evasionChance + 10) }));
      if (pu === "crt+") result = result.map(c => ({ ...c, crt: Math.min(40, c.crt + 5) }));
      if (pu === "poison_r") result = result.map(c => ({ ...c, poisonImmune: true }));
      if (pu === "burn_r") result = result.map(c => ({ ...c, burnImmune: true }));
    }
    return result;
  }, [powerUps]);

  // ─── Deck building ─────────────────────────────────────
  const buildDeck = useCallback(() => {
    const pool = shuffle(userCards).slice(0, Math.min(20, userCards.length));
    return pool.slice(0, 5);
  }, [userCards]);

  // ─── Start run ────────────────────────────────────────
  const handleStart = () => {
    const selectedDeck = buildDeck();
    const cards = selectedDeck.map(id => buildCard(id, 1));
    const applied = applyPowerUps(cards);
    setDeck(selectedDeck);
    setPlayerTeam(applied);
    setFloor(1);
    setPowerUps([]);
    setTotalDamage(0);
    setMaxCombo(0);
    setRunStats({ totalDamage: 0, maxCombo: 0, bossesDefeated: 0, elitesDefeated: 0 });
    setRunPlayerHp(playerMaxHp);
    setRunPlayerMaxHp(playerMaxHp);
    setRunPlayerShield(0);
    generateNextEncounters(1);
    setStage("encounter_select");
  };

  function generateNextEncounters(f: number) {
    setEncounters(generateEncounters(f, false));
    setSelectedEncounter(null);
  }

  // ─── Encounter selection ────────────────────────────────
  const handleSelectEncounter = (enc: EncounterDef) => {
    setSelectedEncounter(enc);
    if (enc.type === "boss") {
      const bossData = pickRandom(BOSS_POOL);
      const bossCard = buildBoss(bossData, floor);
      bossCard.name = bossData.name;
      setBoss(bossCard);
      setBossEnraged(false);
      setBossTelegraph(null);
      setPlayerTeam(prev => prev.map(c => ({ ...c, energy: 100 })));
      setLog([`👹 ${bossData.name} xuất hiện!`]);
      setCurrentPlayerIdx(0);
      setTurnCount(0);
      setStage("battle");
    } else if (enc.type === "elite") {
      const eliteData = pickRandom(ELITE_POOL);
      const hpMult = BOSS_HP_MULTS[floor - 1] * eliteData.hpMult;
      const atkMult = BOSS_ATK_MULTS[floor - 1] * eliteData.atkMult;
      const eliteCard = buildCard(eliteData.id, floor, hpMult, atkMult);
      eliteCard.name = eliteData.name;
      eliteCard.elementId = eliteData.element;
      eliteCard.moves = eliteData.moves.map(mId => {
        const ab = BOSS_ABILITIES[mId] || { name: mId, desc: "", power: 40 };
        return {
          id: mId, name: ab.name, desc: ab.desc, icon: "⚔️",
          type: "skill" as const, energyCost: 0, cooldown: 0, currentCooldown: 0,
          power: Math.floor(eliteCard.atk * (ab.power / 100) + ab.power),
          effect: ab.effect, isBossMove: true, isBoss: true,
        };
      });
      setElite(eliteCard);
      setPlayerTeam(prev => prev.map(c => ({ ...c, energy: 100 })));
      setLog([`⚔️ ${eliteData.name} xuất hiện!`]);
      setCurrentPlayerIdx(0);
      setTurnCount(0);
      setStage("elite_battle");
    } else if (enc.type === "rest") {
      const heal = Math.floor(50 + floor * 10);
      setRestHealAmount(heal);
      const healed = playerTeam.map(c => ({ ...c, hp: Math.min(c.maxHp, c.hp + heal), poisonStacks: 0, burnStacks: 0 }));
      setPlayerTeam(healed);
      setLog(prev => [...prev, `🏕️ Nghỉ ngơi: +${heal} HP cho toàn team!`]);
      advanceFloor();
    } else if (enc.type === "shop") {
      const coins = 30 + floor * 10;
      setShopCoins(coins);
      setStage("shop");
    } else if (enc.type === "treasure") {
      const available = shuffle(userCards.filter(id => !deck.includes(id))).slice(0, 3);
      setTreasureCards(available);
      setStage("treasure");
    } else if (enc.type === "gamble") {
      const win = Math.random() < 0.5;
      setGambleWin(win);
      if (win) {
        const reward = floor * 30;
        setPlayerTeam(prev => prev.map(c => ({ ...c, hp: Math.min(c.maxHp, c.hp + reward) })));
        setLog(prev => [...prev, `🎲 Thắng! +${reward} HP!`]);
      } else {
        const dmg = floor * 15;
        const idx = playerTeam.findIndex(c => c.isAlive);
        if (idx >= 0) {
          setPlayerTeam(prev => prev.map((c, i) => i === idx ? { ...c, hp: Math.max(1, c.hp - dmg) } : c));
        }
        setLog(prev => [...prev, `🎲 Thua! -${dmg} HP!`]);
      }
      setTimeout(() => advanceFloor(), 1500);
    }
  };

  function advanceFloor() {
    const nextFloor = floor + 1;
    if (nextFloor > FLOOR_COUNT) {
      setStage("victory");
      return;
    }
    setFloor(nextFloor);
    generateNextEncounters(nextFloor);
    setStage("encounter_select");
  }

  // ─── Move execution ───────────────────────────────────
  const handleSelectMove = (move: BattleMove) => {
    if (turn !== "idle" || !currentPlayer?.isAlive || currentPlayer.stunned > 0) return;
    if (move.currentCooldown > 0) return;
    if (move.energyCost > currentPlayer.energy) return;
    setSelectedMove(move);
  };

  const executePlayerMove = useCallback(() => {
    if (!selectedMove || !currentPlayer || !boss) return;
    const move = selectedMove;
    setSelectedMove(null);
    setTurn("animating");

    const newTeam = [...playerTeam];
    const newBoss = { ...boss };
    const playerIdx = currentPlayerIdx;
    let newLog = [...log];
    let turnDmg = 0;

    // ── Status ticks at start of player turn ──
    if (newTeam[playerIdx].poisonStacks > 0 && !newTeam[playerIdx].poisonImmune) {
      const poisonDmg = Math.floor(newTeam[playerIdx].maxHp * 0.05 * newTeam[playerIdx].poisonStacks);
      newTeam[playerIdx].hp -= poisonDmg;
      newLog.push(`☠️ ${newTeam[playerIdx].name} nhận ${poisonDmg} sát thương độc!`);
    }
    if (newTeam[playerIdx].burnStacks > 0 && !newTeam[playerIdx].burnImmune) {
      const burnDmg = Math.floor(newTeam[playerIdx].maxHp * 0.04 * newTeam[playerIdx].burnStacks);
      newTeam[playerIdx].hp -= burnDmg;
      newLog.push(`🔥 ${newTeam[playerIdx].name} nhận ${burnDmg} sát thương cháy!`);
    }
    if (newTeam[playerIdx].regenStacks > 0) {
      const regenAmt = Math.floor(newTeam[playerIdx].maxHp * 0.05 * newTeam[playerIdx].regenStacks);
      newTeam[playerIdx].hp = Math.min(newTeam[playerIdx].maxHp, newTeam[playerIdx].hp + regenAmt);
      newLog.push(`💚 ${newTeam[playerIdx].name} hồi ${regenAmt} HP!`);
    }

    // ── Apply move ──
    if (move.type === "dodge") {
      newTeam[playerIdx].dodgeActive = true;
      newTeam[playerIdx].dodgeCooldown = 3;
      newLog.push(`💨 ${currentPlayer.name} né tránh!`);
    } else if (move.effect?.type === "shield") {
      newTeam[playerIdx].shieldActive = true;
      newTeam[playerIdx].shieldValue = move.effect.value;
      newTeam[playerIdx].shieldTurns = move.effect.duration || 2;
      newLog.push(`🛡️ ${currentPlayer.name} tạo khiên ${move.effect.value}!`);
    } else if (move.effect?.type === "heal") {
      const healAmt = move.effect.value;
      newTeam[playerIdx].hp = Math.min(newTeam[playerIdx].maxHp, newTeam[playerIdx].hp + healAmt);
      newLog.push(`💚 ${currentPlayer.name} hồi ${healAmt} HP!`);
    } else if (move.effect?.type === "poison") {
      newBoss.poisonStacks = (newBoss.poisonStacks || 0) + (move.effect.value || 1);
      newLog.push(`☠️ ${boss.name} bị nhiễm độc!`);
    } else if (move.effect?.type === "burn") {
      newBoss.burnStacks = (newBoss.burnStacks || 0) + (move.effect.value || 1);
      newLog.push(`🔥 ${boss.name} bị cháy!`);
    } else if (move.effect?.type === "buff_atk") {
      newTeam[playerIdx].atkBuff += move.effect.value;
      newLog.push(`⬆️ ${currentPlayer.name} ATK +${move.effect.value} permanent!`);
    } else if (move.effect?.type === "speed_down") {
      newBoss.spSpeedDown = (newBoss.spSpeedDown || 0) + move.effect.value;
      newLog.push(`🐌 ${boss.name} bị giảm tốc!`);
    } else if (move.effect?.type === "def_down") {
      newBoss.defDownStacks = (newBoss.defDownStacks || 0) + Math.floor(move.effect.value / 5);
      newLog.push(`🛡️ ${boss.name} DEF giảm!`);
    } else if (move.effect?.type === "stun") {
      // Stun will be handled on boss turn
      newBoss.stunned = move.effect.value || 1;
      newLog.push(`⚡ ${boss.name} bị choáng!`);
    } else if (move.effect?.type === "regen") {
      newTeam[playerIdx].regenStacks = (newTeam[playerIdx].regenStacks || 0) + (move.effect.value || 1);
      newLog.push(`💚 ${currentPlayer.name} có khả năng hồi máu!`);
    } else if (move.effect?.type === "reflect") {
      newTeam[playerIdx].reflects = true;
      newLog.push(`🔄 ${currentPlayer.name} phản đòn 30%!`);
    } else if (move.type === "tackle" || move.type === "skill" || move.type === "ultimate") {
      const comboMult = 1 + newTeam[playerIdx].comboStreak * 0.05;
      const effectiveAtk = Math.floor(newTeam[playerIdx].atk * (1 + newTeam[playerIdx].atkBuff * 0.02));
      const { dmg, isCrit, notes: dmgNotes } = calcDamage(
        { ...newTeam[playerIdx], atk: effectiveAtk }, newBoss, move.power, comboMult
      );
      newBoss.hp -= dmg;
      newTeam[playerIdx].totalDamage += dmg;
      newTeam[playerIdx].comboStreak++;
      newTeam[playerIdx].ultimateCharge = Math.min(100, newTeam[playerIdx].ultimateCharge + (move.type === "ultimate" ? 50 : 12));
      turnDmg += dmg;
      let msg = `⚔️ ${currentPlayer.name} dùng ${move.name} → ${dmg} sát thương!`;
      if (isCrit) msg += " 💥";
      if (dmgNotes.filter(n => n !== "Chí mạng!" && n !== "Né!" && n !== "Trượt!").length > 0) {
        msg += " " + dmgNotes.filter(n => n !== "Chí mạng!" && n !== "Né!" && n !== "Trượt!").join(" ");
      }
      newLog.push(msg);
      if (newTeam[playerIdx].comboStreak > maxCombo) setMaxCombo(prev => Math.max(prev, newTeam[playerIdx].comboStreak));
    }

    // Energy management
    if (move.energyCost > 0) newTeam[playerIdx].energy -= move.energyCost;
    newTeam[playerIdx].energy = Math.min(newTeam[playerIdx].maxEnergy, newTeam[playerIdx].energy + 6);

    setPlayerTeam(newTeam);
    setBoss(newBoss);
    setLog(newLog);

    // ── Check boss defeated ──
    if (newBoss.hp <= 0) {
      newBoss.isAlive = false;
      newLog.push(`🏆 ${boss.name} đã bị đánh bại!`);
      setLog(newLog);
      setBoss(null);
      setRunStats(prev => ({ ...prev, totalDamage: prev.totalDamage + turnDmg, bossesDefeated: prev.bossesDefeated + 1 }));
      generateBattleRewards();
      setStage("reward");
      return;
    }

    // ── Boss turn (after 700ms delay) ──
    setTimeout(() => executeBossTurn(newTeam, newBoss, playerIdx, turnDmg, newLog, runPlayerShield, runPlayerHp, bossEnraged, runPlayerMaxHp), 700);
  }, [selectedMove, currentPlayer, boss, playerTeam, currentPlayerIdx, log, maxCombo, runStats, powerUps, runPlayerShield, runPlayerHp, bossEnraged, runPlayerMaxHp]);

  function executeBossTurn(newTeam: BattleCard[], newBoss: BattleCard, playerIdx: number, prevDmg: number, incomingLog: string[], staleShieldVal: number, staleHpVal: number, staleEnraged: boolean, staleMaxHpVal: number) {
    // Deep copy moves array to avoid mutating original boss state
    newBoss.moves = newBoss.moves.map(m => ({ ...m }));
    let bossLog = [...incomingLog];
    let turnDmg = prevDmg;

    // Status ticks on boss
    if (newBoss.poisonStacks > 0) {
      const pd = Math.floor(newBoss.maxHp * 0.03 * newBoss.poisonStacks);
      newBoss.hp -= pd;
      bossLog.push(`☠️ ${newBoss.name} nhận ${pd} độc!`);
    }
    if (newBoss.burnStacks > 0) {
      const bd = Math.floor(newBoss.maxHp * 0.04 * newBoss.burnStacks);
      newBoss.hp -= bd;
      bossLog.push(`🔥 ${newBoss.name} nhận ${bd} cháy!`);
    }
    if (newBoss.regenStacks > 0) {
      const rd = Math.floor(newBoss.maxHp * 0.05 * newBoss.regenStacks);
      newBoss.hp = Math.min(newBoss.maxHp, newBoss.hp + rd);
    }

    // Check enrage
    const enrageThreshold = 0.30;
    if (!staleEnraged && newBoss.hp / newBoss.maxHp <= enrageThreshold) {
      setBossEnraged(true);
      bossLog.push(`👹🔥 ${newBoss.name} TRỞ NÊN CUỒNG NGẠO! ATK +50%!`);
      newBoss.atk = Math.floor(newBoss.atk * 1.5);
    }

    // Boss stunned check
    if (newBoss.stunned > 0) {
      newBoss.stunned--;
      bossLog.push(`⚡ ${newBoss.name} bị choáng, bỏ lượt!`);
      finishBossTurn(newTeam, newBoss, bossLog, turnDmg);
      return;
    }

    // Boss AI: pick best move
    const availableMoves = newBoss.moves.filter(m => m.currentCooldown === 0);
    let bossMove = pickRandom(availableMoves.length > 0 ? availableMoves : newBoss.moves);

    // Telegraph logic — read from the passed-in log array to avoid stale closure
    const ab = BOSS_ABILITIES[bossMove.id];
    if (ab?.telegraph && bossLog.length === incomingLog.length) {
      setBossTelegraph(ab.telegraph);
      setTimeout(() => setBossTelegraph(null), 1500);
    }

    // Use boss move
    if (bossMove.power > 0) {
      // Find target (lowest HP alive player)
      let targetIdx = newTeam.findIndex(c => c.isAlive);
      if (targetIdx < 0) { finishBossTurn(newTeam, newBoss, bossLog, turnDmg); return; }

      const { dmg, isCrit, notes: dmgNotes } = calcDamage(
        newBoss, newTeam[targetIdx], bossMove.power, 1, true
      );
      newTeam[targetIdx].hp -= dmg;
      turnDmg += dmg;

      let msg = `👹 ${newBoss.name} dùng ${bossMove.name}`;
      if (dmg > 0) msg += ` → ${dmg} sát thương`;
      if (isCrit) msg += " 💥Chí mạng!";
      if (dmgNotes.filter(n => !["Chí mạng!", "Né!", "Trượt!", `Khiên chắn -0`].some(s => n.startsWith(s))).length > 0) {
        const extra = dmgNotes.filter(n => !["Chí mạng!", "Né!", "Trượt!", `Khiên chắn -0`].some(s => n.startsWith(s)));
        if (extra.length > 0) msg += ` (${extra.join(", ")})`;
      }
      bossLog.push(msg);

      // Apply move effects
      if (bossMove.effect) {
        if (bossMove.effect.type === "poison") {
          if (!newTeam[targetIdx].poisonImmune) newTeam[targetIdx].poisonStacks = (newTeam[targetIdx].poisonStacks || 0) + (bossMove.effect.value || 1);
          bossLog.push(`☠️ ${newTeam[targetIdx].name} bị nhiễm độc!`);
        }
        if (bossMove.effect.type === "burn") {
          if (!newTeam[targetIdx].burnImmune) newTeam[targetIdx].burnStacks = (newTeam[targetIdx].burnStacks || 0) + (bossMove.effect.value || 1);
          bossLog.push(`🔥 ${newTeam[targetIdx].name} bị cháy!`);
        }
        if (bossMove.effect.type === "shield") {
          newBoss.shieldActive = true;
          newBoss.shieldValue = bossMove.effect.value;
          newBoss.shieldTurns = bossMove.effect.duration || 2;
          bossLog.push(`🛡️ ${newBoss.name} tạo khiên ${bossMove.effect.value}!`);
        }
        if (bossMove.effect.type === "heal") {
          newBoss.hp = Math.min(newBoss.maxHp, newBoss.hp + bossMove.effect.value);
          bossLog.push(`💚 ${newBoss.name} hồi ${bossMove.effect.value} HP!`);
        }
        if (bossMove.effect.type === "buff_atk") {
          newBoss.atkBuff = (newBoss.atkBuff || 0) + bossMove.effect.value;
          newBoss.atk += bossMove.effect.value;
          bossLog.push(`⬆️ ${newBoss.name} ATK tăng permanent!`);
        }
        if (bossMove.effect.type === "stun" && !newTeam[targetIdx].isAlive) {
          newTeam[targetIdx].stunned = bossMove.effect.value || 1;
        }
      }

      if (newTeam[targetIdx].hp <= 0) {
        newTeam[targetIdx].hp = 0;
        newTeam[targetIdx].isAlive = false;
        bossLog.push(`💀 ${newTeam[targetIdx].name} đã ngã xuống!`);
        // Transfer remaining damage to player avatar
        const remainingDmg = Math.abs(newTeam[targetIdx].hp);
        let avatarDmg = remainingDmg;
        if (staleShieldVal > 0) {
          const blocked = Math.min(staleShieldVal, avatarDmg);
          avatarDmg -= blocked;
          setRunPlayerShield(s => s - blocked);
          bossLog.push(`🛡️ Avatar chặn ${blocked} sát thương!`);
        }
        if (avatarDmg > 0) {
          setRunPlayerHp(prev => {
            const newHp = Math.max(0, prev - avatarDmg);
            setTimeout(() => { if (newHp <= 0) setStage("gameover"); }, 600);
            return newHp;
          });
          bossLog.push(`🧑 Avatar nhận ${avatarDmg} sát thương!`);
        }
      }
    } else if (bossMove.effect?.type === "shield") {
      newBoss.shieldActive = true;
      newBoss.shieldValue = bossMove.effect.value;
      newBoss.shieldTurns = bossMove.effect.duration || 2;
      bossLog.push(`🛡️ ${newBoss.name} tạo khiên ${bossMove.effect.value}!`);
    }

    // Check player team wiped → avatar absorbs remaining damage and continues (if alive)
    const stillAlive = newTeam.filter(c => c.isAlive);
    if (stillAlive.length === 0) {
      finishBossTurn(newTeam, newBoss, bossLog, turnDmg);
      return;
    }
    // Check if player avatar is dead — defer to after state update via functional setter
    setRunPlayerHp(prev => {
      if (prev <= 0) setTimeout(() => setStage("gameover"), 500);
      return prev;
    });

    // Update cooldowns
    newTeam.forEach(c => {
      if (c.dodgeCooldown > 0) c.dodgeCooldown--;
      if (c.dodgeCooldown === 0) c.dodgeActive = false;
      if (c.shieldTurns > 0) {
        c.shieldTurns--;
        if (c.shieldTurns === 0) { c.shieldActive = false; c.shieldValue = 0; }
      }
      if (c.stunned > 0) c.stunned--;
      if (c.defDownStacks > 0) c.defDownStacks--;
    });
    newBoss.moves.forEach(m => {
      if (m.currentCooldown > 0) m.currentCooldown--;
    });
    newTeam[playerIdx].comboStreak = 0;

    // Heal-over-time from power-ups
    if (powerUps.includes("heal")) {
      newTeam.forEach(c => {
        if (c.isAlive) {
          const healAmt = Math.floor(c.maxHp * 0.05);
          c.hp = Math.min(c.maxHp, c.hp + healAmt);
        }
      });
    }

    finishBossTurn(newTeam, newBoss, bossLog, turnDmg);
  }

  function finishBossTurn(newTeam: BattleCard[], newBoss: BattleCard | null, newLog: string[], turnDmg: number) {
    // Switch to next alive player
    const aliveIdx = newTeam.findIndex(c => c.isAlive);
    if (aliveIdx >= 0 && aliveIdx !== currentPlayerIdx) setCurrentPlayerIdx(aliveIdx);
    if (aliveIdx < 0) setCurrentPlayerIdx(0);

    setPlayerTeam(newTeam);
    if (newBoss) setBoss(newBoss);
    setLog(newLog);
    setTotalDamage(prev => prev + turnDmg);
    setRunStats(prev => ({ ...prev, totalDamage: prev.totalDamage + turnDmg }));
    setTurnCount(t => t + 1);
    setTurn("idle");
  }

  // Trigger execution when move selected
  useEffect(() => {
    if (turn === "animating" && selectedMove === null) {
      executePlayerMove();
    }
  }, [turn, selectedMove, executePlayerMove]);

  // ─── Battle rewards ───────────────────────────────────
  function generateBattleRewards() {
    const available = shuffle(userCards.filter(id => !deck.includes(id))).slice(0, 8);
    const offeredCards = available.slice(0, 3);
    const offeredPowerUps = shuffle(POWER_UPS.filter(pu => !powerUps.includes(pu.id))).slice(0, 2);
    setRewardOptions({ cards: offeredCards, powerUps: offeredPowerUps });
  }

  const handleSelectReward = (type: "card" | "powerup", id: string | number) => {
    if (type === "card") {
      setDeck(d => [...d, id as number]);
      const newCard = buildCard(id as number, Math.max(1, floor - 1));
      const applied = applyPowerUps([newCard]);
      setPlayerTeam(prev => [...prev, applied[0]]);
    } else {
      const pu = POWER_UPS.find(p => p.id === id);
      if (pu) {
        setPowerUps(p => [...p, id as string]);
        // Apply immediately
        setPlayerTeam(prev => applyPowerUps(prev));
      }
    }
    advanceFloor();
  };

  // ─── Shop ────────────────────────────────────────────
  const handleBuyItem = (item: ShopItem) => {
    if (shopCoins < item.cost) return;
    setShopCoins(prev => prev - item.cost);
    let newLog = [...log];
    if (item.action === "heal_team") {
      setPlayerTeam(prev => prev.map(c => ({ ...c, hp: Math.min(c.maxHp, c.hp + 50 + floor * 10) })));
      newLog.push(`💚 Cả team hồi ${50 + floor * 10} HP!`);
    } else if (item.action === "atk_all") {
      setPlayerTeam(prev => prev.map(c => ({ ...c, atk: Math.floor(c.atk * 1.15) })));
      newLog.push(`⬆️ ATK toàn team +15%!`);
    } else if (item.action === "hp_all") {
      setPlayerTeam(prev => prev.map(c => {
        const newMaxHp = Math.floor(c.maxHp * 1.20);
        return { ...c, maxHp: newMaxHp, hp: c.hp + Math.floor(c.maxHp * 0.20) };
      }));
      newLog.push(`💚 HP toàn team +20%!`);
    } else if (item.action === "shield_all") {
      setPlayerTeam(prev => prev.map(c => ({ ...c, shieldActive: true, shieldValue: (c.shieldValue || 0) + 30, shieldTurns: 3 })));
      newLog.push(`🛡️ Cả team có shield +30!`);
    } else if (item.action === "crt_all") {
      setPlayerTeam(prev => prev.map(c => ({ ...c, crt: Math.min(40, c.crt + 10) })));
      newLog.push(`⬆️ CRIT toàn team +10%!`);
    } else if (item.action === "revive") {
      const deadIdx = playerTeam.findIndex(c => !c.isAlive);
      if (deadIdx >= 0) {
        const deadCardName = playerTeam[deadIdx]?.name;
        setPlayerTeam(prev => prev.map((c, i) => i === deadIdx ? { ...c, isAlive: true, hp: Math.floor(c.maxHp * 0.50) } : c));
        newLog.push(`💀 ${deadCardName} được hồi sinh với 50% HP!`);
      }
    }
    setLog(newLog);
  };

  // ─── Elite battle ────────────────────────────────────
  const executeEliteMove = useCallback(() => {
    if (!elite || turn !== "boss_turn") return;
    const newTeam = [...playerTeam];
    const newElite = { ...elite };
    let newLog = [...log];
    let turnDmg = 0;

    // Elite attacks a random alive player
    const aliveIdx = newTeam.findIndex(c => c.isAlive);
    if (aliveIdx < 0) { setStage("gameover"); return; }

    const movePool = newElite.moves.filter(m => m.currentCooldown === 0);
    const move = pickRandom(movePool.length > 0 ? movePool : newElite.moves);
    const { dmg, isCrit, notes } = calcDamage(newElite, newTeam[aliveIdx], move.power, 1, true);
    newTeam[aliveIdx].hp -= dmg;
    turnDmg += dmg;

    let msg = `⚔️ ${elite.name} dùng ${move.name}`;
    if (dmg > 0) msg += ` → ${dmg} sát thương`;
    if (isCrit) msg += " 💥";
    newLog.push(msg);

    if (move.effect?.type === "poison") {
      if (!newTeam[aliveIdx].poisonImmune) newTeam[aliveIdx].poisonStacks = (newTeam[aliveIdx].poisonStacks || 0) + 2;
    }
    if (move.effect?.type === "shield") {
      newElite.shieldActive = true;
      newElite.shieldValue = move.effect.value;
      newElite.shieldTurns = move.effect.duration || 2;
    }

    if (newTeam[aliveIdx].hp <= 0) {
      newTeam[aliveIdx].isAlive = false;
      newLog.push(`💀 ${newTeam[aliveIdx].name} đã ngã!`);
    }

    // Tick statuses
    newTeam.forEach(c => {
      if (c.poisonStacks > 0 && !c.poisonImmune) {
        const pd = Math.floor(c.maxHp * 0.04 * c.poisonStacks);
        c.hp -= pd;
        newLog.push(`☠️ ${c.name} nhận ${pd} độc!`);
      }
      if (c.burnStacks > 0 && !c.burnImmune) {
        const bd = Math.floor(c.maxHp * 0.03 * c.burnStacks);
        c.hp -= bd;
        newLog.push(`🔥 ${c.name} nhận ${bd} cháy!`);
      }
    });

    newElite.moves.forEach(m => { if (m.currentCooldown > 0) m.currentCooldown--; });
    newTeam[aliveIdx].comboStreak = 0;

    if (newTeam.filter(c => c.isAlive).length === 0) {
      setPlayerTeam(newTeam);
      setLog(newLog);
      setTimeout(() => setStage("gameover"), 500);
      return;
    }

    const nextAlive = newTeam.findIndex(c => c.isAlive);
    setPlayerTeam(newTeam);
    setElite(newElite);
    setLog(newLog);
    setCurrentPlayerIdx(nextAlive >= 0 ? nextAlive : 0);
    setTurnCount(t => t + 1);
    setTurn("idle");
  }, [elite, turn, playerTeam, log]);

  // Elite battle: when player moves → execute player move → then boss turn
  const handleSelectEliteMove = (move: BattleMove) => {
    if (turn !== "idle" || !currentPlayer?.isAlive || currentPlayer.stunned > 0) return;
    if (move.currentCooldown > 0) return;
    if (move.energyCost > currentPlayer.energy) return;
    setSelectedMove(move);
    setTurn("animating");
  };

  // Elite: execute player move, then boss counter
  const executeElitePlayerMove = useCallback(() => {
    if (!selectedMove || !currentPlayer || !elite) return;
    const move = selectedMove;
    setSelectedMove(null);
    const newTeam = [...playerTeam];
    const newElite = { ...elite };
    const playerIdx = currentPlayerIdx;
    let newLog = [...log];
    let turnDmg = 0;

    if (move.effect?.type === "shield") {
      newTeam[playerIdx].shieldActive = true;
      newTeam[playerIdx].shieldValue = move.effect.value;
      newTeam[playerIdx].shieldTurns = move.effect.duration || 2;
      newLog.push(`🛡️ ${currentPlayer.name} tạo khiên!`);
    } else if (move.effect?.type === "heal") {
      newTeam[playerIdx].hp = Math.min(newTeam[playerIdx].maxHp, newTeam[playerIdx].hp + move.effect.value);
      newLog.push(`💚 ${currentPlayer.name} hồi ${move.effect.value} HP!`);
    } else if (move.effect?.type === "poison") {
      newElite.poisonStacks = (newElite.poisonStacks || 0) + (move.effect.value || 1);
    } else if (move.effect?.type === "burn") {
      newElite.burnStacks = (newElite.burnStacks || 0) + (move.effect.value || 1);
    } else if (move.type === "tackle" || move.type === "skill" || move.type === "ultimate") {
      const comboMult = 1 + newTeam[playerIdx].comboStreak * 0.05;
      const { dmg, isCrit, notes: dmgNotes } = calcDamage(
        newTeam[playerIdx], newElite, move.power, comboMult
      );
      newElite.hp -= dmg;
      newTeam[playerIdx].totalDamage += dmg;
      newTeam[playerIdx].comboStreak++;
      newTeam[playerIdx].ultimateCharge = Math.min(100, newTeam[playerIdx].ultimateCharge + (move.type === "ultimate" ? 50 : 12));
      turnDmg += dmg;
      let msg = `⚔️ ${currentPlayer.name} dùng ${move.name} → ${dmg} sát thương!`;
      if (isCrit) msg += " 💥";
      newLog.push(msg);
    }

    if (move.energyCost > 0) newTeam[playerIdx].energy -= move.energyCost;
    newTeam[playerIdx].energy = Math.min(newTeam[playerIdx].maxEnergy, newTeam[playerIdx].energy + 6);

    setPlayerTeam(newTeam);
    setElite(newElite);
    setLog(newLog);

    if (newElite.hp <= 0) {
      newElite.isAlive = false;
      newLog.push(`🏆 ${elite.name} đã bị đánh bại!`);
      setLog(newLog);
      setElite(null);
      setRunStats(prev => ({ ...prev, totalDamage: prev.totalDamage + turnDmg, elitesDefeated: prev.elitesDefeated + 1 }));
      // Elite gives bonus card
      const bonus = shuffle(userCards.filter(id => !deck.includes(id))).slice(0, 1);
      if (bonus.length > 0) {
        setDeck(d => [...d, bonus[0]]);
        setPlayerTeam(prev => [...prev, applyPowerUps([buildCard(bonus[0])])[0]]);
        newLog.push(`💎 Nhận ${getCardById(bonus[0])?.name} làm chiến lợi phẩm!`);
      }
      advanceFloor();
      return;
    }

    setTimeout(() => {
      setTurn("boss_turn");
    }, 400);
  }, [selectedMove, currentPlayer, elite, playerTeam, currentPlayerIdx, log, runStats]);

  useEffect(() => {
    if (stage === "elite_battle" && turn === "animating" && selectedMove === null) {
      executeElitePlayerMove();
    }
    if (stage === "elite_battle" && turn === "boss_turn") {
      executeEliteMove();
    }
  }, [stage, turn, selectedMove, executeElitePlayerMove, executeEliteMove]);

  const handleFinishRun = () => {
    const reward = calculateRunReward();
    onReward(reward);
    onClose();
  };

  const calculateRunReward = () => {
    return Math.floor(floor * 80 + runStats.totalDamage / 5 + runStats.bossesDefeated * 100 + runStats.elitesDefeated * 50);
  };

  // Auto-switch to next alive player
  useEffect(() => {
    if (stage === "battle" && turn === "idle") {
      const aliveIdx = playerTeam.findIndex(c => c.isAlive);
      if (aliveIdx >= 0 && aliveIdx !== currentPlayerIdx) setCurrentPlayerIdx(aliveIdx);
    }
  }, [playerTeam, stage, turn, currentPlayerIdx]);

  const handleTakeTreasure = (cardId: number) => {
    setDeck(d => [...d, cardId]);
    setPlayerTeam(prev => [...prev, applyPowerUps([buildCard(cardId)])[0]]);
    advanceFloor();
  };

  // ═══════════════════════════════════════════════════════════════════
  //  UI RENDERING
  // ═══════════════════════════════════════════════════════════════════
  const ELITE_STAGE = stage === "elite_battle";
  const activeBoss = ELITE_STAGE ? elite : boss;
  const handleMoveSelect = ELITE_STAGE ? handleSelectEliteMove : handleSelectMove;

  const stageBg = stage === "victory" ? "from-amber-400 to-orange-500"
    : stage === "gameover" ? "from-slate-700 to-slate-900"
    : "from-red-700 via-orange-600 to-red-700";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="h-full w-full max-w-2xl overflow-y-auto"
      >
        {/* ── Header ── */}
        <div className={`px-4 py-3 flex items-center justify-between bg-gradient-to-r ${stageBg}`}>
          <div className="flex items-center gap-2">
            {stage !== "intro" && (
              <button onClick={() => setStage("encounter_select")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30">
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="font-black text-white">Thử Thách Sinh Tồn</h2>
              {stage !== "intro" && <p className="text-[10px] font-bold text-white/60">Tầng {floor}/5 · {FLOOR_NAMES[floor - 1]}</p>}
            </div>
          </div>
          {(stage === "battle" || ELITE_STAGE) && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white">Hiệp {turnCount}</span>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-900 min-h-[calc(100%-56px)] p-4 space-y-4">

          {/* ── INTRO ── */}
          {stage === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-900/50">
                  <Skull2 size={32} className="text-red-400" />
                </div>
                <h3 className="mb-2 text-2xl font-black text-white">Thử Thách Sinh Tồn</h3>
                <p className="text-sm text-slate-400">Vượt qua 5 tầng dungeon, đánh bại boss để nhận phần thưởng lớn</p>
              </div>

              <div className="mb-6 space-y-2">
                {[
                  ["🃏", "Chọn deck từ bộ sưu tập của bạn"],
                  ["👹", "Boss có kỹ năng đặc biệt + Telegraph + Enrage"],
                  ["🏕️", "Gặp nhiều sự kiện: Shop, Nghỉ ngơi, Kho báu"],
                  ["⚔️", "Elite, Gamble, và phần thưởng sau mỗi trận"],
                  ["👑", "Qua 5 tầng = phần thưởng khổng lồ"],
                ].map(([icon, text]) => (
                  <div key={text} className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-300">
                    <span className="text-xl">{icon}</span> {text}
                  </div>
                ))}
              </div>

              {userCards.length === 0 && (
                <div className="mb-4 rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-center text-xs text-amber-400">
                  Chưa có bài? Hệ thống sẽ tạo deck demo.
                </div>
              )}

              <Button onClick={handleStart} size="lg" className="w-full gap-2" variant="primary">
                <Play size={18} /> Bắt đầu cuộc chiến
              </Button>
            </motion.div>
          )}

          {/* ── ENCOUNTER SELECT ── */}
          {stage === "encounter_select" && (
            <motion.div key="encounter" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-4 text-center">
                <p className="text-lg font-black text-white">Tầng {floor}: {FLOOR_NAMES[floor - 1]}</p>
                <p className="text-xs text-slate-400">Chọn con đường của bạn</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {encounters.map((enc) => {
                  const iconBg = {
                    boss: "bg-red-900/40 border-red-700",
                    elite: "bg-orange-900/40 border-orange-700",
                    rest: "bg-emerald-900/40 border-emerald-700",
                    shop: "bg-amber-900/40 border-amber-700",
                    treasure: "bg-purple-900/40 border-purple-700",
                    gamble: "bg-cyan-900/40 border-cyan-700",
                  }[enc.type] || "bg-slate-800 border-slate-700";

                  return (
                    <button
                      key={enc.type}
                      onClick={() => handleSelectEncounter(enc)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition-all hover:scale-105 active:scale-95 ${iconBg}`}
                    >
                      <span className="text-3xl">{enc.icon}</span>
                      <span className="font-black text-white">{enc.label}</span>
                      <span className="text-[10px] text-slate-400">{enc.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Stats bar */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-900/60 text-xs">🧑</div>
                  <div className="h-2.5 w-48 overflow-hidden rounded-full bg-blue-900/60">
                    <motion.div
                      animate={{ width: `${Math.max(0, (runPlayerHp / runPlayerMaxHp) * 100)}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    />
                  </div>
                  <span className="text-xs font-bold text-blue-400">{Math.max(0, runPlayerHp)}/{runPlayerMaxHp}</span>
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                  <span>⚔️ {deck.length} lá bài</span>
                  <span>⬆️ {powerUps.length} năng lực</span>
                  <span>💥 {runStats.bossesDefeated} boss</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── BATTLE ── */}
          {(stage === "battle" || ELITE_STAGE) && activeBoss && currentPlayer && (
            <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Telegraph warning */}
              <AnimatePresence>
                {bossTelegraph && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="rounded-xl border border-red-500 bg-red-950/80 px-4 py-2 text-center text-sm font-bold text-red-300"
                  >
                    ⚠️ {bossTelegraph}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Player avatar HP bar */}
              <div className="rounded-xl border border-blue-800 bg-blue-950/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900/60 text-sm">🧑</div>
                    <div>
                      <p className="text-xs font-black text-blue-300">Avatar</p>
                      <p className="text-[9px] font-bold text-blue-500">Tấm chắn cuối cùng</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-blue-300">{Math.max(0, runPlayerHp)}/{runPlayerMaxHp}</p>
                    <p className="text-[9px] font-bold text-blue-500">HP</p>
                  </div>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-blue-900/60">
                  <motion.div
                    animate={{ width: `${Math.max(0, (runPlayerHp / runPlayerMaxHp) * 100)}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                  />
                </div>
                {runPlayerShield > 0 && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[9px] text-blue-400">🛡️ Khiên:</span>
                    <span className="text-[9px] font-black text-blue-300">{runPlayerShield}</span>
                  </div>
                )}
              </div>

              {/* Boss HP bar */}
              <div className="rounded-2xl border border-red-800 bg-red-950/50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-900/60 text-lg">
                      {bossEnraged ? "🔥" : activeBoss.elementId === "plastic" ? "🛢️" : activeBoss.elementId === "hazard" ? "☠️" : activeBoss.elementId === "organic" ? "🌿" : activeBoss.elementId === "metal" ? "🥫" : activeBoss.elementId === "glass" ? "🫙" : "👹"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-red-300">{activeBoss.name}</p>
                        {bossEnraged && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-black text-white">ENRAGE</span>}
                      </div>
                      <p className="text-[10px] font-bold text-red-500">{ELITE_STAGE ? "Elite" : "Boss"} · Tầng {floor}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-red-300">{Math.max(0, activeBoss.hp)}/{activeBoss.maxHp}</p>
                    <p className="text-[10px] font-bold text-red-500">HP</p>
                  </div>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-red-900/60">
                  <motion.div
                    animate={{ width: `${Math.max(0, (activeBoss.hp / activeBoss.maxHp) * 100)}%` }}
                    className={`h-full rounded-full ${bossEnraged ? "bg-gradient-to-r from-orange-600 to-red-600" : "bg-gradient-to-r from-red-600 to-orange-500"}`}
                  />
                </div>
                {/* Status effects on boss */}
                <div className="mt-1 flex gap-2">
                  {activeBoss.poisonStacks > 0 && <span className="text-[10px] text-green-400">☠️x{activeBoss.poisonStacks}</span>}
                  {activeBoss.burnStacks > 0 && <span className="text-[10px] text-orange-400">🔥x{activeBoss.burnStacks}</span>}
                  {activeBoss.shieldActive && <span className="text-[10px] text-blue-400">🛡️{activeBoss.shieldValue}</span>}
                </div>
              </div>

              {/* Player team strip */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {playerTeam.map((card, i) => (
                  <div
                    key={card.id}
                    onClick={() => card.isAlive && setCurrentPlayerIdx(i)}
                    className={`relative flex-shrink-0 cursor-pointer rounded-xl border-2 p-2.5 text-center transition-all ${i === currentPlayerIdx ? "border-emerald-400 bg-emerald-950/40" : card.isAlive ? "border-slate-700 bg-slate-800 hover:border-slate-600" : "border-slate-800 bg-slate-900 opacity-40 cursor-default"}`}
                  >
                    {card.shieldActive && <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px]">🛡️</div>}
                    {card.poisonStacks > 0 && <div className="absolute -top-1 -left-1 text-[8px]">☠️</div>}
                    {card.burnStacks > 0 && <div className="absolute -bottom-1 -left-1 text-[8px]">🔥</div>}
                    <p className="text-lg">{card.elementId === "plastic" ? "🛢️" : card.elementId === "hazard" ? "☠️" : card.elementId === "organic" ? "🌿" : card.elementId === "metal" ? "🥫" : card.elementId === "glass" ? "🫙" : "📦"}</p>
                    <p className="text-[9px] font-bold text-slate-300 truncate w-14">{card.name.slice(0, 8)}</p>
                    <p className="text-[10px] font-black text-red-400">{Math.max(0, card.hp)}/{card.maxHp}</p>
                    {!card.isAlive && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60"><span className="text-lg">💀</span></div>}
                  </div>
                ))}
              </div>

              {/* Current card detail */}
              {currentPlayer && (
                <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-300">{currentPlayer.name}</span>
                    <span className="text-xs text-slate-400">⚡{currentPlayer.energy}/{currentPlayer.maxEnergy}</span>
                  </div>
                  <div className="mb-2 flex gap-3 text-[10px] text-slate-400">
                    <span>ATK {currentPlayer.atk}</span>
                    <span>DEF {currentPlayer.def}</span>
                    <span>SPD {currentPlayer.spd}</span>
                    <span>CRT {currentPlayer.crt}%</span>
                    {currentPlayer.poisonImmune && <span className="text-green-500">☠️immune</span>}
                    {currentPlayer.burnImmune && <span className="text-orange-500">🔥immune</span>}
                  </div>
                </div>
              )}

              {/* Move buttons */}
              {currentPlayer && (
                <div className="grid grid-cols-2 gap-2">
                  {currentPlayer.moves.map((move) => {
                    const canAfford = move.energyCost <= currentPlayer.energy;
                    const onCd = move.currentCooldown > 0;
                    const stunned = currentPlayer.stunned > 0;
                    const disabled = !canAfford || onCd || stunned || turn !== "idle";
                    return (
                      <button
                        key={move.id}
                        onClick={() => !disabled && handleMoveSelect(move)}
                        disabled={disabled}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all ${disabled ? "border-slate-700 bg-slate-800/50 text-slate-600" : "border-slate-600 bg-slate-800 text-slate-200 hover:border-emerald-500 hover:bg-slate-700 active:scale-95"}`}
                      >
                        <span className="text-xl">{move.icon}</span>
                        <span className="text-xs font-bold">{move.name}</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {move.energyCost > 0 ? `${move.energyCost}⚡` : "0⚡"}{onCd ? ` · CD:${move.currentCooldown}` : ""}
                        </span>
                        {move.power > 0 && <span className="text-[10px] font-black text-amber-400">{move.power} DMG</span>}
                        {move.desc && <span className="text-[9px] text-slate-600">{move.desc}</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Battle log */}
              <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-0.5">
                {log.slice(-8).map((entry, i) => (
                  <p key={i} className="text-xs text-slate-400">{entry}</p>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── REWARD ── */}
          {stage === "reward" && rewardOptions && (
            <motion.div key="reward" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
                <Award size={32} className="text-amber-400" />
              </div>
              <h3 className="mb-1 text-2xl font-black text-amber-400">Chiến Thắng!</h3>
              <p className="mb-6 text-sm text-slate-400">
                {floor < FLOOR_COUNT ? `Tiến lên tầng ${floor + 1} · ${FLOOR_NAMES[floor]}` : "Tầng cuối cùng!"}
              </p>

              <p className="mb-3 font-bold text-slate-300">Chọn phần thưởng:</p>

              <div className="mb-4 space-y-3">
                {/* Cards */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Thẻ bài</p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    {rewardOptions.cards.map((cardId) => {
                      const card = getCardById(cardId);
                      return (
                        <button key={cardId}
                          onClick={() => handleSelectReward("card", cardId)}
                          className="flex flex-col items-center gap-1 rounded-2xl border-2 border-slate-700 bg-slate-800 p-3 transition-all hover:border-amber-500 hover:bg-slate-700 active:scale-95">
                          <span className="text-3xl">{card?.elementId === "plastic" ? "🛢️" : "📦"}</span>
                          <span className="text-xs font-bold text-slate-300">{card?.name || `#${cardId}`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Power-ups */}
                {rewardOptions.powerUps.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Năng lực mới</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      {rewardOptions.powerUps.map((pu) => {
                        const Icon = pu.icon;
                        return (
                          <button key={pu.id}
                            onClick={() => handleSelectReward("powerup", pu.id)}
                            className="flex flex-col items-center gap-1 rounded-2xl border-2 border-slate-700 bg-slate-800 p-3 transition-all hover:border-purple-500 hover:bg-slate-700 active:scale-95">
                            <Icon size={24} className={pu.color} />
                            <span className="text-xs font-bold text-slate-300">{pu.name}</span>
                            <span className="text-[10px] text-slate-500">{pu.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── SHOP ── */}
          {stage === "shop" && (
            <motion.div key="shop" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-amber-400" />
                  <h3 className="text-lg font-black text-amber-400">Cửa Hàng</h3>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-amber-900/40 px-3 py-1">
                  <Coins size={14} className="text-amber-400" />
                  <span className="text-sm font-black text-amber-400">{shopCoins}</span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {SHOP_ITEMS.map((item) => {
                  const canAfford = shopCoins >= item.cost;
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-3">
                      <div className="flex items-center gap-3">
                        <Icon size={20} className={item.color} />
                        <div>
                          <p className="text-sm font-bold text-slate-200">{item.name}</p>
                          <p className="text-[10px] text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => canAfford && handleBuyItem(item)}
                        disabled={!canAfford}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition-all ${canAfford ? "bg-amber-600 text-white hover:bg-amber-500" : "bg-slate-700 text-slate-600 cursor-not-allowed"}`}
                      >
                        <Coins size={12} />{item.cost}
                      </button>
                    </div>
                  );
                })}
              </div>

              <Button onClick={advanceFloor} variant="secondary" className="w-full">Tiếp tục</Button>
            </motion.div>
          )}

          {/* ── TREASURE ── */}
          {stage === "treasure" && treasureCards.length > 0 && (
            <motion.div key="treasure" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
              <div className="mb-4 flex items-center justify-center gap-2">
                <Gem size={24} className="text-purple-400" />
                <h3 className="text-lg font-black text-purple-400">Kho Báu</h3>
              </div>
              <p className="mb-4 text-sm text-slate-400">Chọn 1 lá bài để nhận!</p>
              <div className="flex gap-4 justify-center mb-6 flex-wrap">
                {treasureCards.map((cardId) => {
                  const card = getCardById(cardId);
                  return (
                    <button key={cardId}
                      onClick={() => handleTakeTreasure(cardId)}
                      className="flex flex-col items-center gap-2 rounded-2xl border-2 border-purple-700 bg-purple-950/40 p-4 transition-all hover:scale-105 active:scale-95">
                      <span className="text-4xl">{card?.elementId === "plastic" ? "🛢️" : "📦"}</span>
                      <span className="text-sm font-bold text-slate-200">{card?.name || `#${cardId}`}</span>
                      <span className="text-[10px] text-slate-500">ATK {card?.atk} · HP {card?.hp}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── REST ── */}
          {stage === "rest" && (
            <motion.div key="rest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
              <div className="mb-4 flex items-center justify-center gap-2">
                <Flame size={24} className="text-emerald-400" />
                <h3 className="text-lg font-black text-emerald-400">Nghỉ Ngơi</h3>
              </div>
              <p className="text-sm text-slate-400 mb-2">Team được hồi {restHealAmount} HP!</p>
              <div className="mb-6 flex gap-2 justify-center flex-wrap">
                {playerTeam.map(c => (
                  <div key={c.id} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center">
                    <p className="text-xs text-slate-400">{c.name.slice(0, 8)}</p>
                    <p className="text-sm font-black text-emerald-400">{Math.min(c.maxHp, c.hp + restHealAmount)}/{c.maxHp}</p>
                  </div>
                ))}
              </div>
              <Button onClick={advanceFloor} variant="primary" className="w-full gap-2">
                <ChevronRight size={16} /> Tiếp tục
              </Button>
            </motion.div>
          )}

          {/* ── GAME OVER ── */}
          {stage === "gameover" && (
            <motion.div key="gameover" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800">
                <Skull2 size={40} className="text-slate-500" />
              </div>
              <h3 className="mb-2 text-2xl font-black text-slate-400">Thất Bại!</h3>
              <p className="mb-6 text-sm text-slate-500">Đội hình đã bị tiêu diệt</p>

              <div className="mb-6 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <p className="text-xl font-black text-red-400">{Math.max(0, floor - 1)}</p>
                  <p className="text-[9px] font-bold text-slate-500">Tầng</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <p className="text-xl font-black text-amber-400">{Math.floor(runStats.totalDamage)}</p>
                  <p className="text-[9px] font-bold text-slate-500">Sát thương</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <p className="text-xl font-black text-purple-400">{runStats.bossesDefeated}</p>
                  <p className="text-[9px] font-bold text-slate-500">Boss</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <p className="text-xl font-black text-orange-400">{runStats.elitesDefeated}</p>
                  <p className="text-[9px] font-bold text-slate-500">Elite</p>
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="mb-1 text-xs font-bold text-slate-500">Phần thưởng khôi phục</p>
                <p className="text-xl font-black text-emerald-400">+{Math.floor(calculateRunReward())} EXP</p>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStage("intro")} variant="secondary" className="flex-1 gap-1">
                  <RotateCcw size={16} /> Chơi lại
                </Button>
                <Button onClick={handleFinishRun} variant="primary" className="flex-1 gap-1">
                  <Gem size={16} /> Nhận thưởng
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── VICTORY ── */}
          {stage === "victory" && (
            <motion.div key="victory" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30"
              >
                <Crown size={40} className="text-white" />
              </motion.div>
              <h3 className="mb-2 text-3xl font-black text-amber-400">HOÀN THÀNH!</h3>
              <p className="mb-6 text-sm text-slate-400">Qua toàn bộ 5 tầng dungeon!</p>

              <div className="mb-6 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-3">
                  <p className="text-xl font-black text-amber-400">{Math.floor(runStats.totalDamage)}</p>
                  <p className="text-[9px] font-bold text-amber-600">Tổng sát thương</p>
                </div>
                <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-3">
                  <p className="text-xl font-black text-amber-400">{deck.length}</p>
                  <p className="text-[9px] font-bold text-amber-600">Lá bài</p>
                </div>
                <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-3">
                  <p className="text-xl font-black text-amber-400">{powerUps.length}</p>
                  <p className="text-[9px] font-bold text-amber-600">Năng lực</p>
                </div>
                <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-3">
                  <p className="text-xl font-black text-amber-400">{runStats.bossesDefeated}</p>
                  <p className="text-[9px] font-bold text-amber-600">Boss</p>
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-amber-800 bg-amber-950/40 p-4">
                <p className="text-xs text-amber-500 mb-1">Phần thưởng chiến thắng</p>
                <p className="text-2xl font-black text-amber-400">+{Math.floor(calculateRunReward())} EXP</p>
              </div>

              <Button onClick={handleFinishRun} size="lg" className="w-full gap-2" variant="primary">
                <Gem size={18} /> Nhận phần thưởng
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
