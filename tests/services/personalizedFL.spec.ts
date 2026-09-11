import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildLocalDelta } from "../../src/services/personalizedFL.ts";

function norm(matrix: number[][]): number {
  return Math.sqrt(matrix.flat().reduce((sum, value) => sum + value * value, 0));
}

describe("buildLocalDelta", () => {
  it("clips the complete tensor to one global L2 bound", () => {
    const delta = buildLocalDelta(
      [
        [1, 0],
        [1, 0],
      ],
      [
        [0, 0],
        [0, 0],
      ],
      { clipNorm: 1, sigma: 0 },
    );
    assert.ok(Math.abs(norm(delta) - 1) < 1e-12, `norm=${norm(delta)}`);
    assert.ok(Math.abs(delta[0]![0]! - Math.SQRT1_2) < 1e-12);
    assert.ok(Math.abs(delta[1]![0]! - Math.SQRT1_2) < 1e-12);
  });

  it("keeps seeded noise reproducible for experiments", () => {
    const options = { clipNorm: 1, sigma: 0.2, seed: 42 };
    const first = buildLocalDelta([[0.5, -0.5]], [[0, 0]], options);
    const second = buildLocalDelta([[0.5, -0.5]], [[0, 0]], options);
    assert.deepStrictEqual(first, second);
  });

  it("rejects invalid privacy parameters", () => {
    assert.throws(() => buildLocalDelta([[1]], [[0]], { clipNorm: 0 }), /clipNorm/);
    assert.throws(() => buildLocalDelta([[1]], [[0]], { sigma: -1 }), /sigma/);
  });
});
