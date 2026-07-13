/**
 * vitest.setup.ts
 *
 * Bridge file: makes `node:test`-style test files (`import { describe, it } from
 * "node:test"`) discoverable by vitest's collection phase.
 *
 * Vitest only "owns" a test if it was registered through the vitest
 * `describe`/`it` (or the global `test`). When the test file imports
 * `node:test`'s describe/it, the test still RUNS but vitest's collector never
 * sees the suite, so it reports "No test suite found in file" and skips
 * everything.
 *
 * We solve this by re-exporting vitest's describe/it under the same name node:test
 * would. Once a file imports `describe, it` from node:test after this setup
 * runs, it actually gets vitest's collectors. The rest of node:test (run,
 * before, after, beforeEach, afterEach) keeps working unchanged.
 *
 * We also import the real node:test to keep `before`/`after`/`it.skip` working.
 */
import { vi } from "vitest";
import nodeTest from "node:test";

import * as vitest from "vitest";

const realDescribe = vitest.describe;
const realIt = vitest.it;

// Re-export the real node:test API but override describe/it with vitest's.
module.exports = {
  describe: realDescribe,
  it: realIt,
  test: vitest.test,
  before: nodeTest.before,
  after: nodeTest.after,
  beforeEach: nodeTest.beforeEach,
  afterEach: nodeTest.afterEach,
  mock: vi,
  vi,
  // Some files do `import { it } from "node:test"` and then call `it.skip(...)`.
  // Vitest's `it` already has `.skip` / `.only` modifiers, so the standard
  // helpers keep working once the import resolves to vitest's `it`.
};
