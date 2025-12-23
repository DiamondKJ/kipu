import { Card, CardContent } from '@/components/ui/card';
import { ActivityFeed } from '@/components/activity/activity-feed';

export default function ActivityPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#E6E8EF] tracking-wide">
          Activity
        </h1>
        <p className="text-[#9AA3B2]">
          Track content detection and cross-posting activity
        </p>
      </div>

      {/* Activity Feed */}
      <Card className="bg-[#0B1020]/60 border-[rgba(230,194,122,0.1)] backdrop-blur-sm">
        <CardContent className="p-6">
          <ActivityFeed limit={50} showRefresh={true} />
        </CardContent>
      </Card>
    </div>
  );
}
