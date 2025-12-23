import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import type { Platform, Connection } from '@/types';

const platforms: {
  id: Platform;
  name: string;
  description: string;
  logo?: string;
  emoji: string;
  accentColor: string;
  canTrigger: boolean;
}[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Posts, Reels, Stories',
    emoji: '📸',
    accentColor: '#E6C27A',
    canTrigger: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Videos, Shorts',
    logo: '/youtube-logo.webp',
    emoji: '▶️',
    accentColor: '#FF0000',
    canTrigger: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Videos',
    emoji: '🎵',
    accentColor: '#4FD1C5',
    canTrigger: false,
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    description: 'Tweets, Threads',
    emoji: '𝕏',
    accentColor: '#9AA3B2',
    canTrigger: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Posts, Articles',
    logo: '/linkedin-logo.webp',
    emoji: '💼',
    accentColor: '#0A66C2',
    canTrigger: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Posts, Reels',
    emoji: '📘',
    accentColor: '#C48A5A',
    canTrigger: true,
  },
  {
    id: 'threads',
    name: 'Threads',
    description: 'Text posts',
    emoji: '🧵',
    accentColor: '#E6C27A',
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
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#E6E8EF] tracking-wide">Connected Nodes</h1>
        <p className="text-[#9AA3B2]">
          Manage your platform connections
        </p>
      </div>

      {/* Filament separator */}
      <div className="filament-separator" />

      {/* Platforms Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {platforms.map((platform, index) => {
          const platformConnections = connectionsByPlatform[platform.id] || [];
          const hasConnections = platformConnections.length > 0;

          return (
            <Card
              key={platform.id}
              className="bg-[#0B1020]/60 border-[rgba(230,194,122,0.1)] backdrop-blur-sm overflow-hidden group"
              style={{
                animation: `metricEase 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                animationDelay: `${index * 50}ms`,
                opacity: 0
              }}
            >
              {/* Platform Header - thin filament line */}
              <div
                className="h-px"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${platform.accentColor}40 50%, transparent 100%)`
                }}
              />

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: `${platform.accentColor}15` }}
                    >
                      {platform.logo ? (
                        <img
                          src={platform.logo}
                          alt={platform.name}
                          className="h-6 w-6 object-contain"
                        />
                      ) : (
                        <span className="text-xl">{platform.emoji}</span>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-[#E6E8EF] text-base">
                        {platform.name}
                      </CardTitle>
                      <CardDescription className="text-[#6B7280] text-sm">
                        {platform.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {platform.canTrigger && (
                      <Badge variant="outline" className="text-xs border-[#4FD1C5]/30 text-[#4FD1C5] bg-[#4FD1C5]/5">
                        Trigger
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs border-[rgba(230,194,122,0.2)] text-[#9AA3B2] bg-transparent">
                      Publish
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Connected Accounts */}
                {platformConnections.map((conn: Connection) => (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#1C2233]/50 border border-[rgba(230,194,122,0.05)]"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 ring-1 ring-[rgba(230,194,122,0.1)]">
                        <AvatarImage src={conn.platform_avatar_url || undefined} />
                        <AvatarFallback className="bg-[#1C2233] text-[#9AA3B2] text-xs">
                          {conn.platform_username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-[#E6E8EF]">
                          {conn.platform_display_name || conn.platform_username}
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          @{conn.platform_username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {conn.is_active ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#4FD1C5]" />
                          <span className="text-xs text-[#4FD1C5]">Active</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">
                          Disconnected
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {/* Connect Button */}
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  asChild
                >
                  <a href={`/api/oauth/${platform.id}/initiate`}>
                    <Plus className="h-4 w-4 mr-2" />
                    {hasConnections ? 'Add another node' : 'Connect'}
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
