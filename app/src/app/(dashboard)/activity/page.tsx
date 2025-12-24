import { ActivityFeed } from '@/components/activity/activity-feed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ActivityPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#E6E8EF] tracking-wide">
          Activity
        </h1>
        <p className="text-[#9AA3B2]">
          Track your cross-posting activity and workflow executions
        </p>
      </div>

      {/* Cross-posting Activity */}
      <Card className="bg-[#0B1020]/60 border-[rgba(230,194,122,0.1)] backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-[#E6E8EF]">
            Recent Activity
          </CardTitle>
          <p className="text-sm text-[#9AA3B2]">
            Content detection, workflow executions, and cross-posts
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <ActivityFeed limit={50} showRefresh />
        </CardContent>
      </Card>
    </div>
  );
}
