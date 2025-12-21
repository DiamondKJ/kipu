# Socialaize Platform Analysis

## Overview
Social media management SaaS platform with:
- Centralized posting/scheduling
- Cross-platform automation workflows
- AI-assisted content creation
- Team collaboration
- Media library

---

## Architecture

### Workflow Model
```
TRIGGER (1 per workflow)
    ↓
ACTION 1 (e.g., Publish Content)
    ↓
ACTION 2 (e.g., AI Generate Title)
    ↓
ACTION N...
    ↓
END
```

### Workflow Creation Wizard (4 Steps)
1. Name Your Workflow
2. Connect Trigger Account
3. Configure Actions
4. Review & Activate

---

## Platform Support Matrix

| Platform       | As Trigger | As Target | Notes |
|----------------|------------|-----------|-------|
| Facebook Pages | ✅         | ✅        | Monitor page posts |
| Instagram      | ✅         | ✅        | Posts and reels |
| Threads        | ✅         | ✅        | |
| TikTok         | ✅         | ✅        | Videos |
| Pinterest      | ✅         | ✅        | Pins |
| Mastodon       | ✅         | ✅        | Toots |
| Bluesky        | ✅         | ✅        | |
| LinkedIn       | ❌         | ✅        | Target only |
| YouTube        | ❌         | ✅        | Target only, videos only |

---

## Action Types

### 1. Publish Content
- Schedule or immediate publish
- Platform-specific formatting
- Select target platform/account

### 2. Browse Library
- Template-based actions
- Pre-configured sequences

### 3. AI-Powered Actions
- AI Generate Title (e.g., TikTok → YouTube Shorts title)
- Labeled "HIGH IMPACT"
- Up to 3 recommendations per workflow

---

## Resource Limits (Free Plan)

| Resource       | Limit |
|----------------|-------|
| Connections    | 2     |
| Storage        | 0.5 GB (512 MB) |
| Team Members   | 1     |
| Teams          | 1     |
| AI Credits     | 5 base + 5 bonus |

**AI Credits**: 1 credit = 1,000 tokens

---

## Data Models (Inferred)

### User
- id
- name
- email
- phone
- language
- theme (light/dark/system)
- password_hash
- plan_type
- referral_code?

### Team
- id
- name
- owner_id
- members[]
- shared_accounts[]

### ConnectedAccount
- id
- user_id/team_id
- platform (enum)
- platform_user_id
- access_token
- refresh_token?
- display_name
- connected_at
- status

### Workflow
- id
- name
- description
- user_id/team_id
- status (ACTIVE/INACTIVE)
- trigger
- actions[]
- created_at
- updated_at

### Trigger
- platform
- account_id
- event_type (NEW_POST)

### Action
- type (PUBLISH/AI_GENERATE/TEMPLATE)
- order
- config{}
- target_platform?
- target_account_id?

### Post
- id
- user_id
- content
- media[]
- platforms[]
- status (SCHEDULED/PUBLISHED/FAILED/PENDING/CANCELLED)
- scheduled_at
- published_at

### Media
- id
- user_id
- filename
- folder_id?
- size_bytes
- mime_type
- url
- created_at

---

## UI Components

### Navigation
- Sidebar (collapsible?)
- Top bar with user greeting
- Keyboard shortcuts (Cmd+K search, Escape)

### Dashboard Widgets
- Quick stats (accounts, posts, views, engagements)
- Quick Insights
- Quick Actions
- Recent Content
- Activity Feed (with filters)

### Calendar View
- Monthly grid
- Status filters
- Today button
- Month navigation

---

## Coming Soon Features
- Create AI Post
- Schedule Content (enhanced?)
- Social Hub (centralized engagement)
- Hashtags (trending generation)
- Content Ideas (AI suggestions)

---

## Unknown/Questions

See QUESTIONS.md for investigation priorities.
