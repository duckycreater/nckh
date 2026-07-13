/**
 * tests/services/scanRewards.spec.ts
 *
 * Verifies the daily-cap behavior of decideScanReward(). The cap exists
 * to prevent client- or replay-attack-style inflation of points.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import "../../vitest.node-test-bridge.ts";

import {
  decideScanReward,
  getScanRewardConfig,
} from "../../server/services/scanRewards.js";

const originalNow = Date.now;
let fakeNow = 1_700_000_000_000;

beforeEach(() => {
  fakeNow = 1_700_000_000_000;
  Date.now = () => fakeNow;
});

afterEach(() => {
  Date.now = originalNow;
});

describe("scanRewards.decideScanReward", () => {
  it("returns no_user when nick is missing", () => {
    const r = decideScanReward(undefined);
    assert.equal(r.awarded, 0);
    assert.equal(r.reason, "no_user");
  });

  it("awards points on the first scan", () => {
    const cfg = getScanRewardConfig();
    const r = decideScanReward("alice");
    assert.equal(r.awarded, cfg.points);
    assert.equal(r.totalToday, 1);
    assert.equal(r.reason, "ok");
  });

  it("caps at SCAN_REWARD_DAILY_CAP", () => {
    const cfg = getScanRewardConfig();
    let last = { awarded: 0, totalToday: 0, reason: "ok" as "ok" | "capped" | "no_user" };
    for (let i = 0; i < cfg.dailyCap; i++) {
      fakeNow += 60_000; // 1 minute apart
      last = decideScanReward("bob");
    }
    assert.equal(last.totalToday, cfg.dailyCap);
    assert.equal(last.reason, "ok");
    // One more must hit the cap
    fakeNow += 60_000;
    const next = decideScanReward("bob");
    assert.equal(next.reason, "capped");
    assert.equal(next.awarded, 0);
  });

  it("does not count scans older than 24h", () => {
    const cfg = getScanRewardConfig();
    for (let i = 0; i < cfg.dailyCap; i++) {
      fakeNow += 60_000;
      decideScanReward("carol");
    }
    // Jump 25 hours forward — window is empty again
    fakeNow += 25 * 60 * 60 * 1000;
    const r = decideScanReward("carol");
    assert.equal(r.reason, "ok");
    assert.equal(r.totalToday, 1);
  });

  it("isolates per-nick state", () => {
    decideScanReward("dave");
    const r2 = decideScanReward("erin");
    assert.equal(r2.totalToday, 1);
  });
});