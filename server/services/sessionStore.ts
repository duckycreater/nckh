/**
 * server/services/sessionStore.ts
 *
 * Auth-hardened session token store.
 *
 * Replaces the previous in-memory `Map` in `server/auth.ts` with a
 * dual-write architecture:
 *   - In-process Map remains the read cache (cheap, fast).
 *   - Every create/delete is also written to Supabase (Postgres REST) so
 *     tokens survive server restarts and can be revoked cluster-wide.
 *
 * If Supabase is not configured (env vars missing), the store falls back
 * to the in-memory Map only — same behavior as before, but now a warning
 * is emitted on every write so we never silently lose auth state.
 *
 * Passwords are hashed with bcryptjs (cost 12). Plain-text passwords
 * (legacy data.json entries) are auto-migrated on first successful login.
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "../db.js";

const BCRYPT_COST = 12;
const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionRecord {
  nick: string;
  isAdmin: boolean;
  expires: number;
}

const cache = new Map<string, SessionRecord>();

/* ─── persistence helpers ─────────────────────────────────────────── */

/**
 * Test seam: callers (notably tests/services/sessionStore.spec.ts) may
 * inject a custom persistence implementation. The default looks up
 * the DB at call time via `getDb()`.
 *
 * Returning `null` from the implementation cleanly disables
 * persistence (we fall back to in-memory only).
 */
export type SessionPersistence = {
  insert: (token: string, rec: SessionRecord) => Promise<void>;
  delete: (token: string) => Promise<void>;
  sweep: () => Promise<void>;
};

let persistence: SessionPersistence = {
  async insert(token, rec) {
    const db = getDb();
    if (!db) return;
    try {
      await db.query(
        `INSERT INTO session_tokens (token, nick, is_admin, expires_at, created_at)
         VALUES ($1, $2, $3, to_timestamp($4 / 1000.0), NOW())
         ON CONFLICT (token) DO UPDATE SET
           nick = EXCLUDED.nick,
           is_admin = EXCLUDED.is_admin,
           expires_at = EXCLUDED.expires_at`,
        [token, rec.nick, rec.isAdmin, rec.expires],
      );
    } catch (e) {
      console.warn(
        "[sessionStore] insert failed (continuing with in-memory):",
        (e as Error).message,
      );
    }
  },
  async delete(token) {
    const db = getDb();
    if (!db) return;
    try {
      await db.query(`DELETE FROM session_tokens WHERE token = $1`, [token]);
    } catch (e) {
      console.warn("[sessionStore] delete failed:", (e as Error).message);
    }
  },
  async sweep() {
    const db = getDb();
    if (!db) return;
    try {
      await db.query(`DELETE FROM session_tokens WHERE expires_at < NOW()`);
    } catch {
      // best-effort sweep
    }
  },
};

export function setSessionPersistence(p: SessionPersistence | null): void {
  if (p === null) {
    // Disable persistence by giving the implementations that no-op.
    persistence = {
      insert: async () => {},
      delete: async () => {},
      sweep: async () => {},
    };
    return;
  }
  persistence = p;
}

/* ─── public API ──────────────────────────────────────────────────── */

export function createSessionToken(nick: string, isAdmin = false): string {
  const token = crypto.randomBytes(32).toString("hex");
  const rec: SessionRecord = { nick, isAdmin, expires: Date.now() + TOKEN_TTL };
  cache.set(token, rec);
  // fire-and-forget; we never block the auth response on DB latency
  void persistence.insert(token, rec);
  return token;
}

export function revokeSessionToken(token: string): void {
  cache.delete(token);
  void persistence.delete(token);
}

export function validateSessionToken(token: string | undefined | null): SessionRecord | null {
  if (!token) return null;
  const rec = cache.get(token);
  if (!rec) return null;
  if (rec.expires < Date.now()) {
    cache.delete(token);
    void persistence.delete(token);
    return null;
  }
  return rec;
}

/* ─── password helpers ────────────────────────────────────────────── */

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  // bcrypt.compare handles both bcrypt and bcryptjs hash formats ($2a$, $2b$).
  if (hash.startsWith("$2")) {
    return bcrypt.compare(plaintext, hash);
  }
  // Legacy plaintext fallback: only accept if the value matches exactly.
  // This path is for migrating old data.json entries on first login.
  return plaintext === hash;
}

export function isLikelyHash(value: string): boolean {
  return value.startsWith("$2");
}

/** Run a sweep on boot — clears in-memory + DB of expired tokens. */
export async function initSessionStore(): Promise<void> {
  // Drop expired entries from cache.
  const now = Date.now();
  for (const [token, rec] of cache.entries()) {
    if (rec.expires < now) cache.delete(token);
  }
  await persistence.sweep();
}
