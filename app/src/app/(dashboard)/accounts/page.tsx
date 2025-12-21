import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Check, ExternalLink } from 'lucide-react';
import type { Platform, Connection } from '@/types';

const platforms: {
  id: Platform;
  name: string;
  description: string;
  icon: string;
  color: string;
  canTrigger: boolean;
}[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Posts, Reels, Stories',
    icon: '/icons/instagram.svg',
    color: 'from-purple-500 to-pink-500',
    canTrigger: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Videos, Shorts',
    icon: '/icons/youtube.svg',
    color: 'from-red-500 to-red-600',
    canTrigger: false,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Videos',
    icon: '/icons/tiktok.svg',
    color: 'from-zinc-900 to-zinc-800',
    canTrigger: false,
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    description: 'Tweets, Threads',
    icon: '/icons/twitter.svg',
    color: 'from-zinc-900 to-zinc-800',
    canTrigger: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Posts, Articles',
    icon: '/icons/linkedin.svg',
    color: 'from-blue-600 to-blue-700',
    canTrigger: false,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Posts, Reels',
    icon: '/icons/facebook.svg',
    color: 'from-blue-500 to-blue-600',
    canTrigger: true,
  },
  {
    id: 'threads',
    name: 'Threads',
    description: 'Text posts',
    icon: '/icons/threads.svg',
    color: 'from-zinc-900 to-zinc-800',
    canTrigger: false,
  },
];

export default async function AccountsPage() {
  const supabase = await createClient();

  const { data: connections } = await supabase
    .from('connections')
    .select('*')
    .order('created_at', { ascending: false });

  const connectionsByPlatform = (connections || []).reduce(
    (acc, conn) => {
      if (!acc[conn.platform]) {
        acc[conn.platform] = [];
      }
      acc[conn.platform].push(conn);
      return acc;
    },
    {} as Record<Platform, Connection[]>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Connected Accounts</h1>
        <p className="text-zinc-400 mt-1">
          Manage your social media connections
        </p>
      </div>

      {/* Platforms Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {platforms.map((platform) => {
          const connections = connectionsByPlatform[platform.id] || [];
          const hasConnections = connections.length > 0;

          return (
            <Card
              key={platform.id}
              className="bg-zinc-900 border-zinc-800 overflow-hidden"
            >
              {/* Platform Header */}
              <div className={`h-2 bg-gradient-to-r ${platform.color}`} />

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <span className="text-xl">{getPlatformEmoji(platform.id)}</span>
                    </div>
                    <div>
                      <CardTitle className="text-white text-base">
                        {platform.name}
                      </CardTitle>
                      <CardDescription className="text-zinc-500 text-sm">
                        {platform.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {platform.canTrigger && (
                      <Badge variant="outline" className="text-xs border-teal-500/50 text-teal-400">
                        Trigger
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                      Publish
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Connected Accounts */}
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={conn.platform_avatar_url || undefined} />
                        <AvatarFallback className="bg-zinc-700 text-xs">
                          {conn.platform_username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {conn.platform_display_name || conn.platform_username}
                        </p>
                        <p className="text-xs text-zinc-500">
                          @{conn.platform_username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {conn.is_active ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Badge variant="outline" className="text-xs border-red-500/50 text-red-400">
                          Disconnected
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {/* Connect Button */}
                <Button
                  variant="outline"
                  className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
                  asChild
                >
                  <a href={`/api/oauth/${platform.id}/initiate`}>
                    <Plus className="h-4 w-4 mr-2" />
                    {hasConnections ? 'Add another account' : 'Connect'}
                  </a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function getPlatformEmoji(platform: Platform): string {
  const emojis: Record<Platform, string> = {
    instagram: '📸',
    youtube: '▶️',
    tiktok: '🎵',
    twitter: '𝕏',
    linkedin: '💼',
    facebook: '📘',
    threads: '🧵',
  };
  return emojis[platform] || '🔗';
}
