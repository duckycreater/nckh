import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  decideScanReward,
  getScanRewardConfig,
  type ScanRewardEntry,
} from "../../server/services/scanRewards.js";

const START = 1_700_000_000_000;

describe("scanRewards.decideScanReward", () => {
  it("returns no_user when nick is missing", () => {
    const result = decideScanReward(undefined, undefined, "hash-a", START);
    assert.equal(result.awarded, 0);
    assert.equal(result.reason, "no_user");
    assert.deepEqual(result.history, []);
  });

  it("awards and returns history for durable persistence", () => {
    const result = decideScanReward("alice", [], "hash-a", START);
    assert.equal(result.awarded, getScanRewardConfig().points);
    assert.equal(result.totalToday, 1);
    assert.equal(result.reason, "ok");
    assert.deepEqual(result.history, [{ at: START, imageHash: "hash-a" }]);
  });

  it("does not reward the same image twice within the window", () => {
    const first = decideScanReward("alice", [], "hash-a", START);
    const replay = decideScanReward("alice", first.history, "hash-a", START + 60_000);
    assert.equal(replay.awarded, 0);
    assert.equal(replay.reason, "duplicate");
    assert.equal(replay.totalToday, 1);
  });

  it("caps distinct scans at the configured daily limit", () => {
    const config = getScanRewardConfig();
    let history: ScanRewardEntry[] = [];
    for (let index = 0; index < config.dailyCap; index += 1) {
      const result = decideScanReward("bob", history, `hash-${index}`, START + index * 60_000);
      assert.equal(result.reason, "ok");
      history = result.history;
    }
    const capped = decideScanReward("bob", history, "hash-over-cap", START + 21 * 60_000);
    assert.equal(capped.awarded, 0);
    assert.equal(capped.reason, "capped");
    assert.equal(capped.totalToday, config.dailyCap);
  });

  it("drops expired and malformed persisted entries", () => {
    const history = [
      { at: START - 25 * 60 * 60 * 1000, imageHash: "expired" },
      { at: Number.NaN, imageHash: "invalid" },
    ];
    const result = decideScanReward("carol", history, "fresh", START);
    assert.equal(result.reason, "ok");
    assert.deepEqual(result.history, [{ at: START, imageHash: "fresh" }]);
  });
});
