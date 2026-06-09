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
export function getCardAbility(card: { element?: { id?: string }; rarity?: { id?: string }; abilityId?: string }): Ability {
  const abilityId = card.abilityId ?? "def_01";
  const ability = ALL_ABILITIES[abilityId];
  if (!ability) return ALL_ABILITIES["def_01"];

  const rarityPower: Record<string, number> = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
  };
  return { ...ability, power: rarityPower[card.rarity?.id ?? "common"] ?? 1 };
}

// ─── 300 Unique Card Definitions ─────────────────────────────────────────────
const CARD_DEFINITIONS: CardDef[] = [
  // COMMON PLASTIC (1-30)
  { id: 1, name: "Chai nhựa PET", subtitle: "Chai nhựa 500ml", elementId: "plastic", rarityId: "common", atk: 12, hp: 25, def: 3, spd: 15, crt: 5, int: 2, abilityId: "def_01", artVariant: 1 },
  { id: 2, name: "Túi nilon", subtitle: "Túi nilon thường dùng", elementId: "plastic", rarityId: "common", atk: 8, hp: 30, def: 2, spd: 20, crt: 3, int: 4, abilityId: "def_06", artVariant: 2 },
  { id: 3, name: "Ống hút nhựa", subtitle: "Ống hút dùng một lần", elementId: "plastic", rarityId: "common", atk: 10, hp: 22, def: 4, spd: 18, crt: 4, int: 3, abilityId: "def_11", artVariant: 3 },
  { id: 4, name: "Nắp chai nhựa", subtitle: "Nắp đậy chai nước", elementId: "plastic", rarityId: "common", atk: 14, hp: 20, def: 5, spd: 12, crt: 6, int: 1, abilityId: "off_01", artVariant: 4 },
  { id: 5, name: "Hộp cơm", subtitle: "Hộp cơm trưa", elementId: "plastic", rarityId: "common", atk: 11, hp: 28, def: 3, spd: 14, crt: 4, int: 5, abilityId: "utl_01", artVariant: 5 },
  { id: 6, name: "Xô nhựa", subtitle: "Xô đựng nước", elementId: "plastic", rarityId: "common", atk: 9, hp: 35, def: 6, spd: 10, crt: 3, int: 2, abilityId: "def_08", artVariant: 6 },
  { id: 7, name: "Bàn chải răng", subtitle: "Bàn chải răng đã dùng", elementId: "plastic", rarityId: "common", atk: 13, hp: 18, def: 2, spd: 22, crt: 7, int: 3, abilityId: "off_04", artVariant: 7 },
  { id: 8, name: "Ly nhựa", subtitle: "Ly nhựa dùng một lần", elementId: "plastic", rarityId: "common", atk: 10, hp: 24, def: 4, spd: 16, crt: 5, int: 4, abilityId: "utl_06", artVariant: 8 },
  { id: 9, name: "Khay trứng", subtitle: "Khay đựng trứng", elementId: "plastic", rarityId: "common", atk: 7, hp: 32, def: 7, spd: 8, crt: 2, int: 6, abilityId: "def_14", artVariant: 1 },
  { id: 10, name: "Bình xịt nước", subtitle: "Bình xịt cây", elementId: "plastic", rarityId: "common", atk: 15, hp: 19, def: 1, spd: 25, crt: 8, int: 2, abilityId: "off_12", artVariant: 2 },
  { id: 11, name: "Hộp bút", subtitle: "Hộp đựng bút chì", elementId: "plastic", rarityId: "common", atk: 8, hp: 26, def: 5, spd: 13, crt: 4, int: 7, abilityId: "utl_08", artVariant: 3 },
  { id: 12, name: "Túi zip", subtitle: "Túi zip nhỏ", elementId: "plastic", rarityId: "common", atk: 11, hp: 23, def: 3, spd: 17, crt: 5, int: 5, abilityId: "def_15", artVariant: 4 },
  { id: 13, name: "Vỏ CD", subtitle: "Vỏ đĩa CD", elementId: "plastic", rarityId: "common", atk: 9, hp: 27, def: 6, spd: 11, crt: 3, int: 8, abilityId: "utl_16", artVariant: 5 },
  { id: 14, name: "Bóng tennis", subtitle: "Bóng tennis cũ", elementId: "plastic", rarityId: "common", atk: 16, hp: 17, def: 0, spd: 28, crt: 9, int: 1, abilityId: "off_02", artVariant: 6 },
  { id: 15, name: "Gương nhỏ", subtitle: "Gương đeo tay", elementId: "plastic", rarityId: "common", atk: 12, hp: 21, def: 4, spd: 19, crt: 6, int: 4, abilityId: "def_05", artVariant: 7 },
  { id: 16, name: "Chai dầu gội", subtitle: "Chai đựng dầu gội", elementId: "plastic", rarityId: "common", atk: 8, hp: 29, def: 5, spd: 12, crt: 4, int: 6, abilityId: "utl_17", artVariant: 8 },
  { id: 17, name: "Vỏ bánh", subtitle: "Vỏ hộp bánh", elementId: "plastic", rarityId: "common", atk: 10, hp: 25, def: 3, spd: 15, crt: 5, int: 5, abilityId: "def_01", artVariant: 1 },
  { id: 18, name: "Ống tiêm", subtitle: "Ống tiêm y tế", elementId: "plastic", rarityId: "common", atk: 14, hp: 16, def: 2, spd: 24, crt: 10, int: 2, abilityId: "off_09", artVariant: 2 },
  { id: 19, name: "Bình sữa", subtitle: "Bình sữa trẻ em", elementId: "plastic", rarityId: "common", atk: 6, hp: 38, def: 8, spd: 6, crt: 2, int: 4, abilityId: "utl_03", artVariant: 3 },
  { id: 20, name: "Túi đeo chéo", subtitle: "Túi đeo chéo nam", elementId: "plastic", rarityId: "common", atk: 18, hp: 22, def: 4, spd: 10, crt: 5, int: 3, abilityId: "off_01", artVariant: 4 },
  { id: 21, name: "Ốp lưng điện thoại", subtitle: "Ốp lưng nhựa", elementId: "plastic", rarityId: "common", atk: 7, hp: 30, def: 9, spd: 8, crt: 3, int: 6, abilityId: "def_03", artVariant: 5 },
  { id: 22, name: "Đế giày", subtitle: "Đế cao su giày", elementId: "plastic", rarityId: "common", atk: 11, hp: 24, def: 7, spd: 14, crt: 4, int: 3, abilityId: "def_14", artVariant: 6 },
  { id: 23, name: "Thìa nhựa", subtitle: "Thìa nhựa dùng một lần", elementId: "plastic", rarityId: "common", atk: 9, hp: 20, def: 2, spd: 21, crt: 6, int: 5, abilityId: "off_01", artVariant: 7 },
  { id: 24, name: "Hộp thuốc", subtitle: "Hộp đựng thuốc", elementId: "plastic", rarityId: "common", atk: 5, hp: 33, def: 6, spd: 9, crt: 3, int: 9, abilityId: "utl_08", artVariant: 8 },
  { id: 25, name: "Bong bóng", subtitle: "Bong bóng xà phòng", elementId: "plastic", rarityId: "common", atk: 8, hp: 18, def: 1, spd: 30, crt: 7, int: 6, abilityId: "utl_10", artVariant: 1 },
  { id: 26, name: "Vỏ bút chì", subtitle: "Vỏ bút chì màu", elementId: "plastic", rarityId: "common", atk: 13, hp: 22, def: 3, spd: 16, crt: 5, int: 5, abilityId: "utl_18", artVariant: 2 },
  { id: 27, name: "Dao nhựa", subtitle: "Dao nhựa dùng một lần", elementId: "plastic", rarityId: "common", atk: 15, hp: 17, def: 2, spd: 23, crt: 8, int: 2, abilityId: "off_12", artVariant: 3 },
  { id: 28, name: "Kẹp tóc", subtitle: "Kẹp tóc nhựa", elementId: "plastic", rarityId: "common", atk: 6, hp: 26, def: 4, spd: 18, crt: 4, int: 7, abilityId: "utl_16", artVariant: 4 },
  { id: 29, name: "Hộp đồ ăn", subtitle: "Hộp cơm văn phòng", elementId: "plastic", rarityId: "common", atk: 10, hp: 28, def: 5, spd: 12, crt: 4, int: 4, abilityId: "utl_01", artVariant: 5 },
  { id: 30, name: "Dây đeo đồng hồ", subtitle: "Dây đeo cao su", elementId: "plastic", rarityId: "common", atk: 8, hp: 24, def: 6, spd: 15, crt: 5, int: 6, abilityId: "def_06", artVariant: 6 },

  // COMMON PAPER (31-60)
  { id: 31, name: "Giấy báo", subtitle: "Tờ báo hàng ngày", elementId: "paper", rarityId: "common", atk: 10, hp: 26, def: 4, spd: 14, crt: 5, int: 6, abilityId: "def_01", artVariant: 7 },
  { id: 32, name: "Bìa cứng", subtitle: "Tấm bìa các tông", elementId: "paper", rarityId: "common", atk: 8, hp: 32, def: 7, spd: 8, crt: 3, int: 5, abilityId: "def_14", artVariant: 8 },
  { id: 33, name: "Sách giáo khoa", subtitle: "Sách lớp 12", elementId: "paper", rarityId: "common", atk: 7, hp: 30, def: 5, spd: 10, crt: 4, int: 10, abilityId: "utl_18", artVariant: 1 },
  { id: 34, name: "Tờ rơi", subtitle: "Tờ quảng cáo", elementId: "paper", rarityId: "common", atk: 12, hp: 20, def: 2, spd: 18, crt: 6, int: 4, abilityId: "off_02", artVariant: 2 },
  { id: 35, name: "Phong bì", subtitle: "Phong bì thư", elementId: "paper", rarityId: "common", atk: 6, hp: 28, def: 3, spd: 12, crt: 4, int: 8, abilityId: "utl_01", artVariant: 3 },
  { id: 36, name: "Giấy ghi chú", subtitle: "Giấy note màu", elementId: "paper", rarityId: "common", atk: 9, hp: 24, def: 4, spd: 16, crt: 5, int: 7, abilityId: "def_11", artVariant: 4 },
  { id: 37, name: "Sổ tay", subtitle: "Sổ ghi chép", elementId: "paper", rarityId: "common", atk: 11, hp: 22, def: 5, spd: 14, crt: 5, int: 6, abilityId: "utl_09", artVariant: 5 },
  { id: 38, name: "Tờ quảng cáo", subtitle: "Quảng cáo rẻ tiền", elementId: "paper", rarityId: "common", atk: 14, hp: 18, def: 2, spd: 20, crt: 7, int: 3, abilityId: "off_02", artVariant: 6 },
  { id: 39, name: "Giấy gói quà", subtitle: "Giấy gói màu", elementId: "paper", rarityId: "common", atk: 7, hp: 34, def: 6, spd: 6, crt: 2, int: 5, abilityId: "def_08", artVariant: 7 },
  { id: 40, name: "Truyện tranh", subtitle: "Truyện tranh cũ", elementId: "paper", rarityId: "common", atk: 10, hp: 26, def: 4, spd: 15, crt: 5, int: 7, abilityId: "utl_08", artVariant: 8 },
  { id: 41, name: "Bản đồ", subtitle: "Bản đồ Việt Nam", elementId: "paper", rarityId: "common", atk: 8, hp: 28, def: 5, spd: 12, crt: 4, int: 9, abilityId: "utl_07", artVariant: 1 },
  { id: 42, name: "Giấy kiểm tra", subtitle: "Bài kiểm tra điểm thấp", elementId: "paper", rarityId: "common", atk: 15, hp: 16, def: 1, spd: 22, crt: 8, int: 4, abilityId: "off_04", artVariant: 2 },
  { id: 43, name: "Nhãn mác", subtitle: "Nhãn sản phẩm", elementId: "paper", rarityId: "common", atk: 9, hp: 24, def: 4, spd: 16, crt: 5, int: 7, abilityId: "def_15", artVariant: 3 },
  { id: 44, name: "Tờ lịch", subtitle: "Lịch treo tường", elementId: "paper", rarityId: "common", atk: 6, hp: 30, def: 6, spd: 10, crt: 3, int: 8, abilityId: "utl_17", artVariant: 4 },
  { id: 45, name: "Giấy note", subtitle: "Giấy dán ghi chú", elementId: "paper", rarityId: "common", atk: 7, hp: 26, def: 3, spd: 18, crt: 4, int: 8, abilityId: "utl_16", artVariant: 5 },
  { id: 46, name: "Vé xem phim", subtitle: "Vé rạp chiếu bóng", elementId: "paper", rarityId: "common", atk: 8, hp: 28, def: 4, spd: 14, crt: 5, int: 6, abilityId: "def_06", artVariant: 6 },
  { id: 47, name: "Thiệp chúc", subtitle: "Thiệp mừng cưới", elementId: "paper", rarityId: "common", atk: 5, hp: 32, def: 5, spd: 8, crt: 3, int: 9, abilityId: "utl_01", artVariant: 7 },
  { id: 48, name: "Giấy A4", subtitle: "Giấy in văn phòng", elementId: "paper", rarityId: "common", atk: 9, hp: 25, def: 4, spd: 15, crt: 5, int: 7, abilityId: "def_01", artVariant: 8 },
  { id: 49, name: "Sách nấu ăn", subtitle: "Sách công thức", elementId: "paper", rarityId: "common", atk: 7, hp: 29, def: 5, spd: 11, crt: 4, int: 9, abilityId: "utl_08", artVariant: 1 },
  { id: 50, name: "Giấy lót", subtitle: "Giấy lót bàn", elementId: "paper", rarityId: "common", atk: 11, hp: 22, def: 3, spd: 17, crt: 6, int: 5, abilityId: "def_03", artVariant: 2 },
  { id: 51, name: "Bìa sách", subtitle: "Bìa sách mềm", elementId: "paper", rarityId: "common", atk: 8, hp: 27, def: 6, spd: 12, crt: 4, int: 6, abilityId: "def_08", artVariant: 3 },
  { id: 52, name: "Giấy gói bánh", subtitle: "Giấy gói kẹo", elementId: "paper", rarityId: "common", atk: 6, hp: 31, def: 5, spd: 9, crt: 3, int: 7, abilityId: "utl_03", artVariant: 4 },
  { id: 53, name: "Tập học sinh", subtitle: "Vở học sinh", elementId: "paper", rarityId: "common", atk: 10, hp: 24, def: 4, spd: 15, crt: 5, int: 6, abilityId: "utl_18", artVariant: 5 },
  { id: 54, name: "Sổ điểm", subtitle: "Sổ ghi điểm", elementId: "paper", rarityId: "common", atk: 7, hp: 28, def: 5, spd: 11, crt: 4, int: 10, abilityId: "utl_08", artVariant: 6 },
  { id: 55, name: "Giấy lọc trà", subtitle: "Túi lọc trà", elementId: "paper", rarityId: "common", atk: 5, hp: 26, def: 4, spd: 13, crt: 3, int: 11, abilityId: "utl_15", artVariant: 7 },
  { id: 56, name: "Tờ rao vặt", subtitle: "Quảng cáo rao vặt", elementId: "paper", rarityId: "common", atk: 13, hp: 20, def: 2, spd: 19, crt: 7, int: 4, abilityId: "off_02", artVariant: 8 },
  { id: 57, name: "Giấy carbon", subtitle: "Giấy than chì", elementId: "paper", rarityId: "common", atk: 9, hp: 23, def: 4, spd: 16, crt: 5, int: 8, abilityId: "def_11", artVariant: 1 },
  { id: 58, name: "Giấy nhạc", subtitle: "Nhãi nhạc piano", elementId: "paper", rarityId: "common", atk: 12, hp: 21, def: 3, spd: 18, crt: 6, int: 5, abilityId: "off_01", artVariant: 2 },
  { id: 59, name: "Sách hướng dẫn", subtitle: "Sách chỉ dẫn", elementId: "paper", rarityId: "common", atk: 6, hp: 30, def: 6, spd: 10, crt: 3, int: 8, abilityId: "utl_07", artVariant: 3 },
  { id: 60, name: "Giấy vệ sinh", subtitle: "Khăn giấy", elementId: "paper", rarityId: "common", atk: 4, hp: 35, def: 8, spd: 5, crt: 2, int: 4, abilityId: "def_17", artVariant: 4 },

  // COMMON GLASS (61-90)
  { id: 61, name: "Chai bia", subtitle: "Chai bia 330ml", elementId: "glass", rarityId: "common", atk: 12, hp: 24, def: 5, spd: 14, crt: 6, int: 4, abilityId: "def_02", artVariant: 5 },
  { id: 62, name: "Ly vỡ", subtitle: "Ly thủy tinh vỡ", elementId: "glass", rarityId: "common", atk: 15, hp: 18, def: 2, spd: 20, crt: 9, int: 3, abilityId: "off_04", artVariant: 6 },
  { id: 63, name: "Lọ hoa", subtitle: "Lọ cắm hoa", elementId: "glass", rarityId: "common", atk: 8, hp: 30, def: 6, spd: 10, crt: 4, int: 7, abilityId: "utl_01", artVariant: 7 },
  { id: 64, name: "Kính mắt", subtitle: "Kính cận", elementId: "glass", rarityId: "common", atk: 7, hp: 26, def: 5, spd: 12, crt: 5, int: 10, abilityId: "utl_18", artVariant: 8 },
  { id: 65, name: "Chai nước ngọt", subtitle: "Chai nước có ga", elementId: "glass", rarityId: "common", atk: 11, hp: 25, def: 4, spd: 16, crt: 6, int: 5, abilityId: "def_15", artVariant: 1 },
  { id: 66, name: "Lọ thí nghiệm", subtitle: "Lọ nhỏ", elementId: "glass", rarityId: "common", atk: 13, hp: 20, def: 3, spd: 18, crt: 7, int: 6, abilityId: "off_05", artVariant: 2 },
  { id: 67, name: "Bóng đèn", subtitle: "Bóng đèn cháy", elementId: "glass", rarityId: "common", atk: 16, hp: 16, def: 1, spd: 24, crt: 10, int: 2, abilityId: "off_02", artVariant: 3 },
  { id: 68, name: "Gương nhỏ", subtitle: "Gương soi", elementId: "glass", rarityId: "common", atk: 10, hp: 22, def: 4, spd: 17, crt: 6, int: 6, abilityId: "def_05", artVariant: 4 },
  { id: 69, name: "Chai nước", subtitle: "Chai nước lọc", elementId: "glass", rarityId: "common", atk: 6, hp: 34, def: 7, spd: 6, crt: 2, int: 5, abilityId: "def_19", artVariant: 5 },
  { id: 70, name: "Lọ nước hoa", subtitle: "Lọ nước hoa nhỏ", elementId: "glass", rarityId: "common", atk: 8, hp: 28, def: 5, spd: 11, crt: 4, int: 9, abilityId: "utl_08", artVariant: 6 },
  { id: 71, name: "Cốc thủy tinh", subtitle: "Ly uống nước", elementId: "glass", rarityId: "common", atk: 9, hp: 29, def: 8, spd: 9, crt: 3, int: 4, abilityId: "def_18", artVariant: 7 },
  { id: 72, name: "Chai sâm banh", subtitle: "Chai rượu có ga", elementId: "glass", rarityId: "common", atk: 14, hp: 22, def: 3, spd: 19, crt: 8, int: 3, abilityId: "off_02", artVariant: 8 },
  { id: 73, name: "Lọ mứt", subtitle: "Lọ đựng mứt", elementId: "glass", rarityId: "common", atk: 7, hp: 32, def: 6, spd: 8, crt: 3, int: 6, abilityId: "utl_03", artVariant: 1 },
  { id: 74, name: "Kính lúp", subtitle: "Kính phóng đại", elementId: "glass", rarityId: "common", atk: 10, hp: 24, def: 4, spd: 14, crt: 5, int: 8, abilityId: "utl_07", artVariant: 2 },
  { id: 75, name: "Chai rượu vang", subtitle: "Chai rượu đỏ", elementId: "glass", rarityId: "common", atk: 11, hp: 26, def: 5, spd: 12, crt: 5, int: 6, abilityId: "def_02", artVariant: 3 },
  { id: 76, name: "Lọ thủy tinh", subtitle: "Lọ tròn nhỏ", elementId: "glass", rarityId: "common", atk: 8, hp: 30, def: 7, spd: 9, crt: 3, int: 5, abilityId: "def_08", artVariant: 4 },
  { id: 77, name: "Ly cà phê", subtitle: "Ly uống cà phê", elementId: "glass", rarityId: "common", atk: 12, hp: 23, def: 3, spd: 17, crt: 6, int: 5, abilityId: "off_01", artVariant: 5 },
  { id: 78, name: "Bình hoa", subtitle: "Bình cắm hoa khô", elementId: "glass", rarityId: "common", atk: 6, hp: 31, def: 6, spd: 8, crt: 3, int: 7, abilityId: "utl_17", artVariant: 6 },
  { id: 79, name: "Chai gia vị", subtitle: "Chai đựng dầu", elementId: "glass", rarityId: "common", atk: 9, hp: 25, def: 5, spd: 13, crt: 5, int: 8, abilityId: "utl_08", artVariant: 7 },
  { id: 80, name: "Gương chiếu hậu", subtitle: "Gương xe máy", elementId: "glass", rarityId: "common", atk: 10, hp: 22, def: 4, spd: 16, crt: 6, int: 6, abilityId: "def_11", artVariant: 8 },
  { id: 81, name: "Lọ đựng nước", subtitle: "Lọ thủy tinh nhỏ", elementId: "glass", rarityId: "common", atk: 7, hp: 28, def: 5, spd: 11, crt: 4, int: 7, abilityId: "utl_01", artVariant: 1 },
  { id: 82, name: "Chai bia hơi", subtitle: "Chai bia lớn", elementId: "glass", rarityId: "common", atk: 13, hp: 21, def: 3, spd: 20, crt: 7, int: 3, abilityId: "off_02", artVariant: 2 },
  { id: 83, name: "Ly nước ép", subtitle: "Ly nước cam", elementId: "glass", rarityId: "common", atk: 10, hp: 27, def: 4, spd: 15, crt: 5, int: 5, abilityId: "def_15", artVariant: 3 },
  { id: 84, name: "Lọ son môi", subtitle: "Lọ đựng son", elementId: "glass", rarityId: "common", atk: 8, hp: 24, def: 4, spd: 14, crt: 5, int: 8, abilityId: "utl_18", artVariant: 4 },
  { id: 85, name: "Chai nước suối", subtitle: "Chai nước đóng bình", elementId: "glass", rarityId: "common", atk: 9, hp: 29, def: 5, spd: 12, crt: 4, int: 5, abilityId: "def_19", artVariant: 5 },
  { id: 86, name: "Kính lúp to", subtitle: "Kính phóng lớn", elementId: "glass", rarityId: "common", atk: 15, hp: 17, def: 2, spd: 21, crt: 9, int: 4, abilityId: "off_05", artVariant: 6 },
  { id: 87, name: "Lọ keo", subtitle: "Lọ đựng keo", elementId: "glass", rarityId: "common", atk: 11, hp: 23, def: 6, spd: 13, crt: 5, int: 5, abilityId: "utl_16", artVariant: 7 },
  { id: 88, name: "Ly thủy tinh", subtitle: "Ly uống nước thường", elementId: "glass", rarityId: "common", atk: 10, hp: 26, def: 5, spd: 14, crt: 5, int: 5, abilityId: "def_01", artVariant: 8 },
  { id: 89, name: "Chai rượu mạnh", subtitle: "Chai rượu trắng", elementId: "glass", rarityId: "common", atk: 14, hp: 20, def: 3, spd: 18, crt: 8, int: 4, abilityId: "off_01", artVariant: 1 },
  { id: 90, name: "Lọ dầu gội", subtitle: "Lọ đựng dầu gội", elementId: "glass", rarityId: "common", atk: 8, hp: 28, def: 5, spd: 11, crt: 4, int: 6, abilityId: "def_06", artVariant: 2 },

  // COMMON METAL (91-120)
  { id: 91, name: "Lon bia", subtitle: "Lon bia thường 330ml", elementId: "metal", rarityId: "common", atk: 13, hp: 22, def: 6, spd: 15, crt: 6, int: 3, abilityId: "def_03", artVariant: 3 },
  { id: 92, name: "Vỏ bánh quy", subtitle: "Vỏ hộp bánh", elementId: "metal", rarityId: "common", atk: 9, hp: 28, def: 7, spd: 10, crt: 4, int: 5, abilityId: "def_14", artVariant: 4 },
  { id: 93, name: "Lon nước ngọt", subtitle: "Lon nước có ga", elementId: "metal", rarityId: "common", atk: 12, hp: 24, def: 5, spd: 16, crt: 6, int: 4, abilityId: "off_01", artVariant: 5 },
  { id: 94, name: "Nắp lon", subtitle: "Nắp đậy lon", elementId: "metal", rarityId: "common", atk: 11, hp: 20, def: 8, spd: 12, crt: 5, int: 4, abilityId: "def_08", artVariant: 6 },
  { id: 95, name: "Vỏ đồ hộp", subtitle: "Hộp thịt hộp cá", elementId: "metal", rarityId: "common", atk: 8, hp: 30, def: 9, spd: 6, crt: 3, int: 4, abilityId: "def_18", artVariant: 7 },
  { id: 96, name: "Lon sữa đặc", subtitle: "Lon sữa ông thọ", elementId: "metal", rarityId: "common", atk: 10, hp: 26, def: 6, spd: 11, crt: 5, int: 5, abilityId: "utl_01", artVariant: 8 },
  { id: 97, name: "Vỏ hộp thịt", subtitle: "Hộp thịt đóng gói", elementId: "metal", rarityId: "common", atk: 9, hp: 29, def: 8, spd: 8, crt: 3, int: 4, abilityId: "def_14", artVariant: 1 },
  { id: 98, name: "Lon nước tăng lực", subtitle: "Lon nước uống bổ sung", elementId: "metal", rarityId: "common", atk: 16, hp: 18, def: 2, spd: 24, crt: 9, int: 2, abilityId: "off_02", artVariant: 2 },
  { id: 99, name: "Nắp đậy", subtitle: "Nắp kim loại", elementId: "metal", rarityId: "common", atk: 7, hp: 32, def: 10, spd: 5, crt: 2, int: 4, abilityId: "def_03", artVariant: 3 },
  { id: 100, name: "Vỏ hộp cá", subtitle: "Hộp đồ hộp cá", elementId: "metal", rarityId: "common", atk: 11, hp: 25, def: 6, spd: 13, crt: 5, int: 4, abilityId: "def_05", artVariant: 4 },
  { id: 101, name: "Lon bia hơi", subtitle: "Lon bia nhỏ", elementId: "metal", rarityId: "common", atk: 14, hp: 21, def: 4, spd: 18, crt: 7, int: 3, abilityId: "off_04", artVariant: 5 },
  { id: 102, name: "Vỏ hộp đậu", subtitle: "Hộp đậu đóng hộp", elementId: "metal", rarityId: "common", atk: 8, hp: 28, def: 7, spd: 10, crt: 4, int: 6, abilityId: "def_08", artVariant: 6 },
  { id: 103, name: "Lon nước giải khát", subtitle: "Lon nước ngọt", elementId: "metal", rarityId: "common", atk: 11, hp: 24, def: 5, spd: 15, crt: 6, int: 4, abilityId: "def_15", artVariant: 7 },
  { id: 104, name: "Nắp chai sắt", subtitle: "Nắp chai nước", elementId: "metal", rarityId: "common", atk: 10, hp: 22, def: 8, spd: 11, crt: 5, int: 5, abilityId: "def_03", artVariant: 8 },
  { id: 105, name: "Vỏ hộp bắp", subtitle: "Hộp ngô đóng hộp", elementId: "metal", rarityId: "common", atk: 9, hp: 27, def: 7, spd: 10, crt: 4, int: 5, abilityId: "def_14", artVariant: 1 },
  { id: 106, name: "Lon cà phê", subtitle: "Lon cà phê hòa tan", elementId: "metal", rarityId: "common", atk: 15, hp: 19, def: 3, spd: 22, crt: 8, int: 3, abilityId: "off_04", artVariant: 2 },
  { id: 107, name: "Vỏ hộp thực phẩm", subtitle: "Hộp đồ ăn đóng hộp", elementId: "metal", rarityId: "common", atk: 8, hp: 30, def: 8, spd: 8, crt: 3, int: 5, abilityId: "def_18", artVariant: 3 },
  { id: 108, name: "Lon bia đen", subtitle: "Lon bia stout", elementId: "metal", rarityId: "common", atk: 13, hp: 23, def: 5, spd: 16, crt: 6, int: 3, abilityId: "def_05", artVariant: 4 },
  { id: 109, name: "Nắp lọ", subtitle: "Nắp đậy lọ thủy tinh", elementId: "metal", rarityId: "common", atk: 7, hp: 31, def: 9, spd: 6, crt: 2, int: 4, abilityId: "def_03", artVariant: 5 },
  { id: 110, name: "Vỏ hộp nước", subtitle: "Hộp đựng nước", elementId: "metal", rarityId: "common", atk: 9, hp: 28, def: 7, spd: 11, crt: 4, int: 5, abilityId: "def_14", artVariant: 6 },
  { id: 111, name: "Lon nước ép", subtitle: "Lon nước trái cây", elementId: "metal", rarityId: "common", atk: 11, hp: 25, def: 5, spd: 14, crt: 6, int: 5, abilityId: "utl_01", artVariant: 7 },
  { id: 112, name: "Vỏ hộp sữa", subtitle: "Hộp sữa giấy", elementId: "metal", rarityId: "common", atk: 8, hp: 32, def: 8, spd: 7, crt: 3, int: 4, abilityId: "utl_03", artVariant: 8 },
  { id: 113, name: "Lon trà xanh", subtitle: "Lon trà", elementId: "metal", rarityId: "common", atk: 12, hp: 24, def: 5, spd: 15, crt: 6, int: 4, abilityId: "def_15", artVariant: 1 },
  { id: 114, name: "Nắp đậy hộp", subtitle: "Nắp hộp nhựa", elementId: "metal", rarityId: "common", atk: 6, hp: 33, def: 10, spd: 5, crt: 2, int: 4, abilityId: "def_03", artVariant: 2 },
  { id: 115, name: "Vỏ hộp trái cây", subtitle: "Hộp trái cây đóng hộp", elementId: "metal", rarityId: "common", atk: 9, hp: 28, def: 7, spd: 10, crt: 4, int: 6, abilityId: "def_14", artVariant: 3 },
  { id: 116, name: "Lon bia bạc", subtitle: "Lon bia nhôm", elementId: "metal", rarityId: "common", atk: 14, hp: 22, def: 4, spd: 18, crt: 7, int: 3, abilityId: "off_02", artVariant: 4 },
  { id: 117, name: "Vỏ hộp thịt bò", subtitle: "Hộp thịt bò hộp", elementId: "metal", rarityId: "common", atk: 10, hp: 27, def: 8, spd: 9, crt: 4, int: 4, abilityId: "def_18", artVariant: 5 },
  { id: 118, name: "Lon nước ngọt đỏ", subtitle: "Lon cocacola", elementId: "metal", rarityId: "common", atk: 13, hp: 21, def: 4, spd: 17, crt: 7, int: 4, abilityId: "off_01", artVariant: 6 },
  { id: 119, name: "Nắp cốc", subtitle: "Nắp cốc giấy", elementId: "metal", rarityId: "common", atk: 7, hp: 30, def: 9, spd: 7, crt: 3, int: 5, abilityId: "def_03", artVariant: 7 },
  { id: 120, name: "Vỏ hộp đồ ăn", subtitle: "Hộp cơm hộp", elementId: "metal", rarityId: "common", atk: 9, hp: 29, def: 7, spd: 10, crt: 4, int: 5, abilityId: "def_14", artVariant: 8 },

  // COMMON ORGANIC (121-150)
  { id: 121, name: "Vỏ cam", subtitle: "Vỏ trái cây", elementId: "organic", rarityId: "common", atk: 10, hp: 28, def: 5, spd: 12, crt: 5, int: 5, abilityId: "def_17", artVariant: 1 },
  { id: 122, name: "Lõi trà", subtitle: "Bã trà", elementId: "organic", rarityId: "common", atk: 6, hp: 32, def: 6, spd: 8, crt: 3, int: 7, abilityId: "utl_01", artVariant: 2 },
  { id: 123, name: "Vỏ trứng", subtitle: "Vỏ trứng gà", elementId: "organic", rarityId: "common", atk: 7, hp: 30, def: 8, spd: 7, crt: 3, int: 5, abilityId: "def_14", artVariant: 3 },
  { id: 124, name: "Vỏ dừa", subtitle: "Vỏ dừa khô", elementId: "organic", rarityId: "common", atk: 12, hp: 26, def: 7, spd: 10, crt: 5, int: 4, abilityId: "def_18", artVariant: 4 },
  { id: 125, name: "Vỏ chuối", subtitle: "Vỏ chuối chín", elementId: "organic", rarityId: "common", atk: 8, hp: 24, def: 3, spd: 15, crt: 5, int: 6, abilityId: "utl_03", artVariant: 5 },
  { id: 126, name: "Lá sen", subtitle: "Lá sen khô", elementId: "organic", rarityId: "common", atk: 5, hp: 35, def: 7, spd: 5, crt: 2, int: 8, abilityId: "def_19", artVariant: 6 },
  { id: 127, name: "Vỏ khoai", subtitle: "Vỏ khoai lang", elementId: "organic", rarityId: "common", atk: 9, hp: 28, def: 6, spd: 11, crt: 4, int: 6, abilityId: "def_17", artVariant: 7 },
  { id: 128, name: "Thân rau muống", subtitle: "Rau muống", elementId: "organic", rarityId: "common", atk: 8, hp: 26, def: 4, spd: 14, crt: 5, int: 7, abilityId: "utl_01", artVariant: 8 },
  { id: 129, name: "Vỏ bưởi", subtitle: "Vỏ bưởi", elementId: "organic", rarityId: "common", atk: 7, hp: 31, def: 6, spd: 8, crt: 3, int: 6, abilityId: "def_17", artVariant: 1 },
  { id: 130, name: "Xương gà", subtitle: "Xương gà luộc", elementId: "organic", rarityId: "common", atk: 11, hp: 22, def: 4, spd: 13, crt: 6, int: 5, abilityId: "def_13", artVariant: 2 },
  { id: 131, name: "Vỏ lạc", subtitle: "Vỏ đậu phộng", elementId: "organic", rarityId: "common", atk: 10, hp: 25, def: 5, spd: 12, crt: 5, int: 5, abilityId: "def_15", artVariant: 3 },
  { id: 132, name: "Nõn đu đủ", subtitle: "Nõn đu đủ", elementId: "organic", rarityId: "common", atk: 6, hp: 33, def: 5, spd: 7, crt: 2, int: 7, abilityId: "utl_17", artVariant: 4 },
  { id: 133, name: "Thân cà chua", subtitle: "Cà chua", elementId: "organic", rarityId: "common", atk: 12, hp: 23, def: 4, spd: 15, crt: 6, int: 4, abilityId: "off_05", artVariant: 5 },
  { id: 134, name: "Vỏ ngô", subtitle: "Vỏ bắp", elementId: "organic", rarityId: "common", atk: 8, hp: 29, def: 6, spd: 10, crt: 4, int: 6, abilityId: "def_14", artVariant: 6 },
  { id: 135, name: "Lõi bắp cải", subtitle: "Lõi rau", elementId: "organic", rarityId: "common", atk: 7, hp: 27, def: 5, spd: 12, crt: 4, int: 8, abilityId: "utl_08", artVariant: 7 },
  { id: 136, name: "Thân hành", subtitle: "Hành lá", elementId: "organic", rarityId: "common", atk: 14, hp: 20, def: 3, spd: 16, crt: 7, int: 4, abilityId: "off_04", artVariant: 8 },
  { id: 137, name: "Vỏ chanh", subtitle: "Vỏ chanh", elementId: "organic", rarityId: "common", atk: 9, hp: 26, def: 5, spd: 13, crt: 5, int: 6, abilityId: "utl_01", artVariant: 1 },
  { id: 138, name: "Cuống rau má", subtitle: "Rau má", elementId: "organic", rarityId: "common", atk: 6, hp: 31, def: 6, spd: 9, crt: 3, int: 7, abilityId: "def_17", artVariant: 2 },
  { id: 139, name: "Vỏ lựu", subtitle: "Vỏ quả lựu", elementId: "organic", rarityId: "common", atk: 11, hp: 24, def: 5, spd: 14, crt: 6, int: 5, abilityId: "def_15", artVariant: 3 },
  { id: 140, name: "Thân su su", subtitle: "Su su", elementId: "organic", rarityId: "common", atk: 8, hp: 28, def: 5, spd: 11, crt: 4, int: 7, abilityId: "utl_01", artVariant: 4 },
  { id: 141, name: "Vỏ gừng", subtitle: "Gừng tươi", elementId: "organic", rarityId: "common", atk: 13, hp: 22, def: 4, spd: 15, crt: 7, int: 4, abilityId: "off_05", artVariant: 5 },
  { id: 142, name: "Lõi khế", subtitle: "Khế chua", elementId: "organic", rarityId: "common", atk: 10, hp: 25, def: 5, spd: 13, crt: 5, int: 5, abilityId: "def_15", artVariant: 6 },
  { id: 143, name: "Thân đu đủ", subtitle: "Đu đủ", elementId: "organic", rarityId: "common", atk: 9, hp: 27, def: 5, spd: 12, crt: 5, int: 6, abilityId: "def_17", artVariant: 7 },
  { id: 144, name: "Vỏ mít", subtitle: "Vỏ mít chín", elementId: "organic", rarityId: "common", atk: 7, hp: 32, def: 6, spd: 8, crt: 3, int: 6, abilityId: "utl_03", artVariant: 8 },
  { id: 145, name: "Cuống nho", subtitle: "Nho", elementId: "organic", rarityId: "common", atk: 6, hp: 29, def: 5, spd: 11, crt: 4, int: 8, abilityId: "utl_08", artVariant: 1 },
  { id: 146, name: "Vỏ cà rốt", subtitle: "Cà rốt", elementId: "organic", rarityId: "common", atk: 10, hp: 26, def: 5, spd: 13, crt: 5, int: 6, abilityId: "def_15", artVariant: 2 },
  { id: 147, name: "Thân cải", subtitle: "Rau cải", elementId: "organic", rarityId: "common", atk: 8, hp: 30, def: 6, spd: 10, crt: 4, int: 6, abilityId: "def_17", artVariant: 3 },
  { id: 148, name: "Vỏ bí đao", subtitle: "Bí đao", elementId: "organic", rarityId: "common", atk: 7, hp: 31, def: 7, spd: 8, crt: 3, int: 5, abilityId: "def_14", artVariant: 4 },
  { id: 149, name: "Cuống dưa hấu", subtitle: "Dưa hấu", elementId: "organic", rarityId: "common", atk: 11, hp: 25, def: 4, spd: 14, crt: 6, int: 5, abilityId: "def_15", artVariant: 5 },
  { id: 150, name: "Lõi thơm", subtitle: "Nõn dứa", elementId: "organic", rarityId: "common", atk: 8, hp: 28, def: 5, spd: 11, crt: 4, int: 7, abilityId: "def_17", artVariant: 6 },

  // COMMON HAZARD (151-180)
  { id: 151, name: "Pin AA", subtitle: "Pin tiểu", elementId: "hazard", rarityId: "common", atk: 18, hp: 15, def: 1, spd: 25, crt: 10, int: 3, abilityId: "off_04", artVariant: 7 },
  { id: 152, name: "Đèn neon", subtitle: "Đèn ống huỳnh quang", elementId: "hazard", rarityId: "common", atk: 16, hp: 18, def: 2, spd: 22, crt: 9, int: 4, abilityId: "off_05", artVariant: 8 },
  { id: 153, name: "Thuốc trừ sâu", subtitle: "Thuốc phun côn trùng", elementId: "hazard", rarityId: "common", atk: 20, hp: 14, def: 0, spd: 28, crt: 11, int: 2, abilityId: "off_09", artVariant: 1 },
  { id: 154, name: "Sơn khô", subtitle: "Lon sơn", elementId: "hazard", rarityId: "common", atk: 14, hp: 20, def: 4, spd: 18, crt: 7, int: 5, abilityId: "off_05", artVariant: 2 },
  { id: 155, name: "Dung môi", subtitle: "Dung môi hóa chất", elementId: "hazard", rarityId: "common", atk: 17, hp: 16, def: 2, spd: 24, crt: 9, int: 3, abilityId: "off_04", artVariant: 3 },
  { id: 156, name: "Keo 502", subtitle: "Keo dán nhanh", elementId: "hazard", rarityId: "common", atk: 12, hp: 22, def: 6, spd: 14, crt: 6, int: 5, abilityId: "utl_16", artVariant: 4 },
  { id: 157, name: "Axit tẩy", subtitle: "Axit tẩy rửa", elementId: "hazard", rarityId: "common", atk: 22, hp: 12, def: 0, spd: 30, crt: 12, int: 2, abilityId: "off_09", artVariant: 5 },
  { id: 158, name: "Pin đồng hồ", subtitle: "Pin cúc áo", elementId: "hazard", rarityId: "common", atk: 15, hp: 17, def: 2, spd: 23, crt: 8, int: 4, abilityId: "off_04", artVariant: 6 },
  { id: 159, name: "Thuốc nổ", subtitle: "Thuốc nổ công nghiệp", elementId: "hazard", rarityId: "common", atk: 25, hp: 10, def: 0, spd: 20, crt: 15, int: 3, abilityId: "off_13", artVariant: 7 },
  { id: 160, name: "Dầu nhớt", subtitle: "Dầu máy", elementId: "hazard", rarityId: "common", atk: 13, hp: 24, def: 5, spd: 12, crt: 6, int: 4, abilityId: "def_05", artVariant: 8 },
  { id: 161, name: "Bình gas mini", subtitle: "Bình gas nhỏ", elementId: "hazard", rarityId: "common", atk: 19, hp: 14, def: 1, spd: 26, crt: 10, int: 2, abilityId: "off_13", artVariant: 1 },
  { id: 162, name: "Cyanua", subtitle: "Hóa chất độc", elementId: "hazard", rarityId: "common", atk: 24, hp: 11, def: 0, spd: 22, crt: 14, int: 4, abilityId: "off_09", artVariant: 2 },
  { id: 163, name: "Thủy ngân", subtitle: "Thuỷ ngân nhiệt kế", elementId: "hazard", rarityId: "common", atk: 16, hp: 18, def: 3, spd: 20, crt: 8, int: 6, abilityId: "off_04", artVariant: 3 },
  { id: 164, name: "Amiang", subtitle: "Sợi amiang", elementId: "hazard", rarityId: "common", atk: 18, hp: 15, def: 2, spd: 24, crt: 10, int: 3, abilityId: "off_15", artVariant: 4 },
  { id: 165, name: "Thuốc diệt cỏ", subtitle: "Thuốc trừ cỏ", elementId: "hazard", rarityId: "common", atk: 17, hp: 16, def: 1, spd: 25, crt: 9, int: 3, abilityId: "off_09", artVariant: 5 },
  { id: 166, name: "Keo epoxy", subtitle: "Keo hai thành phần", elementId: "hazard", rarityId: "common", atk: 11, hp: 23, def: 7, spd: 13, crt: 5, int: 5, abilityId: "utl_16", artVariant: 6 },
  { id: 167, name: "Sơn dầu", subtitle: "Lon sơn dầu", elementId: "hazard", rarityId: "common", atk: 15, hp: 19, def: 3, spd: 21, crt: 8, int: 4, abilityId: "off_05", artVariant: 7 },
  { id: 168, name: "Ắc quy", subtitle: "Ắc quy xe máy", elementId: "hazard", rarityId: "common", atk: 20, hp: 22, def: 4, spd: 10, crt: 8, int: 4, abilityId: "off_18", artVariant: 8 },
  { id: 169, name: "Khí gas", subtitle: "Bình gas", elementId: "hazard", rarityId: "common", atk: 14, hp: 17, def: 2, spd: 28, crt: 8, int: 3, abilityId: "off_04", artVariant: 1 },
  { id: 170, name: "Dầu hỏa", subtitle: "Dầu kerosene", elementId: "hazard", rarityId: "common", atk: 21, hp: 13, def: 0, spd: 24, crt: 12, int: 2, abilityId: "off_13", artVariant: 2 },
  { id: 171, name: "Thuốc nhuộm", subtitle: "Thuốc nhuộm tóc", elementId: "hazard", rarityId: "common", atk: 13, hp: 20, def: 4, spd: 18, crt: 7, int: 6, abilityId: "off_05", artVariant: 3 },
  { id: 172, name: "Nhựa thông", subtitle: "Nhựa thông", elementId: "hazard", rarityId: "common", atk: 12, hp: 22, def: 5, spd: 15, crt: 6, int: 5, abilityId: "def_05", artVariant: 4 },
  { id: 173, name: "Bã hóa chất", subtitle: "Phế phẩm công nghiệp", elementId: "hazard", rarityId: "common", atk: 15, hp: 18, def: 3, spd: 20, crt: 8, int: 4, abilityId: "off_15", artVariant: 5 },
  { id: 174, name: "Mực in", subtitle: "Hộp mực máy in", elementId: "hazard", rarityId: "common", atk: 11, hp: 21, def: 5, spd: 16, crt: 6, int: 6, abilityId: "def_11", artVariant: 6 },
  { id: 175, name: "Dung dịch tẩy", subtitle: "Nước tẩy", elementId: "hazard", rarityId: "common", atk: 18, hp: 15, def: 1, spd: 26, crt: 10, int: 3, abilityId: "off_09", artVariant: 7 },
  { id: 176, name: "Pháo hoa", subtitle: "Pháo hoa cũ", elementId: "hazard", rarityId: "common", atk: 23, hp: 12, def: 0, spd: 22, crt: 13, int: 2, abilityId: "off_13", artVariant: 8 },
  { id: 177, name: "Than chì", subtitle: "Than chì", elementId: "hazard", rarityId: "common", atk: 14, hp: 19, def: 4, spd: 18, crt: 7, int: 5, abilityId: "def_05", artVariant: 1 },
  { id: 178, name: "Thuốc thử", subtitle: "Hóa chất thử nghiệm", elementId: "hazard", rarityId: "common", atk: 16, hp: 17, def: 2, spd: 23, crt: 9, int: 5, abilityId: "off_04", artVariant: 2 },
  { id: 179, name: "Vôi sống", subtitle: "Vôi bột", elementId: "hazard", rarityId: "common", atk: 19, hp: 14, def: 2, spd: 21, crt: 10, int: 3, abilityId: "off_05", artVariant: 3 },
  { id: 180, name: "Bông nhiễm", subtitle: "Bông bẩn", elementId: "hazard", rarityId: "common", atk: 13, hp: 20, def: 3, spd: 19, crt: 7, int: 5, abilityId: "off_09", artVariant: 4 },

  // RARE CARDS (181-270) - 90 rare cards
  // RARE PLASTIC (181-195)
  { id: 181, name: "Lốp xe máy", subtitle: "Lốp xe máy cũ", elementId: "plastic", rarityId: "rare", atk: 18, hp: 35, def: 8, spd: 20, crt: 10, int: 6, abilityId: "off_08", artVariant: 1 },
  { id: 182, name: "Màng bọc thực phẩm", subtitle: "Màng bọc bảo quản", elementId: "plastic", rarityId: "rare", atk: 22, hp: 28, def: 5, spd: 32, crt: 14, int: 4, abilityId: "off_02", artVariant: 2 },
  { id: 183, name: "Túi nilon lớn", subtitle: "Túi nilon to", elementId: "plastic", rarityId: "rare", atk: 14, hp: 42, def: 12, spd: 15, crt: 7, int: 8, abilityId: "def_04", artVariant: 3 },
  { id: 184, name: "Lốp xe đạp", subtitle: "Lốp xe đạp", elementId: "plastic", rarityId: "rare", atk: 20, hp: 32, def: 10, spd: 28, crt: 12, int: 5, abilityId: "off_03", artVariant: 4 },
  { id: 185, name: "Màng bọc", subtitle: "Màng bọc thực phẩm", elementId: "plastic", rarityId: "rare", atk: 12, hp: 38, def: 15, spd: 12, crt: 6, int: 10, abilityId: "def_07", artVariant: 5 },
  { id: 186, name: "Ống tiêm y tế", subtitle: "Ống tiêm một lần", elementId: "plastic", rarityId: "rare", atk: 24, hp: 25, def: 3, spd: 30, crt: 15, int: 7, abilityId: "off_09", artVariant: 6 },
  { id: 187, name: "Ốp lưng ipad", subtitle: "Ốp lưng máy tính bảng", elementId: "plastic", rarityId: "rare", atk: 16, hp: 36, def: 14, spd: 18, crt: 8, int: 12, abilityId: "def_10", artVariant: 7 },
  { id: 188, name: "Bình nước", subtitle: "Bình nước thể thao", elementId: "plastic", rarityId: "rare", atk: 14, hp: 48, def: 12, spd: 10, crt: 5, int: 8, abilityId: "utl_03", artVariant: 8 },
  { id: 189, name: "Dây cáp", subtitle: "Dây sạc điện thoại", elementId: "plastic", rarityId: "rare", atk: 18, hp: 30, def: 8, spd: 35, crt: 11, int: 9, abilityId: "off_06", artVariant: 1 },
  { id: 190, name: "Mũ bảo hiểm", subtitle: "Mũ cối", elementId: "plastic", rarityId: "rare", atk: 15, hp: 40, def: 16, spd: 14, crt: 6, int: 10, abilityId: "def_06", artVariant: 2 },
  { id: 191, name: "Tay cầm game", subtitle: "Tay cầm chơi game", elementId: "plastic", rarityId: "rare", atk: 22, hp: 28, def: 6, spd: 26, crt: 13, int: 8, abilityId: "off_14", artVariant: 3 },
  { id: 192, name: "Hộp đựng đồ", subtitle: "Hộp nhựa đựng đồ", elementId: "plastic", rarityId: "rare", atk: 16, hp: 38, def: 14, spd: 16, crt: 7, int: 9, abilityId: "def_08", artVariant: 4 },
  { id: 193, name: "Kính VR", subtitle: "Kính thực tế ảo", elementId: "plastic", rarityId: "rare", atk: 20, hp: 32, def: 8, spd: 24, crt: 12, int: 14, abilityId: "utl_07", artVariant: 5 },
  { id: 194, name: "Thùng rác", subtitle: "Thùng rác nhựa", elementId: "plastic", rarityId: "rare", atk: 18, hp: 35, def: 10, spd: 20, crt: 9, int: 12, abilityId: "utl_09", artVariant: 6 },
  { id: 195, name: "Bơm xe", subtitle: "Bơm xe đạp", elementId: "plastic", rarityId: "rare", atk: 26, hp: 24, def: 5, spd: 28, crt: 14, int: 5, abilityId: "off_02", artVariant: 7 },

  // RARE PAPER (196-210)
  { id: 196, name: "Tiền giấy", subtitle: "Tờ tiền 5000đ", elementId: "paper", rarityId: "rare", atk: 16, hp: 38, def: 10, spd: 18, crt: 8, int: 15, abilityId: "utl_09", artVariant: 8 },
  { id: 197, name: "Sổ tay cũ", subtitle: "Sổ ghi chép", elementId: "paper", rarityId: "rare", atk: 12, hp: 42, def: 12, spd: 14, crt: 6, int: 16, abilityId: "utl_08", artVariant: 1 },
  { id: 198, name: "Bản đồ thành phố", subtitle: "Bản đồ Hà Nội", elementId: "paper", rarityId: "rare", atk: 18, hp: 34, def: 8, spd: 22, crt: 10, int: 14, abilityId: "utl_07", artVariant: 2 },
  { id: 199, name: "Kịch bản phim", subtitle: "Kịch bản cũ", elementId: "paper", rarityId: "rare", atk: 20, hp: 30, def: 6, spd: 24, crt: 12, int: 15, abilityId: "off_06", artVariant: 3 },
  { id: 200, name: "Hợp đồng", subtitle: "Giấy tờ hợp đồng", elementId: "paper", rarityId: "rare", atk: 14, hp: 40, def: 14, spd: 12, crt: 6, int: 18, abilityId: "def_10", artVariant: 4 },
  { id: 201, name: "Di chúc", subtitle: "Giấy di chúc", elementId: "paper", rarityId: "rare", atk: 10, hp: 48, def: 16, spd: 8, crt: 4, int: 20, abilityId: "utl_05", artVariant: 5 },
  { id: 202, name: "Album ảnh", subtitle: "Album ảnh gia đình", elementId: "paper", rarityId: "rare", atk: 14, hp: 44, def: 12, spd: 14, crt: 7, int: 14, abilityId: "utl_17", artVariant: 6 },
  { id: 203, name: "Sách ma", subtitle: "Tiểu thuyết kinh dị", elementId: "paper", rarityId: "rare", atk: 22, hp: 28, def: 4, spd: 26, crt: 14, int: 12, abilityId: "off_09", artVariant: 7 },
  { id: 204, name: "Sheet nhạc", subtitle: "Nốt nhạc piano", elementId: "paper", rarityId: "rare", atk: 18, hp: 36, def: 8, spd: 20, crt: 10, int: 14, abilityId: "off_17", artVariant: 8 },
  { id: 205, name: "Thiệp cưới", subtitle: "Thiệp mời cưới", elementId: "paper", rarityId: "rare", atk: 12, hp: 46, def: 14, spd: 10, crt: 5, int: 16, abilityId: "def_19", artVariant: 1 },
  { id: 206, name: "Vé máy bay", subtitle: "Vé bay nội địa", elementId: "paper", rarityId: "rare", atk: 20, hp: 32, def: 6, spd: 30, crt: 12, int: 10, abilityId: "utl_07", artVariant: 2 },
  { id: 207, name: "Sách luật", subtitle: "Bộ luật dân sự", elementId: "paper", rarityId: "rare", atk: 16, hp: 40, def: 16, spd: 12, crt: 7, int: 15, abilityId: "def_10", artVariant: 3 },
  { id: 208, name: "Báo cũ", subtitle: "Báo tuổi trẻ", elementId: "paper", rarityId: "rare", atk: 24, hp: 26, def: 4, spd: 28, crt: 15, int: 10, abilityId: "off_03", artVariant: 4 },
  { id: 209, name: "Giấy vẽ", subtitle: "Giấy vẽ kỹ thuật", elementId: "paper", rarityId: "rare", atk: 14, hp: 42, def: 10, spd: 16, crt: 8, int: 16, abilityId: "utl_18", artVariant: 5 },
  { id: 210, name: "Nhật ký", subtitle: "Sổ nhật ký", elementId: "paper", rarityId: "rare", atk: 12, hp: 44, def: 12, spd: 14, crt: 6, int: 18, abilityId: "utl_08", artVariant: 6 },

  // RARE GLASS (211-225)
  { id: 211, name: "Kính viễn vọng", subtitle: "Kính thiên văn nhỏ", elementId: "glass", rarityId: "rare", atk: 18, hp: 34, def: 10, spd: 22, crt: 10, int: 16, abilityId: "utl_18", artVariant: 7 },
  { id: 212, name: "Bình rượu", subtitle: "Bình rượu vang", elementId: "glass", rarityId: "rare", atk: 16, hp: 42, def: 14, spd: 12, crt: 7, int: 12, abilityId: "def_18", artVariant: 8 },
  { id: 213, name: "Ly pha lê", subtitle: "Ly thủy tinh cao cấp", elementId: "glass", rarityId: "rare", atk: 20, hp: 36, def: 12, spd: 18, crt: 11, int: 10, abilityId: "def_02", artVariant: 1 },
  { id: 214, name: "Gương lớn", subtitle: "Gương soi to", elementId: "glass", rarityId: "rare", atk: 14, hp: 44, def: 16, spd: 14, crt: 6, int: 14, abilityId: "def_05", artVariant: 2 },
  { id: 215, name: "Lọ tinh dầu", subtitle: "Chai dầu thơm", elementId: "glass", rarityId: "rare", atk: 18, hp: 38, def: 10, spd: 20, crt: 9, int: 14, abilityId: "utl_01", artVariant: 3 },
  { id: 216, name: "Bóng đèn Edison", subtitle: "Bóng đèn cổ", elementId: "glass", rarityId: "rare", atk: 22, hp: 30, def: 6, spd: 26, crt: 13, int: 8, abilityId: "off_05", artVariant: 4 },
  { id: 217, name: "Kính áp tròng", subtitle: "Kính áp tròng", elementId: "glass", rarityId: "rare", atk: 16, hp: 40, def: 12, spd: 18, crt: 8, int: 16, abilityId: "utl_18", artVariant: 5 },
  { id: 218, name: "Chai rượu vang đỏ", subtitle: "Chai rượu vang", elementId: "glass", rarityId: "rare", atk: 20, hp: 34, def: 10, spd: 16, crt: 10, int: 12, abilityId: "def_02", artVariant: 6 },
  { id: 219, name: "Lọ thí nghiệm", subtitle: "Lọ hóa chất", elementId: "glass", rarityId: "rare", atk: 24, hp: 28, def: 4, spd: 28, crt: 15, int: 12, abilityId: "off_04", artVariant: 7 },
  { id: 220, name: "Ly nước", subtitle: "Ly uống nước", elementId: "glass", rarityId: "rare", atk: 14, hp: 46, def: 16, spd: 10, crt: 5, int: 14, abilityId: "def_19", artVariant: 8 },
  { id: 221, name: "Kính hiển vi", subtitle: "Kính hiển vi nhỏ", elementId: "glass", rarityId: "rare", atk: 18, hp: 36, def: 10, spd: 20, crt: 10, int: 18, abilityId: "utl_18", artVariant: 1 },
  { id: 222, name: "Bình karaoke", subtitle: "Ly hát karaoke", elementId: "glass", rarityId: "rare", atk: 20, hp: 32, def: 8, spd: 24, crt: 12, int: 10, abilityId: "off_17", artVariant: 2 },
  { id: 223, name: "Lọ tro cốt", subtitle: "Lọ đựng tro", elementId: "glass", rarityId: "rare", atk: 10, hp: 50, def: 18, spd: 6, crt: 3, int: 16, abilityId: "def_20", artVariant: 3 },
  { id: 224, name: "Chai nước hoa", subtitle: "Chai nước hoa nhỏ", elementId: "glass", rarityId: "rare", atk: 16, hp: 40, def: 12, spd: 16, crt: 8, int: 14, abilityId: "utl_08", artVariant: 4 },
  { id: 225, name: "Gương soi", subtitle: "Gương trang điểm", elementId: "glass", rarityId: "rare", atk: 22, hp: 30, def: 8, spd: 22, crt: 13, int: 14, abilityId: "off_11", artVariant: 5 },

  // RARE METAL (226-240)
  { id: 226, name: "Lon bia sưu tầm", subtitle: "Lon bia đặc biệt", elementId: "metal", rarityId: "rare", atk: 24, hp: 32, def: 12, spd: 22, crt: 14, int: 8, abilityId: "off_14", artVariant: 6 },
  { id: 227, name: "Hộp vàng", subtitle: "Hộp đựng trang sức", elementId: "metal", rarityId: "rare", atk: 16, hp: 46, def: 20, spd: 10, crt: 6, int: 12, abilityId: "def_12", artVariant: 7 },
  { id: 228, name: "Vỏ máy bay", subtitle: "Mảnh vỏ máy bay", elementId: "metal", rarityId: "rare", atk: 28, hp: 30, def: 8, spd: 35, crt: 16, int: 6, abilityId: "off_03", artVariant: 8 },
  { id: 229, name: "Lon tên lửa", subtitle: "Mô hình tên lửa", elementId: "metal", rarityId: "rare", atk: 30, hp: 24, def: 4, spd: 32, crt: 18, int: 4, abilityId: "off_13", artVariant: 1 },
  { id: 230, name: "Khiên", subtitle: "Khiên kim loại", elementId: "metal", rarityId: "rare", atk: 18, hp: 48, def: 22, spd: 8, crt: 6, int: 10, abilityId: "def_12", artVariant: 2 },
  { id: 231, name: "Vỏ tàu ngầm", subtitle: "Mô hình tàu ngầm", elementId: "metal", rarityId: "rare", atk: 20, hp: 44, def: 18, spd: 12, crt: 8, int: 8, abilityId: "def_20", artVariant: 3 },
  { id: 232, name: "Lon phi thuyền", subtitle: "Mô hình phi thuyền", elementId: "metal", rarityId: "rare", atk: 26, hp: 34, def: 10, spd: 28, crt: 14, int: 10, abilityId: "off_16", artVariant: 4 },
  { id: 233, name: "Vỏ xe tăng", subtitle: "Mô hình xe tăng", elementId: "metal", rarityId: "rare", atk: 32, hp: 38, def: 16, spd: 8, crt: 10, int: 6, abilityId: "def_10", artVariant: 5 },
  { id: 234, name: "Lon vệ tinh", subtitle: "Mô hình vệ tinh", elementId: "metal", rarityId: "rare", atk: 22, hp: 36, def: 12, spd: 30, crt: 12, int: 14, abilityId: "utl_18", artVariant: 6 },
  { id: 235, name: "Hộp tin nhắn", subtitle: "Hộp đựng thư", elementId: "metal", rarityId: "rare", atk: 18, hp: 40, def: 14, spd: 18, crt: 9, int: 16, abilityId: "off_06", artVariant: 7 },
  { id: 236, name: "Lon điện tử", subtitle: "Vỏ linh kiện", elementId: "metal", rarityId: "rare", atk: 24, hp: 30, def: 10, spd: 26, crt: 14, int: 12, abilityId: "off_06", artVariant: 8 },
  { id: 237, name: "Vỏ máy photocopy", subtitle: "Vỏ máy in", elementId: "metal", rarityId: "rare", atk: 16, hp: 42, def: 16, spd: 14, crt: 7, int: 12, abilityId: "utl_09", artVariant: 1 },
  { id: 238, name: "Lon robot", subtitle: "Mô hình robot", elementId: "metal", rarityId: "rare", atk: 22, hp: 34, def: 12, spd: 24, crt: 12, int: 12, abilityId: "off_14", artVariant: 2 },
  { id: 239, name: "Hộp âm thanh", subtitle: "Loa mini", elementId: "metal", rarityId: "rare", atk: 18, hp: 38, def: 10, spd: 22, crt: 10, int: 12, abilityId: "off_17", artVariant: 3 },
  { id: 240, name: "Vỏ động cơ", subtitle: "Vỏ máy phản lực", elementId: "metal", rarityId: "rare", atk: 28, hp: 28, def: 8, spd: 36, crt: 16, int: 6, abilityId: "off_02", artVariant: 4 },

  // RARE ORGANIC (241-255)
  { id: 241, name: "Vỏ trứng lớn", subtitle: "Vỏ trứng vịt", elementId: "organic", rarityId: "rare", atk: 14, hp: 50, def: 18, spd: 8, crt: 5, int: 12, abilityId: "def_20", artVariant: 5 },
  { id: 242, name: "Hạt giống", subtitle: "Hạt giống cây", elementId: "organic", rarityId: "rare", atk: 16, hp: 48, def: 16, spd: 10, crt: 6, int: 14, abilityId: "utl_05", artVariant: 6 },
  { id: 243, name: "Xương gà lớn", subtitle: "Xương gà tây", elementId: "organic", rarityId: "rare", atk: 26, hp: 40, def: 14, spd: 12, crt: 12, int: 8, abilityId: "def_18", artVariant: 7 },
  { id: 244, name: "Thân cây khô", subtitle: "Cành cây khô", elementId: "organic", rarityId: "rare", atk: 18, hp: 46, def: 18, spd: 8, crt: 7, int: 14, abilityId: "def_17", artVariant: 8 },
  { id: 245, name: "Nấm khô", subtitle: "Nấm hương khô", elementId: "organic", rarityId: "rare", atk: 20, hp: 44, def: 12, spd: 14, crt: 10, int: 16, abilityId: "utl_01", artVariant: 1 },
  { id: 246, name: "San hô", subtitle: "San hô biển", elementId: "organic", rarityId: "rare", atk: 16, hp: 48, def: 20, spd: 8, crt: 6, int: 12, abilityId: "def_20", artVariant: 2 },
  { id: 247, name: "Nấm men", subtitle: "Bột nở", elementId: "organic", rarityId: "rare", atk: 22, hp: 38, def: 10, spd: 20, crt: 12, int: 12, abilityId: "off_15", artVariant: 3 },
  { id: 248, name: "Vỏ sò", subtitle: "Vỏ sò biển", elementId: "organic", rarityId: "rare", atk: 14, hp: 50, def: 16, spd: 10, crt: 5, int: 14, abilityId: "def_19", artVariant: 4 },
  { id: 249, name: "Rong biển", subtitle: "Rong biển khô", elementId: "organic", rarityId: "rare", atk: 18, hp: 42, def: 14, spd: 16, crt: 8, int: 14, abilityId: "def_17", artVariant: 5 },
  { id: 250, name: "Gỗ mục", subtitle: "Mảnh gỗ", elementId: "organic", rarityId: "rare", atk: 20, hp: 46, def: 20, spd: 8, crt: 7, int: 10, abilityId: "def_18", artVariant: 6 },
  { id: 251, name: "Nhựa cây", subtitle: "Nhựa thông", elementId: "organic", rarityId: "rare", atk: 16, hp: 48, def: 18, spd: 10, crt: 6, int: 16, abilityId: "def_13", artVariant: 7 },
  { id: 252, name: "Bào tử nấm", subtitle: "Bào tử", elementId: "organic", rarityId: "rare", atk: 18, hp: 44, def: 14, spd: 14, crt: 9, int: 14, abilityId: "utl_05", artVariant: 8 },
  { id: 253, name: "Vỏ trái cây", subtitle: "Vỏ táo", elementId: "organic", rarityId: "rare", atk: 22, hp: 40, def: 12, spd: 18, crt: 11, int: 14, abilityId: "utl_20", artVariant: 1 },
  { id: 254, name: "Mật ong", subtitle: "Lọ mật ong", elementId: "organic", rarityId: "rare", atk: 14, hp: 52, def: 16, spd: 8, crt: 5, int: 16, abilityId: "utl_03", artVariant: 2 },
  { id: 255, name: "Rễ cây", subtitle: "Rễ cây nhỏ", elementId: "organic", rarityId: "rare", atk: 20, hp: 42, def: 14, spd: 16, crt: 10, int: 14, abilityId: "off_18", artVariant: 3 },

  // RARE HAZARD (256-270)
  { id: 256, name: "Lò phản ứng", subtitle: "Lò phản ứng hạt nhân", elementId: "hazard", rarityId: "rare", atk: 35, hp: 30, def: 6, spd: 20, crt: 18, int: 10, abilityId: "off_15", artVariant: 4 },
  { id: 257, name: "Pin lithium", subtitle: "Pin lithium ion", elementId: "hazard", rarityId: "rare", atk: 40, hp: 20, def: 0, spd: 15, crt: 22, int: 8, abilityId: "off_20", artVariant: 5 },
  { id: 258, name: "Chất phóng xạ", subtitle: "Chất phóng xạ", elementId: "hazard", rarityId: "rare", atk: 28, hp: 26, def: 4, spd: 32, crt: 16, int: 12, abilityId: "off_15", artVariant: 6 },
  { id: 259, name: "Virus", subtitle: "Vi khuẩn", elementId: "hazard", rarityId: "rare", atk: 30, hp: 22, def: 2, spd: 35, crt: 18, int: 10, abilityId: "off_09", artVariant: 7 },
  { id: 260, name: "Thiết bị sinh học", subtitle: "Thiết bị y tế", elementId: "hazard", rarityId: "rare", atk: 26, hp: 28, def: 8, spd: 28, crt: 14, int: 16, abilityId: "off_06", artVariant: 8 },
  { id: 261, name: "Chất độc thần kinh", subtitle: "Thuốc độc", elementId: "hazard", rarityId: "rare", atk: 32, hp: 24, def: 2, spd: 30, crt: 18, int: 10, abilityId: "off_09", artVariant: 1 },
  { id: 262, name: "Bức xạ", subtitle: "Tia phóng xạ", elementId: "hazard", rarityId: "rare", atk: 28, hp: 26, def: 4, spd: 32, crt: 16, int: 14, abilityId: "off_15", artVariant: 2 },
  { id: 263, name: "Nanobot", subtitle: "Robot nano", elementId: "hazard", rarityId: "rare", atk: 34, hp: 22, def: 2, spd: 38, crt: 20, int: 12, abilityId: "off_16", artVariant: 3 },
  { id: 264, name: "Khí độc", subtitle: "Khí gas độc", elementId: "hazard", rarityId: "rare", atk: 26, hp: 24, def: 4, spd: 34, crt: 15, int: 10, abilityId: "off_04", artVariant: 4 },
  { id: 265, name: "Plutonium", subtitle: "Kim loại phóng xạ", elementId: "hazard", rarityId: "rare", atk: 38, hp: 28, def: 8, spd: 18, crt: 18, int: 10, abilityId: "off_18", artVariant: 5 },
  { id: 266, name: "Laser", subtitle: "Tia laser", elementId: "hazard", rarityId: "rare", atk: 36, hp: 22, def: 2, spd: 30, crt: 20, int: 8, abilityId: "off_07", artVariant: 6 },
  { id: 267, name: "Vi khuẩn", subtitle: "Vi khuẩn ăn thịt", elementId: "hazard", rarityId: "rare", atk: 30, hp: 26, def: 4, spd: 32, crt: 17, int: 10, abilityId: "off_09", artVariant: 7 },
  { id: 268, name: "Chất nổ lỏng", subtitle: "Thuốc nổ lỏng", elementId: "hazard", rarityId: "rare", atk: 42, hp: 18, def: 0, spd: 22, crt: 24, int: 6, abilityId: "off_13", artVariant: 8 },
  { id: 269, name: "Tia gamma", subtitle: "Tia vũ trụ", elementId: "hazard", rarityId: "rare", atk: 32, hp: 24, def: 2, spd: 34, crt: 18, int: 12, abilityId: "off_15", artVariant: 1 },
  { id: 270, name: "Kim loại nặng", subtitle: "Chì, thủy ngân", elementId: "hazard", rarityId: "rare", atk: 28, hp: 28, def: 6, spd: 26, crt: 15, int: 12, abilityId: "off_05", artVariant: 2 },

  // EPIC CARDS (271-294) - 24 epic cards
  { id: 271, name: "Lốp xe hơi", subtitle: "Lốp xe ô tô", elementId: "plastic", rarityId: "epic", atk: 35, hp: 60, def: 20, spd: 40, crt: 22, int: 18, abilityId: "off_14", artVariant: 3 },
  { id: 272, name: "Màng bọc lớn", subtitle: "Màng bọc công nghiệp", elementId: "plastic", rarityId: "epic", atk: 40, hp: 50, def: 12, spd: 55, crt: 28, int: 14, abilityId: "off_10", artVariant: 4 },
  { id: 273, name: "Túi nilon khổ lớn", subtitle: "Túi nilon to", elementId: "plastic", rarityId: "epic", atk: 28, hp: 75, def: 30, spd: 30, crt: 16, int: 24, abilityId: "def_10", artVariant: 5 },
  { id: 274, name: "Lốp xe đua", subtitle: "Lốp xe đua F1", elementId: "plastic", rarityId: "epic", atk: 42, hp: 55, def: 22, spd: 50, crt: 26, int: 12, abilityId: "off_03", artVariant: 6 },
  { id: 275, name: "Màng bọc thực phẩm", subtitle: "Màng bọc bảo quản lớn", elementId: "plastic", rarityId: "epic", atk: 24, hp: 80, def: 35, spd: 20, crt: 12, int: 28, abilityId: "def_12", artVariant: 7 },
  { id: 276, name: "Vỏ dừa lớn", subtitle: "Vỏ dừa", elementId: "organic", rarityId: "epic", atk: 30, hp: 85, def: 40, spd: 15, crt: 10, int: 30, abilityId: "def_20", artVariant: 8 },
  { id: 277, name: "Hạt giống quý", subtitle: "Hạt giống hiếm", elementId: "organic", rarityId: "epic", atk: 35, hp: 80, def: 35, spd: 20, crt: 14, int: 32, abilityId: "utl_05", artVariant: 1 },
  { id: 278, name: "Xương lớn", subtitle: "Xương động vật", elementId: "organic", rarityId: "epic", atk: 50, hp: 70, def: 30, spd: 25, crt: 24, int: 18, abilityId: "def_18", artVariant: 2 },
  { id: 279, name: "Lò phản ứng hạt nhân", subtitle: "Lò phản ứng", elementId: "hazard", rarityId: "epic", atk: 60, hp: 50, def: 15, spd: 35, crt: 32, int: 24, abilityId: "off_20", artVariant: 3 },
  { id: 280, name: "Pin lithium", subtitle: "Pin lithium công nghiệp", elementId: "hazard", rarityId: "epic", atk: 75, hp: 35, def: 0, spd: 25, crt: 45, int: 18, abilityId: "off_20", artVariant: 4 },
  { id: 281, name: "Chất phóng xạ", subtitle: "Chất phóng xạ cao", elementId: "hazard", rarityId: "epic", atk: 55, hp: 45, def: 10, spd: 55, crt: 32, int: 28, abilityId: "off_15", artVariant: 5 },
  { id: 282, name: "Kính viễn vọng lớn", subtitle: "Kính thiên văn", elementId: "glass", rarityId: "epic", atk: 35, hp: 65, def: 25, spd: 40, crt: 22, int: 38, abilityId: "utl_18", artVariant: 6 },
  { id: 283, name: "Bình rượu quý", subtitle: "Bình rượu vang cổ", elementId: "glass", rarityId: "epic", atk: 32, hp: 75, def: 35, spd: 22, crt: 16, int: 28, abilityId: "def_18", artVariant: 7 },
  { id: 284, name: "Lon tên lửa", subtitle: "Mô hình tên lửa lớn", elementId: "metal", rarityId: "epic", atk: 58, hp: 45, def: 12, spd: 60, crt: 35, int: 12, abilityId: "off_13", artVariant: 8 },
  { id: 285, name: "Hộp kim hoàn", subtitle: "Hộp đựng vàng", elementId: "metal", rarityId: "epic", atk: 32, hp: 85, def: 45, spd: 18, crt: 12, int: 28, abilityId: "def_12", artVariant: 1 },
  { id: 286, name: "Tiền polymer", subtitle: "Tờ tiền polymer mới", elementId: "paper", rarityId: "epic", atk: 30, hp: 70, def: 28, spd: 30, crt: 16, int: 40, abilityId: "utl_20", artVariant: 2 },
  { id: 287, name: "Sổ tay cổ", subtitle: "Sổ ghi chép cũ", elementId: "paper", rarityId: "epic", atk: 25, hp: 80, def: 30, spd: 25, crt: 14, int: 42, abilityId: "utl_08", artVariant: 3 },
  { id: 288, name: "Bản đồ thế giới", subtitle: "Bản đồ thế giới", elementId: "paper", rarityId: "epic", atk: 35, hp: 65, def: 20, spd: 40, crt: 22, int: 36, abilityId: "utl_07", artVariant: 4 },
  { id: 289, name: "Vỏ xe tăng", subtitle: "Vỏ xe tăng cổ", elementId: "metal", rarityId: "epic", atk: 60, hp: 70, def: 35, spd: 15, crt: 20, int: 14, abilityId: "def_10", artVariant: 5 },
  { id: 290, name: "Vỏ tàu ngầm", subtitle: "Vỏ tàu ngầm cổ", elementId: "metal", rarityId: "epic", atk: 40, hp: 80, def: 40, spd: 22, crt: 16, int: 18, abilityId: "def_20", artVariant: 6 },
  { id: 291, name: "Ly pha lê", subtitle: "Ly pha lê cao cấp", elementId: "glass", rarityId: "epic", atk: 42, hp: 65, def: 28, spd: 32, crt: 24, int: 24, abilityId: "def_02", artVariant: 7 },
  { id: 292, name: "Gương lớn", subtitle: "Gương hoàng gia", elementId: "glass", rarityId: "epic", atk: 28, hp: 80, def: 38, spd: 25, crt: 12, int: 32, abilityId: "def_05", artVariant: 8 },
  { id: 293, name: "Lọ tro cốt", subtitle: "Lọ cốt nhỏ", elementId: "glass", rarityId: "epic", atk: 20, hp: 90, def: 42, spd: 10, crt: 6, int: 38, abilityId: "def_20", artVariant: 1 },
  { id: 294, name: "Lon vệ tinh", subtitle: "Mô hình vệ tinh", elementId: "metal", rarityId: "epic", atk: 45, hp: 65, def: 28, spd: 55, crt: 25, int: 32, abilityId: "utl_18", artVariant: 2 },

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

// Element-specific art data
const ELEMENT_ART: Record<string, {
  icon: string;
  shape: string;
  texture: string;
  overlay: string;
}> = {
  plastic: {
    icon: "🔵",
    shape: "bottle",
    texture: "crinkled",
    overlay: "reflection",
  },
  paper: {
    icon: "📄",
    shape: "sheet",
    texture: "torn",
    overlay: "fiber",
  },
  glass: {
    icon: "🥛",
    shape: "jar",
    texture: "rings",
    overlay: "shine",
  },
  metal: {
    icon: "🥫",
    shape: "can",
    texture: "dents",
    overlay: "scratch",
  },
  organic: {
    icon: "🍃",
    shape: "leaf",
    texture: "veins",
    overlay: "dewdrop",
  },
  hazard: {
    icon: "☣️",
    shape: "skull",
    texture: "crack",
    overlay: "steam",
  },
};

const RARITY_COLORS: Record<string, { border: string; glow: string; bg: string; accent: string }> = {
  common:    { border: "#94a3b8", glow: "#cbd5e1", bg: "#f1f5f9", accent: "#64748b" },
  rare:      { border: "#3b82f6", glow: "#60a5fa", bg: "#eff6ff", accent: "#2563eb" },
  epic:      { border: "#a855f7", glow: "#c084fc", bg: "#faf5ff", accent: "#7c3aed" },
  legendary: { border: "#f59e0b", glow: "#fbbf24", bg: "#fffbeb", accent: "#d97706" },
};

function getParticleCount(rarityId: string): number {
  if (rarityId === "legendary") return 18;
  if (rarityId === "epic") return 12;
  if (rarityId === "rare") return 7;
  return 4;
}

// ─── PIXEL-ART-STYLE CARD ILLUSTRATIONS ─────────────────────────────────────
// Each element gets chunky 3D box illustration with hard shadows, warm palette,
// recycling symbol, and chunky pixel shading — matching the provided asset style.
// ─────────────────────────────────────────────────────────────────────────────

function generateElementArt(elementId: string, cardId: number, rng: (n: number) => number): ReactElement {
  const accentColor = ELEMENTS.find(e => e.id === elementId)?.accent || "#94a3b8";
  const seed = cardId * 7;

  switch (elementId) {

    case "plastic": {
      // Chunky 3D plastic bottle with cap, label, hard drop-shadow
      // Palette: cyan blues + white highlights + dark shadow
      const shadowX = 4, shadowY = 4;
      return (
        <g transform="translate(60,85)">
          {/* Hard drop-shadow — offset rectangle */}
          <path
            d="M-16,-42 L-19,-26 L-19,18 Q-19,24 -12,24 L12,24 Q19,24 19,18 L19,-26 L16,-42 Q12,-52 0,-52 Q-12,-52 -16,-42 Z"
            fill="#0c4a6e" opacity="0.45"
            transform={`translate(${shadowX},${shadowY})`}
          />
          {/* Cap shadow */}
          <rect x="-10" y="-64" width="20" height="9" rx="2" fill="#0c4a6e" opacity="0.4" transform={`translate(${shadowX},${shadowY})`} />
          <rect x="-8" y="-67" width="16" height="5" rx="2" fill="#0c4a6e" opacity="0.35" transform={`translate(${shadowX},${shadowY})`} />

          {/* Bottle body — left face (darker) */}
          <path
            d="M-16,-42 L-19,-26 L-19,18 Q-19,24 -12,24 L-2,24 L-2,-40 Q-4,-48 0,-52 Q-12,-52 -16,-42 Z"
            fill="#0891b2" opacity="0.9"
          />
          {/* Bottle body — right face (lighter) */}
          <path
            d="M-2,24 L12,24 Q19,24 19,18 L19,-26 L16,-42 Q12,-52 0,-52 L-2,-40 L-2,24 Z"
            fill="#06b6d4" opacity="0.9"
          />
          {/* Bottle body — top face */}
          <path
            d="M-16,-42 Q-12,-52 0,-52 Q12,-52 16,-42 Q12,-48 0,-48 Q-12,-48 -16,-42 Z"
            fill="#22d3ee" opacity="0.95"
          />
          {/* Cap */}
          <rect x="-10" y="-64" width="20" height="9" rx="2" fill="#06b6d4" opacity="0.95" />
          <rect x="-8" y="-67" width="16" height="5" rx="2" fill="#0891b2" opacity="0.9" />
          {/* Cap highlight */}
          <rect x="-7" y="-66" width="5" height="2" rx="1" fill="white" opacity="0.5" />
          {/* Label band */}
          <rect x="-19" y="-2" width="38" height="16" rx="2" fill="white" opacity="0.75" />
          {/* Label text lines (chunky) */}
          <rect x="-14" y="1" width="24" height="2" rx="1" fill={accentColor} opacity="0.4" />
          <rect x="-14" y="5" width="16" height="2" rx="1" fill={accentColor} opacity="0.3" />
          <rect x="-14" y="9" width="20" height="2" rx="1" fill={accentColor} opacity="0.25" />
          {/* Highlight — left face stripe */}
          <path d="M-13,-38 L-15,-25 L-15,-5" stroke="white" strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round" strokeLinejoin="round" />
          {/* Specular dot */}
          <circle cx="-11" cy="-36" r="3.5" fill="white" opacity="0.65" />
          {/* Highlight — right face */}
          <path d="M-1,-40 L-1,-8" stroke="white" strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round" />
          {/* Recycling symbol — chunky 3-arrow triangle */}
          <g transform="translate(0,5) scale(0.4)">
            <path d="M0,-18 L16,8 L-16,8 Z" fill="none" stroke={accentColor} strokeWidth="5" strokeLinejoin="round" opacity="0.6" />
            <path d="M0,-18 L16,8 L-16,8 Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" opacity="0.3" />
          </g>
        </g>
      );
    }

    case "paper": {
      // Chunky 3D paper/cardboard box with fold lines, warm browns
      const shadowX = 4, shadowY = 4;
      return (
        <g transform="translate(60,85)">
          {/* Hard drop-shadow */}
          <path
            d="M-24,-38 L26,-38 L26,42 L-24,42 Z"
            fill="#78350f" opacity="0.4"
            transform={`translate(${shadowX},${shadowY})`}
          />
          {/* Paper body — left face (darker side) */}
          <path
            d="M-24,-38 L0,-38 L0,42 L-24,42 Z"
            fill="#b45309" opacity="0.95"
          />
          {/* Paper body — right face (lighter) */}
          <path
            d="M0,-38 L26,-38 L26,42 L0,42 Z"
            fill="#d97706" opacity="0.95"
          />
          {/* Top face */}
          <path
            d="M-24,-38 L0,-38 L26,-38 L26,-38 Z"
            fill="#fbbf24" opacity="0.9"
          />
          {/* Cardboard texture — horizontal lines (left face) */}
          {[0,1,2,3,4,5].map((i) => (
            <line key={`tl-${i}`} x1="-24" y1={-30 + i * 12} x2="0" y2={-30 + i * 12}
              stroke="white" strokeWidth="1.5" opacity="0.15" strokeLinecap="round" />
          ))}
          {/* Cardboard texture — horizontal lines (right face) */}
          {[0,1,2,3,4,5].map((i) => (
            <line key={`tr-${i}`} x1="0" y1={-30 + i * 12} x2="26" y2={-30 + i * 12}
              stroke="white" strokeWidth="1.5" opacity="0.18" strokeLinecap="round" />
          ))}
          {/* Fold crease lines */}
          <line x1="0" y1="-38" x2="0" y2="42" stroke="#92400e" strokeWidth="2.5" opacity="0.5" />
          <line x1="-24" y1="2" x2="26" y2="2" stroke="#92400e" strokeWidth="1.5" opacity="0.35" />
          <line x1="-24" y1="-18" x2="26" y2="-18" stroke="#92400e" strokeWidth="1" opacity="0.25" />
          {/* Dog-ear fold top-right */}
          <path d="M18,-38 L26,-30 L18,-30 Z" fill="#f59e0b" opacity="0.7" />
          <path d="M18,-38 L26,-30 L18,-30 Z" fill="white" opacity="0.2" />
          {/* Dog-ear fold bottom-left */}
          <path d="M-24,34 L-16,42 L-24,42 Z" fill="#92400e" opacity="0.5" />
          {/* Torn/worn edge top */}
          <path d="M-24,-38 L-20,-40 L-14,-37 L-8,-41 L0,-38 L8,-40 L14,-37 L20,-39 L26,-38"
            stroke="#fde68a" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinejoin="round" />
          {/* Specular highlight left face */}
          <rect x="-23" y="-36" width="4" height="20" rx="1" fill="white" opacity="0.12" />
          {/* Recycling chunky arrows */}
          <g transform="translate(0,6) scale(0.4)">
            <path d="M0,-18 L16,8 L-16,8 Z" fill="none" stroke={accentColor} strokeWidth="5" strokeLinejoin="round" opacity="0.55" />
            <path d="M0,-18 L16,8 L-16,8 Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" opacity="0.25" />
          </g>
        </g>
      );
    }

    case "glass": {
      // Chunky 3D glass jar with chunky shine stripes and label
      const shadowX = 4, shadowY = 4;
      return (
        <g transform="translate(60,85)">
          {/* Hard drop-shadow */}
          <path
            d="M-18,-30 L-18,32 Q-18,40 -10,40 L10,40 Q18,40 18,32 L18,-30 Q18,-36 12,-36 L-12,-36 Q-18,-36 -18,-30 Z"
            fill="#134e4a" opacity="0.4"
            transform={`translate(${shadowX},${shadowY})`}
          />
          {/* Jar body — left face (darker teal) */}
          <path
            d="M-18,-30 L-18,32 Q-18,40 -10,40 L-2,40 L-2,-28 Q-4,-34 0,-38 Q-10,-38 -18,-30 Z"
            fill="#0f766e" opacity="0.85"
          />
          {/* Jar body — right face (lighter) */}
          <path
            d="M-2,40 L10,40 Q18,40 18,32 L18,-30 Q18,-36 12,-36 L-2,-28 L-2,40 Z"
            fill="#14b8a6" opacity="0.85"
          />
          {/* Jar top rim */}
          <path
            d="M-18,-30 Q-18,-36 0,-38 Q18,-36 18,-30"
            fill="#5eead4" opacity="0.7"
          />
          {/* Lid — 3D chunky */}
          <rect x="-20" y="-46" width="40" height="10" rx="3" fill="#0d9488" opacity="0.9" />
          <rect x="-18" y="-48" width="36" height="6" rx="2" fill="#14b8a6" opacity="0.9" />
          {/* Lid top face */}
          <rect x="-18" y="-50" width="36" height="4" rx="2" fill="#5eead4" opacity="0.6" />
          {/* Lid highlight */}
          <rect x="-16" y="-49" width="10" height="2" rx="1" fill="white" opacity="0.5" />
          {/* Label */}
          <rect x="-18" y="4" width="36" height="22" rx="2" fill="white" opacity="0.6" />
          {/* Label content */}
          <rect x="-13" y="8" width="20" height="2" rx="1" fill="#0d9488" opacity="0.4" />
          <rect x="-13" y="13" width="14" height="2" rx="1" fill="#0d9488" opacity="0.3" />
          {/* Liquid inside (teal tint) */}
          <path d="M-16,20 L-16,36 Q-16,40 -10,40 L10,40 Q16,40 16,36 L16,20 Z" fill="#0d9488" opacity="0.35" />
          {/* Chunky shine stripe — left face */}
          <path d="M-14,-25 L-15,15" stroke="white" strokeWidth="5" fill="none" opacity="0.45" strokeLinecap="round" />
          {/* Chunky shine stripe — right face */}
          <path d="M-8,-22 L-9,18" stroke="white" strokeWidth="2.5" fill="none" opacity="0.25" strokeLinecap="round" />
          {/* Shine specks */}
          <circle cx="-13" cy="-20" r="3.5" fill="white" opacity="0.6" />
          <circle cx="-11" cy="-8" r="2" fill="white" opacity="0.4" />
          <circle cx="-12" cy="8" r="2.5" fill="white" opacity="0.3" />
          {/* Glass edge highlights */}
          <path d="M-18,-30 L-18,32" stroke="white" strokeWidth="2.5" opacity="0.35" strokeLinecap="round" />
          <path d="M18,-30 L18,32" stroke="white" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
          {/* Recycling symbol */}
          <g transform="translate(0,15) scale(0.35)">
            <path d="M0,-18 L16,8 L-16,8 Z" fill="none" stroke={accentColor} strokeWidth="5" strokeLinejoin="round" opacity="0.5" />
            <path d="M0,-18 L16,8 L-16,8 Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" opacity="0.25" />
          </g>
        </g>
      );
    }

    case "metal": {
      // Chunky 3D metal can/tin with dent, rust patches, metallic shine
      const shadowX = 4, shadowY = 4;
      const dentX = rng(65) > 0.5 ? 1 : -1;
      return (
        <g transform="translate(60,85)">
          {/* Hard drop-shadow */}
          <path
            d="M-20,-38 L-20,36 Q-20,44 0,44 Q20,44 20,36 L20,-38 Q20,-46 0,-46 Q-20,-46 -20,-38 Z"
            fill="#1e293b" opacity="0.5"
            transform={`translate(${shadowX},${shadowY})`}
          />
          {/* Can body — left face (darker) */}
          <path
            d="M-20,-38 L-20,36 Q-20,44 0,44 L-2,-38 Q-4,-44 0,-46 Q-12,-46 -20,-38 Z"
            fill="#475569" opacity="0.95"
          />
          {/* Can body — right face (lighter) */}
          <path
            d="M-2,-38 L0,-46 Q12,-46 20,-38 L20,36 Q20,44 0,44 L-2,-38 Z"
            fill="#64748b" opacity="0.95"
          />
          {/* Top rim — elliptical */}
          <ellipse cx="0" cy="-38" rx="20" ry="6" fill="#94a3b8" opacity="0.95" />
          <ellipse cx="0" cy="-38" rx="16" ry="4" fill="#cbd5e1" opacity="0.7" />
          {/* Pull tab */}
          <ellipse cx="0" cy="-40" rx="7" ry="3.5" fill="#94a3b8" opacity="0.85" />
          <rect x="-2.5" y="-46" width="5" height="7" rx="2" fill="#94a3b8" opacity="0.8" />
          {/* Dent mark on side */}
          <ellipse cx={dentX * 12} cy="8" rx="8" ry="5" fill="#334155" opacity="0.5" />
          <ellipse cx={dentX * 11} cy="7" rx="5" ry="3" fill="#475569" opacity="0.4" />
          {/* Rust patches */}
          {[[-12, 20], [8, 15], [-6, 30], [14, 28]].map(([rx, ry], i) => (
            <circle key={`rust-${i}`} cx={rx} cy={ry} r={3 + (i % 2) * 2}
              fill="#b45309" opacity={0.3 + (i % 3) * 0.1} />
          ))}
          {/* Horizontal stripe bands */}
          <rect x="-20" y="-12" width="40" height="4" fill="white" opacity="0.08" rx="1" />
          <rect x="-20" y="10" width="40" height="4" fill="white" opacity="0.08" rx="1" />
          {/* Metallic shine — chunky vertical stripe */}
          <path d="M-14,-34 L-15,30" stroke="white" strokeWidth="5" fill="none" opacity="0.35" strokeLinecap="round" />
          <path d="M-10,-32 L-11,28" stroke="white" strokeWidth="2" fill="none" opacity="0.2" strokeLinecap="round" />
          {/* Specular dot */}
          <circle cx="-12" cy="-30" r="3" fill="white" opacity="0.55" />
          {/* Label band */}
          <rect x="-20" y="-5" width="40" height="18" rx="1" fill="#94a3b8" opacity="0.25" />
          {/* Recycling symbol */}
          <g transform="translate(0,4) scale(0.35)">
            <path d="M0,-18 L16,8 L-16,8 Z" fill="none" stroke={accentColor} strokeWidth="5" strokeLinejoin="round" opacity="0.5" />
            <path d="M0,-18 L16,8 L-16,8 Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" opacity="0.25" />
          </g>
        </g>
      );
    }

    case "organic": {
      // Chunky 3D organic/leaf pile with warm greens and browns
      const shadowX = 4, shadowY = 4;
      const rot1 = -8 + rng(1) * 16;
      const rot2 = 5 + rng(2) * 16;
      return (
        <g transform="translate(60,85)">
          {/* Hard drop-shadow */}
          <ellipse cx="2" cy="5" rx="28" ry="20" fill="#14532d" opacity="0.35" />

          {/* Back leaf (darkest) */}
          <g transform={`translate(-12,8) rotate(${rot1})`}>
            <path
              d="M0,-42 Q22,-22 22,0 Q22,22 0,42 Q-22,22 -22,0 Q-22,-22 0,-42 Z"
              fill="#15803d" opacity="0.85"
            />
            <path d="M0,-42 Q3,0 0,42" stroke="#166534" strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round" />
            <path d="M0,-30 Q10,-20 15,-10" stroke="#166534" strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round" />
            <path d="M0,-30 Q-10,-20 -15,-10" stroke="#166534" strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round" />
          </g>

          {/* Middle leaf */}
          <g transform="translate(0,0)">
            <path
              d="M0,-50 Q30,-25 30,0 Q30,25 0,50 Q-30,25 -30,0 Q-30,-25 0,-50 Z"
              fill="#16a34a" opacity="0.95"
            />
            {/* Central vein */}
            <path d="M0,-50 Q2,0 0,50" stroke="#f0fdf4" strokeWidth="3" fill="none" opacity="0.4" strokeLinecap="round" />
            {/* Side veins */}
            <path d="M0,-38 Q12,-28 18,-18" stroke="#f0fdf4" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
            <path d="M0,-38 Q-12,-28 -18,-18" stroke="#f0fdf4" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
            <path d="M0,-20 Q10,-12 15,-5" stroke="#f0fdf4" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
            <path d="M0,-20 Q-10,-12 -15,-5" stroke="#f0fdf4" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
            <path d="M0,0 Q10,8 14,16" stroke="#f0fdf4" strokeWidth="1.5" fill="none" opacity="0.25" strokeLinecap="round" />
            <path d="M0,0 Q-10,8 -14,16" stroke="#f0fdf4" strokeWidth="1.5" fill="none" opacity="0.25" strokeLinecap="round" />
            {/* Highlight */}
            <path d="M-5,-42 Q-8,-20 -5,10" stroke="white" strokeWidth="4" fill="none" opacity="0.35" strokeLinecap="round" />
          </g>

          {/* Front leaf (brightest) */}
          <g transform={`translate(10,5) rotate(${rot2})`}>
            <path
              d="M0,-38 Q24,-18 24,0 Q24,18 0,38 Q-24,18 -24,0 Q-24,-18 0,-38 Z"
              fill="#22c55e" opacity="0.9"
            />
            <path d="M0,-38 Q2,0 0,38" stroke="#15803d" strokeWidth="2.5" fill="none" opacity="0.5" strokeLinecap="round" />
            {/* Veins */}
            <path d="M0,-28 Q9,-20 14,-10" stroke="#15803d" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
            <path d="M0,-28 Q-9,-20 -14,-10" stroke="#15803d" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
            <path d="M0,-12 Q8,-6 12,0" stroke="#15803d" strokeWidth="1.5" fill="none" opacity="0.35" strokeLinecap="round" />
            <path d="M0,-12 Q-8,-6 -12,0" stroke="#15803d" strokeWidth="1.5" fill="none" opacity="0.35" strokeLinecap="round" />
            {/* Specular */}
            <circle cx="-8" cy="-28" r="3.5" fill="white" opacity="0.5" />
          </g>

          {/* Stem at bottom */}
          <path d="M2,42 Q5,52 2,58" stroke="#15803d" strokeWidth="5" fill="none" opacity="0.7" strokeLinecap="round" />
          {/* Small berry/fruit dots */}
          <circle cx="-18" cy="18" r="4" fill="#dc2626" opacity="0.75" />
          <circle cx="-16" cy="16" r="1.5" fill="white" opacity="0.4" />
          <circle cx="16" cy="12" r="3.5" fill="#dc2626" opacity="0.7" />
          <circle cx="15" cy="10.5" r="1.2" fill="white" opacity="0.4" />

          {/* Recycling symbol */}
          <g transform="translate(0,28) scale(0.3)">
            <path d="M0,-18 L16,8 L-16,8 Z" fill="none" stroke={accentColor} strokeWidth="5" strokeLinejoin="round" opacity="0.5" />
            <path d="M0,-18 L16,8 L-16,8 Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" opacity="0.25" />
          </g>
        </g>
      );
    }

    case "hazard": {
      // Chunky 3D hazard container/bin with warning stripes, biohazard feel
      const shadowX = 4, shadowY = 4;
      return (
        <g transform="translate(60,85)">
          {/* Hard drop-shadow */}
          <path
            d="M-22,-30 L-22,32 Q-22,40 -12,40 L12,40 Q22,40 22,32 L22,-30 Q22,-38 12,-38 L-12,-38 Q-22,-38 -22,-30 Z"
            fill="#450a0a" opacity="0.5"
            transform={`translate(${shadowX},${shadowY})`}
          />
          {/* Bin body — left face (darker) */}
          <path
            d="M-22,-30 L-22,32 Q-22,40 -12,40 L-2,40 L-2,-28 Q-4,-34 0,-38 Q-12,-38 -22,-30 Z"
            fill="#991b1b" opacity="0.95"
          />
          {/* Bin body — right face (lighter) */}
          <path
            d="M-2,40 L12,40 Q22,40 22,32 L22,-30 Q22,-38 12,-38 L-2,-28 L-2,40 Z"
            fill="#dc2626" opacity="0.95"
          />
          {/* Warning stripes — chunky diagonal */}
          {[0,1,2,3,4,5,6].map((i) => (
            <rect key={`stripe-${i}`}
              x={-22 + i * 7}
              y={-25 + i * 2}
              width="4"
              height="55"
              fill="#fbbf24"
              opacity="0.25"
              transform="skewX(-20)"
            />
          ))}
          {/* Lid — chunky 3D */}
          <rect x="-24" y="-44" width="48" height="8" rx="2" fill="#b91c1c" opacity="0.95" />
          <rect x="-22" y="-46" width="44" height="5" rx="2" fill="#dc2626" opacity="0.9" />
          {/* Lid top */}
          <rect x="-22" y="-48" width="44" height="3" rx="1" fill="#fca5a5" opacity="0.5" />
          {/* Warning label */}
          <rect x="-18" y="-2" width="36" height="24" rx="3" fill="#fbbf24" opacity="0.9" />
          {/* Warning label border */}
          <rect x="-18" y="-2" width="36" height="24" rx="3" fill="none" stroke="#92400e" strokeWidth="2" opacity="0.6" />
          {/* Skull/exclamation mark — chunky pixel style */}
          <circle cx="0" cy="6" r="9" fill="#92400e" opacity="0.9" />
          <circle cx="0" cy="6" r="6" fill="#fbbf24" opacity="0.95" />
          <text x="0" y="10" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#92400e" fontFamily="monospace">!</text>
          {/* Ventilation slits */}
          <rect x="-22" y="-18" width="12" height="3" rx="1" fill="#450a0a" opacity="0.5" />
          <rect x="-22" y="-12" width="12" height="3" rx="1" fill="#450a0a" opacity="0.5" />
          <rect x="-22" y="-6" width="12" height="3" rx="1" fill="#450a0a" opacity="0.5" />
          {/* Specular highlight */}
          <path d="M-17,-28 L-18,20" stroke="white" strokeWidth="4" fill="none" opacity="0.25" strokeLinecap="round" />
          <circle cx="-15" cy="-25" r="3" fill="white" opacity="0.35" />
          {/* Recycling / biohazard symbol */}
          <g transform="translate(0,20) scale(0.3)">
            <path d="M0,-18 L16,8 L-16,8 Z" fill="none" stroke="#fbbf24" strokeWidth="5" strokeLinejoin="round" opacity="0.45" />
            <path d="M0,-18 L16,8 L-16,8 Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" opacity="0.2" />
          </g>
        </g>
      );
    }

    default: {
      return (
        <g transform="translate(60,85)">
          <circle cx="4" cy="4" r="28" fill="#1e293b" opacity="0.4" />
          <circle r="28" fill={accentColor} opacity="0.8" />
          <circle r="20" fill="white" opacity="0.1" />
          <circle cx="-5" cy="-8" r="5" fill="white" opacity="0.3" />
        </g>
      );
    }
  }
}

function generateParticles(count: number, accent: string): ReactElement {
  const particles: ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 17 + 42;
    const x = 10 + seededRandom(seed) * 100;
    const y = 10 + seededRandom(seed + 1) * 140;
    const r = 0.8 + seededRandom(seed + 2) * 2.8;
    const dur = 2 + seededRandom(seed + 3) * 2.5;
    const yDrift = -5 - seededRandom(seed + 4) * 15;
    const orbit = seededRandom(seed + 6) > 0.6;
    const orbitAngle = seededRandom(seed + 9) * 360;
    const orbitDur = 3 + seededRandom(seed + 10) * 4;
    particles.push(
      <circle key={i} cx={x} cy={y} r={r} fill={accent} opacity={0.3 + seededRandom(seed + 5) * 0.4}>
        {orbit ? (
          <>
            <animateTransform attributeName="transform" type="rotate"
              from={`${orbitAngle} ${x} ${y}`}
              to={`${orbitAngle + 360} ${x} ${y}`}
              dur={`${orbitDur}s`} repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="translate"
              values={`0,0; 0,${yDrift}; 0,0`}
              dur={`${dur * 1.2}s`} repeatCount="indefinite" additive="sum" />
          </>
        ) : (
          <>
            <animate attributeName="opacity" values={`${0.15 + seededRandom(seed + 6) * 0.3};${0.5 + seededRandom(seed + 7) * 0.3};${0.15 + seededRandom(seed + 8) * 0.3}`} dur={`${dur}s`} repeatCount="indefinite" />
            <animate attributeName="cy" values={`${y};${y + yDrift};${y}`} dur={`${dur * 1.5}s`} repeatCount="indefinite" />
            <animate attributeName="cx" values={`${x - 3};${x + 3};${x - 3}`} dur={`${dur * 2}s`} repeatCount="indefinite" />
          </>
        )}
      </circle>
    );
  }
  return <g>{particles}</g>;
}

function generateRarityHalo(rarityId: string, cardId: number): ReactElement {
  if (rarityId === "legendary") {
    return (
      <g>
        <ellipse cx="60" cy="85" rx="44" ry="55" fill="none" stroke="#f59e0b" strokeWidth="2.5" opacity="0.35">
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
          <animate attributeName="rx" values="44;47;44" dur="2s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="60" cy="85" rx="36" ry="46" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.2">
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2.5s" repeatCount="indefinite" begin="0.5s" />
        </ellipse>
      </g>
    );
  }
  if (rarityId === "epic") {
    return (
      <g>
        <ellipse cx="60" cy="85" rx="42" ry="52" fill="none" stroke="#a855f7" strokeWidth="2" opacity="0.25">
          <animate attributeName="opacity" values="0.15;0.4;0.15" dur="2.5s" repeatCount="indefinite" />
        </ellipse>
      </g>
    );
  }
  return <g />;
}

function generateCornerDecorations(accent: string, rarityId: string): ReactElement {
  const c = rarityId === "legendary" ? "#f59e0b" : rarityId === "epic" ? "#a855f7" : accent;
  const op = rarityId === "legendary" ? 0.7 : rarityId === "epic" ? 0.5 : 0.35;
  return (
    <g opacity={op}>
      {/* Top-left corner bracket */}
      <path d="M8,4 L4,4 L4,8" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M8,5 L5,5 L5,8" stroke="white" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* Top-right corner bracket */}
      <path d="M112,4 L116,4 L116,8" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M112,5 L115,5 L115,8" stroke="white" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* Bottom-left corner bracket */}
      <path d="M8,156 L4,156 L4,152" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M8,155 L5,155 L5,152" stroke="white" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* Bottom-right corner bracket */}
      <path d="M112,156 L116,156 L116,152" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M112,155 L115,155 L115,152" stroke="white" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.5" />
    </g>
  );
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
  const colors = RARITY_COLORS[rarityId] || RARITY_COLORS.common;
  const isLegendary = rarityId === "legendary";
  const isEpic = rarityId === "epic" || isLegendary;
  const particleCount = getParticleCount(rarityId);

  // Element-specific dark bg color
  const elemDarkBg: Record<string, string> = {
    plastic: "#0c4a6e",
    paper: "#78350f",
    glass: "#134e4a",
    metal: "#334155",
    organic: "#14532d",
    hazard: "#450a0a",
  };
  const darkBg = elemDarkBg[elementId] || "#1e293b";

  return (
    <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <defs>
        {/* Dark pixel-art background gradient */}
        <linearGradient id={`bg-${cardId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={darkBg} />
          <stop offset="50%" stopColor={darkBg} />
          <stop offset="100%" stopColor={darkBg} />
        </linearGradient>
        {/* Subtle vignette */}
        <radialGradient id={`vignette-${cardId}`} cx="50%" cy="50%" r="70%">
          <stop offset="60%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.35" />
        </radialGradient>
        {/* Hard shadow filter */}
        <filter id={`shadow-${cardId}`}>
          <feDropShadow dx="3" dy="4" stdDeviation="0" floodColor={darkBg} floodOpacity="0.5" />
        </filter>
        {/* Glow for epic+ */}
        <filter id={`glow-${cardId}`}>
          <feGaussianBlur stdDeviation={isLegendary ? 4 : isEpic ? 3 : 1.5} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Dark card background */}
      <rect x="2" y="2" width="116" height="156" rx="8" ry="8" fill={`url(#bg-${cardId})`} />
      {/* Subtle border */}
      <rect x="2" y="2" width="116" height="156" rx="8" ry="8" fill="none"
        stroke={colors.border} strokeWidth={isLegendary ? 2.5 : isEpic ? 2 : 1.5} opacity={isEpic ? 0.8 : 0.6} />

      {/* Vignette overlay */}
      <rect x="2" y="2" width="116" height="156" rx="8" ry="8" fill={`url(#vignette-${cardId})`} />

      {/* Rarity halo glow (behind art) */}
      {generateRarityHalo(rarityId, cardId)}

      {/* Main Element Art — pixel-art style illustration */}
      <g filter={`url(#glow-${cardId})`}>
        {generateElementArt(elementId, cardId, rng)}
      </g>

      {/* Floating Particles (animated sparks) */}
      {particleCount > 0 && generateParticles(particleCount, colors.glow)}

      {/* Corner Decorations */}
      {generateCornerDecorations(colors.border, rarityId)}

      {/* Top-left element badge — chunky pixel square */}
      <rect x="6" y="6" width="18" height="18" rx="3" fill={accent} opacity="0.9" />
      <rect x="7" y="7" width="16" height="8" rx="2" fill="white" opacity="0.25" />
      <text x="15" y="19" textAnchor="middle" fontSize="9" fontWeight="bold" fill="white" fontFamily="monospace">
        {elementId.charAt(0).toUpperCase()}
      </text>

      {/* Bottom rarity bar — chunky */}
      <rect x="36" y="147" width="48" height="10" rx="3" fill={colors.border} opacity="0.8" />
      <rect x="37" y="148" width="46" height="4" rx="2" fill="white" opacity="0.2" />
      <text x="60" y="155" textAnchor="middle" fontSize="6" fontWeight="bold" fill="white" fontFamily="monospace">
        {rarityId.toUpperCase().slice(0, 4)}
      </text>

      {/* Legendary pulsing border */}
      {isLegendary && (
        <rect x="2" y="2" width="116" height="156" rx="8" fill="none"
          stroke={colors.glow} strokeWidth="2" opacity="0.5">
          <animate attributeName="opacity" values="0.25;0.65;0.25" dur="1.8s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Epic subtle border */}
      {isEpic && !isLegendary && (
        <rect x="2" y="2" width="116" height="156" rx="8" fill="none"
          stroke={colors.glow} strokeWidth="1.5" opacity="0.3">
          <animate attributeName="opacity" values="0.15;0.4;0.15" dur="2.5s" repeatCount="indefinite" />
        </rect>
      )}
    </svg>
  );
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

// ─── Emoji Avatar Generator ────────────────────────────────────────────────
export interface CardAvatarProps {
  cardId: number;
  elementId: string;
  rarityId: string;
  size?: number;
  state?: "idle" | "attacking" | "hurt" | "ko";
}

const AVATAR_EMOJI: Record<string, string> = {
  plastic: "🔵",
  paper: "📄",
  glass: "🥛",
  metal: "🥫",
  organic: "🍃",
  hazard: "☣️",
};

const AVATAR_FACES: Record<string, Record<string, string>> = {
  idle: {
    plastic: "◕‿◕",
    paper: "◕ ‿ ◕",
    glass: "◠‿◠",
    metal: "◉_◉",
    organic: "◕◡◕",
    hazard: "◉_◉",
  },
  attacking: {
    plastic: "◕ω◕",
    paper: "◔‿◔",
    glass: "◔◡◔",
    metal: "◉ω◉",
    organic: "◕ω◕",
    hazard: "◉ω◉",
  },
  hurt: {
    plastic: "◕︿◕",
    paper: "◔︿◔",
    glass: "◔︿◔",
    metal: "◉︿◉",
    organic: "◕︿◕",
    hazard: "◉︿◉",
  },
  ko: {
    plastic: "×_×",
    paper: "×_×",
    glass: "×_×",
    metal: "×_×",
    organic: "×_×",
    hazard: "×_×",
  },
};

const RARITY_GLOW: Record<string, { color: string; shadow: string }> = {
  common:   { color: "#94a3b8", shadow: "0 0 12px #94a3b880" },
  rare:     { color: "#3b82f6", shadow: "0 0 16px #3b82f680, 0 0 32px #3b82f640" },
  epic:     { color: "#a855f7", shadow: "0 0 20px #a855f780, 0 0 40px #a855f740" },
  legendary: { color: "#f59e0b", shadow: "0 0 24px #f59e0b80, 0 0 48px #f59e0b40, 0 0 72px #f59e0b20" },
};

export function getAvatarEmoji(elementId: string): string {
  return AVATAR_EMOJI[elementId] || "⚪";
}

export function getCardAvatarSVG(
  cardId: number,
  elementId: string,
  rarityId: string,
  size = 64,
  state: CardAvatarProps["state"] = "idle",
): ReactElement {
  const emoji = AVATAR_EMOJI[elementId] || "⚪";
  const face = AVATAR_FACES[state]?.[elementId] || AVATAR_FACES.idle[elementId] || "◕‿◕";
  const glow = RARITY_GLOW[rarityId] || RARITY_GLOW.common;
  const accentColor = ELEMENTS.find((e) => e.id === elementId)?.accent || "#94a3b8";
  const isLegendary = rarityId === "legendary";
  const isEpic = rarityId === "epic" || isLegendary;

  const totalSize = size;
  const emojiSize = size * 0.5;
  const faceSize = size * 0.18;
  const innerRadius = size * 0.35;

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: totalSize, height: totalSize }}
    >
      {/* Glow ring */}
      {isEpic && (
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            width: totalSize * 1.1,
            height: totalSize * 1.1,
            background: `radial-gradient(circle, ${glow.color}30, transparent 70%)`,
            boxShadow: glow.shadow,
            animation: isLegendary ? "avatar-pulse 1.5s ease-in-out infinite" : "avatar-pulse 2.5s ease-in-out infinite",
          }}
        />
      )}

      {/* Avatar circle */}
      <div
        className="relative flex flex-col items-center justify-center rounded-full overflow-hidden"
        style={{
          width: innerRadius * 2,
          height: innerRadius * 2,
          background: `radial-gradient(circle at 35% 35%, ${accentColor}40, ${accentColor}15, transparent)`,
          border: `3px solid ${glow.color}`,
          boxShadow: glow.shadow,
        }}
      >
        {/* Top element icon */}
        <div
          className="absolute top-0 text-center"
          style={{ fontSize: faceSize * 0.8 }}
        >
          {emoji}
        </div>

        {/* Main emoji */}
        <div style={{ fontSize: emojiSize }} className="leading-none">
          {state === "ko" ? "💀" : emoji}
        </div>

        {/* Face */}
        <div
          className="absolute bottom-1 text-center font-bold"
          style={{
            fontSize: faceSize,
            color: glow.color,
            fontFamily: "monospace",
            letterSpacing: "-1px",
            textShadow: `0 0 4px ${glow.color}`,
          }}
        >
          {face}
        </div>
      </div>
    </div>
  );
}

// ─── Card Frame SVG (for collection display) ────────────────────────────────
export function getCardFrameSVG(
  cardId: number,
  elementId: string,
  rarityId: string,
): ReactElement {
  const emoji = AVATAR_EMOJI[elementId] || "⚪";
  const glow = RARITY_GLOW[rarityId] || RARITY_GLOW.common;
  const accentColor = ELEMENTS.find((e) => e.id === elementId)?.accent || "#94a3b8";
  const isLegendary = rarityId === "legendary";
  const isEpic = rarityId === "epic" || isLegendary;
  const isRare = rarityId === "rare";

  const width = 120;
  const height = 160;

  return (
    <div
      className="relative"
      style={{ width, height }}
    >
      {/* Outer glow for epic/legendary */}
      {isEpic && (
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(ellipse at center, ${glow.color}40 0%, transparent 70%)`,
            filter: "blur(8px)",
            animation: isLegendary ? "shimmer 2s linear infinite" : "none",
          }}
        />
      )}

      {/* Card body */}
      <div
        className="relative flex flex-col items-center justify-between p-2 rounded-2xl border-2 overflow-hidden"
        style={{
          width,
          height,
          background: `linear-gradient(145deg, ${accentColor}15, ${accentColor}05, #0a0a1480)`,
          borderColor: glow.color,
          boxShadow: `0 0 16px ${glow.color}40, inset 0 0 20px ${accentColor}10`,
        }}
      >
        {/* Top badge */}
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 20,
            height: 20,
            background: accentColor,
            fontSize: 10,
          }}
        >
          {emoji}
        </div>

        {/* Center avatar */}
        <div className="flex-1 flex items-center justify-center">
          <div style={{ fontSize: 36, filter: isEpic ? `drop-shadow(0 0 8px ${glow.color})` : "none" }}>
            {emoji}
          </div>
        </div>

        {/* Bottom rarity bar */}
        <div
          className="w-full rounded-full"
          style={{
            height: 4,
            background: `linear-gradient(90deg, ${glow.color}00, ${glow.color}, ${glow.color}00)`,
            boxShadow: isRare ? `0 0 6px ${glow.color}` : "none",
          }}
        />

        {/* Legendary sparkle */}
        {isLegendary && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)",
              animation: "shimmer 3s linear infinite",
            }}
          />
        )}
      </div>
    </div>
  );
}
