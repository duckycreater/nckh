/**
 * Impact Routes - Phase 4: CO₂ savings + smart bin endpoints
 *
 *   GET  /api/impact/summary           - Aggregate impact for a cohort/global
 *   GET  /api/impact/timeseries        - Daily totals over time window
 *   GET  /api/impact/sdg-report        - JSON formatted UN SDG 12.5/13.3 report
 *   POST /api/impact/ledger/record     - Manual record (audit source)
 *   GET  /api/impact/ledger/verify/:hash - Verify a provenance hash
 *   GET  /api/impact/smartbin/:deviceId - Smart bin reading
 *   POST /api/impact/smartbin/:deviceId/scan - record a scan against a bin (test)
 */

import { Router } from "express";
import { computeImpact, impactToNarrative, type ImpactCategory } from "../services/impactCalculator.js";
import { carbonLedger } from "../services/carbonLedger.js";
import { smartBinRegistry, type StubAdapter } from "../services/smartBinAdapter.js";
import { getDb } from "../db.js";

export function impactRouter(): Router {
  const router = Router();

  // GET /api/impact/summary?cohort=global&sinceDays=30
  router.get("/summary", async (req, res) => {
    try {
      const cohort = String(req.query.cohort || "global");
      const sinceDays = parseInt(String(req.query.sinceDays || "30"));

      const db = getDb();
      if (!db) {
        return res.json({
          cohort, sinceDays, scansByCategory: {}, ...computeImpact({}),
          narrative: impactToNarrative(computeImpact({}), String(req.query.locale || "vi")),
        });
      }

      // Aggregate scans by category in the window
      const params: any[] = [sinceDays];
      let cohortFilter = "";
      if (cohort !== "global") {
        cohortFilter = "AND user_id IN (SELECT user_id FROM research_users WHERE cohort = $2)";
        params.push(cohort);
      }
      const { rows } = await db.query(
        `SELECT predicted_category, COUNT(*) AS scans
         FROM ai_scan_metrics
         WHERE timestamp > NOW() - ($1::int * INTERVAL '1 day')
           ${cohortFilter}
         GROUP BY predicted_category`,
        params
      );
      const scansByCategory: Partial<Record<ImpactCategory, number>> = {};
      for (const row of rows) {
        scansByCategory[row.predicted_category as ImpactCategory] = Number(row.scans);
      }
      const summary = computeImpact(scansByCategory);
      const totals = await carbonLedger.getTotals({ cohort, sinceDays });

      res.json({
        cohort,
        sinceDays,
        scansByCategory,
        ...summary,
        ledgerTotals: totals,
        narrative: impactToNarrative(summary, String(req.query.locale || "vi")),
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/impact/timeseries?days=30
  router.get("/timeseries", async (req, res) => {
    try {
      const days = Math.min(parseInt(String(req.query.days || "30")), 365);
      const db = getDb();
      if (!db) return res.json({ days, points: [] });
      const { rows } = await db.query(
        `SELECT
           DATE(timestamp) AS day,
           predicted_category AS category,
           COUNT(*) AS scans
         FROM ai_scan_metrics
         WHERE timestamp > NOW() - ($1::int * INTERVAL '1 day')
         GROUP BY DATE(timestamp), predicted_category
         ORDER BY day ASC`,
        [days]
      );
      const byDay: Record<string, Partial<Record<ImpactCategory, number>>> = {};
      for (const row of rows) {
        const d = String(row.day);
        if (!byDay[d]) byDay[d] = {};
        byDay[d][row.category as ImpactCategory] = Number(row.scans);
      }
      const points = Object.entries(byDay).map(([day, scans]) => {
        const s = computeImpact(scans);
        return {
          day,
          scans: s.totalScans,
          kg: s.totalEstimatedKg,
          co2: s.totalCo2KgSaved,
        };
      });
      res.json({ days, points });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/impact/sdg-report?cohort=global&locale=vi
  router.get("/sdg-report", async (req, res) => {
    try {
      const cohort = String(req.query.cohort || "global");
      const locale = String(req.query.locale || "vi");
      const db = getDb();
      if (!db) {
        return res.json({
          sdg_12_5: {},
          sdg_13_3: {},
          generatedAt: new Date().toISOString(),
        });
      }
      const { rows: cohortRows } = await db.query(
        `SELECT COUNT(DISTINCT user_id) AS users,
                COUNT(*) AS total_scans
         FROM ai_scan_metrics
         WHERE timestamp > NOW() - INTERVAL '30 days'`
      );
      const summaryRows = await db.query(
        `SELECT predicted_category, COUNT(*) AS scans
         FROM ai_scan_metrics
         WHERE timestamp > NOW() - INTERVAL '30 days'
         GROUP BY predicted_category`
      );
      const summaryRowsArr: any[] = Array.isArray(summaryRows) ? summaryRows : (summaryRows as any).rows || [];
      const cohortRowsArr: any[] = Array.isArray(cohortRows) ? cohortRows : (cohortRows as any).rows || [];
      const scans: Partial<Record<ImpactCategory, number>> = {};
      for (const r of summaryRowsArr) scans[r.predicted_category as ImpactCategory] = Number(r.scans);
      const summary = computeImpact(scans);

      const totals = await carbonLedger.getTotals({ cohort, sinceDays: 30 });
      res.json({
        generatedAt: new Date().toISOString(),
        cohort,
        locale,
        sdg_12_5: {
          total_scans_30d: cohortRowsArr[0]?.total_scans || 0,
          unique_users_30d: cohortRowsArr[0]?.users || 0,
          total_estimated_kg_diverted: summary.totalEstimatedKg,
          by_category: Object.fromEntries(
            Object.entries(summary.byCategory).map(([k, v]) => [k, { scans: v.scans, kg: v.estimatedKg }])
          ),
        },
        sdg_13_3: {
          co2_kg_avoided: summary.totalCo2KgSaved,
          trees_equivalent: summary.totalTreesEquivalent,
          kwh_saved: summary.totalKwhSaved,
          ledger_total_co2: totals.totalCo2,
          ledger_entries: totals.entryCount,
        },
        narrative: impactToNarrative(summary, locale),
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/impact/ledger/record - manual audit entry
  router.post("/ledger/record", async (req, res) => {
    try {
      const { category, weightKg, source, userId, cohort } = req.body || {};
      if (!category || typeof weightKg !== "number") {
        return res.status(400).json({ error: "category + weightKg required" });
      }
      const co2 = weightKg * (require("../services/impactCalculator.js").CO2_FACTORS[category] || 0);
      const entry = await carbonLedger.record({
        userId, cohort, category, weightKg,
        co2KgAvoided: co2, source: source || "audit",
        timestamp: Date.now(),
      });
      res.json(entry);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/impact/smartbin/:deviceId - reading
  router.get("/smartbin/:deviceId", async (req, res) => {
    try {
      const adapter = smartBinRegistry.get("stub");
      const reading = await adapter.getReading(req.params.deviceId);
      res.json(reading);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/impact/smartbin/:deviceId/scan - record a scan against the bin
  router.post("/smartbin/:deviceId/scan", async (req, res) => {
    try {
      const { category } = req.body || {};
      const stub = smartBinRegistry.get("stub") as StubAdapter;
      stub.recordScan(req.params.deviceId, category);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}