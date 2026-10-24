export const MATERIAL_CARD_RULESET_VERSION = "material-cards-v1";
export const MATERIAL_KNOWLEDGE_VERSION = "vn-waste-basics-v1";
export const MATERIAL_CARD_CREATE_COST = 50;

export type WasteCategory = "plastic" | "paper" | "glass" | "metal" | "organic" | "hazard";
export type ScanVerdict = "single_waste" | "not_waste" | "multiple_objects" | "uncertain";
export type MaterialPropertySource = "visual_observation" | "material_library" | "unknown";
export type MaterialPropertyId =
  | "recyclable"
  | "compactable"
  | "moisture_sensitive"
  | "brittle"
  | "recoverable_material"
  | "compostable"
  | "separate_collection"
  | "dirty"
  | "wet"
  | "broken"
  | "transparent"
  | "material_code_visible";

export interface MaterialProperty {
  id: MaterialPropertyId;
  label: string;
  value: boolean | null;
  source: MaterialPropertySource;
  evidence: string;
}

export interface MaterialAbility {
  name: string;
  description: string;
  rule: string;
  basedOn: MaterialPropertyId[];
}

export interface CardPreview {
  scanId: string;
  objectName: string;
  category: WasteCategory;
  imageUrl: string | null;
  cost: number;
  passive: MaterialAbility;
  active: MaterialAbility;
  propertyIds: MaterialPropertyId[];
  rulesetVersion: string;
}

export interface ScanAnalysis {
  scanId: string;
  verdict: ScanVerdict;
  objectName: string;
  category: WasteCategory | null;
  description: string;
  disposalInstructions: string;
  observedConditions: MaterialPropertyId[];
  properties: MaterialProperty[];
  uncertaintyReason: string | null;
  eligibleForCard: boolean;
  knowledgeBaseVersion: string;
}

export interface MaterialCard {
  id: string;
  ownerId: string;
  scanId: string;
  objectName: string;
  category: WasteCategory;
  imageUrl: string | null;
  properties: MaterialProperty[];
  passive: MaterialAbility;
  active: MaterialAbility;
  rulesetVersion: string;
  createdAt: number;
}

export type SortingAction = "recycle" | "compost" | "special_collection" | "residual";

export interface MaterialScenarioObject {
  id: string;
  label: string;
  category: WasteCategory;
  condition?: "clean" | "dirty" | "wet" | "broken";
}

export interface MaterialMatchRound {
  index: number;
  objects: MaterialScenarioObject[];
  actionBudget: 3;
}

export interface MatchSubmission {
  roundIndex: number;
  choices: Array<{ objectId: string; action: SortingAction }>;
  abilityCardId?: string;
}

export interface MatchDeckCard {
  id: string;
  category: WasteCategory;
  abilityName: string;
  sample: boolean;
}

export interface MatchState {
  id: string;
  playerId: string;
  opponentId: string | "practice-bot";
  mode: "practice" | "asynchronous";
  status: "active" | "waiting" | "completed" | "expired";
  playerDeck: MatchDeckCard[];
  opponentDeck: MatchDeckCard[];
  rounds: MaterialMatchRound[];
  playerSubmissions: MatchSubmission[];
  opponentSubmissions: MatchSubmission[];
  playerScore: number;
  opponentScore: number;
  result: "win" | "loss" | "draw" | null;
  ratingDelta: number;
  createdAt: number;
  expiresAt: number;
}

export interface ObservedMaterialInput {
  category: WasteCategory;
  observedConditions: MaterialPropertyId[];
}

const LABELS: Record<MaterialPropertyId, string> = {
  recyclable: "Có tuyến tái chế phù hợp",
  compactable: "Có thể ép gọn",
  moisture_sensitive: "Nhạy với độ ẩm",
  brittle: "Dễ vỡ",
  recoverable_material: "Có thể thu hồi vật liệu",
  compostable: "Phù hợp ủ hữu cơ",
  separate_collection: "Cần thu gom riêng",
  dirty: "Có dấu hiệu bẩn",
  wet: "Có dấu hiệu ướt",
  broken: "Có dấu hiệu vỡ",
  transparent: "Có phần trong suốt",
  material_code_visible: "Nhìn thấy ký hiệu vật liệu",
};

const LIBRARY_PROPERTIES: Record<WasteCategory, MaterialPropertyId[]> = {
  plastic: ["recyclable", "compactable"],
  paper: ["recyclable", "compactable", "moisture_sensitive"],
  glass: ["recyclable", "brittle"],
  metal: ["recyclable", "compactable", "recoverable_material"],
  organic: ["compostable"],
  hazard: ["separate_collection"],
};

export function deriveMaterialProperties(input: ObservedMaterialInput): MaterialProperty[] {
  const observed = new Set(input.observedConditions);
  const properties: MaterialProperty[] = LIBRARY_PROPERTIES[input.category].map((id) => ({
    id,
    label: LABELS[id],
    value: true,
    source: "material_library",
    evidence: `Quy tắc xử lý cho nhóm ${input.category}; cần tuân theo hướng dẫn thu gom tại địa phương.`,
  }));
  for (const id of ["dirty", "wet", "broken", "transparent", "material_code_visible"] as const) {
    if (!observed.has(id)) continue;
    properties.push({
      id,
      label: LABELS[id],
      value: true,
      source: "visual_observation",
      evidence: "Dấu hiệu quan sát được trong ảnh; học sinh nên kiểm tra lại vật thể thật.",
    });
  }
  return properties;
}

function categoryAbilities(
  category: WasteCategory,
  propertyIds: Set<MaterialPropertyId>,
): Pick<CardPreview, "passive" | "active"> {
  switch (category) {
    case "paper":
      return {
        passive: {
          name: "Giữ khô",
          description: "Nhận thêm hiệu quả khi vật thể giấy sạch và khô.",
          rule: "Nếu không có thuộc tính ướt hoặc bẩn, +1 điểm an toàn trong thử thách.",
          basedOn: ["moisture_sensitive"],
        },
        active: {
          name: "Ép phẳng",
          description: "Giảm một đơn vị tài nguyên vận chuyển cho vật thể này.",
          rule: "Dùng một lần mỗi vòng; không áp dụng khi giấy ướt hoặc bẩn.",
          basedOn: ["compactable", "moisture_sensitive"],
        },
      };
    case "glass":
      return {
        passive: {
          name: "Cảnh báo vỡ",
          description: "Nhắc người chơi bảo vệ vật sắc trước khi vận chuyển.",
          rule: "Tránh mất điểm an toàn khi chọn đúng tuyến cho thủy tinh vỡ.",
          basedOn: ["brittle"],
        },
        active: {
          name: "Bọc an toàn",
          description: "Bảo vệ một vật thể dễ vỡ trong vòng hiện tại.",
          rule: "Dùng một lần mỗi vòng cho vật thể thủy tinh.",
          basedOn: ["brittle", "broken"],
        },
      };
    case "metal":
      return {
        passive: {
          name: "Thu hồi vật liệu",
          description: "Tăng hiệu quả khi đưa kim loại vào đúng tuyến thu hồi.",
          rule: "+1 điểm hiệu quả cho lựa chọn tái chế đúng; không giả định vật thể có từ tính.",
          basedOn: ["recoverable_material"],
        },
        active: {
          name: "Nén kiện",
          description: "Giảm một đơn vị tài nguyên vận chuyển.",
          rule: "Không dùng cho bình chịu áp hoặc vật thể nguy hiểm.",
          basedOn: ["compactable"],
        },
      };
    case "organic":
      return {
        passive: {
          name: "Chu trình hữu cơ",
          description: "Tích hiệu quả khi vật thể phù hợp được đưa đi ủ.",
          rule: "+1 điểm hiệu quả cho lựa chọn ủ hữu cơ đúng.",
          basedOn: ["compostable"],
        },
        active: {
          name: "Tách tạp chất",
          description: "Loại một dấu hiệu nhiễm bẩn khỏi quyết định xử lý.",
          rule: "Dùng một lần mỗi vòng; không biến bao bì thành vật liệu ủ được.",
          basedOn: ["compostable", "dirty"],
        },
      };
    case "hazard":
      return {
        passive: {
          name: "Cách ly",
          description: "Ngăn vật thể nguy hại làm nhiễm chéo dòng rác khác.",
          rule: "Không mất điểm an toàn nếu chọn thu gom riêng.",
          basedOn: ["separate_collection"],
        },
        active: {
          name: "Niêm phong",
          description: "Khóa một vật thể vào tuyến thu gom chuyên biệt.",
          rule: "Chỉ áp dụng cho vật thể cần thu gom riêng; không tạo điểm thưởng bổ sung.",
          basedOn: ["separate_collection"],
        },
      };
    case "plastic":
    default:
      return {
        passive: propertyIds.has("material_code_visible")
          ? {
              name: "Đọc ký hiệu",
              description: "Ưu tiên quyết định dựa trên ký hiệu vật liệu nhìn thấy được.",
              rule: "+1 điểm an toàn khi ký hiệu trên vật thể phù hợp với tuyến đã chọn.",
              basedOn: ["material_code_visible", "recyclable"],
            }
          : {
              name: "Tách dòng nhựa",
              description: "Giữ vật thể trong tuyến thu hồi nhựa phù hợp.",
              rule: "Chỉ có hiệu lực khi vật thể sạch và địa phương có tuyến tiếp nhận.",
              basedOn: ["recyclable"],
            },
        active: {
          name: "Ép gọn",
          description: "Giảm một đơn vị tài nguyên vận chuyển.",
          rule: "Không dùng khi bao bì còn bẩn hoặc chứa chất nguy hiểm.",
          basedOn: ["compactable", "dirty"],
        },
      };
  }
}

export function buildCardPreview(
  scanId: string,
  objectName: string,
  category: WasteCategory,
  imageUrl: string | null,
  properties: MaterialProperty[],
): CardPreview {
  const propertyIds = new Set(
    properties.filter((property) => property.value === true).map((property) => property.id),
  );
  const abilities = categoryAbilities(category, propertyIds);
  const traceableAbilities = {
    passive: {
      ...abilities.passive,
      basedOn: abilities.passive.basedOn.filter((id) => propertyIds.has(id)),
    },
    active: {
      ...abilities.active,
      basedOn: abilities.active.basedOn.filter((id) => propertyIds.has(id)),
    },
  };
  return {
    scanId,
    objectName,
    category,
    imageUrl,
    cost: MATERIAL_CARD_CREATE_COST,
    ...traceableAbilities,
    propertyIds: [...propertyIds],
    rulesetVersion: MATERIAL_CARD_RULESET_VERSION,
  };
}

export function expectedActionForCategory(category: WasteCategory): SortingAction {
  if (category === "organic") return "compost";
  if (category === "hazard") return "special_collection";
  return "recycle";
}

export function expectedActionForScenario(
  object: Pick<MaterialScenarioObject, "category" | "condition">,
): SortingAction {
  if (object.category === "hazard") return "special_collection";
  if (object.category === "organic") return "compost";
  if (object.condition === "dirty" || object.condition === "wet") return "residual";
  return "recycle";
}
