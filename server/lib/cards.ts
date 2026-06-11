// Server-side card generator (mirrors src/lib/cards.ts logic)
// Used by server for authenticated gacha resolution

export const CARD_TOTAL = 300;

export const CARD_ELEMENTS = [
  { id: "plastic", name: "Nhựa", icon: "🧴" },
  { id: "paper", name: "Giấy", icon: "📰" },
  { id: "glass", name: "Thủy Tinh", icon: "🫙" },
  { id: "metal", name: "Kim Loại", icon: "🥫" },
  { id: "organic", name: "Hữu Cơ", icon: "🍎" },
  { id: "hazard", name: "Nguy Hại", icon: "🔋" },
];

export const CARD_RARITIES = [
  { id: "common", name: "Phổ thông", chance: 0.6 },
  { id: "rare", name: "Hiếm", chance: 0.85 },
  { id: "epic", name: "Sử thi", chance: 0.96 },
  { id: "legendary", name: "Huyền thoại", chance: 1.0 },
];

const TRASH_NAMES = ["Chai Nhựa", "Lon Nhôm", "Túi Nilon", "Bia Cát-tông", "Lõi Giấy", "Hộp Sữa", "Pin Cũ", "Lốp Xe", "Bo Mạch", "Vỏ Lon Cúc To", "Ống Hút", "Bóng Đèn", "Nắp Chai", "Lõi Than Trắng", "Mẩu Ghế Gãy"];
const ADJECTIVES = ["Tái Sinh", "Độc Hại", "Gỉ Sét", "Siêu Cứng", "Phân Hủy", "Bốc Mùi", "Biến Dạng", "Quật Khởi", "Tái Chế", "Khổng Lồ", "Hoá Thạch"];

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateServerCard(id: number) {
  const rngElement = seededRandom(id * 1.5);
  const element = CARD_ELEMENTS[Math.floor(rngElement * CARD_ELEMENTS.length)];

  const rngRarity = seededRandom(id * 2.2);
  let rarity = CARD_RARITIES[0];
  for (const r of CARD_RARITIES) {
    if (rngRarity <= r.chance) { rarity = r; break; }
  }

  const nameIdx = Math.floor(seededRandom(id * 3.3) * TRASH_NAMES.length);
  const adjIdx = Math.floor(seededRandom(id * 4.4) * ADJECTIVES.length);
  const baseHp = Math.floor(seededRandom(id * 5.5) * 100) + 20;
  const baseAtk = Math.floor(seededRandom(id * 6.6) * 50) + 10;

  const hpMult = rarity.id === "common" ? 1 : rarity.id === "rare" ? 1.2 : rarity.id === "epic" ? 1.5 : 2;
  const atkMult = hpMult;

  return {
    id,
    name: `${TRASH_NAMES[nameIdx]} ${ADJECTIVES[adjIdx]}`,
    elementId: element.id,
    elementName: element.name,
    elementIcon: element.icon,
    rarityId: rarity.id,
    rarityName: rarity.name,
    hp: Math.floor(baseHp * hpMult),
    atk: Math.floor(baseAtk * atkMult),
  };
}

export function resolveGacha(unlockedCardIds: number[], pullCount: number = 0): number {
  // Pity system: guaranteed epic every PITY_EPIC pulls, legendary every PITY_LEGENDARY pulls
  const PITY_EPIC = 30;
  const PITY_LEGENDARY = 100;

  // Determine rarity tier based on pity
  let guaranteedRarity: string | null = null;
  if (pullCount > 0 && pullCount % PITY_LEGENDARY === 0) {
    guaranteedRarity = "legendary";
  } else if (pullCount > 0 && pullCount % PITY_EPIC === 0) {
    guaranteedRarity = "epic";
  }

  const lockedCards = [];
  const lockedByRarity: Record<string, number[]> = {};
  for (let i = 1; i <= CARD_TOTAL; i++) {
    if (!unlockedCardIds.includes(i)) {
      lockedCards.push(i);
      const rarityId = seededRandom(i * 2.2);
      let r = CARD_RARITIES[0];
      for (const rr of CARD_RARITIES) {
        if (rarityId <= rr.chance) { r = rr; break; }
      }
      if (!lockedByRarity[r.id]) lockedByRarity[r.id] = [];
      lockedByRarity[r.id].push(i);
    }
  }

  const pool = lockedCards.length > 0 && Math.random() > 0.3
    ? lockedCards
    : Array.from({ length: CARD_TOTAL }, (_, i) => i + 1);

  if (guaranteedRarity) {
    // Force from pity pool
    const pityPool = lockedByRarity[guaranteedRarity] || pool;
    return pityPool[Math.floor(Math.random() * pityPool.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
