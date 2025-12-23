import { getConnection, type PostResult } from './base';
import { LinkedInService } from './linkedin';
import { YouTubeService } from './youtube';

import type { Connection } from '@/types';

export type CrossPostRequest = {
  sourceConnectionId: string;
  targetConnectionId: string;
  sourceVideoUrl: string;
  sourceCaption: string;
  // Optional overrides
  customCaption?: string;
  youtubeOptions?: {
    title?: string;
    description?: string;
    privacy?: 'public' | 'unlisted' | 'private';
    tags?: string[];
    categoryId?: string;
  };
  linkedinOptions?: {
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  };
}

export type CrossPostResult = {
  success: boolean;
  sourceplatform: string;
  targetPlatform: string;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
}

/**
 * Transform YouTube metadata to LinkedIn caption
 */
export function youtubeToLinkedInCaption(
  title: string,
  description: string,
  youtubeUrl?: string
): string {
  let caption = title;

  // Add description if it adds value (not just the title repeated)
  if (description && description.trim() !== title.trim()) {
    // Truncate description to keep LinkedIn post reasonable
    const maxDescLength = 2500 - title.length - 100; // Leave room for URL
    const truncatedDesc = description.length > maxDescLength
      ? `${description.slice(0, maxDescLength)  }...`
      : description;
    caption += `\n\n${  truncatedDesc}`;
  }

  // Add YouTube link
  if (youtubeUrl) {
    caption += `\n\n🎥 Watch on YouTube: ${youtubeUrl}`;
  }

  return caption;
}

/**
 * Transform LinkedIn caption to YouTube metadata
 */
export function linkedInToYouTubeMetadata(
  caption: string
): { title: string; description: string } {
  const lines = caption.split('\n').filter(line => line.trim());

  // First line or first 100 chars becomes the title
  let title = lines[0] || 'Uploaded from LinkedIn';
  if (title.length > 100) {
    title = `${title.slice(0, 97)  }...`;
  }

  // Full caption becomes description
  const description = caption;

  return { title, description };
}

/**
 * Cross-post a video from one platform to another
 */
export async function crossPostVideo(request: CrossPostRequest): Promise<CrossPostResult> {
  try {
    // Get both connections
    const sourceConnection = await getConnection(request.sourceConnectionId);
    const targetConnection = await getConnection(request.targetConnectionId);

    if (!sourceConnection) {
      return {
        success: false,
        sourceplatform: 'unknown',
        targetPlatform: 'unknown',
        error: 'Source connection not found',
      };
    }

    if (!targetConnection) {
      return {
        success: false,
        sourceplatform: sourceConnection.platform,
        targetPlatform: 'unknown',
        error: 'Target connection not found',
      };
    }

    const sourcePlatform = sourceConnection.platform;
    const targetPlatform = targetConnection.platform;

    // Validate platforms
    if (!['youtube', 'linkedin'].includes(sourcePlatform)) {
      return {
        success: false,
        sourceplatform: sourcePlatform,
        targetPlatform,
        error: `Source platform ${sourcePlatform} not supported for cross-posting`,
      };
    }

    if (!['youtube', 'linkedin'].includes(targetPlatform)) {
      return {
        success: false,
        sourceplatform: sourcePlatform,
        targetPlatform,
        error: `Target platform ${targetPlatform} not supported for cross-posting`,
      };
    }

    // Post to target platform
    let result: PostResult;

    if (targetPlatform === 'linkedin') {
      result = await postToLinkedIn(
        targetConnection,
        request.sourceVideoUrl,
        request.customCaption || request.sourceCaption,
        request.linkedinOptions
      );
    } else if (targetPlatform === 'youtube') {
      result = await postToYouTube(
        targetConnection,
        request.sourceVideoUrl,
        request.sourceCaption,
        request.youtubeOptions
      );
    } else {
      return {
        success: false,
        sourceplatform: sourcePlatform,
        targetPlatform,
        error: 'Invalid target platform',
      };
    }

    return {
      success: result.success,
      sourceplatform: sourcePlatform,
      targetPlatform,
      platformPostId: result.platformPostId,
      platformUrl: result.platformUrl,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      sourceplatform: 'unknown',
      targetPlatform: 'unknown',
      error: error instanceof Error ? error.message : 'Cross-post failed',
    };
  }
}

/**
 * Post video to LinkedIn
 */
async function postToLinkedIn(
  connection: Connection,
  videoUrl: string,
  caption: string,
  options?: { visibility?: 'PUBLIC' | 'CONNECTIONS' }
): Promise<PostResult> {
  const service = new LinkedInService(connection);

  return service.post({
    text: caption,
    mediaUrl: videoUrl,
    mediaType: 'video',
    metadata: {
      visibility: options?.visibility || 'PUBLIC',
    },
  });
}

/**
 * Post video to YouTube
 */
async function postToYouTube(
  connection: Connection,
  videoUrl: string,
  caption: string,
  options?: {
    title?: string;
    description?: string;
    privacy?: 'public' | 'unlisted' | 'private';
    tags?: string[];
    categoryId?: string;
  }
): Promise<PostResult> {
  const service = new YouTubeService(connection);

  // If no custom title, derive from caption
  const metadata = options?.title
    ? options
    : {
        ...linkedInToYouTubeMetadata(caption),
        ...options,
      };

  return service.post({
    text: caption,
    mediaUrl: videoUrl,
    mediaType: 'video',
    metadata: {
      title: metadata.title,
      description: metadata.description || caption,
      privacy: metadata.privacy || 'private',
      tags: metadata.tags,
      categoryId: metadata.categoryId,
    },
  });
}

/**
 * Cross-post to multiple targets at once
 */
export async function crossPostToMultiple(
  sourceConnectionId: string,
  sourceVideoUrl: string,
  sourceCaption: string,
  targets: Array<{
    connectionId: string;
    customCaption?: string;
    youtubeOptions?: CrossPostRequest['youtubeOptions'];
    linkedinOptions?: CrossPostRequest['linkedinOptions'];
  }>
): Promise<CrossPostResult[]> {
  const results = await Promise.all(
    targets.map((target) =>
      crossPostVideo({
        sourceConnectionId,
        targetConnectionId: target.connectionId,
        sourceVideoUrl,
        sourceCaption,
        customCaption: target.customCaption,
        youtubeOptions: target.youtubeOptions,
        linkedinOptions: target.linkedinOptions,
      })
    )
  );

  return results;
}
