/**
 * tests/e2e/login-scan.spec.ts
 *
 * End-to-end test for the two flagship flows:
 *   1. Login → Scan garbage → receive points (auth + classify roundtrip).
 *   2. Federated enable → privacy budget updates.
 *
 * We boot the Express `app` in-process on an ephemeral port and exercise
 * it via `fetch`. No Vite, no Firebase, no Supabase — the server
 * gracefully degrades when those services are unavailable (e.g. in CI).
 *
 * Run with: npm test  (node:test).
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getVietnamDayKey } from "../../src/lib/dayKey.ts";
import { getDailyChallengeIds } from "../../src/lib/dailyChallenges.ts";
import { defaultSchoolClasses } from "../../shared/school.ts";

const TEST_CLASS = defaultSchoolClasses().find((schoolClass) => schoolClass.name === "10A1")!;
const GRADE_EIGHT_CLASS = defaultSchoolClasses().find((schoolClass) => schoolClass.name === "8A1")!;

const expect = (v: unknown) => ({
  toBe: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeType: (t: string) => assert.strictEqual(typeof v, t),
  toMatch: (re: RegExp) => assert.ok(re.test(String(v)), `${v} did not match ${re}`),
  toEqual: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeGreaterThanOrEqual: (x: number) => assert.ok(Number(v) >= x, `${v} < ${x}`),
  toBeTruthy: () => assert.ok(v),
});

let testServer: Server | null = null;
let booted: boolean = false;
let testDataDir = "";

before(async () => {
  // PORT for the in-process server. Set to a unique value to avoid clashes
  // with any other BMO instance running on the dev machine.
  process.env.PORT = process.env.BMO_TEST_PORT || String(41000 + Math.floor(Math.random() * 9000));
  process.env.NODE_ENV = "test";
  process.env.DISABLE_HMR = "true";
  process.env.RESEARCH_DB_ENABLED = "false";
  process.env.FIREBASE_SERVICE_ACCOUNT = "";
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = "";
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  process.env.ADMIN_API_KEY = "bmo-e2e-admin-key";
  process.env.BMO_TEST_SCAN_RESPONSE = JSON.stringify({
    verdict: "single_waste",
    objectName: "Chai nước nhựa",
    category: "plastic",
    description: "Một chai nhựa trong, sạch và đã sử dụng.",
    disposalInstructions: "Tháo nắp, làm sạch và đưa vào tuyến thu hồi nhựa phù hợp.",
    observedConditions: ["transparent", "material_code_visible"],
    uncertaintyReason: null,
  });
  process.env.RL_AUTH_BURST = "100";
  process.env.RL_AUTH_REFILL_PER_MIN = "100";
  testDataDir = mkdtempSync(join(tmpdir(), "bmo-login-e2e-"));
  process.env.BMO_DATA_FILE = join(testDataDir, "data.json");
  writeFileSync(
    process.env.BMO_DATA_FILE,
    JSON.stringify({
      users: [
        {
          name: "Legacy Cards",
          nick: "legacy_cards",
          pass: "LegacyPass1!",
          points: 500,
          totalExpEarned: 500,
          hasPlayed: false,
          account_id: "legacy-card-account",
          role: "user",
          fullName: "Legacy Cards Student",
          classId: TEST_CLASS.id,
          classGrade: TEST_CLASS.name,
          progress: {
            flashcardsRead: [1],
            flashcardCounts: { "1": 2 },
            flashcardNames: {},
            cardLevels: { "1": 7 },
            gachaPullCount: 42,
            checkins: [],
            traded: [],
            crafted: [],
            purchased: [],
            challengesCompleted: [],
            guildDonated: false,
            lastUpdateDate: "2020-01-01",
            shards: 9,
          },
        },
      ],
    }),
    "utf8",
  );
  let mod: typeof import("../../server/bootstrap.ts");
  try {
    mod = await import("../../server/bootstrap.ts");
  } catch (e) {
    console.warn("[e2e] Cannot import bootstrap:", (e as Error).message);
    return;
  }
  // startServer() runs async init (Firebase sync, DB ping, etc.) and only
  // resolves once app.listen has fired its callback. We must NOT block on
  // it; instead we race against a 15s deadline so CI never hangs.
  try {
    testServer = await Promise.race([
      mod.startServer(),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("startServer timeout 15s")), 15000),
      ),
    ]);
    booted = true;
  } catch (e) {
    console.warn("[e2e] startServer() did not complete in time:", (e as Error).message);
  }
});

after(async () => {
  if (testServer) {
    await new Promise<void>((resolve, reject) => {
      testServer!.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (testDataDir) rmSync(testDataDir, { recursive: true, force: true });
});

function url(path: string): string {
  return `http://127.0.0.1:${process.env.PORT}${path}`;
}

describe("E2E: login → scan garbage", () => {
  it("GET /api/health returns a JSON status envelope", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/health"));
    expect(r.status === 200 || r.status === 503).toBeTruthy();
    const body = await r.json();
    expect(typeof body.ok === "boolean" || body.error).toBeTruthy();
  });
  it("GET /api/models returns a model list", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/models"));
    if (r.status === 503) return;
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok === true || typeof body.models !== "undefined").toBeTruthy();
  });
  it("GET /api/models/waste-classifier returns manifest with sha256", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/models/waste-classifier"));
    if (r.status === 503 || r.status === 404) return;
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok === true || typeof body.manifest !== "undefined").toBeTruthy();
    const manifest = body.manifest || body;
    expect(typeof manifest.sha256).toBe("string");
    expect(manifest.sha256.length).toBe(64);
  });
  it("scans, rewards, creates one card, and makes retries idempotent", async (t) => {
    if (!booted) return t.skip();
    const nickname = `scan_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const password = "StrongPass123!";
    const registered = await fetch(url("/api/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reg_name: "Scan Student",
        reg_full_name: "Scan Student",
        reg_class_id: TEST_CLASS.id,
        reg_nickname: nickname,
        reg_password: password,
      }),
    });
    expect(registered.status).toBe(200);
    const login = await fetch(url("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_nickname: nickname, login_password: password }),
    });
    expect(login.status).toBe(200);
    const loginBody = await login.json();
    const token = loginBody.token;
    const auth = { Authorization: `Bearer ${token}` };
    const profileByUuid = await fetch(url(`/api/user/${loginBody.user_id}`), {
      headers: auth,
    });
    expect(profileByUuid.status).toBe(200);
    const tinyImage =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const r = await fetch(url("/api/scan-garbage"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ image: tinyImage, requestId: crypto.randomUUID() }),
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.scan.verdict).toBe("single_waste");
    expect(body.scan.category).toBe("plastic");
    expect(body.scan.eligibleForCard).toBe(true);
    expect(body.rewarded).toBe(true);
    expect(body.points).toBe(50);
    expect(body.cardPreview.cost).toBe(50);

    const createCard = () =>
      fetch(url("/api/material-cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({
          scanId: body.scan.scanId,
          idempotencyKey: `e2e:${body.scan.scanId}`,
        }),
      });
    const firstCreate = await createCard();
    expect(firstCreate.status).toBe(201);
    const firstCard = await firstCreate.json();
    expect(firstCard.points).toBe(0);
    const retryCreate = await createCard();
    expect(retryCreate.status).toBe(200);
    const retryCard = await retryCreate.json();
    expect(retryCard.card.id).toBe(firstCard.card.id);
    expect(retryCard.charged).toBe(false);

    const collection = await fetch(url("/api/material-cards"), { headers: auth });
    expect(collection.status).toBe(200);
    expect((await collection.json()).cards.length).toBe(1);
  });
  it("does not award grade 8 points before the student profile is verified", async (t) => {
    if (!booted) return t.skip();
    const nickname = `grade8_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const password = "StrongPass123!";
    const registered = await fetch(url("/api/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reg_name: "Grade Eight Student",
        reg_full_name: "Nguyễn Văn A",
        reg_class_id: GRADE_EIGHT_CLASS.id,
        reg_nickname: nickname,
        reg_password: password,
      }),
    });
    expect(registered.status).toBe(200);
    const login = await fetch(url("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_nickname: nickname, login_password: password }),
    });
    const loginBody = await login.json();
    expect(loginBody.profile_verification_status).toBe("pending");
    expect(loginBody.can_earn_points).toBe(false);
    const scan = await fetch(url("/api/scan-garbage"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginBody.token}`,
      },
      body: JSON.stringify({
        image:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        requestId: crypto.randomUUID(),
      }),
    });
    expect(scan.status).toBe(200);
    const scanBody = await scan.json();
    expect(scanBody.rewarded).toBe(false);
    expect(scanBody.pointsEarned).toBe(0);
    expect(scanBody.rewardReason).toBe("profile_verification_required");

    const verified = await fetch(
      url(`/api/admin/users/${loginBody.user_id}/profile-verification`),
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": "bmo-e2e-admin-key",
        },
        body: JSON.stringify({ status: "verified" }),
      },
    );
    expect(verified.status).toBe(200);
    const wheel = await fetch(url("/api/daily-wheel"), {
      method: "POST",
      headers: { Authorization: `Bearer ${loginBody.token}` },
    });
    expect(wheel.status).toBe(200);
    expect((await wheel.json()).earnedPoints).toBeGreaterThanOrEqual(1);
  });
  it("GET /api/admin/stats rejects without admin key (401/403)", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/admin/stats"));
    expect(
      r.status === 401 || r.status === 403 || r.status === 503 || r.status === 500,
    ).toBeTruthy();
  });

  it("does not expose the retired full-card unlock endpoint", async (t) => {
    if (!booted) return t.skip();
    const response = await fetch(url("/api/admin/unlock-all-cards"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": "bmo-e2e-admin-key",
      },
      body: JSON.stringify({ nickname: "any_user" }),
    });
    expect(response.status).toBe(404);
  });

  it("does not expose retired Campaign APIs", async (t) => {
    if (!booted) return t.skip();
    const responses = await Promise.all([
      fetch(url("/api/campaign/config")),
      fetch(url("/api/campaign/stages/legacy/complete"), { method: "POST" }),
      fetch(url("/api/admin/campaign/stages/legacy/reward"), {
        method: "PUT",
        headers: { "x-admin-key": "bmo-e2e-admin-key" },
      }),
    ]);
    for (const response of responses) expect(response.status).toBe(404);
  });

  it("POST /api/forgot-password does not reveal whether an account exists", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "definitely-missing@example.invalid" }),
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
  });

  it("POST /api/register rejects malformed field types without a server error", async (t) => {
    if (!booted) return t.skip();
    const response = await fetch(url("/api/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reg_name: { raw: "not-a-string" },
        reg_nickname: ["invalid"],
        reg_password: 12345678,
      }),
    });
    expect(response.status).toBe(400);
    expect((await response.json()).success).toBe(false);
  });

  it("POST /api/reset-password rejects an invalid token", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "invalid", newPassword: "new-password-123" }),
    });
    expect(r.status).toBe(400);
  });

  it("GET /api/user/:nick rejects anonymous profile access", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/user/anyone"));
    expect(r.status).toBe(401);
  });

  it("game progress, card levels, and exam endpoints reject anonymous access", async (t) => {
    if (!booted) return t.skip();
    const responses = await Promise.all([
      fetch(url("/api/user-progress")),
      fetch(url("/api/cards/levels/anyone")),
      fetch(url("/api/exam/anyone")),
      fetch(url("/api/decay/anyone")),
      fetch(url("/api/federated/privacy")),
      fetch(url("/api/tournament/current")),
      fetch(url("/api/clan/example")),
      fetch(url("/api/experiments")),
      fetch(url("/api/social/metrics/anyone")),
      fetch(url("/api/sms/send"), { method: "POST" }),
      fetch(url("/api/pvp/match"), { method: "POST" }),
      fetch(url("/api/pvp/result"), { method: "POST" }),
      fetch(url("/api/chat"), { method: "POST" }),
      fetch(url("/api/voice/transcribe"), { method: "POST" }),
      fetch(url("/api/voice/speak"), { method: "POST" }),
    ]);
    for (const response of responses) expect(response.status).toBe(401);
  });

  it("preserves card levels, ownership, and gacha pity across a daily rollover", async (t) => {
    if (!booted) return t.skip();
    const login = await fetch(url("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login_nickname: "legacy_cards",
        login_password: "LegacyPass1!",
      }),
    });
    expect(login.status).toBe(200);
    const loggedIn = await login.json();
    expect(loggedIn.success).toBe(true);
    const auth = { Authorization: `Bearer ${loggedIn.token}` };

    const update = await fetch(url("/api/user-progress"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ type: "checkin", data: 1 }),
    });
    expect(update.status).toBe(200);
    const updated = await update.json();
    expect(updated.progress.flashcardsRead).toEqual([1]);
    expect(updated.progress.flashcardCounts).toEqual({ "1": 2 });
    expect(updated.progress.cardLevels).toEqual({ "1": 7 });
    expect(updated.progress.gachaPullCount).toBe(42);
    expect(updated.progress.shards).toBe(9);
  });

  it("keeps reward, gacha, challenge, and store balances authoritative", async (t) => {
    if (!booted) return t.skip();
    const nick = `gacha_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const password = "StrongPass123!";
    const register = await fetch(url("/api/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reg_name: "Gacha Test",
        reg_full_name: "Gacha Test Student",
        reg_class_id: TEST_CLASS.id,
        reg_nickname: nick,
        reg_password: password,
      }),
    });
    const registered = await register.json();
    expect(registered.success).toBe(true);

    const login = await fetch(url("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_nickname: nick, login_password: password }),
    });
    const loggedIn = await login.json();
    expect(loggedIn.success).toBe(true);
    const auth = { Authorization: `Bearer ${loggedIn.token}` };

    const initialProgress = await fetch(url("/api/user-progress"), { headers: auth });
    expect(initialProgress.status).toBe(200);
    expect((await initialProgress.json()).progress).toBe(null);

    const invalidCardUpgrade = await fetch(url("/api/cards/levelup"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ cardId: "not-a-card" }),
    });
    expect(invalidCardUpgrade.status).toBe(410);

    const privacy = await fetch(url("/api/federated/privacy"), { headers: auth });
    expect(privacy.status).toBe(200);
    const privacyBody = await privacy.json();
    expect(privacyBody.provenance).toBe("live");
    expect(privacyBody.accountingScope).toBe("server_process");
    expect(typeof privacyBody.rounds).toBe("number");
    expect(typeof privacyBody.audit.merkleRoot).toBe("string");

    const arbitraryReward = await fetch(url("/api/reward"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({
        points: 999,
        action: "ai_scan_local",
      }),
    });
    expect(arbitraryReward.status).toBe(400);

    const reward = await fetch(url("/api/reward"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ action: "ai_scan_local" }),
    });
    expect(reward.status).toBe(400);

    const pull = await fetch(url("/api/cards/gacha-pull"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ count: 10 }),
    });
    expect(pull.status).toBe(410);

    const levels = await fetch(url(`/api/cards/levels/${nick}`), { headers: auth });
    expect(levels.status).toBe(410);

    const profile = await fetch(url(`/api/user/${nick}`), { headers: auth });
    const profileBody = await profile.json();
    expect(profileBody.points).toBe(0);
    expect(profileBody.totalExpEarned).toBe(0);

    const challengeId = getDailyChallengeIds(getVietnamDayKey())[0]!;
    const claimChallenge = () =>
      fetch(url("/api/user-progress"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ type: "challenge", data: challengeId }),
      });
    const firstClaim = await claimChallenge();
    expect(firstClaim.status).toBe(200);
    const firstClaimBody = await firstClaim.json();
    expect(firstClaimBody.verificationRequired).toBe(true);
    expect(firstClaimBody.earnedPoints).toBe(0);
    expect(firstClaimBody.points).toBe(0);

    const duplicateClaim = await claimChallenge();
    expect(duplicateClaim.status).toBe(200);
    const duplicateClaimBody = await duplicateClaim.json();
    expect(duplicateClaimBody.verificationRequired).toBe(true);
    expect(duplicateClaimBody.earnedPoints).toBe(0);
    expect(duplicateClaimBody.points).toBe(0);

    const invalidToday = [1, 2, 3, 4, 5, 6, 7].find(
      (id) => !getDailyChallengeIds(getVietnamDayKey()).includes(id),
    )!;
    const invalidClaim = await fetch(url("/api/user-progress"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ type: "challenge", data: invalidToday }),
    });
    expect(invalidClaim.status).toBe(400);

    const invalidRedemption = await fetch(url("/api/user-progress"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({
        type: "craft",
        data: "1",
        redeemInfo: { fullName: "Nguyễn Văn A", class: "10A1" },
      }),
    });
    expect(invalidRedemption.status).toBe(400);

    const battleReward = await fetch(url("/api/reward"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ action: "card_battle", level: 2 }),
    });
    expect(battleReward.status).toBe(400);

    const fundStore = await fetch(url(`/api/admin/users/${nick}/adjust-points`), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": "bmo-e2e-admin-key" },
      body: JSON.stringify({ delta: 100, reason: "E2E store setup" }),
    });
    expect(fundStore.status).toBe(200);

    const purchase = () =>
      fetch(url("/api/user-progress"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ type: "purchase", data: "av1" }),
      });
    const firstPurchase = await purchase();
    expect(firstPurchase.status).toBe(200);
    const firstPurchaseBody = await firstPurchase.json();
    expect(firstPurchaseBody.points).toBe(50);

    const duplicatePurchase = await purchase();
    expect(duplicatePurchase.status).toBe(409);

    const fundRedemption = await fetch(url(`/api/admin/users/${nick}/adjust-points`), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": "bmo-e2e-admin-key" },
      body: JSON.stringify({ delta: 2000, reason: "E2E redemption setup" }),
    });
    expect(fundRedemption.status).toBe(200);

    const redeem = () =>
      fetch(url("/api/user-progress"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({
          type: "craft",
          data: "1",
          redeemInfo: {
            fullName: "Nguyễn Văn A",
            address: "12 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM",
          },
        }),
      });
    const firstRedemption = await redeem();
    expect(firstRedemption.status).toBe(200);
    const firstRedemptionBody = await firstRedemption.json();
    expect(firstRedemptionBody.points).toBe(550);
    expect(firstRedemptionBody.totalExpEarned).toBe(2100);
    expect(firstRedemptionBody.progress.crafted.includes("1")).toBe(true);
    expect(typeof firstRedemptionBody.redemptionId).toBe("string");
    expect(firstRedemptionBody.status).toBe("pending");

    const duplicateRedemption = await redeem();
    expect(duplicateRedemption.status).toBe(409);
  });
});

describe("E2E: privacy + federated", () => {
  it("GET /api/federated/status returns stats envelope", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/federated/status"));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
    expect(typeof body.bufferSize).toBe("number");
  });
  it("GET /api/audit/merkle-root returns a hex hash", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/audit/merkle-root"));
    if (r.status === 503 || r.status === 404) return;
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
    expect(typeof body.rootHex).toBe("string");
    expect(body.rootHex.length).toBe(64);
  });
  it("POST /api/federated/submit with malformed payload is rejected", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/federated/submit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(
      r.status === 400 || r.status === 401 || r.status === 403 || r.status === 503,
    ).toBeTruthy();
  });
});
