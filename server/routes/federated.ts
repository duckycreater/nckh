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
import { getAuditLog, getDpAccountant } from "../services/dpAccountant.js";
import { getAuditTrail } from "../services/auditTrail.js";

const SubmitBody = z.object({
  round: z.number().int().nonnegative().optional(),
  weights: z
    .array(z.array(z.number().finite().min(-10).max(10)).min(1).max(4096))
    .min(1)
    .max(64),
  numSamples: z.number().int().positive().max(1_000_000),
  metrics: z
    .object({
      loss: z.number().finite().min(0).max(1000),
      accuracy: z.number().finite().min(0).max(1),
      durationMs: z.number().finite().min(0).max(86_400_000),
    })
    .optional(),
  privacy: z
    .object({
      epsilon: z.number().finite().positive().max(100),
      delta: z.number().finite().gt(0).lt(1),
      noiseSigma: z.number().finite().min(0).max(10_000),
    })
    .optional(),
});

const AuditQuery = z.object({
  userId: z.string().min(1).max(128).optional(),
});

function requireAuth(req: any, res: any, next: () => void) {
  const result = validateToken(req.headers.authorization);
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userNick = result.nick;
  next();
}

function requireAdmin(req: any, res: any, next: () => void) {
  // Layer 2.2 — see server/routes/dataset.ts for the rationale.
  const headerKey =
    req.headers["x-admin-key"] || req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const adminKey = typeof headerKey === "string" ? headerKey.trim() : "";
  if (process.env.ADMIN_API_KEY && adminKey === process.env.ADMIN_API_KEY) return next();
  const result = validateToken(req.headers.authorization);
  if (!result) return res.status(401).json({ error: "Unauthorized" });
  if (!result.isAdmin) return res.status(403).json({ error: "Admin access required" });
  req.userNick = result.nick;
  next();
}

export function federatedRouter(): Router {
  const router = Router();

  // POST /api/federated/submit - Client-side weight delta submission
  router.post("/submit", requireAuth, zodValidate({ body: SubmitBody }), async (req, res) => {
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
  });

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
  router.get("/audit", requireAuth, zodValidate({ query: AuditQuery }), async (req, res) => {
    try {
      // The query parameter is retained for old clients but cannot be used
      // to read another participant's privacy log.
      const userId = (req as any).userNick as string;

      const db = getDb();
      if (!db) return res.json({ entries: [] });

      const { rows } = await db.query(
        `SELECT id, action, metadata, created_at
           FROM privacy_audit_log
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 100`,
        [userId],
      );
      res.json({ entries: rows || [] });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/federated/status - Aggregator buffer + config (debug/admin)
  router.get("/status", async (_req, res) => {
    // Expose only aggregate operational telemetry; model/privacy internals
    // are available through the authenticated admin console.
    res.json({ ok: true, ...federatedAggregator.getStats() });
  });

  // GET /api/federated/privacy - cumulative server-side RDP budget.
  router.get("/privacy", requireAuth, (_req, res) => {
    const state = getDpAccountant().computeState();
    const roundLog = getAuditLog();
    const audit = getAuditTrail().exportSnapshot();
    const lastRound = roundLog.at(-1);
    res.json({
      provenance: "live",
      accountingScope: "server_process",
      renyiCurve: state.renyiCurve,
      epsilonAtDelta: state.epsilonAtDelta,
      deltaAtEpsilon: state.deltaAtEpsilon,
      withinBudget: state.withinBudget,
      recommendedSigma: state.recommendedSigma,
      rounds: state.rounds,
      audit: {
        merkleRoot: audit.rootHex,
        rounds: state.rounds,
        lastRoundAt: lastRound ? new Date(lastRound.clockTs).toISOString() : null,
        withinBudget: state.withinBudget,
      },
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
         LIMIT 50`,
      );
      res.json({ rounds: rows || [] });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
