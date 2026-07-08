/**
 * impactCalculator.spec.ts — verifies CO₂/kg conversions + narrative builder.
 */
import { describe, it, expect } from "vitest";
import {
  computeImpact,
  impactToNarrative,
  AVG_WEIGHT_G,
  CO2_FACTORS,
} from "../server/services/impactCalculator";

describe("AVG_WEIGHT_G", () => {
  it("has 6 categories", () => {
    expect(Object.keys(AVG_WEIGHT_G).length).toBe(6);
  });
  it("all weights are positive", () => {
    for (const v of Object.values(AVG_WEIGHT_G)) {
      expect(v).toBeGreaterThan(0);
    }
  });
});

describe("CO2_FACTORS", () => {
  it("all factors are non-negative", () => {
    for (const v of Object.values(CO2_FACTORS)) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("computeImpact", () => {
  it("returns zeros for empty input", () => {
    const out = computeImpact({});
    expect(out.totalScans).toBe(0);
    expect(out.totalEstimatedKg).toBe(0);
    expect(out.totalCo2KgSaved).toBe(0);
  });
  it("sums scans across categories", () => {
    const out = computeImpact({
      plastic: 10,
      paper: 5,
    });
    expect(out.totalScans).toBe(15);
  });
  it("computes per-category CO₂ using EPA WARM factors", () => {
    const out = computeImpact({plastic: 10});
    const plasticKg = (10 * AVG_WEIGHT_G.plastic) / 1000;
    expect(out.byCategory.plastic.co2KgSaved).toBeCloseTo(plasticKg * CO2_FACTORS.plastic, 5);
  });
});

describe("impactToNarrative", () => {
  const generatedAt = Date.now();
  const emptyInput = {totalScans: 0, totalEstimatedKg: 0, totalCo2KgSaved: 0, totalTreesEquivalent: 0, totalKwhSaved: 0, generatedAt, byCategory: {plastic: {category: "plastic", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, paper: {category: "paper", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, glass: {category: "glass", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, metal: {category: "metal", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, organic: {category: "organic", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, hazard: {category: "hazard", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}}};
  const populatedInput = {totalScans: 10, totalEstimatedKg: 1, totalCo2KgSaved: 0.5, totalTreesEquivalent: 0.01, totalKwhSaved: 1, generatedAt, byCategory: {plastic: {category: "plastic", scans: 10, estimatedKg: 0.1, co2KgSaved: 0.5, treesEquivalent: 0.01, kwhSaved: 1}, paper: {category: "paper", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, glass: {category: "glass", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, metal: {category: "metal", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, organic: {category: "organic", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, hazard: {category: "hazard", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}}};
  const singleInput = {totalScans: 1, totalEstimatedKg: 0.1, totalCo2KgSaved: 0.1, totalTreesEquivalent: 0.01, totalKwhSaved: 0.1, generatedAt, byCategory: {plastic: {category: "plastic", scans: 1, estimatedKg: 0.1, co2KgSaved: 0.1, treesEquivalent: 0.01, kwhSaved: 0.1}, paper: {category: "paper", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, glass: {category: "glass", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, metal: {category: "metal", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, organic: {category: "organic", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}, hazard: {category: "hazard", scans: 0, estimatedKg: 0, co2KgSaved: 0, treesEquivalent: 0, kwhSaved: 0}}};
  it("returns non-empty string for empty input", () => {
    const text = impactToNarrative(emptyInput, "vi");
    expect(text.length).toBeGreaterThan(0);
  });
  it("returns non-empty string for populated input", () => {
    const text = impactToNarrative(populatedInput, "vi");
    expect(text.length).toBeGreaterThan(0);
  });
  it("honours locale", () => {
    const vi = impactToNarrative(singleInput, "vi");
    const en = impactToNarrative(singleInput, "en");
    expect(vi).not.toBe(en);
  });
});