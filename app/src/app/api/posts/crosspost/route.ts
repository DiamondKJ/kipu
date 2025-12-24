import { type NextRequest, NextResponse } from 'next/server';

import { postToConnection } from '@/lib/platforms/crosspost';
import { createClient, createServiceClient } from '@/lib/supabase/server';

type PostRequestBody = {
  targetConnectionId: string;
  videoUrl: string;
  caption?: string;
  youtubeOptions?: {
    title?: string;
    description?: string;
    privacy?: 'public' | 'unlisted' | 'private';
    tags?: string[];
    categoryId?: string;
  };
  linkedinOptions?: {
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  };
}

/**
 * POST /api/posts/crosspost
 * Post a video to a connected platform
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PostRequestBody = await request.json();

    // Validate required fields
    if (!body.targetConnectionId) {
      return NextResponse.json(
        { error: 'targetConnectionId is required' },
        { status: 400 }
      );
    }

    if (!body.videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl is required' },
        { status: 400 }
      );
    }

    // Verify user has access to the connection
    const serviceClient = createServiceClient();

    const { data: connection, error: connectionError } = await serviceClient
      .from('connections')
      .select('*')
      .eq('id', body.targetConnectionId)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Check user owns this connection (team_id = user.id for MVP)
    if (connection.team_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Post to the platform
    const result = await postToConnection({
      connectionId: body.targetConnectionId,
      videoUrl: body.videoUrl,
      caption: body.caption || '',
      youtubeOptions: body.youtubeOptions,
      linkedinOptions: body.linkedinOptions,
    });

    // Log post and activity if successful
    if (result.success) {
      // Insert the post record (using actual schema fields)
      await serviceClient.from('posts').insert({
        team_id: connection.team_id,
        connection_id: body.targetConnectionId,
        platform: connection.platform,
        platform_post_id: result.platformPostId,
        content_type: 'video',
        caption: body.caption || body.youtubeOptions?.title || '',
        media_urls: [body.videoUrl],
        status: 'published',
        published_at: new Date().toISOString(),
        metadata: {
          title: body.youtubeOptions?.title,
          platformUrl: result.platformUrl,
          youtubeOptions: body.youtubeOptions,
          linkedinOptions: body.linkedinOptions,
        },
      });

      // Log activity
      await serviceClient.from('activity_log').insert({
        team_id: connection.team_id,
        activity_type: 'cross_post_completed',
        target_platform: connection.platform,
        target_connection_id: body.targetConnectionId,
        content_title: body.youtubeOptions?.title || body.caption?.slice(0, 100) || 'Video post',
        content_preview: body.caption?.slice(0, 200),
        target_url: result.platformUrl,
        metadata: {
          videoUrl: body.videoUrl,
          platformPostId: result.platformPostId,
        },
      });
    } else {
      // Log failed activity
      await serviceClient.from('activity_log').insert({
        team_id: connection.team_id,
        activity_type: 'cross_post_failed',
        target_platform: connection.platform,
        target_connection_id: body.targetConnectionId,
        content_title: body.youtubeOptions?.title || body.caption?.slice(0, 100) || 'Video post',
        error_message: result.error,
        metadata: {
          videoUrl: body.videoUrl,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Post error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Post failed' },
      { status: 500 }
    );
  }
}
