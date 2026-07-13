/**
 * BMO Robot — Express server entry point.
 *
 * This file is intentionally minimal: every route, middleware, and
 * startup hook lives in `server/bootstrap.ts`. We re-export the
 * bootstrapped `app` so test harnesses (supertest, vitest) can mount
 * it without spinning up a real HTTP listener.
 *
 * The legacy 3.000+ line monolith previously inlined here has been
 * preserved verbatim in `server/bootstrap.ts` to guarantee the public
 * HTTP contract is unchanged. Subsequent commits will extract routers
 * further (see `docs/adr/`).
 */
import { app, startServer } from "./server/bootstrap.js";

// Re-export `app` so unit tests can `import { app } from "./server.js"`.
export { app };

// When launched as `npx tsx server.ts` (production or `npm run dev`),
// start the HTTP listener. When this file is bundled into dist/server.cjs
// by esbuild the same module is the entry point so we self-invoke once.
startServer().catch((e) => {
  console.error("[server] Fatal startup error:", e);
  process.exit(1);
});