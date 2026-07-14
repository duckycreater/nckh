/**
 * tests/server/disabledAccount.spec.ts — Layer 2.10
 *
 * Verifies the in-process account-disable flag:
 *   1. A fresh token grants access.
 *   2. After disableUser(nick), the same token is rejected at
 *      `validateSessionToken`.
 *   3. enableUser(nick) restores access (and the next call to
 *      `requireAuth` then sets `req.userNick`).
 *
 * Run with: `npx tsx --test tests/server/disabledAccount.spec.ts`
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  createSessionToken,
  validateSessionToken,
  disableUser,
  enableUser,
} from "../../server/services/sessionStore.ts";

test("disabledAccount: fresh token validates", () => {
  const token = createSessionToken("alpha");
  const rec = validateSessionToken(token);
  assert.ok(rec, "expected session to validate");
  assert.equal(rec!.nick, "alpha");
});

test("disabledAccount: disableUser blocks the same token", () => {
  const token = createSessionToken("bravo");
  assert.ok(validateSessionToken(token));
  disableUser("BRAVO"); // case-insensitive on purpose
  const rec = validateSessionToken(token);
  assert.equal(rec, null, "session must be rejected after disable");
});

test("disabledAccount: enableUser restores access (after re-login)", () => {
  const t1 = createSessionToken("charlie");
  disableUser("charlie");
  assert.equal(validateSessionToken(t1), null);
  enableUser("charlie");
  // Old token was purged from cache at disable time, so a fresh
  // login is required.
  assert.equal(validateSessionToken(t1), null);
  const t2 = createSessionToken("charlie");
  assert.ok(validateSessionToken(t2));
});

test("disabledAccount: case-insensitive nick", () => {
  const t = createSessionToken("DeltaUser");
  disableUser("deltauser");
  assert.equal(validateSessionToken(t), null);
});

test("disabledAccount: purges ALL cached tokens for the user", () => {
  const t1 = createSessionToken("echo");
  const t2 = createSessionToken("echo");
  assert.ok(validateSessionToken(t1));
  assert.ok(validateSessionToken(t2));
  disableUser("echo");
  assert.equal(validateSessionToken(t1), null);
  assert.equal(validateSessionToken(t2), null);
});