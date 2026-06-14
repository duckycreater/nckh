-- ─── Migration 004: Quiz Management + Admin Audit ─────────────────────────
-- Adds quiz_questions, quiz_config, admin_actions tables for admin quiz builder.
-- Run this in Supabase SQL Editor.

-- Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  question_id INTEGER UNIQUE NOT NULL,
  content TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_key VARCHAR(1) NOT NULL CHECK (correct_key IN ('A','B','C','D')),
  points INTEGER DEFAULT 10,
  category VARCHAR(50),
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy','medium','hard')),
  enabled BOOLEAN DEFAULT true,
  image_url TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions("order", question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_category ON quiz_questions(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quiz_questions_enabled ON quiz_questions(enabled) WHERE enabled = true;

-- Quiz Config (key-value)
CREATE TABLE IF NOT EXISTS quiz_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- Admin Audit Log
CREATE TABLE IF NOT EXISTS admin_actions (
  id SERIAL PRIMARY KEY,
  admin_nick VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_nick, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type, created_at DESC);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_quiz_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quiz_questions_updated ON quiz_questions;
CREATE TRIGGER quiz_questions_updated BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_quiz_timestamp();

DROP TRIGGER IF EXISTS quiz_config_updated ON quiz_config;
CREATE TRIGGER quiz_config_updated BEFORE UPDATE ON quiz_config
  FOR EACH ROW EXECUTE FUNCTION update_quiz_timestamp();
