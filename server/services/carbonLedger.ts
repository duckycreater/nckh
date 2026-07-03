/**
 * carbonLedger - Immutable audit trail for CO₂ savings claims
 *
 * Phase 4 deliverable: every kg CO₂eq saved gets a SHA-256 provenance
 * hash, tied to either:
 *   - scan_count_estimate  (from impactCalculator + scan counts)
 *   - smart_bin_weight    (from SmartBinAdapter.getReading)
 *   - audit               (manual / external verification)
 *
 * Schema: see migration 005 `carbon_ledger_entries`.
 *
 * Why immutable?
 *   - Future integration with carbon credit registries (Gold Standard,
 *     Verra) requires cryptographic provenance.
 *   - Auditors / NGOs / UN agencies can verify each entry without
 *     trusting BMO's app.
 *
 * Note: we do NOT issue blockchain tokens. Just a verifiable audit log.
 */

import crypto from "crypto";
import { getDb } from "../db.js";
import { computeImpact, type ImpactCategory } from "./impactCalculator.js";

export type LedgerSource = "scan_count_estimate" | "smart_bin_weight" | "audit";

export interface LedgerEntry {
  userId?: string;
  cohort?: string;
  category: ImpactCategory;
  weightKg: number;
  co2KgAvoided: number;
  source: LedgerSource;
  provenanceHash: string;
  timestamp: number;
}

export class CarbonLedger {
  /**
   * Record a single entry. Generates the provenance hash from
   * (user_id + category + weight + timestamp + source).
   */
  async record(input: Omit<LedgerEntry, "provenanceHash">): Promise<LedgerEntry> {
    const provenanceHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({
        user_id: input.userId || null,
        category: input.category,
        weight_kg: input.weightKg,
        co2_kg_avoided: input.co2KgAvoided,
        source: input.source,
        timestamp: input.timestamp,
      }))
      .digest("hex");

    const entry: LedgerEntry = { ...input, provenanceHash };

    const db = getDb();
    if (db) {
      await db.query(
        `INSERT INTO carbon_ledger_entries
           (user_id, cohort, category, weight_kg, co2_kg_avoided,
            source, provenance_hash, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [
          entry.userId || null,
          entry.cohort || null,
          entry.category,
          entry.weightKg,
          entry.co2KgAvoided,
          entry.source,
          entry.provenanceHash,
          new Date(entry.timestamp).toISOString(),
        ]
      ).catch((e) => console.warn("[carbonLedger] persist failed:", (e as Error).message));
    }

    return entry;
  }

  /**
   * Bulk-record entries derived from scan counts (estimated weights).
   */
  async recordFromScans(
    scansByCategory: Partial<Record<ImpactCategory, number>>,
    opts: { userId?: string; cohort?: string; source?: LedgerSource } = {}
  ): Promise<LedgerEntry[]> {
    const summary = computeImpact(scansByCategory);
    const entries: LedgerEntry[] = [];
    for (const cat of Object.keys(summary.byCategory) as ImpactCategory[]) {
      const b = summary.byCategory[cat];
      if (b.estimatedKg > 0 && b.co2KgSaved > 0) {
        entries.push(await this.record({
          userId: opts.userId,
          cohort: opts.cohort,
          category: cat,
          weightKg: b.estimatedKg,
          co2KgAvoided: b.co2KgSaved,
          source: opts.source || "scan_count_estimate",
          timestamp: Date.now(),
        }));
      }
    }
    return entries;
  }

  /**
   * Verify a provenance hash against a stored entry (returns true on match).
   */
  verify(entry: LedgerEntry): boolean {
    const expected = crypto
      .createHash("sha256")
      .update(JSON.stringify({
        user_id: entry.userId || null,
        category: entry.category,
        weight_kg: entry.weightKg,
        co2_kg_avoided: entry.co2KgAvoided,
        source: entry.source,
        timestamp: entry.timestamp,
      }))
      .digest("hex");
    return expected === entry.provenanceHash;
  }

  /**
   * Aggregate totals for dashboards.
   */
  async getTotals(opts: { cohort?: string; sinceDays?: number } = {}) {
    const db = getDb();
    if (!db) return { totalCo2: 0, totalKg: 0, entryCount: 0 };

    const sinceDays = opts.sinceDays || 30;
    const params: any[] = [sinceDays];
    let cohortFilter = "";
    if (opts.cohort) {
      cohortFilter = "AND cohort = $2";
      params.push(opts.cohort);
    }
    const { rows } = await db.query(
      `SELECT
         COALESCE(SUM(co2_kg_avoided), 0) AS total_co2,
         COALESCE(SUM(weight_kg), 0) AS total_kg,
         COUNT(*) AS entry_count
       FROM carbon_ledger_entries
       WHERE timestamp > NOW() - ($1::int * INTERVAL '1 day')
         ${cohortFilter}`,
      params
    );
    const r = rows[0] || {};
    return {
      totalCo2: Number(r.total_co2) || 0,
      totalKg: Number(r.total_kg) || 0,
      entryCount: Number(r.entry_count) || 0,
    };
  }
}

export const carbonLedger = new CarbonLedger();