/**
 * Family Routes - CayGiaPha_NhanThuc (multi-user household)
 *
 * - POST /api/family                  - Create family (creator = parent)
 * - GET  /api/family/me               - Get the family I belong to
 * - POST /api/family/join             - Join by invite code
 * - POST /api/family/leave            - Leave current family
 * - GET  /api/family/:id/members      - List members with weekly stats
 * - GET  /api/family/:id/challenges   - Active + recent challenges
 * - POST /api/family/:id/challenges   - Create challenge (parent only)
 * - GET  /api/family/:id/carbon       - Weekly carbon stats per member + category
 * - GET  /api/family/:id/leaderboard  - Family rank among all families
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

// EPA WARM model CO2 avoidance factors (kg CO2 / kg recycled vs landfill)
const CO2_FACTORS: Record<string, number> = {
  plastic: 2.5,
  paper: 1.7,
  glass: 0.6,
  metal: 4.0,
  organic: 0.5,
  hazard: 0.0, // hazardous disposal has no positive CO2 benefit
};

// Vietnamese school waste avg item weight (grams, from limited pilot data)
const AVG_ITEM_WEIGHT_G: Record<string, number> = {
  plastic: 25,
  paper: 12,
  glass: 200,
  metal: 80,
  organic: 150,
  hazard: 30,
};

function generateInviteCode(): string {
  // 6-char uppercase alphanumeric (avoiding ambiguous chars)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateAvatarSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function familyRouter(): Router {
  const router = Router();

  // POST /api/family
  router.post("/", requireAuth, async (req, res) => {
    try {
      const userNick = (req as any).userNick;
      const name = String(req.body.name || "").trim();
      const region = String(req.body.region || "VN").trim();
      if (!name) return res.status(400).json({ error: "name required" });
      if (name.length > 100) return res.status(400).json({ error: "name too long" });

      const db = getDb();
      if (!db) return res.status(503).json({ error: "DB unavailable" });

      // Check: already in a family? leave first
      const existing = await db.query(
        `SELECT family_id FROM family_members WHERE user_id = $1 AND is_active = TRUE`,
        [userNick],
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "Bạn đã ở trong một gia đình. Hãy rời trước." });
      }

      const inviteCode = generateInviteCode();
      const avatarSeed = generateAvatarSeed();

      const inserted = await db.query(
        `INSERT INTO families (name, invite_code, created_by, region, avatar_seed)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, invite_code, created_by, region, avatar_seed, created_at`,
        [name, inviteCode, userNick, region, avatarSeed],
      );

      const family = inserted.rows[0];

      await db.query(
        `INSERT INTO family_members (family_id, user_id, role, is_active, joined_at)
         VALUES ($1, $2, 'parent', TRUE, NOW())
         ON CONFLICT (family_id, user_id) DO UPDATE SET
           role = 'parent', is_active = TRUE, joined_at = NOW()`,
        [family.id, userNick],
      );

      res.json(family);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/family/me
  router.get("/me", requireAuth, async (req, res) => {
    try {
      const userNick = (req as any).userNick;
      const db = getDb();
      if (!db) return res.status(503).json({ error: "DB unavailable" });

      const familyRes = await db.query(
        `SELECT f.id, f.name, f.invite_code, f.created_by, f.region,
                f.avatar_seed, f.created_at, f.weekly_goal
         FROM families f
         JOIN family_members m ON m.family_id = f.id
         WHERE m.user_id = $1 AND m.is_active = TRUE
         LIMIT 1`,
        [userNick],
      );

      if (familyRes.rows.length === 0) return res.status(404).json({ error: "No family" });

      const family = familyRes.rows[0];

      const memberRes = await db.query(
        `SELECT user_id, role, joined_at, is_active,
                (SELECT COUNT(*) FROM behavioral_events be
                 WHERE be.user_id = fm.user_id
                   AND be.event_type IN ('scan_success', 'scan_garbage')
                   AND be.timestamp > NOW() - INTERVAL '7 days') AS contributions_weekly,
                (SELECT COUNT(*) FROM behavioral_events be
                 WHERE be.user_id = fm.user_id
                   AND be.event_type IN ('scan_success', 'scan_garbage')) AS contributions_total
         FROM family_members fm
         WHERE fm.family_id = $1
         ORDER BY joined_at ASC`,
        [family.id],
      );

      res.json({ family, members: memberRes.rows });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/family/join
  router.post("/join", requireAuth, async (req, res) => {
    try {
      const userNick = (req as any).userNick;
      const code = String(req.body.inviteCode || "").trim().toUpperCase();
      if (!code || code.length !== 6) {
        return res.status(400).json({ error: "Mã mời không hợp lệ" });
      }

      const db = getDb();
      if (!db) return res.status(503).json({ error: "DB unavailable" });

      // Check not already in another family
      const existing = await db.query(
        `SELECT family_id FROM family_members WHERE user_id = $1 AND is_active = TRUE`,
        [userNick],
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "Bạn đã ở trong một gia đình khác." });
      }

      const famRes = await db.query(
        `SELECT id, name, invite_code, created_by, region, avatar_seed, created_at
         FROM families WHERE invite_code = $1`,
        [code],
      );
      if (famRes.rows.length === 0) {
        return res.status(404).json({ error: "Mã mời không tồn tại" });
      }
      const family = famRes.rows[0];

      await db.query(
        `INSERT INTO family_members (family_id, user_id, role, is_active, joined_at)
         VALUES ($1, $2, 'child', TRUE, NOW())
         ON CONFLICT (family_id, user_id) DO UPDATE SET
           is_active = TRUE, joined_at = NOW()`,
        [family.id, userNick],
      );

      res.json(family);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/family/leave
  router.post("/leave", requireAuth, async (req, res) => {
    try {
      const userNick = (req as any).userNick;
      const db = getDb();
      if (!db) return res.status(503).json({ error: "DB unavailable" });

      await db.query(
        `UPDATE family_members SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE`,
        [userNick],
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/family/:id/challenges
  router.get("/:id/challenges", requireAuth, async (req, res) => {
    try {
      const familyId = req.params.id;
      const db = getDb();
      if (!db) return res.json({ challenges: [] });

      const { rows } = await db.query(
        `SELECT id, family_id, title, description, type, target, progress,
                EXTRACT(EPOCH FROM start_at) * 1000 AS start_at,
                EXTRACT(EPOCH FROM end_at) * 1000 AS end_at,
                reward, completed, created_by
         FROM family_challenges
         WHERE family_id = $1
           AND (completed = FALSE OR end_at > NOW() - INTERVAL '14 days')
         ORDER BY end_at DESC
         LIMIT 50`,
        [familyId],
      );
      res.json({ challenges: rows });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/family/:id/challenges (parent only)
  router.post("/:id/challenges", requireAuth, async (req, res) => {
    try {
      const userNick = (req as any).userNick;
      const familyId = req.params.id;
      const { title, description, type, target, endAt, reward } = req.body || {};

      if (!title || !type || !target) {
        return res.status(400).json({ error: "title, type, target required" });
      }

      const db = getDb();
      if (!db) return res.status(503).json({ error: "DB unavailable" });

      // Check parent role
      const memberCheck = await db.query(
        `SELECT role FROM family_members WHERE user_id = $1 AND family_id = $2 AND is_active = TRUE`,
        [userNick, familyId],
      );
      if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== "parent") {
        return res.status(403).json({ error: "Chỉ parent mới có thể tạo thử thách." });
      }

      const endAtDate = endAt ? new Date(endAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const { rows } = await db.query(
        `INSERT INTO family_challenges
           (family_id, title, description, type, target, end_at, reward, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, family_id, title, description, type, target, progress,
                   EXTRACT(EPOCH FROM start_at) * 1000 AS start_at,
                   EXTRACT(EPOCH FROM end_at) * 1000 AS end_at,
                   reward, completed, created_by`,
        [familyId, title, description || "", type, target, endAtDate, reward || 50, userNick],
      );

      res.json({ challenge: rows[0] });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/family/:id/carbon - aggregate weekly CO2 stats
  router.get("/:id/carbon", requireAuth, async (req, res) => {
    try {
      const familyId = req.params.id;
      const db = getDb();
      if (!db) return res.json({});

      // Per-member + per-category for the past 7 days
      const { rows } = await db.query(
        `SELECT
           m.user_id,
           COALESCE(SUM(CASE WHEN (be.metadata->>'eco_type')::text = 'plastic' THEN 1 ELSE 0 END), 0) AS plastic_scans,
           COALESCE(SUM(CASE WHEN (be.metadata->>'eco_type')::text = 'paper'  THEN 1 ELSE 0 END), 0) AS paper_scans,
           COALESCE(SUM(CASE WHEN (be.metadata->>'eco_type')::text = 'glass'  THEN 1 ELSE 0 END), 0) AS glass_scans,
           COALESCE(SUM(CASE WHEN (be.metadata->>'eco_type')::text = 'metal'  THEN 1 ELSE 0 END), 0) AS metal_scans,
           COALESCE(SUM(CASE WHEN (be.metadata->>'eco_type')::text = 'organic' THEN 1 ELSE 0 END), 0) AS organic_scans,
           COALESCE(SUM(CASE WHEN (be.metadata->>'eco_type')::text = 'hazard' THEN 1 ELSE 0 END), 0) AS hazard_scans,
           COUNT(*) FILTER (WHERE be.event_type IN ('scan_success', 'scan_garbage')) AS total_scans
         FROM family_members m
         LEFT JOIN behavioral_events be
           ON be.user_id = m.user_id
           AND be.event_type IN ('scan_success', 'scan_garbage')
           AND be.timestamp > NOW() - INTERVAL '7 days'
         WHERE m.family_id = $1 AND m.is_active = TRUE
         GROUP BY m.user_id`,
        [familyId],
      );

      // Also fetch from ai_scan_metrics (which has the same user_id) for more accurate counts
      const { rows: aiRows } = await db.query(
        `SELECT user_id, predicted_category, COUNT(*) AS n
         FROM ai_scan_metrics
         WHERE timestamp > NOW() - INTERVAL '7 days'
           AND user_id IN (SELECT user_id FROM family_members WHERE family_id = $1 AND is_active = TRUE)
         GROUP BY user_id, predicted_category`,
        [familyId],
      );

      // Aggregate per category
      const perCategory = { plastic: 0, paper: 0, glass: 0, metal: 0, organic: 0, hazard: 0 };
      const memberTotals = new Map<string, { scans: number; co2: number }>();

      for (const r of aiRows) {
        const cat = r.predicted_category as keyof typeof perCategory;
        if (cat in perCategory) {
          perCategory[cat] += Number(r.n);
        }
        const items = Number(r.n);
        const kg = (items * (AVG_ITEM_WEIGHT_G[cat] || 0)) / 1000;
        const co2 = kg * (CO2_FACTORS[cat] || 0);
        const prev = memberTotals.get(r.user_id) || { scans: 0, co2: 0 };
        memberTotals.set(r.user_id, {
          scans: prev.scans + items,
          co2: prev.co2 + co2,
        });
      }

      let totalScans = 0;
      let totalCo2Kg = 0;
      const perMember = Array.from(memberTotals.entries()).map(([userId, m]) => {
        totalScans += m.scans;
        totalCo2Kg += m.co2;
        return {
          userId,
          displayName: userId,
          scans: m.scans,
          co2Kg: Math.round(m.co2 * 100) / 100,
        };
      });

      const totalWasteKg =
        (perCategory.plastic * AVG_ITEM_WEIGHT_G.plastic +
          perCategory.paper * AVG_ITEM_WEIGHT_G.paper +
          perCategory.glass * AVG_ITEM_WEIGHT_G.glass +
          perCategory.metal * AVG_ITEM_WEIGHT_G.metal +
          perCategory.organic * AVG_ITEM_WEIGHT_G.organic +
          perCategory.hazard * AVG_ITEM_WEIGHT_G.hazard) /
        1000;

      // Compute prev week comparison
      const { rows: prevRows } = await db.query(
        `SELECT COUNT(*)::int AS n
         FROM ai_scan_metrics
         WHERE timestamp BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
           AND user_id IN (SELECT user_id FROM family_members WHERE family_id = $1 AND is_active = TRUE)`,
        [familyId],
      );
      const prevScans = prevRows[0]?.n || 0;
      const comparedToLastWeek =
        prevScans > 0
          ? ((totalScans - prevScans) / prevScans) * 100
          : totalScans > 0
          ? 100
          : 0;

      // Trees equivalent: 1 tree absorbs ~21 kg CO2/year
      const treesEquivalent = totalCo2Kg / 21;

      res.json({
        familyId,
        weekStart: getMondayISO(new Date()),
        totalCo2Kg: Math.round(totalCo2Kg * 100) / 100,
        totalWasteKg: Math.round(totalWasteKg * 100) / 100,
        perCategory: {
          plastic: Math.round((perCategory.plastic * AVG_ITEM_WEIGHT_G.plastic) / 1000 * 100) / 100,
          paper: Math.round((perCategory.paper * AVG_ITEM_WEIGHT_G.paper) / 1000 * 100) / 100,
          glass: Math.round((perCategory.glass * AVG_ITEM_WEIGHT_G.glass) / 1000 * 100) / 100,
          metal: Math.round((perCategory.metal * AVG_ITEM_WEIGHT_G.metal) / 1000 * 100) / 100,
          organic: Math.round((perCategory.organic * AVG_ITEM_WEIGHT_G.organic) / 1000 * 100) / 100,
          hazard: Math.round((perCategory.hazard * AVG_ITEM_WEIGHT_G.hazard) / 1000 * 100) / 100,
        },
        perMember: perMember.sort((a, b) => b.co2Kg - a.co2Kg),
        treesEquivalent: Math.round(treesEquivalent * 100) / 100,
        comparedToLastWeek: Math.round(comparedToLastWeek * 10) / 10,
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/family/:id/leaderboard
  router.get("/:id/leaderboard", requireAuth, async (req, res) => {
    try {
      const familyId = req.params.id;
      const db = getDb();
      if (!db) {
        return res.json({ familyId, rank: 0, percentile: 0, totalFamilies: 0 });
      }

      // Compute this family's weekly CO2
      const currentRes = await db.query(
        `SELECT COALESCE(SUM(
            CASE a.predicted_category
              WHEN 'plastic' THEN 0.025 * 2.5
              WHEN 'paper'   THEN 0.012 * 1.7
              WHEN 'glass'   THEN 0.200 * 0.6
              WHEN 'metal'   THEN 0.080 * 4.0
              WHEN 'organic' THEN 0.150 * 0.5
              ELSE 0
            END
          ), 0)::float AS co2
         FROM ai_scan_metrics a
         JOIN family_members m ON m.user_id = a.user_id
         WHERE m.family_id = $1
           AND m.is_active = TRUE
           AND a.timestamp > NOW() - INTERVAL '7 days'`,
        [familyId],
      );
      const weeklyCo2 = Number(currentRes.rows[0]?.co2 || 0);

      // Find rank by comparing against all families
      const rankRes = await db.query(
        `WITH weekly_co2 AS (
           SELECT m.family_id,
                  COALESCE(SUM(
                    CASE a.predicted_category
                      WHEN 'plastic' THEN 0.025 * 2.5
                      WHEN 'paper'   THEN 0.012 * 1.7
                      WHEN 'glass'   THEN 0.200 * 0.6
                      WHEN 'metal'   THEN 0.080 * 4.0
                      WHEN 'organic' THEN 0.150 * 0.5
                      ELSE 0
                    END
                  ), 0)::float AS co2
           FROM ai_scan_metrics a
           JOIN family_members m ON m.user_id = a.user_id
           WHERE m.is_active = TRUE
             AND a.timestamp > NOW() - INTERVAL '7 days'
           GROUP BY m.family_id
         )
         SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE co2 > $1)::int AS families_ahead
         FROM weekly_co2`,
        [weeklyCo2],
      );

      const totalFamilies = rankRes.rows[0]?.total || 0;
      const familiesAhead = rankRes.rows[0]?.families_ahead || 0;
      const rank = familiesAhead + 1;
      const percentile = totalFamilies > 0
        ? Math.round(((totalFamilies - rank) / totalFamilies) * 100)
        : 0;

      res.json({
        familyId,
        rank,
        percentile,
        totalFamilies,
        familyName: "(my family)",
        householdSize: 0,
        weeklyCo2: Math.round(weeklyCo2 * 100) / 100,
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}

function getMondayISO(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}
