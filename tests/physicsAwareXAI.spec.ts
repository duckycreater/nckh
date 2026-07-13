/**
 * physicsAwareXAI.spec.ts — verify physics rule semantics.
 */
import { describe, it, expect } from "vitest";
import { evaluatePhysics, PHYSICS_RULES } from "../src/services/physicsAwareXAI";

describe("PHYSICS_RULES", () => {
  it("exports at least 3 rules", () => {
    expect(PHYSICS_RULES.length).toBeGreaterThanOrEqual(3);
  });
  it("each rule has id, description, check", () => {
    for (const r of PHYSICS_RULES) {
      expect(typeof r.id).toBe("string");
      expect(typeof r.description).toBe("string");
      expect(typeof r.check).toBe("function");
    }
  });
});

describe("evaluatePhysics", () => {
  it("returns overall score in [0,1]", () => {
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
  it("flags rule results with id+score+note", () => {
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
      expect(typeof rule.id).toBe("string");
      expect(rule.score).toBeGreaterThanOrEqual(0);
      expect(rule.score).toBeLessThanOrEqual(1);
    }
  });
  it("explanationReliable is a boolean", () => {
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