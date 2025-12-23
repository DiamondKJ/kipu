import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/activity
 * Get activity feed for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
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
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const type = searchParams.get('type'); // Filter by activity type

    // Build query
    let query = supabase
      .from('activity_log')
      .select(`
        *,
        source_connection:connections!activity_log_source_connection_id_fkey(
          id, platform, platform_username, platform_display_name, platform_avatar_url
        ),
        target_connection:connections!activity_log_target_connection_id_fkey(
          id, platform, platform_username, platform_display_name, platform_avatar_url
        ),
        workflow:workflows(id, name)
      `, { count: 'exact' })
      .eq('team_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('activity_type', type);
    }

    const { data: activities, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform for frontend
    const transformedActivities = (activities || []).map((activity) => ({
      id: activity.id,
      type: activity.activity_type,
      createdAt: activity.created_at,
      sourcePlatform: activity.source_platform,
      targetPlatform: activity.target_platform,
      sourceConnection: activity.source_connection,
      targetConnection: activity.target_connection,
      workflow: activity.workflow,
      content: {
        title: activity.content_title,
        preview: activity.content_preview,
        thumbnailUrl: activity.content_thumbnail_url,
        sourceUrl: activity.source_url,
        targetUrl: activity.target_url,
      },
      error: activity.error_message,
      metadata: activity.metadata,
    }));

    return NextResponse.json({
      activities: transformedActivities,
      total: count || 0,
      hasMore: (offset + limit) < (count || 0),
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
