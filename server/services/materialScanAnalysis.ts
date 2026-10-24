import { z } from "zod";
import {
  MATERIAL_KNOWLEDGE_VERSION,
  deriveMaterialProperties,
  type MaterialPropertyId,
  type ScanAnalysis,
  type WasteCategory,
} from "../../shared/materialCards.js";

const CategorySchema = z.enum(["plastic", "paper", "glass", "metal", "organic", "hazard"]);
const VerdictSchema = z.enum(["single_waste", "not_waste", "multiple_objects", "uncertain"]);
const ObservationSchema = z.enum([
  "dirty",
  "wet",
  "broken",
  "transparent",
  "material_code_visible",
]);

const AIObservationSchema = z
  .object({
    verdict: VerdictSchema,
    objectName: z.string().trim().min(1).max(80),
    category: CategorySchema.nullable(),
    description: z.string().trim().min(1).max(500),
    disposalInstructions: z.string().trim().min(1).max(700),
    observedConditions: z.array(ObservationSchema).max(5),
    uncertaintyReason: z.string().trim().max(300).nullable(),
  })
  .strict();

export const MATERIAL_SCAN_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: {
      type: "string",
      enum: ["single_waste", "not_waste", "multiple_objects", "uncertain"],
      description: "single_waste only when one main discarded object is clearly visible",
    },
    objectName: { type: "string", description: "Short Vietnamese name of the visible object" },
    category: {
      type: ["string", "null"],
      enum: ["plastic", "paper", "glass", "metal", "organic", "hazard", null],
    },
    description: { type: "string" },
    disposalInstructions: { type: "string" },
    observedConditions: {
      type: "array",
      items: {
        type: "string",
        enum: ["dirty", "wet", "broken", "transparent", "material_code_visible"],
      },
      maxItems: 5,
    },
    uncertaintyReason: { type: ["string", "null"] },
  },
  required: [
    "verdict",
    "objectName",
    "category",
    "description",
    "disposalInstructions",
    "observedConditions",
    "uncertaintyReason",
  ],
} as const;

export const MATERIAL_SCAN_PROMPT = [
  "Quan sát ảnh và mô tả đúng những gì nhìn thấy.",
  "Chỉ chọn single_waste khi có đúng một vật thể bị thải bỏ làm chủ thể chính.",
  "Nếu là đồ dùng còn sử dụng, chọn not_waste. Nếu có nhiều chủ thể rác, chọn multiple_objects.",
  "Nếu ảnh mờ, che khuất hoặc không đủ căn cứ xác định vật liệu, chọn uncertain và category=null.",
  "observedConditions chỉ ghi dấu hiệu nhìn thấy trực tiếp; không suy đoán khối lượng, thành phần hóa học hay thời gian phân hủy.",
  "Không khẳng định khả năng tái chế nếu chỉ dựa vào hình ảnh; hệ thống sẽ tra thư viện vật liệu riêng.",
  "Trả lời bằng tiếng Việt.",
].join(" ");

function extractJson(text: string): unknown {
  const candidates = [
    text.trim(),
    text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || "",
    text.match(/\{[\s\S]*\}/)?.[0] || "",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

export function parseMaterialScanAnalysis(raw: string, scanId: string): ScanAnalysis {
  const parsed = AIObservationSchema.safeParse(extractJson(raw));
  if (!parsed.success) {
    return {
      scanId,
      verdict: "uncertain",
      objectName: "Chưa xác định",
      category: null,
      description: "Kết quả AI không đạt hợp đồng dữ liệu an toàn.",
      disposalInstructions: "Chụp lại một vật thể duy nhất, đủ sáng và rõ toàn bộ vật thể.",
      observedConditions: [],
      properties: [],
      uncertaintyReason: "Phản hồi nhận diện thiếu hoặc sai trường dữ liệu bắt buộc.",
      eligibleForCard: false,
      knowledgeBaseVersion: MATERIAL_KNOWLEDGE_VERSION,
    };
  }

  const value = parsed.data;
  const category: WasteCategory | null = value.verdict === "single_waste" ? value.category : null;
  const eligibleForCard = value.verdict === "single_waste" && category !== null;
  const observedConditions = value.observedConditions as MaterialPropertyId[];
  return {
    scanId,
    verdict: eligibleForCard ? "single_waste" : value.verdict,
    objectName: value.objectName,
    category,
    description: value.description,
    disposalInstructions: value.disposalInstructions,
    observedConditions,
    properties: category
      ? deriveMaterialProperties({ category, observedConditions })
      : observedConditions.map((id) => ({
          id,
          label: id,
          value: true,
          source: "visual_observation" as const,
          evidence: "Dấu hiệu quan sát được trong ảnh; chưa đủ để xác định nhóm vật liệu.",
        })),
    uncertaintyReason: eligibleForCard
      ? null
      : value.uncertaintyReason || "Ảnh chưa đủ căn cứ để xác thực một vật thể rác.",
    eligibleForCard,
    knowledgeBaseVersion: MATERIAL_KNOWLEDGE_VERSION,
  };
}
