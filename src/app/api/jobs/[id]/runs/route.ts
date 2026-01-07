/**
 * Job Runs API Route
 * GET /api/jobs/[id]/runs - List runs for a job
 * POST /api/jobs/[id]/runs - Create new run (regenerate)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { createJobRun, getJob, canRerun } from '@/lib/jobs/state-machine';
import { emitRegenerateClicked } from '@/lib/analytics/events';
import { triggerClient } from '@/trigger/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/jobs/[id]/runs - List runs for a job
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

    // Get job
    const job = await getJob(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('workspace_id', job.workspace_id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get runs with steps
    const { data: runs, error } = await supabaseAdmin
      .from('job_runs')
      .select('*, run_steps(*)')
      .eq('job_id', id)
      .order('run_number', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
    }

    return NextResponse.json({
      runs: runs || [],
      can_rerun: canRerun(job),
    });
  } catch (error) {
    console.error('Runs GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/jobs/[id]/runs - Create new run (regenerate)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const job = await getJob(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('workspace_id', job.workspace_id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if job can be rerun
    if (!canRerun(job)) {
      return NextResponse.json(
        { error: 'Job cannot be regenerated in current state' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { contract_overrides, artifact_type } = body;

    // Reset job status to RECEIVED
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'RECEIVED',
        status_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Create new run
    const run = await createJobRun({
      job_id: id,
      trigger: 'REGENERATE',
      contract_overrides,
    });

    // Emit event
    await emitRegenerateClicked(
      job.workspace_id,
      user.id,
      id,
      artifact_type
    );

    // Trigger processing
    try {
      await triggerClient.sendEvent({
        name: 'video.process',
        payload: {
          job_id: id,
          job_run_id: run.id,
          workspace_id: job.workspace_id,
          user_id: user.id,
        },
      });
    } catch (triggerError) {
      console.error('Failed to trigger job processing:', triggerError);
    }

    return NextResponse.json({
      run,
      message: 'Regeneration started',
    }, { status: 201 });
  } catch (error) {
    console.error('Runs POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create run' },
      { status: 500 }
    );
  }
}

