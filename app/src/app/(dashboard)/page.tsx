import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Workflow, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
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
        <h2 className="text-lg font-medium text-[#E6E8EF]">Signal Activity</h2>
        <Card className="bg-[#0B1020]/60 border-[rgba(230,194,122,0.1)] backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              {/* Empty state visualization - constellation pattern */}
              <div className="relative w-24 h-24">
                <div className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-[#E6C27A]/40" />
                <div className="absolute top-6 right-2 w-1 h-1 rounded-full bg-[#E6C27A]/30" />
                <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-[#E6C27A]/50" />
                <div className="absolute bottom-0 right-6 w-1 h-1 rounded-full bg-[#E6C27A]/20" />
                <div className="absolute top-10 left-0 w-1.5 h-1.5 rounded-full bg-[#E6C27A]/35" />

                {/* Connecting filaments */}
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <line x1="50%" y1="0" x2="20%" y2="80%" stroke="#E6C27A" strokeWidth="0.5" strokeOpacity="0.2" />
                  <line x1="50%" y1="0" x2="90%" y2="25%" stroke="#E6C27A" strokeWidth="0.5" strokeOpacity="0.15" />
                  <line x1="20%" y1="80%" x2="0" y2="42%" stroke="#E6C27A" strokeWidth="0.5" strokeOpacity="0.2" />
                </svg>
              </div>

              <div className="text-center space-y-2">
                <p className="text-[#9AA3B2]">No signals detected</p>
                <p className="text-sm text-[#6B7280]">Connect a node to begin transmission</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
