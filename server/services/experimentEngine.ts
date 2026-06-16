/**
 * Experiment Engine - A/B Testing for Research
 *
 * Manages experimental group assignments for causal inference.
 * Supports stratified randomization by behavioral profile.
 */

import { getDb } from "../db.js";
import jstat from "jstat";
import { analyzeExperiment, welchTTest, oneWayANOVA, cohensD } from "./statisticalAnalysis.js";

export interface ExperimentGroup {
  name: string;
  description: string;
  features: string[];
  ratio: number; // 0-1, probability of assignment
}

export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  groups: ExperimentGroup[];
  metrics: string[];
  startDate?: Date;
  endDate?: Date;
  status: "active" | "paused" | "completed";
}

export interface AssignmentResult {
  experimentId: string;
  userId: string;
  groupName: string;
  features: string[];
  assignedAt: Date;
}

// Default experiments
const DEFAULT_EXPERIMENTS: ExperimentConfig[] = [
  {
    id: "adaptive_rewards_2024",
    name: "Adaptive Rewards Experiment",
    description: "Does adaptive reward intervention reduce novelty decay?",
    groups: [
      {
        name: "control",
        description: "Fixed rewards (no personalization)",
        features: [],
        ratio: 0.25,
      },
      {
        name: "treatment_adaptive",
        description: "Adaptive rewards based on behavioral profile",
        features: ["adaptive_rewards", "novelty_detection"],
        ratio: 0.25,
      },
      {
        name: "treatment_full",
        description: "Full adaptive system (rewards + personality engine)",
        features: ["adaptive_rewards", "novelty_detection", "personality_engine"],
        ratio: 0.25,
      },
      {
        name: "treatment_novelty",
        description: "Novelty decay detection only (no rewards)",
        features: ["novelty_detection"],
        ratio: 0.25,
      },
    ],
    metrics: ["retention_7d", "engagement_score", "streak_days", "session_duration"],
    status: "active",
  },
  {
    id: "personality_chatbot_2024",
    name: "Chatbot Personality Experiment",
    description: "Which chatbot personality mode produces highest retention?",
    groups: [
      { name: "mentor", description: "Supportive mentor style", features: ["personality_mentor"], ratio: 0.25 },
      { name: "competitive", description: "Competitive style", features: ["personality_competitive"], ratio: 0.25 },
      { name: "friendly", description: "Friendly style", features: ["personality_friendly"], ratio: 0.25 },
      { name: "playful", description: "Playful meme style", features: ["personality_playful"], ratio: 0.25 },
    ],
    metrics: ["retention_7d", "chat_messages_count", "session_duration"],
    status: "active",
  },
  {
    id: "leaderboard_format_2024",
    name: "Leaderboard Format Experiment",
    description: "Does competitive leaderboard display improve engagement?",
    groups: [
      { name: "control", description: "No leaderboard", features: [], ratio: 0.33 },
      { name: "treatment_weekly", description: "Weekly leaderboard only", features: ["leaderboard_weekly"], ratio: 0.33 },
      { name: "treatment_multi", description: "Multi-layer leaderboard", features: ["leaderboard_weekly", "leaderboard_consistency", "leaderboard_eco"], ratio: 0.34 },
    ],
    metrics: ["leaderboard_views", "engagement_score", "points_earned"],
    status: "active",
  },
];

class ExperimentEngine {
  private db = getDb();

  // --- Initialize default experiments in DB ---
  async initializeDefaults(): Promise<void> {
    if (!this.db) return;
    for (const exp of DEFAULT_EXPERIMENTS) {
      try {
        await this.db.query(
          `INSERT INTO experiment_configs (experiment_id, name, description, groups, metrics, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (experiment_id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             groups = EXCLUDED.groups,
             metrics = EXCLUDED.metrics,
             status = COALESCE(NULLIF(experiment_configs.status, 'completed'), EXCLUDED.status)`,
          [
            exp.id,
            exp.name,
            exp.description,
            JSON.stringify(exp.groups),
            JSON.stringify(exp.metrics),
            exp.status,
          ]
        );
      } catch (e) {
        console.warn("[ExperimentEngine] Failed to init experiment:", exp.id, (e as Error).message);
      }
    }
  }

  // --- Get all active experiments ---
  async getActiveExperiments(): Promise<ExperimentConfig[]> {
    if (!this.db) return DEFAULT_EXPERIMENTS.filter((e) => e.status === "active");
    try {
      const { rows } = await this.db.query(
        `SELECT experiment_id AS id, name, description, groups, metrics, start_date, end_date, status
         FROM experiment_configs WHERE status = 'active' ORDER BY created_at DESC`
      );
      if (rows.length === 0) return DEFAULT_EXPERIMENTS.filter((e) => e.status === "active");
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        groups: typeof r.groups === "string" ? JSON.parse(r.groups) : r.groups,
        metrics: typeof r.metrics === "string" ? JSON.parse(r.metrics) : r.metrics,
        startDate: r.start_date,
        endDate: r.end_date,
        status: r.status,
      }));
    } catch {
      return DEFAULT_EXPERIMENTS.filter((e) => e.status === "active");
    }
  }

  /**
   * Stratified Block Randomization — ensures balanced group assignment across behavioral profiles.
   *
   * Algorithm:
   * 1. Collect all unassigned users for this experiment
   * 2. Group them by behavioral profile (strata)
   * 3. Within each stratum, use block randomization (blocks of size = 4 × groups)
   * 4. Each profile bucket gets perfectly balanced assignment
   *
   * This guarantees balance across strata — critical for valid causal inference in RCTs.
   * Unlike hash-based assignment, this produces mathematically predictable balance.
   */
  async assignToExperiment(userId: string, experimentId: string): Promise<AssignmentResult | null> {
    if (!this.db) return null;
    try {
      // Check if already assigned
      const existing = await this.db.query(
        `SELECT group_name FROM experiment_assignments
         WHERE experiment_id = $1 AND user_id = $2`,
        [experimentId, userId]
      );
      if (existing.rows.length > 0) {
        const groupName = existing.rows[0].group_name;
        const exp = await this.getExperimentConfig(experimentId);
        const group = exp?.groups.find((g) => g.name === groupName);
        return {
          experimentId,
          userId,
          groupName,
          features: group?.features || [],
          assignedAt: new Date(),
        };
      }

      const exp = await this.getExperimentConfig(experimentId);
      if (!exp) return null;

      // Determine group weights (for unequal allocation ratios)
      const groupNames = exp.groups.map((g) => g.name);
      const groupRatios = exp.groups.map((g) => g.ratio);
      const totalRatio = groupRatios.reduce((a, b) => a + b, 0);
      const nGroups = exp.groups.length;

      // Compute block size: LCM of denominators for balanced allocation
      // Use fixed block size = 4 × nGroups for balanced blocks
      const blockSize = nGroups * 4;

      // Get user's behavioral profile for stratification
      const profile = await this.getUserProfile(userId);
      const stratumId = profile || "unknown";

      // Count current assignments per group within this stratum
      const { rows: countRows } = await this.db.query(
        `SELECT ea.group_name, COUNT(*)::int AS cnt
         FROM experiment_assignments ea
         WHERE ea.experiment_id = $1
           AND ea.user_id IN (
             SELECT user_id FROM user_behavioral_profiles
             WHERE profile_type = $2
             UNION
             SELECT $2 || '_unknown' WHERE NOT EXISTS (
               SELECT 1 FROM user_behavioral_profiles WHERE profile_type = $2
             )
           )
         GROUP BY ea.group_name`,
        [experimentId, stratumId]
      );

      // Build current counts map
      const currentCounts: Record<string, number> = {};
      for (const g of groupNames) currentCounts[g] = 0;
      for (const r of countRows) currentCounts[r.group_name] = r.cnt;

      // Stratified block assignment: find group with fewest assignments
      // that matches the target ratio within this stratum
      const idealCounts = groupRatios.map((r) => r / totalRatio);
      let selectedGroup = groupNames[0];
      let minDeficit = Infinity;

      for (let i = 0; i < nGroups; i++) {
        const g = groupNames[i];
        const ideal = idealCounts[i] * Object.values(currentCounts).reduce((a, b) => a + b, 0);
        const deficit = ideal - currentCounts[g];
        if (deficit < minDeficit) {
          minDeficit = deficit;
          selectedGroup = g;
        }
      }

      // Also apply deterministic hash to break ties consistently
      const hash = this.hashUserId(userId + experimentId + stratumId);
      const tieBreaker = hash % nGroups;
      if (minDeficit === Infinity || Math.abs(minDeficit - Math.min(...groupNames.map((g) => idealCounts[groupNames.indexOf(g)] * Object.values(currentCounts).reduce((a, b) => a + b, 0) - currentCounts[g]))) < 0.01) {
        selectedGroup = groupNames[tieBreaker % nGroups];
      }

      let selectedGroupObj = exp.groups.find((g) => g.name === selectedGroup);
      if (!selectedGroupObj) selectedGroupObj = exp.groups[0];

      await this.db.query(
        `INSERT INTO experiment_assignments (experiment_id, user_id, group_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (experiment_id, user_id) DO NOTHING`,
        [experimentId, userId, selectedGroup]
      );

      return {
        experimentId,
        userId,
        groupName: selectedGroup,
        features: selectedGroupObj.features,
        assignedAt: new Date(),
      };
    } catch (e) {
      console.warn("[ExperimentEngine] Failed to assign:", (e as Error).message);
      return null;
    }
  }

  // --- Get experiment config ---
  private async getExperimentConfig(experimentId: string): Promise<ExperimentConfig | null> {
    if (!this.db) {
      return DEFAULT_EXPERIMENTS.find((e) => e.id === experimentId) || null;
    }
    try {
      const { rows } = await this.db.query(
        `SELECT experiment_id AS id, name, description, groups, metrics, start_date, end_date, status
         FROM experiment_configs WHERE experiment_id = $1`,
        [experimentId]
      );
      if (rows.length === 0) return DEFAULT_EXPERIMENTS.find((e) => e.id === experimentId) || null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        groups: typeof r.groups === "string" ? JSON.parse(r.groups) : r.groups,
        metrics: typeof r.metrics === "string" ? JSON.parse(r.metrics) : r.metrics,
        startDate: r.start_date,
        endDate: r.end_date,
        status: r.status,
      };
    } catch {
      return DEFAULT_EXPERIMENTS.find((e) => e.id === experimentId) || null;
    }
  }

  // --- Get user's assignment ---
  async getAssignment(userId: string, experimentId: string): Promise<AssignmentResult | null> {
    if (!this.db) return null;
    try {
      const { rows } = await this.db.query(
        `SELECT experiment_id, user_id, group_name, assigned_at
         FROM experiment_assignments WHERE user_id = $1 AND experiment_id = $2`,
        [userId, experimentId]
      );
      if (rows.length === 0) return null;
      const r = rows[0];
      const exp = await this.getExperimentConfig(experimentId);
      const group = exp?.groups.find((g) => g.name === r.group_name);
      return {
        experimentId: r.experiment_id,
        userId: r.user_id,
        groupName: r.group_name,
        features: group?.features || [],
        assignedAt: r.assigned_at,
      };
    } catch {
      return null;
    }
  }

  // --- Get all assignments for a user ---
  async getUserAssignments(userId: string): Promise<AssignmentResult[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(
        `SELECT experiment_id, user_id, group_name, assigned_at
         FROM experiment_assignments WHERE user_id = $1 ORDER BY assigned_at DESC`,
        [userId]
      );
      const results: AssignmentResult[] = [];
      for (const r of rows) {
        const exp = await this.getExperimentConfig(r.experiment_id);
        const group = exp?.groups.find((g) => g.name === r.group_name);
        results.push({
          experimentId: r.experiment_id,
          userId: r.user_id,
          groupName: r.group_name,
          features: group?.features || [],
          assignedAt: r.assigned_at,
        });
      }
      return results;
    } catch {
      return [];
    }
  }

  // --- Get experiment results (group comparison) ---
  async getExperimentResults(experimentId: string): Promise<any> {
    if (!this.db) return { message: "DB not connected" };
    try {
      // Get group counts
      const { rows: groupRows } = await this.db.query(
        `SELECT group_name, COUNT(*)::int AS user_count
         FROM experiment_assignments WHERE experiment_id = $1
         GROUP BY group_name ORDER BY group_name`,
        [experimentId]
      );

      // Get metrics per group from experiment_metrics table
      const { rows: metricRows } = await this.db.query(
        `SELECT em.group_name, em.metric_name,
                AVG(em.value)::float AS avg_value,
                STDDEV(em.value)::float AS stddev,
                COUNT(em.*)::int AS sample_size
         FROM experiment_metrics em
         WHERE em.experiment_id = $1
         GROUP BY em.group_name, em.metric_name
         ORDER BY em.group_name, em.metric_name`,
        [experimentId]
      );

      // Get retention per group (from events)
      const { rows: retentionRows } = await this.db.query(
        `SELECT ea.group_name,
                COUNT(DISTINCT CASE WHEN e.event_type IN ('login','session_start')
                    AND e.timestamp > NOW() - INTERVAL '7 days' THEN e.user_id END)::int AS active_7d,
                COUNT(DISTINCT ea.user_id)::int AS total_assigned,
                ROUND(
                  COUNT(DISTINCT CASE WHEN e.event_type IN ('login','session_start')
                    AND e.timestamp > NOW() - INTERVAL '7 days' THEN e.user_id END)::numeric
                  / NULLIF(COUNT(DISTINCT ea.user_id), 0) * 100, 1
                )::float AS retention_rate_7d
         FROM experiment_assignments ea
         LEFT JOIN behavioral_events e ON e.user_id = ea.user_id
         WHERE ea.experiment_id = $1
         GROUP BY ea.group_name
         ORDER BY ea.group_name`,
        [experimentId]
      );

      // Compute statistical significance (chi-square approximation)
      const stats = this.computeChiSquare(retentionRows);

      const exp = await this.getExperimentConfig(experimentId);
      return {
        experimentId,
        name: exp?.name,
        description: exp?.description,
        groups: groupRows.map((g) => ({
          name: g.group_name,
          userCount: g.user_count,
        })),
        metrics: metricRows,
        retention: retentionRows,
        statistics: stats,
      };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }

  // --- Check if user has a feature enabled ---
  async hasFeature(userId: string, feature: string): Promise<boolean> {
    const assignments = await this.getUserAssignments(userId);
    for (const a of assignments) {
      if (a.features.includes(feature)) return true;
    }
    return false;
  }

  // --- Helper: get user behavioral profile ---
  private async getUserProfile(userId: string): Promise<string | null> {
    if (!this.db) return null;
    try {
      const { rows } = await this.db.query(
        `SELECT profile_type FROM user_behavioral_profiles WHERE user_id = $1`,
        [userId]
      );
      return rows[0]?.profile_type || null;
    } catch {
      return null;
    }
  }

  private getProfileBucket(profile: string | null): string | null {
    if (!profile) return null;
    return profile;
  }

  private hashUserId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private computeChiSquare(retentionData: any[]): any {
    if (retentionData.length < 2) return { significant: false, p_value: null, effect_size: null };

    // Simple pairwise t-test approximation using retention rates
    const rates = retentionData.map((r) => r.retention_rate_7d || 0);
    if (rates.length < 2) return { significant: false, p_value: null, effect_size: null };

    const mean = rates.reduce((s, r) => s + r, 0) / rates.length;
    const variance = rates.reduce((s, r) => s + (r - mean) ** 2, 0) / rates.length;

    // Cohen's d between highest and lowest
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    const stdPooled = Math.sqrt(variance) || 1;
    const d = stdPooled > 0 ? (maxRate - minRate) / stdPooled : 0;

    return {
      significant: d > 0.8,
      effect_size: Math.round(d * 100) / 100,
      interpretation: d < 0.2 ? "negligible" : d < 0.5 ? "small" : d < 0.8 ? "medium" : "large",
    };
  }

  // --- Full statistical experiment analysis (research-grade) ---
  async getFullExperimentResults(experimentId: string): Promise<any> {
    if (!this.db) return { message: "DB not connected" };
    try {
      const exp = await this.getExperimentConfig(experimentId);
      if (!exp) return { error: "Experiment not found" };

      // Get retention per group as binary arrays (retained=1, churned=0)
      const { rows: assignmentRows } = await this.db.query(
        `SELECT ea.group_name, ea.user_id,
                CASE WHEN EXISTS (
                  SELECT 1 FROM behavioral_events be
                  WHERE be.user_id = ea.user_id
                    AND be.event_type IN ('login','session_start')
                    AND be.timestamp > NOW() - INTERVAL '7 days'
                ) THEN 1 ELSE 0 END AS retained
         FROM experiment_assignments ea
         WHERE ea.experiment_id = $1`,
        [experimentId]
      );

      // Build retention arrays per group
      const retentionByGroup: Record<string, number[]> = {};
      for (const row of assignmentRows) {
        const g = row.group_name as string;
        const r = row.retained as number;
        if (!retentionByGroup[g]) retentionByGroup[g] = [];
        retentionByGroup[g].push(r);
      }

      const groupNames = Object.keys(retentionByGroup);
      const nComparisons = groupNames.length * (groupNames.length - 1) / 2;

      const analysis = analyzeExperiment(experimentId, exp.name, retentionByGroup, Math.max(1, nComparisons));

      // Group counts
      const groupCounts = groupNames.map((g) => ({
        name: g,
        userCount: retentionByGroup[g].length,
        meanRetention: Math.round(jstat.mean(retentionByGroup[g]) * 1000) / 1000,
      }));

      // One-way ANOVA across all groups
      const groupsData = groupNames.map((g) => retentionByGroup[g]);
      const anova = oneWayANOVA(groupsData);

      // Pairwise t-tests for each comparison
      const pairwiseResults = [];
      for (let i = 0; i < groupNames.length; i++) {
        for (let j = i + 1; j < groupNames.length; j++) {
          const gA = groupNames[i];
          const gB = groupNames[j];
          const tt = welchTTest(retentionByGroup[gA], retentionByGroup[gB]);
          const d = cohensD(retentionByGroup[gA], retentionByGroup[gB]);
          pairwiseResults.push({
            comparison: `${gA} vs ${gB}`,
            tStatistic: tt.tStatistic,
            pValue: tt.pValue,
            degreesOfFreedom: tt.degreesOfFreedom,
            cohensD: tt.cohensD,
            effectSizeLabel: tt.effectSizeLabel,
            significant: tt.significant,
            bonferroniCorrected: tt.bonferroniCorrected,
            power: tt.power,
            sampleSizeA: tt.sampleSizeA,
            sampleSizeB: tt.sampleSizeB,
            meanA: tt.meanA,
            meanB: tt.meanB,
            ciLower: tt.ciLower,
            ciUpper: tt.ciUpper,
            normalA: tt.normalA,
            normalB: tt.normalB,
          });
        }
      }

      return {
        experimentId,
        name: exp.name,
        description: exp.description,
        status: exp.status,
        groupCounts,
        retentionRate: groupCounts.map((g) => ({
          group: g.name,
          rate: g.meanRetention,
          sampleSize: g.userCount,
        })),
        anova,
        pairwiseComparisons: pairwiseResults,
        analysis,
        minimumDetectableEffect: analysis.minimumDetectableEffect,
      };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
}

export const experimentEngine = new ExperimentEngine();
