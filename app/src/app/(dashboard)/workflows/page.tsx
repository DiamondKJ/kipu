import { MoreHorizontal, Pause, Play, Plus, Trash2, Zap } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
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
            <Card
              key={workflow.id}
              className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {/* Left: Workflow Info */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                        workflow.is_active
                          ? 'bg-teal-500/10'
                          : 'bg-zinc-800'
                      }`}
                    >
                      <Zap
                        className={`h-6 w-6 ${
                          workflow.is_active ? 'text-teal-400' : 'text-zinc-500'
                        }`}
                      />
                    </div>
                    <div>
                      <Link
                        href={`/workflows/${workflow.id}`}
                        className="text-lg font-medium text-white hover:text-teal-400 transition-colors"
                      >
                        {workflow.name}
                      </Link>
                      <p className="text-sm text-zinc-500">
                        {workflow.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className="text-xs border-zinc-700"
                        >
                          {workflow.trigger_connection?.platform || 'No trigger'}
                        </Badge>
                        <span className="text-zinc-600">→</span>
                        {workflow.workflow_steps?.map((step: { id: string; target_connection?: { platform: string } }) => (
                          <Badge
                            key={step.id}
                            variant="outline"
                            className="text-xs border-zinc-700"
                          >
                            {step.target_connection?.platform}
                          </Badge>
                        ))}
                        {(!workflow.workflow_steps || workflow.workflow_steps.length === 0) ? <span className="text-xs text-zinc-500">No actions</span> : null}
                      </div>
                    </div>
                  </div>

                  {/* Right: Controls */}
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

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-zinc-400 hover:text-white"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/workflows/${workflow.id}`}>
                            Edit workflow
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Play className="h-4 w-4 mr-2" />
                          Run now
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {workflow.is_active ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
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
