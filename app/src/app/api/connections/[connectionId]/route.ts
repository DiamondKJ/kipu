import { type NextRequest, NextResponse } from 'next/server';

import { createClient, createServiceClient } from '@/lib/supabase/server';

type RouteParams = {
  params: Promise<{ connectionId: string }>;
}

/**
 * DELETE /api/connections/[connectionId]
 * Delete a connection (disconnect a platform account)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const serviceClient = createServiceClient();

    // Get connection and verify ownership
    // Note: team_id in connections currently references auth.users(id) directly for MVP
    const { data: connection, error: connectionError } = await serviceClient
      .from('connections')
      .select('*')
      .eq('id', connectionId)
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

    // Check if connection is used by any workflows
    const { data: workflowsUsingConnection } = await serviceClient
      .from('workflows')
      .select('id, name')
      .eq('trigger_connection_id', connectionId);

    const { data: stepsUsingConnection } = await serviceClient
      .from('workflow_steps')
      .select('id, workflow_id')
      .eq('target_connection_id', connectionId);

    // Get unique workflow IDs from steps
    const workflowIdsFromSteps = stepsUsingConnection
      ?.map(s => s.workflow_id)
      .filter((id, index, arr) => arr.indexOf(id) === index) || [];

    const totalWorkflowsAffected = (workflowsUsingConnection?.length || 0) + workflowIdsFromSteps.length;

    if (totalWorkflowsAffected > 0) {
      // Return warning but still allow deletion
      // The workflows will become invalid but that's the user's choice
      console.warn(`Deleting connection ${connectionId} that is used by ${totalWorkflowsAffected} workflow(s)`);
    }

    // Delete connection
    const { error: deleteError } = await serviceClient
      .from('connections')
      .delete()
      .eq('id', connectionId);

    if (deleteError) {
      console.error('Failed to delete connection:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      workflowsAffected: totalWorkflowsAffected,
    });
  } catch (error) {
    console.error('Connection delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete connection' },
      { status: 500 }
    );
  }
}
