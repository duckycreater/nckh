export interface UserProgress {
  flashcardsRead: number[];
  flashcardCounts: Record<string, number>;
  flashcardNames: Record<number, string>;
  checkins: number[];
  traded: number[];
  challengesCompleted: number[];
  guildDonated: boolean;
  crafted: (string | number)[];
  purchased: (string | number)[];
  streakDays?: number;
  lastUpdateDate: string;
  shards?: number;
  stamina?: number;
  maxStamina?: number;
  totalStars?: number;
}

export interface User {
  nick: string;
  name: string;
  account_id: string;
  points: number;
  email?: string;
  fullName?: string;
  classGrade?: string;
  hasPlayed?: boolean;
  progress?: UserProgress;
  role?: string;
  selectedAvatar?: string;
  selectedFrame?: string;
  customAvatarUrl?: string;
  level?: number;
  totalExpEarned?: number;
  unlockedRegions?: string[];
  currentRegion?: string;
  // Research fields
  dominantProfile?: string;
  personalityMode?: string;
  engagementScore?: number;
  createdAt?: string;
  lastActive?: string;
}

export interface RewardItem {
  id: string | number;
  name: string;
  desc: string;
  cost: number;
  ingredients: string[];
  imageUrl: string;
  color: string;
  bgClass: string;
  borderClass: string;
}

// Research types
export interface BehavioralProfile {
  profile: string;
  confidence: number;
  metrics?: Record<string, number>;
}

export interface PersonalityInfo {
  personality_mode: string;
  round_id?: number;
  current_round?: number;
}

export interface DecayState {
  userId: string;
  engagementScore: number;
  trend: number;
  streakStability: number;
  featureDiversity: number;
  daysSinceLogin: number;
  isDecaying: boolean;
  decaySeverity: "none" | "mild" | "moderate" | "severe";
}

export interface SimulationResult {
  userId: string;
  predictionType: string;
  predictedValue: number;
  confidence: number;
  horizonDays: number;
  reasoning: string;
  factors: Record<string, number>;
}

export interface ResearchDashboardData {
  totalUsers: number;
  totalEvents: number;
  activeUsers7d: number;
  avgSessionDurationSeconds: number;
  personalityDistribution: { personality_mode: string; count: string }[];
  profileDistribution: { profile_type: string; count: string }[];
}

export interface InterventionEffectiveness {
  intervention_type: string;
  count: string;
  avg_effectiveness: number;
}

export interface WeeklyReflection {
  userId?: string;
  reflectionText: string;
  weekNumber?: number;
  weekStart?: string;
  weekEnd?: string;
  message?: string;
}

// Vision pipeline types
export interface AIModelMetrics {
  model: string;
  totalInferences: number;
  avgLatencyMs: number;
  fps: number;
  accuracy: number;
}

export interface ConfusionMatrixData {
  matrix: Record<string, Record<string, number>>;
  labels: string[];
  overallAccuracy: number;
  perClassMetrics: Record<string, { precision: number; recall: number; f1: number; support: number }>;
}

// Experiment types
export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  groups: ExperimentGroup[];
  metrics: string[];
  status: string;
}

export interface ExperimentGroup {
  name: string;
  description: string;
  features: string[];
  ratio: number;
}

// Social network types
export interface SocialMetrics {
  userId: string;
  degreeCentrality: number;
  pageRank: number;
  communityId: number | null;
}

export interface CommunityStats {
  communityId: number;
  size: number;
  avgRetention: number;
  avgEngagement: number;
}

// Longitudinal types
export interface SurvivalData {
  week: number;
  weekLabel: string;
  survivalRate: number;
  atRisk: number;
  events: number;
  hazardRate: number;
}

// ─── PvP Arena Types ──────────────────────────────────────────────────────────
export interface PvPMatch {
  id: string;
  challengerId: string;
  opponentId: string;
  challengerName: string;
  opponentName: string;
  challengerWager: number;
  opponentWager: number;
  winnerId?: string;
  challengerResult?: "win" | "lose" | "pending";
  opponentResult?: "win" | "lose" | "pending";
  stake: number; // total EXP pool (wager * 2)
  status: "matched" | "battle" | "completed";
  createdAt: number;
  updatedAt: number;
  rounds: PvPRound[];
}

export interface PvPRound {
  round: number;
  playerScore: number;
  opponentScore: number;
  winner: "player" | "opponent" | "draw";
}

export interface PvPMatchmakingResult {
  matchId: string;
  opponentId: string;
  opponentName: string;
  opponentPoints: number;
  stake: number;
  status: "matched";
}

// ─── Weekly Tournament Types ───────────────────────────────────────────────────
export interface Tournament {
  id: string;
  weekStart: string; // ISO date
  weekEnd: string;   // ISO date
  status: "upcoming" | "active" | "completed";
  participants: TournamentParticipant[];
  bracket: TournamentBracket | null;
  rewards: TournamentRewards;
}

export interface TournamentParticipant {
  userId: string;
  name: string;
  points: number;
  joinedAt: number;
  weeklyScore: number;
}

export interface TournamentBracket {
  rounds: TournamentRound[];
}

export interface TournamentRound {
  round: number;
  name: string;
  matches: TournamentMatch[];
}

export interface TournamentMatch {
  id: string;
  player1Id: string;
  player1Name: string;
  player2Id: string | null;
  player2Name: string | null;
  winnerId?: string;
  status: "pending" | "live" | "completed";
  player1Score?: number;
  player2Score?: number;
  scheduledAt?: number;
}

export interface TournamentRewards {
  first: { exp: number; badgeId: string; badgeName: string };
  second: { exp: number };
  third: { exp: number };
  top8: { exp: number };
}

export interface TournamentStatus {
  tournament: Tournament | null;
  userJoined: boolean;
  userPosition: number | null;
  timeRemaining: string | null;
}

// ─── Clan System ────────────────────────────────────────────────────────────────
export interface Clan {
  id: string;
  name: string;
  tag: string;          // short tag like "ECO", "BIN"
  leaderId: string;
  memberIds: string[];
  exp: number;          // total clan EXP
  level: number;
  bio: string;
  createdAt: number;
  weeklyDonations: number;
  weeklyGoal: number;   // target donations for the week
  avatarSeed: string;  // for generated avatar
}

export interface ClanMember {
  userId: string;
  nick: string;
  role: "owner" | "officer" | "member";
  expContributed: number;   // total EXP donated to clan
  weeklyDonation: number;   // this week's donation
  joinedAt: number;
  level: number;
}

export interface ClanQuest {
  id: string;
  clanId: string;
  desc: string;
  descVi: string;
  target: number;
  progress: number;
  reward: number;   // EXP reward for completion
  completed: boolean;
  expiresAt: number;
}

export interface ClanMessage {
  id: string;
  clanId: string;
  userId: string;
  nick: string;
  text: string;
  createdAt: number;
}
