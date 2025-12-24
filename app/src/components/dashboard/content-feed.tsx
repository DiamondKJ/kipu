'use client';

import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Loader2, RefreshCw, Video } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

type ContentItem = {
  id: string;
  platform: string;
  type: 'video' | 'image' | 'text';
  title: string;
  description: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  url: string;
  connectionId: string;
  connectionUsername: string;
}

type Post = {
  id: string;
  platform: string;
  content_type: string;
  caption: string | null;
  published_at: string | null;
  connection_id: string;
  connections: {
    platform: string;
    platform_username: string;
    platform_display_name: string;
    platform_avatar_url: string | null;
  } | null;
  metadata: {
    title?: string;
    platformUrl?: string;
    thumbnailUrl?: string;
  } | null;
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  instagram: '#E4405F',
  twitter: '#1DA1F2',
  tiktok: '#000000',
};

const PLATFORM_LOGOS: Record<string, string> = {
  youtube: '/youtube-logo.webp',
  linkedin: '/linkedin-logo.webp',
};

type ContentFeedProps = {
  limit?: number;
  showRefresh?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function ContentFeed({
  limit = 10,
  showRefresh = true,
  className,
  emptyMessage = 'No content posted through Kipu yet',
}: ContentFeedProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch posts made through Kipu
      const res = await fetch(`/api/posts?limit=${limit}&status=published`);
      if (!res.ok) {
        throw new Error('Failed to fetch posts');
      }

      const { posts } = await res.json() as { posts: Post[] };

      // Transform posts to content items
      const contentItems: ContentItem[] = posts.map((post) => ({
        id: post.id,
        platform: post.platform,
        type: post.content_type as 'video' | 'image' | 'text',
        title: post.metadata?.title || post.caption?.slice(0, 100) || 'Untitled',
        description: post.caption || '',
        thumbnailUrl: post.metadata?.thumbnailUrl || undefined,
        publishedAt: post.published_at || undefined,
        url: post.metadata?.platformUrl || '#',
        connectionId: post.connection_id,
        connectionUsername: post.connections?.platform_display_name || post.connections?.platform_username || 'Unknown',
      }));

      setContent(contentItems);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit]);

  useEffect(() => {
    void fetchContent();
  }, [fetchContent]);

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
          onClick={() => fetchContent()}
          className="mt-2 text-sm text-[#4FD1C5] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#0B1020] flex items-center justify-center">
          <Video className="h-8 w-8 text-[#9AA3B2]" />
        </div>
        <p className="text-[#9AA3B2]">{emptyMessage}</p>
        <p className="text-sm text-[#9AA3B2]/60 mt-1">
          Cross-post content to see it here
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {showRefresh && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => fetchContent(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm text-[#9AA3B2] hover:text-[#E6E8EF] transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {content.map((item) => (
          <ContentItem key={`${item.platform}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function ContentItem({ item }: { item: ContentItem }) {
  const platformColor = PLATFORM_COLORS[item.platform] || '#9AA3B2';
  const platformLogo = PLATFORM_LOGOS[item.platform];

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group relative flex gap-4 p-4 rounded-lg transition-all',
        'bg-[#0B1020]/50 hover:bg-[#0B1020] border border-transparent hover:border-[#1a1f35]'
      )}
    >
      {/* Thumbnail */}
      {item.thumbnailUrl ? (
        <div className="flex-shrink-0 w-24 h-16 rounded-md overflow-hidden bg-[#0B1020]">
          <img
            src={item.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="flex-shrink-0 w-24 h-16 rounded-md bg-[#0B1020] flex items-center justify-center">
          <Video className="h-6 w-6 text-[#9AA3B2]" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Platform badge */}
          <span
            className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full text-white"
            style={{ backgroundColor: platformColor }}
          >
            {platformLogo && (
              <img src={platformLogo} alt="" className="h-3 w-3" />
            )}
            {item.platform}
          </span>
          <span className="text-xs text-[#9AA3B2]">
            {item.connectionUsername}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-[#E6E8EF] line-clamp-1 group-hover:text-[#4FD1C5] transition-colors">
          {item.title}
        </p>

        {/* Description preview */}
        {item.description && item.description !== item.title && (
          <p className="text-xs text-[#9AA3B2] line-clamp-1 mt-0.5">
            {item.description}
          </p>
        )}

        {/* Timestamp */}
        {item.publishedAt && (
          <p className="text-xs text-[#9AA3B2]/40 mt-1">
            {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
          </p>
        )}
      </div>

      {/* External link icon */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="h-4 w-4 text-[#9AA3B2]" />
      </div>
    </a>
  );
}

export default ContentFeed;
