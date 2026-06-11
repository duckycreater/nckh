import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Zap, Trophy, ArrowLeft, Play, Sparkles, RotateCcw, Star, Shield, Heart,
  Skull, Target, Clock, X, Plus, ChevronRight, CheckCircle, Flame, Gem,
  Brain, Info, Award,
} from "lucide-react";
import {
  getCardById, getCardArt, getElementIcon, RARITIES,
  ALL_ABILITIES,
} from "../lib/cards";
import { Button } from "../lib/ui";
import type { CardDef } from "../lib/cards";

// ─── Roguelike Config ──────────────────────────────────────────────────────────
const FLOOR_COUNT = 5;
const BOSS_HP_MULTS = [0.8, 1.0, 1.3, 1.7, 2.2];
const BOSS_ATK_MULTS = [0.6, 0.8, 1.1, 1.5, 2.0];
const FLOOR_NAMES = ["Vùng Đất Rác", "Đầm Lầy Độc", "Núi Chế Phẩm", "Rừng Kim Loại", "Lõi Lò Đốt"];

const BOSS_POOL = [
  { id: 101, name: "Túi Nilon Cổ Đại", element: "plastic" },
  { id: 102, name: "Lon Bia Sắt Gỉ", element: "metal" },
  { id: 201, name: "Pin Chết Đầu Độc", element: "hazard" },
  { id: 202, name: "Hộp Xốp Khổng Lồ", element: "organic" },
  { id: 151, name: "Bình Thuốc Trừ Sâu", element: "hazard" },
  { id: 251, name: "Mảnh Kính Vỡ", element: "glass" },
  { id: 301, name: "Lõi Pin Lithium", element: "hazard" },
  { id: 302, name: "Vỏ Hộp Sắt Nặng", element: "metal" },
];

const POWER_UPS = [
  { id: "hp+", name: "Sức Bền", desc: "+20% HP tất cả thẻ", icon: Heart, color: "text-red-500" },
  { id: "atk+", name: "Sức Mạnh", desc: "+15% ATK tất cả thẻ", icon: Zap, color: "text-amber-500" },
  { id: "spd+", name: "Tốc Độ", desc: "+10 SPD tất cả thẻ", icon: Target, color: "text-blue-500" },
  { id: "crt+", name: "Bạo Kích", desc: "+5% CRIT tất cả thẻ", icon: Star, color: "text-purple-500" },
  { id: "heal", name: "Hồi Máu", desc: "Hồi 30 HP mỗi hiệp", icon: Shield, color: "text-emerald-500" },
];

interface PowerUp { id: string; name: string; desc: string; icon: React.ElementType; color: string; }

// ─── Types ────────────────────────────────────────────────────────────────────
type RunStage = "intro" | "dungeon" | "battle" | "reward" | "gameover" | "victory";
type TurnPhase = "idle" | "animating" | "boss_turn" | "player_turn";

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
  stunned: number; silenced: number;
  comboStreak: number; totalDamage: number;
}

interface BattleMove {
  id: string; name: string; desc: string; icon: string;
  type: "tackle" | "skill" | "ultimate" | "dodge";
  energyCost: number; cooldown: number; currentCooldown: number;
  power: number;
  effect?: {
    type: "damage" | "heal" | "shield" | "poison" | "burn" | "buff_def" | "buff_atk" | "speed_down" | "stun" | "drain" | "regen" | "dodge";
    value: number; duration?: number;
  };
}

interface RunState {
  floor: number;
  deck: number[];
  powerUps: string[];
  hpBonus: number;
  atkBonus: number;
  spdBonus: number;
  crtBonus: number;
  wins: number;
  totalDamage: number;
  maxCombo: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateMoves(cardId: number, elementId: string, atk: number, def: number, int: number): BattleMove[] {
  const baseMoves = [
    { id: "tackle", name: "Tấn Công", desc: "Đòn tấn côn cơ bản", icon: "⚔️", type: "tackle" as const, energyCost: 0, cooldown: 0, currentCooldown: 0, power: Math.floor(atk * 0.8) },
    { id: "skill", name: "Kỹ Năng", desc: "Đòn tấn công mạnh hơn", icon: "💥", type: "skill" as const, energyCost: 20, cooldown: 0, currentCooldown: 0, power: Math.floor(atk * 1.2) },
    { id: "defend", name: "Phòng Thủ", desc: "Tăng khiên chắn", icon: "🛡️", type: "skill" as const, energyCost: 15, cooldown: 0, currentCooldown: 0, power: 0, effect: { type: "shield" as const, value: Math.floor(def * 2), duration: 2 } },
    { id: "ultimate", name: "Chiêu Cuối", desc: "Sát thương cao nhất", icon: "🌟", type: "ultimate" as const, energyCost: 50, cooldown: 0, currentCooldown: 0, power: Math.floor(atk * 2.0) },
    { id: "dodge", name: "Né Tránh", desc: "Tăng khả năng né đòn", icon: "💨", type: "dodge" as const, energyCost: 10, cooldown: 0, currentCooldown: 0, power: 0, effect: { type: "dodge" as const, value: 30, duration: 1 } },
  ];
  return baseMoves;
}

function buildBattleCard(cardId: number, level: number, hpMult = 1, atkMult = 1): BattleCard {
  const base = getCardById(cardId);
  if (!base) {
    return {
      id: cardId, name: `Boss #${cardId}`, subtitle: "",
      elementId: "plastic", rarityId: "common",
      atk: 0, hp: 0, maxHp: 0, def: 0, spd: 0, crt: 0, int: 0,
      level: 1, isAlive: false, moves: [], energy: 100, maxEnergy: 100,
      ultimateCharge: 0, evasionChance: 0, dodgeActive: false, dodgeCooldown: 0,
      poisonStacks: 0, shieldActive: false, shieldTurns: 0, shieldValue: 0,
      burnStacks: 0, speedBoost: false, regenStacks: 0, stunned: 0, silenced: 0, comboStreak: 0, totalDamage: 0,
    };
  }
  const hp = Math.floor(base.hp * (1 + (level - 1) * 0.15) * hpMult);
  const atk = Math.floor(base.atk * (1 + (level - 1) * 0.15) * atkMult);
  const def = Math.floor((base.def || 0) * (1 + (level - 1) * 0.10));
  const spd = Math.floor((base.spd || 0) * (1 + (level - 1) * 0.05));
  const crt = Math.min(30, Math.floor((base.crt || 0) * (1 + (level - 1) * 0.02)));
  const int = Math.floor((base.int || 0) * (1 + (level - 1) * 0.05));
  const evasion = Math.min(85, 60 + (spd - 10) * 1);
  return {
    id: cardId, name: base.name, subtitle: base.subtitle,
    elementId: base.elementId, rarityId: base.rarityId,
    atk, hp, maxHp: hp, def, spd, crt, int, level,
    isAlive: true, moves: generateMoves(base.id, base.elementId, atk, def, int),
    energy: 100, maxEnergy: 100, ultimateCharge: 0, evasionChance: evasion,
    dodgeActive: false, dodgeCooldown: 0, poisonStacks: 0,
    shieldActive: false, shieldTurns: 0, shieldValue: 0,
    burnStacks: 0, speedBoost: false, regenStacks: 0,
    stunned: 0, silenced: 0, comboStreak: 0, totalDamage: 0,
  };
}

function calcDamage(attacker: BattleCard, defender: BattleCard, power: number, comboMult = 1): { dmg: number; isCrit: boolean; notes: string[] } {
  const notes: string[] = [];
  const intBonus = 1 + attacker.int * 0.02;
  const baseDmg = Math.floor(power * (0.85 + Math.random() * 0.30) * intBonus * comboMult);
  const isCrit = Math.random() * 100 < attacker.crt;
  const critMult = isCrit ? 2.0 : 1.0;
  if (isCrit) notes.push("Chí mạng!");
  let dmg = Math.floor(baseDmg * critMult);
  if (defender.shieldActive) {
    const shieldBlock = Math.min(defender.shieldValue, dmg);
    dmg = Math.max(1, dmg - shieldBlock);
    notes.push("Khiên chắn!");
  }
  dmg = Math.max(1, dmg);
  return { dmg, isCrit, notes };
}

function getElementAdvantage(attackerEl: string, defenderEl: string): { mult: number; label: string } | null {
  const adv: Record<string, string> = { plastic: "hazard", paper: "plastic", glass: "organic", metal: "paper", organic: "hazard", hazard: "glass" };
  if (adv[attackerEl] === defenderEl) return { mult: 1.5, label: "Hiệu quả!" };
  if (adv[defenderEl] === attackerEl) return { mult: 0.75, label: "Yếu hơn!" };
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  onReward: (pts: number) => void;
  userCards: number[];
}

export function RoguelikeRun({ onClose, onReward, userCards }: Props) {
  const [stage, setStage] = useState<RunStage>("intro");
  const [floor, setFloor] = useState(1);
  const [deck, setDeck] = useState<number[]>([]);
  const [powerUps, setPowerUps] = useState<string[]>([]);
  const [playerTeam, setPlayerTeam] = useState<BattleCard[]>([]);
  const [bossTeam, setBossTeam] = useState<BattleCard[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentBossIdx, setCurrentBossIdx] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<TurnPhase>("idle");
  const [selectedMove, setSelectedMove] = useState<BattleMove | null>(null);
  const [animMsg, setAnimMsg] = useState<string | null>(null);
  const [animColor, setAnimColor] = useState("text-white");
  const [showAnim, setShowAnim] = useState(false);
  const [rewardOptions, setRewardOptions] = useState<{ cards: number[]; powerUps: PowerUp[] } | null>(null);
  const [totalDamage, setTotalDamage] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [runKey, setRunKey] = useState(0);

  const currentPlayer = playerTeam[currentPlayerIdx];
  const currentBoss = bossTeam[currentBossIdx];

  // ─── Deck Building ──────────────────────────────────────────────────────────
  const buildDeck = useCallback(() => {
    // Start with 5 random common cards from user's collection
    const pool = shuffle(userCards).slice(0, Math.min(15, userCards.length));
    return pool.slice(0, 5);
  }, [userCards]);

  // ─── Dungeon Generation ─────────────────────────────────────────────────────
  const startDungeon = useCallback((selectedDeck: number[]) => {
    const boss = BOSS_POOL[Math.floor(Math.random() * BOSS_POOL.length)];
    const bossDef = buildBattleCard(boss.id, floor + 1, BOSS_HP_MULTS[0], BOSS_ATK_MULTS[0]);
    bossDef.name = boss.name;
    bossDef.elementId = boss.element;

    const playerCards = selectedDeck.map((id, i) => {
      const card = getCardById(id);
      const baseHp = card ? card.hp : 100;
      const baseAtk = card ? card.atk : 20;
      const baseDef = card ? (card.def || 0) : 5;
      const baseSpd = card ? (card.spd || 0) : 5;
      const baseCrt = card ? (card.crt || 0) : 5;
      const baseInt = card ? (card.int || 0) : 5;

      return {
        id, name: card?.name || `Card #${id}`, subtitle: card?.subtitle || "",
        elementId: card?.elementId || "plastic", rarityId: card?.rarityId || "common",
        atk: baseAtk, hp: baseHp, maxHp: baseHp, def: baseDef, spd: baseSpd, crt: baseCrt, int: baseInt,
        level: 1, isAlive: true,
        moves: generateMoves(id, card?.elementId || "plastic", baseAtk, baseDef, baseInt),
        energy: 100, maxEnergy: 100, ultimateCharge: 0,
        evasionChance: 40 + baseSpd,
        dodgeActive: false, dodgeCooldown: 0, poisonStacks: 0,
        shieldActive: false, shieldTurns: 0, shieldValue: 0,
        burnStacks: 0, speedBoost: false, regenStacks: 0,
        stunned: 0, silenced: 0, comboStreak: 0, totalDamage: 0,
      };
    });

    setDeck(selectedDeck);
    setPlayerTeam(playerCards);
    setBossTeam([bossDef]);
    setCurrentPlayerIdx(0);
    setCurrentBossIdx(0);
    setLog([`⚔️ Bạn đối đầu với ${boss.name}!`]);
    setTurnCount(0);
    setStage("battle");
  }, [floor]);

  // ─── Start Run ──────────────────────────────────────────────────────────────
  const handleStart = () => {
    const selectedDeck = buildDeck();
    startDungeon(selectedDeck);
  };

  // ─── Move Selection ──────────────────────────────────────────────────────────
  const handleSelectMove = (move: BattleMove) => {
    if (turn !== "idle" || !currentPlayer?.isAlive || currentPlayer.stunned > 0) return;
    if (move.currentCooldown > 0) return;
    if (move.energyCost > currentPlayer.energy) return;
    setSelectedMove(move);
  };

  const executeMove = useCallback(() => {
    if (!selectedMove || !currentPlayer || !currentBoss) return;

    const move = selectedMove;
    setSelectedMove(null);
    setTurn("animating");

    const newPlayerTeam = [...playerTeam];
    const newBossTeam = [...bossTeam];

    let newLog = [...log];
    let totalDmgDealt = 0;
    let newTotalDamage = totalDamage;

    // Player uses move
    if (move.type === "dodge") {
      newPlayerTeam[currentPlayerIdx].dodgeActive = true;
      newPlayerTeam[currentPlayerIdx].dodgeCooldown = 3;
      newLog.push(`💨 ${currentPlayer.name} né tránh!`);
    } else if (move.effect?.type === "shield") {
      newPlayerTeam[currentPlayerIdx].shieldActive = true;
      newPlayerTeam[currentPlayerIdx].shieldValue = move.effect.value;
      newPlayerTeam[currentPlayerIdx].shieldTurns = move.effect.duration || 2;
      newLog.push(`🛡️ ${currentPlayer.name} tạo khiên ${move.effect.value}!`);
    } else if (move.type === "tackle" || move.type === "skill" || move.type === "ultimate") {
      const comboMult = 1 + newPlayerTeam[currentPlayerIdx].comboStreak * 0.05;
      const { dmg, isCrit, notes } = calcDamage(currentPlayer, currentBoss, move.power, comboMult);
      const adv = getElementAdvantage(currentPlayer.elementId, currentBoss.elementId);
      const finalDmg = adv ? Math.floor(dmg * adv.mult) : dmg;
      newBossTeam[currentBossIdx].hp -= finalDmg;
      newPlayerTeam[currentPlayerIdx].totalDamage += finalDmg;
      newPlayerTeam[currentPlayerIdx].comboStreak++;
      newPlayerTeam[currentPlayerIdx].ultimateCharge = Math.min(100, newPlayerTeam[currentPlayerIdx].ultimateCharge + (move.type === "ultimate" ? 50 : 15));
      totalDmgDealt += finalDmg;

      if (newPlayerTeam[currentPlayerIdx].comboStreak > maxCombo) setMaxCombo(newPlayerTeam[currentPlayerIdx].comboStreak);

      let msg = `⚔️ ${currentPlayer.name} dùng ${move.name} → ${finalDmg} sát thương!`;
      if (isCrit) msg += " 💥 Chí mạng!";
      if (adv) msg += ` (${adv.label})`;
      newLog.push(msg);

      if (move.energyCost > 0) {
        newPlayerTeam[currentPlayerIdx].energy -= move.energyCost;
      }
      newPlayerTeam[currentPlayerIdx].energy = Math.min(newPlayerTeam[currentPlayerIdx].maxEnergy, newPlayerTeam[currentPlayerIdx].energy + 8);
    }

    // Check if boss defeated
    if (newBossTeam[currentBossIdx].hp <= 0) {
      newBossTeam[currentBossIdx].isAlive = false;
      newLog.push(`🏆 ${currentBoss.name} đã bị đánh bại!`);
      setPlayerTeam(newPlayerTeam);
      setBossTeam(newBossTeam);
      setLog(newLog);
      setTotalDamage(newTotalDamage + totalDmgDealt);
      setStage("reward");
      generateRewards();
      return;
    }

    // Boss turn
    setTimeout(() => {
      const bossCard = newBossTeam[currentBossIdx];
      const alivePlayers = newPlayerTeam.filter((c) => c.isAlive);
      if (alivePlayers.length === 0) {
        setPlayerTeam(newPlayerTeam);
        setBossTeam(newBossTeam);
        setLog(newLog);
        setStage("gameover");
        return;
      }

      // Boss AI: pick random alive player and attack
      const targetIdx = newPlayerTeam.findIndex((c) => c.isAlive);
      if (targetIdx >= 0) {
        const bossMove = bossCard.moves[0]; // Tackle
        const { dmg, isCrit } = calcDamage(bossCard, newPlayerTeam[targetIdx], bossMove.power);
        newPlayerTeam[targetIdx].hp -= dmg;
        newLog.push(`👹 ${bossCard.name} phản công → ${dmg} sát thương lên ${newPlayerTeam[targetIdx].name}${isCrit ? " 💥 Chí mạng!" : ""}`);

        if (newPlayerTeam[targetIdx].hp <= 0) {
          newPlayerTeam[targetIdx].isAlive = false;
          newLog.push(`💀 ${newPlayerTeam[targetIdx].name} đã ngã xuống!`);
        }
      }

      // Reduce cooldowns, update states
      newPlayerTeam.forEach((c) => {
        if (c.dodgeCooldown > 0) c.dodgeCooldown--;
        if (c.dodgeCooldown === 0) c.dodgeActive = false;
        if (c.shieldTurns > 0) {
          c.shieldTurns--;
          if (c.shieldTurns === 0) { c.shieldActive = false; c.shieldValue = 0; }
        }
        if (c.stunned > 0) c.stunned--;
      });
      newPlayerTeam[currentPlayerIdx].comboStreak = 0;

      setTurnCount((t) => t + 1);
      setPlayerTeam(newPlayerTeam);
      setBossTeam(newBossTeam);
      setLog(newLog);
      setTotalDamage(newTotalDamage + totalDmgDealt);
      setTurn("idle");

      // Check player team wiped
      const stillAlive = newPlayerTeam.filter((c) => c.isAlive);
      if (stillAlive.length === 0) {
        setTimeout(() => setStage("gameover"), 500);
      }
    }, 600);
  }, [selectedMove, currentPlayer, currentBoss, playerTeam, bossTeam, currentPlayerIdx, log, totalDamage, maxCombo]);

  useEffect(() => {
    if (turn === "animating" && selectedMove === null) {
      executeMove();
    }
  }, [turn, selectedMove, executeMove]);

  // ─── Reward Generation ───────────────────────────────────────────────────────
  const generateRewards = () => {
    // Offer 3 cards to choose from (from user's collection not in deck)
    const availableCards = shuffle(userCards.filter((id) => !deck.includes(id))).slice(0, 6);
    const offeredCards = availableCards.slice(0, 3);
    const offeredPowerUps = shuffle(POWER_UPS).slice(0, 2);
    setRewardOptions({ cards: offeredCards, powerUps: offeredPowerUps });
  };

  const handleSelectReward = (type: "card" | "powerup", id: string | number) => {
    if (type === "card") {
      setDeck((d) => [...d, id as number]);
    } else {
      setPowerUps((p) => [...p, id as string]);
    }

    const nextFloor = floor + 1;
    if (nextFloor > FLOOR_COUNT) {
      setStage("victory");
      return;
    }
    setFloor(nextFloor);

    // Load next boss
    const boss = BOSS_POOL[Math.floor(Math.random() * BOSS_POOL.length)];
    const bossDef = buildBattleCard(boss.id, nextFloor + 1, BOSS_HP_MULTS[nextFloor - 1], BOSS_ATK_MULTS[nextFloor - 1]);
    bossDef.name = boss.name;
    bossDef.elementId = boss.element;

    setBossTeam([bossDef]);
    setPlayerTeam((team) => team.map((c) => ({ ...c, hp: Math.min(c.maxHp, c.hp + 30), energy: 100 })));
    setLog([`⚔️ Tầng ${nextFloor}: ${boss.name} xuất hiện!`]);
    setTurnCount(0);
    setStage("battle");
  };

  const handleFinishRun = () => {
    const reward = calculateRunReward();
    onReward(reward);
    onClose();
  };

  const calculateRunReward = () => {
    return floor * 50 + Math.floor(totalDamage / 10);
  };

  // ─── Auto-switch to next alive player ────────────────────────────────────────
  useEffect(() => {
    if (stage === "battle" && turn === "idle") {
      const aliveIdx = playerTeam.findIndex((c) => c.isAlive);
      if (aliveIdx >= 0 && aliveIdx !== currentPlayerIdx) {
        setCurrentPlayerIdx(aliveIdx);
      }
    }
  }, [playerTeam, stage, turn, currentPlayerIdx]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="h-full w-full max-w-2xl overflow-y-auto"
      >
        {/* ── Header ── */}
        <div className={`px-4 py-3 flex items-center justify-between ${stage === "victory" ? "bg-gradient-to-r from-amber-400 to-orange-500" : stage === "gameover" ? "bg-gradient-to-r from-slate-700 to-slate-800" : "bg-gradient-to-r from-red-600 via-orange-500 to-red-600"}`}>
          <div className="flex items-center gap-2">
            {stage !== "intro" && (
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30">
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="font-black text-white">Chế Độ Sinh Tồn</h2>
              {stage !== "intro" && <p className="text-[10px] font-bold text-white/60">Tầng {floor}/5 · {FLOOR_NAMES[floor - 1]}</p>}
            </div>
          </div>
          {stage === "battle" && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white">Hiệp {turnCount}</span>
              <button onClick={() => { setStage("intro"); setFloor(1); setDeck([]); setPowerUps([]); setTotalDamage(0); setMaxCombo(0); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-900 min-h-[calc(100%-56px)] p-4 space-y-4">
          <AnimatePresence mode="wait">
            {/* ── INTRO / DECK BUILDING ── */}
            {stage === "intro" && (
              <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center mb-6">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-900/50">
                    <Skull size={32} className="text-red-400" />
                  </div>
                  <h3 className="mb-2 text-2xl font-black text-white">Thử Thách Sinh Tồn</h3>
                  <p className="text-sm text-slate-400">Vượt qua 5 tầng dungeon, đánh bại 5 boss để nhận phần thưởng lớn</p>
                </div>

                {/* Rules */}
                <div className="mb-6 space-y-2">
                  {[
                    ["🃏", "Bắt đầu với 5 lá bài ngẫu nhiên"],
                    ["⚔️", "Mỗi tầng có 1 boss với HP tăng dần"],
                    ["🎁", "Chiến thắng mỗi boss nhận thêm bài hoặc năng lực"],
                    ["🏆", "Qua 5 tầng = phần thưởng lớn nhất"],
                  ].map(([icon, text]) => (
                    <div key={text} className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-300">
                      <span className="text-xl">{icon}</span> {text}
                    </div>
                  ))}
                </div>

                {/* Deck preview */}
                <div className="mb-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Bộ bài của bạn (sẽ chọn ngẫu nhiên 5 lá)</p>
                  <div className="flex flex-wrap gap-2">
                    {(userCards.length > 0 ? shuffle(userCards).slice(0, 5) : [1, 2, 3, 4, 5]).map((id) => {
                      const card = getCardById(id);
                      return (
                        <div key={id} className="flex h-14 w-10 items-center justify-center rounded-lg bg-slate-800 text-[10px] font-bold text-slate-400">
                          {card ? card.name.slice(0, 8) : `#${id}`}
                        </div>
                      );
                    })}
                  </div>
                  {userCards.length === 0 && (
                    <p className="mt-1 text-xs text-slate-500">Chưa có bài? Hệ thống sẽ tạo deck demo</p>
                  )}
                </div>

                <Button onClick={handleStart} size="lg" className="w-full gap-2" variant="primary">
                  <Play size={18} /> Bắt đầu cuộc chiến
                </Button>
              </motion.div>
            )}

            {/* ── BATTLE ── */}
            {stage === "battle" && currentBoss && currentPlayer && (
              <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Boss HP bar */}
                <div className="rounded-2xl border border-red-800 bg-red-950/50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-900/60 text-lg">
                        {currentBoss.elementId === "plastic" ? "🛢️" : currentBoss.elementId === "hazard" ? "☠️" : currentBoss.elementId === "organic" ? "🌿" : currentBoss.elementId === "metal" ? "🥫" : currentBoss.elementId === "glass" ? "🫙" : "📦"}
                      </div>
                      <div>
                        <p className="font-black text-red-300">{currentBoss.name}</p>
                        <p className="text-[10px] font-bold text-red-500/60">Boss · Tầng {floor}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-red-300">{Math.max(0, currentBoss.hp)}/{currentBoss.maxHp}</p>
                      <p className="text-[10px] font-bold text-red-500">HP</p>
                    </div>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-red-900/60">
                    <motion.div
                      animate={{ width: `${Math.max(0, (currentBoss.hp / currentBoss.maxHp) * 100)}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500"
                    />
                  </div>
                </div>

                {/* Turn info */}
                <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2">
                  <span className="text-xs font-bold text-slate-400">Lượt: {currentPlayer.name}</span>
                  <span className="text-xs font-bold text-slate-400">
                    Energy: {currentPlayer.energy}/{currentPlayer.maxEnergy} ⚡
                  </span>
                </div>

                {/* Player cards */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {playerTeam.map((card, i) => (
                    <div
                      key={card.id}
                      onClick={() => card.isAlive && setCurrentPlayerIdx(i)}
                      className={`relative flex-shrink-0 cursor-pointer rounded-xl border-2 p-3 text-center transition-all ${i === currentPlayerIdx ? "border-emerald-400 bg-emerald-950/40" : card.isAlive ? "border-slate-700 bg-slate-800 hover:border-slate-600" : "border-slate-800 bg-slate-900 opacity-40"}`}
                    >
                      <div className="mb-1 text-xl">{card.elementId === "plastic" ? "🛢️" : card.elementId === "hazard" ? "☠️" : card.elementId === "organic" ? "🌿" : card.elementId === "metal" ? "🥫" : card.elementId === "glass" ? "🫙" : "📦"}</div>
                      <p className="text-[10px] font-bold text-slate-300">{card.name.slice(0, 10)}</p>
                      <p className="text-[10px] font-black text-red-400">{Math.max(0, card.hp)}/{card.maxHp}</p>
                      {!card.isAlive && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60"><span className="text-lg">💀</span></div>}
                    </div>
                  ))}
                </div>

                {/* Move buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {currentPlayer.moves.map((move) => {
                    const canAfford = move.energyCost <= currentPlayer.energy;
                    const onCooldown = move.currentCooldown > 0;
                    const stunned = currentPlayer.stunned > 0;
                    const disabled = !canAfford || onCooldown || stunned || turn !== "idle";
                    return (
                      <button
                        key={move.id}
                        onClick={() => !disabled && handleSelectMove(move)}
                        disabled={disabled}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all ${disabled ? "border-slate-700 bg-slate-800/50 text-slate-600" : "border-slate-600 bg-slate-800 text-slate-200 hover:border-emerald-500 hover:bg-slate-700 active:scale-95"}`}
                      >
                        <span className="text-xl">{move.icon}</span>
                        <span className="text-xs font-bold">{move.name}</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {move.energyCost > 0 ? `${move.energyCost}⚡` : "0⚡"}
                          {onCooldown ? ` · CD:${move.currentCooldown}` : ""}
                        </span>
                        {move.power > 0 && <span className="text-[10px] font-black text-amber-400">{move.power} DMG</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Battle log */}
                <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-3">
                  {log.slice(-6).map((entry, i) => (
                    <p key={i} className="text-xs text-slate-400">{entry}</p>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── REWARD ── */}
            {stage === "reward" && rewardOptions && (
              <motion.div key="reward" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }} className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
                  <Award size={32} className="text-amber-400" />
                </motion.div>
                <h3 className="mb-1 text-2xl font-black text-amber-400">Chiến Thắng!</h3>
                <p className="mb-6 text-sm text-slate-400">Đánh bại {currentBoss?.name}</p>

                <p className="mb-4 font-black text-slate-300">Chọn phần thưởng:</p>

                <div className="mb-6 space-y-3">
                  {/* Cards */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Thẻ bài</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      {rewardOptions.cards.map((cardId) => {
                        const card = getCardById(cardId);
                        return (
                          <button key={cardId} onClick={() => handleSelectReward("card", cardId)}
                            className="group flex flex-col items-center gap-1 rounded-2xl border-2 border-slate-700 bg-slate-800 p-3 transition-all hover:border-amber-500 hover:bg-slate-700 active:scale-95">
                            <span className="text-3xl">{card?.elementId === "plastic" ? "🛢️" : "📦"}</span>
                            <span className="text-xs font-bold text-slate-300">{card?.name || `#${cardId}`}</span>
                            <span className="text-[10px] text-slate-500">+1 lá bài</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Power-ups */}
                  {rewardOptions.powerUps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Năng lực</p>
                      <div className="flex gap-3 justify-center flex-wrap">
                        {rewardOptions.powerUps.map((pu) => {
                          const Icon = pu.icon;
                          return (
                            <button key={pu.id} onClick={() => handleSelectReward("powerup", pu.id)}
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

                <p className="text-xs text-slate-500">
                  {floor < FLOOR_COUNT ? `Tiến lên tầng ${floor + 1} · ${FLOOR_NAMES[floor]}` : "Tầng cuối cùng!"}
                </p>
              </motion.div>
            )}

            {/* ── GAME OVER ── */}
            {stage === "gameover" && (
              <motion.div key="gameover" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800">
                  <span className="text-5xl">💀</span>
                </div>
                <h3 className="mb-2 text-2xl font-black text-slate-400">Thất Bại!</h3>
                <p className="mb-6 text-sm text-slate-500">Đội hình đã bị tiêu diệt</p>

                <div className="mb-6 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <p className="text-2xl font-black text-red-400">{Math.max(0, floor - 1)}</p>
                    <p className="text-[10px] font-bold text-slate-500">Tầng đã qua</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <p className="text-2xl font-black text-amber-400">{Math.floor(totalDamage)}</p>
                    <p className="text-[10px] font-bold text-slate-500">Tổng sát thương</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <p className="text-2xl font-black text-purple-400">{maxCombo}</p>
                    <p className="text-[10px] font-bold text-slate-500">Combo cao nhất</p>
                  </div>
                </div>

                <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <p className="mb-1 text-xs font-bold text-slate-500">Phần thưởng khôi phục</p>
                  <p className="text-xl font-black text-emerald-400">+{calculateRunReward()} EXP</p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => { setStage("intro"); setFloor(1); setDeck([]); setPowerUps([]); setTotalDamage(0); setMaxCombo(0); }} variant="secondary" className="flex-1 gap-1">
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
                  <Trophy size={40} className="text-white" />
                </motion.div>

                <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="mb-2 text-3xl font-black text-amber-400">
                  HOÀN THÀNH!
                </motion.h3>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="mb-2 text-lg font-bold text-slate-300">
                  Qua toàn bộ 5 tầng dungeon!
                </motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="mb-6 text-sm text-slate-500">
                  {playerTeam.length} lá bài · {powerUps.length} năng lực
                </motion.p>

                {/* Stats */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  className="mb-6 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-3">
                    <p className="text-2xl font-black text-amber-400">{Math.floor(totalDamage)}</p>
                    <p className="text-[10px] font-bold text-amber-600">Tổng sát thương</p>
                  </div>
                  <div className="rounded-xl border border-purple-800 bg-purple-950/40 p-3">
                    <p className="text-2xl font-black text-purple-400">{maxCombo}</p>
                    <p className="text-[10px] font-bold text-purple-600">Combo cao nhất</p>
                  </div>
                  <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3">
                    <p className="text-2xl font-black text-emerald-400">+{calculateRunReward()}</p>
                    <p className="text-[10px] font-bold text-emerald-600">EXP nhận được</p>
                  </div>
                </motion.div>

                {/* Deck */}
                {deck.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                    className="mb-6">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Bộ bài hoàn thành</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {deck.map((id) => {
                        const card = getCardById(id);
                        return (
                          <div key={id} className="flex h-12 w-8 items-center justify-center rounded-lg bg-slate-800 text-[10px] font-bold text-slate-400">
                            {card?.name?.slice(0, 8) || `#${id}`}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                <Button onClick={handleFinishRun} size="lg" className="w-full gap-2" variant="primary">
                  <Gem size={18} /> Nhận {calculateRunReward()} EXP
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
