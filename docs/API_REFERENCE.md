# Socialaize API Reference (Captured)

## OAuth Flow

### 1. Initiate OAuth
```
POST https://appwrite.socialaize.com/v1/functions/oauthmanager/executions
```

**Request Body:**
```json
{
  "body": "{\"databaseId\":\"main\",\"provider\":\"google\",\"teamId\":\"USER_TEAM_ID\",\"fingerprint\":\"BROWSER_FINGERPRINT\"}",
  "async": false,
  "path": "/initiate",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "x-is-dev": "false",
    "x-socialaize-user-jwt": "JWT_TOKEN",
    "z-redirect-to": "https://socialaize.com/auth/oauth-callback"
  }
}
```

**Response:** Returns OAuth URL to redirect user to.

### 2. OAuth Callback
```
https://oauthmanager.socialaize.com/callback
```
Handles the OAuth callback from providers.

---

## OAuth Scopes by Platform

### Google/YouTube
```
https://www.googleapis.com/auth/youtube
https://www.googleapis.com/auth/youtube.channel-memberships.creator
https://www.googleapis.com/auth/youtube.force-ssl
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/youtube.upload
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/youtubepartner
https://www.googleapis.com/auth/yt-analytics-monetary.readonly
https://www.googleapis.com/auth/yt-analytics.readonly
openid
```

### TikTok
```
user.info.basic
user.info.profile
user.info.stats
video.publish
video.upload
video.list
portability.postsandprofile.ongoing
portability.postsandprofile.single
```

---

## Database Schemas

### `oauth` Table - OAuth Connections
```typescript
interface OAuthConnection {
  $id: string;                    // Connection ID
  scope: string;                  // OAuth scopes granted
  providerMetadata: any | null;
  pollingLastRun: number | null;  // Unix timestamp of last poll
  active: boolean;                // Is connection active
  refreshTokenExpiresAt: number | null;
  status: 'active' | 'inactive';
  platform: 'google' | 'youtube' | 'tiktok' | 'instagram' | 'facebook' | etc;
  userId: string;                 // Socialaize user ID
  userPlatformId: string;         // Platform's user ID (channel ID, openId, etc)
  createdAccountId: string;       // Same as $id usually
  teamIds: string[];              // Teams this connection belongs to
  providerId: string;             // Internal provider ID
  refreshToken: string;           // OAuth refresh token
  accessToken: string;            // OAuth access token
  expiresAt: number;              // Token expiry (unix timestamp)
  tokenType: string | null;
}
```

### `tiktok` Table - TikTok Profiles
```typescript
interface TikTokProfile {
  $id: string;                    // Same as OAuth connection ID
  userId: string;                 // Socialaize user ID
  avatarId: string;               // Media library avatar ID
  openId: string;                 // TikTok open_id
  unionId: string;                // TikTok union_id
  username: string;               // @handle
  displayName: string;
  avatarUrl100: string;
  avatarUrl: string;
  avatarLargeUrl: string;
  bioDescription: string;
  profileDeepLink: string;        // vm.tiktok.com link
  isVerified: boolean;
  followingCount: number;
  followerCount: number;
  likesCount: number;
  videoCount: number;
  creatorInfo: any | null;
}
```

### `google` Table - YouTube Channels
```typescript
interface YouTubeChannel {
  $id: string;                    // Same as OAuth connection ID
  channelId: string;              // YouTube channel ID (UC...)
  userId: string;                 // Socialaize user ID
  customUrl: string;              // @handle
  title: string;                  // Channel name
  description: string | null;
  publishedAt: number;            // Unix timestamp
  defaultLanguage: string | null;
  thumbnailUrl: string;
  country: string | null;
  viewCount: number;
  subscriberCount: number;
  videoCount: number;
  hiddenSubscriberCount: boolean | null;
  uploadsPlaylistId: string;      // UU... playlist
  favoritesPlaylistId: string | null;
  likesPlaylistId: string;
}
```

### `google` Table - Google Profiles (separate table)
```typescript
interface GoogleProfile {
  $id: string;
  avatarId: string;
  userId: string;
  googleId: string;               // Google user ID
  resourceName: string;           // people/ID
  channelIds: string[];           // Associated YouTube channels
  displayName: string;
  primaryEmail: string;
  givenName: string;
  familyName: string;
  lastUpdated: number;
  profilePhotoUrl: string;
}
```

### `socialaize_data` Table - User/Team Settings & Billing
```typescript
interface UserSettings {
  $id: string;                    // User ID
  subscriptionStatus: 'active' | 'inactive';
  subscriptionPlan: 'free' | 'pro' | 'business';
  isYearly: boolean;

  // Limits
  connectionsUsed: number;
  connectionsMax: number;
  usersMax: number;
  usersUsed: number;
  maxTeams: number;
  teamsUsed: number;
  teamIds: string[];

  // Storage
  storageUsed: number;            // MB
  storageTotal: number;           // MB (512 for free)

  // AI
  aiCredits: number;              // Base credits
  aiCreditsUsed: number;
  addtlAICredits: number;         // Bonus credits

  // Stripe
  customerId: string | null;
  planId: string | null;
  subscriptionId: string | null;
  billingCycle: 'month' | 'year';
  billingInterval: number;
  cancelAtPeriodEnd: boolean;

  // Payment status
  lastPaymentFailureAt: number | null;
  lastPaymentFailureCode: string | null;
  consecutiveFailureCount: number;

  // Features
  chatEnabled: boolean;
  encodingEnabled: boolean;
  enableIndexing: boolean;
}
```

### `workflows` Table - Workflow Definitions
```typescript
interface Workflow {
  $id: string;                    // Workflow ID (ULID)
  ownerId: string;                // User who created it
  teamId: string;                 // Team it belongs to
  name: string;
  description: string;
  isActive: boolean;
  triggerAccountId: string;       // OAuth connection ID to monitor
  triggerAction: 'on_new_post';   // Trigger type
  tags: string[];
}
```

---

## Teams Structure

Each OAuth connection creates its own team:
```
oa_{connectionId}  →  "OAuth Account {platform}"
```

User's personal team:
```
{userId}  →  "{Name}'s Team"
```

Team memberships have roles:
- `owner`
- `admin`
- `manager`

---

## Auth Endpoints

### Verify Session
```
GET https://socialaize.com/api/auth/verify.json
```

**Response:**
```json
{
  "user": {
    "$id": "USER_ID",
    "name": "Name",
    "email": "email@example.com",
    "emailVerification": true,
    ...
  },
  "sessionToken": "JWT_TOKEN"
}
```

### Chat List
```
GET /api/chat/list?limit=10&status=active
```

---

## Appwrite Query Syntax

Queries are passed as URL-encoded JSON:

```javascript
// Equal
{"method":"equal","attribute":"userId","values":["USER_ID"]}

// Contains (for arrays)
{"method":"contains","attribute":"teamIds","values":["TEAM_ID"]}

// Order
{"method":"orderDesc","attribute":"$createdAt"}

// Limit
{"method":"limit","values":[500]}

// Greater than
{"method":"greaterThan","attribute":"timestamp","values":[123456789]}

// Or
{"method":"or","values":[
  {"method":"equal","attribute":"targetTeamId","values":["ID1"]},
  {"method":"equal","attribute":"sourceTeamId","values":["ID1"]}
]}
```

---

## Key IDs Format

All IDs are ULIDs (26 chars, base32):
```
01KCZ2BJMG1E9A5YWWRNTM6WEM
```

OAuth connection IDs are MD5 hashes (32 chars hex):
```
15401bac67d092c50e3f50806e04275d
```
