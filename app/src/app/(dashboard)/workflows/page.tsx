import { Plus, Zap } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WorkflowCard } from '@/components/workflows/workflow-card';
import { createClient } from '@/lib/supabase/server';

export default async function WorkflowsPage() {
  const supabase = await createClient();

  const { data: workflows } = await supabase
    .from('workflows')
    .select(`
      *,
      trigger_connection:connections!trigger_connection_id(
        platform,
        platform_username,
        platform_display_name
      ),
      workflow_steps(
        id,
        step_type,
        target_connection:connections!target_connection_id(
          platform,
          platform_username
        )
      )
    `)
    .order('updated_at', { ascending: false });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflows</h1>
          <p className="text-zinc-400 mt-1">
            Automate your content distribution
          </p>
        </div>
        <Button className="bg-teal-500 hover:bg-teal-600" asChild>
          <Link href="/workflows/new">
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Link>
        </Button>
      </div>

      {/* Workflows List */}
      {workflows && workflows.length > 0 ? (
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              No workflows yet
            </h3>
            <p className="text-zinc-500 mb-6 max-w-sm mx-auto">
              Create your first workflow to automatically distribute content
              across platforms
            </p>
            <Button className="bg-teal-500 hover:bg-teal-600" asChild>
              <Link href="/workflows/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
