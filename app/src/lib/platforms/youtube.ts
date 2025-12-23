import {
  BasePlatformService,
  PostContent,
  PostResult,
  downloadMedia,
} from './base';

interface YouTubeVideoConfig {
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacy?: 'public' | 'unlisted' | 'private';
  madeForKids?: boolean;
  notifySubscribers?: boolean;
}

interface YouTubeVideoResource {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: Record<string, { url: string; width: number; height: number }>;
    channelTitle: string;
    tags?: string[];
    categoryId: string;
  };
  status: {
    uploadStatus: string;
    privacyStatus: string;
    license: string;
    embeddable: boolean;
    publicStatsViewable: boolean;
    madeForKids: boolean;
  };
}

export class YouTubeService extends BasePlatformService {
  private readonly API_BASE = 'https://www.googleapis.com/youtube/v3';
  private readonly UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3/videos';

  /**
   * Upload a video to YouTube
   */
  async post(content: PostContent): Promise<PostResult> {
    try {
      if (!content.mediaUrl) {
        return {
          success: false,
          error: 'YouTube requires a video URL to post',
        };
      }

      if (content.mediaType !== 'video') {
        return {
          success: false,
          error: 'YouTube only supports video uploads',
        };
      }

      const config = (content.metadata as unknown as Partial<YouTubeVideoConfig>) || {};
      const accessToken = await this.ensureValidToken();

      // Download the video
      const { buffer, mimeType } = await downloadMedia(content.mediaUrl);

      // Upload the video
      const videoResource = await this.uploadVideo(buffer, mimeType, {
        title: config.title || 'Uploaded video',
        description: config.description || content.text,
        tags: config.tags,
        categoryId: config.categoryId || '22', // People & Blogs
        privacy: config.privacy || 'private',
        madeForKids: config.madeForKids ?? false,
        notifySubscribers: config.notifySubscribers ?? true,
      }, accessToken);

      return {
        success: true,
        platformPostId: videoResource.id,
        platformUrl: `https://youtube.com/watch?v=${videoResource.id}`,
        rawResponse: videoResource as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error uploading to YouTube',
      };
    }
  }

  /**
   * Upload a video using resumable upload
   */
  private async uploadVideo(
    videoBuffer: Buffer,
    mimeType: string,
    config: YouTubeVideoConfig,
    accessToken: string
  ): Promise<YouTubeVideoResource> {
    // Step 1: Initialize resumable upload
    const uploadUrl = await this.initializeResumableUpload(config, mimeType, videoBuffer.length, accessToken);

    // Step 2: Upload the video content
    const videoResource = await this.uploadVideoContent(uploadUrl, videoBuffer, mimeType, accessToken);

    return videoResource;
  }

  /**
   * Initialize a resumable upload session
   */
  private async initializeResumableUpload(
    config: YouTubeVideoConfig,
    mimeType: string,
    contentLength: number,
    accessToken: string
  ): Promise<string> {
    const metadata = {
      snippet: {
        title: config.title,
        description: config.description || '',
        tags: config.tags || [],
        categoryId: config.categoryId || '22',
      },
      status: {
        privacyStatus: config.privacy || 'private',
        madeForKids: config.madeForKids ?? false,
        selfDeclaredMadeForKids: config.madeForKids ?? false,
      },
    };

    const params = new URLSearchParams({
      uploadType: 'resumable',
      part: 'snippet,status',
      notifySubscribers: String(config.notifySubscribers ?? true),
    });

    const response = await fetch(`${this.UPLOAD_BASE}?${params}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(contentLength),
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to initialize upload: ${response.status} - ${errorText}`);
    }

    const uploadUrl = response.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('No upload URL returned from YouTube');
    }

    return uploadUrl;
  }

  /**
   * Upload video content to the resumable upload URL
   */
  private async uploadVideoContent(
    uploadUrl: string,
    videoBuffer: Buffer,
    mimeType: string,
    accessToken: string
  ): Promise<YouTubeVideoResource> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': mimeType,
        'Content-Length': String(videoBuffer.length),
      },
      body: new Uint8Array(videoBuffer),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Video upload failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Upload media buffer directly (for workflow use)
   */
  async uploadMedia(
    mediaBuffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<{ mediaId: string; url?: string }> {
    const accessToken = await this.ensureValidToken();

    // Extract title from filename
    const title = filename.replace(/\.[^/.]+$/, '') || 'Uploaded video';

    const videoResource = await this.uploadVideo(mediaBuffer, mimeType, {
      title,
      privacy: 'private', // Default to private for direct uploads
    }, accessToken);

    return {
      mediaId: videoResource.id,
      url: `https://youtube.com/watch?v=${videoResource.id}`,
    };
  }

  /**
   * Update video metadata after upload
   */
  async updateVideoMetadata(
    videoId: string,
    metadata: Partial<YouTubeVideoConfig>
  ): Promise<YouTubeVideoResource> {
    const accessToken = await this.ensureValidToken();

    const updatePayload: Record<string, unknown> = {
      id: videoId,
    };

    const parts: string[] = [];

    if (metadata.title || metadata.description || metadata.tags || metadata.categoryId) {
      parts.push('snippet');
      updatePayload.snippet = {
        ...(metadata.title && { title: metadata.title }),
        ...(metadata.description && { description: metadata.description }),
        ...(metadata.tags && { tags: metadata.tags }),
        ...(metadata.categoryId && { categoryId: metadata.categoryId }),
      };
    }

    if (metadata.privacy || metadata.madeForKids !== undefined) {
      parts.push('status');
      updatePayload.status = {
        ...(metadata.privacy && { privacyStatus: metadata.privacy }),
        ...(metadata.madeForKids !== undefined && { madeForKids: metadata.madeForKids }),
      };
    }

    const params = new URLSearchParams({
      part: parts.join(','),
    });

    const response = await fetch(`${this.API_BASE}/videos?${params}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update video: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get video details
   */
  async getVideo(videoId: string): Promise<YouTubeVideoResource | null> {
    const accessToken = await this.ensureValidToken();

    const params = new URLSearchParams({
      part: 'snippet,status',
      id: videoId,
    });

    const response = await fetch(`${this.API_BASE}/videos?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.items?.[0] || null;
  }

  /**
   * Delete a video
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    const accessToken = await this.ensureValidToken();

    const params = new URLSearchParams({
      id: videoId,
    });

    const response = await fetch(`${this.API_BASE}/videos?${params}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  }

  /**
   * List recent videos from the authenticated channel
   */
  async listRecentVideos(maxResults: number = 10): Promise<YouTubeVideoResource[]> {
    const accessToken = await this.ensureValidToken();

    // First, get the channel's uploads playlist ID
    const channelParams = new URLSearchParams({
      part: 'contentDetails',
      mine: 'true',
    });

    const channelResponse = await fetch(`${this.API_BASE}/channels?${channelParams}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!channelResponse.ok) {
      throw new Error('Failed to get channel info');
    }

    const channelData = await channelResponse.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return [];
    }

    // Get videos from uploads playlist
    const playlistParams = new URLSearchParams({
      part: 'snippet,contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: String(maxResults),
    });

    const playlistResponse = await fetch(`${this.API_BASE}/playlistItems?${playlistParams}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!playlistResponse.ok) {
      throw new Error('Failed to get playlist items');
    }

    const playlistData = await playlistResponse.json();
    const videoIds = playlistData.items?.map((item: { contentDetails: { videoId: string } }) =>
      item.contentDetails.videoId
    ).join(',');

    if (!videoIds) {
      return [];
    }

    // Get full video details
    const videosParams = new URLSearchParams({
      part: 'snippet,status,contentDetails',
      id: videoIds,
    });

    const videosResponse = await fetch(`${this.API_BASE}/videos?${videosParams}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!videosResponse.ok) {
      throw new Error('Failed to get video details');
    }

    const videosData = await videosResponse.json();
    return videosData.items || [];
  }

  /**
   * Get videos uploaded after a specific date/time
   * Useful for polling for new content
   */
  async getVideosAfter(afterDate: Date, maxResults: number = 10): Promise<YouTubeVideoResource[]> {
    const allVideos = await this.listRecentVideos(maxResults);
    return allVideos.filter(video =>
      new Date(video.snippet.publishedAt) > afterDate
    );
  }

  /**
   * Get download URL for a YouTube video
   * Note: YouTube API doesn't provide direct download URLs.
   * This returns the watch URL which can be used with external tools.
   */
  getVideoWatchUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  /**
   * Get embeddable video URL
   */
  getVideoEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
  }
}
