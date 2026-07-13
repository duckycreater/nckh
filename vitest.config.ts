import { defineConfig } from "vitest/config";
import path from "path";

/**
 * vitest.config.ts
 *
 * Re-routes `node:test` to vitest's own describe/it so test files can
 * keep the `import { describe, it } from "node:test"` style while still
 * being collected by vitest (which is what runs `npm test`).
 *
 * All other `node:test` helpers (before, after, beforeEach, afterEach,
 * it.skip) are preserved by the bridge in `vitest.node-test-bridge.ts`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Re-route node:test → our bridge, which exposes vitest's
      // describe/it and forwards everything else to node:test.
      "node:test": path.resolve(__dirname, "vitest.node-test-bridge.ts"),
    },
  },
  test: {
    include: [
      "tests/**/*.spec.ts",
      "tests/**/*.spec.tsx",
    ],
    // E2E suites boot an in-process Express server. They still work under
    // vitest but they take 5–15s each, so we set generous timeouts and let
    // them run sequentially (the default `pool: 'threads'` does that for us).
    exclude: ["**/node_modules/**", "dist/**", "tests/run-all.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    teardownTimeout: 10_000,
    reporters: ["default"],
    pool: "forks",
    poolOptions: {
      forks: {
        // E2E suites boot an HTTP listener on a port. We must NOT share
        // workers across files because the listener would leak between
        // suites, but vitest forks already isolate by default.
        singleFork: false,
      },
    },
    sequence: {
      // E2E suites open ports; we want them to run one at a time to
      // avoid port clashes even on different ports.
      concurrent: false,
    },
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["**/server/services/**/*.ts", "**/server/middleware/**/*.ts"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.config.ts",
        "**/eslint.config.js",
        "**/*.spec.ts",
      ],
      clean: true,
    },
  },
});
