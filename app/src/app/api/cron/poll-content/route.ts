import { type NextRequest, NextResponse } from 'next/server';

import { LinkedInService, YouTubeService } from '@/lib/platforms';
import { crossPostVideo } from '@/lib/platforms/crosspost';
import { createServiceClient } from '@/lib/supabase/server';

import type { Connection, PublishConfig, Workflow, WorkflowStep } from '@/types';

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/poll-content
 * Poll connected accounts for new content and trigger workflows
 * This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const results: PollResult[] = [];

    // Get all active connections that can be polled (YouTube and LinkedIn)
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('*')
      .eq('is_active', true)
      .in('platform', ['youtube', 'linkedin']);

    if (connectionsError || !connections) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch connections',
      });
    }

    // Poll each connection for new content
    for (const connection of connections as Connection[]) {
      const pollResult = await pollConnection(connection, supabase);
      results.push(pollResult);
    }

    // Summary
    const detected = results.reduce((sum, r) => sum + r.newContentCount, 0);
    const triggered = results.reduce((sum, r) => sum + r.workflowsTriggered, 0);

    return NextResponse.json({
      success: true,
      connectionsPolled: results.length,
      newContentDetected: detected,
      workflowsTriggered: triggered,
      results,
    });
  } catch (error) {
    console.error('Polling error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Polling failed' },
      { status: 500 }
    );
  }
}

type PollResult = {
  connectionId: string;
  platform: string;
  username: string;
  newContentCount: number;
  workflowsTriggered: number;
  errors: string[];
}

async function pollConnection(
  connection: Connection,
  supabase: Awaited<ReturnType<typeof createServiceClient>>
): Promise<PollResult> {
  const result: PollResult = {
    connectionId: connection.id,
    platform: connection.platform,
    username: connection.platform_username || 'unknown',
    newContentCount: 0,
    workflowsTriggered: 0,
    errors: [],
  };

  try {
    // Determine last poll time (schema uses last_synced_at, but type uses last_polled_at)
    const lastPolledValue = (connection as unknown as { last_synced_at?: string }).last_synced_at
      || connection.last_polled_at;
    const lastPolled = lastPolledValue
      ? new Date(lastPolledValue)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: 24 hours ago

    // Fetch new content based on platform
    let newContent: DetectedContent[] = [];

    if (connection.platform === 'youtube') {
      newContent = await pollYouTube(connection, lastPolled);
    } else if (connection.platform === 'linkedin') {
      newContent = await pollLinkedIn(connection, lastPolled);
    }

    result.newContentCount = newContent.length;

    // Process each new content item
    for (const content of newContent) {
      // Check if already tracked
      const { data: existing } = await supabase
        .from('tracked_content')
        .select('id')
        .eq('connection_id', connection.id)
        .eq('external_post_id', content.externalId)
        .single();

      if (existing) {
        continue; // Already processed
      }

      // Insert into tracked_content
      await supabase.from('tracked_content').insert({
        connection_id: connection.id,
        external_post_id: content.externalId,
        post_type: content.type,
        content_url: content.url,
        media_urls: content.mediaUrls || [],
        caption: content.caption,
        posted_at: content.publishedAt,
        processed: false,
        metadata: content.metadata || {},
      });

      // Log activity
      await supabase.from('activity_log').insert({
        team_id: connection.team_id,
        activity_type: 'content_detected',
        source_platform: connection.platform,
        source_connection_id: connection.id,
        content_title: content.title,
        content_preview: content.caption?.slice(0, 200),
        content_thumbnail_url: content.thumbnailUrl,
        source_url: content.url,
        metadata: {
          externalId: content.externalId,
          type: content.type,
        },
      });

      // Check for workflows that should be triggered
      const triggeredCount = await triggerWorkflows(connection, content, supabase);
      result.workflowsTriggered += triggeredCount;

      // Mark as processed
      await supabase
        .from('tracked_content')
        .update({ processed: true })
        .eq('connection_id', connection.id)
        .eq('external_post_id', content.externalId);
    }

    // Update last synced time
    await supabase
      .from('connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id);
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

type DetectedContent = {
  externalId: string;
  type: 'video' | 'image' | 'text';
  title: string;
  caption: string;
  url: string;
  thumbnailUrl?: string;
  mediaUrls?: string[];
  publishedAt: string;
  metadata?: Record<string, unknown>;
}

async function pollYouTube(
  connection: Connection,
  afterDate: Date
): Promise<DetectedContent[]> {
  const service = new YouTubeService(connection);
  const videos = await service.getVideosAfter(afterDate);

  return videos.map((video) => ({
    externalId: video.id,
    type: 'video' as const,
    title: video.snippet.title,
    caption: video.snippet.description,
    url: `https://youtube.com/watch?v=${video.id}`,
    thumbnailUrl: video.snippet.thumbnails?.medium?.url,
    publishedAt: video.snippet.publishedAt,
    metadata: {
      channelId: video.snippet.channelId,
      tags: video.snippet.tags,
      categoryId: video.snippet.categoryId,
    },
  }));
}

async function pollLinkedIn(
  connection: Connection,
  afterDate: Date
): Promise<DetectedContent[]> {
  const service = new LinkedInService(connection);
  const posts = await service.getPostsAfter(afterDate);

  return posts.map((post) => {
    const shareContent = post.specificContent['com.linkedin.ugc.ShareContent'];
    const text = shareContent.shareCommentary.text;
    const mediaCategory = shareContent.shareMediaCategory;

    return {
      externalId: post.id,
      type: mediaCategory === 'VIDEO' ? 'video' : mediaCategory === 'IMAGE' ? 'image' : 'text',
      title: text.slice(0, 100),
      caption: text,
      url: `https://www.linkedin.com/feed/update/${post.id}`,
      publishedAt: post.created?.time
        ? new Date(post.created.time).toISOString()
        : new Date().toISOString(),
      metadata: {
        visibility: post.visibility['com.linkedin.ugc.MemberNetworkVisibility'],
        hasMedia: mediaCategory !== 'NONE',
      },
    };
  });
}

async function triggerWorkflows(
  sourceConnection: Connection,
  content: DetectedContent,
  supabase: Awaited<ReturnType<typeof createServiceClient>>
): Promise<number> {
  // Find active workflows that use this connection as trigger
  const { data: workflows } = await supabase
    .from('workflows')
    .select('*, workflow_steps(*)')
    .eq('trigger_connection_id', sourceConnection.id)
    .eq('is_active', true)
    .eq('trigger_action', 'on_new_post');

  if (!workflows || workflows.length === 0) {
    return 0;
  }

  let triggeredCount = 0;

  for (const workflow of workflows as Array<Workflow & { workflow_steps: WorkflowStep[] }>) {
    try {
      // Create workflow run
      const { data: workflowRun } = await supabase
        .from('workflow_runs')
        .insert({
          workflow_id: workflow.id,
          status: 'running',
          trigger_data: {
            externalId: content.externalId,
            type: content.type,
            title: content.title,
            caption: content.caption,
            url: content.url,
            thumbnailUrl: content.thumbnailUrl,
          },
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!workflowRun) {continue;}

      // Log workflow triggered activity
      await supabase.from('activity_log').insert({
        team_id: sourceConnection.team_id,
        activity_type: 'workflow_triggered',
        source_platform: sourceConnection.platform,
        source_connection_id: sourceConnection.id,
        workflow_id: workflow.id,
        content_title: content.title,
        content_preview: content.caption?.slice(0, 200),
        source_url: content.url,
      });

      // Execute workflow steps
      const steps = workflow.workflow_steps.sort((a, b) =>
        (a.order_index || 0) - (b.order_index || 0)
      );

      let allStepsSuccessful = true;

      for (const step of steps) {
        if (step.step_type === 'publish' && step.target_connection_id) {
          const config = step.config as PublishConfig;

          // Get target connection
          const { data: targetConnection } = await supabase
            .from('connections')
            .select('*')
            .eq('id', step.target_connection_id)
            .single();

          if (!targetConnection) {continue;}

          // Log cross-post started
          await supabase.from('activity_log').insert({
            team_id: sourceConnection.team_id,
            activity_type: 'cross_post_started',
            source_platform: sourceConnection.platform,
            target_platform: targetConnection.platform,
            source_connection_id: sourceConnection.id,
            target_connection_id: targetConnection.id,
            workflow_id: workflow.id,
            content_title: content.title,
            source_url: content.url,
          });

          // For video content, attempt cross-post
          // Note: This requires the video URL to be downloadable
          // In practice, you'd need to store the video in your own storage first
          if (content.type === 'video') {
            const result = await crossPostVideo({
              sourceConnectionId: sourceConnection.id,
              targetConnectionId: targetConnection.id,
              sourceVideoUrl: content.url, // This won't work for YT/LinkedIn directly
              sourceCaption: content.caption,
              customCaption: config.use_original_caption ? content.caption : config.custom_caption,
              youtubeOptions: config.youtube,
              linkedinOptions: config.linkedin,
            });

            // Log result
            await supabase.from('activity_log').insert({
              team_id: sourceConnection.team_id,
              activity_type: result.success ? 'cross_post_completed' : 'cross_post_failed',
              source_platform: sourceConnection.platform,
              target_platform: targetConnection.platform,
              source_connection_id: sourceConnection.id,
              target_connection_id: targetConnection.id,
              workflow_id: workflow.id,
              content_title: content.title,
              source_url: content.url,
              target_url: result.platformUrl,
              error_message: result.error,
            });

            if (!result.success) {
              allStepsSuccessful = false;
            }
          }
        }
      }

      // Update workflow run status
      await supabase
        .from('workflow_runs')
        .update({
          status: allStepsSuccessful ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', workflowRun.id);

      // Update workflow last triggered time
      await supabase
        .from('workflows')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', workflow.id);

      triggeredCount++;
    } catch (error) {
      console.error(`Failed to trigger workflow ${workflow.id}:`, error);
    }
  }

  return triggeredCount;
}

// Also support POST for manual triggering with specific connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: connection, error } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const result = await pollConnection(connection as Connection, supabase);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Polling failed' },
      { status: 500 }
    );
  }
}
