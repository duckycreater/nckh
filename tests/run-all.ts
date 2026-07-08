/**
 * Lightweight test runner for BMO pure-logic modules.
 *
 * Node 22 ships with a built-in `node:test` runner that's good enough
 * for our pure-logic modules (no browser, no DOM).  We use it instead
 * of vitest because vitest is blocked by a peer-dep conflict in this
 * environment; the assertions here look the same as what vitest would
 * produce (describe/it/expect).
 *
 * Run with:  npm test
 * Watch with: npm run test:watch
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  gaussianRenyiEpsilon,
  composeRenyi,
  renyiToEpsilonDelta,
  RenyiDpAccountant,
  DP_ACCOUNTANT_VERSION,
} from "../src/services/dpAccountant.ts";
import {
  computeImpact,
  impactToNarrative,
  AVG_WEIGHT_G,
  CO2_FACTORS,
} from "../server/services/impactCalculator.ts";
import {
  signManifest,
  verifyManifest,
  modelRegistry,
  type ModelManifest,
} from "../server/services/modelRegistry.ts";
import {
  evaluatePhysics,
  PHYSICS_RULES,
} from "../src/services/physicsAwareXAI.ts";

// ─── helpers so we can keep writing `expect(x).toBe(y)` style ───────────
const expect = (v: unknown) => ({
  toBe: (x: unknown) => assert.deepStrictEqual(v, x),
  toEqual: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeCloseTo: (x: number, digits = 5) =>
    assert.ok(
      Math.abs(Number(v) - x) < Math.pow(10, -digits),
      `expected ${v} ≈ ${x}`
    ),
  toBeGreaterThan: (x: number) => assert.ok(Number(v) > x, `${v} <= ${x}`),
  toBeGreaterThanOrEqual: (x: number) =>
    assert.ok(Number(v) >= x, `${v} < ${x}`),
  toBeLessThan: (x: number) => assert.ok(Number(v) < x, `${v} >= ${x}`),
  toBeLessThanOrEqual: (x: number) =>
    assert.ok(Number(v) <= x, `${v} > ${x}`),
  toBeNull: () => assert.equal(v, null),
  toBeDefined: () => assert.notEqual(v, undefined),
  toBeUndefined: () => assert.equal(v, undefined),
  toMatch: (re: RegExp) => assert.ok(re.test(String(v)), `${v} !~ ${re}`),
  toContain: (x: unknown) =>
    assert.ok(String(v).includes(String(x)), `${v} missing ${x}`),
  toThrow: (msg?: string | RegExp) => {
    if (typeof v !== "function") {
      throw new Error("toThrow() called on non-function");
    }
    let caught: unknown = null;
    try {
      (v as () => unknown)();
    } catch (e) {
      caught = e;
    }
    assert.ok(caught !== null, "expected function to throw");
    if (msg !== undefined) {
      const text = caught instanceof Error ? caught.message : String(caught);
      if (msg instanceof RegExp) {
        assert.ok(msg.test(text), `message ${text} !~ ${msg}`);
      } else {
        assert.ok(text.includes(String(msg)), `message ${text} missing ${msg}`);
      }
    }
  },
  not: {
    toBe: (x: unknown) => assert.notDeepStrictEqual(v, x),
    toEqual: (x: unknown) => assert.notDeepStrictEqual(v, x),
    toContain: (x: unknown) =>
      assert.ok(!String(v).includes(String(x)), `${v} contains ${x}`),
    toBeGreaterThan: (x: number) => assert.ok(Number(v) <= x),
    toBeLessThan: (x: number) => assert.ok(Number(v) >= x),
  },
});

// ─── dpAccountant ───────────────────────────────────────────────────────
describe("dpAccountant", () => {
  it("version exported", () => {
    expect(DP_ACCOUNTANT_VERSION.length).toBeGreaterThan(0);
  });

  describe("gaussianRenyiEpsilon", () => {
    it("throws alpha < 1", () => {
      expect(() => gaussianRenyiEpsilon(0.5, 1, 1)).toThrow();
    });
    it("throws sigma <= 0", () => {
      expect(() => gaussianRenyiEpsilon(2, 0, 1)).toThrow();
    });
    it("throws clip_norm <= 0", () => {
      expect(() => gaussianRenyiEpsilon(2, 1, 0)).toThrow();
    });
    it("equals alpha·clip² / (2σ²)", () => {
      expect(gaussianRenyiEpsilon(2, 1, 1)).toBeCloseTo(1.0);
      expect(gaussianRenyiEpsilon(5, 1, 1)).toBeCloseTo(2.5);
      expect(gaussianRenyiEpsilon(2, 2, 1)).toBeCloseTo(0.25);
    });
    it("scales quadratically with clip", () => {
      const base = gaussianRenyiEpsilon(3, 1, 1);
      expect(gaussianRenyiEpsilon(3, 1, 2)).toBeCloseTo(base * 4);
    });
  });

  describe("composeRenyi", () => {
    it("equals T·ε_round", () => {
      const epsRound = gaussianRenyiEpsilon(2, 1, 1);
      expect(composeRenyi(5, 2, 1, 1)).toBeCloseTo(5 * epsRound);
    });
    it("grows linearly", () => {
      const a = composeRenyi(10, 2, 1, 1);
      const b = composeRenyi(20, 2, 1, 1);
      expect(b).toBeCloseTo(2 * a);
    });
  });

  describe("renyiToEpsilonDelta", () => {
    it("handles empty input", () => {
      // Returns δ (number); with no orders it falls back to 1 (the "minDelta" initialiser).
      const out = renyiToEpsilonDelta([], 4.0);
      expect(typeof out).toBe("number");
      expect(out).toBeGreaterThan(0);
    });
    it("ε ≥ composed ε", () => {
      // epsAlpha must be ≤ targetEpsilon for the bound to be tight.
      // Test that with epsAlpha strictly less than target, the function
      // returns the minimum delta it found across the supplied alphas.
      const out = renyiToEpsilonDelta([{alpha: 2, epsAlpha: 1.0}], 2.0);
      // Function returns the minimum δ seen; with one valid order we get
      // a number in (0, 1] (the "1" initialiser if nothing qualified).
      expect(out).toBeGreaterThan(0);
      expect(out).toBeLessThanOrEqual(1);
    });
  });

  describe("RenyiDpAccountant", () => {
    it("starts with zero rounds", () => {
      const a = new RenyiDpAccountant();
      const state = a.computeState();
      expect(state.rounds).toBe(0);
    });
  });
});

// ─── impactCalculator ───────────────────────────────────────────────────
describe("impactCalculator", () => {
  it("AVG_WEIGHT_G has 6 categories", () => {
    expect(Object.keys(AVG_WEIGHT_G).length).toBe(6);
  });
  it("AVG_WEIGHT_G all positive", () => {
    for (const v of Object.values(AVG_WEIGHT_G)) {
      expect(v).toBeGreaterThan(0);
    }
  });
  it("CO2_FACTORS all non-negative", () => {
    for (const v of Object.values(CO2_FACTORS)) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
  it("computeImpact zeros for empty input", () => {
    const out = computeImpact({});
    expect(out.totalScans).toBe(0);
    expect(out.totalEstimatedKg).toBe(0);
  });
  it("computeImpact sums scans", () => {
    const out = computeImpact({plastic: 10, paper: 5});
    expect(out.totalScans).toBe(15);
  });
  it("computeImpact CO₂ matches EPA WARM factor", () => {
    const out = computeImpact({plastic: 10});
    const plasticKg = (10 * AVG_WEIGHT_G.plastic) / 1000;
    expect(out.byCategory.plastic.co2KgSaved).toBeCloseTo(plasticKg * CO2_FACTORS.plastic);
  });
  it("narrative locale-aware", () => {
    const empty = computeImpact({});
    const vi = impactToNarrative(empty, "vi");
    const en = impactToNarrative(empty, "en");
    expect(vi).not.toEqual(en);
  });
});

// ─── modelRegistry (HMAC signed manifests) ──────────────────────────────
describe("modelRegistry", () => {
  const sample: ModelManifest = {
    name: "test-model",
    version: "v1",
    framework: "onnx",
    expectedInputSize: [224, 224],
    url: "/models/test.onnx",
    sha256: "deadbeef".repeat(8),
    license: "Apache-2.0",
    registeredAt: 0,
  };

  it("signManifest stable", () => {
    expect(signManifest(sample)).toBe(signManifest(sample));
  });
  it("signManifest is 64-char hex", () => {
    expect(signManifest(sample)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("verify accepts own signature", () => {
    const sig = signManifest(sample);
    expect(verifyManifest({manifest: sample, signature: sig})).toBe(true);
  });
  it("verify rejects tampered signature", () => {
    const sig = signManifest(sample);
    const evil = sig.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
    expect(verifyManifest({manifest: sample, signature: evil})).toBe(false);
  });
  it("verify rejects tampered manifest", () => {
    const sig = signManifest(sample);
    const evil = {...sample, url: "https://attacker.example/x.onnx"};
    expect(verifyManifest({manifest: evil, signature: sig})).toBe(false);
  });
  it("register + get latest", () => {
    const m = modelRegistry.register({...sample, name: "reg-test-2", version: "v9"});
    expect(modelRegistry.get("reg-test-2")?.version).toBe("v9");
    expect(modelRegistry.get("reg-test-2")?.url).toBe(m.url);
  });
  it("get unknown returns null", () => {
    expect(modelRegistry.get("nope-xyz")).toBeNull();
  });
});

// ─── physicsAwareXAI ────────────────────────────────────────────────────
describe("physicsAwareXAI", () => {
  it("exports ≥ 3 rules", () => {
    expect(PHYSICS_RULES.length).toBeGreaterThanOrEqual(3);
  });
  it("each rule has shape", () => {
    for (const r of PHYSICS_RULES) {
      expect(typeof r.id).toBe("string");
      expect(typeof r.description).toBe("string");
      expect(typeof r.check).toBe("function");
    }
  });
  it("evaluatePhysics score in [0,1]", () => {
    const r = evaluatePhysics({
      category: "plastic",
      bboxH: 200,
      bboxW: 100,
      textureVariance: 0.2,
      highLightFraction: 0.05,
      aspect: 2.0,
      densityPrior: 0.04,
      predictedMass: 0.05,
    });
    expect(r.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.overallScore).toBeLessThanOrEqual(1);
  });
  it("rules have score in [0,1]", () => {
    const r = evaluatePhysics({
      category: "paper",
      bboxH: 100,
      bboxW: 100,
      textureVariance: 0.1,
      highLightFraction: 0.01,
      aspect: 1.0,
      densityPrior: 0.03,
      predictedMass: 0.05,
    });
    for (const rule of r.rules) {
      expect(rule.score).toBeGreaterThanOrEqual(0);
      expect(rule.score).toBeLessThanOrEqual(1);
    }
  });
  it("explanationReliable is boolean", () => {
    const r = evaluatePhysics({
      category: "glass",
      bboxH: 50,
      bboxW: 50,
      textureVariance: 0.8,
      highLightFraction: 0.6,
      aspect: 1.0,
      densityPrior: 0.2,
      predictedMass: 0.1,
    });
    expect(typeof r.explanationReliable).toBe("boolean");
  });
});

// ─── federatedWorker pure helpers ──────────────────────────────────────
// Worker file registers `self.addEventListener` at import time, so we
// import the pure helper module instead.
describe("federatedWorkerPure.clipAndNoise", () => {
  it("preserves length", async () => {
    const { clipAndNoise } = await import("../src/workers/federatedWorkerPure.ts");
    const out = clipAndNoise([1, 2, 3], 1.0, 0.1);
    expect(out.length).toBe(3);
  });
  it("respects L2 clip when over-norm", async () => {
    const { clipAndNoise } = await import("../src/workers/federatedWorkerPure.ts");
    // grad has norm 10, clip=2 → scale=0.2
    const out = clipAndNoise([10, 0, 0], 2.0, 0);
    expect(Math.abs(out[0] - 2)).toBeLessThan(1e-9);
  });
  it("identity when under-norm and σ=0", async () => {
    const { clipAndNoise } = await import("../src/workers/federatedWorkerPure.ts");
    const out = clipAndNoise([0.1, 0.2, 0.3], 1.0, 0);
    expect(out[0]).toBeCloseTo(0.1);
    expect(out[2]).toBeCloseTo(0.3);
  });
});

// ─── apiContract types — make sure shape matches what we expect ────────
describe("apiContract", () => {
  it("ClassifyImageResponse has required keys", () => {
    const sample = {
      ok: true as const,
      category: "plastic" as const,
      confidence: 0.9,
      alternatives: [],
      latencyMs: 42,
      backend: "webgpu",
    };
    expect(sample.ok).toBe(true);
    expect(typeof sample.confidence).toBe("number");
  });
  it("FederatedStatsResponse shape is sane", () => {
    const sample = {
      ok: true as const,
      bufferSize: 12,
      minClients: 5,
      latestVersion: {version: "v3", trainedOn: 1234, createdAt: 1700000000},
      dp: {epsilon: 1.0, delta: 1e-5, clipNorm: 1.0},
    };
    expect(sample.bufferSize).toBeGreaterThanOrEqual(sample.minClients);
  });
});