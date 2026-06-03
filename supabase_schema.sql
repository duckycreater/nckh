/**
 * Research Database Schema - Supabase SQL
 *
 * Run this in Supabase SQL Editor (Dashboard → SQL Editor).
 * All tables use Supabase/PostgreSQL with Row Level Security (RLS) disabled
 * for server-side access via service role key.
 *
 * Tables for ISEF research: behavioral profiling, adaptive interventions,
 * personality experiments, novelty decay tracking, and longitudinal analytics.
 */

-- ─── Research Users ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS research_users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  role VARCHAR(50) DEFAULT 'user'
);

-- ─── User Sessions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS research_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  actions_count INTEGER DEFAULT 0
);

-- ─── Behavioral Events (EVERYTHING is logged) ────────────────────────────────
CREATE TABLE IF NOT EXISTS behavioral_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_id INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_be_user_time ON behavioral_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_be_type ON behavioral_events(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_be_metadata ON behavioral_events USING GIN(metadata);

-- ─── User Behavioral Profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_behavioral_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  profile_type VARCHAR(50) NOT NULL,
  confidence FLOAT DEFAULT 0,
  scores JSONB DEFAULT '{"competitive":0,"collector":0,"casual":0,"streak_driven":0,"social":0}',
  metrics JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Personality Assignments (HCI experiment) ─────────────────────────────
CREATE TABLE IF NOT EXISTS personality_assignments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  personality_mode VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  round_id INTEGER DEFAULT 1,
  current_round INTEGER DEFAULT 1
);

-- ─── Experiment Assignments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id SERIAL PRIMARY KEY,
  experiment_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  group_name VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, user_id)
);

-- ─── Adaptive Interventions Log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS adaptive_interventions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  intervention_type VARCHAR(100) NOT NULL,
  triggered_by VARCHAR(100),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  effectiveness_score FLOAT,
  outcome_recorded BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_adaptive_user ON adaptive_interventions(user_id, triggered_at DESC);

-- ─── Novelty Decay Tracking ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS novelty_decay_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  engagement_score FLOAT DEFAULT 0,
  session_duration_seconds INTEGER,
  streak_stability FLOAT DEFAULT 1,
  feature_diversity FLOAT DEFAULT 0,
  days_since_login INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_decay_user_time ON novelty_decay_log(user_id, recorded_at DESC);

-- ─── AI-Generated Events ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generated_events (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  event_theme VARCHAR(100),
  description TEXT,
  missions JSONB DEFAULT '[]',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- ─── Event Missions (completion tracking) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS event_missions (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES generated_events(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target INTEGER DEFAULT 1,
  progress INTEGER DEFAULT 0,
  reward INTEGER DEFAULT 50,
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id, title)
);

-- ─── AI Reflections ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_reflections (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  reflection_text TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reflections_user ON ai_reflections(user_id, week_number DESC);

-- ─── Reflection Outcomes (effectiveness tracking) ─────────────────────────
CREATE TABLE IF NOT EXISTS reflection_outcomes (
  id SERIAL PRIMARY KEY,
  reflection_id INTEGER REFERENCES ai_reflections(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  retained BOOLEAN,
  continued_scanning BOOLEAN,
  streak_maintained BOOLEAN,
  engagement_delta FLOAT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Intervention Effectiveness Scores ────────────────────────────────────
CREATE TABLE IF NOT EXISTS intervention_effectiveness (
  id SERIAL PRIMARY KEY,
  intervention_type VARCHAR(100) NOT NULL,
  user_id VARCHAR(255) REFERENCES research_users(user_id) ON DELETE SET NULL,
  baseline_score FLOAT,
  post_intervention_score FLOAT,
  delta FLOAT,
  days_to_effect INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Experiment Metrics ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experiment_metrics (
  id SERIAL PRIMARY KEY,
  experiment_id VARCHAR(100) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  group_name VARCHAR(50) NOT NULL,
  value FLOAT NOT NULL,
  user_id VARCHAR(255) REFERENCES research_users(user_id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exp_metrics ON experiment_metrics(experiment_id, metric_name, group_name);

-- ─── Simulation Predictions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_predictions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  prediction_type VARCHAR(100) NOT NULL,
  predicted_value FLOAT NOT NULL,
  confidence FLOAT DEFAULT 0,
  lower_ci FLOAT,
  upper_ci FLOAT,
  risk_level VARCHAR(20),
  factors JSONB DEFAULT '[]',
  prediction_date TIMESTAMPTZ DEFAULT NOW(),
  prediction_horizon_days INTEGER DEFAULT 7,
  actual_value FLOAT,
  actual_recorded_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sim_user ON simulation_predictions(user_id, prediction_type, prediction_date DESC);

-- ─── Weekly Scores ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_scores (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
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
  UNIQUE(user_id, week_start)
);

-- ─── AI Scan Metrics (vision model benchmarking) ────────────────────────────
CREATE TABLE IF NOT EXISTS ai_scan_metrics (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  model_type VARCHAR(50) NOT NULL,
  latency_ms FLOAT NOT NULL,
  confidence_score FLOAT NOT NULL,
  predicted_category VARCHAR(50) NOT NULL,
  ground_truth_category VARCHAR(50),
  classification_correct BOOLEAN,
  session_id INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_model ON ai_scan_metrics(model_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_user ON ai_scan_metrics(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_correct ON ai_scan_metrics(classification_correct) WHERE classification_correct IS NOT NULL;

-- ─── Experiment Configs (A/B testing) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS experiment_configs (
  id SERIAL PRIMARY KEY,
  experiment_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  groups JSONB NOT NULL,
  metrics JSONB DEFAULT '[]',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Social Interactions (network analysis) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS social_interactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  target_user_id VARCHAR(255),
  interaction_type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_social_user ON social_interactions(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_social_target ON social_interactions(target_user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_social_type ON social_interactions(interaction_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_social_network ON social_interactions(user_id, target_user_id);

-- ─── User Network Metrics (computed periodically) ────────────────────────────
CREATE TABLE IF NOT EXISTS user_network_metrics (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  degree_centrality INTEGER DEFAULT 0,
  clustering_coefficient FLOAT DEFAULT 0,
  page_rank FLOAT DEFAULT 0,
  community_id INTEGER,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RPC: Update scan ground truth ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_scan_ground_truth(scan_id INTEGER, gt_category VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_scan_metrics
  SET ground_truth_category = gt_category,
      classification_correct = (predicted_category = gt_category)
  WHERE id = scan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Reward Transactions (point earning & spending history) ───────────────────
CREATE TABLE IF NOT EXISTS reward_transactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL, -- 'earn' | 'spend' | 'adjustment'
  amount INTEGER NOT NULL,               -- positive = earned, negative = spent
  reason VARCHAR(255),
  source VARCHAR(100),                   -- 'quiz' | 'scan' | 'gacha' | 'daily_challenge' | 'streak' | 'robot' | 'purchase' | 'craft' | 'refund'
  multiplier FLOAT DEFAULT 1.0,
  points_balance INTEGER,                -- snapshot of balance after transaction
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_tx_user ON reward_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_tx_type ON reward_transactions(transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_tx_reason ON reward_transactions(reason, created_at DESC);
