'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Workflow,
  Calendar,
  FolderOpen,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Accounts', href: '/accounts', icon: Users },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Media', href: '/media', icon: FolderOpen },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-full w-64 flex-col bg-deep-space border-r border-filament relative z-10">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-filament">
        <Link href="/" className="flex items-center gap-3 group">
          {/* Quipu-inspired logo mark */}
          <div className="relative h-9 w-9">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border border-solar-gold/30" />
            {/* Inner node */}
            <div className="absolute inset-2 rounded-full bg-solar-gold/20 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-solar-gold" />
            </div>
            {/* Orbital filament */}
            <div className="absolute -top-0.5 left-1/2 w-px h-2 bg-gradient-to-b from-solar-gold/40 to-transparent" />
            <div className="absolute -bottom-0.5 left-1/2 w-px h-2 bg-gradient-to-t from-solar-gold/40 to-transparent" />
          </div>
          <span className="text-xl font-semibold text-primary-soft tracking-wide">Kipu</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item, index) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group',
                isActive
                  ? 'bg-solar-gold/10 text-solar-gold'
                  : 'text-secondary-soft hover:text-primary-soft hover:bg-cold-slate/50'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Active indicator node */}
              {isActive && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-solar-gold" />
                  <div className="w-3 h-px bg-gradient-to-r from-solar-gold to-transparent" />
                </div>
              )}

              <item.icon className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "text-solar-gold" : "text-muted-soft group-hover:text-secondary-soft"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Filament separator */}
      <div className="mx-6 filament-separator" />

      {/* Sign out */}
      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-soft hover:text-primary-soft hover:bg-cold-slate/50 gravity-pull"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
