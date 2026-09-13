import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getDefaultCampaignReward,
  validateCampaignRewardInput,
} from "../../server/services/campaignRewards.ts";
import { CAMPAIGN_REGIONS, CAMPAIGN_STAGE_IDS } from "../../shared/cardGame.ts";

describe("campaign configuration", () => {
  it("builds ten regions with ten unique stages each", () => {
    assert.equal(CAMPAIGN_REGIONS.length, 10);
    assert.equal(CAMPAIGN_STAGE_IDS.length, 100);
    assert.equal(new Set(CAMPAIGN_STAGE_IDS).size, 100);
    for (const region of CAMPAIGN_REGIONS) assert.equal(region.stages.length, 10);
  });

  it("creates safe defaults for every stage", () => {
    for (const stageId of CAMPAIGN_STAGE_IDS) {
      const reward = getDefaultCampaignReward(stageId);
      assert.equal(reward.stageId, stageId);
      assert.ok(reward.points >= 0 && reward.points <= 5000);
      assert.ok(reward.shards >= 0 && reward.shards <= 500);
    }
  });

  it("accepts only bounded values and flagship card drops", () => {
    assert.deepEqual(
      validateCampaignRewardInput({ points: 50, shards: 4, cardId: 1, rewardId: "gift-1" }),
      {
        points: 50,
        shards: 4,
        cardId: 1,
        rewardId: "gift-1",
      },
    );
    assert.throws(
      () => validateCampaignRewardInput({ points: 5001, shards: 0, cardId: null, rewardId: null }),
      RangeError,
    );
    assert.throws(
      () => validateCampaignRewardInput({ points: 10, shards: 1, cardId: 6, rewardId: null }),
      RangeError,
    );
  });
});
