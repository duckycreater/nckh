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

export interface CampaignStarReward {
  xp: number;
  gold: number;
}

export interface CampaignStageDefinition {
  id: string;
  nameKey: string;
  type: "trash" | "miniboss" | "elite" | "boss";
  staminaCost: number;
  stars: readonly CampaignStarReward[];
  trashCardIds: readonly number[];
  bossCardId: number | null;
  hpMult: number;
  atkMult: number;
  guaranteedDrop: number | null;
  possibleDrops: readonly number[];
}

export interface CampaignRegionDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  elementId: CardElementId | "mixed";
  icon: string;
  gradient: string;
  accentColor: string;
  requiredPlayerLevel: number;
  requiredPreviousRegion: string | null;
  stages: readonly CampaignStageDefinition[];
}

const REGION_BLUEPRINTS: ReadonlyArray<
  Omit<CampaignRegionDefinition, "stages" | "requiredPreviousRegion"> & {
    pool: readonly number[];
  }
> = [
  {
    id: "region_01",
    nameKey: "campaign.region_01.name",
    descriptionKey: "campaign.region_01.desc",
    elementId: "plastic",
    icon: "◉",
    gradient: "from-cyan-950 via-slate-950 to-blue-950",
    accentColor: "#22d3ee",
    requiredPlayerLevel: 1,
    pool: FLAGSHIP_CARD_IDS_BY_ELEMENT.plastic,
  },
  {
    id: "region_02",
    nameKey: "campaign.region_02.name",
    descriptionKey: "campaign.region_02.desc",
    elementId: "paper",
    icon: "▱",
    gradient: "from-stone-900 via-amber-950 to-slate-950",
    accentColor: "#d6b477",
    requiredPlayerLevel: 4,
    pool: FLAGSHIP_CARD_IDS_BY_ELEMENT.paper,
  },
  {
    id: "region_03",
    nameKey: "campaign.region_03.name",
    descriptionKey: "campaign.region_03.desc",
    elementId: "glass",
    icon: "◇",
    gradient: "from-teal-950 via-slate-950 to-emerald-950",
    accentColor: "#5eead4",
    requiredPlayerLevel: 7,
    pool: FLAGSHIP_CARD_IDS_BY_ELEMENT.glass,
  },
  {
    id: "region_04",
    nameKey: "campaign.region_04.name",
    descriptionKey: "campaign.region_04.desc",
    elementId: "metal",
    icon: "⬢",
    gradient: "from-zinc-950 via-slate-950 to-neutral-950",
    accentColor: "#cbd5e1",
    requiredPlayerLevel: 10,
    pool: FLAGSHIP_CARD_IDS_BY_ELEMENT.metal,
  },
  {
    id: "region_05",
    nameKey: "campaign.region_05.name",
    descriptionKey: "campaign.region_05.desc",
    elementId: "organic",
    icon: "⌁",
    gradient: "from-lime-950 via-emerald-950 to-stone-950",
    accentColor: "#86efac",
    requiredPlayerLevel: 13,
    pool: FLAGSHIP_CARD_IDS_BY_ELEMENT.organic,
  },
  {
    id: "region_06",
    nameKey: "campaign.region_06.name",
    descriptionKey: "campaign.region_06.desc",
    elementId: "hazard",
    icon: "△",
    gradient: "from-rose-950 via-red-950 to-neutral-950",
    accentColor: "#fb7185",
    requiredPlayerLevel: 16,
    pool: FLAGSHIP_CARD_IDS_BY_ELEMENT.hazard,
  },
  {
    id: "region_07",
    nameKey: "campaign.region_07.name",
    descriptionKey: "campaign.region_07.desc",
    elementId: "energy",
    icon: "ϟ",
    gradient: "from-amber-950 via-orange-950 to-slate-950",
    accentColor: "#fbbf24",
    requiredPlayerLevel: 19,
    pool: FLAGSHIP_CARD_IDS_BY_ELEMENT.energy,
  },
  {
    id: "region_08",
    nameKey: "campaign.region_08.name",
    descriptionKey: "campaign.region_08.desc",
    elementId: "water",
    icon: "≋",
    gradient: "from-blue-950 via-cyan-950 to-slate-950",
    accentColor: "#60a5fa",
    requiredPlayerLevel: 22,
    pool: FLAGSHIP_CARD_IDS_BY_ELEMENT.water,
  },
  {
    id: "region_09",
    nameKey: "campaign.region_09.name",
    descriptionKey: "campaign.region_09.desc",
    elementId: "tech",
    icon: "⌘",
    gradient: "from-violet-950 via-fuchsia-950 to-slate-950",
    accentColor: "#c084fc",
    requiredPlayerLevel: 25,
    pool: FLAGSHIP_CARD_IDS_BY_ELEMENT.tech,
  },
  {
    id: "region_10",
    nameKey: "campaign.region_10.name",
    descriptionKey: "campaign.region_10.desc",
    elementId: "mixed",
    icon: "◎",
    gradient: "from-emerald-950 via-slate-950 to-amber-950",
    accentColor: "#f8fafc",
    requiredPlayerLevel: 30,
    pool: FLAGSHIP_CARD_IDS,
  },
];

function pickStageCards(
  pool: readonly number[],
  regionIndex: number,
  stageIndex: number,
): number[] {
  const result: number[] = [];
  for (let offset = 0; offset < 5; offset += 1) {
    const index = (regionIndex * 7 + stageIndex * 3 + offset * 2) % pool.length;
    result.push(pool[index]);
  }
  return [...new Set(result)];
}

function buildStages(regionIndex: number, pool: readonly number[]): CampaignStageDefinition[] {
  return Array.from({ length: 10 }, (_, index) => {
    const stageNumber = index + 1;
    const type =
      stageNumber === 10
        ? "boss"
        : stageNumber === 9
          ? "elite"
          : stageNumber === 5
            ? "miniboss"
            : "trash";
    const difficulty = regionIndex * 10 + stageNumber;
    const encounters = pickStageCards(pool, regionIndex, index);
    const bossCardId =
      type === "trash" ? null : pool[(pool.length - (10 - stageNumber)) % pool.length];
    const drop =
      type === "boss" ? pool[pool.length - 1] : type === "elite" ? pool[pool.length - 2] : null;
    return {
      id: `s${String(regionIndex + 1).padStart(2, "0")}_${String(stageNumber).padStart(2, "0")}`,
      nameKey: `campaign.s${String(regionIndex + 1).padStart(2, "0")}_${String(stageNumber).padStart(2, "0")}.name`,
      type,
      staminaCost: 4 + regionIndex * 2 + Math.ceil(stageNumber / 3) + (type === "boss" ? 4 : 0),
      stars: [
        { xp: 10 + difficulty * 3, gold: 8 + difficulty * 2 },
        { xp: 16 + difficulty * 4, gold: 12 + difficulty * 3 },
        { xp: 24 + difficulty * 5, gold: 18 + difficulty * 4 },
      ],
      trashCardIds: encounters,
      bossCardId,
      hpMult: Number((1 + difficulty * 0.025).toFixed(2)),
      atkMult: Number((1 + difficulty * 0.02).toFixed(2)),
      guaranteedDrop: drop,
      possibleDrops: pool.slice(
        Math.max(0, (stageNumber - 1) % pool.length),
        Math.min(pool.length, 4 + stageNumber),
      ),
    };
  });
}

export const CAMPAIGN_REGIONS: readonly CampaignRegionDefinition[] = Object.freeze(
  REGION_BLUEPRINTS.map(({ pool, ...region }, index) => ({
    ...region,
    requiredPreviousRegion: index === 0 ? null : REGION_BLUEPRINTS[index - 1].id,
    stages: buildStages(index, pool),
  })),
);

export const CAMPAIGN_STAGE_IDS = Object.freeze(
  CAMPAIGN_REGIONS.flatMap((region) => region.stages.map((stage) => stage.id)),
);

export const CAMPAIGN_STAGE_ID_SET = new Set<string>(CAMPAIGN_STAGE_IDS);

export function getCampaignRegion(regionId: string): CampaignRegionDefinition | undefined {
  return CAMPAIGN_REGIONS.find((region) => region.id === regionId);
}

export function getCampaignStage(stageId: string): CampaignStageDefinition | undefined {
  for (const region of CAMPAIGN_REGIONS) {
    const stage = region.stages.find((candidate) => candidate.id === stageId);
    if (stage) return stage;
  }
  return undefined;
}

export function getCampaignRegionForStage(stageId: string): CampaignRegionDefinition | undefined {
  return CAMPAIGN_REGIONS.find((region) => region.stages.some((stage) => stage.id === stageId));
}
