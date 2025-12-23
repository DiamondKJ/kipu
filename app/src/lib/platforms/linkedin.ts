import {
  BasePlatformService,
  PostContent,
  PostResult,
  downloadMedia,
} from './base';

interface LinkedInUploadResponse {
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

interface LinkedInPostConfig {
  visibility?: 'PUBLIC' | 'CONNECTIONS';
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
}
