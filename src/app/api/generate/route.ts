import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateContentFromVideo } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { videoData, mimeType, filename } = await request.json();

    if (!videoData || !mimeType) {
      return NextResponse.json(
        { error: 'Missing video data or mime type' },
        { status: 400 }
      );
    }

    // Check user credits (if using Supabase)
    try {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('credits_remaining, subscription_tier')
        .eq('email', session.user.email)
        .single();

      if (userData) {
        // Enterprise has unlimited credits (-1)
        if (userData.credits_remaining === 0 && userData.subscription_tier !== 'enterprise') {
          return NextResponse.json(
            { error: 'No credits remaining. Please upgrade your plan.' },
            { status: 403 }
          );
        }
      }
    } catch (dbError) {
      // Continue even if DB check fails (for demo purposes)
      console.warn('Could not check user credits:', dbError);
    }

    // Generate content using Gemini
    const content = await generateContentFromVideo(videoData, mimeType);

    // Deduct credit (if using Supabase)
    try {
      await supabaseAdmin.rpc('decrement_credits', { user_email: session.user.email });
    } catch (dbError) {
      console.warn('Could not decrement credits:', dbError);
    }

    // Log usage
    try {
      await supabaseAdmin.from('usage_logs').insert({
        user_id: session.user.id,
        action: 'generate_content',
        metadata: {
          filename,
          mimeType,
          project_title: content.project_title,
        },
      });
    } catch (dbError) {
      console.warn('Could not log usage:', dbError);
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
}

