export const TOTAL_CARDS = 300;

export const ELEMENTS = [
  { id: "plastic", name: "Nhựa", icon: "🧴", bg: "bg-cyan-500", text: "text-cyan-600", gradient: "from-cyan-300 to-blue-500" },
  { id: "paper", name: "Giấy", icon: "📰", bg: "bg-yellow-500", text: "text-yellow-600", gradient: "from-amber-200 to-yellow-500" },
  { id: "glass", name: "Thủy Tinh", icon: "🫙", bg: "bg-teal-500", text: "text-teal-600", gradient: "from-teal-300 to-emerald-500" },
  { id: "metal", name: "Kim Loại", icon: "🥫", bg: "bg-slate-400", text: "text-slate-600", gradient: "from-slate-300 to-gray-500" },
  { id: "organic", name: "Hữu Cơ", icon: "🍎", bg: "bg-green-500", text: "text-green-600", gradient: "from-green-300 to-emerald-500" },
  { id: "hazard", name: "Nguy Hại", icon: "🔋", bg: "bg-red-500", text: "text-red-600", gradient: "from-red-300 to-rose-500" },
];

export const RARITIES = [
  { id: "common", name: "Phổ thông", chance: 0.6, border: "border-gray-300", glow: "shadow-gray-200", shiny: false, hpMult: 1, atkMult: 1 },
  { id: "rare", name: "Hiếm", chance: 0.85, border: "border-blue-400", glow: "shadow-blue-400/50", shiny: false, hpMult: 1.2, atkMult: 1.2 },
  { id: "epic", name: "Sử thi", chance: 0.96, border: "border-purple-400", glow: "shadow-purple-500/60", shiny: false, hpMult: 1.5, atkMult: 1.5 },
  { id: "legendary", name: "Huyền thoại", chance: 1.0, border: "border-yellow-300", glow: "shadow-yellow-400/70", shiny: true, hpMult: 2, atkMult: 2 }
];

const TRASH_NAMES = ["Chai Nhựa", "Lon Nhôm", "Túi Nilon", "Bia Cát-tông", "Lõi Giấy", "Hộp Sữa", "Pin Cũ", "Lốp Xe", "Bo Mạch", "Vỏ Lon Cúc To", "Ống Hút", "Bóng Đèn", "Nắp Chai", "Lõi Than Trắng", "Mẩu Ghế Gãy"];
const ADJECTIVES = ["Tái Sinh", "Độc Hại", "Gỉ Sét", "Siêu Cứng", "Phân Hủy", "Bốc Mùi", "Biến Dạng", "Quật Khởi", "Tái Chế", "Khổng Lồ", "Hoá Thạch"];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateCard(id: number) {
  const rngElement = seededRandom(id * 1.5);
  const element = ELEMENTS[Math.floor(rngElement * ELEMENTS.length)];
  
  const rngRarity = seededRandom(id * 2.2);
  let rarity = RARITIES[0];
  for(let r of RARITIES) {
    if(rngRarity <= r.chance) { rarity = r; break; }
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
    atk: Math.floor(baseAtk * rarity.atkMult)
  };
}

export const ALL_CARDS = Array.from({length: TOTAL_CARDS}, (_, i) => generateCard(i + 1));
