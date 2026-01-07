/**
 * Workspaces API Route
 * GET /api/workspaces - List user's workspaces
 * POST /api/workspaces - Create new workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/workspaces - List workspaces user is member of
 */
export async function GET() {
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

    // Get workspaces with membership info
    const { data: memberships, error } = await supabaseAdmin
      .from('workspace_members')
      .select(`
        role,
        workspaces (
          id,
          name,
          owner_user_id,
          settings_json,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching workspaces:', error);
      return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }

    // Transform to workspace list with role
    const workspaces = memberships?.map(m => ({
      ...(m.workspaces as object),
      role: m.role,
    })) || [];

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Workspaces GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/workspaces - Create new workspace
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

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    // Create workspace
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .insert({
        name: name.trim(),
        owner_user_id: user.id,
        settings_json: {},
      })
      .select()
      .single();

    if (workspaceError) {
      console.error('Error creating workspace:', workspaceError);
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }

    // Add creator as OWNER member
    const { error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'OWNER',
      });

    if (memberError) {
      // Rollback workspace creation
      await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id);
      console.error('Error adding workspace member:', memberError);
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }

    // Create default entitlement (free tier)
    await supabaseAdmin
      .from('workspace_entitlements')
      .insert({
        workspace_id: workspace.id,
        plan_name: 'free',
        minutes_per_day: 10,
        jobs_per_day: 3,
        max_video_duration_sec: 600,
        allowed_formats: ['NEWSLETTER', 'BLOG', 'TWITTER_THREAD', 'LINKEDIN'],
        variants_enabled: false,
        social_publishing_enabled: false,
      });

    return NextResponse.json({
      workspace: {
        ...workspace,
        role: 'OWNER',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Workspaces POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

