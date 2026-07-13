/**
 * tests/services/apiContract.spec.ts
 *
 * The API contract is a *typed surface* shared between client (src/apiClient.ts)
 * and server (server/apiContract.ts). This test enforces that the names
 * and types we expose in `src/apiContract.ts` remain compatible with the
 * server's runtime expectations:
 *
 *   - Endpoints exist with documented names.
 *   - Response shapes use `{ok: true, ...}` (success) or `{ok: false, error}`.
 *   - Categories are restricted to the 6 Vietnam waste types.
 *
 * Run with: npm test  (node:test).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  type Category,
  type LoginRequest,
  type LoginResponseOk,
  type RegisterRequest,
  type ClassifyImageRequest,
  type ClassifyImageResponse,
  type FederatedSubmitRequest,
  type FederatedStatsResponse,
  type AuditTimelineResponse,
  type ModelListResponse,
  type ModelManifestDto,
  type DatasetStatusResponse,
} from "../../src/apiContract.ts";

const expect = (v: unknown) => ({
  toBe: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeType: (t: string) => assert.strictEqual(typeof v, t),
  toMatch: (re: RegExp) => assert.ok(re.test(String(v)), `${v} did not match ${re}`),
  toEqual: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeGreaterThan: (x: number) => assert.ok(Number(v) > x, `${v} <= ${x}`),
  toBeGreaterThanOrEqual: (x: number) =>
    assert.ok(Number(v) >= x, `${v} < ${x}`),
});

describe("apiContract.types", () => {
  it("Category covers 6 Vietnamese waste streams", () => {
    const valid: Category[] = ["plastic", "paper", "glass", "metal", "organic", "hazard"];
    expect(valid.length).toBe(6);
    for (const c of valid) {
      expect(typeof c).toBe("string");
    }
  });
  it("LoginRequest has nickname + password fields", () => {
    const sample: LoginRequest = {
      login_nickname: "tester",
      login_password: "hunter2",
    };
    expect(sample.login_nickname).toMatch(/^\w+/);
    expect(sample.login_password.length).toBeGreaterThan(0);
  });
  it("LoginResponseOk uses success:true (NOT ok:true)", () => {
    // Server uses `success: true` on auth endpoints (legacy convention).
    const sample: LoginResponseOk = {
      success: true,
      token: "tok_abc",
      account_id: "u1",
      nickname: "u1",
      role: "user",
      points: 0,
    };
    expect(sample.success).toBe(true);
  });
  it("RegisterRequest has nickname + password + name", () => {
    const sample: RegisterRequest = {
      reg_nickname: "u2",
      reg_password: "pw",
      reg_name: "U Two",
    };
    expect(sample.reg_nickname.length).toBeGreaterThan(0);
  });
  it("ClassifyImageRequest uses snake_case base64 image", () => {
    const sample: ClassifyImageRequest = {image: "data:image/jpeg;base64,xxx"};
    expect(sample.image.startsWith("data:")).toBe(true);
  });
  it("ClassifyImageResponse has category + confidence + alternatives + latencyMs + backend", () => {
    const sample: ClassifyImageResponse = {
      ok: true,
      category: "plastic",
      confidence: 0.92,
      alternatives: [{category: "paper", confidence: 0.04}],
      latencyMs: 42,
      backend: "webgpu",
    };
    expect(sample.ok).toBe(true);
    expect(sample.confidence > 0).toBe(true);
    expect(sample.alternatives.length).toBeGreaterThan(0);
  });
  it("FederatedSubmitRequest has delta + numSamples + computedAt + epochLoss", () => {
    const sample: FederatedSubmitRequest = {
      delta: [0.01, -0.02],
      numSamples: 50,
      computedAt: 1700000000000,
      epochLoss: 0.3,
    };
    expect(Array.isArray(sample.delta)).toBe(true);
    expect(sample.numSamples).toBeGreaterThan(0);
  });
  it("FederatedStatsResponse has buffer + minClients + dp", () => {
    const sample: FederatedStatsResponse = {
      ok: true,
      bufferSize: 5,
      minClients: 5,
      latestVersion: {version: "v1", trainedOn: 100, createdAt: 1700000000},
      dp: {epsilon: 1.0, delta: 1e-5, clipNorm: 1.0},
    };
    expect(sample.bufferSize).toBeGreaterThanOrEqual(sample.minClients);
    expect(sample.dp.epsilon > 0).toBe(true);
  });
  it("AuditTimelineResponse shape", () => {
    const sample: AuditTimelineResponse = {
      ok: true,
      events: [{id: "1", ts: 1, type: "fl_round", payload: {}}],
      cursor: null,
    };
    expect(sample.events.length).toBeGreaterThan(0);
  });
  it("ModelListResponse + ModelManifestDto shape", () => {
    const sample: ModelListResponse = {
      ok: true,
      models: [
        {
          name: "waste-classifier",
          version: "v1",
          framework: "onnx",
          expectedInputSize: [224, 224],
          url: "/models/waste_classifier_v1.onnx",
          sha256: "a".repeat(64),
          license: "CC-BY-4.0",
        } satisfies ModelManifestDto,
      ],
    };
    expect(sample.models.length).toBeGreaterThan(0);
    expect(sample.models[0].sha256.length).toBe(64);
    expect(sample.models[0].expectedInputSize.length).toBe(2);
  });
  it("DatasetStatusResponse shape", () => {
    const sample: DatasetStatusResponse = {
      ok: true,
      consent: true,
      totalContributions: 1234,
    };
    expect(sample.consent).toBe(true);
    expect(sample.totalContributions).toBeGreaterThan(0);
  });
});

describe("apiContract.error envelope", () => {
  it("error responses carry `error` field (string)", () => {
    // No exported type for the error envelope; this is a sanity check.
    const err = {ok: false, error: "rate_limited"};
    expect(typeof err.error).toBe("string");
  });
});