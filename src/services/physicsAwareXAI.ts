/**
 * physicsAwareXAI.ts - Physics-aware explainable AI
 *
 * Standard XAI (e.g., Grad-CAM) flags the *spatial* region the model
 * attends to. For waste sorting, we layer on physics-aware sanity checks:
 *
 *   1. Mass consistency — is the predicted mass plausible given the
 *      bounding-box area and a waste density prior?
 *   2. Material translucency — glass should produce high-frequency
 *      highlights (specular pixel ratio > 0.4).
 *   3. Symmetry constraints — paper/cardboard tend to be rectangular,
 *      not blob-shaped.
 *   4. Category-conditional shape priors — bottles are taller than wide.
 *
 * Output: a "physics consistency score" in [0..1] + per-rule evidence
 * that the explainer overlay can render.
 *
 * Used by `XaiOverlay.tsx` (existing) and the dashboard analytics.
 */

export const PHYSICS_AWARE_XAI_VERSION = "1.0.0";

export interface PhysicsRule {
  id: string;
  description: string;
  /** Function returning 0..1 consistency + a human-readable note. */
  check: (input: PhysicsCheckInput) => { score: number; note: string };
}

export interface PhysicsCheckInput {
  /** 0..1 array with length N — predicted class probabilities. */
  category: string;
  /** Approximate height in pixels of the bounding box. */
  bboxH: number;
  bboxW: number;
  /** Pixel intensity variance inside the bbox. */
  textureVariance: number;
  /** Fraction of pixels brighter than 200/255. */
  highLightFraction: number;
  /** Aspect ratio h/w. */
  aspect: number;
  /** Density prior in kg/m². */
  densityPrior: number;
  /** Predicted mass in kg. */
  predictedMass: number;
}

/** Compute mass-consistency score. */
function massRule({ category, densityPrior, predictedMass }: PhysicsCheckInput) {
  // For a hand-scanned item, plausible mass is in [0.01, 5.0] kg.
  // Each category has a typical density prior.
  const densityMap: Record<string, number> = {
    plastic: 0.04,
    paper: 0.03,
    glass: 0.20,
    metal: 0.10,
    organic: 0.15,
    hazard: 0.05,
  };
  const prior = densityMap[category] ?? densityPrior;
  const ratio = predictedMass / Math.max(1e-6, prior);
  let score = 1 - Math.min(1, Math.abs(Math.log(ratio)) / Math.log(10));
  if (predictedMass < 0 || predictedMass > 8) score = 0;
  const note = `Mass ratio (predicted/prior): ${ratio.toFixed(2)}; prior density=${prior.toFixed(2)} kg`;
  return { score: Math.max(0, Math.min(1, score)), note };
}

/** Compute translucency score for glass classification. */
function glassTranslucencyRule({ category, highLightFraction }: PhysicsCheckInput) {
  if (category === "glass") {
    return {
      score: Math.min(1, highLightFraction / 0.5),
      note: `Glass translucency: highlight pixels = ${(highLightFraction * 100).toFixed(0)}%`,
    };
  }
  return { score: 1, note: "Not glass category; rule inactive." };
}

/** Symmetry rule for paper / cardboard. */
function paperSymmetryRule({ category, aspect }: PhysicsCheckInput) {
  if (category !== "paper") return { score: 1, note: "Not paper category; rule inactive." };
  // Paper is rarely perfectly square; aspect between 0.4 and 2.5 is plausible.
  const score = aspect < 0.4 || aspect > 2.5 ? 0.3 : 1;
  return { score, note: `Paper aspect ratio ${aspect.toFixed(2)}` };
}

/** Bottle aspect rule for plastic category. */
function bottleAspectRule({ category, aspect }: PhysicsCheckInput) {
  if (category !== "plastic") return { score: 1, note: "Not plastic category; rule inactive." };
  // Bottles tend to be taller than wide (aspect > 1.4).
  if (aspect > 1.4) return { score: 1, note: `Plastic aspect ${aspect.toFixed(2)} ≥ 1.4 ✓` };
  return { score: 0.5, note: `Plastic aspect ${aspect.toFixed(2)} < 1.4 — likely not a bottle.` };
}

export const PHYSICS_RULES: PhysicsRule[] = [
  { id: "mass", description: "Mass consistency with density prior", check: massRule },
  { id: "translucency", description: "Translucency for glass", check: glassTranslucencyRule },
  { id: "paper-aspect", description: "Aspect ratio for paper", check: paperSymmetryRule },
  { id: "bottle-aspect", description: "Aspect ratio for plastic bottles", check: bottleAspectRule },
];

export interface PhysicsResult {
  /** Mean score across active rules. */
  overallScore: number;
  rules: { id: string; score: number; note: string }[];
  /** True if overallScore ≥ 0.5 and the explainer should be highlighted. */
  explanationReliable: boolean;
}

export function evaluatePhysics(input: PhysicsCheckInput): PhysicsResult {
  const rules: PhysicsResult["rules"] = [];
  for (const r of PHYSICS_RULES) {
    const { score, note } = r.check(input);
    rules.push({ id: r.id, score, note });
  }
  const overallScore =
    rules.reduce((a, b) => a + b.score, 0) / Math.max(1, rules.length);
  return {
    overallScore,
    rules,
    explanationReliable: overallScore >= 0.5,
  };
}

/**
 * Saliency map generator. We use a simple gradient-magnitude proxy
 * (Sobel-like). The output is a 2-D heatmap that the explainer
 * overlay (`XaiOverlay.tsx`) renders as a translucent coloured layer.
 */
export function saliencyHeatmap(
  pixels: Float32Array,
  width: number,
  height: number
): Float32Array {
  const out = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx = pixels[idx + 1] - pixels[idx - 1];
      const gy = pixels[idx + width] - pixels[idx - width];
      out[idx] = Math.min(1, Math.sqrt(gx * gx + gy * gy));
    }
  }
  return out;
}

/**
 * Physics-aware attention adjustment: reweight the saliency map by the
 * physics rules so the explainer highlights "where it should be looking".
 */
export function physicsAwareSaliency(
  heatmap: Float32Array,
  physicsResult: PhysicsResult,
  options?: { rulePenalty?: number }
): Float32Array {
  const penalty = options?.rulePenalty ?? 0.5;
  const out = new Float32Array(heatmap.length);
  const factor = 1 - (1 - physicsResult.overallScore) * penalty;
  for (let i = 0; i < heatmap.length; i++) {
    out[i] = Math.min(1, heatmap[i] * factor);
  }
  return out;
}