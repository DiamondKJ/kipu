import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { postToConnection, supportsPosting } from '@/lib/platforms';
import type { Platform } from '@/types';

interface PostRequestBody {
  connectionId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  // Platform-specific options
  linkedin?: {
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  };
  youtube?: {
    title: string;
    description?: string;
    privacy?: 'public' | 'unlisted' | 'private';
    tags?: string[];
    categoryId?: string;
    madeForKids?: boolean;
    notifySubscribers?: boolean;
  };
}

/**
 * POST /api/posts
 * Create a new post on a connected platform
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: PostRequestBody = await request.json();

    if (!body.connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
        { status: 400 }
      );
    }

    if (!body.text && !body.mediaUrl) {
      return NextResponse.json(
        { error: 'Either text or mediaUrl is required' },
        { status: 400 }
      );
    }

    // Verify user owns the connection
    const serviceClient = await createServiceClient();
    const { data: connection, error: connectionError } = await serviceClient
      .from('connections')
      .select('*, teams!inner(owner_id)')
      .eq('id', body.connectionId)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Check if user owns the team that owns the connection
    if (connection.teams.owner_id !== user.id) {
      // Check if user is a team member
      const { data: membership } = await serviceClient
        .from('team_members')
        .select('role')
        .eq('team_id', connection.team_id)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to this connection' },
          { status: 403 }
        );
      }
    }

    // Check if platform supports posting
    if (!supportsPosting(connection.platform as Platform)) {
      return NextResponse.json(
        { error: `Posting to ${connection.platform} is not yet supported` },
        { status: 400 }
      );
    }

    // Build platform-specific metadata
    const metadata = connection.platform === 'linkedin'
      ? body.linkedin
      : connection.platform === 'youtube'
        ? body.youtube
        : undefined;

    // Create the post
    const result = await postToConnection(body.connectionId, {
      text: body.text,
      mediaUrl: body.mediaUrl,
      mediaType: body.mediaType,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create post' },
        { status: 500 }
      );
    }

    // Log the post in our database
    await serviceClient.from('posts').insert({
      team_id: connection.team_id,
      connection_id: body.connectionId,
      platform: connection.platform,
      platform_post_id: result.platformPostId,
      content_type: body.mediaType || 'text',
      caption: body.text,
      media_urls: body.mediaUrl ? [body.mediaUrl] : [],
      status: 'published',
      published_at: new Date().toISOString(),
      metadata: {
        platformUrl: result.platformUrl,
        rawResponse: result.rawResponse,
      },
    });

    return NextResponse.json({
      success: true,
      postId: result.platformPostId,
      url: result.platformUrl,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/posts
 * List posts for the authenticated user's teams
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get user's teams
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id);

    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id);

    const teamIds = [
      ...(teams?.map((t) => t.id) || []),
      ...(memberships?.map((m) => m.team_id) || []),
    ];

    if (teamIds.length === 0) {
      return NextResponse.json({ posts: [], total: 0 });
    }

    // Build query
    let query = supabase
      .from('posts')
      .select('*, connections(platform, platform_username, platform_display_name)', { count: 'exact' })
      .in('team_id', teamIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: posts, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      posts: posts || [],
      total: count || 0,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
