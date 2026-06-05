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
}

export interface User {
  nick: string;
  name: string;
  account_id: string;
  points: number;
  hasPlayed?: boolean;
  progress?: UserProgress;
  role?: string;
  selectedAvatar?: string;
  selectedFrame?: string;
  customAvatarUrl?: string;
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
