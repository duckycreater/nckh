import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CARD_TOTAL,
  NORMAL_GACHA_MAX_CARD_ID,
  generateServerCard,
  getCanonicalElement,
  getCanonicalRarity,
  resolveGacha,
} from "../../server/lib/cards.ts";
import { ALL_CARDS, CARD_DEFINITIONS, calcPower } from "../../src/lib/cards.tsx";

describe("server card catalog", () => {
  it("matches the client rarity and element for every card", () => {
    assert.equal(CARD_DEFINITIONS.length, CARD_TOTAL);
    for (const card of CARD_DEFINITIONS) {
      assert.equal(getCanonicalRarity(card.id), card.rarityId, `rarity mismatch for #${card.id}`);
      assert.equal(
        getCanonicalElement(card.id),
        card.elementId,
        `element mismatch for #${card.id}`,
      );
      const serverCard = generateServerCard(card.id);
      assert.equal(serverCard.rarityId, card.rarityId);
      assert.equal(serverCard.elementId, card.elementId);
    }
  });

  it("never puts event-exclusive cards in the standard gacha", () => {
    for (let pull = 1; pull <= 2_000; pull += 1) {
      const id = resolveGacha([], pull);
      assert.ok(id >= 1 && id <= NORMAL_GACHA_MAX_CARD_ID, `unexpected event card #${id}`);
    }
  });

  it("honors epic and legendary pity boundaries", () => {
    for (let sample = 0; sample < 100; sample += 1) {
      assert.equal(getCanonicalRarity(resolveGacha([], 30)), "epic");
      assert.equal(getCanonicalRarity(resolveGacha([], 100)), "legendary");
    }
  });

  it("rejects invalid card ids instead of silently inventing a card", () => {
    assert.throws(() => generateServerCard(0), RangeError);
    assert.throws(() => generateServerCard(CARD_TOTAL + 1), RangeError);
  });

  it("calculates finite power for every supported rarity", () => {
    for (const card of ALL_CARDS) {
      const power = calcPower(card, 1);
      assert.ok(Number.isFinite(power) && power > 0, `invalid power for #${card.id}`);
    }
  });
});
