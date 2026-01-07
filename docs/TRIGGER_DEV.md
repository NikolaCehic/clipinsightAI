# Trigger.dev Integration Guide

> Background job processing for the ClipInsight AI video-to-content pipeline.

---

## Overview

Trigger.dev handles **long-running background jobs** that process videos through multiple AI steps. This prevents HTTP timeouts and allows users to navigate away while jobs complete.

---

## File Structure

```
src/
├── trigger/
│   ├── client.ts                    # Trigger.dev client configuration
│   └── jobs/
│       └── process-video.ts         # Main video processing job
├── lib/
│   ├── jobs/
│   │   └── state-machine.ts         # Job state management
│   └── pipeline/
│       ├── index.ts                 # Pipeline exports
│       ├── validation.ts            # Step 1: Validate input & entitlements
│       ├── ingestion.ts             # Step 2: Upload/download media
│       ├── transcription.ts         # Step 3: ASR with Gemini
│       ├── insights.ts              # Step 4: Generate insight pack
│       ├── drafting.ts              # Step 5: Generate content formats
│       ├── qa-review.ts             # Step 6: Quality review & auto-fix
│       └── delivery.ts              # Step 7: Finalize artifacts
└── app/
    └── api/
        ├── trigger/
        │   └── route.ts             # Webhook handler for Trigger.dev
        └── jobs/
            └── route.ts             # Creates jobs & triggers processing
```

---

## How It Works

### 1. Job Creation Flow

```
User submits video URL/upload
         ↓
    POST /api/jobs
         ↓
    Create job record in DB (status: RECEIVED)
         ↓
    Create job_run record (status: PENDING)
         ↓
    triggerClient.sendEvent('video.process', payload)
         ↓
    Trigger.dev picks up event → runs processVideoJob
```

### 2. Pipeline Execution

The `processVideoJob` in `src/trigger/jobs/process-video.ts` runs 7 steps sequentially:

| Step | Handler | Updates Job Status To | Description |
|------|---------|----------------------|-------------|
| 1 | `validateJob()` | `VALIDATED` | Check entitlements, validate URL/file |
| 2 | `ingestMedia()` | `INGESTED` | Download YouTube video or store upload |
| 3 | `transcribeMedia()` | `TRANSCRIBED` | ASR using Gemini (or use provided transcript) |
| 4 | `generateInsights()` | `INSIGHTS` | Create insight pack (themes, quotes, outline) |
| 5 | `generateDrafts()` | `DRAFTED` | Generate newsletter, blog, twitter, linkedin |
| 6 | `reviewArtifacts()` | `REVIEWED` | QA scoring, auto-fix issues |
| 7 | `deliverArtifacts()` | `DELIVERED` | Finalize and store artifacts |

After all steps: `STORED` → `ANALYTICS_LOGGED`

### 3. Retry Logic

Each step has automatic retry with exponential backoff:

```typescript
// From src/types/jobs.ts
DEFAULT_RETRY_CONFIG = {
  max_attempts: 3,
  initial_delay_ms: 1000,
  max_delay_ms: 30000,
  backoff_multiplier: 2,
}
```

**Retryable errors** (will retry up to 3 times):
- `UPLOAD_FAILED`
- `TRANSCRIPTION_FAILED`
- `GENERATION_FAILED`
- `RATE_LIMITED`
- `TIMEOUT`
- `NETWORK_ERROR`

**Non-retryable errors** (fail immediately):
- `INVALID_INPUT`
- `QUOTA_EXCEEDED`
- `API_KEY_INVALID`
- `CONTENT_POLICY_VIOLATION`

---

## Key Files Explained

### `src/trigger/client.ts`

```typescript
import { TriggerClient } from '@trigger.dev/sdk';

export const triggerClient = new TriggerClient({
  id: 'clipinsight-ai',
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL,
});
```

Initializes the Trigger.dev client with your API key.

### `src/trigger/jobs/process-video.ts`

The main job definition:

```typescript
export const processVideoJob = triggerClient.defineJob({
  id: 'process-video',
  name: 'Process Video Content',
  version: '1.0.0',
  trigger: eventTrigger({ name: 'video.process' }),
  
  run: async (payload, io) => {
    // Execute pipeline steps in order
    for (const step of PIPELINE_STEP_ORDER) {
      const result = await STEP_HANDLERS[step](context);
      // Handle success/failure/retry...
    }
  },
});
```

### `src/app/api/trigger/route.ts`

Webhook handler that Trigger.dev calls:

```typescript
import { createAppRoute } from '@trigger.dev/nextjs';
import { triggerClient } from '@/trigger/client';
import '@/trigger/jobs/process-video'; // Register jobs

export const { POST, dynamic } = createAppRoute(triggerClient);
```

### `src/app/api/jobs/route.ts`

Creates jobs and triggers processing:

```typescript
// After creating job and run in database...
await triggerClient.sendEvent({
  name: 'video.process',
  payload: {
    job_id: job.id,
    job_run_id: run.id,
    workspace_id: membership.workspace_id,
    user_id: user.id,
  },
});
```

---

## Environment Variables

```env
# Required for Trigger.dev
TRIGGER_API_KEY=tr_dev_xxxxx        # Your Trigger.dev API key
TRIGGER_API_URL=https://api.trigger.dev  # Or your self-hosted URL
```

---

## State Machine

Jobs progress through these states:

```
RECEIVED → VALIDATED → INGESTED → TRANSCRIBED → INSIGHTS → DRAFTED → REVIEWED → DELIVERED → STORED → ANALYTICS_LOGGED
                ↓           ↓           ↓            ↓          ↓          ↓
         FAILED_VALIDATION  |     NEEDS_USER_INPUT   |    REQUIRES_MANUAL_REVIEW
                            ↓                        ↓
                    BLOCKED_ENTITLEMENT           FAILED
```

**Terminal States** (no more processing):
- `ANALYTICS_LOGGED` - Success
- `FAILED` - Generic failure
- `FAILED_VALIDATION` - Invalid input
- `BLOCKED_ENTITLEMENT` - Quota exceeded
- `REQUIRES_MANUAL_REVIEW` - High-risk content
- `NEEDS_USER_INPUT` - Low quality transcript

---

## Development vs Production

### Local Development

1. Install Trigger.dev CLI:
   ```bash
   npm install -g @trigger.dev/cli
   ```

2. Run the dev server:
   ```bash
   npx trigger-cli dev
   ```

3. Jobs will run locally with live logs in the Trigger.dev dashboard.

### Production

1. Deploy your Next.js app
2. Set `TRIGGER_API_KEY` in your hosting provider
3. Jobs run on Trigger.dev's infrastructure

---

## Monitoring

View job runs in the Trigger.dev dashboard:
- **https://cloud.trigger.dev** (if using cloud)
- See real-time logs, step progress, and errors
- Retry failed jobs manually

---

## Troubleshooting

### Jobs not starting?

1. Check `TRIGGER_API_KEY` is set
2. Verify webhook route is accessible: `POST /api/trigger`
3. Check Trigger.dev dashboard for errors

### Jobs failing immediately?

1. Check if it's a retryable error (will retry 3 times)
2. Look at `job_runs` table for `error_message`
3. Check `run_steps` table for which step failed

### Pipeline stuck in a state?

The job status reflects the last successful step. Check:
1. `run_steps` table for the current step's status
2. Trigger.dev dashboard for live logs
3. Server logs for uncaught errors

---

## API Reference

### Trigger an Event

```typescript
import { triggerClient } from '@/trigger/client';

await triggerClient.sendEvent({
  name: 'video.process',
  payload: {
    job_id: 'uuid',
    job_run_id: 'uuid',
    workspace_id: 'uuid',
    user_id: 'uuid',
  },
});
```

### Define a New Job

```typescript
import { eventTrigger } from '@trigger.dev/sdk';
import { triggerClient } from '../client';

export const myJob = triggerClient.defineJob({
  id: 'my-job-id',
  name: 'My Job Name',
  version: '1.0.0',
  trigger: eventTrigger({ name: 'my.event' }),
  run: async (payload, io) => {
    await io.logger.info('Job started', payload);
    // Your logic here
    return { success: true };
  },
});
```

---

## Cost Considerations

- Trigger.dev has a free tier with limited runs
- Each job run = 1 run (regardless of steps)
- Long-running jobs (>10 min) may need enterprise tier
- Consider batching small jobs if hitting limits

