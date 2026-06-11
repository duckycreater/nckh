// ─── Achievement Registry ─────────────────────────────────────────────────────────
// All achievements in the game. Each has a condition evaluator that returns true
// when the achievement should be unlocked for a given user.

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";
export type AchievementCategory = "daily" | "battle" | "collection" | "social" | "streak" | "special";

export interface Achievement {
  id: string;
  title: string;           // English name
  titleVi: string;         // Vietnamese name
  desc: string;            // English description
  descVi: string;          // Vietnamese description
  icon: string;            // Emoji or icon
  expReward: number;
  rarity: AchievementRarity;
  category: AchievementCategory;
  secret?: boolean;         // If true, only title shows until unlocked
  condition: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  points: number;
  streakDays: number;
  cardsOwned: number;
  totalCards: number;
  battlesWon: number;
  quizzesCompleted: number;
  challengesCompleted: number;
  aisScansDone: number;
  craftingDone: number;
  pvpMatchesWon: number;
  pvpMatchesPlayed: number;
  daysActive: number;
  level: number;
  perfectBattles: number;
  comboMax: number;
  gemsOwned: number;
  clanId?: string;
  lastUpdated: string;
}

// ─── Rarity colors & borders ────────────────────────────────────────────────────
export const RARITY_CONFIG: Record<AchievementRarity, { glow: string; border: string; labelColor: string }> = {
  common:    { glow: "rgba(148,163,184,0.3)",   border: "border-slate-400/40",   labelColor: "text-slate-400" },
  rare:      { glow: "rgba(59,130,246,0.4)",   border: "border-blue-400/50",   labelColor: "text-blue-400" },
  epic:      { glow: "rgba(139,92,246,0.5)",   border: "border-purple-400/60", labelColor: "text-purple-400" },
  legendary: { glow: "rgba(245,158,11,0.6)",   border: "border-amber-400/70",  labelColor: "text-amber-400" },
};

// ─── Dynamic combo label ──────────────────────────────────────────────────────────
export function getComboLabel(combo: number): string {
  if (combo >= 15) return "GODLIKE!";
  if (combo >= 10) return "INCREDIBLE!";
  if (combo >= 7)  return "AMAZING!";
  if (combo >= 5)  return "GREAT!";
  if (combo >= 3)  return "NICE!";
  return "";
}

// ─── All achievements ────────────────────────────────────────────────────────────
export const ALL_ACHIEVEMENTS: Achievement[] = [
  // ── STREAK ─────────────────────────────────────────────────────────────────
  {
    id: "streak_3",
    title: "Three-Day Streak",
    titleVi: "Ba Ngày Liên Tiếp",
    desc: "Logged in 3 days in a row.",
    descVi: "Đăng nhập 3 ngày liên tiếp.",
    icon: "🔥",
    expReward: 25,
    rarity: "common",
    category: "streak",
    condition: (c) => c.streakDays >= 3,
  },
  {
    id: "streak_7",
    title: "Week Warrior",
    titleVi: "Chiến Binh Tuần",
    desc: "Maintained a 7-day login streak.",
    descVi: "Giữ chuỗi đăng nhập 7 ngày liên tiếp.",
    icon: "⚡",
    expReward: 75,
    rarity: "rare",
    category: "streak",
    condition: (c) => c.streakDays >= 7,
  },
  {
    id: "streak_30",
    title: "Monthly Master",
    titleVi: "Bậc Thầy Hàng Tháng",
    desc: "Maintained a 30-day login streak.",
    descVi: "Giữ chuỗi đăng nhập 30 ngày liên tiếp.",
    icon: "👑",
    expReward: 500,
    rarity: "epic",
    category: "streak",
    condition: (c) => c.streakDays >= 30,
  },
  {
    id: "streak_100",
    title: "Legendary Dedication",
    titleVi: "Tận Tâm Huyền Thoại",
    desc: "Maintained a 100-day login streak.",
    descVi: "Giữ chuỗi đăng nhập 100 ngày liên tiếp.",
    icon: "🏆",
    expReward: 2000,
    rarity: "legendary",
    category: "streak",
    condition: (c) => c.streakDays >= 100,
  },

  // ── BATTLE ─────────────────────────────────────────────────────────────────
  {
    id: "battle_first_win",
    title: "First Victory",
    titleVi: "Chiến Thắng Đầu Tiên",
    desc: "Won your first Card Battle.",
    descVi: "Chiến thắng trận Card Battle đầu tiên.",
    icon: "⚔️",
    expReward: 20,
    rarity: "common",
    category: "battle",
    condition: (c) => c.battlesWon >= 1,
  },
  {
    id: "battle_10_wins",
    title: "Battle Veteran",
    titleVi: "Cựu Chiến Binh",
    desc: "Won 10 Card Battles.",
    descVi: "Chiến thắng 10 trận Card Battle.",
    icon: "🛡️",
    expReward: 100,
    rarity: "rare",
    category: "battle",
    condition: (c) => c.battlesWon >= 10,
  },
  {
    id: "battle_perfect",
    title: "Perfectionist",
    titleVi: "Người Hoàn Hảo",
    desc: "Won a battle without taking any damage.",
    descVi: "Chiến thắng một trận mà không nhận sát thương nào.",
    icon: "💎",
    expReward: 50,
    rarity: "epic",
    category: "battle",
    condition: (c) => c.perfectBattles >= 1,
  },
  {
    id: "battle_combo_10",
    title: "Combo Master",
    titleVi: "Bậc Thầy Combo",
    desc: "Achieved a 10-hit combo.",
    descVi: "Đạt combo 10 lần liên tiếp.",
    icon: "💥",
    expReward: 75,
    rarity: "rare",
    category: "battle",
    condition: (c) => c.comboMax >= 10,
  },
  {
    id: "battle_combo_20",
    title: "Combo Legend",
    titleVi: "Huyền Thoại Combo",
    desc: "Achieved a 20-hit combo.",
    descVi: "Đạt combo 20 lần liên tiếp.",
    icon: "🌟",
    expReward: 200,
    rarity: "legendary",
    category: "battle",
    condition: (c) => c.comboMax >= 20,
  },

  // ── COLLECTION ──────────────────────────────────────────────────────────────
  {
    id: "collect_10_cards",
    title: "Card Collector",
    titleVi: "Người Sưu Tập",
    desc: "Own 10 different cards.",
    descVi: "Sở hữu 10 lá bài khác nhau.",
    icon: "🃏",
    expReward: 30,
    rarity: "common",
    category: "collection",
    condition: (c) => c.cardsOwned >= 10,
  },
  {
    id: "collect_25_cards",
    title: "Card Enthusiast",
    titleVi: "Người Yêu Bài",
    desc: "Own 25 different cards.",
    descVi: "Sở hữu 25 lá bài khác nhau.",
    icon: "🎴",
    expReward: 100,
    rarity: "rare",
    category: "collection",
    condition: (c) => c.cardsOwned >= 25,
  },
  {
    id: "collect_all_cards",
    title: "Complete Collection",
    titleVi: "Bộ Sưu Tập Hoàn Chỉnh",
    desc: "Own every card in the game.",
    descVi: "Sở hữu tất cả các lá bài trong game.",
    icon: "🌈",
    expReward: 1000,
    rarity: "legendary",
    category: "collection",
    condition: (c) => c.totalCards > 0 && c.cardsOwned >= c.totalCards,
  },

  // ── DAILY ───────────────────────────────────────────────────────────────────
  {
    id: "daily_all_challenges",
    title: "Mission Complete",
    titleVi: "Nhiệm Vụ Hoàn Thành",
    desc: "Completed all daily challenges in one day.",
    descVi: "Hoàn thành tất cả nhiệm vụ hàng ngày trong một ngày.",
    icon: "📜",
    expReward: 20,
    rarity: "common",
    category: "daily",
    condition: (c) => c.challengesCompleted >= 3,
  },
  {
    id: "daily_ai_scan",
    title: "AI Pioneer",
    titleVi: "Tiên Phong AI",
    desc: "Used AI Scanner for the first time.",
    descVi: "Sử dụng AI Scanner lần đầu tiên.",
    icon: "🤖",
    expReward: 10,
    rarity: "common",
    category: "daily",
    condition: (c) => c.aisScansDone >= 1,
  },
  {
    id: "daily_quiz_master",
    title: "Quiz Master",
    titleVi: "Bậc Thầy Trắc Nghiệm",
    desc: "Completed 10 quizzes with 100% accuracy.",
    descVi: "Hoàn thành 10 bài quiz với độ chính xác 100%.",
    icon: "🧠",
    expReward: 100,
    rarity: "rare",
    category: "daily",
    condition: (c) => c.quizzesCompleted >= 10,
  },

  // ── PROGRESSION ──────────────────────────────────────────────────────────────
  {
    id: "level_5",
    title: "Rising Star",
    titleVi: "Ngôi Sao Đang Lên",
    desc: "Reached Level 5.",
    descVi: "Đạt cấp 5.",
    icon: "⭐",
    expReward: 50,
    rarity: "common",
    category: "special",
    condition: (c) => c.level >= 5,
  },
  {
    id: "level_10",
    title: "Dedicated Champion",
    titleVi: "Nhà Vô Địch Tận Tâm",
    desc: "Reached Level 10.",
    descVi: "Đạt cấp 10.",
    icon: "🌟",
    expReward: 200,
    rarity: "rare",
    category: "special",
    condition: (c) => c.level >= 10,
  },
  {
    id: "points_1000",
    title: "Point Hunter",
    titleVi: "Thợ Săn Điểm",
    desc: "Earned 1,000 total EXP.",
    descVi: "Tích lũy 1.000 EXP.",
    icon: "🎯",
    expReward: 100,
    rarity: "common",
    category: "special",
    condition: (c) => c.points >= 1000,
  },
  {
    id: "points_5000",
    title: "Point Legend",
    titleVi: "Huyền Thoại Điểm Số",
    desc: "Earned 5,000 total EXP.",
    descVi: "Tích lũy 5.000 EXP.",
    icon: "💫",
    expReward: 500,
    rarity: "epic",
    category: "special",
    condition: (c) => c.points >= 5000,
  },

  // ── SOCIAL ───────────────────────────────────────────────────────────────────
  {
    id: "social_first_pvp",
    title: "First Challenger",
    titleVi: "Người Thách Thức",
    desc: "Played your first PvP match.",
    descVi: "Chơi trận PvP đầu tiên.",
    icon: "🎮",
    expReward: 20,
    rarity: "common",
    category: "social",
    condition: (c) => c.pvpMatchesPlayed >= 1,
  },
  {
    id: "social_pvp_win",
    title: "PvP Winner",
    titleVi: "Người Thắng PvP",
    desc: "Won your first PvP match.",
    descVi: "Thắng trận PvP đầu tiên.",
    icon: "🏅",
    expReward: 50,
    rarity: "rare",
    category: "social",
    condition: (c) => c.pvpMatchesWon >= 1,
  },
  {
    id: "social_clan_join",
    title: "Clan Member",
    titleVi: "Thành Viên Clan",
    desc: "Joined a clan.",
    descVi: "Tham gia một clan.",
    icon: "👥",
    expReward: 30,
    rarity: "common",
    category: "social",
    condition: (c) => !!c.clanId,
  },
  {
    id: "social_clan_donor",
    title: "Generous Member",
    titleVi: "Thành Viên Hào Phóng",
    desc: "Donated 500 EXP to your clan.",
    descVi: "Đóng góp 500 EXP cho clan.",
    icon: "💝",
    expReward: 100,
    rarity: "rare",
    category: "social",
    condition: (c) => false, // TODO: track clanDonated separately
  },
];

// ─── Helper: Build context from user data ──────────────────────────────────────
export function buildAchievementContext(user: {
  points: number;
  progress?: {
    challengesCompleted?: number[];
    crafted?: (string | number)[];
    shards?: number;
    streakDays?: number;
  };
  createdAt?: string;
}): AchievementContext {
  const now = Date.now();
  const createdMs = user.createdAt ? new Date(user.createdAt).getTime() : now;
  const daysActive = Math.max(1, Math.floor((now - createdMs) / (1000 * 60 * 60 * 24)));

  return {
    points: user.points,
    streakDays: user.progress?.streakDays ?? 0,
    cardsOwned: 0,           // Filled by Flashcards component
    totalCards: 0,           // Filled by Flashcards component
    battlesWon: 0,           // Filled by CardBattle component
    quizzesCompleted: 0,      // Filled by Minigame component
    challengesCompleted: user.progress?.challengesCompleted?.length ?? 0,
    aisScansDone: 0,         // Filled by AIScanner component
    craftingDone: user.progress?.crafted?.length ?? 0,
    pvpMatchesWon: 0,
    pvpMatchesPlayed: 0,
    daysActive,
    level: Math.floor(user.points / 200) + 1,
    perfectBattles: 0,
    comboMax: 0,
    gemsOwned: 0,
    clanId: undefined,
    lastUpdated: new Date().toISOString(),
  };
}

// ─── Filter achievements by category ────────────────────────────────────────────
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ALL_ACHIEVEMENTS.filter((a) => a.category === category);
}
