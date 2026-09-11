const CHALLENGE_META = [
  { id: 1, rarity: "common", points: 10 },
  { id: 2, rarity: "hard", points: 20 },
  { id: 3, rarity: "common", points: 10 },
  { id: 4, rarity: "common", points: 15 },
  { id: 5, rarity: "hard", points: 20 },
  { id: 6, rarity: "common", points: 10 },
  { id: 7, rarity: "common", points: 10 },
] as const;

/** The deterministic daily set: one hard and two common challenges. */
export function getDailyChallengeIds(dayKey: string): number[] {
  const seed = dayKey.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const shuffled = [...CHALLENGE_META];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (i * 7 + seed) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  const hard = shuffled.find((challenge) => challenge.rarity === "hard");
  const commons = shuffled.filter((challenge) => challenge.rarity === "common");
  const selected: Array<number | undefined> = [hard?.id, commons[0]?.id, commons[1]?.id];
  return selected.filter((id): id is number => id !== undefined);
}

export function getDailyChallengeReward(id: number): number | null {
  return CHALLENGE_META.find((challenge) => challenge.id === id)?.points ?? null;
}
