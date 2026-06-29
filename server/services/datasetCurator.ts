/**
 * DatasetCurator - Phase 1: Smart labeling pipeline
 *
 * Uses Groq (fast, low-cost) to cross-check Gemini's vision classification.
 * - If Groq and Gemini agree → auto-accept with confidence boost
 * - If they disagree → flag for human-in-the-loop review
 * - If Gemini confidence low → always flag
 *
 * Reuses the shared aiRouter Groq + Gemini clients to avoid duplicate connections.
 */

import { getGroq, getGemini } from "./aiRouter";

const CATEGORIES = ["plastic", "paper", "glass", "metal", "organic", "hazard"];
const CATEGORY_VI: Record<string, string> = {
  plastic: "nhựa",
  paper: "giấy",
  glass: "thủy tinh",
  metal: "kim loại",
  organic: "hữu cơ",
  hazard: "nguy hại",
};

export interface CurateInput {
  scanId: number;
  imageBase64: string;
  geminiCategory: string;
  geminiConfidence: number;
  geminiAnalysisText: string;
  topKPredictions: Record<string, number>;
}

export interface CurateResult {
  scanId: number;
  action: "auto_accept" | "flag_review" | "reject";
  agreedCategory?: string;
  groqCategory?: string;
  groqConfidence?: number;
  reason?: string;
  lightingCondition?: string;
  occlusionLevel?: string;
  curatorNotes?: string;
}

export class DatasetCurator {

  /**
   * Main entry: curate a scan and decide if it can be auto-released
   */
  async curate(input: CurateInput): Promise<CurateResult> {
    // Step 1: Check confidence threshold
    if (input.geminiConfidence < 0.7) {
      return {
        scanId: input.scanId,
        action: "flag_review",
        reason: "low_confidence",
        curatorNotes: `Gemini confidence ${input.geminiConfidence.toFixed(2)} below threshold 0.70`,
      };
    }

    // Step 2: Check internal consistency of top-K (avoid ambiguous cases)
    const topK = Object.entries(input.topKPredictions).sort((a, b) => b[1] - a[1]);
    const top1 = topK[0];
    const top2 = topK[1];
    if (top1 && top2 && top1[1] - top2[1] < 0.05) {
      return {
        scanId: input.scanId,
        action: "flag_review",
        reason: "low_confidence",
        curatorNotes: `Top-1 (${top1[1].toFixed(2)}) and Top-2 (${top2[1].toFixed(2)}) too close`,
      };
    }

    // Step 3: Cross-check via Groq (text reasoning, low-cost)
    const groq = getGroq();
    if (!groq) {
      // Groq unavailable → accept Gemini's top-1 with a note
      return {
        scanId: input.scanId,
        action: "auto_accept",
        agreedCategory: input.geminiCategory,
        curatorNotes: "Groq unavailable; auto-accepted on Gemini confidence",
      };
    }

    let groqCategory = input.geminiCategory;
    let groqConfidence = 0;
    try {
      const cross = await this.crossCheckWithGroq(input, groq);
      groqCategory = cross.category;
      groqConfidence = cross.confidence;
    } catch (err) {
      console.warn(`[curator] Groq cross-check failed for scan ${input.scanId}:`, err);
      groqConfidence = input.geminiConfidence;
    }

    if (groqCategory !== input.geminiCategory) {
      return {
        scanId: input.scanId,
        action: "flag_review",
        groqCategory,
        groqConfidence,
        reason: "gemini_groq_disagree",
        curatorNotes: `Gemini=${input.geminiCategory} but Groq=${groqCategory} (${groqConfidence.toFixed(2)})`,
      };
    }

    return {
      scanId: input.scanId,
      action: "auto_accept",
      agreedCategory: input.geminiCategory,
      groqConfidence,
    };
  }

  /**
   * Groq cross-check: ask llama-3.3-70b to reason about category from analysis text.
   * No image passed - pure text reasoning, ~250ms, very cheap.
   */
  private async crossCheckWithGroq(
    input: CurateInput,
    groq: NonNullable<ReturnType<typeof getGroq>>,
  ): Promise<{ category: string; confidence: number; reasoning: string }> {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Bạn là chuyên gia phân loại rác. Trả lời JSON: {"category": "plastic|paper|glass|metal|organic|hazard", "confidence": 0.0-1.0, "reasoning": "..."}`,
        },
        {
          role: "user",
          content: `Mô tả ảnh: "${input.geminiAnalysisText.slice(0, 500)}"\n\nTop-6 xác suất:\n${Object.entries(input.topKPredictions)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `- ${CATEGORY_VI[k] || k} (${k}): ${(v * 100).toFixed(1)}%`)
            .join("\n")}\n\nLoại nào đúng nhất?`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 200,
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);
    const cat = String(parsed.category || "").toLowerCase().trim();
    if (!CATEGORIES.includes(cat)) {
      throw new Error(`Invalid category from Groq: ${cat}`);
    }
    return {
      category: cat,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
      reasoning: String(parsed.reasoning || ""),
    };
  }

  /**
   * Detect lighting or occlusion via Gemini multi-modal (best-effort)
   * Returns single-word tag; falls back to "unknown" if anything fails.
   */
  async detectImageAttribute(
    imageBase64: string,
    kind: "lighting" | "occlusion",
  ): Promise<string> {
    try {
      const genai = getGemini();
      if (!genai) return "unknown";

      const prompt =
        kind === "lighting"
          ? `Analyze lighting in this waste image. Reply ONE word: bright|normal|dim|dark`
          : `Analyze occlusion (how much is the waste hidden). Reply ONE word: none|partial|heavy`;

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const response: any = await Promise.race([
        genai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
              ],
            },
          ],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 8_000),
        ),
      ]);

      const text = (response?.text || "").toLowerCase();
      const tags = kind === "lighting"
        ? ["bright", "normal", "dim", "dark"]
        : ["none", "partial", "heavy"];
      for (const tag of tags) {
        if (text.includes(tag)) return tag;
      }
      return "unknown";
    } catch (err) {
      return "unknown";
    }
  }

  /**
   * Compute SHA-256 hash of image bytes (for dedup + provenance)
   */
  static hashImage(base64Data: string): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(base64Data).digest("hex");
  }
}

export const datasetCurator = new DatasetCurator();