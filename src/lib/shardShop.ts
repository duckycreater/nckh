export const SHARD_XP_REWARDS = {
  xp_50: { cost: 5, xpBonus: 50 },
  xp_200: { cost: 15, xpBonus: 200 },
  xp_1000: { cost: 60, xpBonus: 1000 },
} as const;

export const SHARD_CARD_REWARDS = {
  shard_rare_1: { cost: 20, rarity: "rare", element: "plastic", cardId: 181 },
  shard_rare_2: { cost: 20, rarity: "rare", element: "organic", cardId: 241 },
  shard_epic_1: { cost: 50, rarity: "epic", element: "hazard", cardId: 279 },
  shard_epic_2: { cost: 50, rarity: "epic", element: "metal", cardId: 284 },
  shard_legendary: { cost: 120, rarity: "legendary", element: "organic", cardId: 297 },
} as const;

export const SHARD_ITEM_COSTS: Readonly<Record<string, number>> = Object.fromEntries(
  [...Object.entries(SHARD_XP_REWARDS), ...Object.entries(SHARD_CARD_REWARDS)].map(([id, item]) => [
    id,
    item.cost,
  ]),
);
