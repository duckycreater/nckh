/**
 * impactCalculator - CO₂ equivalent accounting for waste sorting
 *
 * Phase 4 deliverable: turn scan counts into environmental metrics for
 * UN SDG 12.5 (reduce waste) + 13.3 (climate action) reporting.
 *
 * Conversion factors (peer-reviewed):
 *   - Plastic: 2.5 kg CO₂eq per kg recycled vs. landfill (EPA WARM v15)
 *   - Paper: 1.7 kg CO₂eq per kg (EPA WARM)
 *   - Glass: 0.6 kg CO₂eq per kg
 *   - Metal (aluminum): 4.0 kg CO₂eq per kg
 *   - Organic (composted): 0.5 kg CO₂eq per kg
 *
 * Source: U.S. EPA WARM model + IPCC AR6 Working Group III
 */

export type ImpactCategory = "plastic" | "paper" | "glass" | "metal" | "organic" | "hazard";

/** kg CO₂eq saved per kg of waste correctly sorted (vs. landfill). */
export const CO2_FACTORS: Record<ImpactCategory, number> = {
  plastic: 2.5,
  paper: 1.7,
  glass: 0.6,
  metal: 4.0,
  organic: 0.5,
  hazard: 0.0, // hazard: no CO₂ saving, but tracks compliance
};

/**
 * Average weight (grams) per item for each category.
 * Vietnam-specific estimates (eco-quest field study 2024).
 * Used when no smart-bin weight is available — converts scan count → kg.
 */
export const AVG_WEIGHT_G: Record<ImpactCategory, number> = {
  plastic: 28,    // PET bottle / plastic container
  paper: 22,      // A4 sheet / paper cup
  glass: 180,     // glass bottle
  metal: 14,      // aluminum can
  organic: 110,   // food scrap
  hazard: 80,     // battery / bulb
};

export interface CategoryBreakdown {
  category: ImpactCategory;
  scans: number;
  estimatedKg: number;
  co2KgSaved: number;
  treesEquivalent: number;  // 1 tree absorbs ~21 kg CO₂/year
  kwhSaved: number;         // 1 kWh ≈ 0.5 kg CO₂ in coal-heavy grid
}

export interface ImpactSummary {
  totalScans: number;
  totalEstimatedKg: number;
  totalCo2KgSaved: number;
  totalTreesEquivalent: number;
  totalKwhSaved: number;
  byCategory: Record<ImpactCategory, CategoryBreakdown>;
  generatedAt: number;
}

/**
 * Compute environmental impact from scan counts per category.
 */
export function computeImpact(scansByCategory: Partial<Record<ImpactCategory, number>>): ImpactSummary {
  const breakdown: Record<ImpactCategory, CategoryBreakdown> = {
    plastic: empty("plastic"),
    paper: empty("paper"),
    glass: empty("glass"),
    metal: empty("metal"),
    organic: empty("organic"),
    hazard: empty("hazard"),
  };

  let totalScans = 0;
  let totalKg = 0;
  let totalCo2 = 0;
  let totalTrees = 0;
  let totalKwh = 0;

  for (const cat of Object.keys(breakdown) as ImpactCategory[]) {
    const scans = scansByCategory[cat] || 0;
    const kg = (scans * AVG_WEIGHT_G[cat]) / 1000;
    const co2 = kg * CO2_FACTORS[cat];
    const trees = co2 / 21;
    const kwh = co2 / 0.5;

    breakdown[cat] = {
      category: cat,
      scans,
      estimatedKg: round(kg, 3),
      co2KgSaved: round(co2, 3),
      treesEquivalent: round(trees, 4),
      kwhSaved: round(kwh, 2),
    };
    totalScans += scans;
    totalKg += kg;
    totalCo2 += co2;
    totalTrees += trees;
    totalKwh += kwh;
  }

  return {
    totalScans,
    totalEstimatedKg: round(totalKg, 3),
    totalCo2KgSaved: round(totalCo2, 3),
    totalTreesEquivalent: round(totalTrees, 4),
    totalKwhSaved: round(totalKwh, 2),
    byCategory: breakdown,
    generatedAt: Date.now(),
  };
}

/**
 * Convert impact numbers to SDG 12.5/13.3 narrative.
 */
export function impactToNarrative(summary: ImpactSummary, locale: string = "vi"): string {
  const t = (vi: string, en: string) => (locale === "vi" ? vi : en);
  if (summary.totalScans === 0) {
    return t("Chưa có dữ liệu phân loại.", "No sorting data yet.");
  }
  return [
    t(
      `Qua ${summary.totalScans} lượt phân loại, BMO đã giúp tiết kiệm khoảng ${summary.totalCo2KgSaved.toFixed(1)} kg CO₂ tương đương (≈ ${summary.totalTreesEquivalent.toFixed(1)} cây xanh / năm).`,
      `Through ${summary.totalScans} sorts, BMO helped avoid approximately ${summary.totalCo2KgSaved.toFixed(1)} kg CO₂eq (≈ ${summary.totalTreesEquivalent.toFixed(1)} trees / year).`
    ),
    t(
      `Tương đương ${summary.totalKwhSaved.toFixed(0)} kWh điện — đủ để thắp sáng một lớp học trong ${(summary.totalKwhSaved / 0.06 / 8).toFixed(0)} giờ.`,
      `Equivalent to ${summary.totalKwhSaved.toFixed(0)} kWh — enough to light a classroom for ${(summary.totalKwhSaved / 0.06 / 8).toFixed(0)} hours.`
    ),
    t(
      `Đóng góp trực tiếp cho Mục tiêu Phát triển Bền vững 12.5 (giảm thải) và 13.3 (giáo dục khí hậu).`,
      `Direct contribution to UN SDG 12.5 (reduce waste) and 13.3 (climate education).`
    ),
  ].join(" ");
}

function empty(category: ImpactCategory): CategoryBreakdown {
  return {
    category,
    scans: 0,
    estimatedKg: 0,
    co2KgSaved: 0,
    treesEquivalent: 0,
    kwhSaved: 0,
  };
}

function round(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}