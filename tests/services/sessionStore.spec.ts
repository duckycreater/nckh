/**
 * tests/services/sessionStore.spec.ts
 *
 * Coverage for the in-memory + persistence layer of sessionStore.
 * Persistence is hooked in via setSessionPersistence() with a fake
 * implementation that records every query — no real Supabase needed.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import "../../vitest.node-test-bridge.ts";

import {
  createSessionToken,
  validateSessionToken,
  revokeSessionToken,
  hashPassword,
  verifyPassword,
  isLikelyHash,
  initSessionStore,
  setSessionPersistence,
} from "../../server/services/sessionStore.js";

interface DbCall {
  op: "insert" | "delete" | "sweep";
  token: string;
  rec?: unknown;
}

let calls: DbCall[] = [];

beforeEach(() => {
  calls = [];
  setSessionPersistence({
    insert: async (token, rec) => {
      calls.push({ op: "insert", token, rec });
    },
    delete: async (token) => {
      calls.push({ op: "delete", token });
    },
    sweep: async () => {
      calls.push({ op: "sweep", token: "" });
    },
  });
});

afterEach(() => {
  setSessionPersistence(null);
});

describe("sessionStore.token lifecycle", () => {
  it("createSessionToken returns a 64-char hex string", () => {
    const token = createSessionToken("alice");
    assert.match(token, /^[0-9a-f]{64}$/);
  });

  it("validateSessionToken returns the just-created record", () => {
    const token = createSessionToken("bob", false);
    const rec = validateSessionToken(token);
    assert.ok(rec, "expected a record");
    assert.equal(rec.nick, "bob");
    assert.equal(rec.isAdmin, false);
    assert.ok(rec.expires > Date.now(), "expires should be in the future");
  });

  it("validateSessionToken returns null for unknown token", () => {
    const rec = validateSessionToken("deadbeef".repeat(8));
    assert.equal(rec, null);
  });

  it("revokeSessionToken invalidates the token", () => {
    const token = createSessionToken("carol");
    revokeSessionToken(token);
    assert.equal(validateSessionToken(token), null);
  });

  it("initSessionStore sweeps expired entries and runs sweep", async () => {
    const token = createSessionToken("dave");
    const rec = validateSessionToken(token);
    assert.ok(rec);
    // Force-expire
    rec.expires = Date.now() - 1000;
    await initSessionStore();
    assert.equal(validateSessionToken(token), null);
    // sweep was invoked
    assert.ok(calls.some((c) => c.op === "sweep"), "expected sweep call");
  });
});

describe("sessionStore.password hashing", () => {
  it("hashPassword + verifyPassword round-trip", async () => {
    const hash = await hashPassword("hunter2");
    assert.ok(isLikelyHash(hash), "expected bcrypt hash prefix");
    assert.equal(await verifyPassword("hunter2", hash), true);
    assert.equal(await verifyPassword("wrong", hash), false);
  });

  it("verifyPassword accepts legacy plaintext (for data.json migration)", async () => {
    assert.equal(await verifyPassword("plain", "plain"), true);
    assert.equal(await verifyPassword("plain", "other"), false);
  });
});

describe("sessionStore.utils", () => {
  it("isLikelyHash detects $2a/$2b/$2y prefix", () => {
    assert.equal(isLikelyHash("$2a$10$abc"), true);
    assert.equal(isLikelyHash("$2b$10$abc"), true);
    assert.equal(isLikelyHash("$2y$10$abc"), true);
    assert.equal(isLikelyHash("plain"), false);
    assert.equal(isLikelyHash(""), false);
  });

  it("createSessionToken fires a persist insert when persistence is configured", async () => {
    const token = createSessionToken("eve");
    // Let the void insert Promise resolve
    await new Promise((r) => setTimeout(r, 0));
    assert.ok(
      calls.some((c) => c.op === "insert" && c.token === token),
      `expected insert for ${token}, got ${JSON.stringify(calls)}`,
    );
  });

  it("revoke fires a persist delete", async () => {
    const token = createSessionToken("frank");
    await new Promise((r) => setTimeout(r, 0));
    revokeSessionToken(token);
    await new Promise((r) => setTimeout(r, 0));
    assert.ok(
      calls.some((c) => c.op === "delete" && c.token === token),
      "expected delete for token",
    );
  });
});