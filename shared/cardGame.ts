export type CardElementId =
  "plastic" | "paper" | "glass" | "metal" | "organic" | "hazard" | "energy" | "water" | "tech";

export type CardCombatRole = "vanguard" | "striker" | "controller" | "support" | "specialist";

export interface CardElementIdentity {
  id: CardElementId;
  nameVi: string;
  nameEn: string;
  icon: string;
  accent: string;
  accentSoft: string;
  mechanic: string;
  mechanicVi: string;
  mechanicEn: string;
  combatFantasyVi: string;
  artDirection: string;
}

/**
 * Each material family has a gameplay rule and a visual language. New cards
 * must extend these identities instead of merely swapping a hue or icon.
 */
export const CARD_ELEMENT_IDENTITIES: Readonly<Record<CardElementId, CardElementIdentity>> = {
  plastic: {
    id: "plastic",
    nameVi: "Nhựa",
    nameEn: "Plastic",
    icon: "◉",
    accent: "#22d3ee",
    accentSoft: "#164e63",
    mechanic: "adapt",
    mechanicVi: "Tái cấu trúc",
    mechanicEn: "Reconfigure",
    combatFantasyVi: "Tạo giáp polymer, hấp thụ đòn đánh rồi đổi vai trò giữa trận.",
    artDirection: "cloudy PET composite, molded ribs, bottle-cap rotary housings, cyan refraction",
  },
  paper: {
    id: "paper",
    nameVi: "Giấy",
    nameEn: "Paper",
    icon: "▱",
    accent: "#d6b477",
    accentSoft: "#4a3728",
    mechanic: "tempo",
    mechanicVi: "Nhịp in",
    mechanicEn: "Print tempo",
    combatFantasyVi: "Tích nhịp bằng kỹ năng rẻ, gấp lớp để tăng tốc và điều khiển lượt.",
    artDirection: "layered cellulose armor, folded load ribs, ink rollers, warm pulp and charcoal",
  },
  glass: {
    id: "glass",
    nameVi: "Thủy tinh",
    nameEn: "Glass",
    icon: "◇",
    accent: "#5eead4",
    accentSoft: "#134e4a",
    mechanic: "refraction",
    mechanicVi: "Khúc xạ",
    mechanicEn: "Refraction",
    combatFantasyVi: "Bẻ hướng sát thương, soi điểm yếu và dồn chí mạng có tính toán.",
    artDirection:
      "laminated recycled glass, optical prisms, fracture lines, restrained teal caustics",
  },
  metal: {
    id: "metal",
    nameVi: "Kim loại",
    nameEn: "Metal",
    icon: "⬢",
    accent: "#cbd5e1",
    accentSoft: "#334155",
    mechanic: "fortify",
    mechanicVi: "Tôi luyện",
    mechanicEn: "Temper",
    combatFantasyVi: "Chịu đòn để tích nhiệt, phản kích bằng lực nén và từ trường.",
    artDirection:
      "reclaimed plate steel, rivets, induction coils, hydraulic mass, gunmetal and rust",
  },
  organic: {
    id: "organic",
    nameVi: "Hữu cơ",
    nameEn: "Organic",
    icon: "⌁",
    accent: "#86efac",
    accentSoft: "#14532d",
    mechanic: "regrowth",
    mechanicVi: "Tái sinh",
    mechanicEn: "Regrowth",
    combatFantasyVi: "Nuôi mầm qua từng lượt, hồi phục và lan hiệu ứng hỗ trợ toàn đội.",
    artDirection:
      "lignin frame, peel or husk plates, mycelium tendons, compost heat, muted bioglow",
  },
  hazard: {
    id: "hazard",
    nameVi: "Nguy hại",
    nameEn: "Hazard",
    icon: "△",
    accent: "#fb7185",
    accentSoft: "#4c0519",
    mechanic: "containment",
    mechanicVi: "Phong tỏa",
    mechanicEn: "Containment",
    combatFantasyVi:
      "Khóa mục tiêu trong buồng chứa, tích độc và buộc đối thủ trả giá khi hành động.",
    artDirection:
      "sealed containment pods, ceramic shielding, warning geometry, restrained red vapor",
  },
  energy: {
    id: "energy",
    nameVi: "Năng lượng",
    nameEn: "Energy",
    icon: "ϟ",
    accent: "#fbbf24",
    accentSoft: "#78350f",
    mechanic: "overcharge",
    mechanicVi: "Quá tải",
    mechanicEn: "Overcharge",
    combatFantasyVi: "Nạp điện nhanh, đánh bùng nổ rồi phải quản lý pha hạ nhiệt.",
    artDirection: "turbines, busbars, insulated coils, amber arcs, heat vents and ceramic breakers",
  },
  water: {
    id: "water",
    nameVi: "Nước",
    nameEn: "Water",
    icon: "≋",
    accent: "#60a5fa",
    accentSoft: "#172554",
    mechanic: "pressure",
    mechanicVi: "Áp lực",
    mechanicEn: "Pressure",
    combatFantasyVi: "Điều tiết áp suất để vừa hồi phục vừa đẩy lùi và làm chậm đội hình địch.",
    artDirection: "pressure vessels, cavitation chambers, wet steel, deep blue hydraulics and mist",
  },
  tech: {
    id: "tech",
    nameVi: "Công nghệ",
    nameEn: "Technology",
    icon: "⌘",
    accent: "#c084fc",
    accentSoft: "#3b0764",
    mechanic: "network",
    mechanicVi: "Mạng lưới",
    mechanicEn: "Network",
    combatFantasyVi: "Liên kết module và drone để sao chép, rút hồi chiêu và phối hợp combo.",
    artDirection:
      "modular e-waste chassis, sensor arrays, repair drones, violet signal light, matte black",
  },
};

export const FLAGSHIP_CARD_IDS_BY_ELEMENT: Readonly<Record<CardElementId, readonly number[]>> = {
  plastic: [1, 2, 3, 4, 5, 181, 182, 183, 271, 272],
  paper: [31, 32, 33, 34, 35, 196, 197, 198, 286, 287, 295],
  glass: [61, 62, 63, 64, 65, 211, 212, 213, 282, 283, 296, 299],
  metal: [91, 92, 93, 94, 95, 226, 227, 228, 284, 285, 298, 300],
  organic: [121, 122, 123, 124, 125, 241, 242, 243, 276, 277, 297],
  hazard: [151, 152, 153, 154, 155, 256, 257, 258, 279, 280],
  energy: [301, 302, 303, 304, 305, 331, 332, 333, 361, 362, 391, 392],
  water: [311, 312, 313, 314, 315, 341, 342, 343, 365, 366, 393, 394],
  tech: [321, 322, 323, 324, 325, 336, 337, 338, 363, 364],
};

export const FLAGSHIP_CARD_IDS = Object.freeze(
  (Object.keys(FLAGSHIP_CARD_IDS_BY_ELEMENT) as CardElementId[]).flatMap(
    (elementId) => FLAGSHIP_CARD_IDS_BY_ELEMENT[elementId],
  ),
);

export const FLAGSHIP_CARD_ID_SET = new Set<number>(FLAGSHIP_CARD_IDS);
export const CARD_ROSTER_SIZE = FLAGSHIP_CARD_IDS.length;
