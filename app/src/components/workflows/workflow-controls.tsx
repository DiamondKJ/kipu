'use client';

import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type WorkflowControlsProps = {
  workflowId: string;
  isActive: boolean;
}

export function WorkflowControls({ workflowId, isActive }: WorkflowControlsProps) {
  const [active, setActive] = useState(isActive);
  const [toggling, setToggling] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !active }),
      });

      if (res.ok) {
        setActive(!active);
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

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30'
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
      }`}
    >
      {toggling ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : active ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <Circle className="h-4 w-4" />
      )}
      {active ? 'Active' : 'Inactive'}
    </button>
  );
}
