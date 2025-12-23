import type { Connection, Platform } from '@/types';
import { BasePlatformService, getConnection, PostContent, PostResult } from './base';
import { LinkedInService } from './linkedin';
import { YouTubeService } from './youtube';

export { BasePlatformService, getConnection, downloadMedia } from './base';
export { LinkedInService } from './linkedin';
export { YouTubeService } from './youtube';
export {
  crossPostVideo,
  crossPostToMultiple,
  youtubeToLinkedInCaption,
  linkedInToYouTubeMetadata,
} from './crosspost';
export type { PostContent, PostResult } from './base';
export type { CrossPostRequest, CrossPostResult } from './crosspost';

/**
 * Factory function to get the appropriate platform service
 */
export function getPlatformService(connection: Connection): BasePlatformService {
  switch (connection.platform) {
    case 'linkedin':
      return new LinkedInService(connection);
    case 'youtube':
      return new YouTubeService(connection);
    default:
      throw new Error(`Platform ${connection.platform} is not yet supported for posting`);
  }
}

/**
 * Check if a platform supports direct posting
 */
export function supportsPosting(platform: Platform): boolean {
  return ['linkedin', 'youtube'].includes(platform);
}

/**
 * Post content to a platform using connection ID
 */
export async function postToConnection(
  connectionId: string,
  content: PostContent
): Promise<PostResult> {
  const connection = await getConnection(connectionId);

  if (!connection) {
    return {
      success: false,
      error: `Connection ${connectionId} not found`,
    };
  }

  if (!connection.is_active) {
    return {
      success: false,
      error: `Connection ${connectionId} is not active`,
    };
  }

  if (!supportsPosting(connection.platform)) {
    return {
      success: false,
      error: `Platform ${connection.platform} does not support posting yet`,
    };
  }

  const service = getPlatformService(connection);
  return service.post(content);
}
