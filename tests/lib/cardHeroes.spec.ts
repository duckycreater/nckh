import { describe, expect, it } from "vitest";
import { CARD_ELEMENT_IDENTITIES, FLAGSHIP_CARD_IDS } from "../../shared/cardGame";
import { FLAGSHIP_HERO_PROFILES } from "../../src/lib/cardHeroes";

describe("flagship card hero profiles", () => {
  it("defines one complete and uniquely identifiable hero for every flagship card", () => {
    expect(FLAGSHIP_CARD_IDS).toHaveLength(100);
    expect(FLAGSHIP_HERO_PROFILES).toHaveLength(100);
    expect(new Set(FLAGSHIP_HERO_PROFILES.map((profile) => profile.cardId)).size).toBe(100);
    expect(new Set(FLAGSHIP_HERO_PROFILES.map((profile) => profile.callsign)).size).toBe(100);
    expect(new Set(FLAGSHIP_HERO_PROFILES.map((profile) => profile.serial)).size).toBe(100);
    expect(FLAGSHIP_HERO_PROFILES.map((profile) => profile.cardId).sort((a, b) => a - b)).toEqual(
      [...FLAGSHIP_CARD_IDS].sort((a, b) => a - b),
    );

    for (const profile of FLAGSHIP_HERO_PROFILES) {
      expect(profile.callsign.length).toBeGreaterThan(2);
      expect(profile.lore.length).toBeGreaterThan(80);
      expect(profile.recyclingIntel.length).toBeGreaterThan(40);
      for (const ability of [
        profile.passive,
        profile.skillOne,
        profile.skillTwo,
        profile.ultimate,
      ]) {
        expect(ability.name.length).toBeGreaterThan(2);
        expect(ability.description.length).toBeGreaterThan(20);
        expect(ability.value).toBeGreaterThan(0);
        expect(ability.energyCost).toBeGreaterThanOrEqual(0);
        expect(ability.cooldown).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("gives every waste family its own combat mechanic and visual language", () => {
    const identities = Object.values(CARD_ELEMENT_IDENTITIES);
    expect(identities).toHaveLength(9);
    expect(new Set(identities.map((identity) => identity.mechanic)).size).toBe(9);
    expect(new Set(identities.map((identity) => identity.artDirection)).size).toBe(9);
    for (const identity of identities) {
      expect(identity.combatFantasyVi.length).toBeGreaterThan(30);
      expect(identity.artDirection.length).toBeGreaterThan(30);
    }
  });
});
