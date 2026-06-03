/**
 * Social Network Analyzer - Peer Influence & Community Detection
 *
 * Tracks user interactions and computes social graph metrics.
 */

import { getDb } from "../db.js";

export interface NetworkMetrics {
  userId: string;
  degreeCentrality: number;
  clusteringCoefficient: number;
  pageRank: number;
  communityId: number | null;
  totalInteractions: number;
}

export interface PeerInfluenceResult {
  userId: string;
  influencedBy: string[];
  influenceStrength: number;
  sharedCommunity: boolean;
}

export interface CommunityStats {
  communityId: number;
  size: number;
  avgRetention: number;
  avgEngagement: number;
  density: number;
}

export type InteractionType = "profile_view" | "leaderboard_view" | "share" | "team_join" | "chat" | "follow";

class SocialNetworkAnalyzer {
  private db = getDb();

  // --- Log a social interaction ---
  async logInteraction(
    userId: string,
    interactionType: InteractionType,
    targetUserId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.query(
        `INSERT INTO social_interactions (user_id, target_user_id, interaction_type, metadata)
         VALUES ($1, $2, $3, $4)`,
        [userId, targetUserId || null, interactionType, JSON.stringify(metadata)]
      );
    } catch (e) {
      console.warn("[SocialNetwork] Failed to log interaction:", (e as Error).message);
    }
  }

  // --- Compute network metrics for a user (simplified PageRank + degree) ---
  async computeNetworkMetrics(userId: string): Promise<NetworkMetrics | null> {
    if (!this.db) return null;
    try {
      // Degree centrality: count unique neighbors
      const { rows: degreeRows } = await this.db.query(
        `SELECT COUNT(DISTINCT target_user_id) AS out_degree,
                COUNT(DISTINCT (SELECT target_user_id FROM social_interactions s2
                  WHERE s2.target_user_id = si.user_id)) AS in_degree
         FROM social_interactions si
         WHERE si.user_id = $1`,
        [userId]
      );
      const degree = (degreeRows[0]?.out_degree || 0) + (degreeRows[0]?.in_degree || 0);

      // Clustering: count triangles / possible triangles
      const { rows: clusterRows } = await this.db.query(
        `WITH neighbors AS (
          SELECT DISTINCT target_user_id AS friend
          FROM social_interactions WHERE user_id = $1 AND target_user_id IS NOT NULL
          UNION
          SELECT DISTINCT user_id AS friend
          FROM social_interactions WHERE target_user_id = $1
        )
        SELECT COUNT(DISTINCT CONCAT(
          LEAST(n1.friend, n2.friend), '-', GREATEST(n1.friend, n2.friend)
        ))::int AS edges_between_neighbors
         FROM neighbors n1, neighbors n2
         WHERE n1.friend < n2.friend
           AND EXISTS (
             SELECT 1 FROM social_interactions e
             WHERE e.user_id = n1.friend AND e.target_user_id = n2.friend
                OR e.user_id = n2.friend AND e.target_user_id = n1.friend
           )`,
        [userId]
      );
      const clustering = parseFloat(clusterRows[0]?.edges_between_neighbors || "0");

      // Community detection: simple label propagation (approximate via interaction clustering)
      const { rows: communityRows } = await this.db.query(
        `SELECT community_id FROM user_network_metrics WHERE user_id = $1`,
        [userId]
      );
      const communityId = communityRows[0]?.community_id || null;

      // Simple PageRank approximation (count inbound interactions / total interactions)
      const { rows: prRows } = await this.db.query(
        `WITH total_inbound AS (
          SELECT COUNT(*)::float AS total FROM social_interactions WHERE target_user_id IS NOT NULL
        ),
        inbound AS (
          SELECT COUNT(*)::float AS inbound_count FROM social_interactions WHERE target_user_id = $1
        )
        SELECT CASE WHEN t.total > 0 THEN (i.inbound_count / t.total) * 10.0 ELSE 0 END AS page_rank
        FROM total_inbound t, inbound i`,
        [userId]
      );
      const pageRank = parseFloat(prRows[0]?.page_rank?.toFixed(4) || "0");

      // Total interactions
      const { rows: totalRows } = await this.db.query(
        `SELECT COUNT(*)::int AS total FROM social_interactions WHERE user_id = $1`,
        [userId]
      );

      return {
        userId,
        degreeCentrality: degree,
        clusteringCoefficient: Math.min(clustering / Math.max(degree * (degree - 1) / 2, 1), 1),
        pageRank,
        communityId,
        totalInteractions: totalRows[0]?.total || 0,
      };
    } catch (e) {
      console.warn("[SocialNetwork] Failed to compute metrics:", (e as Error).message);
      return null;
    }
  }

  // --- Compute PageRank for all users ---
  async computeAllPageRanks(): Promise<void> {
    if (!this.db) return;
    try {
      // Simplified PageRank: number of inbound connections / total connections
      await this.db.query(`
        WITH inbound_counts AS (
          SELECT target_user_id, COUNT(*)::int AS inbound
          FROM social_interactions
          WHERE target_user_id IS NOT NULL
          GROUP BY target_user_id
        ),
        total_interactions AS (
          SELECT COUNT(*)::float AS total FROM social_interactions WHERE target_user_id IS NOT NULL
        ),
        ranks AS (
          SELECT i.target_user_id AS user_id,
                 CASE WHEN t.total > 0 THEN (i.inbound / t.total) * 10.0 ELSE 0 END AS page_rank
          FROM inbound_counts i, total_interactions t
        )
        INSERT INTO user_network_metrics (user_id, page_rank)
        SELECT user_id, page_rank FROM ranks
        ON CONFLICT (user_id) DO UPDATE SET page_rank = EXCLUDED.page_rank, computed_at = NOW()
      `);
    } catch (e) {
      console.warn("[SocialNetwork] Failed to compute PageRanks:", (e as Error).message);
    }
  }

  // --- Get top influencers ---
  async getTopInfluencers(limit = 10): Promise<{ userId: string; pageRank: number; degree: number }[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(
        `SELECT unm.user_id AS "userId",
                unm.page_rank AS "pageRank",
                COALESCE(ic.degree, 0)::int AS degree
         FROM user_network_metrics unm
         LEFT JOIN (
           SELECT user_id, COUNT(DISTINCT target_user_id) AS degree
           FROM social_interactions WHERE target_user_id IS NOT NULL
           GROUP BY user_id
         ) ic ON ic.user_id = unm.user_id
         ORDER BY unm.page_rank DESC
         LIMIT $1`,
        [limit]
      );
      return rows;
    } catch {
      return [];
    }
  }

  // --- Get community statistics ---
  async getCommunityStats(): Promise<CommunityStats[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(`
        SELECT
          COALESCE(unm.community_id, 0) AS "communityId",
          COUNT(DISTINCT si.user_id)::int AS size,
          ROUND(
            COUNT(DISTINCT CASE WHEN e.event_type IN ('login','session_start')
              AND e.timestamp > NOW() - INTERVAL '7 days' THEN e.user_id END)::numeric
            / NULLIF(COUNT(DISTINCT si.user_id), 0) * 100, 1
          )::float AS "avgRetention",
          COALESCE(
            AVG((e.metadata->>'session_duration_seconds')::float) FILTER (
              WHERE e.event_type = 'session_end'
            ), 0
          )::float AS "avgEngagement",
          COALESCE(
            (
              SELECT COUNT(*)::float / NULLIF(COUNT(DISTINCT si.user_id) * (COUNT(DISTINCT si.user_id) - 1) / 2.0, 0)
              FROM social_interactions s2
              WHERE s2.user_id IN (SELECT DISTINCT user_id FROM social_interactions WHERE community_id = unm.community_id)
            ), 0
          )::float AS density
        FROM social_interactions si
        LEFT JOIN user_network_metrics unm ON unm.user_id = si.user_id
        LEFT JOIN behavioral_events e ON e.user_id = si.user_id
        GROUP BY COALESCE(unm.community_id, 0)
        ORDER BY size DESC
        LIMIT 20
      `);
      return rows;
    } catch (e) {
      console.warn("[SocialNetwork] Failed to get community stats:", (e as Error).message);
      return [];
    }
  }

  // --- Get network summary ---
  async getNetworkSummary(): Promise<{
    totalUsers: number;
    totalInteractions: number;
    avgDegree: number;
    density: number;
    communityCount: number;
  }> {
    if (!this.db) return { totalUsers: 0, totalInteractions: 0, avgDegree: 0, density: 0, communityCount: 0 };
    try {
      const { rows } = await this.db.query(`
        SELECT
          (SELECT COUNT(DISTINCT user_id) FROM social_interactions)::int AS "totalUsers",
          (SELECT COUNT(*)::int FROM social_interactions)::int AS "totalInteractions",
          (SELECT AVG(degree)::float FROM (
            SELECT COUNT(DISTINCT target_user_id) AS degree FROM social_interactions GROUP BY user_id
          ) d)::float AS "avgDegree",
          (SELECT COUNT(DISTINCT community_id) FROM user_network_metrics WHERE community_id IS NOT NULL)::int AS "communityCount"
      `);
      const r = rows[0];
      return {
        totalUsers: r?.totalUsers || 0,
        totalInteractions: r?.totalInteractions || 0,
        avgDegree: Math.round((r?.avgDegree || 0) * 10) / 10,
        density: Math.round((r?.density || 0) * 100) / 100,
        communityCount: r?.communityCount || 0,
      };
    } catch {
      return { totalUsers: 0, totalInteractions: 0, avgDegree: 0, density: 0, communityCount: 0 };
    }
  }

  // --- Team vs solo retention ---
  async getTeamVsSoloRetention(): Promise<{ team: number; solo: number }> {
    if (!this.db) return { team: 0, solo: 0 };
    try {
      const { rows } = await this.db.query(`
        SELECT
          ROUND(
            COUNT(DISTINCT CASE WHEN si.interaction_type = 'team_join' AND e.event_type IN ('login','session_start')
              AND e.timestamp > NOW() - INTERVAL '7 days' THEN si.user_id END)::numeric
            / NULLIF(COUNT(DISTINCT CASE WHEN si.interaction_type = 'team_join' THEN si.user_id END), 0) * 100, 1
          )::float AS team,
          ROUND(
            COUNT(DISTINCT CASE WHEN si.interaction_type != 'team_join' OR NOT EXISTS (
              SELECT 1 FROM social_interactions s2
              WHERE s2.user_id = si.user_id AND s2.interaction_type = 'team_join'
            ) AND e.event_type IN ('login','session_start')
              AND e.timestamp > NOW() - INTERVAL '7 days' THEN si.user_id END)::numeric
            / NULLIF(COUNT(DISTINCT CASE WHEN si.interaction_type != 'team_join' OR NOT EXISTS (
              SELECT 1 FROM social_interactions s2
              WHERE s2.user_id = si.user_id AND s2.interaction_type = 'team_join'
            ) THEN si.user_id END), 0) * 100, 1
          )::float AS solo
        FROM social_interactions si
        LEFT JOIN behavioral_events e ON e.user_id = si.user_id
      `);
      return {
        team: rows[0]?.team || 0,
        solo: rows[0]?.solo || 0,
      };
    } catch {
      return { team: 0, solo: 0 };
    }
  }
}

export const socialNetworkAnalyzer = new SocialNetworkAnalyzer();
