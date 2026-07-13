/**
 * tests/services/inferenceRouter.spec.ts
 *
 * Pure helpers used by the inference router:
 *   - getInferenceStats() — internal counters (pure, but module-level state)
 *   - frameworkBackendName() — backend string mapping (pure)
 *
 * Heavy-weight DOM/WebGPU code paths are exercised in the browser
 * environment; node:test covers what we can without jsdom.
 *
 * Run with: npm test  (node:test).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getInferenceStats,
  frameworkBackendName,
} from "../../src/services/inferenceRouter.ts";
import {
  clearBackendCache,
  getCachedBackend,
  type ComputeBackend,
} from "../../src/services/webgpuDetect.ts";

const expect = (v: unknown) => ({
  toBe: (x: unknown) => assert.deepStrictEqual(v, x),
  toEqual: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeCloseTo: (x: number, digits = 5) =>
    assert.ok(
      Math.abs(Number(v) - x) < Math.pow(10, -digits),
      `expected ${v} ≈ ${x}`,
    ),
  toBeGreaterThan: (x: number) => assert.ok(Number(v) > x, `${v} <= ${x}`),
  toBeLessThan: (x: number) => assert.ok(Number(v) < x, `${v} >= ${x}`),
  toBeGreaterThanOrEqual: (x: number) =>
    assert.ok(Number(v) >= x, `${v} < ${x}`),
  toBeLessThanOrEqual: (x: number) => assert.ok(Number(v) <= x, `${v} > ${x}`),
  toBeType: (t: string) => assert.strictEqual(typeof v, t),
  toMatch: (re: RegExp) => assert.ok(re.test(String(v)), `${v} did not match ${re}`),
});

describe("inferenceRouter.getInferenceStats", () => {
  it("returns initial zero state", () => {
    const s = getInferenceStats();
    expect(s.totalCalls).toBe(0);
    expect(s.avgLatencyMs).toBe(0);
    expect(s.totalEnergyJ).toBe(0);
    for (const k of ["webgpu", "webgl2", "wasm-simd", "wasm"] as ComputeBackend[]) {
      expect(s.byBackend[k]).toBe(0);
    }
  });
  it("returns a fresh object each call (defensive copy)", () => {
    const a = getInferenceStats();
    const b = getInferenceStats();
    a.totalCalls = 9999;
    expect(b.totalCalls).toBe(0);
  });
});

describe("inferenceRouter.frameworkBackendName", () => {
  it("onnx + webgpu → webgpu", () => {
    expect(frameworkBackendName("onnx", "webgpu")).toBe("webgpu");
  });
  it("onnx + webgl2 → wasm", () => {
    expect(frameworkBackendName("onnx", "webgl2")).toBe("wasm");
  });
  it("onnx + wasm-simd → cpu", () => {
    expect(frameworkBackendName("onnx", "wasm-simd")).toBe("cpu");
  });
  it("onnx + wasm → cpu", () => {
    expect(frameworkBackendName("onnx", "wasm")).toBe("cpu");
  });
  it("tfjs + webgpu → webgpu", () => {
    expect(frameworkBackendName("tfjs", "webgpu")).toBe("webgpu");
  });
  it("tfjs + webgl2 → webgl", () => {
    expect(frameworkBackendName("tfjs", "webgl2")).toBe("webgl");
  });
  it("tfjs + wasm-simd → wasm", () => {
    expect(frameworkBackendName("tfjs", "wasm-simd")).toBe("wasm");
  });
});

describe("webgpuDetect cache helpers", () => {
  it("getCachedBackend returns null when storage is empty", () => {
    // Stub localStorage in node environment.
    const store: Record<string, string> = {};
    (globalThis as {localStorage?: unknown}).localStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    };
    clearBackendCache();
    expect(getCachedBackend()).toBe(null);
  });
  it("clearBackendCache does not throw on missing key", () => {
    // No localStorage stub; should still swallow.
    clearBackendCache();
    expect(true).toBe(true);
  });
});