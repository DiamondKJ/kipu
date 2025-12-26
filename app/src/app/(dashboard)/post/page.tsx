'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { Connection, Platform } from '@/types';

interface FacebookPageData {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account_id?: string;
}

interface FacebookMetadata {
  pages: FacebookPageData[];
}

export default function PostPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookPageData[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [selectedFacebookPage, setSelectedFacebookPage] = useState<string | null>(null);
  const [postToInstagram, setPostToInstagram] = useState(false);
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('connections')
      .select('*')
      .eq('team_id', user.id)
      .eq('is_active', true)
      .order('platform');

    if (data) {
      setConnections(data);
    }
  };

  const fetchFacebookPages = async (connectionId: string) => {
    setLoadingPages(true);
    try {
      const response = await fetch(`/api/facebook/pages?connectionId=${connectionId}`);
      const data = await response.json();

      if (data.pages) {
        setFacebookPages(data.pages);
      }
    } catch (error) {
      console.error('Failed to fetch Facebook pages:', error);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleAccountToggle = (connection: Connection) => {
    const newSelected = new Set(selectedAccounts);

    if (newSelected.has(connection.id)) {
      newSelected.delete(connection.id);
      // If deselecting Facebook, clear page selection
      if (connection.platform === 'facebook') {
        setSelectedFacebookPage(null);
        setPostToInstagram(false);
        setFacebookPages([]);
      }
    } else {
      newSelected.add(connection.id);
      // If selecting Facebook, fetch pages
      if (connection.platform === 'facebook') {
        fetchFacebookPages(connection.id);
      }
    }

    setSelectedAccounts(newSelected);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() && !imageFile) {
      setStatus({ type: 'error', message: 'Please enter a message or upload an image' });
      return;
    }

    if (selectedAccounts.size === 0) {
      setStatus({ type: 'error', message: 'Please select at least one account' });
      return;
    }

    // Validate Facebook page selection
    const hasFacebook = Array.from(selectedAccounts).some(id =>
      connections.find(c => c.id === id)?.platform === 'facebook'
    );

    if (hasFacebook && !selectedFacebookPage) {
      setStatus({ type: 'error', message: 'Please select a Facebook page' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('accountIds', JSON.stringify(Array.from(selectedAccounts)));

      if (selectedFacebookPage) {
        formData.append('facebookPageId', selectedFacebookPage);
        formData.append('postToInstagram', postToInstagram.toString());
      }

      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await fetch('/api/post/publish', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: result.message || 'Post published successfully!' });
        // Reset form
        setMessage('');
        setImageFile(null);
        setImagePreview(null);
        setSelectedAccounts(new Set());
        setSelectedFacebookPage(null);
        setPostToInstagram(false);
        setFacebookPages([]);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setStatus({ type: 'error', message: result.error || 'Failed to publish post' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to publish post' });
      console.error('Publish error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformEmoji = (platform: Platform): string => {
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
  };

  const facebookConnection = connections.find(c =>
    c.platform === 'facebook' && selectedAccounts.has(c.id)
  );

  const selectedPage = facebookPages.find(p => p.id === selectedFacebookPage);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#E6E8EF] tracking-wide">Create Post</h1>
        <p className="text-[#9AA3B2]">
          Publish content to your connected platforms
        </p>
      </div>

      {/* Filament separator */}
      <div className="filament-separator" />

      {/* Status Messages */}
      {status && (
        <Card className={`border ${status.type === 'success' ? 'bg-[#4FD1C5]/10 border-[#4FD1C5]/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {status.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-[#4FD1C5]" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <p className={status.type === 'success' ? 'text-[#4FD1C5]' : 'text-red-400'}>
                {status.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Content */}
          <div className="space-y-6">
            <Card className="bg-[#0B1020]/60 border-[rgba(230,194,122,0.1)] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-[#E6E8EF]">Content</CardTitle>
                <CardDescription className="text-[#9AA3B2]">
                  Compose your post
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-[#E6E8EF]">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="What's on your mind?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="bg-[#1C2233]/50 border-[rgba(230,194,122,0.1)] text-[#E6E8EF] placeholder:text-[#6B7280]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#E6E8EF]">Image (optional)</Label>
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-[rgba(230,194,122,0.2)] text-[#E6E8EF] hover:bg-[#1C2233]/50"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Image
                      </Button>
                    </label>
                    {imageFile && (
                      <span className="text-sm text-[#9AA3B2]">{imageFile.name}</span>
                    )}
                  </div>
                  {imagePreview && (
                    <div className="mt-4 relative rounded-lg overflow-hidden border border-[rgba(230,194,122,0.1)]">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-auto max-h-[300px] object-contain bg-[#1C2233]/50"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Account Selection */}
          <div className="space-y-6">
            <Card className="bg-[#0B1020]/60 border-[rgba(230,194,122,0.1)] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-[#E6E8EF]">Publish To</CardTitle>
                <CardDescription className="text-[#9AA3B2]">
                  Select your connected accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {connections.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[#6B7280]">No connected accounts</p>
                    <Button
                      type="button"
                      variant="link"
                      className="text-[#E6C27A] hover:text-[#E6C27A]/80"
                      onClick={() => window.location.href = '/accounts'}
                    >
                      Connect an account
                    </Button>
                  </div>
                ) : (
                  connections.map((connection) => (
                    <div key={connection.id}>
                      <label
                        htmlFor={`account-${connection.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-[#1C2233]/50 border border-[rgba(230,194,122,0.05)] hover:border-[rgba(230,194,122,0.15)] transition-colors cursor-pointer"
                      >
                        <Checkbox
                          id={`account-${connection.id}`}
                          checked={selectedAccounts.has(connection.id)}
                          onCheckedChange={(checked) => {
                            handleAccountToggle(connection);
                          }}
                        />
                        <div className="flex items-center gap-3 flex-1 pointer-events-none">
                          <Avatar className="h-8 w-8 ring-1 ring-[rgba(230,194,122,0.1)]">
                            <AvatarImage src={connection.platform_avatar_url || undefined} />
                            <AvatarFallback className="bg-[#1C2233] text-[#9AA3B2] text-xs">
                              {getPlatformEmoji(connection.platform)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#E6E8EF]">
                              {connection.platform_display_name || connection.platform_username}
                            </p>
                            <p className="text-xs text-[#6B7280] capitalize">
                              {connection.platform}
                            </p>
                          </div>
                        </div>
                      </label>

                      {/* Facebook Page Selection */}
                      {connection.platform === 'facebook' && selectedAccounts.has(connection.id) && (
                        <div className="mt-3 ml-11 space-y-3 p-3 rounded-lg bg-[#1C2233]/30 border border-[rgba(230,194,122,0.05)]">
                          {loadingPages ? (
                            <div className="flex items-center gap-2 text-[#9AA3B2]">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Loading pages...</span>
                            </div>
                          ) : facebookPages.length > 0 ? (
                            <>
                              <Label className="text-[#E6E8EF] text-sm">Select Facebook Page</Label>
                              {facebookPages.map((page) => (
                                <div
                                  key={page.id}
                                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                    selectedFacebookPage === page.id
                                      ? 'bg-[#E6C27A]/10 border border-[#E6C27A]/30'
                                      : 'bg-[#1C2233]/50 border border-transparent hover:border-[rgba(230,194,122,0.1)]'
                                  }`}
                                  onClick={() => setSelectedFacebookPage(page.id)}
                                >
                                  <div className="flex-1">
                                    <p className="text-sm text-[#E6E8EF]">{page.name}</p>
                                    {page.instagram_business_account_id && (
                                      <p className="text-xs text-[#E6C27A]">Instagram connected</p>
                                    )}
                                  </div>
                                  {selectedFacebookPage === page.id && (
                                    <CheckCircle2 className="h-4 w-4 text-[#E6C27A]" />
                                  )}
                                </div>
                              ))}

                              {/* Instagram Toggle */}
                              {selectedPage?.instagram_business_account_id && imageFile && (
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1C2233]/50 border border-[rgba(230,194,122,0.1)]">
                                  <Checkbox
                                    id="post-to-instagram"
                                    checked={postToInstagram}
                                    onCheckedChange={(checked) => setPostToInstagram(checked as boolean)}
                                  />
                                  <Label
                                    htmlFor="post-to-instagram"
                                    className="text-sm text-[#E6E8EF] cursor-pointer"
                                  >
                                    Also post to Instagram
                                  </Label>
                                </div>
                              )}

                              {selectedPage?.instagram_business_account_id && !imageFile && (
                                <p className="text-xs text-[#6B7280] italic">
                                  Upload an image to enable Instagram posting
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-[#6B7280]">No pages found</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || selectedAccounts.size === 0}
            className="bg-[#E6C27A] hover:bg-[#E6C27A]/90 text-[#0B1020] font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publish Post
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
