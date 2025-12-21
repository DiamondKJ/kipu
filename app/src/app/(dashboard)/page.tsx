import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Workflow, Calendar, TrendingUp } from 'lucide-react';

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
      title: 'Connected Accounts',
      value: connectionsCount || 0,
      icon: Users,
      color: 'text-teal-400',
    },
    {
      title: 'Active Workflows',
      value: workflowsCount || 0,
      icon: Workflow,
      color: 'text-purple-400',
    },
    {
      title: 'Posts Published',
      value: postsCount || 0,
      icon: Calendar,
      color: 'text-blue-400',
    },
    {
      title: 'Total Reach',
      value: '0',
      icon: TrendingUp,
      color: 'text-green-400',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back{user?.user_metadata?.name ? `, ${user.user_metadata.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-zinc-400 mt-1">
          Here&apos;s what&apos;s happening with your social accounts
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Connect Account</h3>
                  <p className="text-sm text-zinc-400">Link a new social platform</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Workflow className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Create Workflow</h3>
                  <p className="text-sm text-zinc-400">Automate your content</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Schedule Post</h3>
                  <p className="text-sm text-zinc-400">Plan your content</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="text-center py-8 text-zinc-500">
              <p>No recent activity</p>
              <p className="text-sm mt-1">Connect an account to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
