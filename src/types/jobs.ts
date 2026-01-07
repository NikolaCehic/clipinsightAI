/**
 * Job Pipeline Types for ClipInsight AI
 * State machine, transitions, and pipeline definitions
 */

import type {
  JobStatus,
  RunStatus,
  PipelineStep,
  StepStatus,
  ArtifactType,
  Job,
  JobRun,
  RunStep,
} from './database';

// ============================================================================
// STATE MACHINE TYPES
// ============================================================================

/**
 * Valid state transitions for jobs
 * Maps from current state to array of valid next states
 */
export const JOB_STATE_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  RECEIVED: ['VALIDATED', 'FAILED_VALIDATION'],
  VALIDATED: ['INGESTED', 'BLOCKED_ENTITLEMENT'],
  INGESTED: ['TRANSCRIBED', 'FAILED'],
  TRANSCRIBED: ['INSIGHTS', 'NEEDS_USER_INPUT', 'FAILED'],
  INSIGHTS: ['DRAFTED', 'FAILED'],
  DRAFTED: ['REVIEWED', 'FAILED'],
  REVIEWED: ['DELIVERED', 'REQUIRES_MANUAL_REVIEW', 'FAILED'],
  DELIVERED: ['STORED', 'FAILED'],
  STORED: ['ANALYTICS_LOGGED', 'FAILED'],
  ANALYTICS_LOGGED: [],
  // Terminal states
  FAILED_VALIDATION: [],
  BLOCKED_ENTITLEMENT: [],
  REQUIRES_MANUAL_REVIEW: ['DELIVERED', 'FAILED'],
  NEEDS_USER_INPUT: ['TRANSCRIBED', 'FAILED'],
  FAILED: [],
};

/**
 * Terminal states where job processing stops
 */
export const TERMINAL_STATES: JobStatus[] = [
  'ANALYTICS_LOGGED',
  'FAILED_VALIDATION',
  'BLOCKED_ENTITLEMENT',
  'FAILED',
];

/**
 * States that require user action
 */
export const USER_ACTION_STATES: JobStatus[] = [
  'REQUIRES_MANUAL_REVIEW',
  'NEEDS_USER_INPUT',
];

/**
 * States that indicate success progression
 */
export const SUCCESS_STATES: JobStatus[] = [
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
];

/**
 * States that indicate failure
 */
export const FAILURE_STATES: JobStatus[] = [
  'FAILED_VALIDATION',
  'BLOCKED_ENTITLEMENT',
  'FAILED',
];

// ============================================================================
// PIPELINE TYPES
// ============================================================================

/**
 * Pipeline step execution order
 */
export const PIPELINE_STEP_ORDER: PipelineStep[] = [
  'VALIDATION',
  'INGESTION',
  'ASR',
  'INSIGHTS',
  'DRAFTING',
  'QA',
  'DELIVERY',
];

/**
 * Mapping from pipeline step to corresponding job status
 */
export const STEP_TO_STATUS: Record<PipelineStep, JobStatus> = {
  VALIDATION: 'VALIDATED',
  INGESTION: 'INGESTED',
  ASR: 'TRANSCRIBED',
  INSIGHTS: 'INSIGHTS',
  DRAFTING: 'DRAFTED',
  QA: 'REVIEWED',
  DELIVERY: 'DELIVERED',
};

/**
 * Error classification for retry logic
 */
export type ErrorClassification = 'RETRYABLE' | 'NON_RETRYABLE';

/**
 * Error codes for pipeline failures
 */
export const ERROR_CODES = {
  // Validation errors (non-retryable)
  INVALID_INPUT: 'INVALID_INPUT',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  DURATION_EXCEEDED: 'DURATION_EXCEEDED',
  INVALID_URL: 'INVALID_URL',
  
  // Entitlement errors (non-retryable)
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  PLAN_LIMIT_REACHED: 'PLAN_LIMIT_REACHED',
  FEATURE_NOT_ENABLED: 'FEATURE_NOT_ENABLED',
  
  // Processing errors (retryable)
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  GENERATION_FAILED: 'GENERATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // API errors (non-retryable after max attempts)
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  API_KEY_INVALID: 'API_KEY_INVALID',
  API_UNAVAILABLE: 'API_UNAVAILABLE',
  
  // Content errors (non-retryable)
  LOW_QUALITY_TRANSCRIPT: 'LOW_QUALITY_TRANSCRIPT',
  CONTENT_POLICY_VIOLATION: 'CONTENT_POLICY_VIOLATION',
  HIGH_RISK_CONTENT: 'HIGH_RISK_CONTENT',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Classify errors for retry logic
 */
export const RETRYABLE_ERRORS: ErrorCode[] = [
  'UPLOAD_FAILED',
  'TRANSCRIPTION_FAILED',
  'GENERATION_FAILED',
  'RATE_LIMITED',
  'TIMEOUT',
  'NETWORK_ERROR',
];

// ============================================================================
// JOB PROCESSING TYPES
// ============================================================================

/**
 * Input for creating a new job
 */
export interface CreateJobInput {
  workspace_id: string;
  user_id: string;
  source_type: 'UPLOAD' | 'YOUTUBE_URL' | 'OTHER_URL';
  source_url?: string;
  source_filename?: string;
  language?: string;
  brand_preset_id?: string;
  custom_contract?: Partial<import('./database').GenerationContract>;
}

/**
 * Input for starting a job run
 */
export interface StartRunInput {
  job_id: string;
  trigger: 'USER_CREATE' | 'REGENERATE' | 'RETRY' | 'SYSTEM';
  model_config?: import('./database').ModelConfig;
  contract_overrides?: Partial<import('./database').GenerationContract>;
}

/**
 * Result of a pipeline step execution
 */
export interface StepResult {
  success: boolean;
  step: PipelineStep;
  duration_ms: number;
  error_code?: ErrorCode;
  error_message?: string;
  metrics?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

/**
 * Context passed through the pipeline
 */
export interface PipelineContext {
  job: Job;
  job_run: JobRun;
  workspace_id: string;
  user_id: string;
  contract: import('./database').GenerationContract;
  
  // Accumulated during pipeline
  media_asset_id?: string;
  transcript_id?: string;
  insight_pack_id?: string;
  artifact_ids?: Record<ArtifactType, string>;
  
  // Metrics
  total_tokens: number;
  total_cost_usd: number;
}

/**
 * Pipeline step handler function signature
 */
export type StepHandler = (context: PipelineContext) => Promise<StepResult>;

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Product event names for analytics
 */
export const EVENT_NAMES = {
  // Job lifecycle
  JOB_CREATED: 'job_created',
  JOB_STARTED: 'job_started',
  JOB_COMPLETED: 'job_completed',
  JOB_FAILED: 'job_failed',
  
  // Pipeline stages
  TRANSCRIPTION_COMPLETED: 'transcription_completed',
  INSIGHTS_GENERATED: 'insights_generated',
  DRAFTS_GENERATED: 'drafts_generated',
  QA_PASSED: 'qa_passed',
  QA_FAILED: 'qa_failed',
  
  // User actions
  ARTIFACT_VIEWED: 'artifact_viewed',
  ARTIFACT_COPIED: 'artifact_copied',
  ARTIFACT_EXPORTED: 'artifact_exported',
  ARTIFACT_EDITED: 'artifact_edited',
  REGENERATE_CLICKED: 'regenerate_clicked',
  
  // Social
  POST_PUBLISHED: 'post_published',
  POST_METRICS_SYNCED: 'post_metrics_synced',
} as const;

export type EventName = typeof EVENT_NAMES[keyof typeof EVENT_NAMES];

/**
 * Event payload types
 */
export interface JobCreatedEvent {
  job_id: string;
  source_type: string;
  language: string;
}

export interface JobCompletedEvent {
  job_id: string;
  job_run_id: string;
  duration_ms: number;
  artifact_count: number;
  total_cost_usd: number;
}

export interface ArtifactViewedEvent {
  artifact_id: string;
  artifact_type: ArtifactType;
  job_id: string;
}

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

export interface RetryConfig {
  max_attempts: number;
  base_delay_ms: number;
  max_delay_ms: number;
  exponential_base: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  max_attempts: 3,
  base_delay_ms: 1000,
  max_delay_ms: 30000,
  exponential_base: 2,
};

/**
 * Calculate delay for retry attempt
 */
export function calculateRetryDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const delay = config.base_delay_ms * Math.pow(config.exponential_base, attempt - 1);
  return Math.min(delay, config.max_delay_ms);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(errorCode: ErrorCode): boolean {
  return RETRYABLE_ERRORS.includes(errorCode);
}

/**
 * Check if job can transition to target state
 */
export function canTransitionTo(currentStatus: JobStatus, targetStatus: JobStatus): boolean {
  const validTransitions = JOB_STATE_TRANSITIONS[currentStatus];
  return validTransitions?.includes(targetStatus) ?? false;
}

/**
 * Check if job is in terminal state
 */
export function isTerminalState(status: JobStatus): boolean {
  return TERMINAL_STATES.includes(status);
}

/**
 * Check if job requires user action
 */
export function requiresUserAction(status: JobStatus): boolean {
  return USER_ACTION_STATES.includes(status);
}

/**
 * Get next pipeline step
 */
export function getNextStep(currentStep: PipelineStep): PipelineStep | null {
  const currentIndex = PIPELINE_STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex === PIPELINE_STEP_ORDER.length - 1) {
    return null;
  }
  return PIPELINE_STEP_ORDER[currentIndex + 1];
}

