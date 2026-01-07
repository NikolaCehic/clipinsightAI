/**
 * Artifact API Route
 * GET /api/artifacts/[id] - Get artifact content
 * GET /api/artifacts/[id]?export=markdown|html|text - Export artifact
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { exportArtifact } from '@/lib/pipeline/delivery';
import { emitArtifactViewed, emitArtifactExported, emitArtifactCopied } from '@/lib/analytics/events';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/artifacts/[id] - Get artifact details or export
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

    // Get artifact with job info for workspace verification
    const { data: artifact } = await supabaseAdmin
      .from('artifacts')
      .select(`
        *,
        artifact_reviews(*),
        job_runs!inner(
          job_id,
          jobs!inner(workspace_id)
        )
      `)
      .eq('id', id)
      .single();

    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    // Extract workspace_id from nested structure
    const workspaceId = (artifact.job_runs as { jobs: { workspace_id: string } }).jobs.workspace_id;

    // Verify user has access
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check for export format
    const searchParams = request.nextUrl.searchParams;
    const exportFormat = searchParams.get('export') as 'markdown' | 'html' | 'text' | null;

    if (exportFormat) {
      const exported = await exportArtifact(id, exportFormat);
      
      if (!exported) {
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
      }

      // Emit export event
      await emitArtifactExported(workspaceId, user.id, id, exportFormat);

      // Return file download
      const headers = new Headers();
      headers.set('Content-Type', getContentType(exportFormat));
      headers.set('Content-Disposition', `attachment; filename="${exported.filename}"`);

      return new NextResponse(exported.content, {
        status: 200,
        headers,
      });
    }

    // Emit view event
    await emitArtifactViewed(workspaceId, user.id, id, artifact.type);

    // Return artifact details (exclude nested job info)
    const { job_runs, ...artifactData } = artifact;

    return NextResponse.json({
      ...artifactData,
      workspace_id: workspaceId,
    });
  } catch (error) {
    console.error('Artifact GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/artifacts/[id] - Track copy action
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

    // Get artifact with workspace info
    const { data: artifact } = await supabaseAdmin
      .from('artifacts')
      .select(`
        type,
        job_runs!inner(
          jobs!inner(workspace_id)
        )
      `)
      .eq('id', id)
      .single();

    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    const workspaceId = (artifact.job_runs as { jobs: { workspace_id: string } }).jobs.workspace_id;

    // Parse action
    const body = await request.json();
    const { action } = body;

    if (action === 'copy') {
      await emitArtifactCopied(workspaceId, user.id, id, artifact.type);
      return NextResponse.json({ success: true, action: 'copy' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Artifact POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get content type for export format
 */
function getContentType(format: 'markdown' | 'html' | 'text'): string {
  switch (format) {
    case 'markdown':
      return 'text/markdown';
    case 'html':
      return 'text/html';
    case 'text':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

