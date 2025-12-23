import { ArrowRight, Calendar, TrendingUp, Users, Workflow } from 'lucide-react';
import Link from 'next/link';

import { ActivityFeed } from '@/components/activity/activity-feed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get stats
  const { count: connectionsCount } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: workflowsCount } = await supabase
    .from('workflows')
    .select('*', { count: 'exact', head: true });

  const { count: postsCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  const stats = [
    {
      title: 'Connected Nodes',
      value: connectionsCount || 0,
      icon: Users,
      iconBg: 'bg-[#E6C27A]/10 group-hover:bg-[#E6C27A]/20',
      iconColor: 'text-[#E6C27A]',
      description: 'Active platform connections',
    },
    {
      title: 'Active Flows',
      value: workflowsCount || 0,
      icon: Workflow,
      iconBg: 'bg-[#4FD1C5]/10 group-hover:bg-[#4FD1C5]/20',
      iconColor: 'text-[#4FD1C5]',
      description: 'Automation workflows',
    },
    {
      title: 'Signals Sent',
      value: postsCount || 0,
      icon: Calendar,
      iconBg: 'bg-[#C48A5A]/10 group-hover:bg-[#C48A5A]/20',
      iconColor: 'text-[#C48A5A]',
      description: 'Published content',
    },
    {
      title: 'Network Reach',
      value: '0',
      icon: TrendingUp,
      iconBg: 'bg-[#E6C27A]/10 group-hover:bg-[#E6C27A]/20',
      iconColor: 'text-[#E6C27A]',
      description: 'Total audience',
    },
  ];

  const quickActions = [
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#E6E8EF] tracking-wide">
          {user?.user_metadata?.name ? `${user.user_metadata.name.split(' ')[0]}` : 'Welcome'}
        </h1>
        <p className="text-[#9AA3B2]">
          Your network at a glance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card
            key={stat.title}
            className="bg-[#0B1020]/60 border-[rgba(230,194,122,0.1)] backdrop-blur-sm shadow-[0_0_20px_rgba(230,194,122,0.05)] group"
            style={{
              animation: `metricEase 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              animationDelay: `${index * 100}ms`,
              opacity: 0
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#9AA3B2]">
                {stat.title}
              </CardTitle>
              <div className={cn('p-2 rounded-lg transition-colors', stat.iconBg)}>
                <stat.icon className={cn('h-4 w-4', stat.iconColor)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-semibold text-[#E6E8EF] tracking-tight">{stat.value}</div>
              <p className="text-xs text-[#6B7280]">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filament separator */}
      <div className="filament-separator" />

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-[#E6E8EF]">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
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
      </div>

      {/* Filament separator */}
      <div className="filament-separator" />

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-[#E6E8EF]">Signal Activity</h2>
          <Link
            href="/activity"
            className="text-sm text-[#4FD1C5] hover:underline"
          >
            View all
          </Link>
        </div>
        <Card className="bg-[#0B1020]/60 border-[rgba(230,194,122,0.1)] backdrop-blur-sm">
          <CardContent className="p-4">
            <ActivityFeed
              limit={5}
              showRefresh={false}
              emptyMessage="No signals detected yet"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
