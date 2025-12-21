import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export default async function CalendarPage() {
  const supabase = await createClient();

  // Get scheduled posts for the current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data: scheduledPosts } = await supabase
    .from('scheduled_posts')
    .select(`
      *,
      connection:connections(
        platform,
        platform_username
      )
    `)
    .gte('scheduled_for', startOfMonth.toISOString())
    .lte('scheduled_for', endOfMonth.toISOString())
    .order('scheduled_for', { ascending: true });

  // Generate calendar days
  const daysInMonth = endOfMonth.getDate();
  const firstDayOfWeek = startOfMonth.getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getPostsForDay = (day: number) => {
    return (scheduledPosts || []).filter((post) => {
      const postDate = new Date(post.scheduled_for);
      return postDate.getDate() === day;
    });
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
      youtube: 'bg-red-500',
      tiktok: 'bg-zinc-900',
      twitter: 'bg-zinc-900',
      linkedin: 'bg-blue-600',
      facebook: 'bg-blue-500',
      threads: 'bg-zinc-900',
    };
    return colors[platform] || 'bg-zinc-700';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Calendar</h1>
          <p className="text-zinc-400 mt-1">
            Schedule and manage your posts
          </p>
        </div>
        <Button className="bg-teal-500 hover:bg-teal-600">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Post
        </Button>
      </div>

      {/* Calendar */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              {monthNames[now.getMonth()]} {now.getFullYear()}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 border-zinc-700">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="border-zinc-700">
                Today
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 border-zinc-700">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-sm font-medium text-zinc-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-lg overflow-hidden">
            {/* Padding days */}
            {paddingDays.map((_, i) => (
              <div key={`pad-${i}`} className="bg-zinc-900/50 min-h-[100px] p-2" />
            ))}

            {/* Actual days */}
            {days.map((day) => {
              const posts = getPostsForDay(day);
              const isToday = day === now.getDate();

              return (
                <div
                  key={day}
                  className={`bg-zinc-900 min-h-[100px] p-2 ${
                    isToday ? 'ring-1 ring-teal-500 ring-inset' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm ${
                        isToday
                          ? 'h-6 w-6 rounded-full bg-teal-500 flex items-center justify-center text-white font-medium'
                          : 'text-zinc-400'
                      }`}
                    >
                      {day}
                    </span>
                    {posts.length > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs border-zinc-700 text-zinc-400"
                      >
                        {posts.length}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {posts.slice(0, 2).map((post) => (
                      <div
                        key={post.id}
                        className={`text-xs p-1 rounded ${getPlatformColor(
                          post.connection?.platform || ''
                        )} text-white truncate`}
                      >
                        {post.connection?.platform}
                      </div>
                    ))}
                    {posts.length > 2 && (
                      <div className="text-xs text-zinc-500">
                        +{posts.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Posts */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Upcoming Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledPosts && scheduledPosts.length > 0 ? (
            <div className="space-y-3">
              {scheduledPosts.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${getPlatformColor(
                        post.connection?.platform || ''
                      )}`}
                    />
                    <div>
                      <p className="text-sm text-white">
                        {post.connection?.platform} post
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(post.scheduled_for).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs border-zinc-700 text-zinc-400"
                  >
                    {post.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-zinc-500">No scheduled posts</p>
              <p className="text-sm text-zinc-600 mt-1">
                Schedule your first post to see it here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
