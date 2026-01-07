/**
 * Delivery Step Handler
 * Finalizes artifacts and prepares them for user access
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { PipelineContext, StepResult } from '@/types';
import { ERROR_CODES } from '@/types';

/**
 * Finalize and deliver artifacts
 */
export async function deliverArtifacts(context: PipelineContext): Promise<StepResult> {
  const startTime = Date.now();
  
  try {
    const { job, job_run, workspace_id } = context;
    
    // Get all artifacts for this run
    const { data: artifacts, error: fetchError } = await supabaseAdmin
      .from('artifacts')
      .select('*, artifact_reviews(*)')
      .eq('job_run_id', job_run.id);
    
    if (fetchError || !artifacts?.length) {
      return {
        success: false,
        step: 'DELIVERY',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INVALID_INPUT,
        error_message: 'No artifacts found for delivery',
      };
    }
    
    // Update all approved artifacts to APPROVED status
    const approvedArtifacts = artifacts.filter(a => 
      a.status === 'REVIEWED_OK' || a.status === 'APPROVED'
    );
    
    if (approvedArtifacts.length === 0) {
      return {
        success: false,
        step: 'DELIVERY',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INTERNAL_ERROR,
        error_message: 'No approved artifacts to deliver',
      };
    }
    
    // Update artifact statuses to APPROVED (ready for user)
    const artifactIds = approvedArtifacts.map(a => a.id);
    
    const { error: updateError } = await supabaseAdmin
      .from('artifacts')
      .update({ status: 'APPROVED' })
      .in('id', artifactIds);
    
    if (updateError) {
      return {
        success: false,
        step: 'DELIVERY',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INTERNAL_ERROR,
        error_message: `Failed to update artifact status: ${updateError.message}`,
      };
    }
    
    // Update daily usage
    const videoDurationMinutes = Math.ceil((job.video_duration_sec || 0) / 60);
    
    await supabaseAdmin.rpc('increment_daily_usage', {
      p_workspace_id: workspace_id,
      p_jobs: 1,
      p_minutes: videoDurationMinutes,
      p_tokens: context.total_tokens,
      p_cost: context.total_cost_usd,
    });
    
    // Create summary of delivered artifacts
    const deliveredSummary = approvedArtifacts.map(a => ({
      id: a.id,
      type: a.type,
      title: a.title,
      word_count: a.word_count,
      status: 'APPROVED',
    }));
    
    return {
      success: true,
      step: 'DELIVERY',
      duration_ms: Date.now() - startTime,
      outputs: {
        delivered_artifacts: deliveredSummary,
      },
      metrics: {
        artifacts_delivered: approvedArtifacts.length,
        total_artifacts: artifacts.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      step: 'DELIVERY',
      duration_ms: Date.now() - startTime,
      error_code: ERROR_CODES.INTERNAL_ERROR,
      error_message: error instanceof Error ? error.message : 'Delivery failed',
    };
  }
}

/**
 * Get delivered artifacts for a job
 */
export async function getDeliveredArtifacts(jobId: string): Promise<{
  artifacts: Array<{
    id: string;
    type: string;
    title: string | null;
    content_text: string | null;
    content_preview: string | null;
    word_count: number | null;
    created_at: string;
  }>;
  job_run_id: string | null;
}> {
  // Get latest successful run
  const { data: latestRun } = await supabaseAdmin
    .from('job_runs')
    .select('id')
    .eq('job_id', jobId)
    .eq('status', 'SUCCEEDED')
    .order('run_number', { ascending: false })
    .limit(1)
    .single();
  
  if (!latestRun) {
    return { artifacts: [], job_run_id: null };
  }
  
  // Get artifacts
  const { data: artifacts } = await supabaseAdmin
    .from('artifacts')
    .select('id, type, title, content_text, content_preview, word_count, created_at')
    .eq('job_run_id', latestRun.id)
    .eq('status', 'APPROVED');
  
  return {
    artifacts: artifacts || [],
    job_run_id: latestRun.id,
  };
}

/**
 * Export artifact to various formats
 */
export async function exportArtifact(
  artifactId: string,
  format: 'markdown' | 'html' | 'text'
): Promise<{ content: string; filename: string } | null> {
  const { data: artifact } = await supabaseAdmin
    .from('artifacts')
    .select('*')
    .eq('id', artifactId)
    .single();
  
  if (!artifact?.content_text) {
    return null;
  }
  
  const baseFilename = `${artifact.type.toLowerCase()}_${artifact.id.slice(0, 8)}`;
  
  switch (format) {
    case 'markdown':
      return {
        content: artifact.content_text,
        filename: `${baseFilename}.md`,
      };
    
    case 'html':
      // Simple markdown to HTML conversion
      const html = convertMarkdownToHtml(artifact.content_text);
      return {
        content: html,
        filename: `${baseFilename}.html`,
      };
    
    case 'text':
      // Strip markdown formatting
      const text = stripMarkdown(artifact.content_text);
      return {
        content: text,
        filename: `${baseFilename}.txt`,
      };
    
    default:
      return null;
  }
}

/**
 * Simple markdown to HTML conversion
 */
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Bullet lists
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags
  html = `<p>${html}</p>`;
  
  // Wrap lists
  html = html.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Export</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1, h2, h3 { color: #333; }
    p { line-height: 1.6; }
    ul { padding-left: 1.5rem; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
}

/**
 * Strip markdown formatting
 */
function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^- /gm, '• ')
    .replace(/^> /gm, '')
    .trim();
}

