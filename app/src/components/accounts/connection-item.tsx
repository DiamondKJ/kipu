'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { Connection } from '@/types';

type ConnectionItemProps = {
  connection: Connection;
}

export function ConnectionItem({ connection }: ConnectionItemProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/connections/${connection.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect');
      }

      router.refresh();
    } catch (error) {
      console.error('Disconnect failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to disconnect');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 rounded-lg bg-[#1C2233]/50 border border-[rgba(230,194,122,0.05)]">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 ring-1 ring-[rgba(230,194,122,0.1)]">
            <AvatarImage src={connection.platform_avatar_url || undefined} />
            <AvatarFallback className="bg-[#1C2233] text-[#9AA3B2] text-xs">
              {connection.platform_username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-[#E6E8EF]">
              {connection.platform_display_name || connection.platform_username}
            </p>
            <p className="text-xs text-[#6B7280]">
              @{connection.platform_username}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connection.is_active ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4FD1C5]" />
              <span className="text-xs text-[#4FD1C5]">Active</span>
            </div>
          ) : (
            <Badge
              variant="outline"
              className="text-xs border-red-500/30 text-red-400"
            >
              Disconnected
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-white">
              Disconnect account?
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will remove the connection to @{connection.platform_username} on{' '}
              {connection.platform}. Any workflows using this connection will stop
              working.
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
              {isDeleting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
