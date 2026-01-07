-- ClipInsight AI Database Schema v2
-- Full SOP Implementation with multi-tenant workspaces, jobs, artifacts, analytics
-- Run this in Supabase SQL Editor to set up the complete database

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS (for type safety)
-- ============================================================================

-- Job source types
CREATE TYPE job_source_type AS ENUM ('UPLOAD', 'YOUTUBE_URL', 'OTHER_URL');

-- Job status (state machine states)
CREATE TYPE job_status AS ENUM (
  'RECEIVED',
  'VALIDATED',
  'INGESTED',
  'TRANSCRIBED',
  'INSIGHTS',
  'DRAFTED',
  'REVIEWED',
  'DELIVERED',
  'STORED',
  'ANALYTICS_LOGGED',
  'FAILED_VALIDATION',
  'BLOCKED_ENTITLEMENT',
  'REQUIRES_MANUAL_REVIEW',
  'NEEDS_USER_INPUT',
  'FAILED'
);

-- Job run trigger types
CREATE TYPE run_trigger AS ENUM ('USER_CREATE', 'REGENERATE', 'RETRY', 'SYSTEM');

-- Run status
CREATE TYPE run_status AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- Media asset types
CREATE TYPE media_kind AS ENUM ('VIDEO', 'AUDIO', 'THUMBNAIL');

-- Transcript source
CREATE TYPE transcript_source AS ENUM ('USER', 'ASR');

-- Transcript format
CREATE TYPE transcript_format AS ENUM ('TXT', 'VTT', 'SRT');

-- Artifact types
CREATE TYPE artifact_type AS ENUM ('INSIGHTS', 'NEWSLETTER', 'BLOG', 'TWITTER_THREAD', 'LINKEDIN');

-- Artifact variants
CREATE TYPE artifact_variant AS ENUM ('DEFAULT', 'VARIANT_A', 'VARIANT_B', 'VARIANT_C');

-- Artifact status
CREATE TYPE artifact_status AS ENUM ('DRAFT', 'REVIEWED_OK', 'NEEDS_FIX', 'APPROVED', 'PUBLISHED');

-- Reviewer type
CREATE TYPE reviewer_type AS ENUM ('AUTO', 'HUMAN');

-- Pipeline steps
CREATE TYPE pipeline_step AS ENUM ('VALIDATION', 'INGESTION', 'ASR', 'INSIGHTS', 'DRAFTING', 'QA', 'DELIVERY');

-- Step status
CREATE TYPE step_status AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED', 'RETRYING');

-- Workspace roles
CREATE TYPE workspace_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- Social providers
CREATE TYPE social_provider AS ENUM ('TWITTER', 'LINKEDIN');

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

-- Users table (extends existing)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces (multi-tenant)
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Brand presets
CREATE TABLE IF NOT EXISTS brand_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  defaults_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- defaults_json contains: tone, audience, keywords, banned_terms, templates
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROCESSING: JOBS, RUNS, MEDIA, TRANSCRIPTS, INSIGHTS
-- ============================================================================

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  source_type job_source_type NOT NULL,
  source_url TEXT,
  source_filename TEXT,
  status job_status NOT NULL DEFAULT 'RECEIVED',
  status_reason TEXT,
  video_duration_sec INTEGER,
  language TEXT DEFAULT 'en',
  brand_preset_id UUID REFERENCES brand_presets(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_workspace_created ON jobs(workspace_id, created_at DESC);
CREATE INDEX idx_jobs_workspace_status ON jobs(workspace_id, status);
CREATE INDEX idx_jobs_status ON jobs(status);

-- Job runs table
CREATE TABLE IF NOT EXISTS job_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL DEFAULT 1,
  trigger run_trigger NOT NULL DEFAULT 'USER_CREATE',
  status run_status NOT NULL DEFAULT 'PENDING',
  model_config_json JSONB DEFAULT '{}'::jsonb,
  prompt_versions_json JSONB DEFAULT '{}'::jsonb,
  generation_contract_json JSONB DEFAULT '{}'::jsonb,
  cost_usd NUMERIC(10, 4) DEFAULT 0,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_runs_job_number ON job_runs(job_id, run_number);
CREATE INDEX idx_job_runs_status ON job_runs(status, created_at DESC);

-- Media assets table
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  kind media_kind NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT,
  checksum TEXT,
  duration_sec INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_assets_job ON media_assets(job_id);

-- Transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_run_id UUID NOT NULL REFERENCES job_runs(id) ON DELETE CASCADE,
  source transcript_source NOT NULL,
  format transcript_format NOT NULL DEFAULT 'TXT',
  storage_key TEXT NOT NULL,
  content_text TEXT, -- Stored inline for quick access
  asr_metadata_json JSONB,
  quality_score NUMERIC(4, 3),
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transcripts_job_run ON transcripts(job_run_id);

-- Insight packs table
CREATE TABLE IF NOT EXISTS insight_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_run_id UUID NOT NULL REFERENCES job_runs(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  content_json JSONB, -- insights.json stored inline
  summary_text TEXT,
  risk_score NUMERIC(4, 3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insight_packs_job_run ON insight_packs(job_run_id);

-- ============================================================================
-- ARTIFACTS: VERSIONED OUTPUTS + QA
-- ============================================================================

-- Artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_run_id UUID NOT NULL REFERENCES job_runs(id) ON DELETE CASCADE,
  type artifact_type NOT NULL,
  variant artifact_variant NOT NULL DEFAULT 'DEFAULT',
  status artifact_status NOT NULL DEFAULT 'DRAFT',
  title TEXT,
  storage_key TEXT NOT NULL,
  content_text TEXT, -- Full content stored inline
  content_preview TEXT, -- First ~200 chars for UI
  word_count INTEGER,
  char_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_artifacts_job_run_type ON artifacts(job_run_id, type);
CREATE INDEX idx_artifacts_type_created ON artifacts(type, created_at DESC);

-- Artifact reviews table
CREATE TABLE IF NOT EXISTS artifact_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  reviewer_type reviewer_type NOT NULL DEFAULT 'AUTO',
  format_compliance_score NUMERIC(4, 3),
  grounding_score NUMERIC(4, 3),
  readability_score NUMERIC(4, 3),
  risk_score NUMERIC(4, 3),
  overall_score NUMERIC(4, 3),
  status TEXT, -- APPROVED | FIX_REQUIRED | MANUAL_REVIEW
  notes_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_artifact_reviews_artifact ON artifact_reviews(artifact_id);

-- ============================================================================
-- PIPELINE OBSERVABILITY
-- ============================================================================

-- Run steps table
CREATE TABLE IF NOT EXISTS run_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_run_id UUID NOT NULL REFERENCES job_runs(id) ON DELETE CASCADE,
  step pipeline_step NOT NULL,
  status step_status NOT NULL DEFAULT 'STARTED',
  attempt INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_code TEXT,
  error_detail TEXT,
  metrics_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_run_steps_job_run ON run_steps(job_run_id, step);
CREATE INDEX idx_run_steps_status ON run_steps(status, created_at DESC);

-- ============================================================================
-- ANALYTICS (PRODUCT EVENTS)
-- ============================================================================

-- Product events table
CREATE TABLE IF NOT EXISTS product_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  job_run_id UUID REFERENCES job_runs(id) ON DELETE SET NULL,
  artifact_id UUID REFERENCES artifacts(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  properties_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_events_workspace ON product_events(workspace_id, created_at DESC);
CREATE INDEX idx_product_events_name ON product_events(event_name, created_at DESC);
CREATE INDEX idx_product_events_job ON product_events(job_id);

-- ============================================================================
-- SOCIAL INTEGRATIONS
-- ============================================================================

-- Connected accounts table
CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider social_provider NOT NULL,
  account_handle TEXT NOT NULL,
  scopes_json JSONB,
  token_ref TEXT, -- Reference to secrets vault
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, provider, account_handle)
);

CREATE INDEX idx_connected_accounts_workspace ON connected_accounts(workspace_id);

-- Published posts table
CREATE TABLE IF NOT EXISTS published_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL,
  provider social_provider NOT NULL,
  provider_post_id TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  utm_campaign TEXT,
  post_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_published_posts_artifact ON published_posts(artifact_id);

-- Post metrics daily table
CREATE TABLE IF NOT EXISTS post_metrics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  published_post_id UUID NOT NULL REFERENCES published_posts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  UNIQUE(published_post_id, date)
);

CREATE INDEX idx_post_metrics_post ON post_metrics_daily(published_post_id, date);

-- ============================================================================
-- ENTITLEMENTS / USAGE LIMITS
-- ============================================================================

-- Workspace entitlements table
CREATE TABLE IF NOT EXISTS workspace_entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'free',
  minutes_per_day INTEGER DEFAULT 10,
  jobs_per_day INTEGER DEFAULT 3,
  max_video_duration_sec INTEGER DEFAULT 600, -- 10 minutes
  allowed_formats TEXT[] DEFAULT ARRAY['NEWSLETTER', 'BLOG', 'TWITTER_THREAD', 'LINKEDIN'],
  variants_enabled BOOLEAN DEFAULT false,
  social_publishing_enabled BOOLEAN DEFAULT false,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspace_entitlements_workspace ON workspace_entitlements(workspace_id);

-- Daily usage tracking
CREATE TABLE IF NOT EXISTS daily_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  jobs_count INTEGER DEFAULT 0,
  minutes_processed INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 4) DEFAULT 0,
  UNIQUE(workspace_id, date)
);

CREATE INDEX idx_daily_usage_workspace ON daily_usage(workspace_id, date DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_presets_updated_at
  BEFORE UPDATE ON brand_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artifacts_updated_at
  BEFORE UPDATE ON artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check entitlements
CREATE OR REPLACE FUNCTION check_workspace_entitlement(
  p_workspace_id UUID,
  p_check_type TEXT -- 'jobs' | 'minutes' | 'duration'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_entitlement RECORD;
  v_usage RECORD;
BEGIN
  -- Get current entitlement
  SELECT * INTO v_entitlement
  FROM workspace_entitlements
  WHERE workspace_id = p_workspace_id
    AND (valid_until IS NULL OR valid_until > NOW())
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Get today's usage
  SELECT * INTO v_usage
  FROM daily_usage
  WHERE workspace_id = p_workspace_id
    AND date = CURRENT_DATE;
  
  IF p_check_type = 'jobs' THEN
    RETURN COALESCE(v_usage.jobs_count, 0) < v_entitlement.jobs_per_day;
  ELSIF p_check_type = 'minutes' THEN
    RETURN COALESCE(v_usage.minutes_processed, 0) < v_entitlement.minutes_per_day;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE 'plpgsql';

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_daily_usage(
  p_workspace_id UUID,
  p_jobs INTEGER DEFAULT 0,
  p_minutes INTEGER DEFAULT 0,
  p_tokens INTEGER DEFAULT 0,
  p_cost NUMERIC DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO daily_usage (workspace_id, date, jobs_count, minutes_processed, tokens_used, cost_usd)
  VALUES (p_workspace_id, CURRENT_DATE, p_jobs, p_minutes, p_tokens, p_cost)
  ON CONFLICT (workspace_id, date)
  DO UPDATE SET
    jobs_count = daily_usage.jobs_count + p_jobs,
    minutes_processed = daily_usage.minutes_processed + p_minutes,
    tokens_used = daily_usage.tokens_used + p_tokens,
    cost_usd = daily_usage.cost_usd + p_cost;
END;
$$ LANGUAGE 'plpgsql';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifact_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies (for API routes)
CREATE POLICY "Service role full access on users" ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on workspaces" ON workspaces FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on workspace_members" ON workspace_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on brand_presets" ON brand_presets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on jobs" ON jobs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on job_runs" ON job_runs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on media_assets" ON media_assets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on transcripts" ON transcripts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on insight_packs" ON insight_packs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on artifacts" ON artifacts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on artifact_reviews" ON artifact_reviews FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on run_steps" ON run_steps FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on product_events" ON product_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on connected_accounts" ON connected_accounts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on published_posts" ON published_posts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on post_metrics_daily" ON post_metrics_daily FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on workspace_entitlements" ON workspace_entitlements FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on daily_usage" ON daily_usage FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

