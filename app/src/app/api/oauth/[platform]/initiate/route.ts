import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getOAuthConfig, getRedirectUri } from '@/lib/oauth/config';
import {
  buildAuthUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from '@/lib/oauth/utils';
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
  try {
    const { platform } = await params;

    // Validate platform
    if (!VALID_PLATFORMS.includes(platform as Platform)) {
      return NextResponse.redirect(
        new URL('/accounts?error=invalid_platform', request.url)
      );
    }

    const platformKey = platform as Platform;

    // Check if user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Get OAuth config for platform
    const config = getOAuthConfig(platformKey);
    const redirectUri = getRedirectUri(platformKey);

    // Generate state and PKCE values
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store state and code verifier in cookies
    const cookieStore = await cookies();
    cookieStore.set(`oauth_state_${platform}`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    // For platforms that support PKCE (Twitter)
    if (config.additionalParams?.code_challenge_method) {
      cookieStore.set(`oauth_verifier_${platform}`, codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
      });
    }

    // Build authorization URL
    const authParams: Record<string, string> = {
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    };

    // Add PKCE if required
    if (config.additionalParams?.code_challenge_method) {
      authParams.code_challenge = codeChallenge;
      authParams.code_challenge_method = config.additionalParams.code_challenge_method;
    }

    // Add any additional platform-specific params
    if (config.additionalParams) {
      Object.entries(config.additionalParams).forEach(([key, value]) => {
        if (key !== 'code_challenge_method') {
          authParams[key] = value;
        }
      });
    }

    // Platform-specific adjustments
    if (platformKey === 'tiktok') {
      // TikTok uses client_key instead of client_id
      authParams.client_key = authParams.client_id;
      delete authParams.client_id;
    }

    const authUrl = buildAuthUrl(config.authUrl, authParams);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=oauth_failed', request.url)
    );
  }
}
