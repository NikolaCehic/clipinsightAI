import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Platform export handlers
// Note: These are placeholder implementations. In production, you would
// integrate with the actual platform APIs using their OAuth tokens.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platform } = await params;
    const { projectId, content } = await request.json();

    if (!projectId && !content) {
      return NextResponse.json(
        { error: 'Project ID or content required' },
        { status: 400 }
      );
    }

    // Fetch project if projectId provided
    let projectData = content;
    if (projectId) {
      const { data: project, error } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      projectData = project;
    }

    // Handle different platforms
    switch (platform) {
      case 'twitter': {
        // Twitter/X API integration
        // In production: Use Twitter API v2 with OAuth 2.0
        // POST https://api.twitter.com/2/tweets
        
        const twitterThread = projectData.twitter_thread || [];
        
        if (!process.env.TWITTER_API_KEY) {
          return NextResponse.json(
            { 
              error: 'Twitter API not configured',
              message: 'Please add your Twitter API credentials to publish directly.',
              fallback: 'Content copied to clipboard for manual posting.',
            },
            { status: 400 }
          );
        }

        // Mock successful publish
        console.log('Would publish thread to Twitter:', twitterThread.length, 'tweets');
        
        // Log the export
        await logExport(session.user.email, 'twitter', projectId);

        return NextResponse.json({
          success: true,
          message: `Published ${twitterThread.length} tweets to Twitter/X`,
          tweetIds: ['mock_tweet_1', 'mock_tweet_2'], // Would be real IDs in production
        });
      }

      case 'linkedin': {
        // LinkedIn API integration
        // In production: Use LinkedIn Marketing API
        // POST https://api.linkedin.com/v2/shares
        
        const linkedinPost = projectData.linkedin_post || '';
        
        if (!process.env.LINKEDIN_CLIENT_ID) {
          return NextResponse.json(
            {
              error: 'LinkedIn API not configured',
              message: 'Please add your LinkedIn API credentials to publish directly.',
              fallback: 'Content copied to clipboard for manual posting.',
            },
            { status: 400 }
          );
        }

        // Mock successful publish
        console.log('Would publish to LinkedIn:', linkedinPost.substring(0, 50) + '...');
        
        await logExport(session.user.email, 'linkedin', projectId);

        return NextResponse.json({
          success: true,
          message: 'Published to LinkedIn',
          postId: 'mock_linkedin_post_id',
        });
      }

      case 'email': {
        // Email sending integration
        // In production: Use SendGrid, Resend, or similar
        
        const newsletter = {
          subject: projectData.newsletter_subject,
          body: projectData.newsletter_body,
        };
        
        // For demo, just log and return success
        console.log('Would send newsletter:', newsletter.subject);
        
        await logExport(session.user.email, 'email', projectId);

        return NextResponse.json({
          success: true,
          message: 'Newsletter queued for sending',
          info: 'Email integration requires additional setup (SendGrid, Resend, etc.)',
        });
      }

      default:
        return NextResponse.json(
          { error: `Platform '${platform}' not supported` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export content' },
      { status: 500 }
    );
  }
}

async function logExport(userEmail: string, platform: string, projectId?: string) {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (user) {
      await supabaseAdmin.from('usage_logs').insert({
        user_id: user.id,
        action: `export_${platform}`,
        metadata: { projectId, platform },
      });
    }
  } catch (error) {
    console.warn('Failed to log export:', error);
  }
}

