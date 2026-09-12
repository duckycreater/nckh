// Canonical server-side card metadata used by authenticated card endpoints.
// IDs, elements, and rarities deliberately match src/lib/cards.tsx.

export const CARD_TOTAL = 420;
export const NORMAL_GACHA_MAX_CARD_ID = 408;

export type CardRarityId = "common" | "rare" | "epic" | "legendary" | "mythical" | "event";

export const CARD_ELEMENTS = [
  { id: "plastic", name: "Nhựa", icon: "🧴" },
  { id: "paper", name: "Giấy", icon: "📰" },
  { id: "glass", name: "Thủy Tinh", icon: "🫙" },
  { id: "metal", name: "Kim Loại", icon: "🥫" },
  { id: "organic", name: "Hữu Cơ", icon: "🍎" },
  { id: "hazard", name: "Nguy Hại", icon: "🔋" },
  { id: "energy", name: "Năng Lượng", icon: "⚡" },
  { id: "water", name: "Nước", icon: "💧" },
  { id: "tech", name: "Công Nghệ", icon: "🤖" },
] as const;

export const CARD_RARITIES: ReadonlyArray<{
  id: CardRarityId;
  name: string;
  weight: number;
}> = [
  { id: "common", name: "Phổ thông", weight: 0.65 },
  { id: "rare", name: "Hiếm", weight: 0.26 },
  { id: "epic", name: "Sử thi", weight: 0.085 },
  { id: "legendary", name: "Huyền thoại", weight: 0.004 },
  { id: "mythical", name: "Thần thoại", weight: 0.001 },
];

type ElementId = (typeof CARD_ELEMENTS)[number]["id"];

const SPECIAL_ELEMENT_RANGES: ReadonlyArray<readonly [number, number, ElementId]> = [
  [271, 275, "plastic"],
  [276, 278, "organic"],
  [279, 281, "hazard"],
  [282, 283, "glass"],
  [284, 285, "metal"],
  [286, 288, "paper"],
  [289, 290, "metal"],
  [291, 293, "glass"],
  [294, 294, "metal"],
  [295, 295, "paper"],
  [296, 296, "glass"],
  [297, 297, "organic"],
  [298, 298, "metal"],
  [299, 299, "glass"],
  [300, 300, "metal"],
  [301, 310, "energy"],
  [311, 320, "water"],
  [321, 330, "tech"],
  [331, 335, "energy"],
  [336, 340, "tech"],
  [341, 345, "water"],
  [346, 348, "tech"],
  [349, 350, "energy"],
  [351, 352, "water"],
  [353, 354, "tech"],
  [355, 357, "water"],
  [358, 358, "tech"],
  [359, 362, "energy"],
  [363, 364, "tech"],
  [365, 366, "water"],
  [367, 367, "energy"],
  [368, 368, "tech"],
  [369, 369, "water"],
  [370, 370, "energy"],
  [371, 371, "water"],
  [372, 372, "tech"],
  [373, 373, "energy"],
  [374, 374, "water"],
  [375, 375, "tech"],
  [376, 376, "energy"],
  [377, 377, "water"],
  [378, 378, "tech"],
  [379, 380, "energy"],
  [381, 381, "water"],
  [382, 382, "tech"],
  [383, 383, "water"],
  [384, 384, "energy"],
  [385, 385, "tech"],
  [386, 386, "water"],
  [387, 387, "energy"],
  [388, 388, "tech"],
  [389, 389, "water"],
  [390, 392, "energy"],
  [393, 394, "water"],
  [395, 396, "tech"],
  [397, 397, "energy"],
  [398, 398, "water"],
  [399, 399, "tech"],
  [400, 400, "energy"],
  [401, 401, "water"],
  [402, 402, "tech"],
  [403, 403, "energy"],
  [404, 404, "water"],
  [405, 405, "tech"],
  [406, 406, "energy"],
  [407, 407, "water"],
  [408, 408, "tech"],
  [409, 409, "hazard"],
  [410, 410, "metal"],
  [411, 411, "organic"],
  [412, 412, "hazard"],
  [413, 413, "metal"],
  [414, 414, "water"],
  [415, 415, "glass"],
  [416, 416, "paper"],
  [417, 417, "hazard"],
  [418, 418, "metal"],
  [419, 419, "organic"],
  [420, 420, "plastic"],
];

function assertCardId(id: number): void {
  if (!Number.isInteger(id) || id < 1 || id > CARD_TOTAL) {
    throw new RangeError(`Card id must be between 1 and ${CARD_TOTAL}`);
  }
}

export function getCanonicalRarity(id: number): CardRarityId {
  assertCardId(id);
  if (id <= 180 || (id >= 301 && id <= 330)) return "common";
  if ((id >= 181 && id <= 270) || (id >= 331 && id <= 360)) return "rare";
  if ((id >= 271 && id <= 294) || (id >= 361 && id <= 390)) return "epic";
  if (id <= 300) return "legendary";
  if (id <= 408) return "mythical";
  return "event";
}

export function getCanonicalElement(id: number): ElementId {
  assertCardId(id);
  if (id <= 180) return CARD_ELEMENTS[Math.floor((id - 1) / 30)].id;
  if (id <= 270) return CARD_ELEMENTS[Math.floor((id - 181) / 15)].id;
  const match = SPECIAL_ELEMENT_RANGES.find(([start, end]) => id >= start && id <= end);
  return match?.[2] ?? "plastic";
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateServerCard(id: number) {
  const rarityId = getCanonicalRarity(id);
  const elementId = getCanonicalElement(id);
  const element = CARD_ELEMENTS.find((candidate) => candidate.id === elementId)!;
  const rarity = CARD_RARITIES.find((candidate) => candidate.id === rarityId) ?? {
    id: rarityId,
    name: rarityId === "event" ? "Sự kiện" : "Thần thoại",
    weight: 0,
  };
  const multiplier = {
    common: 1,
    rare: 1.2,
    epic: 1.5,
    legendary: 1.9,
    mythical: 2.15,
    event: 2.25,
  }[rarityId];
  const baseHp = Math.floor(seededRandom(id * 5.5) * 70) + 30;
  const baseAtk = Math.floor(seededRandom(id * 6.6) * 38) + 12;

  return {
    id,
    // The browser resolves the localized canonical title from this stable id.
    name: `BMO Card #${String(id).padStart(3, "0")}`,
    elementId,
    elementName: element.name,
    elementIcon: element.icon,
    rarityId,
    rarityName: rarity.name,
    hp: Math.floor(baseHp * multiplier),
    atk: Math.floor(baseAtk * multiplier),
  };
}

const GACHA_POOLS: Record<Exclude<CardRarityId, "event">, number[]> = {
  common: [],
  rare: [],
  epic: [],
  legendary: [],
  mythical: [],
};
for (let id = 1; id <= NORMAL_GACHA_MAX_CARD_ID; id += 1) {
  GACHA_POOLS[getCanonicalRarity(id) as keyof typeof GACHA_POOLS].push(id);
}

function randomRarity(): Exclude<CardRarityId, "event"> {
  const roll = Math.random();
  let cumulative = 0;
  for (const rarity of CARD_RARITIES) {
    cumulative += rarity.weight;
    if (roll < cumulative) return rarity.id as Exclude<CardRarityId, "event">;
  }
  return "common";
}

export function resolveGacha(unlockedCardIds: number[], pullCount = 0): number {
  const PITY_EPIC = 30;
  const PITY_LEGENDARY = 100;
  const rarity: Exclude<CardRarityId, "event"> =
    pullCount > 0 && pullCount % PITY_LEGENDARY === 0
      ? "legendary"
      : pullCount > 0 && pullCount % PITY_EPIC === 0
        ? "epic"
        : randomRarity();
  const fullPool = GACHA_POOLS[rarity];
  const unlocked = new Set(unlockedCardIds);
  const lockedPool = fullPool.filter((id) => !unlocked.has(id));
  const pool = lockedPool.length > 0 && Math.random() < 0.7 ? lockedPool : fullPool;
  return pool[Math.floor(Math.random() * pool.length)];
}
