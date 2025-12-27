# File Cleanup System

This directory contains the post publishing and file cleanup functionality.

## How It Works

### 1. Immediate Cleanup (Automatic)
When you successfully publish a post with an image:
- The image is uploaded to `/public/uploads/`
- Facebook/Instagram fetches the image from the public URL
- **After successful posting**, the file is automatically deleted

### 2. Scheduled Cleanup (Cron Job)
For any orphaned files (e.g., failed posts, interrupted uploads):
- Call the cleanup API endpoint via cron
- Deletes files older than a specified age (default: 24 hours)

## Using the Cleanup API

### Endpoint
```
POST /api/post/cleanup
GET /api/post/cleanup  (same as POST, for easier testing)
```

### Parameters
- `maxAgeHours` (optional, default: 24): Delete files older than this many hours

### Authentication (Optional)
Set `CRON_SECRET` in your `.env` file:
```bash
CRON_SECRET=your-secret-key-here
```

Then include it in the Authorization header:
```bash
Authorization: Bearer your-secret-key-here
```

### Examples

#### Manual Test (No Auth)
```bash
# Delete files older than 24 hours (default)
curl -X POST http://localhost:3000/api/post/cleanup

# Delete files older than 1 hour
curl -X POST http://localhost:3000/api/post/cleanup?maxAgeHours=1
```

#### With Authentication
```bash
curl -X POST http://localhost:3000/api/post/cleanup \
  -H "Authorization: Bearer your-secret-key-here"
```

#### Using Vercel Cron Jobs
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/post/cleanup",
      "schedule": "0 */6 * * *"
    }
  ]
}
```
This runs every 6 hours.

#### Using External Cron Services
Use services like:
- **Cron-job.org**: Free, easy to setup
- **EasyCron**: Supports authentication headers
- **GitHub Actions**: Use scheduled workflows

Example GitHub Action (`.github/workflows/cleanup.yml`):
```yaml
name: Cleanup Old Uploads
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup endpoint
        run: |
          curl -X POST https://your-domain.com/api/post/cleanup \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Response Format
```json
{
  "message": "Cleaned up 5 old file(s)",
  "deletedCount": 5,
  "maxAgeHours": 24,
  "deletedFiles": ["1234567890-image1.jpg", "..."],  // Only in debug mode
  "errors": []  // Only if errors occurred
}
```

## Debug Mode
Set `DEBUG_OAUTH=true` in your `.env` to see detailed logs:
- Files being deleted immediately after posts
- Scheduled cleanup operations
- List of deleted files in API response
