/**
 * Longitudinal Analytics Routes
 */

import { Router } from "express";
import { longitudinalAnalytics } from "../services/longitudinalAnalytics.js";
import { datasetManager } from "../services/datasetManager.js";
import { validateToken } from "../auth.js";

function requireAuth(req: any, res: any, next: () => void) {
  const result = validateToken(req.headers.authorization);
  if (!result) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

export function longitudinalRouter(): Router {
  const router = Router();

  // GET /api/longitudinal/cohort - Cohort retention table
  router.get("/cohort", requireAuth, async (req, res) => {
    try {
      const weeksBack = parseInt(req.query.weeks as string) || 12;
      const cohort = await longitudinalAnalytics.getCohortRetentionTable(weeksBack);
      res.json(cohort);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/longitudinal/weekly - Weekly metrics
  router.get("/weekly", requireAuth, async (req, res) => {
    try {
      const weeksBack = parseInt(req.query.weeks as string) || 12;
      const metrics = await longitudinalAnalytics.getWeeklyMetrics(weeksBack);
      res.json(metrics);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/longitudinal/survival - Kaplan-Meier survival analysis
  router.get("/survival", requireAuth, async (_req, res) => {
    try {
      const survival = await longitudinalAnalytics.getSurvivalAnalysis();
      res.json(survival);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/longitudinal/feature-adoption - Feature adoption timeline
  router.get("/feature-adoption", requireAuth, async (req, res) => {
    try {
      const weeksBack = parseInt(req.query.weeks as string) || 8;
      const timeline = await longitudinalAnalytics.getFeatureAdoptionTimeline(weeksBack);
      res.json(timeline);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/longitudinal/engagement-decay - Engagement decay curve
  router.get("/engagement-decay", requireAuth, async (req, res) => {
    try {
      const weeksBack = parseInt(req.query.weeks as string) || 12;
      const curve = await longitudinalAnalytics.getEngagementDecayCurve(weeksBack);
      res.json(curve);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/dataset/stats - Dataset statistics
  router.get("/dataset/stats", requireAuth, async (_req, res) => {
    try {
      const stats = await datasetManager.getDatasetStats();
      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/dataset/unlabeled - Get unlabeled samples
  router.get("/dataset/unlabeled", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const samples = await datasetManager.getUnlabeledSamples(limit);
      res.json(samples);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/dataset/ground-truth - Set ground truth for a sample
  router.post("/dataset/ground-truth", requireAuth, async (req, res) => {
    try {
      const { id, groundTruthCategory } = req.body;
      if (!id || !groundTruthCategory) {
        return res.status(400).json({ error: "Missing id or groundTruthCategory" });
      }
      await datasetManager.setGroundTruth(id, groundTruthCategory);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/dataset/export - Export dataset as CSV
  router.get("/dataset/export", requireAuth, async (_req, res) => {
    try {
      const csv = await datasetManager.exportDatasetCsv();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=ai_scan_dataset.csv");
      res.send(csv);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
