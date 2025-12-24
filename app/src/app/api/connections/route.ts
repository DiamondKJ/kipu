import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/connections
 * Get all connections for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: connections, error } = await supabase
      .from('connections')
      .select('id, platform, platform_username, platform_display_name, platform_avatar_url, is_active')
      .eq('team_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    return NextResponse.json({ connections: connections || [] });
  } catch (error) {
    console.error('Connections fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}
