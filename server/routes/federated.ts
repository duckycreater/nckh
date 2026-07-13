/**
 * Federated Router - Phase 2
 *
 * Endpoints:
 *   POST /api/federated/submit          - Client submits weight-delta
 *   GET  /api/federated/latest          - Current global model version
 *   POST /api/federated/trigger-round   - Admin: force aggregation
 *   GET  /api/federated/audit           - User audit log entries
 *   GET  /api/federated/status          - Aggregator buffer + config
 */

import { Router } from "express";
import { z } from "zod";
import { federatedAggregator } from "../services/federatedAggregator.js";
import { getDb } from "../db.js";
import { validateToken } from "../auth.js";
import { zodValidate } from "../middleware/zodValidate.js";

const SubmitBody = z.object({
  round: z.number().int().nonnegative().optional(),
  weights: z.array(z.array(z.number())).min(1).max(64),
  numSamples: z.number().int().positive(),
  metrics: z
    .object({ loss: z.number(), accuracy: z.number(), durationMs: z.number() })
    .optional(),
  privacy: z
    .object({ epsilon: z.number(), delta: z.number(), noiseSigma: z.number() })
    .optional(),
});

const AuditQuery = z.object({
  userId: z.string().min(1).max(128),
});

function requireAuth(req: any, res: any, next: () => void) {
  const result = validateToken(req.headers.authorization);
  if (!result) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as any).userNick = result.nick;
  next();
}

function requireAdmin(req: any, res: any, next: () => void) {
  const adminKey = req.headers["x-admin-key"] || req.query.adminKey;
  if (adminKey !== process.env.ADMIN_API_KEY) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function federatedRouter(): Router {
  const router = Router();

  // POST /api/federated/submit - Client-side weight delta submission
  router.post(
    "/submit",
    requireAuth,
    zodValidate({ body: SubmitBody }),
    async (req, res) => {
      try {
        const userId = (req as any).userNick;
        const body = req.body as z.infer<typeof SubmitBody>;
        const result = await federatedAggregator.submit(userId, {
          round: body.round ?? 0,
          weights: body.weights,
          numSamples: body.numSamples,
          metrics: body.metrics ?? { loss: 0, accuracy: 0, durationMs: 0 },
          privacy: body.privacy ?? { epsilon: 1.0, delta: 1e-5, noiseSigma: 0 },
        });
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: (e as Error).message });
      }
    },
  );

  // GET /api/federated/latest - Latest global model version
  router.get("/latest", async (_req, res) => {
    try {
      const latest = federatedAggregator.getLatestVersion();
      if (latest) {
        return res.json({
          version: latest.version,
          trainedOnSamples: latest.trainedOn,
          createdAt: latest.createdAt,
          scores: latest.scores,
        });
      }
      // Fallback: empty payload, client keeps local model
      res.json({ version: null, trainedOnSamples: 0, scores: {} });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/federated/trigger-round - Admin-only manual aggregation
  router.post("/trigger-round", requireAdmin, async (_req, res) => {
    try {
      const result = await federatedAggregator.runRoundIfReady();
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/federated/audit?userId=xxx - User audit log
  router.get(
    "/audit",
    zodValidate({ query: AuditQuery }),
    async (req, res) => {
      try {
        const { userId } = (res.locals.query ?? req.query) as { userId: string };

        const db = getDb();
        if (!db) return res.json({ entries: [] });

        const { rows } = await db.query(
          `SELECT id, action, metadata, created_at
           FROM privacy_audit_log
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 100`,
          [userId]
        );
        res.json({ entries: rows || [] });
      } catch (e) {
        res.status(500).json({ error: (e as Error).message });
      }
    },
  );

  // GET /api/federated/status - Aggregator buffer + config (debug/admin)
  router.get("/status", async (_req, res) => {
    res.json({
      bufferSize: federatedAggregator.getBufferSize(),
      config: federatedAggregator.getConfig(),
      latestVersion: federatedAggregator.getLatestVersion(),
    });
  });

  // GET /api/federated/rounds - Recent round history
  router.get("/rounds", async (_req, res) => {
    try {
      const db = getDb();
      if (!db) return res.json({ rounds: [] });
      const { rows } = await db.query(
        `SELECT round_number, status, participants_count, min_participants,
                model_version_after, training_loss_avg, validation_accuracy,
                dp_epsilon, dp_delta, noise_multiplier, completed_at
         FROM federated_rounds
         ORDER BY round_number DESC
         LIMIT 50`
      );
      res.json({ rounds: rows || [] });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}