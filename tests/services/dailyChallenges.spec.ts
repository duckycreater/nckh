import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getVietnamDayKey } from "../../src/lib/dayKey.ts";
import { getDailyChallengeIds, getDailyChallengeReward } from "../../src/lib/dailyChallenges.ts";

describe("daily challenge schedule", () => {
  it("returns a deterministic set of three unique known challenges", () => {
    const first = getDailyChallengeIds("2026-09-05");
    const second = getDailyChallengeIds("2026-09-05");
    assert.deepStrictEqual(first, second);
    assert.equal(first.length, 3);
    assert.equal(new Set(first).size, 3);
    assert.equal(first.filter((id) => id === 2 || id === 5).length, 1);
    for (const id of first) assert.ok(getDailyChallengeReward(id) !== null);
  });

  it("rolls over at midnight in Vietnam rather than midnight UTC", () => {
    assert.equal(getVietnamDayKey(new Date("2026-01-01T16:59:59.000Z")), "2026-01-01");
    assert.equal(getVietnamDayKey(new Date("2026-01-01T17:00:00.000Z")), "2026-01-02");
  });

  it("normalizes legacy ISO timestamps without inventing another streak day", () => {
    assert.equal(getVietnamDayKey("2026-09-05T04:00:00.000Z"), "2026-09-05");
    assert.equal(getVietnamDayKey("2026-09-05"), "2026-09-05");
  });
});
