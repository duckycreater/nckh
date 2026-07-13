/**
 * audit.ts — Per-user audit timeline endpoint.
 *
 * The tamper-evident Merkle trail (`auditTrail.ts`) covers cross-cutting
 * research events (FL rounds, cohort assignments). For UX we also expose
 * a per-user slice of the existing `eventLogger` so that end-users can
 * see what data has been collected about them.
 *
 * GET /api/audit/timeline?limit=20&cursor=…
 *
 * `cursor` is the seq number of the last row already shown. The endpoint
 * returns rows strictly newer than `cursor`, oldest-first within the
 * page. When the response carries a non-null `cursor`, the client may
 * page again.
 */

import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db.js";
import { requireAuth } from "../auth.js";
import { zodValidate } from "../middleware/zodValidate.js";

const TimelineQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.coerce.number().int().nonnegative().optional(),
});

interface TimelineRow {
  id: string;
  ts: number;
  type: string;
  payload: Record<string, unknown>;
}

interface Row {
  id: number;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

export function auditRouter(): Router {
  const router = Router();

  router.get(
    "/timeline",
    requireAuth,
    zodValidate({ query: TimelineQuery }),
    async (req, res) => {
      try {
        const parsed = (res.locals.query ?? req.query) as z.infer<typeof TimelineQuery>;
        const limit = parsed.limit;
        const cursor = parsed.cursor ?? null;
        const nick = (req as {userNick?: string}).userNick;
        if (!nick) return res.status(401).json({ok: false, error: "auth required"});

      const db = getDb();
      if (!db) {
        // Offline / dev mode: return a small synthetic example so the UI
        // still has something to render.
        return res.json({
          ok: true,
          events: exampleTimeline(nick),
          cursor: null,
        });
      }

      // The research events table has (id, account_id, event_type, event_data, created_at).
      // Map to the AuditEvent shape consumed by AuditTimeline.tsx.
      const params: unknown[] = [nick];
      let cursorClause = "";
      if (cursor !== null && Number.isFinite(cursor)) {
        cursorClause = "AND id > $2";
        params.push(cursor);
      }
      params.push(limit + 1); // +1 to detect "has more"
      const sql = `
        SELECT id, event_type, event_data, created_at
        FROM research_events
        WHERE account_id = $1 ${cursorClause}
        ORDER BY id DESC
        LIMIT $${params.length}
      `;
      const result = await db.query(sql, params);
      const rows = result.rows as Row[];
      const sliced = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? String(sliced[sliced.length - 1].id) : null;
      const events: TimelineRow[] = sliced
        .slice()
        .reverse() // oldest first for the UI
        .map((r) => ({
          id: String(r.id),
          ts: new Date(r.created_at).getTime(),
          type: r.event_type,
          payload: r.event_data || {},
        }));

      res.json({ok: true, events, cursor: nextCursor, locale: (req as any).locale?.locale ?? null});
    } catch (e) {
      res.status(500).json({ok: false, error: (e as Error).message});
    }
  });

  return router;
}

/* Offline fallback shown when the research DB is not configured. */
function exampleTimeline(nick: string): TimelineRow[] {
  const now = Date.now();
  return [
    {
      id: "demo-1",
      ts: now - 1000 * 60 * 30,
      type: "scan",
      payload: {image_hash: "a1b2c3d4e5f6a1b2"},
    },
    {
      id: "demo-2",
      ts: now - 1000 * 60 * 12,
      type: "chat_message",
      payload: {message_length: 42},
    },
    {
      id: "demo-3",
      ts: now - 1000 * 60 * 5,
      type: "consent",
      payload: {consent: true},
    },
  ];
}