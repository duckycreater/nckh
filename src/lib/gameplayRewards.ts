export const CARD_BATTLE_REWARDS = [30, 60, 120, 200, 500] as const;
export const ROGUELIKE_FLOOR_REWARD = 80;
export const MAX_ROGUELIKE_FLOOR = 5;

export type GameplayRewardClaim =
  | { action: "ai_scan_local" }
  | { action: "garden_pet" }
  | { action: "garden_clean" }
  | { action: "card_battle"; level: number }
  | { action: "roguelike"; floor: number };

export interface ResolvedGameplayReward {
  action: GameplayRewardClaim["action"];
  points: number;
  reason: string;
  dailyScope: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Resolve a client-reported activity to a server-owned reward amount.
 * Raw point values are deliberately rejected: callers only report the activity.
 */
export function resolveGameplayRewardClaim(value: unknown): ResolvedGameplayReward | null {
  if (!isRecord(value) || "points" in value || typeof value.action !== "string") return null;

  switch (value.action) {
    case "ai_scan_local":
      // Offline inference is a preliminary hint, not verified evidence.
      return null;
    case "garden_pet":
      return {
        action: value.action,
        points: 3,
        reason: "Chăm sóc rùa biển",
        dailyScope: value.action,
      };
    case "garden_clean":
      return {
        action: value.action,
        points: 10,
        reason: "Dọn sạch trạm cứu hộ",
        dailyScope: value.action,
      };
    case "card_battle": {
      // The retired client-simulated battle cannot mint spendable points.
      return null;
    }
    case "roguelike": {
      // The retired client-simulated run cannot mint spendable points.
      return null;
    }
    default:
      return null;
  }
}
