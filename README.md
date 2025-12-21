# Kipu

Social media automation platform. Socialaize, but better.

## Why Kipu?

Socialaize has gaps:
- No content editing before cross-posting
- No filtering (hashtags, keywords)
- Garbage free tier (2 connections lol)
- No workflow duplication
- Weak AI features
- No conditional logic
- No public API

Kipu fixes all of that.

## Docs

| File | Purpose |
|------|---------|
| `docs/ANSWERS.MD` | Full Socialaize feature breakdown |
| `docs/COMPETITIVE_GAPS.md` | What we do better |
| `docs/PLATFORM_ANALYSIS.md` | Platform integration notes |
| `docs/TECH_STACK.md` | Socialaize's actual stack |

## Kipu Stack (Planned)

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 + TypeScript |
| UI | Tailwind + shadcn/ui |
| Backend | Supabase (auth, db, storage, realtime) |
| Queue | Trigger.dev or Inngest |
| AI | OpenAI API |
| Payments | Stripe |

## Core Features (MVP)

- [ ] Multi-platform OAuth (TikTok, YouTube, Instagram, etc.)
- [ ] Workflow builder (trigger → actions)
- [ ] Content preview/edit before publish
- [ ] Hashtag/keyword filtering
- [ ] AI caption rewrite per platform
- [ ] Workflow templates & duplication
- [ ] Content calendar
- [ ] Media library

## Differentiators

- [ ] Conditional branching (if/else in workflows)
- [ ] Public API + webhooks
- [ ] Performance analytics per workflow
- [ ] Approval workflows for teams
- [ ] Actually usable free tier

## Platform Support (Target)

| Platform | Trigger | Target | Priority |
|----------|---------|--------|----------|
| TikTok | ✅ | ✅ | P0 |
| YouTube | ❌ | ✅ | P0 |
| Instagram | ✅ | ✅ | P0 |
| Threads | ✅ | ✅ | P1 |
| LinkedIn | ❌ | ✅ | P1 |
| Facebook | ✅ | ✅ | P2 |
| Twitter/X | ✅ | ✅ | P1 |
| Bluesky | ✅ | ✅ | P2 |
| Pinterest | ✅ | ✅ | P2 |
