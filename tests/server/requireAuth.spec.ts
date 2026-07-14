/**
 * tests/server/requireAuth.spec.ts
 *
 * Layer 2.3 — Regression spec for the `requireAuth` middleware. The key
 * invariant is: when a client supplies `nickname` in the body that
 * differs from the token's nick, the server still uses the token's
 * nick (impersonation protection).
 *
 * Pure-logic spec; runs under `npm test` and `tsx --test`.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { setSessionPersistence, initSessionStore } from "../../server/services/sessionStore.ts";
import {
  createSessionToken,
  requireAuth,
} from "../../server/auth.ts";
import type { Request, Response, NextFunction } from "express";

interface FakeReq extends Partial<Request> {
  headers: Record<string, string>;
  userNick?: string;
  isAdmin?: boolean;
  body?: Record<string, unknown>;
}

function fakeReq(authHeader?: string, body?: Record<string, unknown>): FakeReq {
  const headers: Record<string, string> = {};
  if (authHeader) headers.authorization = authHeader;
  return { headers, body };
}

interface CallRecord {
  status: number;
  body: unknown;
  ended: boolean;
}

function fakeRes(): { res: Response; calls: CallRecord } {
  const calls: CallRecord = { status: 200, body: undefined, ended: false };
  const res = {
    status(s: number) {
      calls.status = s;
      return this;
    },
    json(b: unknown) {
      calls.body = b;
      calls.ended = true;
      return this;
    },
    end() {
      calls.ended = true;
      return this;
    },
  } as unknown as Response;
  return { res, calls };
}

describe("requireAuth middleware (Layer 2.3)", () => {
  beforeEach(async () => {
    await setSessionPersistence(null);
    await initSessionStore();
  });

  it("rejects requests without an Authorization header", () => {
    const req = fakeReq();
    const { res, calls } = fakeRes();
    let called = false;
    requireAuth(req as Request, res, (() => {
      called = true;
    }) as NextFunction);
    assert.strictEqual(calls.status, 401);
    assert.strictEqual(called, false);
  });

  it("rejects requests with a malformed Authorization header", () => {
    const req = fakeReq("Basic abcdef");
    const { res, calls } = fakeRes();
    let called = false;
    requireAuth(req as Request, res, (() => {
      called = true;
    }) as NextFunction);
    assert.strictEqual(calls.status, 401);
    assert.strictEqual(called, false);
  });

  it("rejects requests with an unknown token", () => {
    const req = fakeReq("Bearer unknown-token-xyz");
    const { res, calls } = fakeRes();
    requireAuth(req as Request, res, (() => {}) as NextFunction);
    assert.strictEqual(calls.status, 401);
  });

  it("accepts a valid token and attaches userNick", () => {
    const token = createSessionToken("alice");
    const req = fakeReq(`Bearer ${token}`);
    const { res, calls } = fakeRes();
    let called = false;
    requireAuth(req as Request, res, (() => {
      called = true;
    }) as NextFunction);
    assert.strictEqual(calls.status, 200, `unexpected response: ${JSON.stringify(calls)}`);
    assert.strictEqual(called, true);
    assert.strictEqual((req as any).userNick, "alice");
  });

  it("does NOT trust body.nickname — auth wins", () => {
    // Even if the body says nickname=bob, the authenticated nick (alice)
    // is what req.userNick ends up being. This is the impersonation-
    // protection invariant.
    const token = createSessionToken("alice");
    const req = fakeReq(`Bearer ${token}`, { nickname: "bob" });
    const { res } = fakeRes();
    requireAuth(req as Request, res, (() => {}) as NextFunction);
    assert.strictEqual((req as any).userNick, "alice");
  });
});