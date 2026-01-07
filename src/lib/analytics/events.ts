/**
 * Product Events Module
 * Handles event tracking for analytics
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { EventName } from '@/types';
import { EVENT_NAMES } from '@/types';

/**
 * Event payload
 */
export interface EventPayload {
  workspace_id?: string;
  user_id?: string;
  job_id?: string;
  job_run_id?: string;
  artifact_id?: string;
  event_name: string;
  properties?: Record<string, unknown>;
}

/**
 * Emit a product event
 */
export async function emitEvent(payload: EventPayload): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('product_events')
      .insert({
        workspace_id: payload.workspace_id,
        user_id: payload.user_id,
        job_id: payload.job_id,
        job_run_id: payload.job_run_id,
        artifact_id: payload.artifact_id,
        event_name: payload.event_name,
        properties_json: payload.properties || {},
      });
    
    if (error) {
      console.error('Failed to emit event:', error);
    }
  } catch (error) {
    // Don't throw - events should not break the main flow
    console.error('Error emitting event:', error);
  }
}

/**
 * Emit job created event
 */
export async function emitJobCreated(
  workspaceId: string,
  userId: string,
  jobId: string,
  properties: { source_type: string; language: string }
): Promise<void> {
  await emitEvent({
    workspace_id: workspaceId,
    user_id: userId,
    job_id: jobId,
    event_name: EVENT_NAMES.JOB_CREATED,
    properties,
  });
}

/**
 * Emit job completed event
 */
export async function emitJobCompleted(
  workspaceId: string,
  userId: string,
  jobId: string,
  jobRunId: string,
  properties: {
    duration_ms: number;
    artifact_count: number;
    total_cost_usd: number;
  }
): Promise<void> {
  await emitEvent({
    workspace_id: workspaceId,
    user_id: userId,
    job_id: jobId,
    job_run_id: jobRunId,
    event_name: EVENT_NAMES.JOB_COMPLETED,
    properties,
  });
}

/**
 * Emit artifact viewed event
 */
export async function emitArtifactViewed(
  workspaceId: string,
  userId: string,
  artifactId: string,
  artifactType: string
): Promise<void> {
  await emitEvent({
    workspace_id: workspaceId,
    user_id: userId,
    artifact_id: artifactId,
    event_name: EVENT_NAMES.ARTIFACT_VIEWED,
    properties: { artifact_type: artifactType },
  });
}

/**
 * Emit artifact copied event
 */
export async function emitArtifactCopied(
  workspaceId: string,
  userId: string,
  artifactId: string,
  artifactType: string
): Promise<void> {
  await emitEvent({
    workspace_id: workspaceId,
    user_id: userId,
    artifact_id: artifactId,
    event_name: EVENT_NAMES.ARTIFACT_COPIED,
    properties: { artifact_type: artifactType },
  });
}

/**
 * Emit artifact exported event
 */
export async function emitArtifactExported(
  workspaceId: string,
  userId: string,
  artifactId: string,
  format: string
): Promise<void> {
  await emitEvent({
    workspace_id: workspaceId,
    user_id: userId,
    artifact_id: artifactId,
    event_name: EVENT_NAMES.ARTIFACT_EXPORTED,
    properties: { format },
  });
}

/**
 * Emit regenerate clicked event
 */
export async function emitRegenerateClicked(
  workspaceId: string,
  userId: string,
  jobId: string,
  artifactType?: string
): Promise<void> {
  await emitEvent({
    workspace_id: workspaceId,
    user_id: userId,
    job_id: jobId,
    event_name: EVENT_NAMES.REGENERATE_CLICKED,
    properties: { artifact_type: artifactType },
  });
}

/**
 * Get events for a workspace
 */
export async function getWorkspaceEvents(
  workspaceId: string,
  options?: {
    event_name?: string;
    limit?: number;
    offset?: number;
  }
): Promise<Array<{
  id: string;
  event_name: string;
  properties_json: Record<string, unknown>;
  created_at: string;
}>> {
  let query = supabaseAdmin
    .from('product_events')
    .select('id, event_name, properties_json, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
  
  if (options?.event_name) {
    query = query.eq('event_name', options.event_name);
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to get events:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get aggregated analytics for a workspace
 */
export async function getWorkspaceAnalytics(
  workspaceId: string,
  dateRange: { start: string; end: string }
): Promise<{
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  total_artifacts: number;
  artifacts_copied: number;
  artifacts_exported: number;
  regenerate_count: number;
}> {
  const { data: events } = await supabaseAdmin
    .from('product_events')
    .select('event_name')
    .eq('workspace_id', workspaceId)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end);
  
  if (!events) {
    return {
      total_jobs: 0,
      completed_jobs: 0,
      failed_jobs: 0,
      total_artifacts: 0,
      artifacts_copied: 0,
      artifacts_exported: 0,
      regenerate_count: 0,
    };
  }
  
  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.event_name] = (counts[event.event_name] || 0) + 1;
  }
  
  return {
    total_jobs: counts[EVENT_NAMES.JOB_CREATED] || 0,
    completed_jobs: counts[EVENT_NAMES.JOB_COMPLETED] || 0,
    failed_jobs: counts[EVENT_NAMES.JOB_FAILED] || 0,
    total_artifacts: counts[EVENT_NAMES.ARTIFACT_VIEWED] || 0,
    artifacts_copied: counts[EVENT_NAMES.ARTIFACT_COPIED] || 0,
    artifacts_exported: counts[EVENT_NAMES.ARTIFACT_EXPORTED] || 0,
    regenerate_count: counts[EVENT_NAMES.REGENERATE_CLICKED] || 0,
  };
}

