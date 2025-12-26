import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
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

    // Get the Facebook connection
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .eq('team_id', user.id)
      .eq('platform', 'facebook')
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: 'Facebook connection not found' },
        { status: 404 }
      );
    }

    // Fetch Facebook pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/me/accounts?access_token=${connection.access_token}`
    );
    const pagesData = await pagesResponse.json();

    if (!pagesData.data || !Array.isArray(pagesData.data)) {
      return NextResponse.json({ pages: [] });
    }

    // Fetch Instagram Business Account for each page
    const pages = await Promise.all(
      pagesData.data.map(async (page: any) => {
        let instagramAccountId: string | undefined;

        try {
          const igResponse = await fetch(
            `https://graph.facebook.com/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
          );
          const igData = await igResponse.json();
          instagramAccountId = igData.instagram_business_account?.id;
        } catch (error) {
          console.error(
            `Failed to fetch Instagram account for page ${page.id}:`,
            error
          );
        }

        return {
          id: page.id,
          name: page.name,
          access_token: page.access_token,
          instagram_business_account_id: instagramAccountId,
        };
      })
    );

    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error fetching Facebook pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook pages' },
      { status: 500 }
    );
  }
}
