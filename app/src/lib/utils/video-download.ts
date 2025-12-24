import { exec } from 'child_process';
import { existsSync, mkdirSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEMP_DIR = '/tmp/kipu-videos';

// Ensure temp directory exists
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

export type DownloadResult = {
  success: boolean;
  filePath?: string;
  buffer?: Buffer;
  mimeType?: string;
  error?: string;
};

/**
 * Download a YouTube video using yt-dlp
 * Returns the video as a Buffer for uploading to other platforms
 */
export async function downloadYouTubeVideo(youtubeUrl: string): Promise<DownloadResult> {
  // Extract video ID for filename
  const videoIdMatch = youtubeUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = videoIdMatch?.[1] || `video-${Date.now()}`;
  const outputPath = join(TEMP_DIR, `${videoId}.mp4`);

  try {
    // Check if yt-dlp is installed
    try {
      await execAsync('which yt-dlp');
    } catch {
      return {
        success: false,
        error: 'yt-dlp is not installed. Run: brew install yt-dlp',
      };
    }

    // Download the video
    // -f: format selection (best video+audio up to 1080p, merged to mp4)
    // --merge-output-format: ensure output is mp4
    // -o: output path
    const command = `yt-dlp -f "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" "${youtubeUrl}"`;

    console.log('Downloading YouTube video:', youtubeUrl);
    const { stderr } = await execAsync(command, { timeout: 300000 }); // 5 min timeout

    if (stderr && stderr.includes('ERROR')) {
      return {
        success: false,
        error: `yt-dlp error: ${stderr}`,
      };
    }

    // Check if file was created
    if (!existsSync(outputPath)) {
      return {
        success: false,
        error: 'Video file was not created',
      };
    }

    // Read the file into a buffer
    const buffer = readFileSync(outputPath);

    console.log(`Downloaded video: ${buffer.length} bytes`);

    return {
      success: true,
      filePath: outputPath,
      buffer,
      mimeType: 'video/mp4',
    };
  } catch (error) {
    // Clean up on error
    if (existsSync(outputPath)) {
      try {
        unlinkSync(outputPath);
      } catch {}
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download video',
    };
  }
}

/**
 * Clean up a downloaded video file
 */
export function cleanupVideoFile(filePath: string): void {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      console.log('Cleaned up temp video file:', filePath);
    }
  } catch (error) {
    console.error('Failed to cleanup video file:', error);
  }
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}
