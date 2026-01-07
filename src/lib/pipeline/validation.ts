/**
 * Validation Step Handler
 * Validates job inputs and checks entitlements
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { PipelineContext, StepResult } from '@/types';
import { ERROR_CODES } from '@/types';
import { getJob } from '@/lib/jobs/state-machine';

/**
 * Maximum video duration in seconds (10 minutes default for free tier)
 */
const MAX_VIDEO_DURATION_FREE = 600;

/**
 * Supported video MIME types
 */
const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

/**
 * YouTube URL pattern
 */
const YOUTUBE_URL_PATTERN = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;

/**
 * Validate job inputs and check entitlements
 */
export async function validateJob(context: PipelineContext): Promise<StepResult> {
  const startTime = Date.now();
  
  try {
    // Get full job details
    const job = await getJob(context.job_run.job_id);
    if (!job) {
      return {
        success: false,
        step: 'VALIDATION',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INVALID_INPUT,
        error_message: 'Job not found',
      };
    }
    
    // Update context with job
    context.job = job;
    
    // Validate source
    if (job.source_type === 'YOUTUBE_URL') {
      if (!job.source_url) {
        return {
          success: false,
          step: 'VALIDATION',
          duration_ms: Date.now() - startTime,
          error_code: ERROR_CODES.INVALID_INPUT,
          error_message: 'YouTube URL is required',
        };
      }
      
      if (!YOUTUBE_URL_PATTERN.test(job.source_url)) {
        return {
          success: false,
          step: 'VALIDATION',
          duration_ms: Date.now() - startTime,
          error_code: ERROR_CODES.INVALID_URL,
          error_message: 'Invalid YouTube URL format',
        };
      }
    } else if (job.source_type === 'UPLOAD') {
      // Check if media asset exists
      const { data: mediaAsset } = await supabaseAdmin
        .from('media_assets')
        .select('*')
        .eq('job_id', job.id)
        .eq('kind', 'VIDEO')
        .single();
      
      if (!mediaAsset) {
        return {
          success: false,
          step: 'VALIDATION',
          duration_ms: Date.now() - startTime,
          error_code: ERROR_CODES.INVALID_INPUT,
          error_message: 'No video file uploaded for this job',
        };
      }
      
      // Validate MIME type
      if (!SUPPORTED_VIDEO_TYPES.includes(mediaAsset.mime_type)) {
        return {
          success: false,
          step: 'VALIDATION',
          duration_ms: Date.now() - startTime,
          error_code: ERROR_CODES.UNSUPPORTED_FORMAT,
          error_message: `Unsupported video format: ${mediaAsset.mime_type}`,
        };
      }
      
      // Store media asset ID in context
      context.media_asset_id = mediaAsset.id;
    }
    
    // Check entitlements
    const entitlementCheck = await checkEntitlements(
      context.workspace_id,
      job.video_duration_sec
    );
    
    if (!entitlementCheck.allowed) {
      return {
        success: false,
        step: 'VALIDATION',
        duration_ms: Date.now() - startTime,
        error_code: entitlementCheck.error_code,
        error_message: entitlementCheck.error_message,
      };
    }
    
    // Load generation contract from run
    const { data: runData } = await supabaseAdmin
      .from('job_runs')
      .select('generation_contract_json')
      .eq('id', context.job_run.id)
      .single();
    
    if (runData?.generation_contract_json) {
      context.contract = runData.generation_contract_json;
    }
    
    return {
      success: true,
      step: 'VALIDATION',
      duration_ms: Date.now() - startTime,
      outputs: {
        job,
        contract: context.contract,
      },
    };
  } catch (error) {
    return {
      success: false,
      step: 'VALIDATION',
      duration_ms: Date.now() - startTime,
      error_code: ERROR_CODES.INTERNAL_ERROR,
      error_message: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Check workspace entitlements
 */
async function checkEntitlements(
  workspaceId: string,
  videoDurationSec?: number | null
): Promise<{
  allowed: boolean;
  error_code?: string;
  error_message?: string;
}> {
  // Get current entitlement
  const { data: entitlement } = await supabaseAdmin
    .from('workspace_entitlements')
    .select('*')
    .eq('workspace_id', workspaceId)
    .or('valid_until.is.null,valid_until.gt.now()')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  // If no entitlement, use free tier defaults
  const limits = entitlement || {
    jobs_per_day: 3,
    minutes_per_day: 10,
    max_video_duration_sec: MAX_VIDEO_DURATION_FREE,
  };
  
  // Check video duration
  if (videoDurationSec && videoDurationSec > limits.max_video_duration_sec) {
    return {
      allowed: false,
      error_code: ERROR_CODES.DURATION_EXCEEDED,
      error_message: `Video duration (${Math.ceil(videoDurationSec / 60)} min) exceeds limit (${Math.ceil(limits.max_video_duration_sec / 60)} min)`,
    };
  }
  
  // Get today's usage
  const today = new Date().toISOString().split('T')[0];
  const { data: usage } = await supabaseAdmin
    .from('daily_usage')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('date', today)
    .single();
  
  const currentJobs = usage?.jobs_count || 0;
  const currentMinutes = usage?.minutes_processed || 0;
  
  // Check job limit
  if (currentJobs >= limits.jobs_per_day) {
    return {
      allowed: false,
      error_code: ERROR_CODES.QUOTA_EXCEEDED,
      error_message: `Daily job limit reached (${limits.jobs_per_day} jobs/day)`,
    };
  }
  
  // Check minutes limit
  const videoMinutes = videoDurationSec ? Math.ceil(videoDurationSec / 60) : 0;
  if (currentMinutes + videoMinutes > limits.minutes_per_day) {
    return {
      allowed: false,
      error_code: ERROR_CODES.QUOTA_EXCEEDED,
      error_message: `Daily minutes limit would be exceeded (${limits.minutes_per_day} min/day)`,
    };
  }
  
  return { allowed: true };
}

