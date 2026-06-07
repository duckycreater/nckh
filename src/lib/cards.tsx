import React, { ReactElement } from "react";

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
    defMult: 1,
    spdMult: 1,
    crtMult: 1,
    intMult: 1,
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
    defMult: 1.1,
    spdMult: 1.1,
    crtMult: 1.1,
    intMult: 1.1,
    atkColor: "text-blue-600",
    hpColor: "text-blue-600",
    bannerBg: "bg-blue-100",
    bannerText: "text-blue-700",
    starCount: 2,
    badgeTone: "accent" as const,
  },
  {
    id: "epic",
    name: "Siêu hiếm",
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
    defMult: 1.25,
    spdMult: 1.25,
    crtMult: 1.25,
    intMult: 1.25,
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
    defMult: 1.5,
    spdMult: 1.5,
    crtMult: 1.5,
    intMult: 1.5,
    atkColor: "text-amber-600",
    hpColor: "text-amber-600",
    bannerBg: "bg-amber-100",
    bannerText: "text-amber-700",
    starCount: 4,
    badgeTone: "success" as const,
    hasShimmer: true,
  },
];

// ─── Card Definition Interface ───────────────────────────────────────────────
export interface CardDef {
  id: number;
  name: string;
  subtitle: string;
  elementId: string;
  rarityId: string;
  atk: number;
  hp: number;
  def: number;
  spd: number;
  crt: number;
  int: number;
  abilityId: string;
  artVariant: number;
}

// ─── Ability Type ────────────────────────────────────────────────────────────
export type AbilityType = "passive" | "active" | "ultimate";

export interface Ability {
  id: string;
  name: string;
  type: AbilityType;
  desc: string;
  icon: string;
  power: number;
  effect: {
    type: "heal" | "shield" | "poison" | "reflect" | "crit_up" | "speed_up" | "drain" | "burst" | "regen" | "dodge" | "stun" | "buff";
    value: number;
    duration?: number;
  };
}

// ─── 60 Unique Abilities ─────────────────────────────────────────────────────
export const ALL_ABILITIES: Record<string, Ability> = {
  // DEFENSIVE abilities (def_01 to def_20)
  def_01: {
    id: "def_01", name: "Lớp Vỏ Bọc", type: "passive",
    desc: "Tăng 15% DEF khi HP dưới 50%",
    icon: "🛡️", power: 1,
    effect: { type: "shield", value: 15 }
  },
  def_02: {
    id: "def_02", name: "Khiên Chắn Vô Hình", type: "passive",
    desc: "Khối 20% sát thương từ đòn đầu tiên",
    icon: "🔮", power: 2,
    effect: { type: "shield", value: 20 }
  },
  def_03: {
    id: "def_03", name: "Giáp Sắt", type: "passive",
    desc: "Giảm 10% sát thương nhận vào mỗi lượt",
    icon: "⚔️", power: 2,
    effect: { type: "buff", value: 10 }
  },
  def_04: {
    id: "def_04", name: "Vách Ngăn Từ Trường", type: "active",
    desc: "Tạo lá chắn hấp thụ 30 sát thương",
    icon: "🧲", power: 3,
    effect: { type: "shield", value: 30 }
  },
  def_05: {
    id: "def_05", name: "Phản Chiếu Năng Lượng", type: "passive",
    desc: "Phản 15% sát thương vật lý lại kẻ địch",
    icon: "🔄", power: 3,
    effect: { type: "reflect", value: 15 }
  },
  def_06: {
    id: "def_06", name: "Lớp Nano Bảo Vệ", type: "passive",
    desc: "+8% DEF, miễn nhiễm hiệu ứng làm chậm",
    icon: "🧪", power: 2,
    effect: { type: "buff", value: 8 }
  },
  def_07: {
    id: "def_07", name: "Khiên Thủy Tinh", type: "active",
    desc: "Khối hoàn toàn sát thương trong 1 lượt",
    icon: "🪟", power: 4,
    effect: { type: "shield", value: 100 }
  },
  def_08: {
    id: "def_08", name: "Vỏ Sò Cứng", type: "passive",
    desc: "Nhận ít sát thương hơn từ đòn đánh thường",
    icon: "🐚", power: 1,
    effect: { type: "buff", value: 5 }
  },
  def_09: {
    id: "def_09", name: "Laze Phòng Thủ", type: "active",
    desc: "Triệt tiêu đòn tấn công tiếp theo",
    icon: "⚡", power: 3,
    effect: { type: "dodge", value: 100 }
  },
  def_10: {
    id: "def_10", name: "Màn Chắn Plasma", type: "active",
    desc: "Giảm 40% sát thương trong 2 lượt",
    icon: "🌊", power: 4,
    effect: { type: "shield", value: 40, duration: 2 }
  },
  def_11: {
    id: "def_11", name: "Lớp Cao Su Đàn Hồi", type: "passive",
    desc: "Bounce lại 10% sát thương phép",
    icon: "🔵", power: 2,
    effect: { type: "reflect", value: 10 }
  },
  def_12: {
    id: "def_12", name: "Giáp Kim Cương", type: "ultimate",
    desc: "Bất tử trong 1 lượt",
    icon: "💎", power: 5,
    effect: { type: "shield", value: 999, duration: 1 }
  },
  def_13: {
    id: "def_13", name: "Khiên Bức Xạ", type: "passive",
    desc: "Miễn nhiễm sát thương từ nguyên tố Nguy Hại",
    icon: "☢️", power: 3,
    effect: { type: "buff", value: 100 }
  },
  def_14: {
    id: "def_14", name: "Vách Gỗ Dày", type: "passive",
    desc: "+20% DEF khi đối mặt đơn thủ",
    icon: "🪵", power: 2,
    effect: { type: "buff", value: 20 }
  },
  def_15: {
    id: "def_15", name: "Lớp Bong Bóng", type: "active",
    desc: "Hấp thụ 25 sát thương + phản lại 10",
    icon: "🫧", power: 2,
    effect: { type: "shield", value: 25 }
  },
  def_16: {
    id: "def_16", name: "Phản Lực Cản", type: "passive",
    desc: "Giảm 12% sát thương từ kỹ năng",
    icon: "🚀", power: 3,
    effect: { type: "buff", value: 12 }
  },
  def_17: {
    id: "def_17", name: "Lớp Nhựa Tái Sinh", type: "passive",
    desc: "Hồi 5% HP mỗi lượt",
    icon: "♻️", power: 2,
    effect: { type: "regen", value: 5 }
  },
  def_18: {
    id: "def_18", name: "Thủy Tinh Cường Lực", type: "passive",
    desc: "+25% DEF nhưng -10% SPD",
    icon: "🏺", power: 3,
    effect: { type: "buff", value: 25 }
  },
  def_19: {
    id: "def_19", name: "Màn Nước Bảo Vệ", type: "active",
    desc: "Khối sát thương từ nguyên tố khắc chế",
    icon: "💧", power: 3,
    effect: { type: "shield", value: 50 }
  },
  def_20: {
    id: "def_20", name: "Lớp Vỏ Nguyên Thủy", type: "ultimate",
    desc: "Giảm 50% mọi sát thương trong 1 lượt",
    icon: "🌍", power: 5,
    effect: { type: "shield", value: 50, duration: 1 }
  },

  // OFFENSIVE abilities (off_01 to off_20)
  off_01: {
    id: "off_01", name: "Miếng Dao Thép", type: "passive",
    desc: "+20% ATK khi HP trên 80%",
    icon: "🔪", power: 1,
    effect: { type: "buff", value: 20 }
  },
  off_02: {
    id: "off_02", name: "Áp Sát Bất Ngờ", type: "active",
    desc: "Tấn công 2 lần trong lượt này",
    icon: "⚡", power: 2,
    effect: { type: "burst", value: 2 }
  },
  off_03: {
    id: "off_03", name: "Sóng Xung Kích", type: "active",
    desc: "Gây 40 sát thương lên tất cả kẻ địch",
    icon: "🌊", power: 3,
    effect: { type: "burst", value: 40 }
  },
  off_04: {
    id: "off_04", name: "Điện Giật Cao Áp", type: "passive",
    desc: "10% cơ hội làm choáng kẻ địch",
    icon: "⚡", power: 2,
    effect: { type: "stun", value: 10 }
  },
  off_05: {
    id: "off_05", name: "Đốt cháy Hoàn Toàn", type: "active",
    desc: "Gây 30 sát thương + thiêu đốt 3 lượt",
    icon: "🔥", power: 3,
    effect: { type: "poison", value: 10, duration: 3 }
  },
  off_06: {
    id: "off_06", name: "Xâm Nhập Hệ Thống", type: "passive",
    desc: "+15% CRIT và +10% sát thương chí mạng",
    icon: "💻", power: 2,
    effect: { type: "crit_up", value: 15 }
  },
  off_07: {
    id: "off_07", name: "Tia Laser Phá Hủy", type: "active",
    desc: "Gây 60 sát thương bỏ qua DEF",
    icon: "🔫", power: 4,
    effect: { type: "burst", value: 60 }
  },
  off_08: {
    id: "off_08", name: "Va Chạm Kim Loại", type: "passive",
    desc: "+25% ATK khi đối thủ là Nguy Hại",
    icon: "🔩", power: 3,
    effect: { type: "buff", value: 25 }
  },
  off_09: {
    id: "off_09", name: "Chất Độc Ăn Mòn", type: "passive",
    desc: "Đòn đánh gây thêm 8 sát thương mỗi lượt",
    icon: "☠️", power: 2,
    effect: { type: "poison", value: 8 }
  },
  off_10: {
    id: "off_10", name: "Khoan Phá Siêu Tốc", type: "active",
    desc: "Gây 50 sát thương + giảm 20% DEF địch",
    icon: "🪛", power: 4,
    effect: { type: "burst", value: 50 }
  },
  off_11: {
    id: "off_11", name: "Phản Ứng Dây Chuyền", type: "active",
    desc: "Sát thương nhân đôi nếu đánh trúng yếu điểm",
    icon: "⛓️", power: 3,
    effect: { type: "burst", value: 100 }
  },
  off_12: {
    id: "off_12", name: "Cắt Đứt Gân Cốt", type: "passive",
    desc: "Đòn đánh giảm 15% SPD địch",
    icon: "🗡️", power: 2,
    effect: { type: "speed_up", value: -15 }
  },
  off_13: {
    id: "off_13", name: "Nổ Tung Tàn Khốc", type: "ultimate",
    desc: "Gây 80 sát thương + sát thương lan 30%",
    icon: "💥", power: 5,
    effect: { type: "burst", value: 80 }
  },
  off_14: {
    id: "off_14", name: "Lưỡi Dao Xoay", type: "active",
    desc: "Tấn công 3 lần, mỗi lần 20 sát thương",
    icon: "🌀", power: 3,
    effect: { type: "burst", value: 60 }
  },
  off_15: {
    id: "off_15", name: "Bức Xạ Tích Lũy", type: "passive",
    desc: "Mỗi lượt tăng 5% sát thương (max 25%)",
    icon: "☢️", power: 3,
    effect: { type: "buff", value: 5 }
  },
  off_16: {
    id: "off_16", name: "Đâm Thủng Giáp", type: "active",
    desc: "Bỏ qua 50% DEF địch",
    icon: "🎯", power: 4,
    effect: { type: "burst", value: 50 }
  },
  off_17: {
    id: "off_17", name: "Sóng Âm Khủng Khiếp", type: "active",
    desc: "Gây 35 sát thương + làm choáng 1 lượt",
    icon: "📢", power: 4,
    effect: { type: "stun", value: 35 }
  },
  off_18: {
    id: "off_18", name: "Hấp Thụ Năng Lượng", type: "passive",
    desc: "Hồi HP bằng 10% sát thương gây ra",
    icon: "🔋", power: 3,
    effect: { type: "drain", value: 10 }
  },
  off_19: {
    id: "off_19", name: "Xiên Que Nhọn", type: "active",
    desc: "Gây 45 sát thương, cắm vào địch 2 lượt",
    icon: "🎋", power: 3,
    effect: { type: "poison", value: 15, duration: 2 }
  },
  off_20: {
    id: "off_20", name: "Chiến Tranh Toàn Diện", type: "ultimate",
    desc: "Gây 100 sát thương chia cho tất cả địch",
    icon: "⚔️", power: 5,
    effect: { type: "burst", value: 100 }
  },

  // UTILITY abilities (utl_01 to utl_20)
  utl_01: {
    id: "utl_01", name: "Hồi Phục Kỳ Diệu", type: "active",
    desc: "Hồi 30% maxHP",
    icon: "💚", power: 2,
    effect: { type: "heal", value: 30 }
  },
  utl_02: {
    id: "utl_02", name: "Bước Nhảy Tốc Quỷ", type: "active",
    desc: "+40% SPD trong 2 lượt",
    icon: "💨", power: 2,
    effect: { type: "speed_up", value: 40, duration: 2 }
  },
  utl_03: {
    id: "utl_03", name: "Gói Bảo Vệ", type: "active",
    desc: "Hồi 20% HP + tạo lá chắn 15",
    icon: "📦", power: 2,
    effect: { type: "heal", value: 20 }
  },
  utl_04: {
    id: "utl_04", name: "Tăng Tốc Bức Phá", type: "passive",
    desc: "Có 15% cơ hội hành động thêm 1 lần",
    icon: "⚡", power: 3,
    effect: { type: "speed_up", value: 15 }
  },
  utl_05: {
    id: "utl_05", name: "Tái Sinh Từ Tro", type: "passive",
    desc: "Hồi sinh 1 lần với 25% HP",
    icon: "🔥", power: 4,
    effect: { type: "regen", value: 25 }
  },
  utl_06: {
    id: "utl_06", name: "Bơm Hơi Phản Kích", type: "active",
    desc: "Đẩy lùi địch + giảm 20% chính xác đánh",
    icon: "🎈", power: 2,
    effect: { type: "speed_up", value: -20 }
  },
  utl_07: {
    id: "utl_07", name: "Giấy Phép Thần Tốc", type: "active",
    desc: "Hành động ngay lập tức trong lượt này",
    icon: "📜", power: 3,
    effect: { type: "speed_up", value: 100 }
  },
  utl_08: {
    id: "utl_08", name: "Lõi Pin Dự Phòng", type: "passive",
    desc: "+10% INT, hồi 3% HP mỗi lượt",
    icon: "🔋", power: 2,
    effect: { type: "regen", value: 3 }
  },
  utl_09: {
    id: "utl_09", name: "Thu Hồi Tài Nguyên", type: "active",
    desc: "Lấy 10 điểm từ kẻ địch hàng đầu",
    icon: "♻️", power: 3,
    effect: { type: "drain", value: 10 }
  },
  utl_10: {
    id: "utl_10", name: "Túi Khí Bảo Hộ", type: "active",
    desc: "Tránh đòn tấn công hoàn toàn 1 lần",
    icon: "🫧", power: 2,
    effect: { type: "dodge", value: 100 }
  },
  utl_11: {
    id: "utl_11", name: "Cao Su Cách Nhiệt", type: "passive",
    desc: "Miễn nhiễm sát thương phép đầu tiên",
    icon: "🔌", power: 3,
    effect: { type: "shield", value: 100 }
  },
  utl_12: {
    id: "utl_12", name: "Xạ Kích Nhanh", type: "active",
    desc: "Tấn công trước với 80% sát thương",
    icon: "🏃", power: 2,
    effect: { type: "burst", value: 80 }
  },
  utl_13: {
    id: "utl_13", name: "Phân Hủy Sinh Học", type: "passive",
    desc: "Giảm 20% DEF địch xung quanh mỗi lượt",
    icon: "🧬", power: 3,
    effect: { type: "buff", value: -20 }
  },
  utl_14: {
    id: "utl_14", name: "Gioăng Kín Khí", type: "passive",
    desc: "Không nhận sát thương từ hiệu ứng DOT",
    icon: "🔧", power: 2,
    effect: { type: "shield", value: 100 }
  },
  utl_15: {
    id: "utl_15", name: "Hấp Thụ Chất Độc", type: "active",
    desc: "Chuyển độc tố thành HP (15% mỗi lượt)",
    icon: "💀", power: 3,
    effect: { type: "drain", value: 15 }
  },
  utl_16: {
    id: "utl_16", name: "Keo Dán Tức Thì", type: "active",
    desc: "Giảm 30% SPD địch trong 3 lượt",
    icon: "🩹", power: 2,
    effect: { type: "speed_up", value: -30, duration: 3 }
  },
  utl_17: {
    id: "utl_17", name: "Đà Hồi Phục", type: "passive",
    desc: "+15% HP tối đa",
    icon: "💪", power: 2,
    effect: { type: "heal", value: 15 }
  },
  utl_18: {
    id: "utl_18", name: "Tăng Cường Thị Lực", type: "passive",
    desc: "+20% CRIT rate",
    icon: "👁️", power: 2,
    effect: { type: "crit_up", value: 20 }
  },
  utl_19: {
    id: "utl_19", name: "Phản Xạ Nhanh", type: "active",
    desc: "Phản 25% sát thương + tăng 15% SPD",
    icon: "🤸", power: 3,
    effect: { type: "reflect", value: 25 }
  },
  utl_20: {
    id: "utl_20", name: "Cải Tạo Toàn Diện", type: "ultimate",
    desc: "Hồi 50% HP + tăng mọi chỉ số 15%",
    icon: "🌟", power: 5,
    effect: { type: "heal", value: 50 }
  },
};

// ─── Get Ability Function ────────────────────────────────────────────────────
export function getCardAbility(card: { element: { id: string }; rarity: { id: string }; abilityId: string }): Ability {
  const ability = ALL_ABILITIES[card.abilityId];
  if (!ability) return ALL_ABILITIES["def_01"];

  const rarityPower: Record<string, number> = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
  };
  return { ...ability, power: rarityPower[card.rarity.id] ?? 1 };
}

// ─── 300 Unique Card Definitions ─────────────────────────────────────────────
const CARD_DEFINITIONS: CardDef[] = [
  // COMMON PLASTIC (1-30)
  { id: 1, name: "Chai Nhựa Bình Minh", subtitle: "Kẻ Khởi Đầu Mềm Yếu", elementId: "plastic", rarityId: "common", atk: 12, hp: 25, def: 3, spd: 15, crt: 5, int: 2, abilityId: "def_01", artVariant: 1 },
  { id: 2, name: "Túi Ni-Lông Gió Xuân", subtitle: "Kẻ Bay Lượn Nhẹ Nhàng", elementId: "plastic", rarityId: "common", atk: 8, hp: 30, def: 2, spd: 20, crt: 3, int: 4, abilityId: "def_06", artVariant: 2 },
  { id: 3, name: "Ống Hút Cuối Mùa Hè", subtitle: "Thổi Bong Bóng Buổi Chiều", elementId: "plastic", rarityId: "common", atk: 10, hp: 22, def: 4, spd: 18, crt: 4, int: 3, abilityId: "def_11", artVariant: 3 },
  { id: 4, name: "Nắp Chai Đồng Xanh", subtitle: "Người Giữ Nắp Cẩn Thận", elementId: "plastic", rarityId: "common", atk: 14, hp: 20, def: 5, spd: 12, crt: 6, int: 1, abilityId: "off_01", artVariant: 4 },
  { id: 5, name: "Hộp Đựng Thức Ăn", subtitle: "Kẻ Chứa Đựng Táo Bạo", elementId: "plastic", rarityId: "common", atk: 11, hp: 28, def: 3, spd: 14, crt: 4, int: 5, abilityId: "utl_01", artVariant: 5 },
  { id: 6, name: "Xô Nhựa Buổi Sáng", subtitle: "Người Đựng Nước Mát", elementId: "plastic", rarityId: "common", atk: 9, hp: 35, def: 6, spd: 10, crt: 3, int: 2, abilityId: "def_08", artVariant: 6 },
  { id: 7, name: "Bàn Chải Răng Cũ", subtitle: "Kẻ Chải Răng Miệt Mài", elementId: "plastic", rarityId: "common", atk: 13, hp: 18, def: 2, spd: 22, crt: 7, int: 3, abilityId: "off_04", artVariant: 7 },
  { id: 8, name: "Ly Nhựa Tiệc Trà", subtitle: "Người Uống Nhanh", elementId: "plastic", rarityId: "common", atk: 10, hp: 24, def: 4, spd: 16, crt: 5, int: 4, abilityId: "utl_06", artVariant: 8 },
  { id: 9, name: "Khay Đựng Trứng", subtitle: "Kẻ Bảo Vệ Tổ Ấm", elementId: "plastic", rarityId: "common", atk: 7, hp: 32, def: 7, spd: 8, crt: 2, int: 6, abilityId: "def_14", artVariant: 1 },
  { id: 10, name: "Bình Xịt Nước Mắt", subtitle: "Người Tưới Mát Mẻ", elementId: "plastic", rarityId: "common", atk: 15, hp: 19, def: 1, spd: 25, crt: 8, int: 2, abilityId: "off_12", artVariant: 2 },
  { id: 11, name: "Hộp Đựng Bút", subtitle: "Kẻ Chứa Ngọc Bút", elementId: "plastic", rarityId: "common", atk: 8, hp: 26, def: 5, spd: 13, crt: 4, int: 7, abilityId: "utl_08", artVariant: 3 },
  { id: 12, name: "Túi Zip Máy Ảnh", subtitle: "Người Giữ Kỷ Niệm", elementId: "plastic", rarityId: "common", atk: 11, hp: 23, def: 3, spd: 17, crt: 5, int: 5, abilityId: "def_15", artVariant: 4 },
  { id: 13, name: "Vỏ Hộp CD Cũ", subtitle: "Kẻ Lưu Giữ Âm Thanh", elementId: "plastic", rarityId: "common", atk: 9, hp: 27, def: 6, spd: 11, crt: 3, int: 8, abilityId: "utl_16", artVariant: 5 },
  { id: 14, name: "Bóng Tennis Hết Hơi", subtitle: "Người Nảy Lâu", elementId: "plastic", rarityId: "common", atk: 16, hp: 17, def: 0, spd: 28, crt: 9, int: 1, abilityId: "off_02", artVariant: 6 },
  { id: 15, name: "Gương Nhựa Vỡ", subtitle: "Kẻ Phản Chiếu Sáng", elementId: "plastic", rarityId: "common", atk: 12, hp: 21, def: 4, spd: 19, crt: 6, int: 4, abilityId: "def_05", artVariant: 7 },
  { id: 16, name: "Chai Dầu Gội Đầu", subtitle: "Người Rửa Tóc Mềm", elementId: "plastic", rarityId: "common", atk: 8, hp: 29, def: 5, spd: 12, crt: 4, int: 6, abilityId: "utl_17", artVariant: 8 },
  { id: 17, name: "Vỏ Hộp Bánh Kẹo", subtitle: "Kẻ Giữ Ngọt Ngào", elementId: "plastic", rarityId: "common", atk: 10, hp: 25, def: 3, spd: 15, crt: 5, int: 5, abilityId: "def_01", artVariant: 1 },
  { id: 18, name: "Ống Tiêm Nhựa", subtitle: "Người Chích Thận Ái", elementId: "plastic", rarityId: "common", atk: 14, hp: 16, def: 2, spd: 24, crt: 10, int: 2, abilityId: "off_09", artVariant: 2 },
  { id: 19, name: "Bình Sữa Trẻ Em", subtitle: "Kẻ Nuôi Nấng Tương Lai", elementId: "plastic", rarityId: "common", atk: 6, hp: 38, def: 8, spd: 6, crt: 2, int: 4, abilityId: "utl_03", artVariant: 3 },
  { id: 20, name: "Túi Tập Gym", subtitle: "Người Nâng Tạ Chăm Chỉ", elementId: "plastic", rarityId: "common", atk: 18, hp: 22, def: 4, spd: 10, crt: 5, int: 3, abilityId: "off_01", artVariant: 4 },
  { id: 21, name: "Vỏ Điện Thoại Cũ", subtitle: "Kẻ Bảo Vệ Màn Hình", elementId: "plastic", rarityId: "common", atk: 7, hp: 30, def: 9, spd: 8, crt: 3, int: 6, abilityId: "def_03", artVariant: 5 },
  { id: 22, name: "Đế Giày Cao Su", subtitle: "Người Nâng Đỡ Bước", elementId: "plastic", rarityId: "common", atk: 11, hp: 24, def: 7, spd: 14, crt: 4, int: 3, abilityId: "def_14", artVariant: 6 },
  { id: 23, name: "Thìa Nhựa Một Lần", subtitle: "Kẻ Khuấy Đổ Mau", elementId: "plastic", rarityId: "common", atk: 9, hp: 20, def: 2, spd: 21, crt: 6, int: 5, abilityId: "off_01", artVariant: 7 },
  { id: 24, name: "Hộp Đựng Thuốc", subtitle: "Người Cất Giấu Bí Mật", elementId: "plastic", rarityId: "common", atk: 5, hp: 33, def: 6, spd: 9, crt: 3, int: 9, abilityId: "utl_08", artVariant: 8 },
  { id: 25, name: "Bong Bóng Xà Phòng", subtitle: "Kẻ Bay Trôi Bất Định", elementId: "plastic", rarityId: "common", atk: 8, hp: 18, def: 1, spd: 30, crt: 7, int: 6, abilityId: "utl_10", artVariant: 1 },
  { id: 26, name: "Vỏ Bút Chì Màu", subtitle: "Người Vẽ Nên Trời", elementId: "plastic", rarityId: "common", atk: 13, hp: 22, def: 3, spd: 16, crt: 5, int: 5, abilityId: "utl_18", artVariant: 2 },
  { id: 27, name: "Dao Nhựa Bữa Tiệc", subtitle: "Kẻ Cắt Lướt Gió", elementId: "plastic", rarityId: "common", atk: 15, hp: 17, def: 2, spd: 23, crt: 8, int: 2, abilityId: "off_12", artVariant: 3 },
  { id: 28, name: "Kẹp Tóc Nhựa", subtitle: "Người Giữ Mái Đẹp", elementId: "plastic", rarityId: "common", atk: 6, hp: 26, def: 4, spd: 18, crt: 4, int: 7, abilityId: "utl_16", artVariant: 4 },
  { id: 29, name: "Hộp Đựng Đồ Ăn", subtitle: "Kẻ Chứa Hương Vị", elementId: "plastic", rarityId: "common", atk: 10, hp: 28, def: 5, spd: 12, crt: 4, int: 4, abilityId: "utl_01", artVariant: 5 },
  { id: 30, name: "Dây Đeo Đồng Hồ", subtitle: "Người Đếm Thời Gian", elementId: "plastic", rarityId: "common", atk: 8, hp: 24, def: 6, spd: 15, crt: 5, int: 6, abilityId: "def_06", artVariant: 6 },

  // COMMON PAPER (31-60)
  { id: 31, name: "Giấy Báo Ngày Mưa", subtitle: "Người Gói Nỗi Buồn", elementId: "paper", rarityId: "common", atk: 10, hp: 26, def: 4, spd: 14, crt: 5, int: 6, abilityId: "def_01", artVariant: 7 },
  { id: 32, name: "Bìa Cứng Chiều Nắng", subtitle: "Kẻ Đỡ Đầu Mình", elementId: "paper", rarityId: "common", atk: 8, hp: 32, def: 7, spd: 8, crt: 3, int: 5, abilityId: "def_14", artVariant: 8 },
  { id: 33, name: "Sách Giáo Khoa Cũ", subtitle: "Người Dạy Chữ Nghĩa", elementId: "paper", rarityId: "common", atk: 7, hp: 30, def: 5, spd: 10, crt: 4, int: 10, abilityId: "utl_18", artVariant: 1 },
  { id: 34, name: "Tờ Rơi Màu Sắc", subtitle: "Kẻ Rải Tin Vui", elementId: "paper", rarityId: "common", atk: 12, hp: 20, def: 2, spd: 18, crt: 6, int: 4, abilityId: "off_02", artVariant: 2 },
  { id: 35, name: "Phong Bì Thư Tình", subtitle: "Người Chở Yêu Thương", elementId: "paper", rarityId: "common", atk: 6, hp: 28, def: 3, spd: 12, crt: 4, int: 8, abilityId: "utl_01", artVariant: 3 },
  { id: 36, name: "Giấy Ghi Chú Vụng", subtitle: "Kẻ Nhắn Nhủ Vội", elementId: "paper", rarityId: "common", atk: 9, hp: 24, def: 4, spd: 16, crt: 5, int: 7, abilityId: "def_11", artVariant: 4 },
  { id: 37, name: "Sổ Tay Ghi Nợ", subtitle: "Người Tính Sổ Cẩn Thận", elementId: "paper", rarityId: "common", atk: 11, hp: 22, def: 5, spd: 14, crt: 5, int: 6, abilityId: "utl_09", artVariant: 5 },
  { id: 38, name: "Tờ Quảng Cáo Rách", subtitle: "Kẻ Kêu Gọi Bong Bóng", elementId: "paper", rarityId: "common", atk: 14, hp: 18, def: 2, spd: 20, crt: 7, int: 3, abilityId: "off_02", artVariant: 6 },
  { id: 39, name: "Giấy Gói Quà Đêm", subtitle: "Người Che Đậy Bất Ngờ", elementId: "paper", rarityId: "common", atk: 7, hp: 34, def: 6, spd: 6, crt: 2, int: 5, abilityId: "def_08", artVariant: 7 },
  { id: 40, name: "Truyện Tranh Cũ", subtitle: "Kẻ Kể Chuyện Ngày Xưa", elementId: "paper", rarityId: "common", atk: 10, hp: 26, def: 4, spd: 15, crt: 5, int: 7, abilityId: "utl_08", artVariant: 8 },
  { id: 41, name: "Bản Đồ Cũ Mờ", subtitle: "Người Dẫn Đường Lạc", elementId: "paper", rarityId: "common", atk: 8, hp: 28, def: 5, spd: 12, crt: 4, int: 9, abilityId: "utl_07", artVariant: 1 },
  { id: 42, name: "Giấy Kiểm Tra Đỏ", subtitle: "Kẻ Chấm Điểm Cay Đắng", elementId: "paper", rarityId: "common", atk: 15, hp: 16, def: 1, spd: 22, crt: 8, int: 4, abilityId: "off_04", artVariant: 2 },
  { id: 43, name: "Nhãn Mác Sản Phẩm", subtitle: "Người Gắn Tên Tuổi", elementId: "paper", rarityId: "common", atk: 9, hp: 24, def: 4, spd: 16, crt: 5, int: 7, abilityId: "def_15", artVariant: 3 },
  { id: 44, name: "Tờ Lịch Treo Tường", subtitle: "Kẻ Đếm Ngày Tháng", elementId: "paper", rarityId: "common", atk: 6, hp: 30, def: 6, spd: 10, crt: 3, int: 8, abilityId: "utl_17", artVariant: 4 },
  { id: 45, name: "Giấy Notes Dính", subtitle: "Người Nhắc Nhở Nhỏ", elementId: "paper", rarityId: "common", atk: 7, hp: 26, def: 3, spd: 18, crt: 4, int: 8, abilityId: "utl_16", artVariant: 5 },
  { id: 46, name: "Vé Xem Phim Cũ", subtitle: "Kẻ Lưu Giữ Khoảnh Khắc", elementId: "paper", rarityId: "common", atk: 8, hp: 28, def: 4, spd: 14, crt: 5, int: 6, abilityId: "def_06", artVariant: 6 },
  { id: 47, name: "Thiệp Chúc Mừng", subtitle: "Người Trao Lời Yêu", elementId: "paper", rarityId: "common", atk: 5, hp: 32, def: 5, spd: 8, crt: 3, int: 9, abilityId: "utl_01", artVariant: 7 },
  { id: 48, name: "Giấy A4 Trắng Tinh", subtitle: "Kẻ Đón Nhận Mọi Thứ", elementId: "paper", rarityId: "common", atk: 9, hp: 25, def: 4, spd: 15, crt: 5, int: 7, abilityId: "def_01", artVariant: 8 },
  { id: 49, name: "Sách Nấu Ăn Cũ", subtitle: "Người Ghi Công Thức", elementId: "paper", rarityId: "common", atk: 7, hp: 29, def: 5, spd: 11, crt: 4, int: 9, abilityId: "utl_08", artVariant: 1 },
  { id: 50, name: "Tờ Giấy Lót Chuồn", subtitle: "Kẻ Hứng Chịu Mọi Thứ", elementId: "paper", rarityId: "common", atk: 11, hp: 22, def: 3, spd: 17, crt: 6, int: 5, abilityId: "def_03", artVariant: 2 },
  { id: 51, name: "Bìa Sách Mềm", subtitle: "Người Bọc Ngoài Dịu Dàng", elementId: "paper", rarityId: "common", atk: 8, hp: 27, def: 6, spd: 12, crt: 4, int: 6, abilityId: "def_08", artVariant: 3 },
  { id: 52, name: "Giấy Gói Bánh", subtitle: "Kẻ Bao Bọc Ngọt Ngào", elementId: "paper", rarityId: "common", atk: 6, hp: 31, def: 5, spd: 9, crt: 3, int: 7, abilityId: "utl_03", artVariant: 4 },
  { id: 53, name: "Tập Học Sinh Mới", subtitle: "Người Viết Nét Đầu", elementId: "paper", rarityId: "common", atk: 10, hp: 24, def: 4, spd: 15, crt: 5, int: 6, abilityId: "utl_18", artVariant: 5 },
  { id: 54, name: "Sổ Ghi Chép Điểm", subtitle: "Kẻ Lưu Giữ Kỷ Niệm", elementId: "paper", rarityId: "common", atk: 7, hp: 28, def: 5, spd: 11, crt: 4, int: 10, abilityId: "utl_08", artVariant: 6 },
  { id: 55, name: "Giấy Lọc Trà", subtitle: "Người Lọc Tinh Khiết", elementId: "paper", rarityId: "common", atk: 5, hp: 26, def: 4, spd: 13, crt: 3, int: 11, abilityId: "utl_15", artVariant: 7 },
  { id: 56, name: "Tờ Rơi Bán Hàng", subtitle: "Kẻ Rao Giá Miệt Mài", elementId: "paper", rarityId: "common", atk: 13, hp: 20, def: 2, spd: 19, crt: 7, int: 4, abilityId: "off_02", artVariant: 8 },
  { id: 57, name: "Giấy Carbon Cũ", subtitle: "Người Sao Chép Chính Xác", elementId: "paper", rarityId: "common", atk: 9, hp: 23, def: 4, spd: 16, crt: 5, int: 8, abilityId: "def_11", artVariant: 1 },
  { id: 58, name: "Bản Nhạc Phế", subtitle: "Kẻ Gióng Lên Ê A", elementId: "paper", rarityId: "common", atk: 12, hp: 21, def: 3, spd: 18, crt: 6, int: 5, abilityId: "off_01", artVariant: 2 },
  { id: 59, name: "Tờ Hướng Dẫn", subtitle: "Người Chỉ Đường Tỉ Mỉ", elementId: "paper", rarityId: "common", atk: 6, hp: 30, def: 6, spd: 10, crt: 3, int: 8, abilityId: "utl_07", artVariant: 3 },
  { id: 60, name: "Giấy Vệ Sinh Cuối", subtitle: "Kẻ Lau Sạch Mọi Thứ", elementId: "paper", rarityId: "common", atk: 4, hp: 35, def: 8, spd: 5, crt: 2, int: 4, abilityId: "def_17", artVariant: 4 },

  // COMMON GLASS (61-90)
  { id: 61, name: "Chai Bia Cũ", subtitle: "Người Uống Một Mình Đêm", elementId: "glass", rarityId: "common", atk: 12, hp: 24, def: 5, spd: 14, crt: 6, int: 4, abilityId: "def_02", artVariant: 5 },
  { id: 62, name: "Ly Thủy Tinh Vỡ", subtitle: "Kẻ Tan Vỡ Như Ly", elementId: "glass", rarityId: "common", atk: 15, hp: 18, def: 2, spd: 20, crt: 9, int: 3, abilityId: "off_04", artVariant: 6 },
  { id: 63, name: "Lọ Hoa Mùa Xuân", subtitle: "Người Giữ Hương Thơm", elementId: "glass", rarityId: "common", atk: 8, hp: 30, def: 6, spd: 10, crt: 4, int: 7, abilityId: "utl_01", artVariant: 7 },
  { id: 64, name: "Kính Mắt Ông Nội", subtitle: "Kẻ Nhìn Thấu Mọi Thứ", elementId: "glass", rarityId: "common", atk: 7, hp: 26, def: 5, spd: 12, crt: 5, int: 10, abilityId: "utl_18", artVariant: 8 },
  { id: 65, name: "Chai Nước Ngọt", subtitle: "Người Ngọt Ngào Tươi Mát", elementId: "glass", rarityId: "common", atk: 11, hp: 25, def: 4, spd: 16, crt: 6, int: 5, abilityId: "def_15", artVariant: 1 },
  { id: 66, name: "Lọ Thí Nghiệm", subtitle: "Kẻ Pha Trộn Bí Ẩn", elementId: "glass", rarityId: "common", atk: 13, hp: 20, def: 3, spd: 18, crt: 7, int: 6, abilityId: "off_05", artVariant: 2 },
  { id: 67, name: "Bóng Đèn Vỡ", subtitle: "Người Tỏa Sáng Cuối", elementId: "glass", rarityId: "common", atk: 16, hp: 16, def: 1, spd: 24, crt: 10, int: 2, abilityId: "off_02", artVariant: 3 },
  { id: 68, name: "Gương So Gãy", subtitle: "Kẻ Phản Chiếu Đôi Phần", elementId: "glass", rarityId: "common", atk: 10, hp: 22, def: 4, spd: 17, crt: 6, int: 6, abilityId: "def_05", artVariant: 4 },
  { id: 69, name: "Chai Nước Mắt", subtitle: "Người Chứa Nỗi Buồn", elementId: "glass", rarityId: "common", atk: 6, hp: 34, def: 7, spd: 6, crt: 2, int: 5, abilityId: "def_19", artVariant: 5 },
  { id: 70, name: "Lọ Nước Hoa Cũ", subtitle: "Kẻ Tỏa Hương Xưa", elementId: "glass", rarityId: "common", atk: 8, hp: 28, def: 5, spd: 11, crt: 4, int: 9, abilityId: "utl_08", artVariant: 6 },
  { id: 71, name: "Cốc Thủy Tinh Dày", subtitle: "Người Đựng Bền Bỉ", elementId: "glass", rarityId: "common", atk: 9, hp: 29, def: 8, spd: 9, crt: 3, int: 4, abilityId: "def_18", artVariant: 7 },
  { id: 72, name: "Chai Sâm Panh Đêm Tiệc", subtitle: "Kẻ Nổ Bong Bóng Vui", elementId: "glass", rarityId: "common", atk: 14, hp: 22, def: 3, spd: 19, crt: 8, int: 3, abilityId: "off_02", artVariant: 8 },
  { id: 73, name: "Lọ Đựng Mứt", subtitle: "Người Giữ Ngọt Ngào", elementId: "glass", rarityId: "common", atk: 7, hp: 32, def: 6, spd: 8, crt: 3, int: 6, abilityId: "utl_03", artVariant: 1 },
  { id: 74, name: "Kính Lúp Cổ", subtitle: "Kẻ Phóng To Thế Giới", elementId: "glass", rarityId: "common", atk: 10, hp: 24, def: 4, spd: 14, crt: 5, int: 8, abilityId: "utl_07", artVariant: 2 },
  { id: 75, name: "Chai Rượu Vang", subtitle: "Người Men say Nồng", elementId: "glass", rarityId: "common", atk: 11, hp: 26, def: 5, spd: 12, crt: 5, int: 6, abilityId: "def_02", artVariant: 3 },
  { id: 76, name: "Lọ Thủy Tinh Tròn", subtitle: "Kẻ Bao Bọc Hoàn Hảo", elementId: "glass", rarityId: "common", atk: 8, hp: 30, def: 7, spd: 9, crt: 3, int: 5, abilityId: "def_08", artVariant: 4 },
  { id: 77, name: "Ly Cà Phê Sáng", subtitle: "Người Đánh Thức Ngày Mới", elementId: "glass", rarityId: "common", atk: 12, hp: 23, def: 3, spd: 17, crt: 6, int: 5, abilityId: "off_01", artVariant: 5 },
  { id: 78, name: "Bình Hoa Khô", subtitle: "Kẻ Lưu Giữ Vẻ Đẹp", elementId: "glass", rarityId: "common", atk: 6, hp: 31, def: 6, spd: 8, crt: 3, int: 7, abilityId: "utl_17", artVariant: 6 },
  { id: 79, name: "Chai Lọ Đựng Gia Vị", subtitle: "Người Pha Trộn Hương Vị", elementId: "glass", rarityId: "common", atk: 9, hp: 25, def: 5, spd: 13, crt: 5, int: 8, abilityId: "utl_08", artVariant: 7 },
  { id: 80, name: "Gương Chiếu Hậu", subtitle: "Kẻ Nhìn Sau Lưng", elementId: "glass", rarityId: "common", atk: 10, hp: 22, def: 4, spd: 16, crt: 6, int: 6, abilityId: "def_11", artVariant: 8 },
  { id: 81, name: "Lọ Đựng Nước Mắt", subtitle: "Người Thấm Ướt Mọi Thứ", elementId: "glass", rarityId: "common", atk: 7, hp: 28, def: 5, spd: 11, crt: 4, int: 7, abilityId: "utl_01", artVariant: 1 },
  { id: 82, name: "Chai Bia Hơi", subtitle: "Kẻ Bọt Sôi Sục", elementId: "glass", rarityId: "common", atk: 13, hp: 21, def: 3, spd: 20, crt: 7, int: 3, abilityId: "off_02", artVariant: 2 },
  { id: 83, name: "Ly Nước Ép Cam", subtitle: "Người Tươi Sáng Mỗi Sáng", elementId: "glass", rarityId: "common", atk: 10, hp: 27, def: 4, spd: 15, crt: 5, int: 5, abilityId: "def_15", artVariant: 3 },
  { id: 84, name: "Lọ Đựng Son Môi", subtitle: "Kẻ Tô Vẽ Màu Sắc", elementId: "glass", rarityId: "common", atk: 8, hp: 24, def: 4, spd: 14, crt: 5, int: 8, abilityId: "utl_18", artVariant: 4 },
  { id: 85, name: "Chai Nước Suối", subtitle: "Người Mát Lành Tinh Khiết", elementId: "glass", rarityId: "common", atk: 9, hp: 29, def: 5, spd: 12, crt: 4, int: 5, abilityId: "def_19", artVariant: 5 },
  { id: 86, name: "Kính Lúp Buổi Trưa", subtitle: "Kẻ Đốt cháy Ánh Nắng", elementId: "glass", rarityId: "common", atk: 15, hp: 17, def: 2, spd: 21, crt: 9, int: 4, abilityId: "off_05", artVariant: 6 },
  { id: 87, name: "Lọ Đựng Keo", subtitle: "Người Dính Chặt Mọi Thứ", elementId: "glass", rarityId: "common", atk: 11, hp: 23, def: 6, spd: 13, crt: 5, int: 5, abilityId: "utl_16", artVariant: 7 },
  { id: 88, name: "Ly Thủy Tinh Pha Lẫn", subtitle: "Kẻ Hòa Trộn Đủ Loại", elementId: "glass", rarityId: "common", atk: 10, hp: 26, def: 5, spd: 14, crt: 5, int: 5, abilityId: "def_01", artVariant: 8 },
  { id: 89, name: "Chai Rượu Mạnh", subtitle: "Người Đốt Nóng Cổ Họng", elementId: "glass", rarityId: "common", atk: 14, hp: 20, def: 3, spd: 18, crt: 8, int: 4, abilityId: "off_01", artVariant: 1 },
  { id: 90, name: "Lọ Đựng Dầu Gội", subtitle: "Kẻ Tắm Rửa Thơm Ngát", elementId: "glass", rarityId: "common", atk: 8, hp: 28, def: 5, spd: 11, crt: 4, int: 6, abilityId: "def_06", artVariant: 2 },

  // COMMON METAL (91-120)
  { id: 91, name: "Lon Bia Tình Yêu", subtitle: "Người Uống Cùng Nhau", elementId: "metal", rarityId: "common", atk: 13, hp: 22, def: 6, spd: 15, crt: 6, int: 3, abilityId: "def_03", artVariant: 3 },
  { id: 92, name: "Vỏ Hộp Bánh Quy", subtitle: "Kẻ Giữ Giòn Tan", elementId: "metal", rarityId: "common", atk: 9, hp: 28, def: 7, spd: 10, crt: 4, int: 5, abilityId: "def_14", artVariant: 4 },
  { id: 93, name: "Lon Nước Ngọt", subtitle: "Người Ngọt Lịm Tim", elementId: "metal", rarityId: "common", atk: 12, hp: 24, def: 5, spd: 16, crt: 6, int: 4, abilityId: "off_01", artVariant: 5 },
  { id: 94, name: "Nắp Lon Cũ", subtitle: "Kẻ Đóng Chặt Miệng", elementId: "metal", rarityId: "common", atk: 11, hp: 20, def: 8, spd: 12, crt: 5, int: 4, abilityId: "def_08", artVariant: 6 },
  { id: 95, name: "Vỏ Đồ Hộp", subtitle: "Người Chứa Đựng Bữa Ăn", elementId: "metal", rarityId: "common", atk: 8, hp: 30, def: 9, spd: 6, crt: 3, int: 4, abilityId: "def_18", artVariant: 7 },
  { id: 96, name: "Lon Sữa Đặc", subtitle: "Kẻ Ngọt Ngào Đậm Đà", elementId: "metal", rarityId: "common", atk: 10, hp: 26, def: 6, spd: 11, crt: 5, int: 5, abilityId: "utl_01", artVariant: 8 },
  { id: 97, name: "Vỏ Hộp Thịt", subtitle: "Người Bảo Quản Sự Tươi", elementId: "metal", rarityId: "common", atk: 9, hp: 29, def: 8, spd: 8, crt: 3, int: 4, abilityId: "def_14", artVariant: 1 },
  { id: 98, name: "Lon Nước Tăng Lực", subtitle: "Kẻ Bơm Năng Lượng", elementId: "metal", rarityId: "common", atk: 16, hp: 18, def: 2, spd: 24, crt: 9, int: 2, abilityId: "off_02", artVariant: 2 },
  { id: 99, name: "Nắp Đậy Kim Loại", subtitle: "Người Phong Tỏa Kín", elementId: "metal", rarityId: "common", atk: 7, hp: 32, def: 10, spd: 5, crt: 2, int: 4, abilityId: "def_03", artVariant: 3 },
  { id: 100, name: "Vỏ Hộp Cá", subtitle: "Kẻ Tỏa Mùi Biển", elementId: "metal", rarityId: "common", atk: 11, hp: 25, def: 6, spd: 13, crt: 5, int: 4, abilityId: "def_05", artVariant: 4 },
  { id: 101, name: "Lon Bia Hơi", subtitle: "Người Bọt Bèo Sủi", elementId: "metal", rarityId: "common", atk: 14, hp: 21, def: 4, spd: 18, crt: 7, int: 3, abilityId: "off_04", artVariant: 5 },
  { id: 102, name: "Vỏ Hộp Đậu", subtitle: "Kẻ Chứa Đạm Thực Vật", elementId: "metal", rarityId: "common", atk: 8, hp: 28, def: 7, spd: 10, crt: 4, int: 6, abilityId: "def_08", artVariant: 6 },
  { id: 103, name: "Lon Nước Giải Khát", subtitle: "Người Mát Lạnh Cổ", elementId: "metal", rarityId: "common", atk: 11, hp: 24, def: 5, spd: 15, crt: 6, int: 4, abilityId: "def_15", artVariant: 7 },
  { id: 104, name: "Nắp Chai Sắt", subtitle: "Kẻ Đậy Chặt Hơi", elementId: "metal", rarityId: "common", atk: 10, hp: 22, def: 8, spd: 11, crt: 5, int: 5, abilityId: "def_03", artVariant: 8 },
  { id: 105, name: "Vỏ Hộp Bắp", subtitle: "Người Giữ Bắp Ngọt", elementId: "metal", rarityId: "common", atk: 9, hp: 27, def: 7, spd: 10, crt: 4, int: 5, abilityId: "def_14", artVariant: 1 },
  { id: 106, name: "Lon Cà Phê", subtitle: "Kẻ Thức Khuya Vẫy Gọi", elementId: "metal", rarityId: "common", atk: 15, hp: 19, def: 3, spd: 22, crt: 8, int: 3, abilityId: "off_04", artVariant: 2 },
  { id: 107, name: "Vỏ Hộp Thực Phẩm", subtitle: "Người Bảo Vệ Sức Khỏe", elementId: "metal", rarityId: "common", atk: 8, hp: 30, def: 8, spd: 8, crt: 3, int: 5, abilityId: "def_18", artVariant: 3 },
  { id: 108, name: "Lon Bia Đen", subtitle: "Kẻ Đắng Nồng Say", elementId: "metal", rarityId: "common", atk: 13, hp: 23, def: 5, spd: 16, crt: 6, int: 3, abilityId: "def_05", artVariant: 4 },
  { id: 109, name: "Nắp Lọ Thủy Tinh", subtitle: "Người Đậy Kín Bình", elementId: "metal", rarityId: "common", atk: 7, hp: 31, def: 9, spd: 6, crt: 2, int: 4, abilityId: "def_03", artVariant: 5 },
  { id: 110, name: "Vỏ Hộp Nước", subtitle: "Kẻ Đựng Nước Sạch", elementId: "metal", rarityId: "common", atk: 9, hp: 28, def: 7, spd: 11, crt: 4, int: 5, abilityId: "def_14", artVariant: 6 },
  { id: 111, name: "Lon Nước Ép", subtitle: "Người Tươi Mát Vitamin", elementId: "metal", rarityId: "common", atk: 11, hp: 25, def: 5, spd: 14, crt: 6, int: 5, abilityId: "utl_01", artVariant: 7 },
  { id: 112, name: "Vỏ Hộp Sữa", subtitle: "Kẻ Nuôi Dưỡng Trẻ Thơ", elementId: "metal", rarityId: "common", atk: 8, hp: 32, def: 8, spd: 7, crt: 3, int: 4, abilityId: "utl_03", artVariant: 8 },
  { id: 113, name: "Lon Trà Xanh", subtitle: "Người Xanh Mát Lành", elementId: "metal", rarityId: "common", atk: 12, hp: 24, def: 5, spd: 15, crt: 6, int: 4, abilityId: "def_15", artVariant: 1 },
  { id: 114, name: "Nắp Đậy Hộp", subtitle: "Kẻ Phong Tỏa Kín Đáo", elementId: "metal", rarityId: "common", atk: 6, hp: 33, def: 10, spd: 5, crt: 2, int: 4, abilityId: "def_03", artVariant: 2 },
  { id: 115, name: "Vỏ Hộp Trái Cây", subtitle: "Người Giữ Tươi Ngon", elementId: "metal", rarityId: "common", atk: 9, hp: 28, def: 7, spd: 10, crt: 4, int: 6, abilityId: "def_14", artVariant: 3 },
  { id: 116, name: "Lon Bia Bạc", subtitle: "Kẻ Lạnh Buốt Bọt", elementId: "metal", rarityId: "common", atk: 14, hp: 22, def: 4, spd: 18, crt: 7, int: 3, abilityId: "off_02", artVariant: 4 },
  { id: 117, name: "Vỏ Hộp Thịt Bò", subtitle: "Người Đựng Protein", elementId: "metal", rarityId: "common", atk: 10, hp: 27, def: 8, spd: 9, crt: 4, int: 4, abilityId: "def_18", artVariant: 5 },
  { id: 118, name: "Lon Nước Ngọt Đỏ", subtitle: "Kẻ Ngọt Sắc Đỏ", elementId: "metal", rarityId: "common", atk: 13, hp: 21, def: 4, spd: 17, crt: 7, int: 4, abilityId: "off_01", artVariant: 6 },
  { id: 119, name: "Nắp Cốc Sắt", subtitle: "Người Đậy Nóng Giữ", elementId: "metal", rarityId: "common", atk: 7, hp: 30, def: 9, spd: 7, crt: 3, int: 5, abilityId: "def_03", artVariant: 7 },
  { id: 120, name: "Vỏ Hộp Đồ Ăn", subtitle: "Kẻ Chứa Bữa Trưa", elementId: "metal", rarityId: "common", atk: 9, hp: 29, def: 7, spd: 10, crt: 4, int: 5, abilityId: "def_14", artVariant: 8 },

  // COMMON ORGANIC (121-150)
  { id: 121, name: "Vỏ Cam Mùa Đông", subtitle: "Người Tỏa Hương Cam", elementId: "organic", rarityId: "common", atk: 10, hp: 28, def: 5, spd: 12, crt: 5, int: 5, abilityId: "def_17", artVariant: 1 },
  { id: 122, name: "Lõi Trà Chiều Mưa", subtitle: "Kẻ Ngâm Mình Thơm", elementId: "organic", rarityId: "common", atk: 6, hp: 32, def: 6, spd: 8, crt: 3, int: 7, abilityId: "utl_01", artVariant: 2 },
  { id: 123, name: "Vỏ Trứng Nấu Ăn", subtitle: "Người Nuôi Sự Sống", elementId: "organic", rarityId: "common", atk: 7, hp: 30, def: 8, spd: 7, crt: 3, int: 5, abilityId: "def_14", artVariant: 3 },
  { id: 124, name: "Vỏ Dừa Khô", subtitle: "Kẻ Cứng Rắn Bên Ngoài", elementId: "organic", rarityId: "common", atk: 12, hp: 26, def: 7, spd: 10, crt: 5, int: 4, abilityId: "def_18", artVariant: 4 },
  { id: 125, name: "Thân Chuối Chín", subtitle: "Người Ngọt Ngào Mau Hỏng", elementId: "organic", rarityId: "common", atk: 8, hp: 24, def: 3, spd: 15, crt: 5, int: 6, abilityId: "utl_03", artVariant: 5 },
  { id: 126, name: "Lá Sen Khô", subtitle: "Kẻ Giữ Hương Đầm", elementId: "organic", rarityId: "common", atk: 5, hp: 35, def: 7, spd: 5, crt: 2, int: 8, abilityId: "def_19", artVariant: 6 },
  { id: 127, name: "Vỏ Khoai Lang", subtitle: "Người Giàu Vitamin", elementId: "organic", rarityId: "common", atk: 9, hp: 28, def: 6, spd: 11, crt: 4, int: 6, abilityId: "def_17", artVariant: 7 },
  { id: 128, name: "Thân Rau Muống", subtitle: "Kẻ Xanh Tươi Mát", elementId: "organic", rarityId: "common", atk: 8, hp: 26, def: 4, spd: 14, crt: 5, int: 7, abilityId: "utl_01", artVariant: 8 },
  { id: 129, name: "Vỏ Bưởi Cuối Mùa", subtitle: "Người Thơm Lừng", elementId: "organic", rarityId: "common", atk: 7, hp: 31, def: 6, spd: 8, crt: 3, int: 6, abilityId: "def_17", artVariant: 1 },
  { id: 130, name: "Xương Gà Nhỏ", subtitle: "Kẻ Nuôi Đất Đai", elementId: "organic", rarityId: "common", atk: 11, hp: 22, def: 4, spd: 13, crt: 6, int: 5, abilityId: "def_13", artVariant: 2 },
  { id: 131, name: "Vỏ Lạc Rang", subtitle: "Người Giòn Giã", elementId: "organic", rarityId: "common", atk: 10, hp: 25, def: 5, spd: 12, crt: 5, int: 5, abilityId: "def_15", artVariant: 3 },
  { id: 132, name: "Nõn Đu đủ", subtitle: "Kẻ Mềm Yếu Bên Trong", elementId: "organic", rarityId: "common", atk: 6, hp: 33, def: 5, spd: 7, crt: 2, int: 7, abilityId: "utl_17", artVariant: 4 },
  { id: 133, name: "Thân Cà Chua", subtitle: "Người Đỏ Thắm", elementId: "organic", rarityId: "common", atk: 12, hp: 23, def: 4, spd: 15, crt: 6, int: 4, abilityId: "off_05", artVariant: 5 },
  { id: 134, name: "Vỏ Ngô Non", subtitle: "Kẻ Bọc Mềm Mại", elementId: "organic", rarityId: "common", atk: 8, hp: 29, def: 6, spd: 10, crt: 4, int: 6, abilityId: "def_14", artVariant: 6 },
  { id: 135, name: "Lõi Bắp Cải", subtitle: "Người Giòn Tan", elementId: "organic", rarityId: "common", atk: 7, hp: 27, def: 5, spd: 12, crt: 4, int: 8, abilityId: "utl_08", artVariant: 7 },
  { id: 136, name: "Thân Hành Tỏi", subtitle: "Kẻ Hăng Cay Nồng", elementId: "organic", rarityId: "common", atk: 14, hp: 20, def: 3, spd: 16, crt: 7, int: 4, abilityId: "off_04", artVariant: 8 },
  { id: 137, name: "Vỏ Chanh Vàng", subtitle: "Người Chua Sảng Khoái", elementId: "organic", rarityId: "common", atk: 9, hp: 26, def: 5, spd: 13, crt: 5, int: 6, abilityId: "utl_01", artVariant: 1 },
  { id: 138, name: "Cuống Rau Má", subtitle: "Kẻ Mát Lành Thanh Nhiệt", elementId: "organic", rarityId: "common", atk: 6, hp: 31, def: 6, spd: 9, crt: 3, int: 7, abilityId: "def_17", artVariant: 2 },
  { id: 139, name: "Vỏ Lựu Đỏ", subtitle: "Người Đỏ Như Ruby", elementId: "organic", rarityId: "common", atk: 11, hp: 24, def: 5, spd: 14, crt: 6, int: 5, abilityId: "def_15", artVariant: 3 },
  { id: 140, name: "Thân Su Su", subtitle: "Kẻ Giòn Tan Ngọt", elementId: "organic", rarityId: "common", atk: 8, hp: 28, def: 5, spd: 11, crt: 4, int: 7, abilityId: "utl_01", artVariant: 4 },
  { id: 141, name: "Vỏ Gừng Tươi", subtitle: "Người Cay Ấm", elementId: "organic", rarityId: "common", atk: 13, hp: 22, def: 4, spd: 15, crt: 7, int: 4, abilityId: "off_05", artVariant: 5 },
  { id: 142, name: "Lõi Khế Chua", subtitle: "Kẻ Chua Ngoét Mặt", elementId: "organic", rarityId: "common", atk: 10, hp: 25, def: 5, spd: 13, crt: 5, int: 5, abilityId: "def_15", artVariant: 6 },
  { id: 143, name: "Thân Đu Đủ", subtitle: "Người Ngọt Thơm", elementId: "organic", rarityId: "common", atk: 9, hp: 27, def: 5, spd: 12, crt: 5, int: 6, abilityId: "def_17", artVariant: 7 },
  { id: 144, name: "Vỏ Mít Chín", subtitle: "Kẻ Thơm Nồng Quyến Rũ", elementId: "organic", rarityId: "common", atk: 7, hp: 32, def: 6, spd: 8, crt: 3, int: 6, abilityId: "utl_03", artVariant: 8 },
  { id: 145, name: "Cuống Nho", subtitle: "Người Leo Cành", elementId: "organic", rarityId: "common", atk: 6, hp: 29, def: 5, spd: 11, crt: 4, int: 8, abilityId: "utl_08", artVariant: 1 },
  { id: 146, name: "Vỏ Cà Rốt", subtitle: "Kẻ Cam Giòn", elementId: "organic", rarityId: "common", atk: 10, hp: 26, def: 5, spd: 13, crt: 5, int: 6, abilityId: "def_15", artVariant: 2 },
  { id: 147, name: "Thân Cải Xanh", subtitle: "Người Xanh Đậm", elementId: "organic", rarityId: "common", atk: 8, hp: 30, def: 6, spd: 10, crt: 4, int: 6, abilityId: "def_17", artVariant: 3 },
  { id: 148, name: "Vỏ Bí Đao", subtitle: "Kẻ Trắng Mát", elementId: "organic", rarityId: "common", atk: 7, hp: 31, def: 7, spd: 8, crt: 3, int: 5, abilityId: "def_14", artVariant: 4 },
  { id: 149, name: "Cuống Dưa Hấu", subtitle: "Người Đỏ Mọng Nước", elementId: "organic", rarityId: "common", atk: 11, hp: 25, def: 4, spd: 14, crt: 6, int: 5, abilityId: "def_15", artVariant: 5 },
  { id: 150, name: "Lõi Thơm", subtitle: "Kẻ Thơm Ngát Hương", elementId: "organic", rarityId: "common", atk: 8, hp: 28, def: 5, spd: 11, crt: 4, int: 7, abilityId: "def_17", artVariant: 6 },

  // COMMON HAZARD (151-180)
  { id: 151, name: "Pin AA Cũ", subtitle: "Người Cấp Năng Lượng", elementId: "hazard", rarityId: "common", atk: 18, hp: 15, def: 1, spd: 25, crt: 10, int: 3, abilityId: "off_04", artVariant: 7 },
  { id: 152, name: "Đèn Neon Vỡ", subtitle: "Kẻ Nhấp Nháy Ma Quái", elementId: "hazard", rarityId: "common", atk: 16, hp: 18, def: 2, spd: 22, crt: 9, int: 4, abilityId: "off_05", artVariant: 8 },
  { id: 153, name: "Thuốc Trừ Sâu", subtitle: "Người Phun Chết Chóc", elementId: "hazard", rarityId: "common", atk: 20, hp: 14, def: 0, spd: 28, crt: 11, int: 2, abilityId: "off_09", artVariant: 1 },
  { id: 154, name: "Sơn Khô Cũ", subtitle: "Kẻ Đóng Vảy Độc", elementId: "hazard", rarityId: "common", atk: 14, hp: 20, def: 4, spd: 18, crt: 7, int: 5, abilityId: "off_05", artVariant: 2 },
  { id: 155, name: "Dung Môi Hóa Chất", subtitle: "Người Hòa Tan Mọi Thứ", elementId: "hazard", rarityId: "common", atk: 17, hp: 16, def: 2, spd: 24, crt: 9, int: 3, abilityId: "off_04", artVariant: 3 },
  { id: 156, name: "Keo 502 Khô", subtitle: "Kẻ Dính Chặt Vĩnh Viễn", elementId: "hazard", rarityId: "common", atk: 12, hp: 22, def: 6, spd: 14, crt: 6, int: 5, abilityId: "utl_16", artVariant: 4 },
  { id: 157, name: "Axít Tẩy Rửa", subtitle: "Người Ăn Mòn Kinh Khủng", elementId: "hazard", rarityId: "common", atk: 22, hp: 12, def: 0, spd: 30, crt: 12, int: 2, abilityId: "off_09", artVariant: 5 },
  { id: 158, name: "Pin Đồng Hồ", subtitle: "Kẻ Nhỏ Bé Chết Người", elementId: "hazard", rarityId: "common", atk: 15, hp: 17, def: 2, spd: 23, crt: 8, int: 4, abilityId: "off_04", artVariant: 6 },
  { id: 159, name: "Thuốc Nổ Cũ", subtitle: "Người Chờ Ngày Nổ", elementId: "hazard", rarityId: "common", atk: 25, hp: 10, def: 0, spd: 20, crt: 15, int: 3, abilityId: "off_13", artVariant: 7 },
  { id: 160, name: "Dầu Nhớt Thải", subtitle: "Kẻ Đen Đặc Bẩn", elementId: "hazard", rarityId: "common", atk: 13, hp: 24, def: 5, spd: 12, crt: 6, int: 4, abilityId: "def_05", artVariant: 8 },
  { id: 161, name: "Bình Gas Mini", subtitle: "Người Chứa Lửa Giận", elementId: "hazard", rarityId: "common", atk: 19, hp: 14, def: 1, spd: 26, crt: 10, int: 2, abilityId: "off_13", artVariant: 1 },
  { id: 162, name: "Cyanua Cũ", subtitle: "Kẻ Chết Người Thầm Lặng", elementId: "hazard", rarityId: "common", atk: 24, hp: 11, def: 0, spd: 22, crt: 14, int: 4, abilityId: "off_09", artVariant: 2 },
  { id: 163, name: "Thủy Ngân Nhiệt Kế", subtitle: "Người Lạnh Giá Chết Người", elementId: "hazard", rarityId: "common", atk: 16, hp: 18, def: 3, spd: 20, crt: 8, int: 6, abilityId: "off_04", artVariant: 3 },
  { id: 164, name: "Sợi Amiang", subtitle: "Kẻ Siêu Nhỏ Tử Thần", elementId: "hazard", rarityId: "common", atk: 18, hp: 15, def: 2, spd: 24, crt: 10, int: 3, abilityId: "off_15", artVariant: 4 },
  { id: 165, name: "Thuốc Diệt Cỏ", subtitle: "Người Tiêu Diệt Xanh", elementId: "hazard", rarityId: "common", atk: 17, hp: 16, def: 1, spd: 25, crt: 9, int: 3, abilityId: "off_09", artVariant: 5 },
  { id: 166, name: "Keo Epoxy Thừa", subtitle: "Kẻ Kết Dính Siêu Chắc", elementId: "hazard", rarityId: "common", atk: 11, hp: 23, def: 7, spd: 13, crt: 5, int: 5, abilityId: "utl_16", artVariant: 6 },
  { id: 167, name: "Sơn Dầu Độc", subtitle: "Người Tô Vẽ Chết Chóc", elementId: "hazard", rarityId: "common", atk: 15, hp: 19, def: 3, spd: 21, crt: 8, int: 4, abilityId: "off_05", artVariant: 7 },
  { id: 168, name: "Ắc Quy Ô tô", subtitle: "Kẻ Tích Điện Khổng Lồ", elementId: "hazard", rarityId: "common", atk: 20, hp: 22, def: 4, spd: 10, crt: 8, int: 4, abilityId: "off_18", artVariant: 8 },
  { id: 169, name: "Khí Gas Thải", subtitle: "Người Bốc Mùi Hôi", elementId: "hazard", rarityId: "common", atk: 14, hp: 17, def: 2, spd: 28, crt: 8, int: 3, abilityId: "off_04", artVariant: 1 },
  { id: 170, name: "Dầu Hỏa Cũ", subtitle: "Kẻ Dễ Cháy Nổ", elementId: "hazard", rarityId: "common", atk: 21, hp: 13, def: 0, spd: 24, crt: 12, int: 2, abilityId: "off_13", artVariant: 2 },
  { id: 171, name: "Thuốc Nhuộm Cũ", subtitle: "Người Tô Màu Độc", elementId: "hazard", rarityId: "common", atk: 13, hp: 20, def: 4, spd: 18, crt: 7, int: 6, abilityId: "off_05", artVariant: 3 },
  { id: 172, name: "Nhựa Thông", subtitle: "Kẻ Dính Nhớp Bẩn", elementId: "hazard", rarityId: "common", atk: 12, hp: 22, def: 5, spd: 15, crt: 6, int: 5, abilityId: "def_05", artVariant: 4 },
  { id: 173, name: "Bã Hóa Chất", subtitle: "Người Phế Thải Độc Hại", elementId: "hazard", rarityId: "common", atk: 15, hp: 18, def: 3, spd: 20, crt: 8, int: 4, abilityId: "off_15", artVariant: 5 },
  { id: 174, name: "Mực In Cũ", subtitle: "Kẻ Đen Đặc Mùi", elementId: "hazard", rarityId: "common", atk: 11, hp: 21, def: 5, spd: 16, crt: 6, int: 6, abilityId: "def_11", artVariant: 6 },
  { id: 175, name: "Dung Dịch Tẩy", subtitle: "Người Tẩy Trắng Mọi Thứ", elementId: "hazard", rarityId: "common", atk: 18, hp: 15, def: 1, spd: 26, crt: 10, int: 3, abilityId: "off_09", artVariant: 7 },
  { id: 176, name: "Pháo Hoa Cũ", subtitle: "Kẻ Chờ Bùng Nổ", elementId: "hazard", rarityId: "common", atk: 23, hp: 12, def: 0, spd: 22, crt: 13, int: 2, abilityId: "off_13", artVariant: 8 },
  { id: 177, name: "Than Chì Độc", subtitle: "Người Đen Kịt Mặt", elementId: "hazard", rarityId: "common", atk: 14, hp: 19, def: 4, spd: 18, crt: 7, int: 5, abilityId: "def_05", artVariant: 1 },
  { id: 178, name: "Thuốc Thử Hóa", subtitle: "Kẻ Biến Màu Kỳ Lạ", elementId: "hazard", rarityId: "common", atk: 16, hp: 17, def: 2, spd: 23, crt: 9, int: 5, abilityId: "off_04", artVariant: 2 },
  { id: 179, name: "Vôi Sống", subtitle: "Người Cay Bỏng Rát", elementId: "hazard", rarityId: "common", atk: 19, hp: 14, def: 2, spd: 21, crt: 10, int: 3, abilityId: "off_05", artVariant: 3 },
  { id: 180, name: "Bông Gòn Nhiễm", subtitle: "Kẻ Nhiễm Khuẩn Chết", elementId: "hazard", rarityId: "common", atk: 13, hp: 20, def: 3, spd: 19, crt: 7, int: 5, abilityId: "off_09", artVariant: 4 },

  // RARE CARDS (181-270) - 90 rare cards
  // RARE PLASTIC (181-195)
  { id: 181, name: "Lon Bia Tình Yêu", subtitle: "Kẻ Thù Vĩnh Cửu Của Thuỷ Tinh", elementId: "plastic", rarityId: "rare", atk: 18, hp: 35, def: 8, spd: 20, crt: 10, int: 6, abilityId: "off_08", artVariant: 1 },
  { id: 182, name: "Xác Đại Bàng Sét", subtitle: "Người Lướt Sóng Bão Tố", elementId: "plastic", rarityId: "rare", atk: 22, hp: 28, def: 5, spd: 32, crt: 14, int: 4, abilityId: "off_02", artVariant: 2 },
  { id: 183, name: "Túi Ni-Lông Bóng Đêm", subtitle: "Kẻ Bao Phủ Bầu Trời Đêm", elementId: "plastic", rarityId: "rare", atk: 14, hp: 42, def: 12, spd: 15, crt: 7, int: 8, abilityId: "def_04", artVariant: 3 },
  { id: 184, name: "Lốp Xe Đua", subtitle: "Người Bám Đường Siêu Tốc", elementId: "plastic", rarityId: "rare", atk: 20, hp: 32, def: 10, spd: 28, crt: 12, int: 5, abilityId: "off_03", artVariant: 4 },
  { id: 185, name: "Màng Bọc Thực Phẩm", subtitle: "Kẻ Bảo Vệ Bữa Ăn Tươi", elementId: "plastic", rarityId: "rare", atk: 12, hp: 38, def: 15, spd: 12, crt: 6, int: 10, abilityId: "def_07", artVariant: 5 },
  { id: 186, name: "Ống Tiêm Y Tế", subtitle: "Người Tiêm Phòng Hiệu Quả", elementId: "plastic", rarityId: "rare", atk: 24, hp: 25, def: 3, spd: 30, crt: 15, int: 7, abilityId: "off_09", artVariant: 6 },
  { id: 187, name: "Vỏ Máy Tính Bảng", subtitle: "Kẻ Che Chắn Công Nghệ", elementId: "plastic", rarityId: "rare", atk: 16, hp: 36, def: 14, spd: 18, crt: 8, int: 12, abilityId: "def_10", artVariant: 7 },
  { id: 188, name: "Bình Sữa Titan", subtitle: "Người Chứa Sữa Bền Bỉ", elementId: "plastic", rarityId: "rare", atk: 14, hp: 48, def: 12, spd: 10, crt: 5, int: 8, abilityId: "utl_03", artVariant: 8 },
  { id: 189, name: "Dây Cáp Quang", subtitle: "Kẻ Truyền Tải Tốc Độ", elementId: "plastic", rarityId: "rare", atk: 18, hp: 30, def: 8, spd: 35, crt: 11, int: 9, abilityId: "off_06", artVariant: 1 },
  { id: 190, name: "Mũ Bảo Hộ Nano", subtitle: "Người Bảo Vệ Đầu Óc", elementId: "plastic", rarityId: "rare", atk: 15, hp: 40, def: 16, spd: 14, crt: 6, int: 10, abilityId: "def_06", artVariant: 2 },
  { id: 191, name: "Bộ Điều Khiển Game", subtitle: "Kẻ Cầm Quyền Chiến Thắng", elementId: "plastic", rarityId: "rare", atk: 22, hp: 28, def: 6, spd: 26, crt: 13, int: 8, abilityId: "off_14", artVariant: 3 },
  { id: 192, name: "Hộp Đựng Dụng Cụ", subtitle: "Người Sắp Xếp Ngăn Nắp", elementId: "plastic", rarityId: "rare", atk: 16, hp: 38, def: 14, spd: 16, crt: 7, int: 9, abilityId: "def_08", artVariant: 4 },
  { id: 193, name: "Kính VR Thực Tế", subtitle: "Kẻ Nhìn Thấy Thế Giới Khác", elementId: "plastic", rarityId: "rare", atk: 20, hp: 32, def: 8, spd: 24, crt: 12, int: 14, abilityId: "utl_07", artVariant: 5 },
  { id: 194, name: "Thùng Rác Thông Minh", subtitle: "Người Phân Loại Tự Động", elementId: "plastic", rarityId: "rare", atk: 18, hp: 35, def: 10, spd: 20, crt: 9, int: 12, abilityId: "utl_09", artVariant: 6 },
  { id: 195, name: "Bơm Xăng Mini", subtitle: "Kẻ Tiếp Nhiên Liệu Nhanh", elementId: "plastic", rarityId: "rare", atk: 26, hp: 24, def: 5, spd: 28, crt: 14, int: 5, abilityId: "off_02", artVariant: 7 },

  // RARE PAPER (196-210)
  { id: 196, name: "Giấy Tiền Cũ", subtitle: "Người Lưu Giữ Giá Trị", elementId: "paper", rarityId: "rare", atk: 16, hp: 38, def: 10, spd: 18, crt: 8, int: 15, abilityId: "utl_09", artVariant: 8 },
  { id: 197, name: "Sổ Địa Chỉ Xưa", subtitle: "Kẻ Ghi Nhớ Mọi Người", elementId: "paper", rarityId: "rare", atk: 12, hp: 42, def: 12, spd: 14, crt: 6, int: 16, abilityId: "utl_08", artVariant: 1 },
  { id: 198, name: "Bản Đồ Kho Báu", subtitle: "Người Dẫn Lối Vàng", elementId: "paper", rarityId: "rare", atk: 18, hp: 34, def: 8, spd: 22, crt: 10, int: 14, abilityId: "utl_07", artVariant: 2 },
  { id: 199, name: "Kịch Bản Phim Cũ", subtitle: "Kẻ Viết Nên Huyền Thoại", elementId: "paper", rarityId: "rare", atk: 20, hp: 30, def: 6, spd: 24, crt: 12, int: 15, abilityId: "off_06", artVariant: 3 },
  { id: 200, name: "Hợp Đồng Vĩnh Viễn", subtitle: "Người Ký Tên Số Phận", elementId: "paper", rarityId: "rare", atk: 14, hp: 40, def: 14, spd: 12, crt: 6, int: 18, abilityId: "def_10", artVariant: 4 },
  { id: 201, name: "Di Chúc Cổ Vật", subtitle: "Kẻ Để Lại Di Sản", elementId: "paper", rarityId: "rare", atk: 10, hp: 48, def: 16, spd: 8, crt: 4, int: 20, abilityId: "utl_05", artVariant: 5 },
  { id: 202, name: "Album Ảnh Cũ", subtitle: "Người Lưu Giữ Kỷ Niệm", elementId: "paper", rarityId: "rare", atk: 14, hp: 44, def: 12, spd: 14, crt: 7, int: 14, abilityId: "utl_17", artVariant: 6 },
  { id: 203, name: "Sách Ma Cà Rồng", subtitle: "Kẻ Ghi Lời Nguyền", elementId: "paper", rarityId: "rare", atk: 22, hp: 28, def: 4, spd: 26, crt: 14, int: 12, abilityId: "off_09", artVariant: 7 },
  { id: 204, name: "Bản Nhạc Bất Hủ", subtitle: "Người Gióng Lên Bản Giao Hưởng", elementId: "paper", rarityId: "rare", atk: 18, hp: 36, def: 8, spd: 20, crt: 10, int: 14, abilityId: "off_17", artVariant: 8 },
  { id: 205, name: "Thiệp Cưới Vàng", subtitle: "Kẻ Ràng Buộc Tình Yêu", elementId: "paper", rarityId: "rare", atk: 12, hp: 46, def: 14, spd: 10, crt: 5, int: 16, abilityId: "def_19", artVariant: 1 },
  { id: 206, name: "Giấy Phép Thần Tốc", subtitle: "Người Đi Đường Vòng", elementId: "paper", rarityId: "rare", atk: 20, hp: 32, def: 6, spd: 30, crt: 12, int: 10, abilityId: "utl_07", artVariant: 2 },
  { id: 207, name: "Văn Bản Luật Pháp", subtitle: "Kẻ Bảo Vệ Công Lý", elementId: "paper", rarityId: "rare", atk: 16, hp: 40, def: 16, spd: 12, crt: 7, int: 15, abilityId: "def_10", artVariant: 3 },
  { id: 208, name: "Bản Tin Chiến Tranh", subtitle: "Người Đưa Tin Thảm Khốc", elementId: "paper", rarityId: "rare", atk: 24, hp: 26, def: 4, spd: 28, crt: 15, int: 10, abilityId: "off_03", artVariant: 4 },
  { id: 209, name: "Giấy Vẽ Tranh Đầu", subtitle: "Kẻ Tô Vẽ Tương Lai", elementId: "paper", rarityId: "rare", atk: 14, hp: 42, def: 10, spd: 16, crt: 8, int: 16, abilityId: "utl_18", artVariant: 5 },
  { id: 210, name: "Sổ Ghi Chép Nhật Ký", subtitle: "Người Viết Lời Thì Thầm", elementId: "paper", rarityId: "rare", atk: 12, hp: 44, def: 12, spd: 14, crt: 6, int: 18, abilityId: "utl_08", artVariant: 6 },

  // RARE GLASS (211-225)
  { id: 211, name: "Kính Viễn Vọng Cổ", subtitle: "Kẻ Nhìn Xa Muôn Trùng", elementId: "glass", rarityId: "rare", atk: 18, hp: 34, def: 10, spd: 22, crt: 10, int: 16, abilityId: "utl_18", artVariant: 7 },
  { id: 212, name: "Bình Ngâm Rượu", subtitle: "Người Ủ Hương Vị Thời Gian", elementId: "glass", rarityId: "rare", atk: 16, hp: 42, def: 14, spd: 12, crt: 7, int: 12, abilityId: "def_18", artVariant: 8 },
  { id: 213, name: "Ly Pha Lê Hoàng Gia", subtitle: "Kẻ Uống Nước Thánh", elementId: "glass", rarityId: "rare", atk: 20, hp: 36, def: 12, spd: 18, crt: 11, int: 10, abilityId: "def_02", artVariant: 1 },
  { id: 214, name: "Gương Chiếu Đại", subtitle: "Người Phản Chiếu Sự Thật", elementId: "glass", rarityId: "rare", atk: 14, hp: 44, def: 16, spd: 14, crt: 6, int: 14, abilityId: "def_05", artVariant: 2 },
  { id: 215, name: "Lọ Đựng Tinh Dầu", subtitle: "Kẻ Chiết Xuất Tinh Hoa", elementId: "glass", rarityId: "rare", atk: 18, hp: 38, def: 10, spd: 20, crt: 9, int: 14, abilityId: "utl_01", artVariant: 3 },
  { id: 216, name: "Bóng Đèn Edison", subtitle: "Người Tỏa Sáng Cổ Điển", elementId: "glass", rarityId: "rare", atk: 22, hp: 30, def: 6, spd: 26, crt: 13, int: 8, abilityId: "off_05", artVariant: 4 },
  { id: 217, name: "Kính Áp Tròng", subtitle: "Kẻ Nhìn Thấu Mọi Lớp", elementId: "glass", rarityId: "rare", atk: 16, hp: 40, def: 12, spd: 18, crt: 8, int: 16, abilityId: "utl_18", artVariant: 5 },
  { id: 218, name: "Chai Rượu Vang Đỏ", subtitle: "Người Men Say Quý Tộc", elementId: "glass", rarityId: "rare", atk: 20, hp: 34, def: 10, spd: 16, crt: 10, int: 12, abilityId: "def_02", artVariant: 6 },
  { id: 219, name: "Lọ Thí Nghiệm Huyền", subtitle: "Kẻ Pha Chế Thuốc Phép", elementId: "glass", rarityId: "rare", atk: 24, hp: 28, def: 4, spd: 28, crt: 15, int: 12, abilityId: "off_04", artVariant: 7 },
  { id: 220, name: "Ly Uống Nước Thánh", subtitle: "Người Thanh Tẩy Tâm Hồn", elementId: "glass", rarityId: "rare", atk: 14, hp: 46, def: 16, spd: 10, crt: 5, int: 14, abilityId: "def_19", artVariant: 8 },
  { id: 221, name: "Kính Hiển Vi", subtitle: "Kẻ Thấy Thế Giới Vi Mô", elementId: "glass", rarityId: "rare", atk: 18, hp: 36, def: 10, spd: 20, crt: 10, int: 18, abilityId: "utl_18", artVariant: 1 },
  { id: 222, name: "Bình Karaoke", subtitle: "Người Hát Gió Sông", elementId: "glass", rarityId: "rare", atk: 20, hp: 32, def: 8, spd: 24, crt: 12, int: 10, abilityId: "off_17", artVariant: 2 },
  { id: 223, name: "Lọ Đựng Tro Cốt", subtitle: "Kẻ Giữ Xác Người Thân", elementId: "glass", rarityId: "rare", atk: 10, hp: 50, def: 18, spd: 6, crt: 3, int: 16, abilityId: "def_20", artVariant: 3 },
  { id: 224, name: "Chai Nước Hoa Pháp", subtitle: "Người Tỏa Hương Quyến Rũ", elementId: "glass", rarityId: "rare", atk: 16, hp: 40, def: 12, spd: 16, crt: 8, int: 14, abilityId: "utl_08", artVariant: 4 },
  { id: 225, name: "Gương soi Thần Bí", subtitle: "Kẻ Hiện Thân Điềm Báo", elementId: "glass", rarityId: "rare", atk: 22, hp: 30, def: 8, spd: 22, crt: 13, int: 14, abilityId: "off_11", artVariant: 5 },

  // RARE METAL (226-240)
  { id: 226, name: "Lon Bia Triệu Like", subtitle: "Người Nổi Tiếng Mạng Xã Hội", elementId: "metal", rarityId: "rare", atk: 24, hp: 32, def: 12, spd: 22, crt: 14, int: 8, abilityId: "off_14", artVariant: 6 },
  { id: 227, name: "Hộp Đựng Vàng", subtitle: "Kẻ Bảo Vệ Kho Báu", elementId: "metal", rarityId: "rare", atk: 16, hp: 46, def: 20, spd: 10, crt: 6, int: 12, abilityId: "def_12", artVariant: 7 },
  { id: 228, name: "Vỏ Máy Bay Chiến", subtitle: "Người Lướt Trên Trời Cao", elementId: "metal", rarityId: "rare", atk: 28, hp: 30, def: 8, spd: 35, crt: 16, int: 6, abilityId: "off_03", artVariant: 8 },
  { id: 229, name: "Lon Tên Lửa", subtitle: "Kẻ Phóng Lên Bầu Trời", elementId: "metal", rarityId: "rare", atk: 30, hp: 24, def: 4, spd: 32, crt: 18, int: 4, abilityId: "off_13", artVariant: 1 },
  { id: 230, name: "Khiên Ngự Sử", subtitle: "Người Bảo Vệ Hoàng Đế", elementId: "metal", rarityId: "rare", atk: 18, hp: 48, def: 22, spd: 8, crt: 6, int: 10, abilityId: "def_12", artVariant: 2 },
  { id: 231, name: "Vỏ Tàu Ngầm", subtitle: "Kẻ Lặn Sâu Thẳm", elementId: "metal", rarityId: "rare", atk: 20, hp: 44, def: 18, spd: 12, crt: 8, int: 8, abilityId: "def_20", artVariant: 3 },
  { id: 232, name: "Lon Phi Thuyền", subtitle: "Người Du Hành Vũ Trụ", elementId: "metal", rarityId: "rare", atk: 26, hp: 34, def: 10, spd: 28, crt: 14, int: 10, abilityId: "off_16", artVariant: 4 },
  { id: 233, name: "VỏXe Tăng Lịch Sử", subtitle: "Kẻ Chiến Thắng Quân Thù", elementId: "metal", rarityId: "rare", atk: 32, hp: 38, def: 16, spd: 8, crt: 10, int: 6, abilityId: "def_10", artVariant: 5 },
  { id: 234, name: "Lon Vệ Tinh", subtitle: "Người Quan Sát Trái Đất", elementId: "metal", rarityId: "rare", atk: 22, hp: 36, def: 12, spd: 30, crt: 12, int: 14, abilityId: "utl_18", artVariant: 6 },
  { id: 235, name: "Hộp Tin Nhắn Bí Mật", subtitle: "Kẻ Mã Hóa Thông Điệp", elementId: "metal", rarityId: "rare", atk: 18, hp: 40, def: 14, spd: 18, crt: 9, int: 16, abilityId: "off_06", artVariant: 7 },
  { id: 236, name: "Lon Điện Tử", subtitle: "Người Chứa Circuit", elementId: "metal", rarityId: "rare", atk: 24, hp: 30, def: 10, spd: 26, crt: 14, int: 12, abilityId: "off_06", artVariant: 8 },
  { id: 237, name: "Vỏ Máy Photocopy", subtitle: "Kẻ Sao Chép Tài Liệu", elementId: "metal", rarityId: "rare", atk: 16, hp: 42, def: 16, spd: 14, crt: 7, int: 12, abilityId: "utl_09", artVariant: 1 },
  { id: 238, name: "Lon Robot Mini", subtitle: "Người Máy Nhỏ Bé", elementId: "metal", rarityId: "rare", atk: 22, hp: 34, def: 12, spd: 24, crt: 12, int: 12, abilityId: "off_14", artVariant: 2 },
  { id: 239, name: "Hộp Âm Thanh", subtitle: "Kẻ Phát Nhạc Sống", elementId: "metal", rarityId: "rare", atk: 18, hp: 38, def: 10, spd: 22, crt: 10, int: 12, abilityId: "off_17", artVariant: 3 },
  { id: 240, name: "Vỏ Động Cơ Phản Lực", subtitle: "Người Phản Lực Siêu Tốc", elementId: "metal", rarityId: "rare", atk: 28, hp: 28, def: 8, spd: 36, crt: 16, int: 6, abilityId: "off_02", artVariant: 4 },

  // RARE ORGANIC (241-255)
  { id: 241, name: "Vỏ Trứng Ngàn Năm", subtitle: "Kẻ Chờ Ngày Nở", elementId: "organic", rarityId: "rare", atk: 14, hp: 50, def: 18, spd: 8, crt: 5, int: 12, abilityId: "def_20", artVariant: 5 },
  { id: 242, name: "Hạt Giống Cổ Đại", subtitle: "Người Ngủ Ngàn Năm", elementId: "organic", rarityId: "rare", atk: 16, hp: 48, def: 16, spd: 10, crt: 6, int: 14, abilityId: "utl_05", artVariant: 6 },
  { id: 243, name: "Xương Khủng Long", subtitle: "Kẻ Sống Từ Kỷ Jura", elementId: "organic", rarityId: "rare", atk: 26, hp: 40, def: 14, spd: 12, crt: 12, int: 8, abilityId: "def_18", artVariant: 7 },
  { id: 244, name: "Hóa Thạch Cây Cổ", subtitle: "Người Kể Chuyện Đại Dương", elementId: "organic", rarityId: "rare", atk: 18, hp: 46, def: 18, spd: 8, crt: 7, int: 14, abilityId: "def_17", artVariant: 8 },
  { id: 245, name: "Nấm Linh Chi Trời", subtitle: "Kẻ Hút Tinh Hoa Đất", elementId: "organic", rarityId: "rare", atk: 20, hp: 44, def: 12, spd: 14, crt: 10, int: 16, abilityId: "utl_01", artVariant: 1 },
  { id: 246, name: "San Hô Biển Sâu", subtitle: "Người Xây Rạn San Hô", elementId: "organic", rarityId: "rare", atk: 16, hp: 48, def: 20, spd: 8, crt: 6, int: 12, abilityId: "def_20", artVariant: 2 },
  { id: 247, name: "Bào Tử Cổ Xưa", subtitle: "Kẻ Sống Khắp Nơi", elementId: "organic", rarityId: "rare", atk: 22, hp: 38, def: 10, spd: 20, crt: 12, int: 12, abilityId: "off_15", artVariant: 3 },
  { id: 248, name: "Vỏ Sò Biển Đông", subtitle: "Người Lưu Giữ Âm Hưởng Sóng", elementId: "organic", rarityId: "rare", atk: 14, hp: 50, def: 16, spd: 10, crt: 5, int: 14, abilityId: "def_19", artVariant: 4 },
  { id: 249, name: "Rong Biển Nguyên Sinh", subtitle: "Kẻ Tạo Oxy Nguyên Thuỷ", elementId: "organic", rarityId: "rare", atk: 18, hp: 42, def: 14, spd: 16, crt: 8, int: 14, abilityId: "def_17", artVariant: 5 },
  { id: 250, name: "Gỗ Hóa Đá Triều", subtitle: "Người Đứng Vững Ngàn Năm", elementId: "organic", rarityId: "rare", atk: 20, hp: 46, def: 20, spd: 8, crt: 7, int: 10, abilityId: "def_18", artVariant: 6 },
  { id: 251, name: "Nhựa Cây Hổ Phách", subtitle: "Kẻ Giữ Thời Gian", elementId: "organic", rarityId: "rare", atk: 16, hp: 48, def: 18, spd: 10, crt: 6, int: 16, abilityId: "def_13", artVariant: 7 },
  { id: 252, name: "Phấn Hoa Đóng Băng", subtitle: "Người Ngủ Đông Mùa Đông", elementId: "organic", rarityId: "rare", atk: 18, hp: 44, def: 14, spd: 14, crt: 9, int: 14, abilityId: "utl_05", artVariant: 8 },
  { id: 253, name: "Vỏ Trái Cây Tiên", subtitle: "Kẻ Ăn Vào Trường Sinh", elementId: "organic", rarityId: "rare", atk: 22, hp: 40, def: 12, spd: 18, crt: 11, int: 14, abilityId: "utl_20", artVariant: 1 },
  { id: 254, name: "Mật Ong Ngàn Năm", subtitle: "Người Ngọt Ngào Bất Tử", elementId: "organic", rarityId: "rare", atk: 14, hp: 52, def: 16, spd: 8, crt: 5, int: 16, abilityId: "utl_03", artVariant: 2 },
  { id: 255, name: "Rễ Cây Nguyệt Thực", subtitle: "Kẻ Hút Ánh Trăng", elementId: "organic", rarityId: "rare", atk: 20, hp: 42, def: 14, spd: 16, crt: 10, int: 14, abilityId: "off_18", artVariant: 3 },

  // RARE HAZARD (256-270)
  { id: 256, name: "Lò Phản Ứng Hạt Nhân", subtitle: "Người Chia Cắt Nguyên Tử", elementId: "hazard", rarityId: "rare", atk: 35, hp: 30, def: 6, spd: 20, crt: 18, int: 10, abilityId: "off_15", artVariant: 4 },
  { id: 257, name: "Bom Nguyên Tử Mini", subtitle: "Kẻ Hủy Diệt Nhỏ Gọn", elementId: "hazard", rarityId: "rare", atk: 40, hp: 20, def: 0, spd: 15, crt: 22, int: 8, abilityId: "off_20", artVariant: 5 },
  { id: 258, name: "Chất Phóng Xạ Xanh", subtitle: "Người Tỏa Sáng Chết Chóc", elementId: "hazard", rarityId: "rare", atk: 28, hp: 26, def: 4, spd: 32, crt: 16, int: 12, abilityId: "off_15", artVariant: 6 },
  { id: 259, name: "Virus Corona Cũ", subtitle: "Kẻ Lan Tràn Khắp Thế Giới", elementId: "hazard", rarityId: "rare", atk: 30, hp: 22, def: 2, spd: 35, crt: 18, int: 10, abilityId: "off_09", artVariant: 7 },
  { id: 260, name: "Thiết Bị Sinh Học", subtitle: "Người Tạo Sinh Vật Mới", elementId: "hazard", rarityId: "rare", atk: 26, hp: 28, def: 8, spd: 28, crt: 14, int: 16, abilityId: "off_06", artVariant: 8 },
  { id: 261, name: "Chất Độc Thần Kinh", subtitle: "Kẻ Phá Hủy Não Bộ", elementId: "hazard", rarityId: "rare", atk: 32, hp: 24, def: 2, spd: 30, crt: 18, int: 10, abilityId: "off_09", artVariant: 1 },
  { id: 262, name: "Bức Xạ Vũ Trụ", subtitle: "Người Biến Đổi DNA", elementId: "hazard", rarityId: "rare", atk: 28, hp: 26, def: 4, spd: 32, crt: 16, int: 14, abilityId: "off_15", artVariant: 2 },
  { id: 263, name: "Nanobot Sát Thủ", subtitle: "Kẻ Xâm Nhập Tế Bào", elementId: "hazard", rarityId: "rare", atk: 34, hp: 22, def: 2, spd: 38, crt: 20, int: 12, abilityId: "off_16", artVariant: 3 },
  { id: 264, name: "Chất Khí Độc Hại", subtitle: "Người Ngạt Thở Âm Thầm", elementId: "hazard", rarityId: "rare", atk: 26, hp: 24, def: 4, spd: 34, crt: 15, int: 10, abilityId: "off_04", artVariant: 4 },
  { id: 265, name: "Plutonium Nguyên Chất", subtitle: "Kẻ Nặng Hơn Vàng", elementId: "hazard", rarityId: "rare", atk: 38, hp: 28, def: 8, spd: 18, crt: 18, int: 10, abilityId: "off_18", artVariant: 5 },
  { id: 266, name: "Laser Hủy Diệt", subtitle: "Người Đốt cháy Mọi Thứ", elementId: "hazard", rarityId: "rare", atk: 36, hp: 22, def: 2, spd: 30, crt: 20, int: 8, abilityId: "off_07", artVariant: 6 },
  { id: 267, name: "Vi Khuẩn Ăn Thịt", subtitle: "Kẻ Hoành Hành плоть", elementId: "hazard", rarityId: "rare", atk: 30, hp: 26, def: 4, spd: 32, crt: 17, int: 10, abilityId: "off_09", artVariant: 7 },
  { id: 268, name: "Chất Nổ Lỏng", subtitle: "Người Phá Hủy Tức Khắc", elementId: "hazard", rarityId: "rare", atk: 42, hp: 18, def: 0, spd: 22, crt: 24, int: 6, abilityId: "off_13", artVariant: 8 },
  { id: 269, name: "Tia Vũ Trụ Gamma", subtitle: "Kẻ Giết Chết Tế Bào", elementId: "hazard", rarityId: "rare", atk: 32, hp: 24, def: 2, spd: 34, crt: 18, int: 12, abilityId: "off_15", artVariant: 1 },
  { id: 270, name: "Kim Loại Nặng Độc", subtitle: "Người Đầu Độc Âm Thầm", elementId: "hazard", rarityId: "rare", atk: 28, hp: 28, def: 6, spd: 26, crt: 15, int: 12, abilityId: "off_05", artVariant: 2 },

  // EPIC CARDS (271-294) - 24 epic cards
  { id: 271, name: "Lon Bia Tình Yêu", subtitle: "Kẻ Ngàn Năm Chờ Đợi", elementId: "plastic", rarityId: "epic", atk: 35, hp: 60, def: 20, spd: 40, crt: 22, int: 18, abilityId: "off_14", artVariant: 3 },
  { id: 272, name: "Xác Đại Bàng Sét", subtitle: "Người Bay Trong Bão", elementId: "plastic", rarityId: "epic", atk: 40, hp: 50, def: 12, spd: 55, crt: 28, int: 14, abilityId: "off_10", artVariant: 4 },
  { id: 273, name: "Túi Ni-Lông Bóng Đêm", subtitle: "Kẻ Nuốt Trọn Mặt Trăng", elementId: "plastic", rarityId: "epic", atk: 28, hp: 75, def: 30, spd: 30, crt: 16, int: 24, abilityId: "def_10", artVariant: 5 },
  { id: 274, name: "Lốp Xe Đua", subtitle: "Người Để Lại Vết cháy", elementId: "plastic", rarityId: "epic", atk: 42, hp: 55, def: 22, spd: 50, crt: 26, int: 12, abilityId: "off_03", artVariant: 6 },
  { id: 275, name: "Màng Bọc Thực Phẩm", subtitle: "Kẻ Bảo Vệ Vạn Vật", elementId: "plastic", rarityId: "epic", atk: 24, hp: 80, def: 35, spd: 20, crt: 12, int: 28, abilityId: "def_12", artVariant: 7 },
  { id: 276, name: "Vỏ Trứng Ngàn Năm", subtitle: "Người Chờ Ngày Nở", elementId: "organic", rarityId: "epic", atk: 30, hp: 85, def: 40, spd: 15, crt: 10, int: 30, abilityId: "def_20", artVariant: 8 },
  { id: 277, name: "Hạt Giống Cổ Đại", subtitle: "Kẻ Ngủ Ngàn Năm Thức Tỉnh", elementId: "organic", rarityId: "epic", atk: 35, hp: 80, def: 35, spd: 20, crt: 14, int: 32, abilityId: "utl_05", artVariant: 1 },
  { id: 278, name: "Xương Khủng Long", subtitle: "Người Sống Từ Kỷ Jura", elementId: "organic", rarityId: "epic", atk: 50, hp: 70, def: 30, spd: 25, crt: 24, int: 18, abilityId: "def_18", artVariant: 2 },
  { id: 279, name: "Lò Phản Ứng Hạt Nhân", subtitle: "Kẻ Chia Cắt Nguyên Tử", elementId: "hazard", rarityId: "epic", atk: 60, hp: 50, def: 15, spd: 35, crt: 32, int: 24, abilityId: "off_20", artVariant: 3 },
  { id: 280, name: "Bom Nguyên Tử Mini", subtitle: "Người Hủy Diệt Nhỏ Gọn", elementId: "hazard", rarityId: "epic", atk: 75, hp: 35, def: 0, spd: 25, crt: 45, int: 18, abilityId: "off_20", artVariant: 4 },
  { id: 281, name: "Chất Phóng Xạ Xanh", subtitle: "Kẻ Tỏa Sáng Chết Chóc", elementId: "hazard", rarityId: "epic", atk: 55, hp: 45, def: 10, spd: 55, crt: 32, int: 28, abilityId: "off_15", artVariant: 5 },
  { id: 282, name: "Kính Viễn Vọng Cổ", subtitle: "Người Nhìn Xa Muôn Trùng", elementId: "glass", rarityId: "epic", atk: 35, hp: 65, def: 25, spd: 40, crt: 22, int: 38, abilityId: "utl_18", artVariant: 6 },
  { id: 283, name: "Bình Ngâm Rượu", subtitle: "Kẻ Ủ Hương Vị Thời Gian", elementId: "glass", rarityId: "epic", atk: 32, hp: 75, def: 35, spd: 22, crt: 16, int: 28, abilityId: "def_18", artVariant: 7 },
  { id: 284, name: "Lon Tên Lửa", subtitle: "Người Phóng Lên Bầu Trời", elementId: "metal", rarityId: "epic", atk: 58, hp: 45, def: 12, spd: 60, crt: 35, int: 12, abilityId: "off_13", artVariant: 8 },
  { id: 285, name: "Hộp Đựng Vàng", subtitle: "Kẻ Bảo Vệ Kho Báu", elementId: "metal", rarityId: "epic", atk: 32, hp: 85, def: 45, spd: 18, crt: 12, int: 28, abilityId: "def_12", artVariant: 1 },
  { id: 286, name: "Giấy Tiền Cổ", subtitle: "Người Lưu Giữ Tài Sản Vô Giá", elementId: "paper", rarityId: "epic", atk: 30, hp: 70, def: 28, spd: 30, crt: 16, int: 40, abilityId: "utl_20", artVariant: 2 },
  { id: 287, name: "Sổ Địa Chỉ Xưa", subtitle: "Kẻ Ghi Nhớ Mọi Người", elementId: "paper", rarityId: "epic", atk: 25, hp: 80, def: 30, spd: 25, crt: 14, int: 42, abilityId: "utl_08", artVariant: 3 },
  { id: 288, name: "Bản Đồ Kho Báu", subtitle: "Người Dẫn Lối Vàng", elementId: "paper", rarityId: "epic", atk: 35, hp: 65, def: 20, spd: 40, crt: 22, int: 36, abilityId: "utl_07", artVariant: 4 },
  { id: 289, name: "Vỏ Xe Tăng Lịch Sử", subtitle: "Kẻ Chiến Thắng Quân Thù", elementId: "metal", rarityId: "epic", atk: 60, hp: 70, def: 35, spd: 15, crt: 20, int: 14, abilityId: "def_10", artVariant: 5 },
  { id: 290, name: "Vỏ Tàu Ngầm", subtitle: "Người Lặn Sâu Thẳm", elementId: "metal", rarityId: "epic", atk: 40, hp: 80, def: 40, spd: 22, crt: 16, int: 18, abilityId: "def_20", artVariant: 6 },
  { id: 291, name: "Ly Pha Lê Hoàng Gia", subtitle: "Kẻ Uống Nước Thánh", elementId: "glass", rarityId: "epic", atk: 42, hp: 65, def: 28, spd: 32, crt: 24, int: 24, abilityId: "def_02", artVariant: 7 },
  { id: 292, name: "Gương Chiếu Đại", subtitle: "Người Phản Chiếu Sự Thật", elementId: "glass", rarityId: "epic", atk: 28, hp: 80, def: 38, spd: 25, crt: 12, int: 32, abilityId: "def_05", artVariant: 8 },
  { id: 293, name: "Lọ Đựng Tro Cốt", subtitle: "Kẻ Giữ Xác Người Thân", elementId: "glass", rarityId: "epic", atk: 20, hp: 90, def: 42, spd: 10, crt: 6, int: 38, abilityId: "def_20", artVariant: 1 },
  { id: 294, name: "Lon Vệ Tinh", subtitle: "Người Quan Sát Trái Đất", elementId: "metal", rarityId: "epic", atk: 45, hp: 65, def: 28, spd: 55, crt: 25, int: 32, abilityId: "utl_18", artVariant: 2 },

  // LEGENDARY CARDS (295-300) - 6 legendary cards
  { id: 295, name: "Tiền polymer cổ", subtitle: "Tờ tiền polymer đầu tiên", elementId: "paper", rarityId: "legendary", atk: 50, hp: 100, def: 40, spd: 60, crt: 35, int: 65, abilityId: "utl_20", artVariant: 8 },
  { id: 296, name: "Kính thiên văn", subtitle: "Kính thiên văn vũ trụ", elementId: "glass", rarityId: "legendary", atk: 55, hp: 90, def: 35, spd: 55, crt: 38, int: 60, abilityId: "utl_20", artVariant: 1 },
  { id: 297, name: "Hạt sen cổ", subtitle: "Hạt sen triều Nguyễn", elementId: "organic", rarityId: "legendary", atk: 55, hp: 120, def: 60, spd: 30, crt: 25, int: 55, abilityId: "utl_20", artVariant: 2 },
  { id: 298, name: "Lon hiệu ứng", subtitle: "Lon bia sưu tầm thế giới", elementId: "metal", rarityId: "legendary", atk: 70, hp: 100, def: 50, spd: 50, crt: 40, int: 45, abilityId: "def_20", artVariant: 3 },
  { id: 299, name: "Lọ cổ vật", subtitle: "Lọ pha lê hoàng gia", elementId: "glass", rarityId: "legendary", atk: 60, hp: 110, def: 45, spd: 40, crt: 35, int: 55, abilityId: "def_20", artVariant: 4 },
  { id: 300, name: "Hộp di sản", subtitle: "Hộp gỗ di sản quốc gia", elementId: "metal", rarityId: "legendary", atk: 65, hp: 100, def: 55, spd: 45, crt: 40, int: 50, abilityId: "def_20", artVariant: 5 },
];

// ─── Cards Array & Lookup ───────────────────────────────────────────────────
export const CARDS: CardDef[] = CARD_DEFINITIONS;

export function getCardById(id: number): CardDef | undefined {
  return CARDS.find(c => c.id === id);
}

// ─── Legacy Card Format ─────────────────────────────────────────────────────
export interface Card {
  id: number;
  name: string;
  element: (typeof ELEMENTS)[number];
  rarity: (typeof RARITIES)[number];
  atk: number;
  hp: number;
  def: number;
  spd: number;
  crt: number;
  int: number;
  subtitle?: string;
  abilityId?: string;
  artVariant?: number;
}

export interface CardStats {
  atk: number;
  hp: number;
  def: number;
  spd: number;
  crt: number;
  int: number;
}

// Legacy compat - converts CardDef to the old Card format
export const ALL_CARDS: Card[] = CARDS.map(def => ({
  id: def.id,
  name: def.name,
  element: ELEMENTS.find(e => e.id === def.elementId)!,
  rarity: RARITIES.find(r => r.id === def.rarityId)!,
  atk: def.atk,
  hp: def.hp,
  def: def.def,
  spd: def.spd,
  crt: def.crt,
  int: def.int,
  subtitle: def.subtitle,
  abilityId: def.abilityId,
  artVariant: def.artVariant,
}));

export function getCardStats(card: Card): CardStats {
  return {
    atk: card.atk,
    hp: card.hp,
    def: card.def,
    spd: card.spd,
    crt: card.crt,
    int: card.int,
  };
}

// ─── Procedural SVG Art Generator ──────────────────────────────────────────
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getCardArt(
  cardId: number,
  elementId: string,
  artVariant: number,
  rarityId: string
): ReactElement {
  const seed = cardId * 1000 + hashCode(elementId);
  const rng = (offset: number) => seededRandom(seed + offset);

  const element = ELEMENTS.find(e => e.id === elementId);
  const accent = element?.accent || "#94a3b8";

  const rarityColors: Record<string, { border: string; glow: string; bg: string }> = {
    common: { border: "#94a3b8", glow: "#cbd5e1", bg: "#f1f5f9" },
    rare: { border: "#3b82f6", glow: "#60a5fa", bg: "#eff6ff" },
    epic: { border: "#a855f7", glow: "#c084fc", bg: "#faf5ff" },
    legendary: { border: "#f59e0b", glow: "#fbbf24", bg: "#fffbeb" },
  };

  const colors = rarityColors[rarityId] || rarityColors.common;
  const isLegendary = rarityId === "legendary";
  const isEpic = rarityId === "epic" || isLegendary;

  const variant = ((artVariant - 1) % 8) + 1;

  const centralIcon = generateCentralIcon(rng(1), elementId, cardId);
  const pattern = generatePattern(variant, rng(2), accent, colors.bg);
  const particles = isLegendary ? generateParticles(rng(3), accent) : "";

  return (
    <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id={`bg-${cardId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.bg} />
          <stop offset="100%" stopColor={accent + "20"} />
        </linearGradient>
        <linearGradient id={`accent-${cardId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor={colors.border} />
        </linearGradient>
        <filter id={`glow-${cardId}`}>
          <feGaussianBlur stdDeviation={isLegendary ? 4 : isEpic ? 3 : 2} result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`shadow-${cardId}`}>
          <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor={colors.border} floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Card Frame */}
      <rect x="2" y="2" width="116" height="156" rx="8" ry="8" fill={`url(#bg-${cardId})`} stroke={colors.border} strokeWidth={isEpic ? 3 : 2} filter={`url(#shadow-${cardId})`} />

      {/* Pattern Background */}
      {pattern}

      {/* Central Icon Area */}
      <g transform="translate(60, 85)" filter={`url(#glow-${cardId})`}>
        {centralIcon}
      </g>

      {/* Rarity Glow Effect */}
      {isEpic && (
        <ellipse cx="60" cy="85" rx="35" ry="45" fill={colors.glow} opacity="0.15" />
      )}
      {isLegendary && (
        <ellipse cx="60" cy="85" rx="40" ry="50" fill={colors.glow} opacity="0.2">
          <animate attributeName="opacity" values="0.15;0.3;0.15" dur="2s" repeatCount="indefinite" />
        </ellipse>
      )}

      {/* Particles for Legendary */}
      {particles}

      {/* Corner Decorations */}
      <path d="M8 20 L8 8 L20 8" fill="none" stroke={colors.border} strokeWidth="2" strokeLinecap="round" />
      <path d="M112 20 L112 8 L100 8" fill="none" stroke={colors.border} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 140 L8 152 L20 152" fill="none" stroke={colors.border} strokeWidth="2" strokeLinecap="round" />
      <path d="M112 140 L112 152 L100 152" fill="none" stroke={colors.border} strokeWidth="2" strokeLinecap="round" />

      {/* Top Element Badge */}
      <circle cx="60" cy="22" r="12" fill={accent} opacity="0.9" />
      <circle cx="60" cy="22" r="8" fill={colors.bg} />
      <text x="60" y="26" textAnchor="middle" fontSize="10" fontWeight="bold" fill={accent}>
        {elementId.charAt(0).toUpperCase()}
      </text>

      {/* Rarity Indicator */}
      <rect x="45" y="145" width="30" height="8" rx="4" fill={colors.border} opacity="0.8" />
      <text x="60" y="151" textAnchor="middle" fontSize="5" fontWeight="bold" fill="white">
        {rarityId.toUpperCase().slice(0, 4)}
      </text>
    </svg>
  );
}

function generateCentralIcon(rngVal: number, elementId: string, cardId: number): ReactElement {
  const shapes = [
    <circle r="20" fill="currentColor" opacity="0.9" />,
    <rect x="-18" y="-18" width="36" height="36" rx="4" fill="currentColor" opacity="0.9" />,
    <polygon points="0,-22 22,18 -22,18" fill="currentColor" opacity="0.9" />,
    <path d="M0,-22 Q22,0 0,22 Q-22,0 0,-22" fill="currentColor" opacity="0.9" />,
    <rect x="-15" y="-20" width="30" height="40" rx="8" fill="currentColor" opacity="0.9" />,
    <circle r="18" fill="none" stroke="currentColor" strokeWidth="4" />,
    <polygon points="0,-20 10,0 0,20 -10,0" fill="currentColor" opacity="0.9" />,
    <path d="M-18,-10 L18,-10 L18,10 L-18,10 Z M-10,-18 L10,-18 L10,-10 L-10,-10 Z" fill="currentColor" opacity="0.9" />,
  ];

  const shapeIdx = Math.floor(rngVal * shapes.length);
  const shape = shapes[shapeIdx];

  const elementColors: Record<string, string> = {
    plastic: "#06b6d4",
    paper: "#f59e0b",
    glass: "#14b8a6",
    metal: "#64748b",
    organic: "#22c55e",
    hazard: "#ef4444",
  };

  const color = elementColors[elementId] || "#94a3b8";

  return (
    <g style={{ color }}>
      {shape}
      <circle r="8" fill="white" opacity="0.3" />
      <circle cx="-5" cy="-5" r="3" fill="white" opacity="0.5" />
    </g>
  );
}

function generatePattern(variant: number, rngVal: number, accent: string, bgColor: string): ReactElement {
  const patterns: Record<number, () => ReactElement> = {
    1: () => ( // Diagonal stripes
      <g opacity="0.15">
        {[...Array(12)].map((_, i) => (
          <line key={i} x1={i * 20 - 60} y1="0" x2={i * 20} y2="160" stroke={accent} strokeWidth="3" />
        ))}
      </g>
    ),
    2: () => ( // Dot grid
      <g opacity="0.1">
        {[...Array(20)].map((_, i) =>
          [...Array(25)].map((_, j) => (
            <circle key={`${i}-${j}`} cx={i * 8 + 4} cy={j * 8 + 4} r="1.5" fill={accent} />
          ))
        )}
      </g>
    ),
    3: () => ( // Circuit board
      <g opacity="0.12" stroke={accent} strokeWidth="1" fill="none">
        <path d="M20,40 L40,40 L40,80 L60,80 L60,40 L80,40 L80,120 L100,120" />
        <path d="M40,20 L40,40 L80,40 L80,60" />
        <path d="M60,100 L60,120 L100,120 L100,140" />
        <circle cx="40" cy="40" r="3" fill={accent} />
        <circle cx="80" cy="40" r="3" fill={accent} />
        <circle cx="60" cy="80" r="3" fill={accent} />
        <circle cx="60" cy="120" r="3" fill={accent} />
      </g>
    ),
    4: () => ( // Organic blob shapes
      <g opacity="0.1" fill={accent}>
        <ellipse cx="30" cy="50" rx="25" ry="20" />
        <ellipse cx="90" cy="110" rx="30" ry="25" />
        <ellipse cx="70" cy="30" rx="20" ry="15" />
        <ellipse cx="25" cy="130" rx="22" ry="18" />
      </g>
    ),
    5: () => ( // Crystal/geometric
      <g opacity="0.15" fill={accent}>
        <polygon points="60,15 75,40 60,65 45,40" />
        <polygon points="30,70 50,85 30,100 10,85" />
        <polygon points="90,75 105,90 90,105 75,90" />
        <polygon points="55,110 70,130 55,150 40,130" />
      </g>
    ),
    6: () => ( // Radiating lines
      <g opacity="0.1" stroke={accent} strokeWidth="2">
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30) * Math.PI / 180;
          const x2 = 60 + Math.cos(angle) * 80;
          const y2 = 85 + Math.sin(angle) * 80;
          return <line key={i} x1="60" y1="85" x2={x2} y2={y2} />;
        })}
      </g>
    ),
    7: () => ( // Wave pattern
      <g opacity="0.12" fill="none" stroke={accent} strokeWidth="2">
        <path d="M0,30 Q30,10 60,30 T120,30" />
        <path d="M0,60 Q30,40 60,60 T120,60" />
        <path d="M0,90 Q30,70 60,90 T120,90" />
        <path d="M0,120 Q30,100 60,120 T120,120" />
      </g>
    ),
    8: () => ( // Star burst
      <g opacity="0.15" fill={accent}>
        {[...Array(8)].map((_, i) => {
          const angle = (i * 45) * Math.PI / 180;
          const x = 60 + Math.cos(angle) * 50;
          const y = 85 + Math.sin(angle) * 50;
          return <circle key={i} cx={x} cy={y} r="4" />;
        })}
        {[...Array(8)].map((_, i) => {
          const angle = (i * 45 + 22.5) * Math.PI / 180;
          const x = 60 + Math.cos(angle) * 35;
          const y = 85 + Math.sin(angle) * 35;
          return <circle key={`b-${i}`} cx={x} cy={y} r="2" />;
        })}
      </g>
    ),
  };

  const patternFn = patterns[variant] || patterns[1];
  return patternFn();
}

function generateParticles(rngVal: number, accent: string): ReactElement {
  const particles: JSX.Element[] = [];
  for (let i = 0; i < 8; i++) {
    const x = 10 + seededRandom(rngVal + i * 100) * 100;
    const y = 10 + seededRandom(rngVal + i * 200) * 140;
    const r = 1 + seededRandom(rngVal + i * 300) * 2;
    particles.push(
      <circle key={i} cx={x} cy={y} r={r} fill={accent} opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${2 + seededRandom(rngVal + i) * 2}s`} repeatCount="indefinite" />
        <animate attributeName="cy" values={`${y};${y - 10};${y}`} dur={`${3 + seededRandom(rngVal + i * 50) * 2}s`} repeatCount="indefinite" />
      </circle>
    );
  }
  return <g>{particles}</g>;
}

// ─── Element Counter & Damage Functions ─────────────────────────────────────
export const ELEMENT_COUNTER: Record<string, string> = {
  plastic: "organic",
  organic: "hazard",
  hazard: "plastic",
  paper: "plastic",
  metal: "paper",
  glass: "metal",
};

export function getAdvantage(elementId: string): string | null {
  return ELEMENT_COUNTER[elementId] ?? null;
}

export function getDisadvantage(elementId: string): string | null {
  const counteredBy = Object.entries(ELEMENT_COUNTER).find(([, v]) => v === elementId)?.[0];
  return counteredBy ?? null;
}

export function calcDamage(atk: number, attackerEl: string, defenderEl: string): number {
  const adv = getAdvantage(attackerEl);
  const dis = getDisadvantage(attackerEl);
  let mult = 1;
  if (adv === defenderEl) mult = 1.5;
  else if (dis === defenderEl) mult = 0.75;
  return Math.floor(atk * mult * (0.8 + Math.random() * 0.4));
}

export function calcPower(card: Card | CardStats, level = 1): number {
  const rarityMult: Record<string, number> = {
    common: 1.0,
    rare: 1.15,
    epic: 1.35,
    legendary: 1.6,
  };
  const rmult = rarityMult[(card as Card).rarity?.id ?? "common"];
  const s = "atk" in card ? card : getCardStats(card as Card);
  return Math.floor(
    (s.atk * 2 + s.hp + s.def * 1.5 + s.spd + s.crt * 2 + s.int * 2) * level * rmult
  );
}

export function getXpForLevel(level: number): number {
  return level * level * 30;
}

export function getFusedXp(cost: number): number {
  return Math.floor(cost * 2);
}

// ─── Element Icons ────────────────────────────────────────────────────────────
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

// ─── Legacy Ability ID Export (for backward compat) ─────────────────────────
export const ABILITY_IDS = Object.keys(ALL_ABILITIES);
