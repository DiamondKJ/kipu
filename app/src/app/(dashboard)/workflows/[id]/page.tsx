import { ArrowLeft, ArrowRight, Play, Plus, Settings, Trash2, Zap } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/server';


type PageProps = {
  params: Promise<{ id: string }>;
}

export default async function WorkflowEditorPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: workflow } = await supabase
    .from('workflows')
    .select(`
      *,
      trigger_connection:connections!trigger_connection_id(
        id,
        platform,
        platform_username,
        platform_display_name,
        platform_avatar_url
      ),
      workflow_steps(
        id,
        step_order,
        step_type,
        config,
        target_connection:connections!target_connection_id(
          id,
          platform,
          platform_username,
          platform_display_name,
          platform_avatar_url
        )
      )
    `)
    .eq('id', id)
    .single();

  if (!workflow) {
    notFound();
  }

  const sortedSteps = workflow.workflow_steps?.sort(
    (a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order
  ) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/workflows">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{workflow.name}</h1>
            {workflow.description ? <p className="text-zinc-400">{workflow.description}</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">
              {workflow.is_active ? 'Active' : 'Inactive'}
            </span>
            <Switch
              checked={workflow.is_active}
              className="data-[state=checked]:bg-teal-500"
            />
          </div>
          <Button variant="outline" className="border-zinc-700">
            <Play className="h-4 w-4 mr-2" />
            Run Now
          </Button>
          <Button variant="outline" size="icon" className="border-zinc-700">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Workflow Flow */}
      <div className="space-y-4">
        {/* Trigger */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-zinc-500 font-normal uppercase tracking-wide">
                Trigger
              </CardTitle>
              <Badge variant="outline" className="border-teal-500/50 text-teal-400">
                When new post
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {workflow.trigger_connection ? (
              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-teal-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {workflow.trigger_connection.platform_display_name ||
                        workflow.trigger_connection.platform_username}
                    </p>
                    <p className="text-sm text-zinc-500">
                      @{workflow.trigger_connection.platform_username} on{' '}
                      {workflow.trigger_connection.platform}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-zinc-400">
                  Change
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed border-zinc-700 text-zinc-400"
              >
                <Plus className="h-4 w-4 mr-2" />
                Select trigger account
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <ArrowRight className="h-4 w-4 text-zinc-500 rotate-90" />
          </div>
        </div>

        {/* Actions */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-zinc-500 font-normal uppercase tracking-wide">
                Actions
              </CardTitle>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                {sortedSteps.length} step{sortedSteps.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedSteps.map((step: {
              id: string;
              step_order: number;
              step_type: string;
              config: Record<string, unknown>;
              target_connection?: {
                id: string;
                platform: string;
                platform_username: string;
                platform_display_name: string;
              };
            }, index: number) => (
              <div key={step.id}>
                <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 group">
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-300">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {step.step_type === 'publish' ? 'Publish to' : null}
                        {step.step_type === 'ai_rewrite' ? 'AI Rewrite' : null}
                        {step.step_type === 'delay' ? 'Wait' : null}
                        {step.target_connection ? <span className="text-teal-400 ml-1">
                            {step.target_connection.platform}
                          </span> : null}
                      </p>
                      {step.target_connection ? <p className="text-sm text-zinc-500">
                          @{step.target_connection.platform_username}
                        </p> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {index < sortedSteps.length - 1 ? <div className="flex justify-center py-2">
                    <div className="h-4 w-0.5 bg-zinc-700" />
                  </div> : null}
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add action
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Execution History */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-zinc-500">No executions yet</p>
            <p className="text-sm text-zinc-600 mt-1">
              Executions will appear here once the workflow runs
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
