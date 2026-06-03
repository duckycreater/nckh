/**
 * Experiment Routes - A/B Testing Management
 */

import { Router, Request, Response } from "express";
import { experimentEngine } from "../services/experimentEngine.js";
import { validateToken } from "../auth.js";
import { getDb } from "../db.js";

function requireAuth(req: Request, res: Response, next: () => void) {
  const result = validateToken(req.headers.authorization);
  if (!result) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function requireAdmin(req: Request, res: Response, next: () => void) {
  const result = validateToken(req.headers.authorization);
  if (!result) return res.status(401).json({ error: "Unauthorized" });
  const db = getDb();
  if (!db) return res.status(403).json({ error: "Forbidden: Admin access required" });
  db.query(`SELECT role FROM users WHERE nick = $1`, [result.nick])
    .then(({ rows }) => {
      if (!rows[0] || rows[0].role !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
      } else {
        next();
      }
    })
    .catch(() => res.status(403).json({ error: "Forbidden: Admin access required" }));
}

export function experimentsRouter(): Router {
  const router = Router();

  // GET /api/experiments - List all experiments
  router.get("/", async (_req, res) => {
    try {
      const experiments = await experimentEngine.getActiveExperiments();
      res.json(experiments);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/experiments/assign - Assign user to experiment
  router.post("/assign", async (req, res) => {
    try {
      const { userId, experimentId } = req.body;
      if (!userId || !experimentId) {
        return res.status(400).json({ error: "Missing userId or experimentId" });
      }
      const result = await experimentEngine.assignToExperiment(userId, experimentId);
      if (!result) {
        return res.status(404).json({ error: "Experiment not found" });
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/experiments/assignment/:userId/:experimentId - Get user's assignment
  router.get("/assignment/:userId/:experimentId", async (req, res) => {
    try {
      const { userId, experimentId } = req.params;
      const result = await experimentEngine.getAssignment(userId, experimentId);
      res.json(result || { message: "Not assigned" });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/experiments/user/:userId - Get all assignments for user
  router.get("/user/:userId", async (req, res) => {
    try {
      const results = await experimentEngine.getUserAssignments(req.params.userId);
      res.json(results);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/experiments/:experimentId/results - Get experiment results
  router.get("/:experimentId/results", async (req, res) => {
    try {
      const results = await experimentEngine.getExperimentResults(req.params.experimentId);
      res.json(results);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/experiments/feature/:userId/:feature - Check if user has feature
  router.get("/feature/:userId/:feature", async (req, res) => {
    try {
      const { userId, feature } = req.params;
      const hasFeature = await experimentEngine.hasFeature(userId, feature);
      res.json({ hasFeature });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // ─── Admin-only experiment management ─────────────────────────────────────────

  // POST /api/experiments/ - Create a new experiment
  router.post("/", requireAdmin, async (req, res) => {
    try {
      const { id, name, description, groups, metrics } = req.body;
      if (!id || !name || !groups) {
        return res.status(400).json({ error: "Missing id, name, or groups" });
      }
      const db = getDb();
      if (!db) return res.status(503).json({ error: "Research DB unavailable" });
      await db.query(
        `INSERT INTO experiment_configs (experiment_id, name, description, groups, metrics, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         ON CONFLICT (experiment_id) DO UPDATE SET
           name = EXCLUDED.name, description = EXCLUDED.description,
           groups = EXCLUDED.groups, metrics = EXCLUDED.metrics, status = 'active'`,
        [id, name, description || "", JSON.stringify(groups), JSON.stringify(metrics || [])]
      );
      res.json({ success: true, message: `Experiment "${name}" created/updated` });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // PUT /api/experiments/:id - Update experiment
  router.put("/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, groups, metrics, status } = req.body;
      const db = getDb();
      if (!db) return res.status(503).json({ error: "Research DB unavailable" });
      await db.query(
        `UPDATE experiment_configs SET name = COALESCE($1, name), description = COALESCE($2, description),
         groups = COALESCE($3, groups), metrics = COALESCE($4, metrics),
         status = COALESCE($5, status)
         WHERE experiment_id = $6`,
        [name, description, groups ? JSON.stringify(groups) : null, metrics ? JSON.stringify(metrics) : null, status, id]
      );
      res.json({ success: true, message: `Experiment "${id}" updated` });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/experiments/:id/pause - Pause experiment
  router.post("/:id/pause", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      if (!db) return res.status(503).json({ error: "Research DB unavailable" });
      await db.query(`UPDATE experiment_configs SET status = 'paused' WHERE experiment_id = $1`, [id]);
      res.json({ success: true, message: `Experiment "${id}" paused` });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/experiments/:id/activate - Activate experiment
  router.post("/:id/activate", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      if (!db) return res.status(503).json({ error: "Research DB unavailable" });
      await db.query(`UPDATE experiment_configs SET status = 'active' WHERE experiment_id = $1`, [id]);
      res.json({ success: true, message: `Experiment "${id}" activated` });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // DELETE /api/experiments/:id - Delete experiment
  router.delete("/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      if (!db) return res.status(503).json({ error: "Research DB unavailable" });
      await db.query(`DELETE FROM experiment_configs WHERE experiment_id = $1`, [id]);
      res.json({ success: true, message: `Experiment "${id}" deleted` });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/experiments/:id/assignments - Get all assignments for an experiment
  router.get("/:id/assignments", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      if (!db) return res.status(503).json({ error: "Research DB unavailable" });
      const { rows } = await db.query(
        `SELECT ea.user_id, ru.username, ea.group_name, ea.assigned_at
         FROM experiment_assignments ea
         JOIN research_users ru ON ea.user_id = ru.user_id
         WHERE ea.experiment_id = $1
         ORDER BY ea.group_name, ea.assigned_at DESC`,
        [id]
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/experiments/:id/assign-all - Re-assign all users to experiment
  router.post("/:id/assign-all", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      if (!db) return res.status(503).json({ error: "Research DB unavailable" });
      const { rows } = await db.query(`SELECT user_id FROM research_users`);
      let assigned = 0;
      for (const row of rows) {
        try {
          const result = await experimentEngine.assignToExperiment(row.user_id, id);
          if (result) assigned++;
        } catch {}
      }
      res.json({ success: true, assigned, message: `Assigned ${assigned} users to experiment "${id}"` });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
