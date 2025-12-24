# API Research Findings

## The Big Problem: TikTok Video Download

**TikTok does NOT provide video download URLs in their API.**

The Video List API (`/v2/video/list/`) returns:
- Metadata (title, description, duration)
- Embed links (for webview only)
- Thumbnail URLs (expire in 6 hours)
- **NO direct video file URLs**

### The Only Official Option: Data Portability API

- Returns videos as ZIP files (watermark-free .mp4)
- **ONLY works for EEA/UK users** (GDPR requirement)
- Only for users exporting their OWN data
- Async process (request → wait → download)
- Approval takes 3-4 weeks with detailed UX mockups required

### What This Means

Socialaize is either:
1. Using portability API (limiting to EU users)
2. Using unofficial scraping methods (ToS violation risk)
3. Only embedding, not actually transferring videos

---

## YouTube API - Solid

| Aspect | Details |
|--------|---------|
| Upload method | Resumable binary upload |
| Max file size | 256 GB |
| Max duration | 12 hours |
| Quota cost | **1,600 units per upload** |
| Default quota | 10,000 units/day = **~6 uploads/day** |
| Quota increase | Requires compliance audit |
| Token expiry | 24 hours (refresh needed) |

**Critical**: Projects created after July 2020 can only upload PRIVATE videos without completing compliance audit.

### Metadata Available During Upload
- title (max 100 chars)
- description (max 5,000 bytes)
- tags (max 500 chars total)
- categoryId
- privacyStatus (public/private/unlisted)
- publishAt (scheduled publish)
- madeForKids
- license

---

## Instagram Reels API - Good

| Aspect | Details |
|--------|---------|
| Account type | Business or Creator ONLY |
| Upload method | URL-based (host video on public URL) |
| Workflow | Create container → Poll status → Publish |
| Max file size | 100 MB (4GB for some) |
| Duration | 3-90 seconds for Reels tab |
| Aspect ratio | 9:16 required |
| Rate limit | **25 posts/day** |
| API calls | 200/hour per account |

### Container Workflow
```
1. POST /{user-id}/media?media_type=REELS&video_url={url}
   → Returns container_id

2. GET /{container-id}?fields=status_code
   → Poll until status = FINISHED

3. POST /{user-id}/media_publish?creation_id={container-id}
   → Returns published media ID
```

---

## Threads API - Good

| Aspect | Details |
|--------|---------|
| Status | General availability (June 2024) |
| Upload method | URL-based (same as Instagram) |
| Max video duration | 5 minutes |
| Max file size | 500MB - 1GB |
| Rate limit | **250 posts/day** |
| Character limit | 500 chars, 1 hashtag max |

Same container workflow as Instagram.

---

## Architecture Recommendations

### Job Queue: BullMQ
- Native job scheduling (cron, intervals)
- Event-driven (not polling-based)
- Built-in rate limiting
- Redis-based

### Database: PostgreSQL + Redis Hybrid
- Redis: Real-time scheduling, hot data
- PostgreSQL: Durable state, processed posts

### Polling Strategy
```sql
-- Atomic job claiming
SELECT * FROM polling_state
WHERE next_poll_at <= NOW()
FOR UPDATE SKIP LOCKED
LIMIT 100;
```

### Rate Limit Handling
- Maintain 20% cushion (stop at 80% of limit)
- Exponential backoff with jitter
- Max 3-5 retries

### Video Format Standard
- **Container**: MP4
- **Video codec**: H.264
- **Audio codec**: AAC
- **Resolution**: 1080x1920 (9:16) or 1920x1080 (16:9)
- **Frame rate**: 30-60 FPS

---

## Platform Comparison

| Platform | Trigger Support | Publish Support | Video Download | Rate Limit |
|----------|-----------------|-----------------|----------------|------------|
| TikTok | ✅ (poll video list) | ✅ | ❌ (EU only) | 600/min |
| YouTube | ✅ (poll uploads playlist) | ✅ | N/A | 6 uploads/day |
| Instagram | ✅ (webhooks available) | ✅ | N/A | 25 posts/day |
| Threads | ❌ | ✅ | N/A | 250 posts/day |
| Facebook | ✅ (webhooks) | ✅ | N/A | Varies |
| Twitter/X | ✅ (filtered stream) | ✅ | N/A | Varies |
| LinkedIn | ✅ (poll UGC posts) | ✅ | N/A | Varies |

---

## Critical Blockers

### 1. TikTok Video Access
No official way to download TikTok videos for non-EU users. Must decide:
- Limit to EU users only
- Use unofficial methods (risky)
- Pivot product direction
- User-assisted workflow (manual download)

### 2. YouTube Quota
6 uploads/day default is very limiting. Need compliance audit for production use.

### 3. Instagram Personal Accounts
Not supported. Users must convert to Business/Creator.
