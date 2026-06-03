/**
 * Shared auth utilities for route middleware
 * Centralizes session token management and auth validation
 */

import crypto from "crypto";
import express from "express";

export const sessionTokens = new Map<string, { nick: string; expires: number }>();
const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createSessionToken(nick: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessionTokens.set(token, { nick, expires: Date.now() + TOKEN_TTL });
  return token;
}

export function validateToken(authHeader: string | undefined): { nick: string; isAdmin: boolean } | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const session = sessionTokens.get(token);
  if (!session || session.expires < Date.now()) {
    if (session && session.expires < Date.now()) sessionTokens.delete(token);
    return null;
  }
  return { nick: session.nick, isAdmin: false };
}

export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const result = validateToken(req.headers.authorization);
  if (!result) return res.status(401).json({ error: "Unauthorized" });
  (req as any).userNick = result.nick;
  next();
}
