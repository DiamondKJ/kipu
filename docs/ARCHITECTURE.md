# Kipu Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js Frontend                         │
│                    (App Router, Server Actions)                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Supabase                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │   Auth   │  │ Database │  │ Storage  │  │ Edge Functions   │ │
│  │  (OAuth) │  │(Postgres)│  │ (Media)  │  │ (API endpoints)  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Background Job Queue                          │
│                    (Trigger.dev / Inngest)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Poll Triggers│  │Execute Steps │  │ Publish to Platforms │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     External APIs                                │
│  ┌────────┐ ┌─────────┐ ┌───────┐ ┌────────┐ ┌────────────────┐ │
│  │ TikTok │ │ YouTube │ │ Meta  │ │ OpenAI │ │ Other Platforms│ │
│  └────────┘ └─────────┘ └───────┘ └────────┘ └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

```sql
-- Users (managed by Supabase Auth, extended)
create table profiles (
  id uuid references auth.users primary key,
  name text,
  avatar_url text,
  plan text default 'free',
  created_at timestamptz default now()
);

-- Teams
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table team_members (
  team_id uuid references teams(id),
  user_id uuid references profiles(id),
  role text default 'member', -- owner, admin, member, viewer
  primary key (team_id, user_id)
);

-- Connected Accounts
create table connections (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),
  platform text not null, -- tiktok, youtube, instagram, etc.
  platform_user_id text not null,
  platform_username text,
  access_token text, -- encrypted
  refresh_token text, -- encrypted
  token_expires_at timestamptz,
  scopes text[],
  metadata jsonb, -- platform-specific data
  created_at timestamptz default now(),
  unique(team_id, platform, platform_user_id)
);

-- Workflows
create table workflows (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),
  name text not null,
  description text,
  status text default 'inactive', -- active, inactive, paused
  trigger_config jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workflow Steps (Actions)
create table workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id) on delete cascade,
  order_index int not null,
  step_type text not null, -- publish, ai_rewrite, filter, condition, delay
  config jsonb not null,
  created_at timestamptz default now()
);

-- Workflow Executions (History)
create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id),
  trigger_data jsonb, -- the content that triggered this run
  status text default 'pending', -- pending, running, completed, failed, skipped
  started_at timestamptz default now(),
  completed_at timestamptz,
  error_message text
);

create table workflow_step_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references workflow_runs(id) on delete cascade,
  step_id uuid references workflow_steps(id),
  status text default 'pending',
  input_data jsonb,
  output_data jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text
);

-- Posts (Content)
create table posts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),
  workflow_run_id uuid references workflow_runs(id),
  connection_id uuid references connections(id),
  platform text not null,
  platform_post_id text, -- ID on the platform after publishing
  content_type text, -- video, image, text
  caption text,
  media_urls text[],
  status text default 'draft', -- draft, scheduled, published, failed
  scheduled_at timestamptz,
  published_at timestamptz,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Media Library
create table media (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),
  folder_id uuid references media_folders(id),
  filename text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  metadata jsonb,
  created_at timestamptz default now()
);

create table media_folders (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),
  parent_id uuid references media_folders(id),
  name text not null,
  created_at timestamptz default now()
);
```

---

## Trigger Types

### Poll-Based Triggers
For platforms without webhooks, poll every 5-15 minutes:

```typescript
interface PollTrigger {
  type: 'poll';
  connection_id: string;
  platform: 'tiktok' | 'instagram' | 'threads' | 'pinterest' | 'bluesky' | 'youtube' | 'linkedin';
  poll_interval_minutes: number;
  last_checked_at: Date;
  last_post_id: string; // to detect new posts
  filters: {
    hashtags_include?: string[];
    hashtags_exclude?: string[];
    keywords_include?: string[];
    keywords_exclude?: string[];
    content_type?: 'video' | 'image' | 'text';
    min_duration_seconds?: number;
    max_duration_seconds?: number;
  };
}
```

### Webhook Triggers (where supported)
```typescript
interface WebhookTrigger {
  type: 'webhook';
  connection_id: string;
  platform: 'facebook' | 'youtube'; // platforms with webhook support
  webhook_url: string;
  webhook_secret: string;
}
```

---

## Step Types

### 1. Publish
```typescript
interface PublishStep {
  type: 'publish';
  connection_id: string;
  platform: string;
  config: {
    // Common
    use_original_caption: boolean;
    custom_caption?: string;
    schedule_at?: Date;

    // YouTube specific
    privacy?: 'public' | 'unlisted' | 'private';
    category_id?: number;
    tags?: string[];
    made_for_kids?: boolean;

    // Instagram specific
    share_to_feed?: boolean;

    // etc.
  };
}
```

### 2. AI Rewrite
```typescript
interface AIRewriteStep {
  type: 'ai_rewrite';
  config: {
    target_platform: string;
    tone?: 'professional' | 'casual' | 'funny' | 'educational';
    max_length?: number;
    include_hashtags?: boolean;
    include_emojis?: boolean;
    custom_instructions?: string;
  };
}
```

### 3. Filter (Continue/Skip)
```typescript
interface FilterStep {
  type: 'filter';
  config: {
    conditions: FilterCondition[];
    operator: 'and' | 'or';
  };
}

interface FilterCondition {
  field: 'caption' | 'hashtags' | 'duration' | 'type';
  operator: 'contains' | 'not_contains' | 'gt' | 'lt' | 'eq';
  value: string | number;
}
```

### 4. Condition (Branch)
```typescript
interface ConditionStep {
  type: 'condition';
  config: {
    conditions: FilterCondition[];
    operator: 'and' | 'or';
    if_true_steps: string[]; // step IDs
    if_false_steps: string[]; // step IDs
  };
}
```

### 5. Delay
```typescript
interface DelayStep {
  type: 'delay';
  config: {
    duration_minutes: number;
    // OR
    delay_until_time?: string; // "09:00"
    delay_until_day?: 'monday' | 'tuesday' | etc.;
  };
}
```

### 6. Approval (for teams)
```typescript
interface ApprovalStep {
  type: 'approval';
  config: {
    approvers: string[]; // user IDs
    timeout_hours: number;
    auto_approve_on_timeout: boolean;
  };
}
```

---

## Job Queue Architecture

Using Trigger.dev or Inngest for reliable background jobs:

### Jobs

1. **poll-triggers** - Runs every 5 min, checks all active workflows for new content
2. **execute-workflow** - Triggered when new content detected, runs through steps
3. **publish-content** - Handles actual API calls to platforms
4. **refresh-tokens** - Runs daily, refreshes OAuth tokens before expiry

### Flow

```
poll-triggers (cron: */5 * * * *)
    │
    ├─ Check TikTok for new videos
    ├─ Check Instagram for new posts
    └─ ... for each active trigger
         │
         └─ If new content found
              │
              ▼
         execute-workflow (job)
              │
              ├─ Run step 1 (filter) → skip if no match
              ├─ Run step 2 (ai_rewrite) → transform content
              ├─ Run step 3 (approval) → wait for approval
              └─ Run step 4 (publish) → queue publish job
                   │
                   ▼
              publish-content (job)
                   │
                   └─ Call platform API
                   └─ Update post status
                   └─ Send notification
```

---

## API Routes (Next.js App Router)

```
/api/auth/callback/[platform]  - OAuth callbacks
/api/webhooks/[platform]       - Incoming webhooks

/api/workflows                 - CRUD workflows
/api/workflows/[id]/run        - Manual trigger
/api/workflows/[id]/duplicate  - Clone workflow

/api/connections               - CRUD connections
/api/connections/[id]/refresh  - Refresh token

/api/posts                     - List posts
/api/posts/[id]               - Post detail
/api/posts/[id]/publish       - Manual publish

/api/media                    - Media library
/api/media/upload             - Upload files

/api/ai/rewrite               - AI caption rewrite
/api/ai/hashtags              - AI hashtag generation
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OAuth - TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# OAuth - YouTube/Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OAuth - Meta (Instagram, Facebook, Threads)
META_APP_ID=
META_APP_SECRET=

# OAuth - LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# OAuth - Twitter/X
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# AI
OPENAI_API_KEY=

# Jobs
TRIGGER_API_KEY= # or INNGEST_EVENT_KEY

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Encryption
ENCRYPTION_KEY= # for storing tokens
```
