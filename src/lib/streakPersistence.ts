// Streak persistence helpers - cache streak data in localStorage
// to protect against backend sync gaps and enable offline-aware UI.

export interface CachedStreak {
  streakDays: number;
  lastDate: string;
}

const KEY_PREFIX = "ecoquest_streak_";

export function saveStreakToCache(nickname: string, streakDays: number, lastDate: string) {
  try {
    localStorage.setItem(
      `${KEY_PREFIX}${nickname}`,
      JSON.stringify({ streakDays, lastDate })
    );
  } catch {
    // localStorage may be unavailable in some environments
  }
}

export function getStreakFromCache(nickname: string): CachedStreak | null {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${nickname}`);
    if (!raw) return null;
    return JSON.parse(raw) as CachedStreak;
  } catch {
    return null;
  }
}

export function getStreakMultiplier(streakDays: number): number {
  return Math.min(1 + (streakDays - 1) * 0.1, 2);
}

export function isStreakAtRisk(nickname: string): boolean {
  const cached = getStreakFromCache(nickname);
  if (!cached) return false;
  const today = new Date().toDateString();
  if (cached.lastDate === today) return false;
  return cached.streakDays > 1;
}

export function clearStreakCache(nickname: string) {
  try {
    localStorage.removeItem(`${KEY_PREFIX}${nickname}`);
  } catch {}
}
