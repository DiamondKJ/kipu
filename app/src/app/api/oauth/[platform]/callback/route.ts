import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getOAuthConfig, getRedirectUri } from '@/lib/oauth/config';
import { exchangeCodeForToken } from '@/lib/oauth/utils';
import { createClient } from '@/lib/supabase/server';

import type { Platform } from '@/types';

const VALID_PLATFORMS: Platform[] = [
  'instagram',
  'youtube',
  'tiktok',
  'twitter',
  'linkedin',
  'facebook',
  'threads',
];

type RouteParams = {
  params: Promise<{ platform: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const url = new URL(request.url);
  const baseUrl = url.origin;

  try {
    const { platform } = await params;

    // Validate platform
    if (!VALID_PLATFORMS.includes(platform as Platform)) {
      return NextResponse.redirect(
        new URL('/accounts?error=invalid_platform', baseUrl)
      );
    }

    const platformKey = platform as Platform;

    // Get authorization code and state from query params
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error(`OAuth error for ${platform}:`, error);
      return NextResponse.redirect(
        new URL(`/accounts?error=${error}`, baseUrl)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/accounts?error=missing_params', baseUrl)
      );
    }

    // Verify state
    const cookieStore = await cookies();
    const storedState = cookieStore.get(`oauth_state_${platform}`)?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        new URL('/accounts?error=invalid_state', baseUrl)
      );
    }

    // Clear state cookie
    cookieStore.delete(`oauth_state_${platform}`);

    // Check if user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', baseUrl));
    }

    // Get OAuth config and exchange code for tokens
    const config = getOAuthConfig(platformKey);
    const redirectUri = getRedirectUri(platformKey);

    const tokenParams: Record<string, string> = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };

    // Add PKCE verifier if applicable
    const codeVerifier = cookieStore.get(`oauth_verifier_${platform}`)?.value;
    if (codeVerifier) {
      tokenParams.code_verifier = codeVerifier;
      cookieStore.delete(`oauth_verifier_${platform}`);
    }

    // Platform-specific adjustments
    if (platformKey === 'tiktok') {
      tokenParams.client_key = tokenParams.client_id;
      delete tokenParams.client_id;
    }

    // Exchange code for tokens
    let tokenHeaders: Record<string, string> | undefined;
    if (platformKey === 'twitter') {
      // Twitter requires Basic auth header
      const credentials = Buffer.from(
        `${config.clientId}:${config.clientSecret}`
      ).toString('base64');
      tokenHeaders = {
        Authorization: `Basic ${credentials}`,
      };
      delete tokenParams.client_id;
      delete tokenParams.client_secret;
    }

    const tokens = await exchangeCodeForToken(
      config.tokenUrl,
      tokenParams,
      tokenHeaders
    );

    // Fetch user info from platform
    const platformUserInfo = await fetchPlatformUserInfo(
      platformKey,
      tokens.access_token
    );

    // Get user's team ID (using user.id as team for now)
    const teamId = user.id;

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('id')
      .eq('team_id', teamId)
      .eq('platform', platformKey)
      .eq('platform_user_id', platformUserInfo.id)
      .single();

    if (existingConnection) {
      // Update existing connection
      await supabase
        .from('connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
          platform_username: platformUserInfo.username,
          platform_display_name: platformUserInfo.displayName,
          platform_avatar_url: platformUserInfo.avatarUrl,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id);
    } else {
      // Create new connection
      await supabase.from('connections').insert({
        team_id: teamId,
        platform: platformKey,
        platform_user_id: platformUserInfo.id,
        platform_username: platformUserInfo.username,
        platform_display_name: platformUserInfo.displayName,
        platform_avatar_url: platformUserInfo.avatarUrl,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        scopes: config.scopes,
        is_active: true,
      });
    }

    return NextResponse.redirect(
      new URL('/accounts?success=connected', baseUrl)
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=oauth_failed', baseUrl)
    );
  }
}

type PlatformUserInfo = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

async function fetchPlatformUserInfo(
  platform: Platform,
  accessToken: string
): Promise<PlatformUserInfo> {
  switch (platform) {
    case 'instagram': {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
      );
      const data = await response.json();
      return {
        id: data.id,
        username: data.username,
      };
    }

    case 'youtube': {
      const response = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      const channel = data.items?.[0];
      return {
        id: channel?.id || '',
        username: channel?.snippet?.customUrl || channel?.snippet?.title || '',
        displayName: channel?.snippet?.title,
        avatarUrl: channel?.snippet?.thumbnails?.default?.url,
      };
    }

    case 'tiktok': {
      const response = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,username',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      const user = data.data?.user;
      return {
        id: user?.open_id || '',
        username: user?.username || user?.display_name || '',
        displayName: user?.display_name,
        avatarUrl: user?.avatar_url,
      };
    }

    case 'twitter': {
      const response = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      return {
        id: data.data?.id || '',
        username: data.data?.username || '',
        displayName: data.data?.name,
      };
    }

    case 'linkedin': {
      // Try userinfo endpoint first (requires OpenID Connect)
      const userinfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (userinfoResponse.ok) {
        const data = await userinfoResponse.json();
        return {
          id: data.sub || '',
          username: data.email || data.name || '',
          displayName: data.name,
          avatarUrl: data.picture,
        };
      }

      // Fallback: try /v2/me endpoint
      const meResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (meResponse.ok) {
        const meData = await meResponse.json();
        const firstName = meData.localizedFirstName || meData.firstName?.localized?.en_US || '';
        const lastName = meData.localizedLastName || meData.lastName?.localized?.en_US || '';
        return {
          id: meData.id || '',
          username: `${firstName} ${lastName}`.trim() || meData.id || '',
          displayName: `${firstName} ${lastName}`.trim(),
          avatarUrl: meData.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier,
        };
      }

      // Last resort: generate ID from token
      console.error('LinkedIn: Could not fetch user info');
      return {
        id: `linkedin_${Date.now()}`,
        username: 'LinkedIn User',
        displayName: 'LinkedIn User',
        avatarUrl: undefined,
      };
    }

    case 'facebook': {
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,name,picture&access_token=${accessToken}`
      );
      const data = await response.json();
      return {
        id: data.id || '',
        username: data.name || '',
        displayName: data.name,
        avatarUrl: data.picture?.data?.url,
      };
    }

    case 'threads': {
      const response = await fetch(
        `https://graph.threads.net/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`
      );
      const data = await response.json();
      return {
        id: data.id || '',
        username: data.username || '',
        avatarUrl: data.threads_profile_picture_url,
      };
    }

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
