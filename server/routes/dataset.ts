/**
 * Dataset Routes - Phase 1: Open Science / Public Waste AI
 *
 * Endpoints:
 * - GET  /api/dataset/status       - Check current consent + stats for a user
 * - POST /api/dataset/consent      - Grant consent to release future scans
 * - POST /api/dataset/revoke       - Withdraw consent (GDPR-style)
 * - GET  /api/dataset/contributors - Public leaderboard (top contributors)
 * - GET  /api/dataset/release      - Current latest released version metadata
 * - GET  /api/dataset/queue        - Curator review queue (admin only)
 * - POST /api/dataset/queue/:id/approve - Approve a curation item (admin)
 * - POST /api/dataset/queue/:id/reject  - Reject a curation item (admin)
 */

import { Router } from "express";
import { getDb } from "../db.js";
import { validateToken } from "../auth.js";

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

export function datasetRouter(): Router {
  const router = Router();

  // GET /api/dataset/status?nickname=xxx - Check consent + contribution stats
  router.get("/status", async (req, res) => {
    try {
      const nickname = String(req.query.nickname || "");
      if (!nickname) {
        return res.status(400).json({ error: "nickname required" });
      }

      const db = getDb();
      if (!db) {
        return res.json({ consentGiven: false, totalImages: 0, imagesInRelease: 0 });
      }

      const { rows } = await db.query(
        `SELECT
           consent_given, consent_date, revoked_at,
           total_images_contributed, images_in_release,
           first_contribution_at, last_contribution_at
         FROM dataset_contributors
         WHERE user_id = $1`,
        [nickname],
      );

      if (!rows || rows.length === 0) {
        return res.json({ consentGiven: false, totalImages: 0, imagesInRelease: 0 });
      }

      const row = rows[0];
      res.json({
        consentGiven: row.consent_given === true && !row.revoked_at,
        consentDate: row.consent_date,
        revokedAt: row.revoked_at,
        totalImages: row.total_images_contributed,
        imagesInRelease: row.images_in_release,
        firstContributionAt: row.first_contribution_at,
        lastContributionAt: row.last_contribution_at,
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/dataset/consent - Grant consent to release future scans
  router.post("/consent", requireAuth, async (req, res) => {
    try {
      const userNick = (req as any).userNick;
      const db = getDb();
      if (!db) return res.status(503).json({ error: "Research DB unavailable" });

      await db.query(
        `INSERT INTO dataset_contributors (user_id, consent_given, consent_date, first_contribution_at, last_contribution_at)
         VALUES ($1, TRUE, NOW(), NULL, NULL)
         ON CONFLICT (user_id) DO UPDATE SET
           consent_given = TRUE,
           consent_date = NOW(),
           revoked_at = NULL`,
        [userNick],
      );

      await db.query(
        `INSERT INTO privacy_audit_log (user_id, action, metadata, ip_address, user_agent)
         VALUES ($1, 'consent_granted', '{}'::jsonb, $2, $3)`,
        [userNick, req.ip || null, req.headers["user-agent"] || null],
      ).catch(() => {});

      res.json({ success: true, consentGiven: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/dataset/revoke - Withdraw consent (GDPR-style)
  router.post("/revoke", requireAuth, async (req, res) => {
    try {
      const userNick = (req as any).userNick;
      const db = getDb();
      if (!db) return res.status(503).json({ error: "Research DB unavailable" });

      await db.query(`SELECT withdraw_dataset_consent($1)`, [userNick]);

      await db.query(
        `INSERT INTO privacy_audit_log (user_id, action, metadata, ip_address, user_agent)
         VALUES ($1, 'consent_revoked', '{}'::jsonb, $2, $3)`,
        [userNick, req.ip || null, req.headers["user-agent"] || null],
      ).catch(() => {});

      res.json({ success: true, consentGiven: false });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/dataset/contributors - Public leaderboard (anonymized)
  router.get("/contributors", async (_req, res) => {
    try {
      const db = getDb();
      if (!db) return res.json({ contributors: [] });

      const { rows } = await db.query(
        `SELECT display_name, images_in_release AS images, first_contribution_at AS since
         FROM dataset_contributors
         WHERE consent_given = TRUE
           AND revoked_at IS NULL
           AND images_in_release > 0
         ORDER BY images_in_release DESC
         LIMIT 100`,
      );
      res.json({ contributors: rows || [] });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/dataset/release - Latest released version metadata
  router.get("/release", async (_req, res) => {
    try {
      const db = getDb();
      if (!db) return res.json({ released: false });

      const { rows } = await db.query(
        `SELECT version, doi, osf_project_id, total_images, total_categories,
                license_type, model_card_url, changelog, released_at
         FROM dataset_releases
         ORDER BY released_at DESC NULLS LAST
         LIMIT 1`,
      );
      if (!rows || rows.length === 0) {
        return res.json({ released: false });
      }
      res.json({ released: true, ...rows[0] });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/dataset/queue - Pending curation items (admin only)
  router.get("/queue", requireAdmin, async (_req, res) => {
    try {
      const db = getDb();
      if (!db) return res.json({ items: [] });

      const { rows } = await db.query(
        `SELECT q.id, q.scan_id, q.reason_flagged, q.curator_notes,
                q.created_at, s.predicted_category, s.confidence_score,
                s.image_url, s.user_id, s.locale
         FROM dataset_curation_queue q
         JOIN ai_scan_metrics s ON s.id = q.scan_id
         WHERE q.status = 'pending'
         ORDER BY q.created_at ASC
         LIMIT 100`,
      );
      res.json({ items: rows || [] });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/dataset/queue/:id/approve - Approve a curation item
  router.post("/queue/:id/approve", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { finalLabel, notes } = req.body || {};
      const db = getDb();
      if (!db) return res.status(503).json({ error: "Research DB unavailable" });

      await db.query(
        `UPDATE dataset_curation_queue
         SET status = 'approved',
             curator_label = COALESCE($2, curator_label),
             curator_notes = COALESCE($3, curator_notes),
             reviewed_at = NOW()
         WHERE id = $1`,
        [id, finalLabel || null, notes || null],
      );

      if (finalLabel) {
        await db.query(
          `UPDATE ai_scan_metrics
           SET predicted_category = $2,
               dataset_release_status = 'curated'
           WHERE id = (SELECT scan_id FROM dataset_curation_queue WHERE id = $1)`,
          [id, finalLabel],
        );
      } else {
        await db.query(
          `UPDATE ai_scan_metrics
           SET dataset_release_status = 'curated'
           WHERE id = (SELECT scan_id FROM dataset_curation_queue WHERE id = $1)`,
          [id],
        );
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/dataset/queue/:id/reject - Reject a curation item
  router.post("/queue/:id/reject", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { notes } = req.body || {};
      const db = getDb();
      if (!db) return res.status(503).json({ error: "Research DB unavailable" });

      await db.query(
        `UPDATE dataset_curation_queue
         SET status = 'rejected',
             curator_notes = COALESCE($2, curator_notes),
             reviewed_at = NOW()
         WHERE id = $1`,
        [id, notes || null],
      );

      await db.query(
        `UPDATE ai_scan_metrics
         SET dataset_release_status = 'rejected'
         WHERE id = (SELECT scan_id FROM dataset_curation_queue WHERE id = $1)`,
        [id],
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/dataset/stats - Aggregate stats for the dashboard
  router.get("/stats", async (_req, res) => {
    try {
      const db = getDb();
      if (!db) return res.json({});

      const { rows } = await db.query(
        `SELECT
           COUNT(*) FILTER (WHERE consent_to_release = TRUE) AS consented_scans,
           COUNT(*) FILTER (WHERE dataset_release_status = 'released') AS released_scans,
           COUNT(*) FILTER (WHERE dataset_release_status = 'curated') AS curated_scans,
           COUNT(*) FILTER (WHERE dataset_release_status = 'pending_review') AS pending_scans,
           COUNT(DISTINCT user_id) FILTER (WHERE consent_to_release = TRUE) AS unique_contributors,
           COUNT(DISTINCT geo_country) FILTER (WHERE geo_country IS NOT NULL) AS unique_countries
         FROM ai_scan_metrics
         WHERE model_type = 'gemini_2.5_flash'
           AND timestamp > NOW() - INTERVAL '90 days'`,
      );
      res.json(rows?.[0] || {});
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}