/**
 * Database Types for ClipInsight AI v2
 * Generated from supabase/schema-v2.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export type JobSourceType = 'UPLOAD' | 'YOUTUBE_URL' | 'OTHER_URL';

export type JobStatus =
  | 'RECEIVED'
  | 'VALIDATED'
  | 'INGESTED'
  | 'TRANSCRIBED'
  | 'INSIGHTS'
  | 'DRAFTED'
  | 'REVIEWED'
  | 'DELIVERED'
  | 'STORED'
  | 'ANALYTICS_LOGGED'
  | 'FAILED_VALIDATION'
  | 'BLOCKED_ENTITLEMENT'
  | 'REQUIRES_MANUAL_REVIEW'
  | 'NEEDS_USER_INPUT'
  | 'FAILED';

export type RunTrigger = 'USER_CREATE' | 'REGENERATE' | 'RETRY' | 'SYSTEM';

export type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export type MediaKind = 'VIDEO' | 'AUDIO' | 'THUMBNAIL';

export type TranscriptSource = 'USER' | 'ASR';

export type TranscriptFormat = 'TXT' | 'VTT' | 'SRT';

export type ArtifactType = 'INSIGHTS' | 'NEWSLETTER' | 'BLOG' | 'TWITTER_THREAD' | 'LINKEDIN';

export type ArtifactVariant = 'DEFAULT' | 'VARIANT_A' | 'VARIANT_B' | 'VARIANT_C';

export type ArtifactStatus = 'DRAFT' | 'REVIEWED_OK' | 'NEEDS_FIX' | 'APPROVED' | 'PUBLISHED';

export type ReviewerType = 'AUTO' | 'HUMAN';

export type PipelineStep = 'VALIDATION' | 'INGESTION' | 'ASR' | 'INSIGHTS' | 'DRAFTING' | 'QA' | 'DELIVERY';

export type StepStatus = 'STARTED' | 'SUCCEEDED' | 'FAILED' | 'RETRYING';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type SocialProvider = 'TWITTER' | 'LINKEDIN';

export type ReviewStatus = 'APPROVED' | 'FIX_REQUIRED' | 'MANUAL_REVIEW';

// ============================================================================
// TABLE TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_user_id: string;
  settings_json: Record<string, unknown>;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface BrandPreset {
  id: string;
  workspace_id: string;
  name: string;
  defaults_json: BrandPresetDefaults;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandPresetDefaults {
  tone?: string;
  audience?: string;
  keywords?: string[];
  banned_terms?: string[];
  cta?: string;
  style_notes?: string;
  templates?: Record<string, unknown>;
}

export interface Job {
  id: string;
  workspace_id: string;
  created_by_user_id: string;
  source_type: JobSourceType;
  source_url: string | null;
  source_filename: string | null;
  status: JobStatus;
  status_reason: string | null;
  video_duration_sec: number | null;
  language: string;
  brand_preset_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobRun {
  id: string;
  job_id: string;
  run_number: number;
  trigger: RunTrigger;
  status: RunStatus;
  model_config_json: ModelConfig;
  prompt_versions_json: PromptVersions;
  generation_contract_json: GenerationContract;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ModelConfig {
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
}

export interface PromptVersions {
  planner?: string;
  writer?: string;
  reviewer?: string;
  [key: string]: string | undefined;
}

export interface MediaAsset {
  id: string;
  job_id: string;
  kind: MediaKind;
  storage_key: string;
  mime_type: string;
  size_bytes: number | null;
  checksum: string | null;
  duration_sec: number | null;
  created_at: string;
}

export interface Transcript {
  id: string;
  job_run_id: string;
  source: TranscriptSource;
  format: TranscriptFormat;
  storage_key: string;
  content_text: string | null;
  asr_metadata_json: ASRMetadata | null;
  quality_score: number | null;
  word_count: number | null;
  created_at: string;
}

export interface ASRMetadata {
  provider?: string;
  confidence?: number;
  diarization?: boolean;
  language_detected?: string;
  [key: string]: unknown;
}

export interface InsightPack {
  id: string;
  job_run_id: string;
  storage_key: string;
  content_json: InsightPackContent | null;
  summary_text: string | null;
  risk_score: number;
  created_at: string;
}

export interface Artifact {
  id: string;
  job_run_id: string;
  type: ArtifactType;
  variant: ArtifactVariant;
  status: ArtifactStatus;
  title: string | null;
  storage_key: string;
  content_text: string | null;
  content_preview: string | null;
  word_count: number | null;
  char_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface ArtifactReview {
  id: string;
  artifact_id: string;
  reviewer_type: ReviewerType;
  format_compliance_score: number | null;
  grounding_score: number | null;
  readability_score: number | null;
  risk_score: number | null;
  overall_score: number | null;
  status: ReviewStatus | null;
  notes_json: ReviewNotes | null;
  created_at: string;
}

export interface ReviewNotes {
  required_fixes?: ReviewFix[];
  warnings?: string[];
  suggestions?: string[];
  [key: string]: unknown;
}

export interface ReviewFix {
  location: string;
  issue: string;
  instruction: string;
}

export interface RunStep {
  id: string;
  job_run_id: string;
  step: PipelineStep;
  status: StepStatus;
  attempt: number;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_code: string | null;
  error_detail: string | null;
  metrics_json: StepMetrics | null;
  created_at: string;
}

export interface StepMetrics {
  latency_ms?: number;
  tokens_used?: number;
  cost_usd?: number;
  [key: string]: unknown;
}

export interface ProductEvent {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  job_id: string | null;
  job_run_id: string | null;
  artifact_id: string | null;
  event_name: string;
  properties_json: Record<string, unknown>;
  created_at: string;
}

export interface ConnectedAccount {
  id: string;
  workspace_id: string;
  provider: SocialProvider;
  account_handle: string;
  scopes_json: string[] | null;
  token_ref: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface PublishedPost {
  id: string;
  artifact_id: string;
  connected_account_id: string | null;
  provider: SocialProvider;
  provider_post_id: string | null;
  published_at: string;
  utm_campaign: string | null;
  post_url: string | null;
  created_at: string;
}

export interface PostMetricsDaily {
  id: string;
  published_post_id: string;
  date: string;
  impressions: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface WorkspaceEntitlement {
  id: string;
  workspace_id: string;
  plan_name: string;
  minutes_per_day: number;
  jobs_per_day: number;
  max_video_duration_sec: number;
  allowed_formats: ArtifactType[];
  variants_enabled: boolean;
  social_publishing_enabled: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

export interface DailyUsage {
  id: string;
  workspace_id: string;
  date: string;
  jobs_count: number;
  minutes_processed: number;
  tokens_used: number;
  cost_usd: number;
}

// ============================================================================
// INSIGHT PACK CONTENT SCHEMA
// ============================================================================

export interface InsightPackContent {
  executive_summary_bullets: string[];
  themes: InsightTheme[];
  takeaways: string[];
  quotes: InsightQuote[];
  outline: ContentOutline[];
  title_options: string[];
  hook_options: string[];
  risk_flags: RiskFlag[];
}

export interface InsightTheme {
  name: string;
  explanation: string;
}

export interface InsightQuote {
  quote: string;
  timestamp: string; // mm:ss or hh:mm:ss
  context?: string;
}

export interface ContentOutline {
  h2: string;
  h3?: string[];
}

export interface RiskFlag {
  claim: string;
  why_risky: string;
  suggested_rewrite?: string;
}

// ============================================================================
// GENERATION CONTRACT SCHEMA
// ============================================================================

export interface GenerationContract {
  language: string;
  audience: string;
  tone: string;
  brand: BrandConfig;
  constraints: ContentConstraints;
  formats: FormatConstraints;
}

export interface BrandConfig {
  keywords?: string[];
  cta?: string;
  banned_terms?: string[];
  style_notes?: string;
}

export interface ContentConstraints {
  no_fabrication: boolean;
  quotes_require_timestamps: boolean;
  avoid_medical_legal_financial_advice: boolean;
}

export interface FormatConstraints {
  newsletter?: { length: string };
  blog?: { length: string };
  twitter_thread?: { tweets: string };
  linkedin?: { length: string };
}

// ============================================================================
// INSERT/UPDATE TYPES
// ============================================================================

export type UserInsert = Omit<User, 'id' | 'created_at'> & { id?: string };
export type WorkspaceInsert = Omit<Workspace, 'id' | 'created_at'> & { id?: string };
export type JobInsert = Omit<Job, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type JobRunInsert = Omit<JobRun, 'id' | 'created_at'> & { id?: string };
export type ArtifactInsert = Omit<Artifact, 'id' | 'created_at' | 'updated_at'> & { id?: string };

// ============================================================================
// JOINED TYPES (for queries with relations)
// ============================================================================

export interface JobWithRuns extends Job {
  job_runs: JobRun[];
}

export interface JobRunWithArtifacts extends JobRun {
  artifacts: Artifact[];
  transcript: Transcript | null;
  insight_pack: InsightPack | null;
}

export interface ArtifactWithReviews extends Artifact {
  reviews: ArtifactReview[];
}

export interface WorkspaceWithMembers extends Workspace {
  members: (WorkspaceMember & { user: User })[];
  entitlement: WorkspaceEntitlement | null;
}

