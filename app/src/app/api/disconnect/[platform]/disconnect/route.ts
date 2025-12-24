import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
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

interface RouteParams {
  params: Promise<{ platform: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { platform } = await params;

    // Validate platform
    if (!VALID_PLATFORMS.includes(platform as Platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const platformKey = platform as Platform;
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get connection ID from request body
    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID required' },
        { status: 400 }
      );
    }

    // Delete the connection (ensure it belongs to the user's team and matches platform)
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)
      .eq('team_id', user.id)
      .eq('platform', platformKey);

    if (error) {
      console.error('Failed to disconnect account:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
