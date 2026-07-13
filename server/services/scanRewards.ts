/**
 * server/services/scanRewards.ts
 *
 * D5: Server-authoritative scan rewards. The previous implementation let
 * the client compute `+50` on its own, which a motivated user could
 * trivially inflate by replaying scan requests. The fix is to make the
 * server:
 *
 *   1. Add the reward only after the AI call succeeds.
 *   2. Cap each user to SCAN_REWARD_DAILY_CAP successful scans / 24h
 *      (subsequent scans still work, but earn 0).
 *   3. Return the new points balance in the response, so the client
 *      can show the user the canonical value.
 *
 * The cap is enforced by a sliding window in `cache`. For multi-instance
 * deployments, the limit should be moved to Supabase; the in-memory
 * check is good enough for our single-server deployment.
 */
const SCAN_REWARD_POINTS = 50;
const SCAN_REWARD_DAILY_CAP = 20;

const cache = new Map<string, number[]>(); // nick -> sorted [ts, ts, …]

/**
 * Returns `{ awarded, totalToday, reason }`.
 *   awarded      — points to credit for this scan
 *   totalToday   — how many scans in the last 24h
 *   reason       — "ok" | "capped"
 */
export function decideScanReward(nick: string | undefined, now = Date.now()): {
  awarded: number;
  totalToday: number;
  reason: "ok" | "capped" | "no_user";
} {
  if (!nick) return { awarded: 0, totalToday: 0, reason: "no_user" };
  const cutoff = now - 24 * 60 * 60 * 1000;
  const arr = (cache.get(nick) ?? []).filter((t) => t > cutoff);
  if (arr.length >= SCAN_REWARD_DAILY_CAP) {
    cache.set(nick, arr);
    return { awarded: 0, totalToday: arr.length, reason: "capped" };
  }
  arr.push(now);
  cache.set(nick, arr);
  return { awarded: SCAN_REWARD_POINTS, totalToday: arr.length, reason: "ok" };
}

export function getScanRewardConfig() {
  return {
    points: SCAN_REWARD_POINTS,
    dailyCap: SCAN_REWARD_DAILY_CAP,
  };
}