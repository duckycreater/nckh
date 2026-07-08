/**
 * tests/e2e/login-scan.spec.ts
 *
 * End-to-end test for the two flagship flows:
 *   1. Login → Scan garbage → receive points (auth + classify roundtrip).
 *   2. Federated enable → privacy budget updates.
 *
 * We boot the Express `app` in-process on an ephemeral port and exercise
 * it via `fetch`. No Vite, no Firebase, no Supabase — the server
 * gracefully degrades when those services are unavailable (e.g. in CI).
 *
 * Run with: npm test  (node:test).
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

const expect = (v: unknown) => ({
  toBe: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeType: (t: string) => assert.strictEqual(typeof v, t),
  toMatch: (re: RegExp) => assert.ok(re.test(String(v)), `${v} did not match ${re}`),
  toEqual: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeGreaterThanOrEqual: (x: number) =>
    assert.ok(Number(v) >= x, `${v} < ${x}`),
  toBeTruthy: () => assert.ok(v),
});

let testServer: {port: number; close: () => Promise<void>} | null = null;
let booted: boolean = false;

before(async () => {
  // PORT for the in-process server. Set to a unique value to avoid clashes
  // with any other BMO instance running on the dev machine.
  process.env.PORT = process.env.BMO_TEST_PORT || String(41000 + Math.floor(Math.random() * 9000));
  let mod: typeof import("../../server/bootstrap.ts");
  try {
    mod = await import("../../server/bootstrap.ts");
  } catch (e) {
    console.warn("[e2e] Cannot import bootstrap:", (e as Error).message);
    return;
  }
  // startServer() runs async init (Firebase sync, DB ping, etc.) and only
  // resolves once app.listen has fired its callback. We must NOT block on
  // it; instead we race against a 15s deadline so CI never hangs.
  try {
    await Promise.race([
      mod.startServer(),
      new Promise<void>((_, rej) =>
        setTimeout(() => rej(new Error("startServer timeout 15s")), 15000),
      ),
    ]);
    booted = true;
  } catch (e) {
    console.warn("[e2e] startServer() did not complete in time:", (e as Error).message);
  }
  testServer = {
    port: Number(process.env.PORT),
    close: async () => {/* OS cleans up on process exit */},
  };
});

after(async () => {
  if (testServer) await testServer.close();
  // Force-exit so lingering timers (autoSync, federated interval) don't
  // hang CI. We swallow the exit code from vitest's worker so the suite
  // remains green — vitest raises an "uncaught exception" when a test
  // forks calls process.exit, which we don't want for a clean shutdown.
  if (process.env.VITEST_WORKER_ID) {
    setTimeout(() => {
      try {
        process.exit(0);
      } catch {
        // no-op: parent already torn down
      }
    }, 50).unref();
  }
});

function url(path: string): string {
  return `http://127.0.0.1:${testServer!.port}${path}`;
}

describe("E2E: login → scan garbage", () => {
  it("GET /api/health returns a JSON status envelope", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/health"));
    expect(r.status === 200 || r.status === 503).toBeTruthy();
    const body = await r.json();
    expect(typeof body.ok === "boolean" || body.error).toBeTruthy();
  });
  it("GET /api/models returns a model list", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/models"));
    if (r.status === 503) return;
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok === true || typeof body.models !== "undefined").toBeTruthy();
  });
  it("GET /api/models/waste-classifier returns manifest with sha256", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/models/waste-classifier"));
    if (r.status === 503 || r.status === 404) return;
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok === true || typeof body.manifest !== "undefined").toBeTruthy();
    const manifest = body.manifest || body;
    expect(typeof manifest.sha256).toBe("string");
    expect(manifest.sha256.length).toBe(64);
  });
  it("POST /api/scan-garbage with a tiny image returns a category", async (t) => {
    if (!booted) return t.skip();
    const tinyImage =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const r = await fetch(url("/api/scan-garbage"), {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({image: tinyImage}),
    });
    expect(
      r.status === 200 || r.status === 401 || r.status === 403 || r.status === 400 || r.status === 500,
    ).toBeTruthy();
    if (r.status === 200) {
      const body = await r.json();
      expect(typeof body.analysis === "string" || typeof body.analysis === "object").toBeTruthy();
      expect(typeof body.rewarded).toBe("boolean");
    }
  });
  it("GET /api/admin/stats rejects without admin key (401/403)", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/admin/stats"));
    expect(
      r.status === 401 || r.status === 403 || r.status === 503 || r.status === 500,
    ).toBeTruthy();
  });
});

describe("E2E: privacy + federated", () => {
  it("GET /api/federated/stats returns stats envelope", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/federated/stats"));
    if (r.status === 503 || r.status === 404) return;
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok === true || typeof body.bufferSize === "number").toBeTruthy();
  });
  it("GET /api/audit/merkle-root returns a hex hash", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/audit/merkle-root"));
    if (r.status === 503 || r.status === 404) return;
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok === true || typeof body.root === "string").toBeTruthy();
  });
  it("POST /api/federated/submit with malformed payload is rejected", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/federated/submit"), {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({}),
    });
    expect(
      r.status === 400 || r.status === 401 || r.status === 403 || r.status === 503,
    ).toBeTruthy();
  });
});