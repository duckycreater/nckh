/**
 * Vision Routes - AI Model Benchmarking & Metrics
 */

import { Router } from "express";
import { visionPipeline, WASTE_CATEGORIES, CATEGORY_LABELS } from "../services/visionPipeline.js";
import { validateToken } from "../auth.js";

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
  router.get("/misclassifications", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
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
  router.post("/ground-truth", requireAuth, async (req, res) => {
    try {
      const { userId, model, predictedCategory, actualCategory } = req.body;
      if (!userId || !model || !predictedCategory || !actualCategory) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      await visionPipeline.recordGroundTruth(userId, model, predictedCategory, actualCategory);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
