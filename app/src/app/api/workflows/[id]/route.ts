import { type NextRequest, NextResponse } from 'next/server';

import { createClient, createServiceClient } from '@/lib/supabase/server';

type RouteParams = {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/workflows/[id]
 * Update a workflow (toggle active, update name, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Get workflow and verify ownership
    const { data: workflow, error: workflowError } = await serviceClient
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check user owns this workflow (team_id = user.id for MVP)
    if (workflow.team_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update workflow
    const updates: Record<string, unknown> = {};
    if (typeof body.is_active === 'boolean') {
      updates.is_active = body.is_active;
    }
    if (typeof body.name === 'string') {
      updates.name = body.name;
    }
    if (typeof body.description === 'string') {
      updates.description = body.description;
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('workflows')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update workflow:', updateError);
      return NextResponse.json(
        { error: 'Failed to update workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflow: updated });
  } catch (error) {
    console.error('Workflow update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/[id]
 * Delete a workflow
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Get workflow and verify ownership
    // Note: team_id in workflows currently references auth.users(id) directly for MVP
    const { data: workflow, error: workflowError } = await serviceClient
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check user owns this workflow (team_id = user.id for MVP)
    if (workflow.team_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete workflow (cascade will delete workflow_steps)
    const { error: deleteError } = await serviceClient
      .from('workflows')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete workflow:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Workflow delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
