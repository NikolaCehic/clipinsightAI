/**
 * Brand Presets API Route
 * GET /api/workspaces/[id]/presets - List presets
 * POST /api/workspaces/[id]/presets - Create preset
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id]/presets - List brand presets
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

    // Get presets
    const { data: presets, error } = await supabaseAdmin
      .from('brand_presets')
      .select('*')
      .eq('workspace_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
    }

    return NextResponse.json({ presets: presets || [] });
  } catch (error) {
    console.error('Presets GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/workspaces/[id]/presets - Create brand preset
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
    const { name, defaults_json, is_default } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Preset name is required' }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await supabaseAdmin
        .from('brand_presets')
        .update({ is_default: false })
        .eq('workspace_id', id);
    }

    const { data: preset, error } = await supabaseAdmin
      .from('brand_presets')
      .insert({
        workspace_id: id,
        name: name.trim(),
        defaults_json: defaults_json || {},
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 });
    }

    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    console.error('Presets POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

