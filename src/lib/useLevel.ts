/** ── Tier names (10 tiers, each covers 3 levels) ──────────────────── */
export const TIER_NAMES: Record<string, { short: string; full: string; emoji: string; color: string }> = {
  t1:  { short: "Newbie",       full: "Tân Binh",             emoji: "🌱", color: "text-emerald-500"  },
  t2:  { short: "Eco Scout",    full: "Thám Hiểm Viên",       emoji: "🌿", color: "text-emerald-600"  },
  t3:  { short: "Recycler",      full: "Người Tái Chế",         emoji: "♻️", color: "text-teal-500"    },
  t4:  { short: "Eco Warrior",   full: "Chiến Binh Xanh",       emoji: "🛡️", color: "text-blue-500"    },
  t5:  { short: "Earth Guard",   full: "Vệ Sĩ Trái Đất",       emoji: "🌍", color: "text-indigo-500"  },
  t6:  { short: "Planet Hero",   full: "Anh Hùng Hành Tinh",   emoji: "🌏", color: "text-violet-500" },
  t7:  { short: "Eco Master",    full: "Bậc Thầy Xanh",        emoji: "⚡", color: "text-purple-500" },
  t8:  { short: "Eco Legend",    full: "Huyền Thoại Xanh",      emoji: "✨", color: "text-amber-500"   },
  t9:  { short: "Gaia Deity",    full: "Thần Gaia",             emoji: "🌟", color: "text-pink-500"   },
  t10: { short: "Earth Guardian", full: "Vệ Binh Tối Cao",       emoji: "👑", color: "text-yellow-500" },
};

export const MAX_TIER = 10;
export const MAX_LEVEL = 30;

/** ── Exponential level thresholds ──────────────────────────────────
 * Level N requires this much TOTAL earned EXP.
 * Formula: floor(N^2 * 20) — quadratic growth
 * Level 1 = 0, Level 2 = 80, Level 5 = 500, Level 10 = 2000,
 * Level 15 = 4500, Level 20 = 8000, Level 25 = 12500, Level 30 = 18000
 */
export function getExpForLevel(level: number): number {
  return Math.floor(level * level * 20);
}

/** ── Level → tier key (every 3 levels = 1 tier) ─────────────────── */
export function levelToTier(level: number): string {
  return `t${Math.min(Math.ceil(level / 3), MAX_TIER)}`;
}

/** ── Calculate level from total earned EXP ───────────────────────── */
export function calculateLevel(totalExpEarned: number): {
  level: number;
  currentExpInLevel: number;
  expToNextLevel: number;
  progress: number;
  tier: string;
  tierData: typeof TIER_NAMES[string];
  isMaxLevel: boolean;
  nextTier: string | null;
  nextTierData: typeof TIER_NAMES[string] | null;
} {
  let level = 1;
  while (level < MAX_LEVEL && totalExpEarned >= getExpForLevel(level + 1)) {
    level++;
  }

  const tier = levelToTier(level);
  const currentExpInLevel = totalExpEarned - getExpForLevel(level);
  const expToNextLevel = getExpForLevel(level + 1) - getExpForLevel(level);
  const progress = expToNextLevel > 0 ? (currentExpInLevel / expToNextLevel) * 100 : 100;
  const isMaxLevel = level >= MAX_LEVEL;

  const nextTierNum = Math.ceil((level + 1) / 3);
  const nextTier = nextTierNum <= MAX_TIER ? `t${nextTierNum}` : null;

  return {
    level,
    currentExpInLevel,
    expToNextLevel,
    progress,
    tier,
    tierData: TIER_NAMES[tier] ?? TIER_NAMES.t1,
    isMaxLevel,
    nextTier,
    nextTierData: nextTier ? TIER_NAMES[nextTier] ?? null : null,
  };
}

/** ── EXP needed for next level ───────────────────────────────────── */
export function getExpForNextLevel(currentLevel: number): number {
  return getExpForLevel(currentLevel + 1);
}

/** ── Milestone definitions (15 milestones) ─────────────────────── */
export interface MilestoneDef {
  threshold: number;
  bonus: number;
  label: string;
  labelVi: string;
  tier: string;
}

export const MILESTONE_LEVELS: MilestoneDef[] = [
  { threshold: 20,     bonus: 5,     label: "First Leaf",      labelVi: "Chiếc Lá Đầu Tiên",      tier: "t1" },
  { threshold: 50,     bonus: 10,    label: "Growing Strong",   labelVi: "Phát Triển Mạnh Mẽ",       tier: "t2" },
  { threshold: 100,    bonus: 20,    label: "Getting Started", labelVi: "Bắt Đầu Hành Trình",       tier: "t2" },
  { threshold: 200,    bonus: 35,    label: "On Fire",         labelVi: "Nổi Lửa",                 tier: "t3" },
  { threshold: 380,    bonus: 50,    label: "Halfway Hero",   labelVi: "Anh Hùng Nửa Chặng",     tier: "t4" },
  { threshold: 500,    bonus: 75,    label: "Rising Star",    labelVi: "Ngôi Sao Đang Lên",        tier: "t5" },
  { threshold: 720,    bonus: 100,   label: "Dedicated",      labelVi: "Tận Tâm",                 tier: "t5" },
  { threshold: 1000,   bonus: 150,   label: "Elite",          labelVi: "Tinh Hoa",                 tier: "t6" },
  { threshold: 1500,   bonus: 200,   label: "Legend",        labelVi: "Huyền Thoại",             tier: "t7" },
  { threshold: 2500,   bonus: 300,   label: "Gaia Chosen",   labelVi: "Người Được Gaia Chọn",   tier: "t9" },
  { threshold: 4000,   bonus: 500,   label: "Earth Champion",labelVi: "Vô Địch Trái Đất",        tier: "t11" },
  { threshold: 6000,   bonus: 750,   label: "Eco Titan",     labelVi: "Titan Xanh",             tier: "t13" },
  { threshold: 9000,   bonus: 1000,  label: "Cosmic Eco",    labelVi: "Vũ Trụ Xanh",            tier: "t16" },
  { threshold: 13000,  bonus: 1500,  label: "Gaia Deity",   labelVi: "Thần Gaia",              tier: "t20" },
  { threshold: 18000,  bonus: 2000,  label: "Earth Guardian",labelVi: "Vệ Binh Tối Cao",        tier: "t25" },
];

export function getNextMilestone(totalExpEarned: number): MilestoneDef | null {
  return MILESTONE_LEVELS.find((m) => m.threshold > totalExpEarned) ?? null;
}

export function getCurrentMilestone(totalExpEarned: number): MilestoneDef | null {
  return [...MILESTONE_LEVELS].reverse().find((m) => totalExpEarned >= m.threshold) ?? null;
}

export function checkMilestones(oldExp: number, newExp: number): MilestoneDef[] {
  return MILESTONE_LEVELS.filter((m) => newExp >= m.threshold && oldExp < m.threshold);
}
