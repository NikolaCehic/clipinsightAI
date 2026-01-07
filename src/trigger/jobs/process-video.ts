/**
 * Video Processing Job
 * Main Trigger.dev job that orchestrates the entire content generation pipeline
 */

import { eventTrigger } from '@trigger.dev/sdk';
import { triggerClient } from '../client';
import type { 
  Job, 
  JobRun, 
  PipelineContext, 
  StepResult,
  JobStatus,
  PipelineStep,
} from '@/types';
import { 
  PIPELINE_STEP_ORDER, 
  STEP_TO_STATUS,
  ERROR_CODES,
  isRetryableError,
  calculateRetryDelay,
  DEFAULT_RETRY_CONFIG,
} from '@/types';

// Import pipeline step handlers (will be created)
import { validateJob } from '@/lib/pipeline/validation';
import { ingestMedia } from '@/lib/pipeline/ingestion';
import { transcribeMedia } from '@/lib/pipeline/transcription';
import { generateInsights } from '@/lib/pipeline/insights';
import { generateDrafts } from '@/lib/pipeline/drafting';
import { reviewArtifacts } from '@/lib/pipeline/qa-review';
import { deliverArtifacts } from '@/lib/pipeline/delivery';
import { updateJobStatus, updateRunStatus, createRunStep, updateRunStep } from '@/lib/jobs/state-machine';
import { emitEvent } from '@/lib/analytics/events';

/**
 * Payload for starting a video processing job
 */
export interface ProcessVideoPayload {
  job_id: string;
  job_run_id: string;
  workspace_id: string;
  user_id: string;
}

/**
 * Map pipeline steps to their handler functions
 */
const STEP_HANDLERS: Record<PipelineStep, (ctx: PipelineContext) => Promise<StepResult>> = {
  VALIDATION: validateJob,
  INGESTION: ingestMedia,
  ASR: transcribeMedia,
  INSIGHTS: generateInsights,
  DRAFTING: generateDrafts,
  QA: reviewArtifacts,
  DELIVERY: deliverArtifacts,
};

/**
 * Main video processing job
 */
export const processVideoJob = triggerClient.defineJob({
  id: 'process-video',
  name: 'Process Video Content',
  version: '1.0.0',
  trigger: eventTrigger({
    name: 'video.process',
  }),
  
  run: async (payload: ProcessVideoPayload, io) => {
    const { job_id, job_run_id, workspace_id, user_id } = payload;
    
    await io.logger.info('Starting video processing', { job_id, job_run_id });
    
    // Emit job started event
    await emitEvent({
      workspace_id,
      user_id,
      job_id,
      job_run_id,
      event_name: 'job_started',
      properties: { trigger: 'process-video' },
    });
    
    // Initialize pipeline context
    let context: PipelineContext = {
      job: {} as Job, // Will be populated by validation step
      job_run: {} as JobRun,
      workspace_id,
      user_id,
      contract: {} as PipelineContext['contract'],
      total_tokens: 0,
      total_cost_usd: 0,
    };
    
    // Update run status to RUNNING
    await updateRunStatus(job_run_id, 'RUNNING');
    
    // Execute pipeline steps in order
    for (const step of PIPELINE_STEP_ORDER) {
      const stepHandler = STEP_HANDLERS[step];
      const targetStatus = STEP_TO_STATUS[step];
      
      await io.logger.info(`Starting step: ${step}`, { job_id, step });
      
      // Create step record
      const stepRecord = await createRunStep({
        job_run_id,
        step,
        status: 'STARTED',
        attempt: 1,
      });
      
      let result: StepResult;
      let attempt = 1;
      
      // Retry loop for retryable errors
      while (attempt <= DEFAULT_RETRY_CONFIG.max_attempts) {
        try {
          result = await stepHandler(context);
          
          if (result.success) {
            // Step succeeded
            await updateRunStep(stepRecord.id, {
              status: 'SUCCEEDED',
              finished_at: new Date().toISOString(),
              duration_ms: result.duration_ms,
              metrics_json: result.metrics,
            });
            
            // Update job status
            await updateJobStatus(job_id, targetStatus);
            
            // Update context with any outputs
            if (result.outputs) {
              context = { ...context, ...result.outputs };
            }
            
            // Accumulate costs
            if (result.metrics?.tokens_used) {
              context.total_tokens += result.metrics.tokens_used as number;
            }
            if (result.metrics?.cost_usd) {
              context.total_cost_usd += result.metrics.cost_usd as number;
            }
            
            await io.logger.info(`Step completed: ${step}`, { 
              job_id, 
              step, 
              duration_ms: result.duration_ms,
            });
            
            break; // Exit retry loop on success
          } else {
            // Step failed
            const errorCode = result.error_code || ERROR_CODES.UNKNOWN_ERROR;
            
            if (isRetryableError(errorCode) && attempt < DEFAULT_RETRY_CONFIG.max_attempts) {
              // Retry with exponential backoff
              const delay = calculateRetryDelay(attempt);
              
              await io.logger.warn(`Step failed, retrying in ${delay}ms`, {
                job_id,
                step,
                attempt,
                error_code: errorCode,
              });
              
              await updateRunStep(stepRecord.id, {
                status: 'RETRYING',
                attempt: attempt + 1,
                error_code: errorCode,
                error_detail: result.error_message,
              });
              
              await io.wait(`retry-${step}-${attempt}`, delay);
              attempt++;
            } else {
              // Non-retryable error or max retries reached
              await updateRunStep(stepRecord.id, {
                status: 'FAILED',
                finished_at: new Date().toISOString(),
                duration_ms: result.duration_ms,
                error_code: errorCode,
                error_detail: result.error_message,
              });
              
              // Determine failure state based on step
              let failureStatus: JobStatus = 'FAILED';
              if (step === 'VALIDATION') {
                failureStatus = 'FAILED_VALIDATION';
              } else if (errorCode === ERROR_CODES.QUOTA_EXCEEDED) {
                failureStatus = 'BLOCKED_ENTITLEMENT';
              } else if (errorCode === ERROR_CODES.HIGH_RISK_CONTENT) {
                failureStatus = 'REQUIRES_MANUAL_REVIEW';
              } else if (errorCode === ERROR_CODES.LOW_QUALITY_TRANSCRIPT) {
                failureStatus = 'NEEDS_USER_INPUT';
              }
              
              await updateJobStatus(job_id, failureStatus, result.error_message);
              await updateRunStatus(job_run_id, 'FAILED', result.error_message);
              
              // Emit failure event
              await emitEvent({
                workspace_id,
                user_id,
                job_id,
                job_run_id,
                event_name: 'job_failed',
                properties: {
                  step,
                  error_code: errorCode,
                  error_message: result.error_message,
                },
              });
              
              await io.logger.error(`Pipeline failed at step: ${step}`, {
                job_id,
                step,
                error_code: errorCode,
                error_message: result.error_message,
              });
              
              return {
                success: false,
                failed_step: step,
                error_code: errorCode,
                error_message: result.error_message,
              };
            }
          }
        } catch (error) {
          // Unexpected error
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          await io.logger.error(`Unexpected error in step: ${step}`, {
            job_id,
            step,
            error: errorMessage,
          });
          
          if (attempt < DEFAULT_RETRY_CONFIG.max_attempts) {
            const delay = calculateRetryDelay(attempt);
            await io.wait(`retry-error-${step}-${attempt}`, delay);
            attempt++;
          } else {
            await updateRunStep(stepRecord.id, {
              status: 'FAILED',
              finished_at: new Date().toISOString(),
              error_code: ERROR_CODES.INTERNAL_ERROR,
              error_detail: errorMessage,
            });
            
            await updateJobStatus(job_id, 'FAILED', errorMessage);
            await updateRunStatus(job_run_id, 'FAILED', errorMessage);
            
            return {
              success: false,
              failed_step: step,
              error_code: ERROR_CODES.INTERNAL_ERROR,
              error_message: errorMessage,
            };
          }
        }
      }
    }
    
    // All steps completed successfully
    await updateJobStatus(job_id, 'STORED');
    await updateJobStatus(job_id, 'ANALYTICS_LOGGED');
    await updateRunStatus(job_run_id, 'SUCCEEDED');
    
    // Emit completion event
    await emitEvent({
      workspace_id,
      user_id,
      job_id,
      job_run_id,
      event_name: 'job_completed',
      properties: {
        total_tokens: context.total_tokens,
        total_cost_usd: context.total_cost_usd,
        artifact_ids: context.artifact_ids,
      },
    });
    
    await io.logger.info('Video processing completed successfully', {
      job_id,
      job_run_id,
      total_tokens: context.total_tokens,
      total_cost_usd: context.total_cost_usd,
    });
    
    return {
      success: true,
      job_id,
      job_run_id,
      total_tokens: context.total_tokens,
      total_cost_usd: context.total_cost_usd,
      artifact_ids: context.artifact_ids,
    };
  },
});

/**
 * Export job for registration
 */
export default processVideoJob;

