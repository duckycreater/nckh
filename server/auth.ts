/**
 * Shared auth utilities for route middleware
 *
 * D3: Token storage is now backed by `server/services/sessionStore.ts`
 * which persists to Supabase in addition to keeping the in-process
 * cache. Passwords are bcrypt-hashed (cost 12) and legacy plaintext
 * values are auto-migrated on first successful login.
 */

import express from "express";
import {
  createSessionToken as createToken,
  validateSessionToken,
  hashPassword,
  verifyPassword,
  isLikelyHash,
  revokeSessionToken,
} from "./services/sessionStore.js";

export { hashPassword, verifyPassword, isLikelyHash, revokeSessionToken };

export function createSessionToken(nick: string, isAdmin = false): string {
  return createToken(nick, isAdmin);
}

export function validateToken(authHeader: string | undefined): { nick: string; isAdmin: boolean } | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const rec = validateSessionToken(token);
  if (!rec) return null;
  return { nick: rec.nick, isAdmin: rec.isAdmin };
}

export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const result = validateToken(req.headers.authorization);
  if (!result) return res.status(401).json({ error: "Unauthorized" });
  (req as any).userNick = result.nick;
  (req as any).isAdmin = result.isAdmin;
  next();
}
