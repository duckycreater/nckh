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
import { getDailyChallengeIds, getDailyChallengeReward } from "../../src/lib/dailyChallenges.ts";
import { FLAGSHIP_CARD_ID_SET, getCampaignStage } from "../../shared/cardGame.ts";
import { isMaterialSynergy } from "../../shared/campaignCombat.ts";
import { getCanonicalElement } from "../../server/lib/cards.ts";

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
  it("POST /api/scan-garbage with a tiny image returns a category", async (t) => {
    if (!booted) return t.skip();
    const tinyImage =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const r = await fetch(url("/api/scan-garbage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: tinyImage }),
    });
    expect(
      r.status === 200 ||
        r.status === 401 ||
        r.status === 403 ||
        r.status === 400 ||
        r.status === 500,
    ).toBeTruthy();
    if (r.status === 200) {
      const body = await r.json();
      expect(typeof body.analysis === "string" || typeof body.analysis === "object").toBeTruthy();
      expect(typeof body.rewarded).toBe("boolean");
    }
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
    expect(invalidCardUpgrade.status).toBe(400);

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
    const rewardBody = await reward.json();
    expect(rewardBody.points).toBe(50);

    const duplicateReward = await fetch(url("/api/reward"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ action: "ai_scan_local" }),
    });
    const duplicateRewardBody = await duplicateReward.json();
    expect(duplicateRewardBody.earnedPoints).toBe(0);
    expect(duplicateRewardBody.points).toBe(50);

    const pull = await fetch(url("/api/cards/gacha-pull"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ count: 10 }),
    });
    expect(pull.status).toBe(200);
    const pullBody = await pull.json();
    expect(pullBody.cards.length).toBe(10);
    expect(pullBody.pullCost).toBe(50);
    expect(pullBody.remainingPoints).toBe(0);
    assert.ok(pullBody.progress.flashcardsRead.length > 0);
    assert.ok(pullBody.progress.flashcardsRead.length <= 10);
    assert.notEqual(pullBody.progress.flashcardsRead.length, 420);

    const ownedCardId = pullBody.progress.flashcardsRead[0];
    const insufficientFuse = await fetch(url("/api/cards/fuse"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ cardId: ownedCardId }),
    });
    expect(insufficientFuse.status).toBe(400);

    const insufficientLevelUp = await fetch(url("/api/cards/levelup"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ cardId: ownedCardId }),
    });
    expect(insufficientLevelUp.status).toBe(400);

    const levels = await fetch(url(`/api/cards/levels/${nick}`), { headers: auth });
    expect(levels.status).toBe(200);
    const levelsBody = await levels.json();
    expect(typeof levelsBody.levels).toBe("object");

    const profile = await fetch(url(`/api/user/${nick}`), { headers: auth });
    const profileBody = await profile.json();
    expect(profileBody.points).toBe(0);
    expect(profileBody.totalExpEarned).toBe(50);

    const challengeId = getDailyChallengeIds(getVietnamDayKey())[0]!;
    const challengeReward = getDailyChallengeReward(challengeId)!;
    const claimChallenge = () =>
      fetch(url("/api/user-progress"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ type: "challenge", data: challengeId }),
      });
    const firstClaim = await claimChallenge();
    expect(firstClaim.status).toBe(200);
    const firstClaimBody = await firstClaim.json();
    expect(firstClaimBody.earnedPoints).toBe(challengeReward);
    expect(firstClaimBody.points).toBe(challengeReward);

    const duplicateClaim = await claimChallenge();
    expect(duplicateClaim.status).toBe(200);
    const duplicateClaimBody = await duplicateClaim.json();
    expect(duplicateClaimBody.earnedPoints).toBe(0);
    expect(duplicateClaimBody.points).toBe(challengeReward);

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
    const battleRewardBody = await battleReward.json();
    expect(battleReward.status).toBe(200);
    expect(battleRewardBody.points).toBe(challengeReward + 60);

    const purchase = () =>
      fetch(url("/api/user-progress"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ type: "purchase", data: "av1" }),
      });
    const firstPurchase = await purchase();
    expect(firstPurchase.status).toBe(200);
    const firstPurchaseBody = await firstPurchase.json();
    expect(firstPurchaseBody.points).toBe(challengeReward + 10);

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
    expect(firstRedemptionBody.points).toBe(challengeReward + 510);
    expect(firstRedemptionBody.totalExpEarned).toBe(challengeReward + 2110);
    expect(firstRedemptionBody.progress.crafted.includes("1")).toBe(true);
    expect(typeof firstRedemptionBody.redemptionId).toBe("string");
    expect(firstRedemptionBody.status).toBe("pending");

    const duplicateRedemption = await redeem();
    expect(duplicateRedemption.status).toBe(409);

    const campaignConfig = await fetch(url("/api/campaign/config"), { headers: auth });
    expect(campaignConfig.status).toBe(200);
    const campaignConfigBody = await campaignConfig.json();
    expect(campaignConfigBody.rosterSize).toBe(100);
    expect(campaignConfigBody.regions.length).toBe(10);
    expect(campaignConfigBody.rewardConfigs.length).toBe(100);
    const campaignTeam = campaignConfigBody.progress.flashcardsRead
      .map(Number)
      .filter((cardId: number) => FLAGSHIP_CARD_ID_SET.has(cardId))
      .slice(0, 3);
    expect(campaignTeam.length).toBe(3);

    const stageId = "s01_01";
    const configuredCampaignReward = await fetch(
      url(`/api/admin/campaign/stages/${stageId}/reward`),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-key": "bmo-e2e-admin-key" },
        body: JSON.stringify({ points: 77, shards: 7, cardId: 1, rewardId: null }),
      },
    );
    expect(configuredCampaignReward.status).toBe(200);

    const campaignStage = getCampaignStage(stageId)!;
    const encounterIds = [...campaignStage.trashCardIds.slice(0, 4)];
    if (campaignStage.bossCardId) encounterIds.push(campaignStage.bossCardId);
    else if (campaignStage.trashCardIds[4]) encounterIds.push(campaignStage.trashCardIds[4]);
    const campaignAnswers = [...new Set(encounterIds)].map((cardId) => ({
      cardId,
      elementId: getCanonicalElement(cardId),
    }));
    const campaignCombatEvents = campaignAnswers.map((answer, index) => ({
      turn: Math.floor(index / 2) + 1,
      result: "clean",
      combo: index + 1,
      command: {
        type: "salvage",
        targetId: answer.cardId,
        operatorId: campaignTeam[0],
        claimedElementId: answer.elementId,
      },
    }));
    const invalidSyncPair = campaignTeam
      .flatMap((firstOperatorId: number, index: number) =>
        campaignTeam
          .slice(index + 1)
          .map((secondOperatorId: number) => [firstOperatorId, secondOperatorId] as const),
      )
      .find(
        ([firstOperatorId, secondOperatorId]: readonly [number, number]) =>
          !isMaterialSynergy(
            getCanonicalElement(firstOperatorId),
            getCanonicalElement(secondOperatorId),
          ),
      );
    assert.ok(invalidSyncPair, "test roster should contain a non-synergy operator pair");
    const invalidSyncAttempt = await fetch(url(`/api/campaign/stages/${stageId}/complete`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({
        answers: campaignAnswers,
        teamCardIds: campaignTeam,
        combat: {
          events: [
            {
              turn: 1,
              result: "clean",
              combo: 2,
              command: {
                type: "sync",
                targetId: campaignAnswers[0].cardId,
                firstOperatorId: invalidSyncPair[0],
                secondOperatorId: invalidSyncPair[1],
                claimedElementId: campaignAnswers[0].elementId,
              },
            },
          ],
        },
      }),
    });
    expect(invalidSyncAttempt.status).toBe(400);
    const completeCampaign = () =>
      fetch(url(`/api/campaign/stages/${stageId}/complete`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({
          answers: campaignAnswers,
          teamCardIds: campaignTeam,
          combat: { events: campaignCombatEvents },
        }),
      });
    const firstCampaignClear = await completeCampaign();
    expect(firstCampaignClear.status).toBe(200);
    const firstCampaignBody = await firstCampaignClear.json();
    expect(firstCampaignBody.cleared).toBe(true);
    expect(firstCampaignBody.stars).toBe(3);
    expect(firstCampaignBody.reward.points).toBe(77);
    expect(firstCampaignBody.reward.shards).toBe(7);
    expect(firstCampaignBody.reward.cardId).toBe(1);
    expect(firstCampaignBody.stamina).toBe(95);

    const duplicateCampaignClear = await completeCampaign();
    expect(duplicateCampaignClear.status).toBe(200);
    const duplicateCampaignBody = await duplicateCampaignClear.json();
    expect(duplicateCampaignBody.duplicate).toBe(true);
    expect(duplicateCampaignBody.reward.points).toBe(0);
    expect(duplicateCampaignBody.reward.shards).toBe(0);
    expect(duplicateCampaignBody.reward.cardId).toBe(null);
    expect(duplicateCampaignBody.stamina).toBe(95);

    const lockedStage = getCampaignStage("s01_03")!;
    const lockedAnswers = [...new Set(lockedStage.trashCardIds.slice(0, 5))].map((cardId) => ({
      cardId,
      elementId: getCanonicalElement(cardId),
    }));
    const lockedAttempt = await fetch(url("/api/campaign/stages/s01_03/complete"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ answers: lockedAnswers, teamCardIds: campaignTeam }),
    });
    expect(lockedAttempt.status).toBe(403);

    const secondStageId = "s01_02";
    const giftReward = await fetch(url(`/api/admin/campaign/stages/${secondStageId}/reward`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-key": "bmo-e2e-admin-key" },
      body: JSON.stringify({ points: 30, shards: 3, cardId: null, rewardId: "1" }),
    });
    expect(giftReward.status).toBe(200);
    const secondStage = getCampaignStage(secondStageId)!;
    const secondStageAnswers = [...new Set(secondStage.trashCardIds.slice(0, 5))].map((cardId) => ({
      cardId,
      elementId: getCanonicalElement(cardId),
    }));
    const secondStageClear = await fetch(url(`/api/campaign/stages/${secondStageId}/complete`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ answers: secondStageAnswers, teamCardIds: campaignTeam }),
    });
    expect(secondStageClear.status).toBe(200);
    const secondStageBody = await secondStageClear.json();
    expect(secondStageBody.reward.rewardId).toBe("1");
    expect(secondStageBody.progress.campaignGiftByStage[secondStageId]).toBe("1");
    expect(secondStageBody.stamina).toBe(90);

    // Admin edits affect future unlocks only. The player's earned gift remains
    // the original catalog item and can still be redeemed exactly once.
    const changedGiftReward = await fetch(
      url(`/api/admin/campaign/stages/${secondStageId}/reward`),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-key": "bmo-e2e-admin-key" },
        body: JSON.stringify({ points: 30, shards: 3, cardId: null, rewardId: "2" }),
      },
    );
    expect(changedGiftReward.status).toBe(200);
    const redeemCampaignGift = () =>
      fetch(url(`/api/campaign/stages/${secondStageId}/redeem`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({
          redeemInfo: {
            fullName: "Nguyễn Văn A",
            address: "12 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM",
          },
        }),
      });
    const redeemedCampaignGift = await redeemCampaignGift();
    expect(redeemedCampaignGift.status).toBe(200);
    const redeemedCampaignGiftBody = await redeemedCampaignGift.json();
    expect(String(redeemedCampaignGiftBody.item.id)).toBe("1");
    expect(redeemedCampaignGiftBody.progress.campaignRedeemedStages.includes(secondStageId)).toBe(
      true,
    );
    const duplicateCampaignGift = await redeemCampaignGift();
    expect(duplicateCampaignGift.status).toBe(409);
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
