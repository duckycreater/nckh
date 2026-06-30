/**
 * Family Mode types - CayGiaPha_NhanThuc Phase F1
 *
 * Multi-user household: a parent creates a family, invites members
 * (kids, spouse, roommates), shares eco-progress, competes in
 * household challenges, and tracks combined carbon footprint.
 */

export interface Family {
  id: string;
  name: string;                  // e.g. "Gia đình anh Minh"
  inviteCode: string;            // 6-char code for joining
  createdBy: string;             // userId of creator
  createdAt: number;
  avatarSeed: string;            // for generated avatar
  region: string;                // province/region (for carbon factors)
  householdSize: number;         // denormalized count
  weeklyGoal: number;            // total household scans/week target
}

export interface FamilyMember {
  familyId: string;
  userId: string;
  role: "parent" | "child" | "spouse" | "roommate" | "guest";
  joinedAt: number;
  contributionsWeekly: number;   // scans this week
  contributionsTotal: number;    // total scans ever
  isActive: boolean;             // logged in within 7 days
}

export interface FamilyChallenge {
  id: string;
  familyId: string;
  title: string;
  description: string;
  type: "total_scans" | "category_diversity" | "streak_combined" | "co2_saved";
  target: number;
  progress: number;
  startAt: number;
  endAt: number;
  reward: number;                // EXP per member on completion
  completed: boolean;
  createdBy: string;
}

export interface FamilyCarbonStats {
  familyId: string;
  weekStart: string;             // ISO date Monday
  totalCo2Kg: number;            // kg CO2 avoided
  totalWasteKg: number;          // kg waste sorted correctly (estimate)
  perCategory: {
    plastic: number;
    paper: number;
    glass: number;
    metal: number;
    organic: number;
    hazard: number;
  };
  perMember: Array<{
    userId: string;
    displayName: string;
    co2Kg: number;
    scans: number;
  }>;
  treesEquivalent: number;       // trees/year equivalent of CO2 saved
  comparedToLastWeek: number;    // percentage change vs prev week
}

export interface FamilyLeaderboard {
  familyId: string;
  rank: number;
  percentile: number;
  totalFamilies: number;
  familyName: string;
  householdSize: number;
  weeklyCo2: number;
}
