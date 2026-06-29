-- Migration 005: Public Waste AI - Capture image + metadata
-- Phase 1: Mở rộng schema cho open dataset release (TDN-Waste-World)
--
-- Run in Supabase SQL Editor.
-- All changes are ADDITIVE (no breaking changes to existing tables).

-- ─── Extend ai_scan_metrics with dataset capture fields ──────────────────────
ALTER TABLE ai_scan_metrics
  ADD COLUMN IF NOT EXISTS image_url TEXT,                    -- Cloudinary URL (anonymized)
  ADD COLUMN IF NOT EXISTS image_hash VARCHAR(64),             -- SHA-256 of raw image bytes
  ADD COLUMN IF NOT EXISTS image_width INTEGER,
  ADD COLUMN IF NOT EXISTS image_height INTEGER,
  ADD COLUMN IF NOT EXISTS lighting_condition VARCHAR(20),     -- 'bright'|'normal'|'dim'|'dark' (Gemini auto-detect)
  ADD COLUMN IF NOT EXISTS occlusion_level VARCHAR(20),       -- 'none'|'partial'|'heavy' (Gemini auto-detect)
  ADD COLUMN IF NOT EXISTS top_k_predictions JSONB DEFAULT '[]',  -- [{category, prob}, ...] full 6-class softmax
  ADD COLUMN IF NOT EXISTS all_model_predictions JSONB DEFAULT '{}',  -- {model_name: {category, confidence, latency_ms}}
  ADD COLUMN IF NOT EXISTS consent_to_release BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS geo_country VARCHAR(2),             -- ISO country code
  ADD COLUMN IF NOT EXISTS geo_region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS device_model VARCHAR(100),
  ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'vi',
  ADD COLUMN IF NOT EXISTS dataset_release_status VARCHAR(20) DEFAULT 'private';
  -- 'private' | 'pending_review' | 'curated' | 'released' | 'rejected'

CREATE INDEX IF NOT EXISTS idx_ai_scan_hash ON ai_scan_metrics(image_hash);
CREATE INDEX IF NOT EXISTS idx_ai_scan_consent ON ai_scan_metrics(consent_to_release) WHERE consent_to_release = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_scan_release_status ON ai_scan_metrics(dataset_release_status);
CREATE INDEX IF NOT EXISTS idx_ai_scan_country ON ai_scan_metrics(geo_country);

-- ─── Dataset releases: track each OSF version ────────────────────────────────
CREATE TABLE IF NOT EXISTS dataset_releases (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) UNIQUE NOT NULL,                  -- 'v1.0' | 'v2.0' | ...
  doi VARCHAR(255),                                     -- OSF DOI
  osf_project_id VARCHAR(100),
  total_images INTEGER DEFAULT 0,
  total_categories INTEGER DEFAULT 6,
  license_type VARCHAR(50) DEFAULT 'CC-BY-4.0',
  model_card_url TEXT,
  changelog TEXT,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Dataset curators: human-in-the-loop review queue ───────────────────────
CREATE TABLE IF NOT EXISTS dataset_curation_queue (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES ai_scan_metrics(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',                 -- 'pending' | 'approved' | 'rejected' | 'relabeled'
  reason_flagged TEXT,                                  -- 'gemini_groq_disagree' | 'low_confidence' | 'duplicate' | 'off_topic'
  curator_label VARCHAR(50),                            -- human-curated ground truth
  curator_notes TEXT,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curation_status ON dataset_curation_queue(status, created_at DESC);

-- ─── Dataset contributors: opt-in registry for "wall of fame" ────────────────
CREATE TABLE IF NOT EXISTS dataset_contributors (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  display_name VARCHAR(100),                            -- optional (anonymized if not provided)
  consent_given BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMPTZ,
  total_images_contributed INTEGER DEFAULT 0,
  images_in_release INTEGER DEFAULT 0,                  -- count after curation
  first_contribution_at TIMESTAMPTZ,
  last_contribution_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,                               -- GDPR-style withdrawal
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributors_active ON dataset_contributors(consent_given) WHERE consent_given = TRUE;

-- ─── Federated learning rounds (Phase 2 prep) ───────────────────────────────
CREATE TABLE IF NOT EXISTS federated_rounds (
  id SERIAL PRIMARY KEY,
  round_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'open',                    -- 'open' | 'aggregating' | 'completed' | 'failed'
  participants_count INTEGER DEFAULT 0,
  min_participants INTEGER DEFAULT 10,
  model_version_before VARCHAR(20),
  model_version_after VARCHAR(20),
  training_loss_avg FLOAT,
  validation_accuracy FLOAT,
  dp_epsilon FLOAT DEFAULT 1.0,
  dp_delta FLOAT DEFAULT 0.00001,
  noise_multiplier FLOAT,
  notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fl_rounds_number ON federated_rounds(round_number);

-- ─── Federated updates: each client's encrypted weight diff ─────────────────
CREATE TABLE IF NOT EXISTS federated_updates (
  id SERIAL PRIMARY KEY,
  round_id INTEGER REFERENCES federated_rounds(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  weight_diff_hash VARCHAR(64) NOT NULL,                -- SHA-256 of weight tensor (don't store raw)
  num_samples_trained INTEGER,
  weight_norm FLOAT,
  clip_norm FLOAT DEFAULT 1.0,
  noise_scale FLOAT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  accepted BOOLEAN DEFAULT TRUE,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_fl_updates_round ON federated_updates(round_id, accepted);
CREATE INDEX IF NOT EXISTS idx_fl_updates_user ON federated_updates(user_id, submitted_at DESC);

-- ─── Privacy audit log (Phase 2 prep) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,                         -- 'model_update_submitted' | 'consent_granted' | 'consent_revoked' | 'global_model_pulled'
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_privacy_user ON privacy_audit_log(user_id, created_at DESC);

-- ─── Carbon ledger entries (Phase 4 prep) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS carbon_ledger_entries (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES research_users(user_id) ON DELETE SET NULL,
  cohort VARCHAR(50),                                   -- 'control' | 'exp_a' | 'exp_b' | 'exp_c' | 'global'
  category VARCHAR(50) NOT NULL,                        -- 'plastic' | 'paper' | 'glass' | 'metal' | 'organic' | 'hazard'
  weight_kg FLOAT NOT NULL,
  co2_kg_avoided FLOAT NOT NULL,                       -- positive = saved
  source VARCHAR(50) NOT NULL,                          -- 'scan_count_estimate' | 'smart_bin_weight' | 'audit'
  provenance_hash VARCHAR(64) NOT NULL,                -- SHA-256 of input data + timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carbon_time ON carbon_ledger_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_carbon_cohort ON carbon_ledger_entries(cohort, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_carbon_provenance ON carbon_ledger_entries(provenance_hash);

-- ─── Smart bin devices registry (Phase 5 prep, but schema-ready now) ────────
CREATE TABLE IF NOT EXISTS smart_bin_devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(100) UNIQUE NOT NULL,
  location_name VARCHAR(255),
  geo_lat FLOAT,
  geo_lng FLOAT,
  adapter_type VARCHAR(50) NOT NULL DEFAULT 'stub',     -- 'stub' | 'http_poll' | 'mqtt'
  endpoint_url TEXT,
  last_ping_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_active ON smart_bin_devices(is_active) WHERE is_active = TRUE;

-- ─── RPC: Recompute dataset contributor stats ──────────────────────────────
CREATE OR REPLACE FUNCTION recompute_contributor_stats(target_user_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE dataset_contributors dc
  SET
    total_images_contributed = (
      SELECT COUNT(*) FROM ai_scan_metrics
      WHERE user_id = target_user_id AND consent_to_release = TRUE
    ),
    last_contribution_at = (
      SELECT MAX(timestamp) FROM ai_scan_metrics
      WHERE user_id = target_user_id AND consent_to_release = TRUE
    ),
    images_in_release = (
      SELECT COUNT(*) FROM ai_scan_metrics
      WHERE user_id = target_user_id
        AND consent_to_release = TRUE
        AND dataset_release_status = 'released'
    )
  WHERE dc.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RPC: Withdraw consent (GDPR-style) ────────────────────────────────────
CREATE OR REPLACE FUNCTION withdraw_dataset_consent(target_user_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  -- Mark contributor as revoked
  UPDATE dataset_contributors
  SET consent_given = FALSE,
      revoked_at = NOW()
  WHERE user_id = target_user_id;

  -- Mark all their scans as private again
  UPDATE ai_scan_metrics
  SET consent_to_release = FALSE,
      dataset_release_status = 'private'
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;