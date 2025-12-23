import { oauthConfigs } from '@/lib/oauth/config';
import { createServiceClient } from '@/lib/supabase/server';

import type { Connection, Platform } from '@/types';

export type PostResult = {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export type PostContent = {
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  metadata?: Record<string, unknown>;
}

export abstract class BasePlatformService {
  protected connection: Connection;
  protected platform: Platform;

  constructor(connection: Connection) {
    this.connection = connection;
    this.platform = connection.platform;
  }

  /**
   * Refresh the access token if expired or about to expire
   */
  async ensureValidToken(): Promise<string> {
    const now = new Date();
    const expiresAt = this.connection.token_expires_at
      ? new Date(this.connection.token_expires_at)
      : null;

    // If no expiry or token expires in less than 5 minutes, refresh
    const shouldRefresh =
      expiresAt && expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

    if (shouldRefresh && this.connection.refresh_token) {
      return await this.refreshToken();
    }

    return this.connection.access_token;
  }

  /**
   * Refresh the OAuth token using the refresh token
   */
  protected async refreshToken(): Promise<string> {
    const config = oauthConfigs[this.platform]();

    const params: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: this.connection.refresh_token!,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    };

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed for ${this.platform}: ${error}`);
    }

    const tokenData = await response.json();
    const newAccessToken = tokenData.access_token;
    const newRefreshToken = tokenData.refresh_token || this.connection.refresh_token;
    const expiresIn = tokenData.expires_in;

    // Update the connection in the database
    const supabase = createServiceClient();
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    await supabase
      .from('connections')
      .update({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.connection.id);

    // Update local connection object
    this.connection.access_token = newAccessToken;
    this.connection.refresh_token = newRefreshToken;
    this.connection.token_expires_at = expiresAt;

    return newAccessToken;
  }

  /**
   * Post content to the platform
   */
  abstract post(content: PostContent): Promise<PostResult>;

  /**
   * Upload media to the platform (if separate from posting)
   */
  abstract uploadMedia?(
    mediaBuffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<{ mediaId: string; url?: string }>;
}

/**
 * Fetch a connection from the database by ID
 */
export async function getConnection(connectionId: string): Promise<Connection | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Connection;
}

/**
 * Download media from a URL and return as buffer
 */
export async function downloadMedia(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.statusText}`);
  }

  const mimeType = response.headers.get('content-type') || 'application/octet-stream';
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { buffer, mimeType };
}
