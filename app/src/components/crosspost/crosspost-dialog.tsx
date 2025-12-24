'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Connection = {
  id: string;
  platform: string;
  platform_username: string;
  platform_display_name: string;
  platform_avatar_url: string | null;
}

type CrossPostDialogProps = {
  connections: Connection[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#FF0000',
  linkedin: '#0A66C2',
};

export function CrossPostDialog({
  connections,
  trigger,
  onSuccess,
}: CrossPostDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    url?: string;
  } | null>(null);

  // Form state
  const [targetConnectionId, setTargetConnectionId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubePrivacy, setYoutubePrivacy] = useState<'public' | 'unlisted' | 'private'>('private');
  const [linkedinVisibility, setLinkedinVisibility] = useState<'PUBLIC' | 'CONNECTIONS'>('PUBLIC');

  // Filter connections by supported platforms
  const supportedConnections = connections.filter((c) =>
    c.platform === 'youtube' || c.platform === 'linkedin'
  );

  // Get selected connection
  const targetConnection = connections.find((c) => c.id === targetConnectionId);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setResult(null);
        setTargetConnectionId('');
        setVideoUrl('');
        setCaption('');
        setYoutubeTitle('');
      }, 300);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        targetConnectionId,
        videoUrl,
        caption,
      };

      // Add platform-specific options
      if (targetConnection?.platform === 'youtube') {
        body.youtubeOptions = {
          title: youtubeTitle || caption.slice(0, 100),
          description: caption,
          privacy: youtubePrivacy,
        };
      } else if (targetConnection?.platform === 'linkedin') {
        body.linkedinOptions = {
          visibility: linkedinVisibility,
        };
      }

      const response = await fetch('/api/posts/crosspost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: 'Posted successfully!',
          url: data.platformUrl,
        });
        onSuccess?.();
      } else {
        setResult({
          success: false,
          message: data.error || 'Post failed',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-[#E6C27A] text-[#05060A] hover:bg-[#E6C27A]/90">
            Post Video
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#0B1020] border-[rgba(230,194,122,0.2)] text-[#E6E8EF] max-w-lg">
        <DialogHeader>
          <DialogTitle>Post Video</DialogTitle>
          <DialogDescription className="text-[#9AA3B2]">
            Post a video to YouTube or LinkedIn
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-8 text-center space-y-4">
            {result.success ? (
              <>
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-400" />
                <p className="text-lg font-medium text-[#E6E8EF]">{result.message}</p>
                {result.url ? <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4FD1C5] hover:underline"
                  >
                    View post
                  </a> : null}
                <Button
                  onClick={() => setOpen(false)}
                  className="mt-4 bg-[#E6C27A] text-[#05060A] hover:bg-[#E6C27A]/90"
                >
                  Done
                </Button>
              </>
            ) : (
              <>
                <XCircle className="h-12 w-12 mx-auto text-red-400" />
                <p className="text-lg font-medium text-[#E6E8EF]">Post failed</p>
                <p className="text-sm text-[#9AA3B2]">{result.message}</p>
                <Button
                  onClick={() => setResult(null)}
                  variant="outline"
                  className="mt-4 border-[rgba(230,194,122,0.2)] text-[#E6E8EF]"
                >
                  Try again
                </Button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Target Selection */}
            <div className="space-y-2">
              <Label className="text-[#9AA3B2]">Post to</Label>
              <Select value={targetConnectionId} onValueChange={setTargetConnectionId}>
                <SelectTrigger className="bg-[#05060A] border-[rgba(230,194,122,0.2)]">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1020] border-[rgba(230,194,122,0.2)]">
                  {supportedConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: PLATFORM_COLORS[conn.platform] }}
                        />
                        {conn.platform_display_name || conn.platform_username}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <Label className="text-[#9AA3B2]">Video URL</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                required
                className="bg-[#05060A] border-[rgba(230,194,122,0.2)] text-[#E6E8EF]"
              />
              <p className="text-xs text-[#9AA3B2]">
                Direct link to the video file (must be publicly accessible)
              </p>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label className="text-[#9AA3B2]">Caption</Label>
              <Textarea
                placeholder="Enter your caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="bg-[#05060A] border-[rgba(230,194,122,0.2)] text-[#E6E8EF] resize-none"
              />
            </div>

            {/* YouTube-specific options */}
            {targetConnection?.platform === 'youtube' ? <div className="space-y-4 p-4 rounded-lg bg-[#05060A]/50 border border-[rgba(230,194,122,0.1)]">
                <h4 className="text-sm font-medium text-[#E6C27A]">YouTube Options</h4>
                <div className="space-y-2">
                  <Label className="text-[#9AA3B2]">Title</Label>
                  <Input
                    placeholder="Video title"
                    value={youtubeTitle}
                    onChange={(e) => setYoutubeTitle(e.target.value)}
                    className="bg-[#05060A] border-[rgba(230,194,122,0.2)] text-[#E6E8EF]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#9AA3B2]">Privacy</Label>
                  <Select value={youtubePrivacy} onValueChange={(v) => setYoutubePrivacy(v as typeof youtubePrivacy)}>
                    <SelectTrigger className="bg-[#05060A] border-[rgba(230,194,122,0.2)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1020] border-[rgba(230,194,122,0.2)]">
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="unlisted">Unlisted</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div> : null}

            {/* LinkedIn-specific options */}
            {targetConnection?.platform === 'linkedin' ? <div className="space-y-4 p-4 rounded-lg bg-[#05060A]/50 border border-[rgba(230,194,122,0.1)]">
                <h4 className="text-sm font-medium text-[#0A66C2]">LinkedIn Options</h4>
                <div className="space-y-2">
                  <Label className="text-[#9AA3B2]">Visibility</Label>
                  <Select value={linkedinVisibility} onValueChange={(v) => setLinkedinVisibility(v as typeof linkedinVisibility)}>
                    <SelectTrigger className="bg-[#05060A] border-[rgba(230,194,122,0.2)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1020] border-[rgba(230,194,122,0.2)]">
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="CONNECTIONS">Connections only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div> : null}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading || !targetConnectionId || !videoUrl}
              className="w-full bg-[#E6C27A] text-[#05060A] hover:bg-[#E6C27A]/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CrossPostDialog;
