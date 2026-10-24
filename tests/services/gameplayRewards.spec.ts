import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveGameplayRewardClaim } from "../../src/lib/gameplayRewards.js";

describe("gameplay reward policy", () => {
  it("derives reward amounts from known activities", () => {
    assert.equal(resolveGameplayRewardClaim({ action: "ai_scan_local" }), null);
    assert.equal(resolveGameplayRewardClaim({ action: "garden_pet" })?.points, 3);
    assert.equal(resolveGameplayRewardClaim({ action: "garden_clean" })?.points, 10);
    assert.equal(resolveGameplayRewardClaim({ action: "card_battle", level: 5 }), null);
    assert.equal(resolveGameplayRewardClaim({ action: "roguelike", floor: 4 }), null);
  });

  it("rejects raw points, unknown actions, and invalid game bounds", () => {
    assert.equal(resolveGameplayRewardClaim({ action: "ai_scan_local", points: 999 }), null);
    assert.equal(resolveGameplayRewardClaim({ action: "gameplay" }), null);
    assert.equal(resolveGameplayRewardClaim({ action: "card_battle", level: 6 }), null);
    assert.equal(resolveGameplayRewardClaim({ action: "roguelike", floor: 0 }), null);
  });
});
