'use client';

import { Bell, Plus, Search } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/hooks/use-user';

export function Topbar() {
  const { user, profile } = useUser();

  const initials = profile?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || 'U';

  return (
    <header className="h-16 border-b border-filament bg-deep-space/80 backdrop-blur-sm px-6 flex items-center justify-between">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-soft transition-colors group-focus-within:text-solar-gold" />
          <input
            type="text"
            placeholder="Search signals..."
            className="h-9 w-64 rounded-lg bg-cold-slate/50 border border-filament pl-9 pr-4 text-sm text-primary-soft placeholder:text-muted-soft focus:outline-none focus:ring-1 focus:ring-solar-gold/50 focus:border-solar-gold/30 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-soft bg-cold-slate px-1.5 py-0.5 rounded border border-filament">
            /
          </kbd>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          className="bg-solar-gold hover:bg-solar-gold/90 text-void font-medium gravity-pull"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-soft hover:text-primary-soft hover:bg-cold-slate/50 relative"
        >
          <Bell className="h-5 w-5" />
          {/* Notification indicator node */}
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-ion-teal" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-1 ring-filament-strong hover:ring-solar-gold/30 transition-all">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || ''} />
                <AvatarFallback className="bg-cold-slate text-primary-soft text-sm">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-deep-space border-filament" align="end" forceMount>
            <div className="flex items-center gap-3 p-3">
              <Avatar className="h-10 w-10 ring-1 ring-filament">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-cold-slate text-primary-soft">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-primary-soft">{profile?.name || 'User'}</span>
                <span className="text-xs text-muted-soft">{user?.email}</span>
              </div>
            </div>
            <DropdownMenuSeparator className="bg-filament" />
            <DropdownMenuItem className="text-secondary-soft hover:text-primary-soft hover:bg-cold-slate/50 cursor-pointer">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-secondary-soft hover:text-primary-soft hover:bg-cold-slate/50 cursor-pointer">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-filament" />
            <DropdownMenuItem className="text-destructive hover:bg-destructive/10 cursor-pointer">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
