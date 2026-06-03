/**
 * Research API Routes - ISEF Research Platform
 * Endpoints for experiments, data export, behavioral analytics, and researcher dashboard.
 */

import { Router, Request, Response } from "express";
import { getDb, isDbConnected } from "../db.js";
import { validateToken } from "../auth.js";

// Auth middleware for research routes
function requireAuth(req: Request, res: Response, next: () => void) {
  const result = validateToken(req.headers.authorization);
  if (!result) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as any).userNick = result.nick;
  next();
}

export const researchRouter = Router();

// Check research DB status
researchRouter.get("/status", async (req, res) => {
  const connected = isDbConnected();
  const db = getDb();
  if (!connected || !db) {
    return res.json({ status: "unavailable", message: "PostgreSQL not configured." });
  }
  try {
    const { rows } = await db.query("SELECT COUNT(*) as total_users FROM research_users");
    return res.json({ status: "connected", totalResearchUsers: parseInt(rows[0]?.total_users || "0") });
  } catch {
    return res.json({ status: "connected", totalResearchUsers: 0 });
  }
});

// Register user in research DB
researchRouter.post("/register-user", requireAuth, async (req, res) => {
  const { userId, username } = req.body;
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    await db.query(
      `INSERT INTO research_users (user_id, username) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET last_active = NOW(), username = COALESCE($2, research_users.username)`,
      [userId, username]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Log a behavioral event
researchRouter.post("/log-event", requireAuth, async (req, res) => {
  const { userId, eventType, metadata, sessionId } = req.body;
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    await db.query(
      `INSERT INTO behavioral_events (user_id, event_type, session_id, metadata) VALUES ($1, $2, $3, $4)`,
      [userId, eventType, sessionId || null, JSON.stringify(metadata || {})]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Get user's behavioral profile
researchRouter.get("/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    const { rows } = await db.query(
      `SELECT profile_type, confidence, metrics, last_updated FROM user_behavioral_profiles WHERE user_id = $1`,
      [userId]
    );
    if (rows.length === 0) {
      return res.json({ profile_type: "unknown", confidence: 0, metrics: {} });
    }
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Get user's personality mode
researchRouter.get("/personality/:userId", async (req, res) => {
  const { userId } = req.params;
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    const { rows } = await db.query(
      `SELECT personality_mode, round_id, current_round FROM personality_assignments WHERE user_id = $1`,
      [userId]
    );
    if (rows.length === 0) {
      return res.json({ personality_mode: "friendly", round_id: 1, current_round: 1 });
    }
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Get user's AI reflections
researchRouter.get("/reflections/:userId", async (req, res) => {
  const { userId } = req.params;
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    const { rows } = await db.query(
      `SELECT reflection_text, week_number, week_start, week_end, generated_at
       FROM ai_reflections WHERE user_id = $1 ORDER BY week_number DESC LIMIT 10`,
      [userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Get active interventions for user
researchRouter.get("/interventions/:userId", async (req, res) => {
  const { userId } = req.params;
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    const { rows } = await db.query(
      `SELECT intervention_type, triggered_by, triggered_at, effectiveness_score, metadata
       FROM adaptive_interventions WHERE user_id = $1 ORDER BY triggered_at DESC LIMIT 20`,
      [userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Get novelty decay status for user
researchRouter.get("/decay/:userId", async (req, res) => {
  const { userId } = req.params;
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    const { rows } = await db.query(
      `SELECT engagement_score, streak_stability, feature_diversity, days_since_login, recorded_at
       FROM novelty_decay_log WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 7`,
      [userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Researcher Dashboard: Overview metrics
researchRouter.get("/dashboard/overview", async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    const totalUsers = await db.query("SELECT COUNT(*) FROM research_users");
    const totalEvents = await db.query("SELECT COUNT(*) FROM behavioral_events");
    const personalityDist = await db.query(
      `SELECT personality_mode, COUNT(*) FROM personality_assignments GROUP BY personality_mode`
    );
    const profileDist = await db.query(
      `SELECT profile_type, COUNT(*) FROM user_behavioral_profiles GROUP BY profile_type`
    );
    const activeUsers7d = await db.query(
      `SELECT COUNT(DISTINCT user_id) FROM behavioral_events WHERE timestamp > NOW() - INTERVAL '7 days'`
    );
    const avgSessionDuration = await db.query(
      `SELECT AVG(duration_seconds) as avg_dur FROM research_sessions WHERE ended_at IS NOT NULL AND started_at > NOW() - INTERVAL '7 days'`
    );

    res.json({
      totalUsers: parseInt(totalUsers.rows[0]?.count || "0"),
      totalEvents: parseInt(totalEvents.rows[0]?.count || "0"),
      activeUsers7d: parseInt(activeUsers7d.rows[0]?.count || "0"),
      avgSessionDurationSeconds: parseFloat(avgSessionDuration.rows[0]?.avg_dur || "0"),
      personalityDistribution: personalityDist.rows,
      profileDistribution: profileDist.rows,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Researcher Dashboard: Retention metrics
researchRouter.get("/dashboard/retention", async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    const retention7d = await db.query(`
      WITH created AS (
        SELECT user_id, created_at::date as day FROM research_users
        WHERE created_at > NOW() - INTERVAL '30 days'
      ),
      active AS (
        SELECT DISTINCT user_id, DATE(timestamp) as day FROM behavioral_events
        WHERE timestamp > NOW() - INTERVAL '30 days'
      )
      SELECT c.day, COUNT(c.user_id) as created, COUNT(a.user_id) as retained
      FROM created c LEFT JOIN active a ON c.user_id = a.user_id AND a.day = c.day + 7
      GROUP BY c.day ORDER BY c.day
    `);
    res.json(retention7d.rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Researcher Dashboard: Intervention effectiveness
researchRouter.get("/dashboard/intervention-effectiveness", async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    const { rows } = await db.query(`
      SELECT intervention_type, COUNT(*) as count,
             AVG(effectiveness_score) as avg_effectiveness
      FROM adaptive_interventions
      WHERE effectiveness_score IS NOT NULL
      GROUP BY intervention_type
      ORDER BY avg_effectiveness DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Researcher Dashboard: Personality comparison (HCI experiment)
researchRouter.get("/dashboard/personality-comparison", async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    const { rows } = await db.query(`
      SELECT p.personality_mode,
             COUNT(DISTINCT p.user_id) as user_count,
             AVG(EXTRACT(EPOCH FROM (s.ended_at - s.started_at))) as avg_session_duration,
             AVG(s.actions_count) as avg_actions
      FROM personality_assignments p
      LEFT JOIN research_sessions s ON p.user_id = s.user_id
      GROUP BY p.personality_mode
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Researcher Dashboard: Engagement decay curve
researchRouter.get("/dashboard/engagement-decay", async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    const { rows } = await db.query(`
      SELECT DATE(recorded_at) as day,
             AVG(engagement_score) as avg_engagement,
             COUNT(DISTINCT user_id) as user_count
      FROM novelty_decay_log
      WHERE recorded_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(recorded_at)
      ORDER BY day
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Export data as CSV
researchRouter.get("/export/:type", requireAuth, async (req, res) => {
  const { type } = req.params;
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });

  const validTypes = ["events", "interventions", "decay", "reflections", "sessions", "metrics"];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid export type" });
  }

  const tableMap: Record<string, string> = {
    events: "behavioral_events",
    interventions: "adaptive_interventions",
    decay: "novelty_decay_log",
    reflections: "ai_reflections",
    sessions: "research_sessions",
    metrics: "experiment_metrics",
  };

  try {
    const { rows } = await db.query(`SELECT * FROM ${tableMap[type]} ORDER BY 1 DESC LIMIT 50000`);
    if (rows.length === 0) {
      return res.json({ message: "No data to export", count: 0 });
    }
    const headers = Object.keys(rows[0]).join(",");
    const csvRows = rows.map((r: any) =>
      Object.values(r).map((v: any) => {
        const str = String(v ?? "");
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(",")
    );
    const csv = [headers, ...csvRows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${type}_export_${Date.now()}.csv"`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Multi-layer leaderboard
researchRouter.get("/leaderboard/:type", async (req, res) => {
  const { type } = req.params;
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  try {
    let query = "";
    switch (type) {
      case "weekly":
        query = `
          SELECT u.user_id, ru.username, ws.points_earned as score, ws.sessions_count
          FROM weekly_scores ws
          JOIN research_users ru ON ws.user_id = ru.user_id
          WHERE ws.week_start = $1
          ORDER BY ws.points_earned DESC LIMIT 20`;
        break;
      case "consistency":
        query = `
          SELECT u.user_id, ru.username, ws.streak_days as score, ws.consistency_score
          FROM weekly_scores ws
          JOIN research_users ru ON ws.user_id = ru.user_id
          WHERE ws.week_start = $1
          ORDER BY ws.streak_days DESC LIMIT 20`;
        break;
      case "improvement":
        query = `
          SELECT u.user_id, ru.username, ws.improvement_pct as score, ws.points_earned
          FROM weekly_scores ws
          JOIN research_users ru ON ws.user_id = ru.user_id
          WHERE ws.week_start = $1 AND ws.improvement_pct > 0
          ORDER BY ws.improvement_pct DESC LIMIT 20`;
        break;
      case "eco_impact":
        query = `
          SELECT u.user_id, ru.username, ws.eco_impact_score as score
          FROM weekly_scores ws
          JOIN research_users ru ON ws.user_id = ru.user_id
          WHERE ws.week_start = $1
          ORDER BY ws.eco_impact_score DESC LIMIT 20`;
        break;
      default:
        return res.status(400).json({ error: "Invalid leaderboard type" });
    }
    const { rows } = await db.query(query, [weekStart]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Raw events query (for researchers)
researchRouter.get("/events", async (req, res) => {
  const { userId, eventType, from, to, limit = "1000" } = req.query;
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (userId) { conditions.push(`user_id = $${paramIdx++}`); params.push(userId); }
    if (eventType) { conditions.push(`event_type = $${paramIdx++}`); params.push(eventType); }
    if (from) { conditions.push(`timestamp >= $${paramIdx++}`); params.push(from); }
    if (to) { conditions.push(`timestamp <= $${paramIdx++}`); params.push(to); }
    conditions.push(`timestamp > NOW() - INTERVAL '90 days'`);
    params.push(parseInt(limit as string));

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await db.query(
      `SELECT * FROM behavioral_events ${where} ORDER BY timestamp DESC LIMIT $${paramIdx}`,
      params
    );
    res.json({ count: rows.length, data: rows });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Record intervention effectiveness
researchRouter.post("/intervention-effectiveness", requireAuth, async (req, res) => {
  const { interventionType, userId, baselineScore, postScore, daysToEffect } = req.body;
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    const { rows } = await db.query(
      `INSERT INTO intervention_effectiveness (intervention_type, user_id, baseline_score, post_intervention_score, delta, days_to_effect)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [interventionType, userId || null, baselineScore, postScore, postScore - baselineScore, daysToEffect || 0]
    );
    res.json({ success: true, record: rows[0] });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Record experiment metric
researchRouter.post("/experiment-metric", requireAuth, async (req, res) => {
  const { experimentId, metricName, groupName, value, userId } = req.body;
  const db = getDb();
  if (!db) return res.status(503).json({ error: "Research DB unavailable" });
  try {
    await db.query(
      `INSERT INTO experiment_metrics (experiment_id, metric_name, group_name, value, user_id) VALUES ($1, $2, $3, $4, $5)`,
      [experimentId, metricName, groupName, value, userId || null]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function getWeekEnd(): string {
  const start = new Date(getWeekStart());
  start.setDate(start.getDate() + 6);
  return start.toISOString().split("T")[0];
}
