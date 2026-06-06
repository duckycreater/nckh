export const TOTAL_CARDS = 300;

// ─── Element definitions ───────────────────────────────────────────────────
export const ELEMENTS = [
  {
    id: "plastic",
    name: "Nhựa",
    nameShort: "Plastic",
    bg: "bg-cyan-500",
    text: "text-cyan-600",
    gradient: "from-cyan-300 via-blue-400 to-indigo-500",
    accent: "#06b6d4",
    description: "Rác thải nhựa nguy hại nhất môi trường",
  },
  {
    id: "paper",
    name: "Giấy",
    nameShort: "Paper",
    bg: "bg-yellow-500",
    text: "text-yellow-600",
    gradient: "from-amber-200 via-yellow-400 to-orange-400",
    accent: "#f59e0b",
    description: "Giấy, bìa các-tông có thể tái chế",
  },
  {
    id: "glass",
    name: "Thủy Tinh",
    nameShort: "Glass",
    bg: "bg-teal-500",
    text: "text-teal-600",
    gradient: "from-teal-300 via-emerald-400 to-green-500",
    accent: "#14b8a6",
    description: "Chai lọ thủy tinh, thân thiện môi trường",
  },
  {
    id: "metal",
    name: "Kim Loại",
    nameShort: "Metal",
    bg: "bg-slate-400",
    text: "text-slate-600",
    gradient: "from-slate-300 via-gray-400 to-zinc-500",
    accent: "#64748b",
    description: "Lon nhôm, vỏ hộp kim loại có thể tái chế",
  },
  {
    id: "organic",
    name: "Hữu Cơ",
    nameShort: "Organic",
    bg: "bg-green-500",
    text: "text-green-600",
    gradient: "from-green-300 via-emerald-400 to-teal-500",
    accent: "#22c55e",
    description: "Thức ăn thừa, phế phẩm nông nghiệp",
  },
  {
    id: "hazard",
    name: "Nguy Hại",
    nameShort: "Hazard",
    bg: "bg-red-500",
    text: "text-red-600",
    gradient: "from-red-300 via-rose-400 to-red-500",
    accent: "#ef4444",
    description: "Pin, thuốc trừ sâu, vật liệu nguy hại",
  },
];

// ─── Rarity definitions ────────────────────────────────────────────────────
export const RARITIES = [
  {
    id: "common",
    name: "Phổ thông",
    nameShort: "Common",
    chance: 0.6,
    borderColor: "border-slate-300",
    shadowColor: "shadow-slate-300/40",
    glowColor: "shadow-slate-400/30",
    bgGradient: "from-slate-100 to-gray-100",
    borderStyle: "border border-slate-300",
    frameAccent: "#94a3b8",
    atkMult: 1,
    hpMult: 1,
    atkColor: "text-slate-600",
    hpColor: "text-slate-600",
    bannerBg: "bg-slate-200",
    bannerText: "text-slate-600",
    starCount: 1,
    badgeTone: "default" as const,
  },
  {
    id: "rare",
    name: "Hiếm",
    nameShort: "Rare",
    chance: 0.85,
    borderColor: "border-blue-400",
    shadowColor: "shadow-blue-400/50",
    glowColor: "shadow-blue-500/40",
    bgGradient: "from-blue-50 to-indigo-100",
    borderStyle: "border-2 border-blue-400",
    frameAccent: "#3b82f6",
    atkMult: 1.15,
    hpMult: 1.15,
    atkColor: "text-blue-600",
    hpColor: "text-blue-600",
    bannerBg: "bg-blue-100",
    bannerText: "text-blue-700",
    starCount: 2,
    badgeTone: "accent" as const,
  },
  {
    id: "epic",
    name: "Sử thi",
    nameShort: "Epic",
    chance: 0.96,
    borderColor: "border-purple-400",
    shadowColor: "shadow-purple-400/60",
    glowColor: "shadow-purple-500/50",
    bgGradient: "from-purple-50 to-pink-100",
    borderStyle: "border-2 border-purple-400",
    frameAccent: "#a855f7",
    atkMult: 1.35,
    hpMult: 1.35,
    atkColor: "text-purple-600",
    hpColor: "text-purple-600",
    bannerBg: "bg-purple-100",
    bannerText: "text-purple-700",
    starCount: 3,
    badgeTone: "warning" as const,
  },
  {
    id: "legendary",
    name: "Huyền thoại",
    nameShort: "Legendary",
    chance: 1.0,
    borderColor: "border-yellow-400",
    shadowColor: "shadow-yellow-400/70",
    glowColor: "shadow-amber-500/60",
    bgGradient: "from-amber-50 to-orange-100",
    borderStyle: "border-2 border-yellow-400",
    frameAccent: "#f59e0b",
    atkMult: 1.6,
    hpMult: 1.6,
    atkColor: "text-amber-600",
    hpColor: "text-amber-600",
    bannerBg: "bg-amber-100",
    bannerText: "text-amber-700",
    starCount: 4,
    badgeTone: "success" as const,
    hasShimmer: true,
  },
];

// ─── Card data generation ──────────────────────────────────────────────────
const TRASH_NAMES = [
  "Chai Nhựa", "Lon Nhôm", "Túi Nilon", "Bìa Cát-tông", "Lõi Giấy",
  "Hộp Sữa", "Pin Cũ", "Lốp Xe", "Bo Mạch", "Vỏ Lon",
  "Ống Hút", "Bóng Đèn", "Nắp Chai", "Lõi Than", "Mảnh Ghế",
  "Vỏ Trứng", "Vỏ Cam", "Lõi Trà", "Vỏ Dừa", "Giấy Báo",
];
const ADJECTIVES = [
  "Tái Sinh", "Độc Hại", "Gỉ Sét", "Siêu Cứng", "Phân Hủy",
  "Bốc Mùi", "Biến Dạng", "Quật Khởi", "Tái Chế", "Khổng Lồ",
  "Hóa Thạch", "Bức Xạ", "Lân Trinh", "Nguyên Sinh", "Bạc Màu",
];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateCard(id: number) {
  const rngElement = seededRandom(id * 1.5);
  const element = ELEMENTS[Math.floor(rngElement * ELEMENTS.length)];

  const rngRarity = seededRandom(id * 2.2);
  let rarity = RARITIES[0];
  for (const r of RARITIES) {
    if (rngRarity <= r.chance) { rarity = r; break; }
  }

  const nameIdx = Math.floor(seededRandom(id * 3.3) * TRASH_NAMES.length);
  const adjIdx = Math.floor(seededRandom(id * 4.4) * ADJECTIVES.length);

  const baseHp = Math.floor(seededRandom(id * 5.5) * 100) + 20;
  const baseAtk = Math.floor(seededRandom(id * 6.6) * 50) + 10;

  return {
    id,
    name: `${TRASH_NAMES[nameIdx]} ${ADJECTIVES[adjIdx]}`,
    element,
    rarity,
    hp: Math.floor(baseHp * rarity.hpMult),
    atk: Math.floor(baseAtk * rarity.atkMult),
  };
}

export const ALL_CARDS = Array.from({ length: TOTAL_CARDS }, (_, i) => generateCard(i + 1));

// ─── Element Counter (rock-paper-scissors style) ─────────────────────────────
//   → advantage deals +50% dmg, disadvantage deals -25% dmg
export const ELEMENT_COUNTER: Record<string, string> = {
  plastic: "organic",   // plastic entangles organic
  organic: "hazard",   // organic absorbs hazard
  hazard: "plastic",    // hazard pollutes plastic
  paper: "plastic",    // paper protects from plastic
  metal: "paper",      // metal rusts from paper moisture
  glass: "metal",      // glass scratches metal
};
export function getAdvantage(elementId: string): string | null {
  const counteredBy = Object.entries(ELEMENT_COUNTER).find(([, v]) => v === elementId)?.[0];
  return counteredBy ?? null;
}
export function getDisadvantage(elementId: string): string | null {
  return ELEMENT_COUNTER[elementId] ?? null;
}
export function calcDamage(atk: number, attackerEl: string, defenderEl: string): number {
  const adv = getAdvantage(attackerEl);
  const dis = getDisadvantage(attackerEl);
  let mult = 1;
  if (adv === defenderEl) mult = 1.5;
  else if (dis === defenderEl) mult = 0.75;
  return Math.floor(atk * mult * (0.8 + Math.random() * 0.4));
}
export function calcPower(card: any, level = 1): number {
  return Math.floor((card.atk + card.hp) * level * (card.rarity.id === "legendary" ? 1.2 : card.rarity.id === "epic" ? 1.1 : card.rarity.id === "rare" ? 1.05 : 1));
}
export function getXpForLevel(level: number): number {
  return level * level * 50; // level 1→2=50, 2→3=200, 3→4=450, 4→5=800...
}
export function getFusedXp(cost: number): number {
  return Math.floor(cost * 0.3);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
export function getElementIcon(id: string, size = 40) {
  const iconProps = { width: size, height: size, viewBox: "0 0 40 40", fill: "none" };
  switch (id) {
    case "plastic":  return <svg {...iconProps}><circle cx="20" cy="20" r="14" fill="#e0f2fe" stroke="#06b6d4" strokeWidth="2"/><path d="M14 28V16a2 2 0 012-2h8a2 2 0 012 2v12" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"/><path d="M20 14V12a4 4 0 00-4-4" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"/><path d="M20 12a4 4 0 014-4" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"/></svg>;
    case "paper":     return <svg {...iconProps}><rect x="10" y="8" width="20" height="24" rx="2" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2"/><path d="M14 14h12M14 18h12M14 22h8" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/><path d="M17 8V6a2 2 0 012-2h2a2 2 0 012 2v2" stroke="#f59e0b" strokeWidth="2"/></svg>;
    case "glass":     return <svg {...iconProps}><path d="M13 32V14l7-8 7 8v18" fill="#d1fae5" stroke="#14b8a6" strokeWidth="2" strokeLinejoin="round"/><path d="M13 14h14" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round"/><path d="M16 20h8M16 25h5" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round"/></svg>;
    case "metal":     return <svg {...iconProps}><ellipse cx="20" cy="12" rx="8" ry="4" fill="#f1f5f9" stroke="#64748b" strokeWidth="2"/><path d="M12 12v16c0 2.2 3.6 4 8 4s8-1.8 8-4V12" fill="#e2e8f0" stroke="#64748b" strokeWidth="2"/><path d="M15 18h10M15 23h7" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/></svg>;
    case "organic":   return <svg {...iconProps}><circle cx="20" cy="20" r="12" fill="#dcfce7" stroke="#22c55e" strokeWidth="2"/><path d="M20 14c-1-3 2-5 4-4s2 4 0 6-4 3-5 1" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/><path d="M20 22v4M18 24h4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/></svg>;
    case "hazard":    return <svg {...iconProps}><rect x="11" y="15" width="18" height="12" rx="2" fill="#fee2e2" stroke="#ef4444" strokeWidth="2"/><path d="M17 15V13a3 3 0 016 0v2" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/><path d="M13 19h14M13 23h14" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/><circle cx="20" cy="21" r="1.5" fill="#ef4444"/></svg>;
    default:          return <svg {...iconProps}><circle cx="20" cy="20" r="12" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2"/></svg>;
  }
}
