-- Migration 006: Family Mode (multi-user household)
-- Phase: CayGiaPha_NhanThuc feature-family
--
-- Run in Supabase SQL Editor.
--
-- Tables:
--   families          - household root
--   family_members    - users in a family (parent/child/spouse/roommate/guest)
--   family_challenges - weekly/multi-day goals for the whole family

-- ─── Families ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  invite_code VARCHAR(6) UNIQUE NOT NULL,
  created_by VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  region VARCHAR(100) DEFAULT 'VN',
  avatar_seed VARCHAR(32),
  weekly_goal INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_families_invite ON families(invite_code);
CREATE INDEX IF NOT EXISTS idx_families_creator ON families(created_by);

-- ─── Family Members ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_members (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'child'
    CHECK (role IN ('parent', 'child', 'spouse', 'roommate', 'guest')),
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_fm_user_active ON family_members(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_fm_family ON family_members(family_id, joined_at);

-- ─── Family Challenges ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_challenges (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL
    CHECK (type IN ('total_scans', 'category_diversity', 'streak_combined', 'co2_saved')),
  target INTEGER NOT NULL,
  progress INTEGER DEFAULT 0,
  reward INTEGER DEFAULT 50,
  start_at TIMESTAMPTZ DEFAULT NOW(),
  end_at TIMESTAMPTZ NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_by VARCHAR(255) NOT NULL REFERENCES research_users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fc_family_active ON family_challenges(family_id, end_at DESC) WHERE completed = FALSE;

-- ─── RPC: Recompute challenge progress ─────────────────────────────────────
CREATE OR REPLACE FUNCTION recompute_challenge_progress(target_family_id INTEGER)
RETURNS VOID AS $$
DECLARE
  ch RECORD;
  new_progress INTEGER;
BEGIN
  FOR ch IN
    SELECT id, type, target
    FROM family_challenges
    WHERE family_id = target_family_id
      AND completed = FALSE
      AND end_at > NOW()
  LOOP
    CASE ch.type
      WHEN 'total_scans' THEN
        SELECT COUNT(*) INTO new_progress
        FROM ai_scan_metrics a
        JOIN family_members m ON m.user_id = a.user_id
        WHERE m.family_id = target_family_id
          AND m.is_active = TRUE
          AND a.timestamp >= (SELECT start_at FROM family_challenges WHERE id = ch.id);

      WHEN 'category_diversity' THEN
        SELECT COUNT(DISTINCT a.predicted_category) INTO new_progress
        FROM ai_scan_metrics a
        JOIN family_members m ON m.user_id = a.user_id
        WHERE m.family_id = target_family_id
          AND m.is_active = TRUE
          AND a.timestamp >= (SELECT start_at FROM family_challenges WHERE id = ch.id);

      WHEN 'streak_combined' THEN
        SELECT COALESCE(SUM(
          (SELECT MAX(streak_days) FROM weekly_scores ws WHERE ws.user_id = m.user_id)
        ), 0)::int INTO new_progress
        FROM family_members m
        WHERE m.family_id = target_family_id AND m.is_active = TRUE;

      WHEN 'co2_saved' THEN
        SELECT COALESCE(SUM(
          CASE a.predicted_category
            WHEN 'plastic' THEN 0.025 * 2.5
            WHEN 'paper'   THEN 0.012 * 1.7
            WHEN 'glass'   THEN 0.200 * 0.6
            WHEN 'metal'   THEN 0.080 * 4.0
            WHEN 'organic' THEN 0.150 * 0.5
            ELSE 0
          END
        ), 0)::int INTO new_progress
        FROM ai_scan_metrics a
        JOIN family_members m ON m.user_id = a.user_id
        WHERE m.family_id = target_family_id
          AND m.is_active = TRUE
          AND a.timestamp >= (SELECT start_at FROM family_challenges WHERE id = ch.id);
    END CASE;

    UPDATE family_challenges
    SET progress = new_progress,
        completed = (new_progress >= ch.target),
        completed_at = CASE WHEN new_progress >= ch.target THEN NOW() ELSE NULL END
    WHERE id = ch.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recompute challenge progress when a scan is logged
DROP TRIGGER IF EXISTS trg_scan_recompute_challenges ON ai_scan_metrics;
CREATE TRIGGER trg_scan_recompute_challenges
  AFTER INSERT ON ai_scan_metrics
  FOR EACH ROW
  EXECUTE FUNCTION (
    -- Use plpgsql anonymous code via DO block is tricky; instead create proper function:
    SELECT NULL
  );

-- Simpler: directly trigger via AFTER INSERT
CREATE OR REPLACE FUNCTION trigger_recompute_on_scan()
RETURNS TRIGGER AS $$
DECLARE
  fam_id INTEGER;
BEGIN
  SELECT family_id INTO fam_id
  FROM family_members
  WHERE user_id = NEW.user_id AND is_active = TRUE
  LIMIT 1;
  IF fam_id IS NOT NULL THEN
    PERFORM recompute_challenge_progress(fam_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_scan_recompute_challenges ON ai_scan_metrics;
CREATE TRIGGER ai_scan_recompute_challenges
  AFTER INSERT ON ai_scan_metrics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_on_scan();
