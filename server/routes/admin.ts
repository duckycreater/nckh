/** Server-side admin route guard for legacy paths. */

import { Router } from "express";
import { validateToken } from "../auth.js";

export const adminRouter = Router();

/** Authenticate admin routes without importing bootstrap (which mounts this router). */
function requireAdmin(req: any, res: any, next: any) {
  const apiKey = req.headers["x-admin-key"] as string | undefined;
  const configuredKey = process.env.ADMIN_API_KEY;
  if (configuredKey && apiKey && apiKey === configuredKey) return next();

  const result = validateToken(req.headers.authorization);
  if (!result) return res.status(401).json({ error: "Unauthorized" });
  if (!result.isAdmin) return res.status(403).json({ error: "Forbidden" });
  req.userNick = result.nick;
  req.isAdmin = result.isAdmin;
  return next();
}

/** Get the admin API key from server-side environment. */
function getServerAdminKey(): string {
  return process.env.ADMIN_API_KEY || "";
}

/** Legacy endpoint retained for compatibility until a real sync job is wired. */
adminRouter.post("/sheets/sync", requireAdmin, async (req, res) => {
  return res.status(501).json({
    success: false,
    error: "not_implemented",
    message: "Use the configured Sheets sync job endpoint.",
  });
});

/**
 * POST /api/admin/sheets/export
 * Export data to Google Sheets (admin only)
 */
adminRouter.post("/sheets/export", requireAdmin, async (req, res) => {
  return res.status(501).json({
    success: false,
    error: "not_implemented",
    message: "Use the configured Sheets export job endpoint.",
  });
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
adminRouter.get("/stats", requireAdmin, async (req, res) => {
  return res.status(501).json({
    success: false,
    error: "not_implemented",
    message: "Use the research and user statistics endpoints.",
  });
});

/**
 * POST /api/admin/quiz/reorder
 * Reorder quiz questions (admin only)
 */
adminRouter.post("/quiz/reorder", requireAdmin, async (req, res) => {
  return res.status(501).json({
    success: false,
    error: "not_implemented",
    message: "Use /api/admin/quiz/questions/reorder.",
  });
});

/**
 * POST /api/admin/quiz/bulk-import
 * Bulk import quiz questions (admin only)
 */
adminRouter.post("/quiz/bulk-import", requireAdmin, async (req, res) => {
  return res.status(501).json({
    success: false,
    error: "not_implemented",
    message: "Use /api/admin/quiz/questions/import.",
  });
});

/**
 * Export the admin key for use in other server-side operations.
 * This is used by other server routes that need admin privileges.
 */
export function getAdminKey(): string {
  return getServerAdminKey();
}
