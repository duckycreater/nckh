import { describe, expect, it } from "vitest";
import { normalizeCardOwnership } from "../../src/lib/cardOwnership";

describe("normalizeCardOwnership", () => {
  it("keeps only valid positive card ownership", () => {
    expect(
      normalizeCardOwnership([1, "2", 2, 0, 421], {
        2: 4,
        3: 0,
        4: -2,
        nope: 8,
      }),
    ).toEqual({
      ids: [1, 2],
      counts: { "1": 1, "2": 4 },
      debugUnlockRemoved: false,
    });
  });

  it("preserves legacy read-only collections as one copy per card", () => {
    expect(normalizeCardOwnership([9, 3], undefined)).toEqual({
      ids: [3, 9],
      counts: { "3": 1, "9": 1 },
      debugUnlockRemoved: false,
    });
  });

  it("removes the exact 420-card development unlock signature", () => {
    const ids = Array.from({ length: 420 }, (_, index) => index + 1);
    const counts = Object.fromEntries(ids.map((id) => [String(id), 3]));
    expect(normalizeCardOwnership(ids, counts)).toEqual({
      ids: [],
      counts: {},
      debugUnlockRemoved: true,
    });
  });

  it("removes the legacy read-only full unlock signature", () => {
    const ids = Array.from({ length: 420 }, (_, index) => index + 1);
    expect(normalizeCardOwnership(ids, {})).toEqual({
      ids: [],
      counts: {},
      debugUnlockRemoved: true,
    });
  });

  it("does not erase a legitimate large collection with varied counts", () => {
    const ids = Array.from({ length: 420 }, (_, index) => index + 1);
    const counts = Object.fromEntries(ids.map((id) => [String(id), id === 1 ? 4 : 3]));
    const result = normalizeCardOwnership(ids, counts);
    expect(result.debugUnlockRemoved).toBe(false);
    expect(result.ids).toHaveLength(420);
  });
});
