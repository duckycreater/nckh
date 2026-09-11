/**
 * Social Network Routes
 */

import { Router } from "express";
import { socialNetworkAnalyzer } from "../services/socialNetworkAnalyzer.js";
import { validateToken } from "../auth.js";

function requireAuth(req: any, res: any, next: () => void) {
  const result = validateToken(req.headers.authorization);
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userNick = result.nick;
  req.userId = result.accountId ?? result.nick;
  req.isAdmin = result.isAdmin;
  next();
}

function requireAdmin(req: any, res: any, next: () => void) {
  const result = validateToken(req.headers.authorization);
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!result.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  req.userNick = result.nick;
  req.userId = result.accountId ?? result.nick;
  req.isAdmin = true;
  next();
}

function canAccessUser(req: any, requestedId: string | string[]): boolean {
  const id = Array.isArray(requestedId) ? requestedId[0] : requestedId;
  return Boolean(req.isAdmin || id === req.userId || id === req.userNick);
}

export function socialRouter(): Router {
  const router = Router();

  // POST /api/social/interaction - Log a social interaction
  router.post("/interaction", requireAuth, async (req, res) => {
    try {
      const { interactionType, targetUserId, metadata } = req.body;
      if (!interactionType) {
        return res.status(400).json({ error: "Missing interactionType" });
      }
      await socialNetworkAnalyzer.logInteraction(
        (req as any).userId as string,
        interactionType,
        targetUserId,
        metadata || {},
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/social/metrics/:userId - Get network metrics for a user
  router.get("/metrics/:userId", requireAuth, async (req, res) => {
    try {
      if (!canAccessUser(req, req.params.userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const metrics = await socialNetworkAnalyzer.computeNetworkMetrics(req.params.userId);
      res.json(metrics);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/social/influencers - Top influencers
  router.get("/influencers", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const influencers = await socialNetworkAnalyzer.getTopInfluencers(limit);
      res.json(influencers);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/social/communities - Community statistics
  router.get("/communities", requireAdmin, async (_req, res) => {
    try {
      const communities = await socialNetworkAnalyzer.getCommunityStats();
      res.json(communities);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/social/summary - Network summary
  router.get("/summary", requireAdmin, async (_req, res) => {
    try {
      const summary = await socialNetworkAnalyzer.getNetworkSummary();
      res.json(summary);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/social/team-vs-solo - Team vs solo retention
  router.get("/team-vs-solo", requireAdmin, async (_req, res) => {
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
