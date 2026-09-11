import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CARD_BATTLE_REWARDS, resolveGameplayRewardClaim } from "../../src/lib/gameplayRewards.js";

describe("gameplay reward policy", () => {
  it("derives reward amounts from known activities", () => {
    assert.equal(resolveGameplayRewardClaim({ action: "ai_scan_local" })?.points, 50);
    assert.equal(resolveGameplayRewardClaim({ action: "garden_pet" })?.points, 3);
    assert.equal(resolveGameplayRewardClaim({ action: "garden_clean" })?.points, 10);
    assert.equal(
      resolveGameplayRewardClaim({ action: "card_battle", level: 5 })?.points,
      CARD_BATTLE_REWARDS[4],
    );
    assert.equal(resolveGameplayRewardClaim({ action: "roguelike", floor: 4 })?.points, 320);
  });

  it("rejects raw points, unknown actions, and invalid game bounds", () => {
    assert.equal(resolveGameplayRewardClaim({ action: "ai_scan_local", points: 999 }), null);
    assert.equal(resolveGameplayRewardClaim({ action: "gameplay" }), null);
    assert.equal(resolveGameplayRewardClaim({ action: "card_battle", level: 6 }), null);
    assert.equal(resolveGameplayRewardClaim({ action: "roguelike", floor: 0 }), null);
  });
});
