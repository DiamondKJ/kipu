'use client';

import { ArrowRight, Calendar, Send, Users, Workflow } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CrossPostDialog } from '@/components/crosspost/crosspost-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Connection = {
  id: string;
  platform: string;
  platform_username: string;
  platform_display_name: string;
  platform_avatar_url: string | null;
}

const linkActions = [
  {
    title: 'Connect Node',
    description: 'Link a new platform',
    href: '/accounts',
    icon: Users,
    iconBg: 'bg-[#E6C27A]/10 group-hover:bg-[#E6C27A]/20',
    iconColor: 'text-[#E6C27A]',
  },
  {
    title: 'Create Flow',
    description: 'Automate content',
    href: '/workflows/new',
    icon: Workflow,
    iconBg: 'bg-[#4FD1C5]/10 group-hover:bg-[#4FD1C5]/20',
    iconColor: 'text-[#4FD1C5]',
  },
  {
    title: 'Schedule Signal',
    description: 'Plan your content',
    href: '/calendar',
    icon: Calendar,
    iconBg: 'bg-[#C48A5A]/10 group-hover:bg-[#C48A5A]/20',
    iconColor: 'text-[#C48A5A]',
  },
];

export function QuickActions() {
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    async function fetchConnections() {
      const supabase = createClient();
      const { data } = await supabase
        .from('connections')
        .select('id, platform, platform_username, platform_display_name, platform_avatar_url')
        .eq('is_active', true)
        .in('platform', ['youtube', 'linkedin']);

      if (data) {
        setConnections(data);
      }
    }

    void fetchConnections();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Post Video Action */}
      <CrossPostDialog
        connections={connections}
        trigger={
          <Card className="bg-[#0B1020]/60 border-[rgba(230,194,122,0.1)] backdrop-blur-sm hover:border-[rgba(230,194,122,0.3)] transition-all cursor-pointer group h-full border-dashed">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center transition-colors bg-[#E6C27A]/20 group-hover:bg-[#E6C27A]/30">
                    <Send className="h-5 w-5 text-[#E6C27A]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#E6C27A] group-hover:text-[#E6C27A] transition-colors">
                      Post Video
                    </h3>
                    <p className="text-sm text-[#6B7280]">Upload to YouTube or LinkedIn</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#E6C27A] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </CardContent>
          </Card>
        }
      />

      {/* Link Actions */}
      {linkActions.map((action) => (
        <Link key={action.title} href={action.href}>
          <Card className="bg-[#0B1020]/60 border-[rgba(230,194,122,0.1)] backdrop-blur-sm hover:border-[rgba(230,194,122,0.2)] transition-all cursor-pointer group h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center transition-colors', action.iconBg)}>
                    <action.icon className={cn('h-5 w-5', action.iconColor)} />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#E6E8EF] group-hover:text-[#E6C27A] transition-colors">{action.title}</h3>
                    <p className="text-sm text-[#6B7280]">{action.description}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#6B7280] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
