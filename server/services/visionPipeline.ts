/**
 * Vision Pipeline Service - AI Waste Classification
 *
 * Dual-mode classification:
 * - PRIMARY: Gemini 2.5 Flash (cloud, high quality)
 * - LOCAL: TensorFlow.js models (offline capable, MobileNetV2 / EfficientNet-Lite / YOLOv8n)
 *
 * All inference is tracked for benchmark comparison.
 */

import { getDb } from "../db.js";

export type WasteCategory =
  | "plastic"
  | "paper"
  | "glass"
  | "metal"
  | "organic"
  | "hazard";

export type ModelType = "gemini_2.5_flash" | "mobilenet_v2" | "efficientnet_lite" | "yolov8n";

export interface ClassificationResult {
  category: WasteCategory;
  categoryLabel: string;
  confidence: number;
  model: ModelType;
  latencyMs: number;
  description: string;
  disposalInstructions: string;
}

export interface AIMetric {
  model: ModelType;
  totalInferences: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  totalLatencyMs: number;
}

export interface ConfusionCell {
  actual: WasteCategory;
  predicted: WasteCategory;
  count: number;
}

export interface ConfusionMatrixData {
  matrix: Record<WasteCategory, Record<WasteCategory, number>>;
  labels: WasteCategory[];
  totals: Record<WasteCategory, number>;
  overallAccuracy: number;
  perClassMetrics: Record<WasteCategory, {
    precision: number;
    recall: number;
    f1: number;
    support: number;
  }>;
}

export interface ModelBenchmark {
  model: ModelType;
  displayName: string;
  totalInferences: number;
  avgLatencyMs: number;
  avgConfidence: number;
  accuracy: number;
  fps: number;
}

// --- Category mapping for local models ---
export const WASTE_CATEGORIES: WasteCategory[] = [
  "plastic", "paper", "glass", "metal", "organic", "hazard",
];

export const CATEGORY_LABELS: Record<WasteCategory, string> = {
  plastic: "Nhựa",
  paper: "Giấy",
  glass: "Thủy tinh",
  metal: "Kim loại",
  organic: "Hữu cơ",
  hazard: "Nguy hại",
};

export const CATEGORY_DESCRIPTIONS: Record<WasteCategory, { description: string; instructions: string }> = {
  plastic: {
    description: "Đây là loại rác nhựa có thể tái chế được.",
    instructions: "Rửa sạch, vát dẹt để tiết kiệm không gian, bỏ vào thùng tái chế màu xanh dương.",
  },
  paper: {
    description: "Đây là loại rác giấy có thể tái chế.",
    instructions: "Gấp phẳng, loại bỏ các phần dính, bỏ vào thùng tái chế giấy.",
  },
  glass: {
    description: "Đây là loại rác thủy tinh có thể tái chế.",
    instructions: "Rửa sạch, không để vỡ, bỏ vào thùng tái chế riêng cho thủy tinh.",
  },
  metal: {
    description: "Đây là loại rác kim loại có thể tái chế.",
    instructions: "Rửa sạch, có thể bóp dẹt để tiết kiệm không gian, bỏ vào thùng tái chế.",
  },
  organic: {
    description: "Đây là loại rác hữu cơ có thể ủ compost.",
    instructions: "Bỏ vào thùng rác hữu cơ hoặc ủ làm phân bón tự nhiên. Không bỏ vào thùng tái chế.",
  },
  hazard: {
    description: "Đây là loại rác nguy hại cần xử lý đặc biệt.",
    instructions: "KHÔNG bỏ chung rác thường. Mang đến điểm thu gom rác nguy hại hoặc trạm xử lý chuyên dụng.",
  },
};

// --- Classification Service ---
class VisionPipeline {
  private db = getDb();

  // --- Log AI inference metric ---
  async logInference(
    userId: string,
    model: ModelType,
    latencyMs: number,
    confidence: number,
    predictedCategory: WasteCategory,
    groundTruthCategory?: WasteCategory,
    sessionId?: number
  ): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.query(
        `INSERT INTO ai_scan_metrics
          (user_id, model_type, latency_ms, confidence_score, predicted_category, ground_truth_category, session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, model, latencyMs, confidence, predictedCategory, groundTruthCategory || null, sessionId || null]
      );
    } catch (e) {
      console.warn("[VisionPipeline] Failed to log inference:", (e as Error).message);
    }
  }

  // --- Record ground truth (user feedback) ---
  async recordGroundTruth(
    userId: string,
    model: ModelType,
    predictedCategory: WasteCategory,
    actualCategory: WasteCategory,
    sessionId?: number
  ): Promise<void> {
    if (!this.db) return;
    try {
      // Upsert: update existing row that matches user + model + predicted
      await this.db.query(
        `UPDATE ai_scan_metrics
         SET ground_truth_category = $1,
             classification_correct = (predicted_category = $1)
         WHERE id = (
           SELECT id FROM ai_scan_metrics
           WHERE user_id = $2 AND model_type = $3 AND predicted_category = $4
           ORDER BY timestamp DESC LIMIT 1
         )`,
        [actualCategory, userId, model, predictedCategory]
      );
    } catch (e) {
      console.warn("[VisionPipeline] Failed to record ground truth:", (e as Error).message);
    }
  }

  // --- Get AI metrics by model ---
  async getMetricsByModel(): Promise<AIMetric[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(`
        SELECT
          model_type,
          COUNT(*)::int AS total_inferences,
          AVG(latency_ms)::float AS avg_latency_ms,
          MIN(latency_ms)::float AS min_latency_ms,
          MAX(latency_ms)::float AS max_latency_ms,
          SUM(latency_ms)::float AS total_latency_ms
        FROM ai_scan_metrics
        GROUP BY model_type
        ORDER BY total_inferences DESC
      `);
      return rows.map((r) => ({
        model: r.model_type as ModelType,
        totalInferences: r.total_inferences,
        avgLatencyMs: Math.round(r.avg_latency_ms * 10) / 10,
        minLatencyMs: Math.round(r.min_latency_ms),
        maxLatencyMs: Math.round(r.max_latency_ms),
        totalLatencyMs: Math.round(r.total_latency_ms),
      }));
    } catch {
      return [];
    }
  }

  // --- Get model benchmark summary ---
  async getModelBenchmark(): Promise<ModelBenchmark[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(`
        SELECT
          model_type,
          COUNT(*)::int AS total_inferences,
          AVG(latency_ms)::float AS avg_latency_ms,
          AVG(confidence_score)::float AS avg_confidence,
          AVG(CASE WHEN classification_correct IS TRUE THEN 1.0 ELSE 0.0 END)::float * 100 AS accuracy,
          CASE WHEN AVG(latency_ms) > 0
               THEN ROUND(1000.0 / AVG(latency_ms)::numeric, 1)::float
               ELSE 0
          END AS fps
        FROM ai_scan_metrics
        GROUP BY model_type
        ORDER BY total_inferences DESC
      `);

      const displayNames: Record<string, string> = {
        "gemini_2.5_flash": "Gemini 2.5 Flash",
        mobilenet_v2: "MobileNetV2 (TFLite)",
        efficientnet_lite: "EfficientNet-Lite (TFLite)",
        yolov8n: "YOLOv8n (ONNX)",
      };

      return rows.map((r) => ({
        model: r.model_type as ModelType,
        displayName: displayNames[r.model_type as string] || r.model_type,
        totalInferences: r.total_inferences,
        avgLatencyMs: Math.round(r.avg_latency_ms * 10) / 10,
        avgConfidence: Math.round(r.avg_confidence * 100),
        accuracy: Math.round(r.accuracy * 10) / 10,
        fps: r.fps,
      }));
    } catch {
      return [];
    }
  }

  // --- Get confusion matrix ---
  async getConfusionMatrix(): Promise<ConfusionMatrixData> {
    if (!this.db) {
      return this.emptyConfusionMatrix();
    }

    try {
      const { rows } = await this.db.query(`
        SELECT predicted_category, ground_truth_category, COUNT(*)::int AS count
        FROM ai_scan_metrics
        WHERE ground_truth_category IS NOT NULL
          AND predicted_category IS NOT NULL
          AND ground_truth_category != ''
          AND predicted_category != ''
        GROUP BY predicted_category, ground_truth_category
      `);

      const matrix: Record<WasteCategory, Record<WasteCategory, number>> = {} as any;
      const totals: Record<WasteCategory, number> = {} as any;
      for (const actual of WASTE_CATEGORIES) {
        matrix[actual] = {} as any;
        for (const predicted of WASTE_CATEGORIES) {
          matrix[actual][predicted] = 0;
        }
        totals[actual] = 0;
      }

      for (const row of rows) {
        const actual = row.ground_truth_category as WasteCategory;
        const predicted = row.predicted_category as WasteCategory;
        if (matrix[actual] && matrix[actual][predicted] !== undefined) {
          matrix[actual][predicted] += row.count;
          totals[actual] += row.count;
        }
      }

      // Calculate per-class metrics
      const perClassMetrics: Record<WasteCategory, { precision: number; recall: number; f1: number; support: number }> = {} as any;
      let totalCorrect = 0;
      let totalSamples = 0;

      for (const actual of WASTE_CATEGORIES) {
        const support = totals[actual];
        totalSamples += support;
        let truePositives = 0;
        let falsePositives = 0;

        for (const predicted of WASTE_CATEGORIES) {
          if (actual === predicted) {
            truePositives = matrix[actual][predicted];
          }
          falsePositives += matrix[predicted][actual];
        }

        // Recall = TP / (TP + FN) = diagonal / row total
        const recall = support > 0 ? truePositives / support : 0;
        // Precision = TP / (TP + FP) = diagonal / column total
        const colTotal = Object.values(matrix).reduce((sum, row) => sum + (row[actual] || 0), 0);
        const precision = colTotal > 0 ? truePositives / colTotal : 0;
        // F1 = 2 * P * R / (P + R)
        const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;

        perClassMetrics[actual] = {
          precision: Math.round(precision * 1000) / 10,
          recall: Math.round(recall * 1000) / 10,
          f1: Math.round(f1 * 1000) / 10,
          support,
        };
        totalCorrect += truePositives;
      }

      return {
        matrix,
        labels: WASTE_CATEGORIES,
        totals,
        overallAccuracy: totalSamples > 0 ? Math.round(totalCorrect / totalSamples * 1000) / 10 : 0,
        perClassMetrics,
      };
    } catch {
      return this.emptyConfusionMatrix();
    }
  }

  // --- Get top misclassifications ---
  async getTopMisclassifications(limit = 10): Promise<{ actual: string; predicted: string; count: number }[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(`
        SELECT ground_truth_category AS actual, predicted_category AS predicted, COUNT(*)::int AS count
        FROM ai_scan_metrics
        WHERE ground_truth_category IS NOT NULL
          AND predicted_category IS NOT NULL
          AND ground_truth_category != predicted_category
        GROUP BY ground_truth_category, predicted_category
        ORDER BY count DESC
        LIMIT $1
      `, [limit]);
      return rows;
    } catch {
      return [];
    }
  }

  // --- Parse Gemini's text response to category ---
  parseGeminiResponseToCategory(text: string): WasteCategory {
    const lower = text.toLowerCase();
    if (lower.includes("nhựa") || lower.includes("plastic")) return "plastic";
    if (lower.includes("giấy") || lower.includes("paper")) return "paper";
    if (lower.includes("thủy tinh") || lower.includes("glass")) return "glass";
    if (lower.includes("kim loại") || lower.includes("metal")) return "metal";
    if (lower.includes("hữu cơ") || lower.includes("organic")) return "organic";
    if (lower.includes("nguy hại") || lower.includes("hazard")) return "hazard";
    // Default to organic if ambiguous
    return "organic";
  }

  private emptyConfusionMatrix(): ConfusionMatrixData {
    const matrix: Record<WasteCategory, Record<WasteCategory, number>> = {} as any;
    const totals: Record<WasteCategory, number> = {} as any;
    for (const cat of WASTE_CATEGORIES) {
      matrix[cat] = {} as any;
      for (const p of WASTE_CATEGORIES) matrix[cat][p] = 0;
      totals[cat] = 0;
    }
    const perClassMetrics: Record<WasteCategory, any> = {} as any;
    for (const cat of WASTE_CATEGORIES) {
      perClassMetrics[cat] = { precision: 0, recall: 0, f1: 0, support: 0 };
    }
    return { matrix, labels: WASTE_CATEGORIES, totals, overallAccuracy: 0, perClassMetrics };
  }
}

export const visionPipeline = new VisionPipeline();
