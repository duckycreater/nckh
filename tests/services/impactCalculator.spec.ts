/**
 * tests/services/impactCalculator.spec.ts
 *
 * CO₂-eq accounting used to render the environmental impact story.
 * The numbers feed the SDG 12.5 / 13.3 dashboard, so any drift in the
 * factors or rounding behaviour is a research-credibility risk.
 *
 * Run with: npm test  (node:test).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  computeImpact,
  impactToNarrative,
  CO2_FACTORS,
  AVG_WEIGHT_G,
  type ImpactCategory,
} from "../../server/services/impactCalculator.ts";

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

describe("impactCalculator.factors", () => {
  it("has 6 categories with non-negative CO₂ factors", () => {
    const cats: ImpactCategory[] = ["plastic", "paper", "glass", "metal", "organic", "hazard"];
    expect(cats.length).toBe(6);
    for (const c of cats) {
      expect(typeof CO2_FACTORS[c]).toBe("number");
      expect(CO2_FACTORS[c]).toBeGreaterThanOrEqual(0);
    }
  });
  it("metal has highest CO₂ factor (aluminum recycling)", () => {
    const others = Object.entries(CO2_FACTORS).filter(([k]) => k !== "metal");
    for (const [, v] of others) {
      expect(CO2_FACTORS.metal).toBeGreaterThanOrEqual(Number(v));
    }
  });
  it("hazard has 0 CO₂ factor (compliance-only)", () => {
    expect(CO2_FACTORS.hazard).toBe(0);
  });
  it("all weights are positive", () => {
    for (const k of Object.keys(AVG_WEIGHT_G) as ImpactCategory[]) {
      expect(AVG_WEIGHT_G[k]).toBeGreaterThan(0);
    }
  });
});

describe("impactCalculator.computeImpact", () => {
  it("zero scans → all zeros, generatedAt set", () => {
    const s = computeImpact({});
    expect(s.totalScans).toBe(0);
    expect(s.totalCo2KgSaved).toBe(0);
    expect(s.totalEstimatedKg).toBe(0);
    expect(s.totalTreesEquivalent).toBe(0);
    expect(s.totalKwhSaved).toBe(0);
    expect(typeof s.generatedAt).toBe("number");
    expect(s.generatedAt > 0).toBe(true);
    for (const k of Object.keys(s.byCategory) as ImpactCategory[]) {
      expect(s.byCategory[k].scans).toBe(0);
    }
  });
  it("plastic: 100 scans → expected kg and CO₂", () => {
    const s = computeImpact({plastic: 100});
    // 100 scans × 28 g = 2800 g = 2.8 kg
    expect(s.byCategory.plastic.estimatedKg).toBeCloseTo(2.8, 3);
    // 2.8 kg × 2.5 = 7.0 kg CO₂
    expect(s.byCategory.plastic.co2KgSaved).toBeCloseTo(7.0, 3);
    // Trees = 7.0 / 21 ≈ 0.3333
    expect(s.byCategory.plastic.treesEquivalent).toBeCloseTo(0.3333, 3);
    // kWh = 7.0 / 0.5 = 14
    expect(s.byCategory.plastic.kwhSaved).toBeCloseTo(14, 2);
    expect(s.totalScans).toBe(100);
  });
  it("totals equal sum of per-category breakdown", () => {
    const s = computeImpact({plastic: 50, paper: 30, metal: 20});
    expect(s.totalScans).toBe(100);
    const sumKg =
      s.byCategory.plastic.estimatedKg +
      s.byCategory.paper.estimatedKg +
      s.byCategory.metal.estimatedKg +
      s.byCategory.glass.estimatedKg +
      s.byCategory.organic.estimatedKg +
      s.byCategory.hazard.estimatedKg;
    expect(s.totalEstimatedKg).toBeCloseTo(sumKg, 6);
    const sumCo2 =
      s.byCategory.plastic.co2KgSaved +
      s.byCategory.paper.co2KgSaved +
      s.byCategory.metal.co2KgSaved;
    expect(s.totalCo2KgSaved).toBeCloseTo(sumCo2, 6);
  });
  it("hazard contributes 0 to CO₂ but tracks count", () => {
    const s = computeImpact({hazard: 5});
    expect(s.byCategory.hazard.scans).toBe(5);
    expect(s.byCategory.hazard.co2KgSaved).toBe(0);
    expect(s.totalCo2KgSaved).toBe(0);
  });
  it("treats missing keys as 0", () => {
    const s = computeImpact({plastic: 10});
    expect(s.byCategory.paper.scans).toBe(0);
  });
});

describe("impactCalculator.impactToNarrative", () => {
  it("returns 'no data' message when totalScans=0", () => {
    const s = computeImpact({});
    expect(impactToNarrative(s, "vi")).toBeType("string");
    expect(impactToNarrative(s, "vi").length).toBeGreaterThan(5);
    expect(impactToNarrative(s, "en")).toBeType("string");
  });
  it("vi narrative contains CO₂ number", () => {
    const s = computeImpact({plastic: 100, paper: 50});
    const txt = impactToNarrative(s, "vi");
    expect(txt).toMatch(/CO₂/);
    expect(txt.length).toBeGreaterThan(20);
  });
  it("en narrative mentions SDG", () => {
    const s = computeImpact({plastic: 100, paper: 50});
    const txt = impactToNarrative(s, "en");
    expect(txt.toLowerCase()).toMatch(/sdg/);
  });
});