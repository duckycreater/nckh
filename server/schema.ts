/**
 * Research Database Schema - PostgreSQL
 *
 * Tables for ISEF research: behavioral profiling, adaptive interventions,
 * personality experiments, novelty decay tracking, and longitudinal analytics.
 */

export const SCHEMA_SQL = `
-- Users table (mirrors existing user auth system)
CREATE TABLE IF NOT EXISTS research_users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,  -- matches account_id from main system
  username VARCHAR(255),
  full_name VARCHAR(255),
  class_grade VARCHAR(20),                 -- e.g. "10A1", "11", "12B2"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  role VARCHAR(50) DEFAULT 'user'
);

-- Idempotent column additions for environments where research_users
-- already existed before these profile fields were introduced.
ALTER TABLE research_users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE research_users ADD COLUMN IF NOT EXISTS class_grade VARCHAR(20);
ALTER TABLE research_users ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);
ALTER TABLE research_users ADD COLUMN IF NOT EXISTS class_id VARCHAR(64);
ALTER TABLE research_users ADD COLUMN IF NOT EXISTS points_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE research_users ADD COLUMN IF NOT EXISTS total_exp_earned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE research_users ADD COLUMN IF NOT EXISTS profile_verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified';
ALTER TABLE research_users ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMPTZ;
ALTER TABLE research_users ADD COLUMN IF NOT EXISTS profile_verified_at TIMESTAMPTZ;
ALTER TABLE research_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS school_classes (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(30) NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
  school_year VARCHAR(9) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_profile_verifications (
  user_id VARCHAR(255) PRIMARY KEY,
  submitted_full_name VARCHAR(255),
  class_id VARCHAR(64),
  class_grade VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'unverified'
    CHECK (status IN ('unverified', 'pending', 'verified', 'rejected', 'skipped')),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_profile_verifications_status
  ON student_profile_verifications(status, updated_at DESC);

-- Durable authentication state. account_id is the stable UUID; nick remains
-- only the login/display handle for compatibility with older clients.
CREATE TABLE IF NOT EXISTS session_tokens (
  token VARCHAR(128) PRIMARY KEY,
  nick VARCHAR(100) NOT NULL,
  account_id UUID,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS account_id UUID;
CREATE INDEX IF NOT EXISTS idx_session_tokens_expires ON session_tokens(expires_at);

CREATE TABLE IF NOT EXISTS revoked_users (
  nick VARCHAR(100) PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rewards catalog for admin-managed redeemables
CREATE TABLE IF NOT EXISTS rewards (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  cost INTEGER NOT NULL DEFAULT 0,
  ingredients JSONB DEFAULT '[]',
  image_url TEXT DEFAULT '',
  color VARCHAR(255) DEFAULT '',
  bg_class VARCHAR(255) DEFAULT '',
  border_class VARCHAR(255) DEFAULT ''
);

-- User sessions for engagement tracking
CREATE TABLE IF NOT EXISTS research_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  actions_count INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);

-- Behavioral events log (EVERYTHING is logged)
CREATE TABLE IF NOT EXISTS behavioral_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_id INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_be_events_user_time ON behavioral_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_be_events_type ON behavioral_events(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_be_events_metadata ON behavioral_events USING GIN(metadata);

-- Behavioral profiles (updated every 7 days or after 50+ events)
CREATE TABLE IF NOT EXISTS user_behavioral_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  profile_type VARCHAR(50) NOT NULL,  -- competitive, collector, casual, streak_driven, social
  confidence FLOAT DEFAULT 0,
  metrics JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);

-- Personality assignments (HCI experiment)
CREATE TABLE IF NOT EXISTS personality_assignments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  personality_mode VARCHAR(50) NOT NULL,  -- friendly, competitive, mentor, playful
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  round_id INTEGER DEFAULT 1,
  current_round INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);

-- Experiment assignments
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id SERIAL PRIMARY KEY,
  experiment_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  group_name VARCHAR(50) NOT NULL,  -- control, treatment
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, user_id),
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);

-- Adaptive interventions log
CREATE TABLE IF NOT EXISTS adaptive_interventions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  intervention_type VARCHAR(100) NOT NULL,  -- encouragement, ranking_focus, bonus_unlock, effort_boost, etc.
  triggered_by VARCHAR(100),  -- novelty_decay, low_motivation, etc.
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  effectiveness_score FLOAT,
  outcome_recorded BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_adaptive_user ON adaptive_interventions(user_id, triggered_at DESC);

-- Novelty decay tracking
CREATE TABLE IF NOT EXISTS novelty_decay_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  engagement_score FLOAT DEFAULT 0,
  session_duration_seconds INTEGER,
  streak_stability FLOAT DEFAULT 1,
  feature_diversity FLOAT DEFAULT 0,
  days_since_login INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_decay_user_time ON novelty_decay_log(user_id, recorded_at DESC);

-- AI-generated events (dynamically generated)
CREATE TABLE IF NOT EXISTS generated_events (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  event_theme VARCHAR(100),
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- AI reflections (weekly personalized summaries)
CREATE TABLE IF NOT EXISTS ai_reflections (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  reflection_text TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reflections_user ON ai_reflections(user_id, week_number DESC);

-- Intervention effectiveness scores
CREATE TABLE IF NOT EXISTS intervention_effectiveness (
  id SERIAL PRIMARY KEY,
  intervention_type VARCHAR(100) NOT NULL,
  user_id VARCHAR(255),
  baseline_score FLOAT,
  post_intervention_score FLOAT,
  delta FLOAT,
  days_to_effect INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE SET NULL
);

-- Experiment metrics (for statistical analysis)
CREATE TABLE IF NOT EXISTS experiment_metrics (
  id SERIAL PRIMARY KEY,
  experiment_id VARCHAR(100) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  group_name VARCHAR(50) NOT NULL,
  value FLOAT NOT NULL,
  user_id VARCHAR(255),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_exp_metrics ON experiment_metrics(experiment_id, metric_name, group_name);

-- Simulation predictions
CREATE TABLE IF NOT EXISTS simulation_predictions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  prediction_type VARCHAR(100) NOT NULL,  -- dropout_risk, engagement_forecast, intervention_effect
  predicted_value FLOAT NOT NULL,
  confidence FLOAT DEFAULT 0,
  prediction_date TIMESTAMPTZ DEFAULT NOW(),
  prediction_horizon_days INTEGER DEFAULT 7,
  actual_value FLOAT,
  actual_recorded_at TIMESTAMPTZ,
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sim_user ON simulation_predictions(user_id, prediction_type, prediction_date DESC);

-- Weekly leaderboard scores
CREATE TABLE IF NOT EXISTS weekly_scores (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  points_earned INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  consistency_score FLOAT DEFAULT 0,
  improvement_pct FLOAT DEFAULT 0,
  eco_impact_score FLOAT DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start),
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);

-- AI scan metrics (for vision model benchmarking)
CREATE TABLE IF NOT EXISTS ai_scan_metrics (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  model_type VARCHAR(50) NOT NULL,  -- gemini_2.5_flash, mobilenet_v2, efficientnet_lite, yolov8n
  latency_ms FLOAT NOT NULL,
  confidence_score FLOAT NOT NULL,
  predicted_category VARCHAR(50) NOT NULL,  -- plastic, paper, glass, metal, organic, hazard
  ground_truth_category VARCHAR(50),
  classification_correct BOOLEAN,
  session_id INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_model ON ai_scan_metrics(model_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_user ON ai_scan_metrics(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_correct ON ai_scan_metrics(classification_correct) WHERE classification_correct IS NOT NULL;

-- Experiment configs (A/B testing)
CREATE TABLE IF NOT EXISTS experiment_configs (
  id SERIAL PRIMARY KEY,
  experiment_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  groups JSONB NOT NULL,  -- [{name, description, features[], ratio}]
  metrics JSONB DEFAULT '[]',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',  -- active, paused, completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social interactions (network analysis)
CREATE TABLE IF NOT EXISTS social_interactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  target_user_id VARCHAR(255),
  interaction_type VARCHAR(50) NOT NULL,  -- profile_view, leaderboard_view, share, team_join, chat
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_social_user ON social_interactions(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_social_target ON social_interactions(target_user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_social_type ON social_interactions(interaction_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_social_network ON social_interactions(user_id, target_user_id);

-- User network metrics (computed periodically)
CREATE TABLE IF NOT EXISTS user_network_metrics (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  degree_centrality INTEGER DEFAULT 0,
  clustering_coefficient FLOAT DEFAULT 0,
  page_rank FLOAT DEFAULT 0,
  community_id INTEGER,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES research_users(user_id) ON DELETE CASCADE
);
`;

import { getDb } from "./db.js";

export async function runSchema(): Promise<void> {
  const db = getDb();
  if (!db) {
    console.warn("[Schema] No DB connection, skipping schema creation.");
    return;
  }
  const statements = SCHEMA_SQL.split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    try {
      await db.query(stmt + ";");
    } catch (e) {
      console.error("[Schema] Error running:", stmt.substring(0, 50) + "...", (e as Error).message);
    }
  }
  try {
    await db.query("NOTIFY pgrst, 'reload schema';");
  } catch (e) {
    console.warn("[Schema] Could not request PostgREST schema reload:", (e as Error).message);
  }
  console.log("[Schema] Database schema applied.");
}
