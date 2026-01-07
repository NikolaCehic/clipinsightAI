/**
 * Workspace Detail API Route
 * GET /api/workspaces/[id] - Get workspace details
 * PATCH /api/workspaces/[id] - Update workspace
 * DELETE /api/workspaces/[id] - Delete workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id] - Get workspace details with members and entitlement
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

    // Verify user is member
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('workspace_id', id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get workspace with members
    const { data: workspace, error } = await supabaseAdmin
      .from('workspaces')
      .select(`
        *,
        workspace_members (
          user_id,
          role,
          created_at,
          users (id, email, name, image)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get entitlement
    const { data: entitlement } = await supabaseAdmin
      .from('workspace_entitlements')
      .select('*')
      .eq('workspace_id', id)
      .or('valid_until.is.null,valid_until.gt.now()')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabaseAdmin
      .from('daily_usage')
      .select('*')
      .eq('workspace_id', id)
      .eq('date', today)
      .single();

    return NextResponse.json({
      ...workspace,
      role: membership.role,
      entitlement,
      usage: usage || {
        jobs_count: 0,
        minutes_processed: 0,
        tokens_used: 0,
        cost_usd: 0,
      },
    });
  } catch (error) {
    console.error('Workspace GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/workspaces/[id] - Update workspace settings
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

    // Verify user is OWNER or ADMIN
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('workspace_id', id)
      .single();

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, settings_json } = body;

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name.trim();
    if (settings_json) updates.settings_json = settings_json;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data: workspace, error } = await supabaseAdmin
      .from('workspaces')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error('Workspace PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/workspaces/[id] - Delete workspace (OWNER only)
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

    // Verify user is OWNER
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('workspace_id', id)
      .single();

    if (!membership || membership.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only workspace owner can delete' }, { status: 403 });
    }

    // Delete workspace (cascades)
    const { error } = await supabaseAdmin
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Workspace DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

