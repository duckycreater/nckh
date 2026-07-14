/**
 * server/auth.ts — Shared auth utilities for route middleware.
 *
 * The session store persists to Supabase and keeps an in-process cache;
 * passwords are bcrypt-hashed (cost 12) with legacy-plaintext
 * auto-migration on first successful login.
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

/** Layer 2.3 — derive the caller's nick from the validated token. */
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const result = validateToken(req.headers.authorization);
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  // `userNick` is the only identity we trust on state-mutating routes.
  // We deliberately ignore `req.body.nickname` even if the client sends
  // one — this prevents impersonation attacks where a user submits a
  // request with another user's nick and the server grants it.
  (req as any).userNick = result.nick;
  (req as any).isAdmin = result.isAdmin;
  next();
}

/**
 * Convenience: extract the authenticated nick from a request, throwing a
 * `TypeError` if `requireAuth` wasn't run upstream. Routes that call this
 * without `requireAuth` get a loud failure rather than silently defaulting
 * to `undefined`.
 */
export function getRequestNick(req: express.Request): string {
  const nick = (req as any).userNick;
  if (typeof nick !== "string" || nick.length === 0) {
    throw new TypeError(
      "getRequestNick called on a request that was not authenticated; " +
        "mount requireAuth middleware first",
    );
  }
  return nick;
}
