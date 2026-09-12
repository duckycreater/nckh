export interface CardOwnershipSnapshot {
  ids: number[];
  counts: Record<string, number>;
  debugUnlockRemoved: boolean;
}

const DEFAULT_CARD_TOTAL = 420;
const DEBUG_UNLOCK_COPY_COUNT = 3;

function validCardId(value: unknown, totalCards: number): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id >= 1 && id <= totalCards ? id : null;
}

/**
 * Convert legacy card progress into one canonical ownership snapshot.
 *
 * Older builds stored ownership in `flashcardsRead`, while newer builds also
 * keep an explicit positive copy count. The removed development endpoint had
 * a unique signature: every card was written with exactly three copies. That
 * state must never leak into a normal account.
 */
export function normalizeCardOwnership(
  rawRead: unknown,
  rawCounts: unknown,
  totalCards = DEFAULT_CARD_TOTAL,
): CardOwnershipSnapshot {
  const readIds = new Set<number>();
  if (Array.isArray(rawRead)) {
    for (const value of rawRead) {
      const id = validCardId(value, totalCards);
      if (id !== null) readIds.add(id);
    }
  }

  const explicitCounts: Record<string, number> = {};
  if (rawCounts && typeof rawCounts === "object" && !Array.isArray(rawCounts)) {
    for (const [key, value] of Object.entries(rawCounts as Record<string, unknown>)) {
      const id = validCardId(key, totalCards);
      const count = Math.trunc(Number(value));
      if (id !== null && Number.isFinite(count) && count > 0) {
        explicitCounts[String(id)] = Math.min(count, 999);
      }
    }
  }

  const hasEveryReadId =
    readIds.size === totalCards &&
    Array.from({ length: totalCards }, (_, index) => index + 1).every((id) => readIds.has(id));
  const countEntries = Object.entries(explicitCounts);
  const hasDebugCounts =
    countEntries.length === totalCards &&
    countEntries.every(([, count]) => count === DEBUG_UNLOCK_COPY_COUNT);
  const legacyReadOnlyDebugUnlock = hasEveryReadId && countEntries.length === 0;

  if (hasEveryReadId && (hasDebugCounts || legacyReadOnlyDebugUnlock)) {
    return { ids: [], counts: {}, debugUnlockRemoved: true };
  }

  for (const id of readIds) {
    explicitCounts[String(id)] ??= 1;
  }

  const ids = Object.keys(explicitCounts)
    .map(Number)
    .sort((left, right) => left - right);
  return { ids, counts: explicitCounts, debugUnlockRemoved: false };
}
