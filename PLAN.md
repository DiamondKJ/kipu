# Kipu Implementation Plan

## Stack Decision

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 15 (App Router) | SSR, API routes, modern React |
| UI | Tailwind + shadcn/ui | Fast, dark mode built-in, matches Socialaize aesthetic |
| Database | Supabase (Postgres) | Auth, DB, Storage, Realtime - all in one |
| Background Jobs | Trigger.dev | Better DX than raw cron, handles retries |
| OAuth | Custom (not NextAuth) | Need full token control for platform APIs |

---

## Phase 1: Foundation (Week 1)

### 1.1 Project Setup
- [ ] Initialize Next.js 15 with TypeScript
- [ ] Setup Tailwind + shadcn/ui
- [ ] Setup Supabase project
- [ ] Setup Trigger.dev project
- [ ] Environment variables structure
- [ ] Basic layout (sidebar, topbar)

### 1.2 Database Schema
```sql
-- Users (Supabase Auth handles this)
-- We extend with profiles table

profiles
  id (uuid, references auth.users)
  name
  avatar_url
  created_at

teams
  id
  name
  owner_id
  created_at

team_members
  team_id
  user_id
  role (owner/admin/member)

connections
  id
  team_id
  platform (tiktok/youtube/instagram/etc)
  platform_user_id
  platform_username
  platform_avatar_url
  access_token (encrypted)
  refresh_token (encrypted)
  token_expires_at
  scopes
  is_active
  last_polled_at
  created_at

workflows
  id
  team_id
  name
  description
  is_active
  trigger_connection_id
  trigger_action (on_new_post)
  created_at
  updated_at

workflow_steps
  id
  workflow_id
  order_index
  step_type (publish/ai_rewrite/delay)
  target_connection_id
  config (jsonb)
  created_at

workflow_runs
  id
  workflow_id
  status (pending/running/completed/failed)
  trigger_data (jsonb)
  started_at
  completed_at
  error

workflow_step_runs
  id
  run_id
  step_id
  status
  input_data (jsonb)
  output_data (jsonb)
  error
  started_at
  completed_at

posts
  id
  team_id
  workflow_run_id
  connection_id
  platform
  platform_post_id
  content_type
  caption
  media_url
  status (scheduled/published/failed)
  scheduled_at
  published_at
  created_at

media
  id
  team_id
  folder_id
  filename
  storage_path
  mime_type
  size_bytes
  created_at

media_folders
  id
  team_id
  parent_id
  name
  created_at
```

### 1.3 Auth Flow
- [ ] Supabase Auth setup (email/password, Google OAuth for login)
- [ ] Protected routes middleware
- [ ] Auto-create team on signup
- [ ] Session management

---

## Phase 2: OAuth Connections (Week 2)

### 2.1 OAuth Infrastructure
- [ ] Encryption for tokens (use Supabase Vault or custom)
- [ ] Token refresh job
- [ ] Connection status tracking

### 2.2 TikTok OAuth
- [ ] Register TikTok app (developer portal)
- [ ] OAuth flow: /api/oauth/tiktok/initiate → /api/oauth/tiktok/callback
- [ ] Scopes: user.info.basic, user.info.profile, video.list, video.publish, video.upload
- [ ] Fetch and store profile data
- [ ] Token refresh logic

### 2.3 YouTube OAuth
- [ ] Register Google Cloud project
- [ ] OAuth flow: /api/oauth/youtube/initiate → /api/oauth/youtube/callback
- [ ] Scopes: youtube.upload, youtube.readonly, userinfo.profile
- [ ] Fetch channel data
- [ ] Token refresh logic

### 2.4 Accounts Page UI
- [ ] Platform grid with connect buttons
- [ ] Connected account cards (avatar, username, stats)
- [ ] Disconnect functionality
- [ ] Connection limit enforcement

---

## Phase 3: Workflow Builder (Week 3)

### 3.1 Workflow List Page
- [ ] List all workflows for team
- [ ] Create new workflow button
- [ ] Workflow card (name, status, trigger info, last updated)
- [ ] Toggle active/inactive
- [ ] Delete workflow

### 3.2 Workflow Editor
- [ ] Trigger selection (pick connected account)
- [ ] Visual flow (trigger → steps → end)
- [ ] Add step button
- [ ] Step types:
  - Publish Content (select target account, platform config)
- [ ] Edit/delete steps
- [ ] Save workflow
- [ ] Activate/deactivate

### 3.3 Publish Step Config (per platform)
```typescript
// YouTube config
{
  privacy: 'public' | 'unlisted' | 'private',
  category_id: number,
  tags: string[],
  made_for_kids: boolean,
  notify_subscribers: boolean
}

// TikTok config
{
  privacy_level: 'public' | 'friends' | 'private',
  allow_comments: boolean,
  allow_duet: boolean,
  allow_stitch: boolean
}
```

---

## Phase 4: Trigger & Execution Engine (Week 4)

### 4.1 Polling Job (Trigger.dev)
- [ ] Cron job every 5 minutes
- [ ] For each active workflow:
  - Fetch trigger account's recent posts
  - Compare with last_polled_at
  - If new post → create workflow_run

### 4.2 TikTok Polling
- [ ] GET /v2/video/list/ (requires video.list scope)
- [ ] Store last seen video ID
- [ ] Detect new videos

### 4.3 Workflow Executor
- [ ] Process workflow_run
- [ ] Execute each step in order
- [ ] Handle failures, retries
- [ ] Update status

### 4.4 YouTube Publisher
- [ ] Download video from TikTok (or get URL)
- [ ] Upload to YouTube via resumable upload API
- [ ] Set metadata (title, description, tags, privacy)
- [ ] Store platform_post_id

---

## Phase 5: Dashboard & Polish (Week 5)

### 5.1 Dashboard
- [ ] Quick stats (connections, workflows, posts)
- [ ] Recent activity feed
- [ ] Connected accounts preview
- [ ] Quick actions

### 5.2 Calendar
- [ ] Month view
- [ ] Show scheduled/published posts
- [ ] Filter by status
- [ ] Click to view post details

### 5.3 Media Library
- [ ] Upload files (Supabase Storage)
- [ ] Folder structure
- [ ] File browser UI
- [ ] Storage usage tracking

### 5.4 Settings
- [ ] Profile settings
- [ ] Theme toggle (dark/light/system)
- [ ] Password change

---

## Phase 6: Additional Platforms (Week 6+)

Priority order:
1. Instagram (Meta API)
2. Threads (Meta API)
3. Twitter/X
4. LinkedIn
5. Facebook Pages
6. Pinterest
7. Bluesky
8. Mastodon

---

## File Structure

```
kipu/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx (dashboard home)
│   │   ├── accounts/
│   │   ├── workflows/
│   │   │   ├── page.tsx (list)
│   │   │   ├── new/
│   │   │   └── [id]/
│   │   ├── calendar/
│   │   ├── media/
│   │   └── settings/
│   └── api/
│       ├── oauth/
│       │   ├── [platform]/
│       │   │   ├── initiate/
│       │   │   └── callback/
│       ├── workflows/
│       ├── connections/
│       └── webhooks/
├── components/
│   ├── ui/ (shadcn)
│   ├── layout/
│   ├── workflows/
│   └── accounts/
├── lib/
│   ├── supabase/
│   ├── platforms/
│   │   ├── tiktok.ts
│   │   ├── youtube.ts
│   │   └── ...
│   ├── encryption.ts
│   └── utils.ts
├── jobs/ (Trigger.dev)
│   ├── poll-triggers.ts
│   ├── execute-workflow.ts
│   └── refresh-tokens.ts
└── types/
```

---

## Environment Variables

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Google/YouTube
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Trigger.dev
TRIGGER_API_KEY=

# Encryption
ENCRYPTION_KEY=

# Later: Meta, Twitter, LinkedIn, etc.
```

---

## MVP Scope (Strict)

**In:**
- Email/password auth
- TikTok → YouTube workflow (one direction)
- Basic workflow builder (trigger + publish action)
- Dashboard with stats
- Accounts page
- Calendar view
- Media library (basic)

**Out (for now):**
- AI features
- Team collaboration
- Multiple action steps
- Content editing before publish
- Filtering
- Billing/payments
- All platforms except TikTok + YouTube

---

## Next Steps

1. Run `npx create-next-app@latest` with TypeScript, Tailwind, App Router
2. Add shadcn/ui
3. Setup Supabase project + schema
4. Build auth flow
5. Build layout (sidebar, topbar)
6. Start OAuth flows
