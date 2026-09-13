import {
  CARD_ELEMENT_IDENTITIES,
  type CardCombatRole,
  type CardElementId,
} from "../../shared/cardGame";
import { FLAGSHIP_CARDS, type Card } from "./cards";

export type HeroEffectType =
  | "damage"
  | "heal"
  | "shield"
  | "poison"
  | "burn"
  | "buff_def"
  | "buff_atk"
  | "speed_down"
  | "stun"
  | "drain"
  | "regen";

export interface HeroAbilityProfile {
  name: string;
  description: string;
  effect: HeroEffectType;
  value: number;
  duration?: number;
  energyCost: number;
  cooldown: number;
}

export interface CardHeroProfile {
  cardId: number;
  callsign: string;
  serial: string;
  role: CardCombatRole;
  roleVi: string;
  mechanicName: string;
  combatIdentity: string;
  lore: string;
  recyclingIntel: string;
  passive: HeroAbilityProfile;
  skillOne: HeroAbilityProfile;
  skillTwo: HeroAbilityProfile;
  ultimate: HeroAbilityProfile;
}

const CALLSIGNS_BY_ELEMENT: Readonly<Record<CardElementId, readonly string[]>> = {
  plastic: [
    "PET Vanguard",
    "Film Warden",
    "Straw Lancer",
    "Cap Rotor",
    "Mealbox Bastion",
    "Resin Hauler",
    "Pellet Hound",
    "Polymer Diver",
    "Bottle Tidebreaker",
    "Micro Sentinel",
  ],
  paper: [
    "Newsprint Oracle",
    "Carton Bulwark",
    "Ledger Runner",
    "Flyer Skirmisher",
    "Envelope Relay",
    "Pulp Foreman",
    "Archive Keeper",
    "Pressline Scout",
    "Fiber Marshal",
    "Board Lamplighter",
    "Ink Surveyor",
  ],
  glass: [
    "Bottle Prism",
    "Shard Guard",
    "Kiln Herald",
    "Lens Ranger",
    "Soda Refractor",
    "Cullet Mason",
    "Furnace Seer",
    "Crystal Loader",
    "Silica Watch",
    "Amber Vessel",
    "Mirror Breaker",
    "Spectrum Warden",
  ],
  metal: [
    "Can Foundry",
    "Crown Riveter",
    "Tin Bastion",
    "Coin Striker",
    "Casing Warden",
    "Scrap Hauler",
    "Induction Ram",
    "Alloy Keeper",
    "Magnet Marshal",
    "Pressline Giant",
    "Copper Lancer",
    "Steel Anchor",
  ],
  organic: [
    "Citrus Reclaimer",
    "Branch Grafter",
    "Timber Host",
    "Bark Warden",
    "Orchard Carrier",
    "Compost Shepherd",
    "Mycelium Medic",
    "Seed Vault",
    "Kelp Harvester",
    "Humus Colossus",
    "Regrowth Keeper",
  ],
  hazard: [
    "Cell Containment",
    "Pesticide Seal",
    "Solvent Marshal",
    "Acid Vault",
    "Alkali Guard",
    "Mercury Quarantine",
    "Lead Coffin",
    "Filter Warden",
    "Redline Medic",
    "Toxin Breaker",
  ],
  energy: [
    "Grid Igniter",
    "Rotor Spark",
    "Busbar Runner",
    "Dynamo Guard",
    "Capacitor Lance",
    "Breaker Crown",
    "Amber Reactor",
    "Charge Shepherd",
    "Turbine Hound",
    "Arc Foreman",
    "Heat Sink",
    "Voltage Marshal",
  ],
  water: [
    "Tide Regulator",
    "Pressure Warden",
    "Filter Diver",
    "Cavitation Ram",
    "Reservoir Medic",
    "Blue Valve",
    "Current Keeper",
    "Mist Ranger",
    "Hydraulic Crown",
    "Floodgate",
    "Osmosis Scout",
    "Aqua Bastion",
  ],
  tech: [
    "Circuit Reclaimer",
    "Sensor Marshal",
    "Drone Smith",
    "Motherboard Seer",
    "Module Hound",
    "Signal Warden",
    "Servo Keeper",
    "Data Salvager",
    "Relay Architect",
    "Network Crown",
  ],
};

const ROLE_LABEL: Record<CardCombatRole, string> = {
  vanguard: "Tiên phong",
  striker: "Đột kích",
  controller: "Khống chế",
  support: "Hỗ trợ",
  specialist: "Chuyên gia",
};

const RECYCLING_INTEL: Record<CardElementId, string> = {
  plastic:
    "Làm sạch, để khô và tách nắp/nhãn theo hướng dẫn địa phương. Nhựa bẩn hoặc lẫn vật liệu làm giảm chất lượng hạt tái sinh.",
  paper:
    "Giữ giấy khô, phẳng và không dính dầu mỡ. Giấy ướt hoặc phủ nhiều lớp nhựa thường cần tuyến xử lý riêng.",
  glass:
    "Tháo nắp, súc sạch và không trộn gốm/sứ vào dòng thủy tinh. Mảnh vỡ phải được bọc an toàn trước khi thu gom.",
  metal:
    "Súc sạch lon/hộp, ép gọn khi an toàn và tách khỏi rác hữu cơ. Bình áp suất cần điểm thu hồi chuyên dụng.",
  organic:
    "Tách khỏi nhựa, kính và kim loại để ủ phân hoặc xử lý sinh học. Tạp chất nhỏ cũng có thể làm hỏng cả mẻ compost.",
  hazard:
    "Không đổ vào cống hay thùng rác thường. Giữ nguyên bao bì, tránh rò rỉ và chuyển tới điểm thu gom chất thải nguy hại.",
  energy:
    "Pin và bộ tích điện cần cách điện đầu cực, giữ khô và giao cho đơn vị có quy trình chống cháy lan.",
  water:
    "Ưu tiên tái sử dụng và lọc đúng mục đích; nước nhiễm dầu, hóa chất hoặc kim loại nặng phải xử lý riêng.",
  tech: "Xóa dữ liệu, tháo pin nếu an toàn và chuyển thiết bị tới điểm thu hồi e-waste để tái lấy kim loại quý và linh kiện.",
};

const ROLE_KIT: Record<CardCombatRole, { effect: HeroEffectType; name: string }> = {
  vanguard: { effect: "shield", name: "Khóa khung chịu lực" },
  striker: { effect: "damage", name: "Xung kích cắt dòng" },
  controller: { effect: "speed_down", name: "Neo trường tác chiến" },
  support: { effect: "regen", name: "Chu trình phục hồi" },
  specialist: { effect: "stun", name: "Giao thức gián đoạn" },
};

const ELEMENT_KIT: Record<
  CardElementId,
  { effect: HeroEffectType; skill: string; ultimate: string; ultimateEffect: HeroEffectType }
> = {
  plastic: {
    effect: "buff_def",
    skill: "Bộ nhớ polymer",
    ultimate: "Tái cấu trúc toàn phần",
    ultimateEffect: "shield",
  },
  paper: {
    effect: "buff_atk",
    skill: "Nhịp ép cellulose",
    ultimate: "Mệnh lệnh dây chuyền",
    ultimateEffect: "speed_down",
  },
  glass: {
    effect: "stun",
    skill: "Góc khúc xạ",
    ultimate: "Lăng kính phản công",
    ultimateEffect: "damage",
  },
  metal: {
    effect: "shield",
    skill: "Tôi luyện cảm ứng",
    ultimate: "Ép thủy lực cực hạn",
    ultimateEffect: "damage",
  },
  organic: {
    effect: "heal",
    skill: "Mầm cộng sinh",
    ultimate: "Vành đai tái sinh",
    ultimateEffect: "regen",
  },
  hazard: {
    effect: "poison",
    skill: "Niêm kín buồng đỏ",
    ultimate: "Phong tỏa cấp đen",
    ultimateEffect: "burn",
  },
  energy: {
    effect: "burn",
    skill: "Mồi hồ quang",
    ultimate: "Xả quá tải",
    ultimateEffect: "damage",
  },
  water: {
    effect: "heal",
    skill: "Van cân bằng",
    ultimate: "Triều áp suất",
    ultimateEffect: "speed_down",
  },
  tech: {
    effect: "buff_atk",
    skill: "Liên kết module",
    ultimate: "Mạng lưới đồng bộ",
    ultimateEffect: "stun",
  },
};

function resolveRole(card: Card): CardCombatRole {
  const weighted = {
    vanguard: card.hp + card.def * 2,
    striker: card.atk * 2 + card.crt,
    controller: card.int * 2 + card.spd,
    support: card.hp + card.int * 1.6,
    specialist: card.spd * 1.5 + card.crt + card.int,
  } satisfies Record<CardCombatRole, number>;
  return (Object.entries(weighted) as Array<[CardCombatRole, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0][0];
}

function getCallsign(card: Card): string {
  const elementId = card.element.id as CardElementId;
  const cardsInElement = FLAGSHIP_CARDS.filter((candidate) => candidate.element.id === elementId);
  const index = Math.max(
    0,
    cardsInElement.findIndex((candidate) => candidate.id === card.id),
  );
  return CALLSIGNS_BY_ELEMENT[elementId][index] || `${elementId.toUpperCase()} Unit ${card.id}`;
}

function effectDescription(effect: HeroEffectType, value: number, duration: number): string {
  const descriptions: Record<HeroEffectType, string> = {
    damage: `gây ${value}% ATK lên mục tiêu`,
    heal: `hồi ${value}% HP cho đơn vị đang hoạt động`,
    shield: `tạo khiên bằng ${value}% chỉ số phòng thủ trong ${duration} lượt`,
    poison: `gắn ${Math.max(1, Math.round(value / 10))} tầng nhiễm độc trong ${duration} lượt`,
    burn: `gắn ${Math.max(1, Math.round(value / 12))} tầng quá nhiệt trong ${duration} lượt`,
    buff_def: `tăng ${value}% phòng thủ trong ${duration} lượt`,
    buff_atk: `tăng ${value}% tấn công trong ${duration} lượt`,
    speed_down: `giảm ${value}% tốc độ của mục tiêu trong ${duration} lượt`,
    stun: `làm gián đoạn mục tiêu ${Math.max(1, Math.round(duration / 2))} lượt`,
    drain: `gây ${value}% ATK và chuyển một phần thành HP`,
    regen: `hồi ${value}% HP mỗi lượt trong ${duration} lượt`,
  };
  return descriptions[effect];
}

export function getCardHeroProfile(card: Card): CardHeroProfile {
  const elementId = card.element.id as CardElementId;
  const identity = CARD_ELEMENT_IDENTITIES[elementId];
  const callsign = getCallsign(card);
  const role = resolveRole(card);
  const roleKit = ROLE_KIT[role];
  const elementKit = ELEMENT_KIT[elementId];
  const variant = card.id % 7;
  const roleValue = 26 + variant * 3;
  const elementValue = 22 + ((card.id * 3) % 19);
  const ultimateValue = 145 + (card.id % 6) * 15;
  const duration = 2 + (card.id % 2);

  return {
    cardId: card.id,
    callsign,
    serial: `BMO-${elementId.slice(0, 3).toUpperCase()}-${String(card.id).padStart(3, "0")}`,
    role,
    roleVi: ROLE_LABEL[role],
    mechanicName: identity.mechanicVi,
    combatIdentity: identity.combatFantasyVi,
    lore: `${callsign} được đóng quanh lõi vật liệu của “${card.name}”. Đơn vị này không giả lập rác thành quái vật; nó mô phỏng đúng cách vật liệu phản ứng trong dây chuyền thu hồi để biến kiến thức phân loại thành lợi thế chiến thuật.`,
    recyclingIntel: RECYCLING_INTEL[elementId],
    passive: {
      name: `${callsign} · ${identity.mechanicVi}`,
      description: `Sau mỗi lần kích hoạt kỹ năng, lõi ${identity.nameVi.toLowerCase()} tích một nhịp ${identity.mechanicVi.toLowerCase()}, thay đổi cách đơn vị phối hợp với đội hình.`,
      effect: elementKit.effect,
      value: 8 + variant,
      duration,
      energyCost: 0,
      cooldown: 0,
    },
    skillOne: {
      name: `${callsign} · ${roleKit.name}`,
      description: `${ROLE_LABEL[role]} triển khai module riêng: ${effectDescription(roleKit.effect, roleValue, duration)}.`,
      effect: roleKit.effect,
      value: roleValue,
      duration,
      energyCost: 24 + (card.id % 3) * 3,
      cooldown: 2,
    },
    skillTwo: {
      name: `${callsign} · ${elementKit.skill}`,
      description: `Khai thác đặc tính ${identity.nameVi.toLowerCase()}: ${effectDescription(elementKit.effect, elementValue, duration)}.`,
      effect: elementKit.effect,
      value: elementValue,
      duration,
      energyCost: 30 + (card.id % 4) * 2,
      cooldown: 3,
    },
    ultimate: {
      name: elementKit.ultimate,
      description: `Kích hoạt lõi ${callsign} ở công suất tác chiến, ${effectDescription(elementKit.ultimateEffect, ultimateValue, 3)}.`,
      effect: elementKit.ultimateEffect,
      value: ultimateValue,
      duration: 3,
      energyCost: 100,
      cooldown: 0,
    },
  };
}

export const FLAGSHIP_HERO_PROFILES = Object.freeze(FLAGSHIP_CARDS.map(getCardHeroProfile));
