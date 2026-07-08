/**
 * Vision Routes - AI Model Benchmarking & Metrics
 */

import { Router } from "express";
import { z } from "zod";
import { visionPipeline, WASTE_CATEGORIES, CATEGORY_LABELS } from "../services/visionPipeline.js";
import type { ModelType } from "../services/visionPipeline.js";
import { validateToken } from "../auth.js";
import { zodValidate } from "../middleware/zodValidate.js";

const WasteCategoryEnum = z.enum(["plastic", "paper", "glass", "metal", "organic", "hazard"]);

const GroundTruthBody = z.object({
  userId: z.string().min(1).max(128),
  model: z.string().min(1).max(64),
  predictedCategory: WasteCategoryEnum,
  actualCategory: WasteCategoryEnum,
});

const MisclassificationsQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
});

function requireAuth(req: any, res: any, next: () => void) {
  const result = validateToken(req.headers.authorization);
  if (!result) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

export function visionRouter(): Router {
  const router = Router();

  // GET /api/vision/metrics - AI metrics by model
  router.get("/metrics", requireAuth, async (_req, res) => {
    try {
      const metrics = await visionPipeline.getMetricsByModel();
      res.json(metrics);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/vision/benchmark - Model benchmark comparison
  router.get("/benchmark", requireAuth, async (_req, res) => {
    try {
      const benchmark = await visionPipeline.getModelBenchmark();
      res.json(benchmark);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/vision/confusion-matrix - Confusion matrix data
  router.get("/confusion-matrix", requireAuth, async (_req, res) => {
    try {
      const matrix = await visionPipeline.getConfusionMatrix();
      res.json(matrix);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/vision/misclassifications - Top misclassifications
  router.get("/misclassifications", requireAuth, zodValidate({ query: MisclassificationsQuery }), async (req, res) => {
    try {
      const limit = ((res.locals.query as { limit: number }) ?? { limit: 10 }).limit;
      const misclassifications = await visionPipeline.getTopMisclassifications(limit);
      res.json(misclassifications);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/vision/categories - Waste categories
  router.get("/categories", requireAuth, (_req, res) => {
    res.json(WASTE_CATEGORIES.map((c) => ({
      id: c,
      label: CATEGORY_LABELS[c],
    })));
  });

  // POST /api/vision/ground-truth - Record ground truth label
  router.post(
    "/ground-truth",
    requireAuth,
    zodValidate({ body: GroundTruthBody }),
    async (req, res) => {
      try {
        const { userId, model, predictedCategory, actualCategory } = req.body as z.infer<typeof GroundTruthBody>;
        await visionPipeline.recordGroundTruth(userId, model as ModelType, predictedCategory as any, actualCategory as any);
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ error: (e as Error).message });
      }
    },
  );

  return router;
}
