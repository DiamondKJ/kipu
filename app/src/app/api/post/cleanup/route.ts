import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization here
    // For example, check for an API key in headers
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads');

    // Check if uploads directory exists
    if (!existsSync(uploadDir)) {
      return NextResponse.json({
        message: 'Uploads directory does not exist',
        deletedCount: 0,
      });
    }

    // Get max age from query params (default 24 hours)
    const { searchParams } = new URL(request.url);
    const maxAgeHours = parseInt(searchParams.get('maxAgeHours') || '24', 10);
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();

    // Read all files in uploads directory
    const files = await readdir(uploadDir);
    const deletedFiles: string[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    for (const file of files) {
      // Skip .gitkeep file
      if (file === '.gitkeep') {
        continue;
      }

      const filePath = join(uploadDir, file);

      try {
        const stats = await stat(filePath);

        // Check if file is older than maxAge
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAgeMs) {
          await unlink(filePath);
          deletedFiles.push(file);

          if (process.env.DEBUG_OAUTH === 'true') {
            console.log(`[Cleanup] Deleted old file: ${file} (age: ${Math.round(fileAge / 1000 / 60 / 60)}h)`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ file, error: errorMessage });
        console.error(`[Cleanup] Error processing file ${file}:`, error);
      }
    }

    const response = {
      message: `Cleaned up ${deletedFiles.length} old file(s)`,
      deletedCount: deletedFiles.length,
      maxAgeHours,
      deletedFiles: process.env.DEBUG_OAUTH === 'true' ? deletedFiles : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Cleanup] Error during cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup uploads directory' },
      { status: 500 }
    );
  }
}

// Also support GET for easier testing
export async function GET(request: NextRequest) {
  return POST(request);
}
