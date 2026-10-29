-- Grade 8 profile standardization and durable verification state.
-- Safe to run repeatedly in the Supabase SQL editor or migration runner.

ALTER TABLE public.research_users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.research_users ADD COLUMN IF NOT EXISTS class_grade VARCHAR(20);
ALTER TABLE public.research_users ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);
ALTER TABLE public.research_users ADD COLUMN IF NOT EXISTS class_id VARCHAR(64);
ALTER TABLE public.research_users ADD COLUMN IF NOT EXISTS points_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.research_users ADD COLUMN IF NOT EXISTS total_exp_earned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.research_users
  ADD COLUMN IF NOT EXISTS profile_verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified';
ALTER TABLE public.research_users ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMPTZ;
ALTER TABLE public.research_users ADD COLUMN IF NOT EXISTS profile_verified_at TIMESTAMPTZ;
ALTER TABLE public.research_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.school_classes (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(30) NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
  school_year VARCHAR(9) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_profile_verifications (
  user_id VARCHAR(255) PRIMARY KEY REFERENCES public.research_users(user_id) ON DELETE CASCADE,
  submitted_full_name VARCHAR(255),
  class_id VARCHAR(64),
  class_grade VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'unverified'
    CHECK (status IN ('unverified', 'pending', 'verified', 'rejected', 'skipped')),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_verifications_status
  ON public.student_profile_verifications(status, updated_at DESC);

