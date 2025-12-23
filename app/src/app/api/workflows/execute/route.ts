import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { crossPostVideo } from '@/lib/platforms';
import type { Workflow, WorkflowStep, PublishConfig, Connection } from '@/types';

interface ExecuteWorkflowRequest {
  workflowId: string;
  triggerData: {
    videoUrl: string;
    caption: string;
    platformPostId?: string;
    platformUrl?: string;
  };
}

interface StepResult {
  stepId: string;
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
}

/**
 * POST /api/workflows/execute
 * Execute a workflow with trigger data
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ExecuteWorkflowRequest = await request.json();

    if (!body.workflowId) {
      return NextResponse.json(
        { error: 'workflowId is required' },
        { status: 400 }
      );
    }

    if (!body.triggerData?.videoUrl) {
      return NextResponse.json(
        { error: 'triggerData.videoUrl is required' },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();

    // Get workflow with steps
    const { data: workflow, error: workflowError } = await serviceClient
      .from('workflows')
      .select('*, teams!inner(owner_id)')
      .eq('id', body.workflowId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check user has access
    if (workflow.teams.owner_id !== user.id) {
      const { data: membership } = await serviceClient
        .from('team_members')
        .select('role')
        .eq('team_id', workflow.team_id)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to this workflow' },
          { status: 403 }
        );
      }
    }

    // Get workflow steps
    const { data: steps, error: stepsError } = await serviceClient
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', body.workflowId)
      .order('order_index', { ascending: true });

    if (stepsError) {
      return NextResponse.json(
        { error: 'Failed to get workflow steps' },
        { status: 500 }
      );
    }

    if (!steps || steps.length === 0) {
      return NextResponse.json(
        { error: 'Workflow has no steps' },
        { status: 400 }
      );
    }

    // Create workflow run record
    const { data: workflowRun, error: runError } = await serviceClient
      .from('workflow_runs')
      .insert({
        workflow_id: body.workflowId,
        status: 'running',
        trigger_data: body.triggerData,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError || !workflowRun) {
      return NextResponse.json(
        { error: 'Failed to create workflow run' },
        { status: 500 }
      );
    }

    // Execute each step
    const results: StepResult[] = [];
    let currentCaption = body.triggerData.caption;

    for (const step of steps as WorkflowStep[]) {
      const stepResult = await executeStep(
        step,
        workflow.trigger_connection_id,
        body.triggerData.videoUrl,
        currentCaption,
        serviceClient,
        workflowRun.id
      );

      results.push(stepResult);

      // Log step result
      await serviceClient.from('workflow_step_runs').insert({
        run_id: workflowRun.id,
        step_id: step.id,
        status: stepResult.success ? 'completed' : 'failed',
        input_data: {
          videoUrl: body.triggerData.videoUrl,
          caption: currentCaption,
        },
        output_data: {
          platformPostId: stepResult.platformPostId,
          platformUrl: stepResult.platformUrl,
        },
        error: stepResult.error || null,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });

      // If step failed and it's critical, stop execution
      if (!stepResult.success) {
        break;
      }
    }

    // Update workflow run status
    const allSuccessful = results.every((r) => r.success);
    await serviceClient
      .from('workflow_runs')
      .update({
        status: allSuccessful ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        error: allSuccessful
          ? null
          : results.find((r) => !r.success)?.error || 'Unknown error',
      })
      .eq('id', workflowRun.id);

    return NextResponse.json({
      success: allSuccessful,
      runId: workflowRun.id,
      results,
    });
  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Workflow execution failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Execute a single workflow step
 */
async function executeStep(
  step: WorkflowStep,
  triggerConnectionId: string,
  videoUrl: string,
  caption: string,
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  runId: string
): Promise<StepResult> {
  try {
    if (step.step_type === 'publish') {
      const config = step.config as PublishConfig;

      if (!step.target_connection_id) {
        return {
          stepId: step.id,
          success: false,
          error: 'No target connection specified',
        };
      }

      // Get target connection
      const { data: targetConnection } = await supabase
        .from('connections')
        .select('*')
        .eq('id', step.target_connection_id)
        .single();

      if (!targetConnection) {
        return {
          stepId: step.id,
          success: false,
          error: 'Target connection not found',
        };
      }

      // Determine caption to use
      const postCaption = config.use_original_caption
        ? caption
        : config.custom_caption || caption;

      // Build platform-specific options
      const youtubeOptions = config.youtube
        ? {
            title: postCaption.split('\n')[0]?.slice(0, 100) || 'Video',
            description: postCaption,
            privacy: config.youtube.privacy,
            tags: config.youtube.tags,
            categoryId: String(config.youtube.category_id),
          }
        : undefined;

      const linkedinOptions = config.linkedin
        ? {
            visibility: config.linkedin.visibility,
          }
        : undefined;

      // Cross-post the video
      const result = await crossPostVideo({
        sourceConnectionId: triggerConnectionId,
        targetConnectionId: step.target_connection_id,
        sourceVideoUrl: videoUrl,
        sourceCaption: caption,
        customCaption: postCaption,
        youtubeOptions,
        linkedinOptions,
      });

      // Log the published post
      if (result.success) {
        await supabase.from('posts').insert({
          team_id: targetConnection.team_id,
          workflow_run_id: runId,
          connection_id: step.target_connection_id,
          platform: targetConnection.platform,
          platform_post_id: result.platformPostId,
          content_type: 'video',
          caption: postCaption,
          media_urls: [videoUrl],
          status: 'published',
          published_at: new Date().toISOString(),
          metadata: {
            workflowStepId: step.id,
            platformUrl: result.platformUrl,
          },
        });
      }

      return {
        stepId: step.id,
        success: result.success,
        platformPostId: result.platformPostId,
        platformUrl: result.platformUrl,
        error: result.error,
      };
    } else if (step.step_type === 'delay') {
      // For now, delays are not implemented in synchronous execution
      // In production, this would schedule the next step
      return {
        stepId: step.id,
        success: true,
      };
    } else if (step.step_type === 'ai_rewrite') {
      // AI rewrite would transform the caption
      // For now, pass through unchanged
      return {
        stepId: step.id,
        success: true,
      };
    }

    return {
      stepId: step.id,
      success: false,
      error: `Unknown step type: ${step.step_type}`,
    };
  } catch (error) {
    return {
      stepId: step.id,
      success: false,
      error: error instanceof Error ? error.message : 'Step execution failed',
    };
  }
}
