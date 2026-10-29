export const MATERIAL_CARD_RULESET_VERSION = "material-cards-v2";
export const MATERIAL_MATCH_RULESET_VERSION = "material-processing-v2";
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
export type ProcessingAction = "clean" | "dry" | "protect";

export interface MaterialScenarioObject {
  id: string;
  label: string;
  category: WasteCategory;
  condition?: "clean" | "dirty" | "wet" | "broken";
  transportCost?: 1 | 2;
}

export interface MaterialMatchRound {
  index: number;
  objects: MaterialScenarioObject[];
  actionBudget: number;
  transportBudget: number;
}

export interface MatchRoundEvaluation {
  score: number;
  safety: number;
  safetyMax: number;
  correctness: number;
  correctnessMax: number;
  efficiency: number;
  actionsUsed: number;
  actionBudget: number;
  transportUsed: number;
  transportBudget: number;
  log: string[];
}

export interface MatchSubmission {
  roundIndex: number;
  choices: Array<{
    objectId: string;
    action: SortingAction;
    steps?: ProcessingAction[];
  }>;
  abilityCardId?: string;
  abilityTargetId?: string;
  evaluation?: MatchRoundEvaluation;
}

export interface MatchDeckCard {
  id: string;
  category: WasteCategory;
  abilityName: string;
  sample: boolean;
}

export interface MatchState {
  id: string;
  rulesetVersion: string;
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
  opponentRatingDelta?: number;
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

export function deriveMaterialProperties(input: ObservedMaterialInput): MaterialProperty[] {
  const observed = new Set(input.observedConditions);
  const library = (
    id: MaterialPropertyId,
    value: boolean | null,
    evidence: string,
    source: MaterialPropertySource = "material_library",
  ): MaterialProperty => ({ id, label: LABELS[id], value, source, evidence });
  let properties: MaterialProperty[];
  switch (input.category) {
    case "plastic":
      properties = [
        library(
          "recyclable",
          observed.has("material_code_visible") ? true : null,
          observed.has("material_code_visible")
            ? "Ký hiệu vật liệu nhìn thấy trong ảnh; vẫn cần đối chiếu tuyến tiếp nhận tại địa phương."
            : "Chưa thấy ký hiệu nhựa hoặc hồ sơ vật liệu cụ thể để xác nhận tuyến tái chế.",
          observed.has("material_code_visible") ? "material_library" : "unknown",
        ),
        library(
          "compactable",
          observed.has("dirty") ? null : true,
          observed.has("dirty")
            ? "Vật thể bẩn cần làm sạch trước khi đánh giá khả năng ép gọn."
            : "Bao bì nhựa rỗng thông thường có thể giảm thể tích; không áp dụng cho bình chịu áp.",
          observed.has("dirty") ? "unknown" : "material_library",
        ),
      ];
      break;
    case "paper": {
      const contaminated = observed.has("wet") || observed.has("dirty");
      properties = [
        library("moisture_sensitive", true, "Sợi giấy giảm chất lượng khi ướt hoặc nhiễm bẩn."),
        library(
          "recyclable",
          contaminated ? false : true,
          contaminated
            ? "Dấu hiệu ướt hoặc bẩn làm vật thể không phù hợp với tuyến giấy thông thường."
            : "Giấy khô, sạch thường phù hợp tuyến thu hồi giấy.",
        ),
        library(
          "compactable",
          contaminated ? false : true,
          contaminated ? "Không ép gọn giấy đang ướt hoặc bẩn." : "Giấy khô có thể làm phẳng để giảm thể tích.",
        ),
      ];
      break;
    }
    case "glass":
      properties = [
        library("recyclable", true, "Thủy tinh bao bì thường có tuyến thu hồi riêng tại địa phương."),
        library("brittle", true, "Thủy tinh có tính giòn và cần bảo vệ khi vỡ."),
      ];
      break;
    case "metal":
      properties = [
        library("recyclable", true, "Kim loại bao bì thường có thể đưa vào tuyến thu hồi vật liệu."),
        library("recoverable_material", true, "Kim loại có giá trị thu hồi; không suy ra tính từ chỉ từ ảnh."),
        library(
          "compactable",
          null,
          "Chưa đủ bằng chứng về kết cấu hoặc áp suất bên trong để xác nhận có thể nén.",
          "unknown",
        ),
      ];
      break;
    case "organic":
      properties = [
        library("compostable", true, "Phần hữu cơ không lẫn bao bì có thể phù hợp quy trình ủ."),
      ];
      break;
    case "hazard":
      properties = [
        library("separate_collection", true, "Vật thể nguy hại cần được cách ly và chuyển tới điểm thu gom phù hợp."),
      ];
      break;
  }
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
          name: "Thu hồi đúng tuyến",
          description: "Tăng hiệu quả khi đưa vật thể vào tuyến thu hồi kim loại.",
          rule: "Dùng một lần mỗi vòng cho kim loại được phân luồng tái chế; không suy ra tính từ.",
          basedOn: ["recoverable_material"],
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
