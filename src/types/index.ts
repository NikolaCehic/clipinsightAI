/**
 * ClipInsight AI Type Definitions
 * Central export for all types
 */

// ============================================================================
// DATABASE TYPES
// ============================================================================

export type {
  // Enums
  JobSourceType,
  JobStatus,
  RunTrigger,
  RunStatus,
  MediaKind,
  TranscriptSource,
  TranscriptFormat,
  ArtifactType,
  ArtifactVariant,
  ArtifactStatus,
  ReviewerType,
  PipelineStep,
  StepStatus,
  WorkspaceRole,
  SocialProvider,
  ReviewStatus,
  
  // Core entities
  User,
  Workspace,
  WorkspaceMember,
  BrandPreset,
  BrandPresetDefaults,
  
  // Jobs and runs
  Job,
  JobRun,
  ModelConfig,
  PromptVersions,
  MediaAsset,
  Transcript,
  ASRMetadata,
  InsightPack,
  
  // Artifacts
  Artifact,
  ArtifactReview,
  ReviewNotes,
  ReviewFix,
  
  // Observability
  RunStep,
  StepMetrics,
  ProductEvent,
  
  // Social
  ConnectedAccount,
  PublishedPost,
  PostMetricsDaily,
  
  // Entitlements
  WorkspaceEntitlement,
  DailyUsage,
  
  // Content schemas
  InsightPackContent,
  InsightTheme,
  InsightQuote,
  ContentOutline,
  RiskFlag,
  GenerationContract,
  BrandConfig,
  ContentConstraints,
  FormatConstraints,
  
  // Insert types
  UserInsert,
  WorkspaceInsert,
  JobInsert,
  JobRunInsert,
  ArtifactInsert,
  
  // Joined types
  JobWithRuns,
  JobRunWithArtifacts,
  ArtifactWithReviews,
  WorkspaceWithMembers,
} from './database';

// ============================================================================
// JOB PIPELINE TYPES
// ============================================================================

export {
  // State machine
  JOB_STATE_TRANSITIONS,
  TERMINAL_STATES,
  USER_ACTION_STATES,
  SUCCESS_STATES,
  FAILURE_STATES,
  
  // Pipeline
  PIPELINE_STEP_ORDER,
  STEP_TO_STATUS,
  ERROR_CODES,
  RETRYABLE_ERRORS,
  
  // Events
  EVENT_NAMES,
  
  // Retry config
  DEFAULT_RETRY_CONFIG,
  calculateRetryDelay,
  isRetryableError,
  canTransitionTo,
  isTerminalState,
  requiresUserAction,
  getNextStep,
} from './jobs';

export type {
  ErrorClassification,
  ErrorCode,
  CreateJobInput,
  StartRunInput,
  StepResult,
  PipelineContext,
  StepHandler,
  EventName,
  JobCreatedEvent,
  JobCompletedEvent,
  ArtifactViewedEvent,
  RetryConfig,
} from './jobs';

// ============================================================================
// CONTRACT TYPES
// ============================================================================

export {
  DEFAULT_CONTRACT,
  mergeContract,
  brandPresetToContractOverrides,
  validateContract,
  parseLengthConstraint,
  meetsLengthConstraint,
  serializeContract,
  parseContract,
  getContractVersion,
} from './contracts';

export type {
  GenerationContract as ContractType,
  BrandConfig as ContractBrandConfig,
  ContentConstraints as ContractConstraints,
  FormatConstraints as ContractFormatConstraints,
  NewsletterConstraints,
  BlogConstraints,
  TwitterConstraints,
  LinkedInConstraints,
} from './contracts';

// ============================================================================
// LEGACY TYPES (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use InsightPackContent from database types
 */
export interface ContentPackage {
  project_title: string;
  newsletter: {
    subject: string;
    body: string;
  };
  twitter_thread: string[];
  linkedin_post: string;
  blog_post: string;
}

/**
 * @deprecated Use Job and Artifact types
 */
export interface Project {
  id: string;
  user_id: string;
  title: string;
  video_filename?: string;
  newsletter_subject: string;
  newsletter_body: string;
  twitter_thread: string[];
  linkedin_post: string;
  blog_post: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated Use ProductEvent type
 */
export interface UsageLog {
  id: string;
  user_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make all properties in T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract the element type from an array type
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Omit properties from nested object
 */
export type OmitDeep<T, K extends string> = {
  [P in keyof T as P extends K ? never : P]: T[P] extends object
    ? OmitDeep<T[P], K>
    : T[P];
};
