/**
 * vitest.node-test-bridge.ts
 *
 * Vitest re-routes `import ... from "node:test"` here. We forward the
 * standard helpers (before/after/beforeEach/afterEach) to the real
 * `node:test` module, but re-export `describe` and `it` from vitest so
 * that vitest's collector can see the test boundaries and report
 * results in the vitest UI / TAP output.
 *
 * Test files use the conventional style:
 *   import { describe, it, before, after } from "node:test";
 *   import assert from "node:assert/strict";
 *   describe("module", () => { it("works", () => { ... }) });
 *
 * After this bridge, `describe` and `it` are vitest's; the others are
 * real `node:test` hooks. This is enough for the existing 12 spec files
 * (no source-code changes required).
 */
import * as vitest from "vitest";

// All hooks come from vitest so timing / collection works uniformly. This
// is fine for our usage — every spec file calls before/after/beforeEach as
// plain callbacks with no return value, which both runners support.
export const describe = vitest.describe;
export const it = vitest.it;
export const test = vitest.test;

export const before = vitest.beforeAll;
export const after = vitest.afterAll;
export const beforeEach = vitest.beforeEach;
export const afterEach = vitest.afterEach ?? vitest.afterAll;

export const run: undefined = undefined;
export const skip: undefined = undefined;
export const todo: undefined = undefined;
export const only: undefined = undefined;

export default {
  describe,
  it,
  test,
  before,
  after,
  beforeEach,
  afterEach,
};
