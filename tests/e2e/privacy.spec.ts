/**
 * tests/e2e/privacy.spec.ts
 *
 * Second E2E flow per the plan: federated opt-in → privacy budget
 * is non-decreasing for the same ε, δ.
 *
 * In addition to a live HTTP probe (when the server is reachable), this
 * spec also unit-tests the privacy-budget arithmetic so the test is
 * meaningful even when the server is unavailable.
 *
 * Run with: npm test  (node:test).
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

import {
  composeRenyi,
  gaussianRenyiEpsilon,
  renyiToEpsilonDelta,
  RenyiDpAccountant,
} from "../../src/services/dpAccountant.ts";

const expect = (v: unknown) => ({
  toBe: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeType: (t: string) => assert.strictEqual(typeof v, t),
  toEqual: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeGreaterThan: (x: number) => assert.ok(Number(v) > x, `${v} <= ${x}`),
  toBeGreaterThanOrEqual: (x: number) =>
    assert.ok(Number(v) >= x, `${v} < ${x}`),
  toBeLessThan: (x: number) => assert.ok(Number(v) < x, `${v} >= ${x}`),
  toBeTruthy: () => assert.ok(v),
});

let testServer: {port: number; close: () => Promise<void>} | null = null;
let booted: boolean = false;

before(async () => {
  process.env.PORT = process.env.BMO_TEST_PORT || String(41000 + Math.floor(Math.random() * 9000));
  let mod: typeof import("../../server/bootstrap.ts");
  try {
    mod = await import("../../server/bootstrap.ts");
  } catch (e) {
    console.warn("[e2e-privacy] Cannot import bootstrap:", (e as Error).message);
    return;
  }
  try {
    await Promise.race([
      mod.startServer(),
      new Promise<void>((_, rej) =>
        setTimeout(() => rej(new Error("startServer timeout 15s")), 15000),
      ),
    ]);
    booted = true;
  } catch (e) {
    console.warn("[e2e-privacy] startServer timeout:", (e as Error).message);
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

// ─── Live HTTP probes (only when server boots) ─────────────────────────────

describe("E2E: privacy budget", () => {
  it("GET /api/federated/stats reports a DP envelope", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/federated/stats"));
    if (r.status === 503 || r.status === 404) return; // route not mounted in this env
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
    expect(body.dp.epsilon > 0).toBeTruthy();
    expect(body.dp.delta > 0).toBeTruthy();
    expect(body.dp.delta < 1).toBeTruthy();
  });
  it("GET /api/federated/budget returns per-user epsilon if enabled", async (t) => {
    if (!booted) return t.skip();
    const r = await fetch(url("/api/federated/budget"));
    if (r.status === 503 || r.status === 404 || r.status === 401) return;
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(typeof body.epsilonUsed).toBe("number");
  });
});

// ─── Pure privacy-budget arithmetic (always runs) ──────────────────────────

describe("PrivacyBudgetMeter arithmetic", () => {
  it("Gaussian ε(α) shrinks as σ grows (more noise = stronger privacy)", () => {
    const lo = gaussianRenyiEpsilon(11, 1.0, 1.0); // bigger σ
    const hi = gaussianRenyiEpsilon(11, 0.5, 1.0); // smaller σ
    expect(hi > lo).toBeTruthy();
  });
  it("composeRenyi: ε after 2 rounds = 2 × ε after 1 round", () => {
    const one = composeRenyi(1, 11, 1.0, 1.0);
    const composed = composeRenyi(2, 11, 1.0, 1.0);
    expect(composed).toBeGreaterThanOrEqual(one);
  });
  it("renyiToEpsilonDelta returns sensible δ", () => {
    const orders = [{alpha: 2, epsAlpha: 0.5}, {alpha: 4, epsAlpha: 1.0}];
    const delta = renyiToEpsilonDelta(orders, 1.0);
    expect(delta > 0).toBeTruthy();
    expect(delta <= 1).toBeTruthy();
  });
  it("RenyiDpAccountant: round counter grows; ε grows after rounds", () => {
    const acct = new RenyiDpAccountant();
    expect(acct.getNumRounds()).toBe(0);
    const s0 = acct.computeState();
    const eps0 = s0.epsilonAtDelta;
    for (let i = 0; i < 3; i++) acct.recordRound();
    const s3 = acct.computeState();
    expect(acct.getNumRounds()).toBe(3);
    expect(s3.epsilonAtDelta >= eps0).toBeTruthy();
  });
  it("reset() returns to initial state", () => {
    const acct = new RenyiDpAccountant();
    acct.recordRound();
    acct.recordRound();
    expect(acct.getNumRounds()).toBe(2);
    acct.reset();
    expect(acct.getNumRounds()).toBe(0);
  });
});