import { type NextRequest, NextResponse } from 'next/server';

import { LinkedInService, YouTubeService } from '@/lib/platforms';
import { createClient, createServiceClient } from '@/lib/supabase/server';

import type { Platform } from '@/types';

type RouteParams = {
  params: Promise<{ connectionId: string }>;
}

/**
 * GET /api/connections/[connectionId]/content
 * List recent content (videos/posts) from a connected account
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { connectionId } = await params;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get connection and verify access
    const serviceClient = createServiceClient();
    const { data: connection, error: connectionError } = await serviceClient
      .from('connections')
      .select('*, teams!inner(owner_id)')
      .eq('id', connectionId)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Check user has access
    const isOwner = (connection.teams as { owner_id: string }).owner_id === user.id;
    if (!isOwner) {
      const { data: membership } = await serviceClient
        .from('team_members')
        .select('role')
        .eq('team_id', connection.team_id)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Fetch content based on platform
    const platform = connection.platform as Platform;
    let content: ContentItem[] = [];

    if (platform === 'youtube') {
      const service = new YouTubeService(connection);
      const videos = await service.listRecentVideos(limit);

      content = videos.map((video) => ({
        id: video.id,
        platform: 'youtube' as const,
        type: 'video' as const,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnailUrl: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
        publishedAt: video.snippet.publishedAt,
        url: `https://youtube.com/watch?v=${video.id}`,
        metadata: {
          channelTitle: video.snippet.channelTitle,
          tags: video.snippet.tags,
          categoryId: video.snippet.categoryId,
          privacy: video.status?.privacyStatus,
        },
      }));
    } else if (platform === 'linkedin') {
      const service = new LinkedInService(connection);
      const posts = await service.listRecentPosts(limit);

      content = posts.map((post) => {
        const shareContent = post.specificContent['com.linkedin.ugc.ShareContent'];
        const hasMedia = shareContent.shareMediaCategory !== 'NONE';
        const mediaType = shareContent.shareMediaCategory === 'VIDEO' ? 'video' :
                         shareContent.shareMediaCategory === 'IMAGE' ? 'image' : 'text';

        return {
          id: post.id,
          platform: 'linkedin' as const,
          type: mediaType,
          title: shareContent.shareCommentary.text.slice(0, 100),
          description: shareContent.shareCommentary.text,
          publishedAt: post.created?.time
            ? new Date(post.created.time).toISOString()
            : post.firstPublishedAt
              ? new Date(post.firstPublishedAt).toISOString()
              : undefined,
          url: `https://www.linkedin.com/feed/update/${post.id}`,
          metadata: {
            visibility: post.visibility['com.linkedin.ugc.MemberNetworkVisibility'],
            hasMedia,
            mediaCount: shareContent.media?.length || 0,
          },
        };
      });
    } else {
      return NextResponse.json(
        { error: `Content listing not supported for ${platform}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      connection: {
        id: connection.id,
        platform: connection.platform,
        username: connection.platform_username,
        displayName: connection.platform_display_name,
      },
      content,
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

type ContentItem = {
  id: string;
  platform: 'youtube' | 'linkedin';
  type: 'video' | 'image' | 'text';
  title: string;
  description: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  url: string;
  metadata: Record<string, unknown>;
}
