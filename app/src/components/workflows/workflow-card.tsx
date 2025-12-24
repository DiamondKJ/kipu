'use client';

import { MoreHorizontal, Pause, Play, Trash2, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

type WorkflowStep = {
  id: string;
  target_connection?: {
    platform: string;
  } | null;
}

type Workflow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_connection?: {
    platform: string;
    platform_username: string;
    platform_display_name: string;
  } | null;
  workflow_steps?: WorkflowStep[];
}

type WorkflowCardProps = {
  workflow: Workflow;
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete workflow');
      }

      router.refresh();
    } catch (error) {
      console.error('Delete failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete workflow');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {/* Left: Workflow Info */}
            <div className="flex items-center gap-4">
              <div
                className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                  workflow.is_active ? 'bg-teal-500/10' : 'bg-zinc-800'
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
                  <Badge variant="outline" className="text-xs border-zinc-700">
                    {workflow.trigger_connection?.platform || 'No trigger'}
                  </Badge>
                  <span className="text-zinc-600">→</span>
                  {workflow.workflow_steps?.map((step) => (
                    <Badge
                      key={step.id}
                      variant="outline"
                      className="text-xs border-zinc-700"
                    >
                      {step.target_connection?.platform}
                    </Badge>
                  ))}
                  {(!workflow.workflow_steps ||
                    workflow.workflow_steps.length === 0) && (
                    <span className="text-xs text-zinc-500">No actions</span>
                  )}
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
                  <DropdownMenuItem
                    className="text-red-400 focus:text-red-400"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-white">
              Delete workflow?
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently delete &quot;{workflow.name}&quot; and all its
              configuration. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              disabled={isDeleting}
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
