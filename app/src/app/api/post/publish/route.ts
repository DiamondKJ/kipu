import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface FacebookPageData {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account_id?: string;
}

// Helper function to wait for Instagram media to be ready
async function waitForInstagramMedia(
  igId: string,
  creationId: string,
  accessToken: string,
  maxAttempts = 10,
  delayMs = 2000
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check media container status
    const statusResponse = await fetch(
      `https://graph.facebook.com/${creationId}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = await statusResponse.json();

    if (process.env.DEBUG_OAUTH === 'true') {
      console.log(`[Instagram Media Status] Attempt ${attempt + 1}:`, statusData);
    }

    // Status codes: FINISHED, IN_PROGRESS, ERROR
    if (statusData.status_code === 'FINISHED') {
      return; // Media is ready
    }

    if (statusData.status_code === 'ERROR') {
      throw new Error('Instagram media processing failed');
    }

    // Wait before next check
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Instagram media processing timeout - media not ready after ' + (maxAttempts * delayMs / 1000) + ' seconds');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const accountIdsJson = formData.get('accountIds') as string;
    const facebookPageId = formData.get('facebookPageId') as string | null;
    const postToInstagram = formData.get('postToInstagram') === 'true';
    const imageFile = formData.get('image') as File | null;

    if (!message && !imageFile) {
      return NextResponse.json(
        { error: 'Message or image is required' },
        { status: 400 }
      );
    }

    const accountIds: string[] = JSON.parse(accountIdsJson);

    if (accountIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one account must be selected' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get selected connections
    const { data: connections } = await supabase
      .from('connections')
      .select('*')
      .in('id', accountIds)
      .eq('team_id', user.id)
      .eq('is_active', true);

    if (!connections || connections.length === 0) {
      return NextResponse.json(
        { error: 'No valid connections found' },
        { status: 404 }
      );
    }

    // Handle image upload if present
    let imageUrl: string | null = null;
    let imageFilePath: string | null = null;
    if (imageFile) {
      const uploadDir = join(process.cwd(), 'public', 'uploads');

      // Create uploads directory if it doesn't exist
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Save file
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const filename = `${Date.now()}-${imageFile.name}`;
      imageFilePath = join(uploadDir, filename);
      await writeFile(imageFilePath, buffer);

      // Generate public URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      imageUrl = `${baseUrl}/uploads/${filename}`;

      // Debug warning if using localhost with Facebook
      if (process.env.DEBUG_OAUTH === 'true') {
        const hasFacebook = connections.some(c => c.platform === 'facebook');
        if (hasFacebook && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
          console.warn('[Image Upload Warning] Using localhost URL for Facebook posting. Facebook requires publicly accessible URLs. Consider using ngrok or cloudflare tunnel.');
          console.warn('[Image Upload Warning] Image URL:', imageUrl);
        }
      }
    }

    const results: Array<{ platform: string; success: boolean; error?: string }> = [];

    // Publish to each platform
    for (const connection of connections) {
      try {
        if (connection.platform === 'facebook') {
          if (!facebookPageId) {
            results.push({
              platform: 'facebook',
              success: false,
              error: 'Facebook page not selected',
            });
            continue;
          }

          // Fetch Facebook pages to get page access token
          const pagesResponse = await fetch(
            `https://graph.facebook.com/me/accounts?access_token=${connection.access_token}`
          );
          const pagesData = await pagesResponse.json();
          const page = pagesData.data?.find((p: any) => p.id === facebookPageId);

          if (!page) {
            results.push({
              platform: 'facebook',
              success: false,
              error: 'Facebook page not found',
            });
            continue;
          }

          const pageAccessToken = page.access_token;

          // Post to Facebook
          if (imageUrl) {
            // Post with image
            const photoResponse = await fetch(
              `https://graph.facebook.com/${facebookPageId}/photos`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: imageUrl,
                  caption: message,
                  access_token: pageAccessToken,
                }),
              }
            );

            const photoResult = await photoResponse.json();
            if (photoResult.error) {
              throw new Error(photoResult.error.message);
            }

            results.push({ platform: 'facebook', success: true });
          } else {
            // Post text only
            const feedResponse = await fetch(
              `https://graph.facebook.com/${facebookPageId}/feed`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message,
                  access_token: pageAccessToken,
                }),
              }
            );

            const feedResult = await feedResponse.json();
            if (feedResult.error) {
              throw new Error(feedResult.error.message);
            }

            results.push({ platform: 'facebook', success: true });
          }

          // Post to Instagram if requested
          if (postToInstagram && imageUrl) {
            // Fetch Instagram account ID
            const igResponse = await fetch(
              `https://graph.facebook.com/${facebookPageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
            );
            const igData = await igResponse.json();
            const igId = igData.instagram_business_account?.id;

            if (process.env.DEBUG_OAUTH === 'true') {
              console.log('[Instagram Account ID]', {
                facebookPageId,
                igId,
                hasIgAccount: !!igId
              });
            }

            if (igId) {
              // Create media container
              const mediaResponse = await fetch(
                `https://graph.facebook.com/${igId}/media`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    image_url: imageUrl,
                    caption: message,
                    access_token: pageAccessToken,
                  }),
                }
              );

              const mediaResult = await mediaResponse.json();
              if (mediaResult.error) {
                throw new Error(mediaResult.error.message);
              }

              if (process.env.DEBUG_OAUTH === 'true') {
                console.log('[Instagram Media Created]', { creationId: mediaResult.id });
              }

              // Wait for Instagram to process the media
              await waitForInstagramMedia(igId, mediaResult.id, pageAccessToken);

              // Add extra delay after FINISHED status (Instagram needs a moment even after status is FINISHED)
              await new Promise(resolve => setTimeout(resolve, 3000));

              // Publish media with retry logic for transient errors
              let publishResult;
              let publishSuccess = false;
              const maxPublishAttempts = 3;

              for (let attempt = 0; attempt < maxPublishAttempts; attempt++) {
                if (process.env.DEBUG_OAUTH === 'true') {
                  console.log('[Instagram Publish Request]', {
                    attempt: attempt + 1,
                    igId,
                    creationId: mediaResult.id,
                    url: `https://graph.facebook.com/${igId}/media_publish`
                  });
                }

                const publishResponse = await fetch(
                  `https://graph.facebook.com/${igId}/media_publish`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      creation_id: mediaResult.id,
                      access_token: pageAccessToken,
                    }),
                  }
                );

                publishResult = await publishResponse.json();

                if (process.env.DEBUG_OAUTH === 'true') {
                  console.log('[Instagram Publish Result]', publishResult);
                }

                // Check if successful
                if (!publishResult.error) {
                  publishSuccess = true;
                  break;
                }

                // Check if it's the "media not ready" error (code 9007, subcode 2207027)
                const isMediaNotReadyError =
                  publishResult.error.code === 9007 &&
                  publishResult.error.error_subcode === 2207027;

                if (isMediaNotReadyError && attempt < maxPublishAttempts - 1) {
                  // Wait longer before retry
                  const retryDelay = 5000 + (attempt * 2000); // 5s, 7s, 9s
                  if (process.env.DEBUG_OAUTH === 'true') {
                    console.log(`[Instagram Publish] Media not ready, retrying in ${retryDelay}ms...`);
                  }
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                } else {
                  // Different error or last attempt
                  break;
                }
              }

              if (!publishSuccess && publishResult.error) {
                console.error('[Instagram Publish Error]', {
                  error: publishResult.error,
                  igId,
                  creationId: mediaResult.id
                });
                throw new Error(publishResult.error.message);
              }

              results.push({ platform: 'instagram', success: true });
            } else {
              results.push({
                platform: 'instagram',
                success: false,
                error: 'Instagram account not linked to page',
              });
            }
          }
        } else {
          // Other platforms not implemented yet
          results.push({
            platform: connection.platform,
            success: false,
            error: 'Platform not supported yet',
          });
        }
      } catch (error) {
        console.error(`Error posting to ${connection.platform}:`, error);
        results.push({
          platform: connection.platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Check if any posts succeeded
    const successCount = results.filter((r) => r.success).length;

    // Schedule delayed cleanup for uploaded image file
    // Wait before deleting to ensure platforms have time to download the image
    if (successCount > 0 && imageFilePath) {
      const fileToDelete = imageFilePath;
      // Don't block the response - schedule cleanup in background
      setImmediate(async () => {
        try {
          // Wait 60 seconds to ensure platforms downloaded the image
          await new Promise(resolve => setTimeout(resolve, 60000));
          await unlink(fileToDelete);
          if (process.env.DEBUG_OAUTH === 'true') {
            console.log('[File Cleanup] Deleted uploaded image after 60s delay:', fileToDelete);
          }
        } catch (error) {
          if (process.env.DEBUG_OAUTH === 'true') {
            console.error('[File Cleanup] Failed to delete uploaded image:', error);
          }
          // Don't fail - file will be cleaned up by scheduled job
        }
      });
    }

    if (successCount === 0) {
      return NextResponse.json(
        {
          error: 'All posts failed',
          results,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Successfully published to ${successCount} platform${successCount > 1 ? 's' : ''}`,
      results,
    });
  } catch (error) {
    console.error('Error publishing post:', error);
    return NextResponse.json(
      { error: 'Failed to publish post' },
      { status: 500 }
    );
  }
}
