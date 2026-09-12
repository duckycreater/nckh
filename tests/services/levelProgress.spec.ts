import { describe, expect, it } from "vitest";

import { calculateLevel, getExpForLevel } from "../../src/lib/useLevel";

describe("level progression", () => {
  it("starts level one at zero EXP without a negative progress bar", () => {
    expect(getExpForLevel(1)).toBe(0);
    expect(calculateLevel(0)).toMatchObject({
      level: 1,
      currentExpInLevel: 0,
      progress: 0,
    });
  });

  it("moves to level two exactly at its threshold", () => {
    const threshold = getExpForLevel(2);
    expect(threshold).toBe(80);
    expect(calculateLevel(threshold - 1).level).toBe(1);
    expect(calculateLevel(threshold)).toMatchObject({ level: 2, currentExpInLevel: 0 });
  });

  it("sanitizes invalid or negative totals and caps progress", () => {
    expect(calculateLevel(-50)).toMatchObject({ level: 1, currentExpInLevel: 0, progress: 0 });
    expect(calculateLevel(Number.NaN)).toMatchObject({
      level: 1,
      currentExpInLevel: 0,
      progress: 0,
    });
    expect(calculateLevel(Number.POSITIVE_INFINITY).progress).toBe(0);
    expect(calculateLevel(1_000_000).progress).toBeLessThanOrEqual(100);
  });
});
