/**
 * Job Detail API Route
 * GET /api/jobs/[id] - Get job details
 * PATCH /api/jobs/[id] - Update job
 * DELETE /api/jobs/[id] - Delete job
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getJobWithRuns, updateJobStatus, calculateProgress } from '@/lib/jobs/state-machine';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/jobs/[id] - Get job details with runs and artifacts
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get job with runs
    const job = await getJobWithRuns(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify user has access (is member of workspace)
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('workspace_id', job.workspace_id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get latest run with artifacts
    const latestRun = job.job_runs
      ?.sort((a, b) => b.run_number - a.run_number)[0];

    let artifacts = [];
    let transcript = null;
    let insightPack = null;

    if (latestRun) {
      // Get artifacts
      const { data: artifactsData } = await supabaseAdmin
        .from('artifacts')
        .select('*, artifact_reviews(*)')
        .eq('job_run_id', latestRun.id);

      artifacts = artifactsData || [];

      // Get transcript
      const { data: transcriptData } = await supabaseAdmin
        .from('transcripts')
        .select('*')
        .eq('job_run_id', latestRun.id)
        .single();

      transcript = transcriptData;

      // Get insight pack
      const { data: insightPackData } = await supabaseAdmin
        .from('insight_packs')
        .select('*')
        .eq('job_run_id', latestRun.id)
        .single();

      insightPack = insightPackData;
    }

    // Calculate progress
    const progress = calculateProgress(job.status);

    return NextResponse.json({
      ...job,
      progress,
      artifacts,
      transcript,
      insight_pack: insightPack,
    });
  } catch (error) {
    console.error('Job GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/jobs/[id] - Update job (e.g., status)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get job
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('workspace_id', job.workspace_id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { status, status_reason } = body;

    // Only allow certain status transitions from user
    const allowedUserStatuses = ['DELIVERED']; // User can mark manual review as done
    
    if (status && !allowedUserStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status transition' },
        { status: 400 }
      );
    }

    if (status) {
      const updatedJob = await updateJobStatus(id, status, status_reason);
      return NextResponse.json(updatedJob);
    }

    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  } catch (error) {
    console.error('Job PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update job' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jobs/[id] - Delete job
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get job
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify user has access (must be OWNER or ADMIN)
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('workspace_id', job.workspace_id)
      .single();

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete job (cascades to runs, artifacts, etc.)
    const { error } = await supabaseAdmin
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Job DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

