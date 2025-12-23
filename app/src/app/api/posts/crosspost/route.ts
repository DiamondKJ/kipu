import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  crossPostVideo,
  crossPostToMultiple,
  youtubeToLinkedInCaption,
  linkedInToYouTubeMetadata,
} from '@/lib/platforms/crosspost';

interface CrossPostRequestBody {
  sourceConnectionId: string;
  sourceVideoUrl: string;
  sourceCaption: string;
  // Single target
  targetConnectionId?: string;
  // Or multiple targets
  targets?: Array<{
    connectionId: string;
    customCaption?: string;
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
  }>;
  // Options for single target
  customCaption?: string;
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
 * Cross-post a video from one platform to another (or multiple)
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

    const body: CrossPostRequestBody = await request.json();

    // Validate required fields
    if (!body.sourceConnectionId) {
      return NextResponse.json(
        { error: 'sourceConnectionId is required' },
        { status: 400 }
      );
    }

    if (!body.sourceVideoUrl) {
      return NextResponse.json(
        { error: 'sourceVideoUrl is required' },
        { status: 400 }
      );
    }

    if (!body.targetConnectionId && (!body.targets || body.targets.length === 0)) {
      return NextResponse.json(
        { error: 'Either targetConnectionId or targets array is required' },
        { status: 400 }
      );
    }

    // Verify user has access to all connections
    const serviceClient = await createServiceClient();
    const connectionIds = [
      body.sourceConnectionId,
      ...(body.targetConnectionId ? [body.targetConnectionId] : []),
      ...(body.targets?.map((t) => t.connectionId) || []),
    ];

    const { data: connections, error: connectionsError } = await serviceClient
      .from('connections')
      .select('id, team_id, platform, teams!inner(owner_id)')
      .in('id', connectionIds);

    if (connectionsError || !connections) {
      return NextResponse.json(
        { error: 'Failed to verify connections' },
        { status: 500 }
      );
    }

    if (connections.length !== connectionIds.length) {
      return NextResponse.json(
        { error: 'One or more connections not found' },
        { status: 404 }
      );
    }

    // Check user has access to all connections' teams
    const teamIds = [...new Set(connections.map((c) => c.team_id))];

    for (const teamId of teamIds) {
      const connection = connections.find((c) => c.team_id === teamId) as {
        id: string;
        team_id: string;
        platform: string;
        teams: { owner_id: string };
      } | undefined;
      const isOwner = connection?.teams?.owner_id === user.id;

      if (!isOwner) {
        const { data: membership } = await serviceClient
          .from('team_members')
          .select('role')
          .eq('team_id', teamId)
          .eq('user_id', user.id)
          .single();

        if (!membership) {
          return NextResponse.json(
            { error: 'Access denied to one or more connections' },
            { status: 403 }
          );
        }
      }
    }

    // Execute cross-post
    if (body.targets && body.targets.length > 0) {
      // Multiple targets
      const results = await crossPostToMultiple(
        body.sourceConnectionId,
        body.sourceVideoUrl,
        body.sourceCaption || '',
        body.targets
      );

      // Log posts to database
      const sourceConnection = connections.find(
        (c) => c.id === body.sourceConnectionId
      );

      for (const result of results) {
        if (result.success) {
          const targetConnection = connections.find(
            (c) => c.platform === result.targetPlatform
          );

          await serviceClient.from('posts').insert({
            team_id: targetConnection?.team_id || sourceConnection?.team_id,
            connection_id: targetConnection?.id,
            platform: result.targetPlatform,
            platform_post_id: result.platformPostId,
            content_type: 'video',
            caption: body.sourceCaption,
            media_urls: [body.sourceVideoUrl],
            status: 'published',
            published_at: new Date().toISOString(),
            metadata: {
              crossPostedFrom: body.sourceConnectionId,
              sourcePlatform: result.sourceplatform,
              platformUrl: result.platformUrl,
            },
          });
        }
      }

      return NextResponse.json({
        success: results.every((r) => r.success),
        results,
      });
    } else {
      // Single target
      const result = await crossPostVideo({
        sourceConnectionId: body.sourceConnectionId,
        targetConnectionId: body.targetConnectionId!,
        sourceVideoUrl: body.sourceVideoUrl,
        sourceCaption: body.sourceCaption || '',
        customCaption: body.customCaption,
        youtubeOptions: body.youtubeOptions,
        linkedinOptions: body.linkedinOptions,
      });

      // Log post to database
      if (result.success) {
        const targetConnection = connections.find(
          (c) => c.id === body.targetConnectionId
        );

        await serviceClient.from('posts').insert({
          team_id: targetConnection?.team_id,
          connection_id: body.targetConnectionId,
          platform: result.targetPlatform,
          platform_post_id: result.platformPostId,
          content_type: 'video',
          caption: body.customCaption || body.sourceCaption,
          media_urls: [body.sourceVideoUrl],
          status: 'published',
          published_at: new Date().toISOString(),
          metadata: {
            crossPostedFrom: body.sourceConnectionId,
            sourcePlatform: result.sourceplatform,
            platformUrl: result.platformUrl,
          },
        });
      }

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Cross-post error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cross-post failed' },
      { status: 500 }
    );
  }
}
