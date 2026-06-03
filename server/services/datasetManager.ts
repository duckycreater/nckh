/**
 * Dataset Manager - AI Training Data Collection & Management
 *
 * Stores scan results with ground truth labels for model improvement.
 */

import { getDb } from "../db.js";

export interface ScanDatasetEntry {
  id?: number;
  userId: string;
  imageHash: string;
  predictedCategory: string;
  groundTruthCategory: string;
  modelType: string;
  confidenceScore: number;
  lightingCondition?: string;
  occlusionLevel?: string;
  angle?: string;
  augmented?: boolean;
  augmentations?: string[];
  createdAt?: Date;
}

export interface DatasetStats {
  totalSamples: number;
  byCategory: Record<string, number>;
  byModel: Record<string, number>;
  balanceScore: number; // 0-1, higher is more balanced
  groundTruthCoverage: number; // % with ground truth
}

class DatasetManager {
  private db = getDb();

  // --- Add entry to dataset ---
  async addEntry(entry: ScanDatasetEntry): Promise<number | null> {
    if (!this.db) return null;
    try {
      const { rows } = await this.db.query(
        `INSERT INTO ai_scan_metrics
           (user_id, model_type, confidence_score, predicted_category, ground_truth_category,
            classification_correct)
         VALUES ($1, $2, $3, $4, $5,
           CASE WHEN $4 = $5 THEN TRUE ELSE FALSE END)
         RETURNING id`,
        [
          entry.userId,
          entry.modelType,
          entry.confidenceScore,
          entry.predictedCategory,
          entry.groundTruthCategory || null,
        ]
      );
      return rows[0]?.id || null;
    } catch (e) {
      console.warn("[DatasetManager] Failed to add entry:", (e as Error).message);
      return null;
    }
  }

  // --- Update ground truth ---
  async setGroundTruth(id: number, groundTruthCategory: string): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.query(
        `UPDATE ai_scan_metrics
         SET ground_truth_category = $1,
             classification_correct = (predicted_category = $1)
         WHERE id = $2`,
        [groundTruthCategory, id]
      );
    } catch (e) {
      console.warn("[DatasetManager] Failed to set ground truth:", (e as Error).message);
    }
  }

  // --- Get dataset statistics ---
  async getDatasetStats(): Promise<DatasetStats> {
    if (!this.db) {
      return { totalSamples: 0, byCategory: {}, byModel: {}, balanceScore: 0, groundTruthCoverage: 0 };
    }
    try {
      const { rows: totalRows } = await this.db.query(`SELECT COUNT(*)::int AS total FROM ai_scan_metrics`);
      const totalSamples = parseInt(totalRows[0]?.total || "0");

      const { rows: catRows } = await this.db.query(
        `SELECT predicted_category, COUNT(*)::int AS count
         FROM ai_scan_metrics GROUP BY predicted_category`
      );
      const byCategory: Record<string, number> = {};
      for (const r of catRows) byCategory[r.predicted_category] = r.count;

      const { rows: modelRows } = await this.db.query(
        `SELECT model_type, COUNT(*)::int AS count FROM ai_scan_metrics GROUP BY model_type`
      );
      const byModel: Record<string, number> = {};
      for (const r of modelRows) byModel[r.model_type] = r.count;

      const { rows: gtRows } = await this.db.query(
        `SELECT COUNT(*)::int AS covered FROM ai_scan_metrics WHERE ground_truth_category IS NOT NULL`
      );
      const groundTruthCoverage = totalSamples > 0
        ? Math.round((parseInt(gtRows[0]?.covered || "0") / totalSamples) * 1000) / 10
        : 0;

      // Balance score: entropy-based (1 = perfectly balanced)
      const values = Object.values(byCategory);
      const totalCat = values.reduce((s, v) => s + v, 0) || 1;
      const proportions = values.map((v) => v / totalCat);
      const maxEntropy = Math.log(proportions.length || 1);
      const entropy = proportions.reduce((s, p) => s - (p > 0 ? p * Math.log(p) : 0), 0);
      const balanceScore = maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) / 100 : 0;

      return { totalSamples, byCategory, byModel, balanceScore, groundTruthCoverage };
    } catch {
      return { totalSamples: 0, byCategory: {}, byModel: {}, balanceScore: 0, groundTruthCoverage: 0 };
    }
  }

  // --- Export dataset as CSV ---
  async exportDatasetCsv(): Promise<string> {
    if (!this.db) return "";
    try {
      const { rows } = await this.db.query(
        `SELECT
           id, user_id, model_type, latency_ms, confidence_score,
           predicted_category, ground_truth_category, classification_correct, timestamp
         FROM ai_scan_metrics
         ORDER BY timestamp DESC
         LIMIT 10000`
      );

      const headers = ["id", "user_id", "model_type", "latency_ms", "confidence_score",
                       "predicted_category", "ground_truth_category", "classification_correct", "timestamp"];
      const csvLines = [headers.join(",")];
      for (const row of rows) {
        const values = headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          return typeof val === "string" && val.includes(",") ? `"${val}"` : String(val);
        });
        csvLines.push(values.join(","));
      }
      return csvLines.join("\n");
    } catch {
      return "";
    }
  }

  // --- Get samples needing ground truth ---
  async getUnlabeledSamples(limit = 50): Promise<any[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(
        `SELECT id, user_id, model_type, predicted_category, confidence_score, timestamp
         FROM ai_scan_metrics
         WHERE ground_truth_category IS NULL
         ORDER BY timestamp DESC
         LIMIT $1`,
        [limit]
      );
      return rows;
    } catch {
      return [];
    }
  }
}

export const datasetManager = new DatasetManager();
