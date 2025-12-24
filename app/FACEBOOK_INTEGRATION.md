# Facebook & Instagram Integration - Progress Notes

## Overview
This document tracks the integration of Facebook login with Instagram Business Account support. The goal is to enable users to connect their Facebook account, retrieve their managed Facebook Pages, and access linked Instagram Business Accounts for cross-posting.

## What Was Completed

### 1. OAuth Scopes Updated
**File:** `src/lib/oauth/config.ts:82-96`

Added Instagram and user profile permissions to Facebook OAuth:
```typescript
scopes: [
  'email',
  'public_profile',
  'pages_manage_posts',
  'pages_read_engagement',
  'pages_show_list',
  'instagram_basic',
  'instagram_content_publish',
  'publish_video',
]
```

### 2. Long-Lived Token Exchange (Currently Commented Out)
**File:** `src/app/api/oauth/[platform]/callback/route.ts:124-142`

Logic was added to exchange short-lived tokens for long-lived tokens (60-day expiry) but is currently commented out. To re-enable, uncomment lines 124-142.

### 3. Facebook Pages & Instagram Account Fetching
**File:** `src/app/api/oauth/[platform]/callback/route.ts:343-387`

Created `fetchFacebookPagesAndInstagram()` function that:
- Fetches all Facebook Pages the user manages via `/me/accounts`
- For each page, queries for linked Instagram Business Account
- Retrieves page-specific access tokens (required for posting)
- Returns structured metadata

### 4. Metadata Storage
**File:** `src/app/api/oauth/[platform]/callback/route.ts:150-159, 186, 206`

Facebook pages and Instagram accounts are stored in `connections.metadata` field:
```typescript
{
  pages: [
    {
      id: "page_id",
      name: "Page Name",
      access_token: "page_token",  // Required for posting to this page
      instagram_business_account_id: "ig_id"  // Optional, if IG linked
    }
  ]
}
```

## Current State

- ✅ Facebook OAuth scopes configured with Instagram permissions
- ✅ Pages and Instagram accounts fetched during OAuth callback
- ✅ Metadata stored in database
- ⚠️ Long-lived token exchange is commented out (may need for production)
- ⚠️ No UI to display retrieved pages yet
- ❌ Posting functionality not yet implemented

## How to Test the Facebook OAuth Flow

### 1. Start the development server
```bash
npm run dev
```

### 2. Navigate to the accounts page
```
http://localhost:3000/accounts
```

### 3. Click "Connect" on Facebook
This will initiate the OAuth flow

### 4. Authorize the app on Facebook
Grant permissions for:
- Public profile
- Email
- Pages management
- Instagram access

### 5. Check the connection was created
After redirect, you should be back at `/accounts?success=connected`

## How to View Retrieved Pages

### Option 1: Create a Debug API Endpoint

Create `src/app/api/debug/connections/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: connections } = await supabase
    .from('connections')
    .select('*')
    .eq('team_id', user.id)
    .eq('platform', 'facebook');

  return NextResponse.json(connections);
}
```

Then visit: `http://localhost:3000/api/debug/connections`

### Option 2: Check Database Directly

If using Supabase local dev:
```bash
npx supabase db execute "SELECT platform, platform_username, metadata FROM connections WHERE platform = 'facebook';"
```

Or use the Supabase Studio UI:
```bash
npx supabase studio
```

Navigate to Table Editor → connections → filter by platform='facebook'

### Option 3: Add to Accounts Page UI

You could display the pages directly on the accounts page by fetching and rendering them from the connection metadata.

## Reference: Testing Code Structure

The original testing code (`src/testing.ts`) demonstrates:
- **Lines 54-88**: Long-lived token exchange
- **Lines 159-197**: Fetching pages and Instagram accounts
- **Lines 346-428**: Posting to Facebook and Instagram using page tokens

## Next Steps

### Immediate
1. **Test the OAuth flow** - Connect a Facebook account and verify pages are retrieved
2. **View the metadata** - Use one of the methods above to confirm pages are stored correctly
3. **Decide on long-lived tokens** - Uncomment lines 124-142 if needed for production

### Future Work
1. **Display Pages in UI** - Show connected pages and Instagram accounts in the accounts page
2. **Implement Posting** - Create API endpoints for posting to Facebook/Instagram using the stored page tokens
3. **Token Refresh** - Implement logic to refresh expired tokens
4. **Error Handling** - Add better error messages for missing permissions or unlinked Instagram accounts

## Important Notes

- **Page Access Tokens**: When posting to Facebook, you MUST use the page's access token (stored in metadata), not the user's token
- **Instagram Requirements**: Instagram posting requires:
  - An Instagram Business Account (not Personal)
  - The account must be linked to a Facebook Page
  - The page must have the correct permissions
  - Posts must include an image (text-only not supported)
- **Token Expiry**: Short-lived tokens expire in ~1-2 hours, long-lived tokens last ~60 days
- **Facebook API Version**: Currently using v24.0 (updated from v18.0)

## Environment Variables Required

```env
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Troubleshooting

### "Permission denied" errors
- Check that your Facebook App has the required permissions enabled in the App Dashboard
- Verify the app is not in Development Mode if testing with non-admin users

### No Instagram accounts found
- Ensure the Instagram account is a Business or Creator account
- Verify the Instagram account is linked to a Facebook Page
- Check that the user has admin access to both the Page and Instagram account

### Token errors
- If using commented-out long-lived token exchange, uncomment it
- Check token expiry in the database
- Implement token refresh logic for expired tokens

## Database Schema Reference

```sql
-- connections table relevant fields
id: uuid
team_id: uuid (references user.id for now)
platform: text ('facebook')
platform_user_id: text
platform_username: text
platform_display_name: text
platform_avatar_url: text
access_token: text (user's token)
refresh_token: text (null for Facebook)
token_expires_at: timestamp
scopes: text[]
metadata: jsonb (contains pages array)
is_active: boolean
created_at: timestamp
updated_at: timestamp
```

## Questions to Address

- [ ] Do we need long-lived tokens? (Currently commented out)
- [ ] Should we store token creation timestamp to calculate when to refresh?
- [ ] How should we handle pages that lose Instagram connections?
- [ ] Should we periodically re-fetch pages to keep metadata fresh?
- [ ] UI/UX for selecting which page to post to?
