'use client';

import { Loader2, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

type WorkflowControlsProps = {
  workflowId: string;
  isActive: boolean;
}

export function WorkflowControls({ workflowId, isActive }: WorkflowControlsProps) {
  const [active, setActive] = useState(isActive);
  const [toggling, setToggling] = useState(false);
  const [running, setRunning] = useState(false);
  const router = useRouter();

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: checked }),
      });

      if (res.ok) {
        setActive(checked);
        router.refresh();
      } else {
        const data = await res.json();
        console.error('Failed to toggle workflow:', data.error);
      }
    } catch (err) {
      console.error('Failed to toggle workflow:', err);
    } finally {
      setToggling(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        console.error('Failed to run workflow:', data.error);
        alert(data.error || 'Failed to run workflow');
      }
    } catch (err) {
      console.error('Failed to run workflow:', err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500">
          {active ? 'Active' : 'Inactive'}
        </span>
        <Switch
          checked={active}
          onCheckedChange={handleToggle}
          disabled={toggling}
          className="data-[state=checked]:bg-teal-500"
        />
      </div>
      <Button
        variant="outline"
        className="border-zinc-700"
        onClick={handleRunNow}
        disabled={running}
      >
        {running ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Play className="h-4 w-4 mr-2" />
        )}
        {running ? 'Running...' : 'Run Now'}
      </Button>
    </div>
  );
}
