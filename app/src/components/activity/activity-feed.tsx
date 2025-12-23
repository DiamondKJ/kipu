'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Zap,
  Video,
  Link2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: string;
  createdAt: string;
  sourcePlatform: string | null;
  targetPlatform: string | null;
  sourceConnection: {
    id: string;
    platform: string;
    platform_username: string;
    platform_display_name: string;
    platform_avatar_url: string | null;
  } | null;
  targetConnection: {
    id: string;
    platform: string;
    platform_username: string;
    platform_display_name: string;
    platform_avatar_url: string | null;
  } | null;
  workflow: {
    id: string;
    name: string;
  } | null;
  content: {
    title: string | null;
    preview: string | null;
    thumbnailUrl: string | null;
    sourceUrl: string | null;
    targetUrl: string | null;
  };
  error: string | null;
  metadata: Record<string, unknown>;
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  instagram: '#E4405F',
  twitter: '#1DA1F2',
  tiktok: '#000000',
  facebook: '#1877F2',
  threads: '#000000',
};

const ACTIVITY_ICONS: Record<string, typeof Video> = {
  content_detected: Video,
  cross_post_started: ArrowRight,
  cross_post_completed: CheckCircle2,
  cross_post_failed: XCircle,
  workflow_triggered: Zap,
  connection_added: Link2,
  connection_removed: XCircle,
};

const ACTIVITY_LABELS: Record<string, string> = {
  content_detected: 'New content detected',
  cross_post_started: 'Cross-post started',
  cross_post_completed: 'Cross-post completed',
  cross_post_failed: 'Cross-post failed',
  workflow_triggered: 'Workflow triggered',
  connection_added: 'Account connected',
  connection_removed: 'Account disconnected',
};

interface ActivityFeedProps {
  limit?: number;
  showRefresh?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function ActivityFeed({
  limit = 10,
  showRefresh = true,
  className,
  emptyMessage = 'No activity yet',
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`/api/activity?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity');
      }

      const data = await response.json();
      setActivities(data.activities);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActivities(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchActivities]);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-[#9AA3B2]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-8 text-[#9AA3B2]', className)}>
        <p>{error}</p>
        <button
          onClick={() => fetchActivities()}
          className="mt-2 text-sm text-[#4FD1C5] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#0B1020] flex items-center justify-center">
          <Zap className="h-8 w-8 text-[#9AA3B2]" />
        </div>
        <p className="text-[#9AA3B2]">{emptyMessage}</p>
        <p className="text-sm text-[#9AA3B2]/60 mt-1">
          Activity will appear here when content is detected or cross-posted
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {showRefresh && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => fetchActivities(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm text-[#9AA3B2] hover:text-[#E6E8EF] transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const Icon = ACTIVITY_ICONS[activity.type] || Zap;
  const label = ACTIVITY_LABELS[activity.type] || activity.type;
  const isError = activity.type === 'cross_post_failed';
  const isSuccess = activity.type === 'cross_post_completed';

  const sourceColor = activity.sourcePlatform
    ? PLATFORM_COLORS[activity.sourcePlatform] || '#9AA3B2'
    : '#9AA3B2';
  const targetColor = activity.targetPlatform
    ? PLATFORM_COLORS[activity.targetPlatform] || '#9AA3B2'
    : '#9AA3B2';

  return (
    <div
      className={cn(
        'group relative flex gap-4 p-4 rounded-lg transition-all',
        'bg-[#0B1020]/50 hover:bg-[#0B1020] border border-transparent hover:border-[#1a1f35]'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          isError && 'bg-red-500/10',
          isSuccess && 'bg-green-500/10',
          !isError && !isSuccess && 'bg-[#E6C27A]/10'
        )}
      >
        <Icon
          className={cn(
            'h-5 w-5',
            isError && 'text-red-400',
            isSuccess && 'text-green-400',
            !isError && !isSuccess && 'text-[#E6C27A]'
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-[#E6E8EF]">{label}</span>

          {/* Platform badges */}
          {activity.sourcePlatform && (
            <span
              className="px-2 py-0.5 text-xs rounded-full text-white"
              style={{ backgroundColor: sourceColor }}
            >
              {activity.sourcePlatform}
            </span>
          )}

          {activity.targetPlatform && (
            <>
              <ArrowRight className="h-3 w-3 text-[#9AA3B2]" />
              <span
                className="px-2 py-0.5 text-xs rounded-full text-white"
                style={{ backgroundColor: targetColor }}
              >
                {activity.targetPlatform}
              </span>
            </>
          )}
        </div>

        {/* Content preview */}
        {activity.content.title && (
          <p className="text-sm text-[#9AA3B2] truncate mb-1">
            {activity.content.title}
          </p>
        )}

        {/* Workflow name */}
        {activity.workflow && (
          <p className="text-xs text-[#9AA3B2]/60">
            Workflow: {activity.workflow.name}
          </p>
        )}

        {/* Error message */}
        {activity.error && (
          <p className="text-xs text-red-400 mt-1">{activity.error}</p>
        )}

        {/* Links */}
        <div className="flex gap-3 mt-2">
          {activity.content.sourceUrl && (
            <a
              href={activity.content.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#4FD1C5] hover:underline"
            >
              View source
            </a>
          )}
          {activity.content.targetUrl && (
            <a
              href={activity.content.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#4FD1C5] hover:underline"
            >
              View post
            </a>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-[#9AA3B2]/40 mt-2">
          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Thumbnail */}
      {activity.content.thumbnailUrl && (
        <div className="flex-shrink-0 w-20 h-14 rounded-md overflow-hidden bg-[#0B1020]">
          <img
            src={activity.content.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
