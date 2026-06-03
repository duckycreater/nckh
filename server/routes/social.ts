/**
 * Social Network Routes
 */

import { Router } from "express";
import { socialNetworkAnalyzer } from "../services/socialNetworkAnalyzer.js";
import { validateToken } from "../auth.js";

function requireAuth(req: any, res: any, next: () => void) {
  const result = validateToken(req.headers.authorization);
  if (!result) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

function requireAdmin(req: any, res: any, next: () => void) {
  const result = validateToken(req.headers.authorization);
  if (!result) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

export function socialRouter(): Router {
  const router = Router();

  // POST /api/social/interaction - Log a social interaction
  router.post("/interaction", async (req, res) => {
    try {
      const { userId, interactionType, targetUserId, metadata } = req.body;
      if (!userId || !interactionType) {
        return res.status(400).json({ error: "Missing userId or interactionType" });
      }
      await socialNetworkAnalyzer.logInteraction(userId, interactionType, targetUserId, metadata || {});
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/social/metrics/:userId - Get network metrics for a user
  router.get("/metrics/:userId", async (req, res) => {
    try {
      const metrics = await socialNetworkAnalyzer.computeNetworkMetrics(req.params.userId);
      res.json(metrics);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/social/influencers - Top influencers
  router.get("/influencers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const influencers = await socialNetworkAnalyzer.getTopInfluencers(limit);
      res.json(influencers);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/social/communities - Community statistics
  router.get("/communities", async (_req, res) => {
    try {
      const communities = await socialNetworkAnalyzer.getCommunityStats();
      res.json(communities);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/social/summary - Network summary
  router.get("/summary", async (_req, res) => {
    try {
      const summary = await socialNetworkAnalyzer.getNetworkSummary();
      res.json(summary);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/social/team-vs-solo - Team vs solo retention
  router.get("/team-vs-solo", async (_req, res) => {
    try {
      const result = await socialNetworkAnalyzer.getTeamVsSoloRetention();
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/social/compute-ranks - Trigger PageRank computation
  router.post("/compute-ranks", requireAdmin, async (_req, res) => {
    try {
      await socialNetworkAnalyzer.computeAllPageRanks();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
