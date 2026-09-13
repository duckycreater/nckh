/** Server-authoritative, durable scan-reward policy. */
const SCAN_REWARD_POINTS = 50;
const SCAN_REWARD_DAILY_CAP = 20;
const SCAN_REWARD_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ScanRewardEntry {
  at: number;
  imageHash: string;
}

export interface ScanRewardDecision {
  awarded: number;
  totalToday: number;
  reason: "ok" | "capped" | "duplicate" | "no_user";
  history: ScanRewardEntry[];
}

/**
 * Pure policy function: callers persist the returned history with the user's
 * balance. A matching image hash is rewarded once per rolling 24-hour window,
 * and malformed legacy entries are discarded during every decision.
 */
export function decideScanReward(
  nick: string | undefined,
  storedHistory: readonly ScanRewardEntry[] | undefined,
  imageHash: string,
  now = Date.now(),
): ScanRewardDecision {
  if (!nick) return { awarded: 0, totalToday: 0, reason: "no_user", history: [] };

  const cutoff = now - SCAN_REWARD_WINDOW_MS;
  const history = (Array.isArray(storedHistory) ? storedHistory : [])
    .filter(
      (entry): entry is ScanRewardEntry =>
        Number.isFinite(entry?.at) &&
        entry.at > cutoff &&
        entry.at <= now &&
        typeof entry.imageHash === "string" &&
        entry.imageHash.length > 0,
    )
    .sort((a, b) => a.at - b.at)
    .slice(-SCAN_REWARD_DAILY_CAP);

  if (imageHash && history.some((entry) => entry.imageHash === imageHash)) {
    return { awarded: 0, totalToday: history.length, reason: "duplicate", history };
  }
  if (history.length >= SCAN_REWARD_DAILY_CAP) {
    return { awarded: 0, totalToday: history.length, reason: "capped", history };
  }

  const nextHistory = [...history, { at: now, imageHash }];
  return {
    awarded: SCAN_REWARD_POINTS,
    totalToday: nextHistory.length,
    reason: "ok",
    history: nextHistory,
  };
}

export function getScanRewardConfig() {
  return {
    points: SCAN_REWARD_POINTS,
    dailyCap: SCAN_REWARD_DAILY_CAP,
    windowHours: SCAN_REWARD_WINDOW_MS / (60 * 60 * 1000),
  };
}
