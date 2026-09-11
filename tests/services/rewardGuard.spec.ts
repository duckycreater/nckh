import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  acquireRewardLock,
  commitReward,
  reserveReward,
  rollbackReward,
  rewardPolicy,
} from "../../server/services/rewardGuard.js";

describe("rewardGuard", () => {
  it("deduplicates a committed idempotency key", () => {
    const first = reserveReward({
      nick: "guard-user",
      points: 10,
      action: "garden_clean",
      idempotencyKey: "guard-1",
    });
    assert.equal(first.duplicate, false);
    if (first.duplicate) return;
    commitReward(first);
    const duplicate = reserveReward({
      nick: "guard-user",
      points: 10,
      action: "garden_clean",
      idempotencyKey: "guard-1",
    });
    assert.deepEqual(duplicate, { duplicate: true, key: "guard-1" });
  });

  it("releases a failed reservation so the request can be retried", () => {
    const first = reserveReward({
      nick: "guard-rollback",
      points: 3,
      action: "garden_pet",
      idempotencyKey: "guard-2",
    });
    assert.equal(first.duplicate, false);
    if (first.duplicate) return;
    rollbackReward(first);
    const retry = reserveReward({
      nick: "guard-rollback",
      points: 3,
      action: "garden_pet",
      idempotencyKey: "guard-2",
    });
    assert.equal(retry.duplicate, false);
    if (!retry.duplicate) rollbackReward(retry);
  });

  it("serializes balance mutations per account", async () => {
    const releaseFirst = await acquireRewardLock("same-user");
    let secondEntered = false;
    const second = acquireRewardLock("same-user").then((release) => {
      secondEntered = true;
      release();
    });
    await Promise.resolve();
    assert.equal(secondEntered, false);
    releaseFirst();
    await second;
    assert.equal(secondEntered, true);
    assert.ok(rewardPolicy().dailyCap > 0);
  });

  it("rejects unknown reward actions instead of falling back to gameplay", () => {
    assert.throws(
      () => reserveReward({ nick: "guard-user", points: 1, action: "made_up_action" }),
      /unknown reward action/,
    );
  });
});
