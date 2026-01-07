/**
 * Job State Machine
 * Handles job state transitions, run management, and step tracking
 */

import { supabaseAdmin } from '@/lib/supabase';
import type {
  Job,
  JobRun,
  JobStatus,
  RunStatus,
  RunStep,
  PipelineStep,
  StepStatus,
  CreateJobInput,
  StartRunInput,
  GenerationContract,
} from '@/types';
import {
  JOB_STATE_TRANSITIONS,
  canTransitionTo,
  isTerminalState,
  DEFAULT_CONTRACT,
  mergeContract,
} from '@/types';

// ============================================================================
// JOB OPERATIONS
// ============================================================================

/**
 * Create a new job
 */
export async function createJob(input: CreateJobInput): Promise<Job> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .insert({
      workspace_id: input.workspace_id,
      created_by_user_id: input.user_id,
      source_type: input.source_type,
      source_url: input.source_url,
      source_filename: input.source_filename,
      language: input.language || 'en',
      brand_preset_id: input.brand_preset_id,
      status: 'RECEIVED',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }

  return data as Job;
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string): Promise<Job | null> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get job: ${error.message}`);
  }

  return data as Job;
}

/**
 * Update job status with transition validation
 */
export async function updateJobStatus(
  jobId: string,
  newStatus: JobStatus,
  statusReason?: string
): Promise<Job> {
  // Get current job
  const job = await getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Validate transition
  if (!canTransitionTo(job.status, newStatus)) {
    throw new Error(
      `Invalid state transition: ${job.status} -> ${newStatus}. ` +
      `Valid transitions: ${JOB_STATE_TRANSITIONS[job.status].join(', ')}`
    );
  }

  // Update job
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .update({
      status: newStatus,
      status_reason: statusReason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update job status: ${error.message}`);
  }

  return data as Job;
}

/**
 * Get job with all runs
 */
export async function getJobWithRuns(jobId: string): Promise<Job & { job_runs: JobRun[] }> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select(`
      *,
      job_runs (*)
    `)
    .eq('id', jobId)
    .single();

  if (error) {
    throw new Error(`Failed to get job with runs: ${error.message}`);
  }

  return data as Job & { job_runs: JobRun[] };
}

// ============================================================================
// RUN OPERATIONS
// ============================================================================

/**
 * Create a new job run
 */
export async function createJobRun(input: StartRunInput): Promise<JobRun> {
  // Get job to validate and get context
  const job = await getJob(input.job_id);
  if (!job) {
    throw new Error(`Job not found: ${input.job_id}`);
  }

  // Check if job is in terminal state
  if (isTerminalState(job.status)) {
    throw new Error(`Cannot create run for job in terminal state: ${job.status}`);
  }

  // Get existing runs count
  const { count } = await supabaseAdmin
    .from('job_runs')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', input.job_id);

  const runNumber = (count || 0) + 1;

  // Build generation contract
  let contract: GenerationContract = DEFAULT_CONTRACT;
  
  // If brand preset, merge it
  if (job.brand_preset_id) {
    const { data: preset } = await supabaseAdmin
      .from('brand_presets')
      .select('defaults_json')
      .eq('id', job.brand_preset_id)
      .single();
    
    if (preset?.defaults_json) {
      contract = mergeContract(contract, preset.defaults_json as Partial<GenerationContract>);
    }
  }

  // Apply any overrides
  if (input.contract_overrides) {
    contract = mergeContract(contract, input.contract_overrides);
  }

  // Create run
  const { data, error } = await supabaseAdmin
    .from('job_runs')
    .insert({
      job_id: input.job_id,
      run_number: runNumber,
      trigger: input.trigger,
      status: 'PENDING',
      model_config_json: input.model_config || {},
      prompt_versions_json: {
        planner: 'v1',
        writer: 'v1',
        reviewer: 'v1',
      },
      generation_contract_json: contract,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create job run: ${error.message}`);
  }

  return data as JobRun;
}

/**
 * Get job run by ID
 */
export async function getJobRun(runId: string): Promise<JobRun | null> {
  const { data, error } = await supabaseAdmin
    .from('job_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get job run: ${error.message}`);
  }

  return data as JobRun;
}

/**
 * Update job run status
 */
export async function updateRunStatus(
  runId: string,
  status: RunStatus,
  errorMessage?: string
): Promise<JobRun> {
  const updates: Record<string, unknown> = { status };

  if (status === 'RUNNING' && !errorMessage) {
    updates.started_at = new Date().toISOString();
  }

  if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED') {
    updates.finished_at = new Date().toISOString();
  }

  if (errorMessage) {
    updates.error_message = errorMessage;
  }

  const { data, error } = await supabaseAdmin
    .from('job_runs')
    .update(updates)
    .eq('id', runId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update run status: ${error.message}`);
  }

  return data as JobRun;
}

/**
 * Update run costs and tokens
 */
export async function updateRunMetrics(
  runId: string,
  tokensIn: number,
  tokensOut: number,
  costUsd: number
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('job_runs')
    .update({
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: costUsd,
    })
    .eq('id', runId);

  if (error) {
    throw new Error(`Failed to update run metrics: ${error.message}`);
  }
}

// ============================================================================
// STEP OPERATIONS
// ============================================================================

/**
 * Create a run step record
 */
export async function createRunStep(input: {
  job_run_id: string;
  step: PipelineStep;
  status: StepStatus;
  attempt?: number;
}): Promise<RunStep> {
  const { data, error } = await supabaseAdmin
    .from('run_steps')
    .insert({
      job_run_id: input.job_run_id,
      step: input.step,
      status: input.status,
      attempt: input.attempt || 1,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create run step: ${error.message}`);
  }

  return data as RunStep;
}

/**
 * Update run step
 */
export async function updateRunStep(
  stepId: string,
  updates: {
    status?: StepStatus;
    finished_at?: string;
    duration_ms?: number;
    attempt?: number;
    error_code?: string;
    error_detail?: string;
    metrics_json?: Record<string, unknown>;
  }
): Promise<RunStep> {
  const { data, error } = await supabaseAdmin
    .from('run_steps')
    .update(updates)
    .eq('id', stepId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update run step: ${error.message}`);
  }

  return data as RunStep;
}

/**
 * Get all steps for a run
 */
export async function getRunSteps(runId: string): Promise<RunStep[]> {
  const { data, error } = await supabaseAdmin
    .from('run_steps')
    .select('*')
    .eq('job_run_id', runId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get run steps: ${error.message}`);
  }

  return (data || []) as RunStep[];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if job can be rerun
 */
export function canRerun(job: Job): boolean {
  // Can rerun if in terminal state (except blocked entitlement)
  // or if in a state that requires user input
  return (
    isTerminalState(job.status) && job.status !== 'BLOCKED_ENTITLEMENT'
  ) || job.status === 'NEEDS_USER_INPUT' || job.status === 'REQUIRES_MANUAL_REVIEW';
}

/**
 * Get latest run for a job
 */
export async function getLatestRun(jobId: string): Promise<JobRun | null> {
  const { data, error } = await supabaseAdmin
    .from('job_runs')
    .select('*')
    .eq('job_id', jobId)
    .order('run_number', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get latest run: ${error.message}`);
  }

  return data as JobRun;
}

/**
 * Calculate job progress percentage
 */
export function calculateProgress(status: JobStatus): number {
  const progressMap: Record<JobStatus, number> = {
    RECEIVED: 0,
    VALIDATED: 10,
    INGESTED: 25,
    TRANSCRIBED: 40,
    INSIGHTS: 55,
    DRAFTED: 70,
    REVIEWED: 85,
    DELIVERED: 95,
    STORED: 98,
    ANALYTICS_LOGGED: 100,
    FAILED_VALIDATION: 0,
    BLOCKED_ENTITLEMENT: 0,
    REQUIRES_MANUAL_REVIEW: 85,
    NEEDS_USER_INPUT: 40,
    FAILED: 0,
  };

  return progressMap[status] ?? 0;
}

