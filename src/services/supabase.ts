/**
 * Supabase Client - Research Data Layer
 *
 * Provides typed access to Supabase REST API for all research data.
 * Used for behavioral events, profiles, experiments, interventions, etc.
 * Game data (Firebase) is separate and unchanged.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// ─── Research Data Types ─────────────────────────────────────────────────────

export interface ResearchUser {
  id: number;
  user_id: string;
  username: string;
  full_name: string | null;
  class_grade: string | null;
  created_at: string;
  last_active: string;
  role: string;
}

export interface BehavioralEvent {
  id: number;
  user_id: string;
  event_type: string;
  timestamp: string;
  session_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BehavioralProfile {
  id: number;
  user_id: string;
  profile_type: "competitive" | "collector" | "casual" | "streak_driven" | "social";
  confidence: number;
  metrics: Record<string, number>;
  last_updated: string;
}

export interface PersonalityAssignment {
  id: number;
  user_id: string;
  personality_mode: "friendly" | "competitive" | "mentor" | "playful";
  assigned_at: string;
  round_id: number;
  current_round: number;
}

export interface ExperimentAssignment {
  id: number;
  experiment_id: string;
  user_id: string;
  group_name: string;
  assigned_at: string;
}

export interface AdaptiveIntervention {
  id: number;
  user_id: string;
  intervention_type: string;
  triggered_by: string | null;
  triggered_at: string;
  effectiveness_score: number | null;
  outcome_recorded: boolean;
  metadata: Record<string, unknown>;
}

export interface NoveltyDecayLog {
  id: number;
  user_id: string;
  engagement_score: number;
  session_duration_seconds: number | null;
  streak_stability: number;
  feature_diversity: number;
  days_since_login: number;
  recorded_at: string;
}

export interface AIScanMetric {
  id: number;
  user_id: string;
  model_type: string;
  latency_ms: number;
  confidence_score: number;
  predicted_category: string;
  ground_truth_category: string | null;
  classification_correct: boolean | null;
  timestamp: string;
}

export interface SocialInteraction {
  id: number;
  user_id: string;
  target_user_id: string | null;
  interaction_type: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface RewardTransaction {
  id?: number;
  user_id: string;
  transaction_type: "earn" | "spend" | "adjustment";
  amount: number;
  reason: string | null;
  source: string | null;
  multiplier: number;
  points_balance: number | null;
  created_at: string;
}

// ─── Helper: upsert research user on login ──────────────────────────────────

export async function upsertResearchUser(userId: string, username: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("research_users").upsert(
    { user_id: userId, username, last_active: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}

// Update the optional profile fields (full_name, class_grade) for a user
// that already exists in research_users. Used by the in-app profile
// completion popup so legacy users can supply their full name and class.
export async function updateResearchUserProfile(
  userId: string,
  fields: { full_name?: string | null; class_grade?: string | null }
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const updates: Record<string, string | null> = { last_active: new Date().toISOString() };
  if ("full_name" in fields) updates.full_name = fields.full_name ?? null;
  if ("class_grade" in fields) updates.class_grade = fields.class_grade ?? null;
  if (Object.keys(updates).length === 1) return;
  await sb.from("research_users").update(updates).eq("user_id", userId);
}

// ─── Event Logging ───────────────────────────────────────────────────────────

export async function logBehavioralEvent(
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
  sessionId?: number
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("behavioral_events").insert({
    user_id: userId,
    event_type: eventType,
    session_id: sessionId || null,
    metadata,
  });
}

// ─── Query Helpers ───────────────────────────────────────────────────────────

export async function queryBehavioralEvents(
  userId: string,
  eventType?: string,
  limit = 50
): Promise<BehavioralEvent[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb
    .from("behavioral_events")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (eventType) q = q.eq("event_type", eventType);
  const { data } = await q;
  return (data as BehavioralEvent[]) || [];
}

export async function queryEventCount(userId: string, eventType?: string): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  let q = sb.from("behavioral_events").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (eventType) q = q.eq("event_type", eventType);
  const { count } = await q;
  return count || 0;
}

export async function queryRetentionByGroup(experimentId: string): Promise<Record<string, number[]>> {
  const sb = getSupabase();
  if (!sb) return {};
  const { data } = await sb
    .from("experiment_assignments")
    .select("group_name, user_id")
    .eq("experiment_id", experimentId);
  if (!data) return {};
  const groups: Record<string, Set<string>> = {};
  for (const row of data as any[]) {
    const g = row.group_name as string;
    const uid = row.user_id as string;
    if (!groups[g]) groups[g] = new Set();
    groups[g].add(uid);
  }
  const result: Record<string, number[]> = {};
  for (const [g, users] of Object.entries(groups)) {
    result[g] = Array.from(users).map(() => 1); // Binary array for t-test
  }
  return result;
}

export async function queryAIScanMetrics(modelType?: string): Promise<AIScanMetric[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb.from("ai_scan_metrics").select("*").order("timestamp", { ascending: false }).limit(500);
  if (modelType) q = q.eq("model_type", modelType);
  const { data } = await q;
  return (data as AIScanMetric[]) || [];
}

export async function queryNoveltyDecay(userId: string, days = 14): Promise<NoveltyDecayLog[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("novelty_decay_log")
    .select("*")
    .eq("user_id", userId)
    .gte("recorded_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order("recorded_at", { ascending: false });
  return (data as NoveltyDecayLog[]) || [];
}

export async function queryInterventions(userId: string, limit = 20): Promise<AdaptiveIntervention[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("adaptive_interventions")
    .select("*")
    .eq("user_id", userId)
    .order("triggered_at", { ascending: false })
    .limit(limit);
  return (data as AdaptiveIntervention[]) || [];
}

export async function querySocialInteractions(
  userId: string,
  limit = 100
): Promise<SocialInteraction[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("social_interactions")
    .select("*")
    .or(`user_id.eq.${userId},target_user_id.eq.${userId}`)
    .order("timestamp", { ascending: false })
    .limit(limit);
  return (data as SocialInteraction[]) || [];
}

export async function queryResearchUsers(): Promise<ResearchUser[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("research_users").select("*").order("last_active", { ascending: false });
  return (data as ResearchUser[]) || [];
}

export async function queryExperimentAssignments(experimentId: string): Promise<ExperimentAssignment[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("experiment_assignments")
    .select("*")
    .eq("experiment_id", experimentId);
  return (data as ExperimentAssignment[]) || [];
}

export async function upsertGroundTruth(
  scanId: number,
  groundTruthCategory: string
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.rpc("update_scan_ground_truth", { scan_id: scanId, gt_category: groundTruthCategory });
}

// ─── Reward Transaction Logging ─────────────────────────────────────────────────

export async function logRewardTransaction(
  userId: string,
  transactionType: "earn" | "spend" | "adjustment",
  amount: number,
  options?: {
    reason?: string;
    source?: string;
    multiplier?: number;
    pointsBalance?: number;
  }
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("reward_transactions").insert({
    user_id: userId,
    transaction_type: transactionType,
    amount,
    reason: options?.reason ?? null,
    source: options?.source ?? null,
    multiplier: options?.multiplier ?? 1.0,
    points_balance: options?.pointsBalance ?? null,
  });
}

export async function queryRewardTransactions(
  userId: string,
  limit = 50
): Promise<RewardTransaction[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("reward_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as RewardTransaction[]) || [];
}

export async function queryRewardSummary(
  userId: string,
  days = 30
): Promise<{ totalEarned: number; totalSpent: number; netChange: number; txCount: number }> {
  const sb = getSupabase();
  if (!sb) return { totalEarned: 0, totalSpent: 0, netChange: 0, txCount: 0 };
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await sb
    .from("reward_transactions")
    .select("transaction_type, amount")
    .eq("user_id", userId)
    .gte("created_at", since);
  if (!data || data.length === 0) return { totalEarned: 0, totalSpent: 0, netChange: 0, txCount: 0 };
  let totalEarned = 0;
  let totalSpent = 0;
  for (const row of data as { transaction_type: string; amount: number }[]) {
    if (row.transaction_type === "earn") totalEarned += row.amount;
    else totalSpent += Math.abs(row.amount);
  }
  return {
    totalEarned,
    totalSpent,
    netChange: totalEarned - totalSpent,
    txCount: data.length,
  };
}
