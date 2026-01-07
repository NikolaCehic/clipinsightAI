/**
 * Jobs API Route
 * POST /api/jobs - Create a new job
 * GET /api/jobs - List jobs for workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { createJob, createJobRun } from '@/lib/jobs/state-machine';
import { emitJobCreated } from '@/lib/analytics/events';
import { triggerClient } from '@/trigger/client';
import type { CreateJobInput, JobSourceType } from '@/types';

/**
 * GET /api/jobs - List jobs for the user's workspace
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get workspace (for now, get first workspace user is member of)
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership) {
      // Return empty list if no workspace
      return NextResponse.json({ jobs: [], total: 0 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status');

    // Build query
    let query = supabaseAdmin
      .from('jobs')
      .select('*, job_runs(id, status, created_at)', { count: 'exact' })
      .eq('workspace_id', membership.workspace_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, count, error } = await query;

    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    return NextResponse.json({
      jobs: jobs || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Jobs GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/jobs - Create a new job
 */
export async function POST(request: NextRequest) {
  try {
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

    // Get workspace
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const {
      source_type,
      source_url,
      source_filename,
      language = 'en',
      brand_preset_id,
      custom_contract,
    } = body;

    // Validate source_type
    if (!['UPLOAD', 'YOUTUBE_URL', 'OTHER_URL'].includes(source_type)) {
      return NextResponse.json(
        { error: 'Invalid source_type. Must be UPLOAD, YOUTUBE_URL, or OTHER_URL' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (source_type === 'YOUTUBE_URL' && !source_url) {
      return NextResponse.json(
        { error: 'source_url is required for YOUTUBE_URL source type' },
        { status: 400 }
      );
    }

    if (source_type === 'UPLOAD' && !source_filename) {
      return NextResponse.json(
        { error: 'source_filename is required for UPLOAD source type' },
        { status: 400 }
      );
    }

    // Create job input
    const jobInput: CreateJobInput = {
      workspace_id: membership.workspace_id,
      user_id: user.id,
      source_type: source_type as JobSourceType,
      source_url,
      source_filename,
      language,
      brand_preset_id,
      custom_contract,
    };

    // Create job
    const job = await createJob(jobInput);

    // Create initial run
    const run = await createJobRun({
      job_id: job.id,
      trigger: 'USER_CREATE',
      contract_overrides: custom_contract,
    });

    // Emit event
    await emitJobCreated(membership.workspace_id, user.id, job.id, {
      source_type: job.source_type,
      language: job.language,
    });

    // Trigger processing job (if Trigger.dev is configured)
    try {
      await triggerClient.sendEvent({
        name: 'video.process',
        payload: {
          job_id: job.id,
          job_run_id: run.id,
          workspace_id: membership.workspace_id,
          user_id: user.id,
        },
      });
    } catch (triggerError) {
      // Log but don't fail - job is created, can be retried
      console.error('Failed to trigger job processing:', triggerError);
    }

    return NextResponse.json({
      job,
      run,
      message: 'Job created and processing started',
    }, { status: 201 });
  } catch (error) {
    console.error('Jobs POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    );
  }
}

