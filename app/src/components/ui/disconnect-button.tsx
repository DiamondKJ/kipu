'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Platform } from '@/types';

interface DisconnectButtonProps {
  connectionId: string;
  platform: Platform;
  displayName?: string;
}

export function DisconnectButton({
  connectionId,
  platform,
  displayName,
}: DisconnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${displayName || platform}?`)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/disconnect/${platform}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      // Refresh the page to show updated connections
      router.refresh();
    } catch (error) {
      console.error('Error disconnecting account:', error);
      alert('Failed to disconnect account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDisconnect}
      disabled={isLoading}
      className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-400"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
