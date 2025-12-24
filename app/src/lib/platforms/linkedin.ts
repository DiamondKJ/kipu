import {
  BasePlatformService,
  downloadMedia,
  type PostContent,
  type PostResult,
} from './base';

type LinkedInUploadResponse = {
  value: {
    uploadMechanism: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
        uploadUrl: string;
        headers: Record<string, string>;
      };
    };
    asset: string;
  };
}

type LinkedInPostConfig = {
  visibility?: 'PUBLIC' | 'CONNECTIONS';
}

/**
 * LinkedIn REST API post structure (newer API)
 */
type RestliPost = {
  id: string;
  author: string;
  createdAt?: number;
  publishedAt?: number;
  lifecycleState?: string;
  commentary?: string;
  visibility?: string;
  content?: {
    media?: Array<{
      status: string;
      media: string;
      title?: { text: string };
      description?: { text: string };
    }>;
  };
}

export class LinkedInService extends BasePlatformService {
  private readonly API_BASE = 'https://api.linkedin.com/v2';
  private readonly RESTLI_API_BASE = 'https://api.linkedin.com/rest';

  /**
   * Get the LinkedIn member URN (user ID in URN format)
   */
  private getMemberUrn(): string {
    return `urn:li:person:${this.connection.platform_user_id}`;
  }

  /**
   * Create a text-only post on LinkedIn
   */
  async post(content: PostContent): Promise<PostResult> {
    try {
      const accessToken = await this.ensureValidToken();
      const config = (content.metadata as unknown as Partial<LinkedInPostConfig>) || {};
      const visibility = config.visibility || 'PUBLIC';

      // If there's media, handle it first
      let mediaAsset: string | undefined;
      if (content.mediaUrl) {
        const uploadResult = await this.uploadMediaFromUrl(
          content.mediaUrl,
          content.mediaType || 'image',
          accessToken
        );
        mediaAsset = uploadResult.asset;
      }

      // Create the post
      const postData = this.buildPostPayload(content.text, visibility, mediaAsset, content.mediaType);

      const response = await fetch(`${this.API_BASE}/ugcPosts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `LinkedIn post failed: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();
      const postId = result.id;

      // Extract the activity ID for the URL
      const activityId = postId?.split(':').pop();
      const platformUrl = activityId
        ? `https://www.linkedin.com/feed/update/${postId}`
        : undefined;

      return {
        success: true,
        platformPostId: postId,
        platformUrl,
        rawResponse: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error posting to LinkedIn',
      };
    }
  }

  /**
   * Build the UGC post payload
   */
  private buildPostPayload(
    text: string,
    visibility: 'PUBLIC' | 'CONNECTIONS',
    mediaAsset?: string,
    mediaType?: 'image' | 'video'
  ) {
    const author = this.getMemberUrn();

    const basePayload = {
      author,
      lifecycleState: 'PUBLISHED',
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility,
      },
    };

    if (mediaAsset && mediaType) {
      // Post with media
      return {
        ...basePayload,
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text,
            },
            shareMediaCategory: mediaType === 'video' ? 'VIDEO' : 'IMAGE',
            media: [
              {
                status: 'READY',
                media: mediaAsset,
              },
            ],
          },
        },
      };
    }

    // Text-only post
    return {
      ...basePayload,
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text,
          },
          shareMediaCategory: 'NONE',
        },
      },
    };
  }

  /**
   * Upload media from a URL to LinkedIn
   */
  private async uploadMediaFromUrl(
    mediaUrl: string,
    mediaType: 'image' | 'video',
    accessToken: string
  ): Promise<{ asset: string }> {
    // Download the media
    const { buffer, mimeType } = await downloadMedia(mediaUrl);

    // Register the upload with LinkedIn
    const registerResponse = await this.registerUpload(mediaType, accessToken);
    const uploadUrl =
      registerResponse.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ].uploadUrl;
    const asset = registerResponse.value.asset;

    // Upload the media
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': mimeType,
      },
      body: new Uint8Array(buffer),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Media upload failed: ${uploadResponse.status}`);
    }

    return { asset };
  }

  /**
   * Register a media upload with LinkedIn
   */
  private async registerUpload(
    mediaType: 'image' | 'video',
    accessToken: string
  ): Promise<LinkedInUploadResponse> {
    const recipeType =
      mediaType === 'video'
        ? 'urn:li:digitalmediaRecipe:feedshare-video'
        : 'urn:li:digitalmediaRecipe:feedshare-image';

    const registerData = {
      registerUploadRequest: {
        owner: this.getMemberUrn(),
        recipes: [recipeType],
        serviceRelationships: [
          {
            identifier: 'urn:li:userGeneratedContent',
            relationshipType: 'OWNER',
          },
        ],
      },
    };

    const response = await fetch(`${this.API_BASE}/assets?action=registerUpload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(registerData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Register upload failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Upload media buffer directly (for workflow use)
   */
  async uploadMedia(
    mediaBuffer: Buffer,
    mimeType: string,
    _filename: string
  ): Promise<{ mediaId: string; url?: string }> {
    const accessToken = await this.ensureValidToken();
    const mediaType = mimeType.startsWith('video/') ? 'video' : 'image';

    // Register the upload
    const registerResponse = await this.registerUpload(mediaType, accessToken);
    const uploadUrl =
      registerResponse.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ].uploadUrl;
    const asset = registerResponse.value.asset;

    // Upload the media
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': mimeType,
      },
      body: new Uint8Array(mediaBuffer),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Media upload failed: ${uploadResponse.status}`);
    }

    return { mediaId: asset };
  }

  /**
   * Post a video directly from a buffer (for cross-posting downloaded videos)
   */
  async postWithVideoBuffer(
    text: string,
    videoBuffer: Buffer,
    visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'
  ): Promise<PostResult> {
    try {
      const accessToken = await this.ensureValidToken();

      console.log(`Uploading video buffer (${videoBuffer.length} bytes) to LinkedIn...`);

      // Register the upload for video
      const registerResponse = await this.registerUpload('video', accessToken);
      const uploadUrl =
        registerResponse.value.uploadMechanism[
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
        ].uploadUrl;
      const asset = registerResponse.value.asset;

      // Upload the video
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'video/mp4',
        },
        body: new Uint8Array(videoBuffer),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        return {
          success: false,
          error: `Video upload failed: ${uploadResponse.status} - ${errorText}`,
        };
      }

      console.log('Video uploaded, creating post...');

      // Create the post with the uploaded video
      const postData = this.buildPostPayload(text, visibility, asset, 'video');

      const response = await fetch(`${this.API_BASE}/ugcPosts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `LinkedIn post failed: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();
      const postId = result.id;
      const platformUrl = postId
        ? `https://www.linkedin.com/feed/update/${postId}`
        : undefined;

      console.log('LinkedIn video post created:', platformUrl);

      return {
        success: true,
        platformPostId: postId,
        platformUrl,
        rawResponse: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error posting video to LinkedIn',
      };
    }
  }

  /**
   * Get a specific post by ID
   */
  async getPost(postId: string): Promise<LinkedInPost | null> {
    const accessToken = await this.ensureValidToken();

    const params = new URLSearchParams({
      q: 'ids',
      ids: postId,
    });

    const response = await fetch(`${this.API_BASE}/ugcPosts?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const results = data.results || {};
    return results[postId] || null;
  }

  /**
   * List recent posts from the authenticated user
   * Tries the newer Posts API first, falls back to UGC Posts API
   */
  async listRecentPosts(count = 10): Promise<LinkedInPost[]> {
    const accessToken = await this.ensureValidToken();
    const authorUrn = this.getMemberUrn();

    // Try the newer Posts API first (LinkedIn API v202401+)
    try {
      const postsResult = await this.listPostsViaPostsApi(accessToken, authorUrn, count);
      if (postsResult.length > 0) {
        return postsResult;
      }
    } catch (err) {
      console.log('Posts API not available, trying UGC Posts API...', err);
    }

    // Fall back to UGC Posts API
    const params = new URLSearchParams({
      q: 'authors',
      authors: `List(${authorUrn})`,
      count: String(count),
      sortBy: 'LAST_MODIFIED',
    });

    const response = await fetch(`${this.API_BASE}/ugcPosts?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to list LinkedIn posts:', errorText);
      // Check if it's a permissions issue
      if (response.status === 403) {
        console.error('LinkedIn requires r_member_social scope to read posts. Please reconnect your LinkedIn account.');
      }
      return [];
    }

    const data = await response.json();
    return data.elements || [];
  }

  /**
   * List posts using the newer LinkedIn Posts API
   */
  private async listPostsViaPostsApi(
    accessToken: string,
    authorUrn: string,
    count: number
  ): Promise<LinkedInPost[]> {
    const params = new URLSearchParams({
      author: authorUrn,
      count: String(count),
      q: 'author',
    });

    const response = await fetch(`${this.RESTLI_API_BASE}/posts?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Posts API failed: ${response.status}`);
    }

    const data = await response.json();

    // Transform to match LinkedInPost format
    return (data.elements || []).map((post: RestliPost) => ({
      id: post.id,
      author: post.author,
      created: post.createdAt ? { time: post.createdAt } : undefined,
      firstPublishedAt: post.publishedAt,
      lifecycleState: post.lifecycleState || 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: post.commentary || '',
          },
          shareMediaCategory: post.content?.media ? 'RICH' : 'NONE',
          media: post.content?.media,
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': post.visibility || 'PUBLIC',
      },
    }));
  }

  /**
   * Get posts created after a specific date
   * Useful for polling for new content
   */
  async getPostsAfter(afterDate: Date, count = 10): Promise<LinkedInPost[]> {
    const posts = await this.listRecentPosts(count);
    return posts.filter(post => {
      const createdAt = post.created?.time || post.firstPublishedAt;
      return createdAt && new Date(createdAt) > afterDate;
    });
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<boolean> {
    const accessToken = await this.ensureValidToken();

    const response = await fetch(`${this.API_BASE}/ugcPosts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    return response.ok;
  }

  /**
   * Get the post URL for a given post ID
   */
  getPostUrl(postId: string): string {
    return `https://www.linkedin.com/feed/update/${postId}`;
  }
}

/**
 * LinkedIn post structure (simplified)
 */
export type LinkedInPost = {
  id: string;
  author: string;
  created?: {
    time: number;
  };
  firstPublishedAt?: number;
  lifecycleState: string;
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: string;
      };
      shareMediaCategory: string;
      media?: Array<{
        status: string;
        media: string;
        title?: { text: string };
        description?: { text: string };
      }>;
    };
  };
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': string;
  };
}
