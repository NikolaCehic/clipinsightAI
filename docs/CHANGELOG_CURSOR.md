# ClipInsight AI - Cursor Change Log

> This file tracks all changes made during the refactor. Append-only - never overwrite.
> Format follows `.cursorrules` specification.

---

## 2026-01-07T12:00:00Z — Initialize refactor changelog and project structure

**Reason:** Starting full SOP refactor based on provided specifications (SOP, Schema DB, Prompt Spec Pack). Need to track all changes for context continuity.

**Files changed:**
- `docs/CHANGELOG_CURSOR.md` (created)

**Notes:**
- Refactor plan covers 7 phases: Foundation → Pipeline → AI Agents → Workspaces → Artifacts → Analytics → Social
- Using Supabase (raw client), Trigger.dev for background jobs, Gemini for ASR/AI
- Following `.cursorrules` for grounded, non-hallucinated development

**Follow-ups:**
- Create new database schema (17 tables)
- Create TypeScript type definitions

---

## 2026-01-07T12:05:00Z — Create database schema v2 and TypeScript types

**Reason:** Implementing Phase 1 of refactor - foundation layer with new multi-tenant schema and comprehensive type definitions.

**Files changed:**
- `supabase/schema-v2.sql` (created) - Full database schema with 19 tables, enums, indexes, RLS policies, and utility functions
- `src/types/database.ts` (created) - TypeScript interfaces for all database tables and relationships
- `src/types/jobs.ts` (created) - Job state machine types, transitions, pipeline types, error codes, event types
- `src/types/contracts.ts` (created) - Generation contract types with defaults and utilities
- `src/types/index.ts` (updated) - Central export for all types with backward compatibility

**Notes:**
- Schema includes: users, workspaces, workspace_members, brand_presets, jobs, job_runs, media_assets, transcripts, insight_packs, artifacts, artifact_reviews, run_steps, product_events, connected_accounts, published_posts, post_metrics_daily, workspace_entitlements, daily_usage
- Added enums for type safety: job_source_type, job_status, run_trigger, run_status, media_kind, transcript_source, transcript_format, artifact_type, artifact_variant, artifact_status, reviewer_type, pipeline_step, step_status, workspace_role, social_provider
- State machine with 15 states and defined transitions
- Kept legacy types (ContentPackage, Project, UsageLog) for backward compatibility

**Follow-ups:**
- Install and configure Trigger.dev
- Implement state machine logic in lib/jobs/

---

## 2026-01-07T12:15:00Z — Implement Trigger.dev jobs and pipeline handlers

**Reason:** Phase 2 of refactor - implementing the job processing pipeline with state machine, Trigger.dev integration, and all pipeline step handlers.

**Files changed:**
- `src/trigger/client.ts` (created) - Trigger.dev client configuration
- `src/trigger/jobs/process-video.ts` (created) - Main video processing job orchestrator
- `src/lib/jobs/state-machine.ts` (created) - Job state machine with transitions, run/step management
- `src/lib/pipeline/validation.ts` (created) - Input validation and entitlement checking
- `src/lib/pipeline/ingestion.ts` (created) - Media upload and YouTube URL handling
- `src/lib/pipeline/transcription.ts` (created) - ASR using Gemini, quality assessment
- `src/lib/pipeline/insights.ts` (created) - Insight pack generation with structured JSON output
- `src/lib/pipeline/drafting.ts` (created) - Multi-format content generation (newsletter, blog, twitter, linkedin)
- `src/lib/pipeline/qa-review.ts` (created) - Automated QA scoring and auto-fix
- `src/lib/pipeline/delivery.ts` (created) - Artifact finalization and export
- `src/lib/pipeline/index.ts` (created) - Pipeline exports
- `src/lib/analytics/events.ts` (created) - Product event tracking
- `src/lib/prompts/index.ts` (created) - Versioned prompt templates for planner/writer/reviewer

**Notes:**
- Pipeline follows SOP state machine: RECEIVED → VALIDATED → INGESTED → TRANSCRIBED → INSIGHTS → DRAFTED → REVIEWED → DELIVERED → STORED → ANALYTICS_LOGGED
- Retry logic with exponential backoff (max 3 attempts)
- Error classification: RETRYABLE vs NON_RETRYABLE
- QA review includes auto-fix capability
- Prompts are versioned (v1) for future iteration

**Follow-ups:**
- Create API routes for job management
- Install Trigger.dev package
- Create UI components for job display
- Implement workspace management

---

## 2026-01-07T12:25:00Z — Create API routes for jobs and artifacts

**Reason:** Phase 3 - API layer for job management, artifact access, and Trigger.dev webhook endpoint.

**Files changed:**
- `src/app/api/jobs/route.ts` (created) - List jobs (GET), create job (POST) for workspace
- `src/app/api/jobs/[id]/route.ts` (created) - Get job details, update status, delete job
- `src/app/api/jobs/[id]/runs/route.ts` (created) - List runs, create regeneration run
- `src/app/api/artifacts/[id]/route.ts` (created) - Get artifact, export to markdown/html/text, track copy
- `src/app/api/trigger/route.ts` (created) - Trigger.dev webhook handler

**Notes:**
- All routes verify workspace membership before access
- Job creation triggers Trigger.dev event for background processing
- Artifact export supports markdown, html, and plain text formats
- Analytics events emitted for views, copies, exports, regenerations
- Role-based access: DELETE requires OWNER or ADMIN role

**Follow-ups:**
- Create workspace management API and UI
- Build job listing and detail UI components
- Install Trigger.dev npm package

---

## 2026-01-07T12:35:00Z — Create workspace API and job UI components

**Reason:** Phase 4-5 - Workspace management API and job UI components for the dashboard.

**Files changed:**
- `src/app/api/workspaces/route.ts` (created) - List workspaces (GET), create workspace (POST)
- `src/app/api/workspaces/[id]/route.ts` (created) - Get, update, delete workspace
- `src/app/api/workspaces/[id]/presets/route.ts` (created) - List and create brand presets
- `src/components/jobs/job-list.tsx` (created) - Job list component with status badges and progress
- `src/components/jobs/job-detail.tsx` (created) - Job detail with artifacts, copy, export, regenerate
- `src/components/jobs/create-job.tsx` (created) - Create job form (YouTube URL or upload)
- `src/components/jobs/index.ts` (created) - Job components exports
- `src/app/(dashboard)/dashboard/page.tsx` (updated) - Added tabs for Quick Generate, New Job, My Jobs
- `src/app/(dashboard)/dashboard/jobs/[id]/page.tsx` (created) - Job detail page

**Notes:**
- Dashboard now has 3 tabs: Quick Generate (original flow), New Job (pipeline flow), My Jobs (list)
- Job list polls for updates every 5 seconds when jobs are in progress
- Job detail shows progress, artifacts with copy/export, and regenerate button
- Workspace creation includes default free tier entitlement
- Brand presets allow saving content preferences per workspace

**Follow-ups:**
- Install Trigger.dev npm package and test pipeline
- Create analytics dashboard UI
- Add user workspace selection/switching

---

## 2026-01-07T12:45:00Z — Complete analytics dashboard and finalize dependencies

**Reason:** Phase 6 - Updated analytics page with job-based metrics and added required npm dependencies.

**Files changed:**
- `src/app/(dashboard)/analytics/page.tsx` (updated) - New analytics with job stats, usage tracking, engagement metrics
- `package.json` (updated) - Added @trigger.dev/sdk, @trigger.dev/nextjs, date-fns
- `env.example` (created) - Environment variables template with all required/optional vars

**Notes:**
- Analytics page shows: total jobs, completed, failed, artifacts created
- Usage section shows daily limits vs consumption
- Engagement section shows copies, exports, regenerations
- Success rate visualization with progress bar
- Trigger.dev packages added for background job processing
- date-fns added for date formatting in job list/detail

**Follow-ups:**
- Run `npm install` to install new dependencies
- Run SQL schema in Supabase (`supabase/schema-v2.sql`)
- Test full pipeline end-to-end

---

## 2026-01-07T13:00:00Z — Fix auth to create workspaces and support email login

**Reason:** Users were getting "User not found" 404 errors because the auth system wasn't creating workspaces for new users, which the new Jobs API requires.

**Files changed:**
- `src/lib/auth.ts` (updated) - Complete rewrite to:
  - Generate consistent user IDs from email (so users keep same ID across logins)
  - Create workspace + workspace_member + entitlement when user signs up
  - Check if existing users have workspaces, create if missing
  - Remove old schema columns (subscription_tier, credits_remaining)
  - Support email/password authentication
- `src/app/(auth)/login/page.tsx` (updated) - Added name and password fields with toggle

**Notes:**
- Demo mode: Any email works without password
- New users automatically get a workspace and free tier entitlement
- Existing users without workspaces get one created on next login
- User IDs are now consistent (hash of email) so database records persist

**Follow-ups:**
- Test login flow end-to-end
- Verify job creation works after login

---

## Summary of Changes

### Phase 1: Foundation
- Database schema v2 with 19 tables and enums
- TypeScript types for all entities
- Job state machine definitions

### Phase 2: Pipeline
- Trigger.dev client and video processing job
- State machine implementation
- Pipeline step handlers (validation, ingestion, transcription, insights, drafting, QA, delivery)
- Analytics events tracking
- Versioned prompt templates

### Phase 3: API Layer
- Jobs API (list, create, get, update, delete)
- Job runs API (list, create for regeneration)
- Artifacts API (get, export, copy tracking)
- Workspaces API (list, create, get, update, delete)
- Brand presets API (list, create)
- Trigger.dev webhook endpoint

### Phase 4-5: UI
- Job list component with status badges and progress
- Job detail component with artifacts, copy, export, regenerate
- Create job form (YouTube URL or file upload)
- Updated dashboard with tabs (Quick Generate, New Job, My Jobs)
- Job detail page

### Phase 6: Analytics
- Updated analytics dashboard with job-based metrics
- Usage tracking and entitlement display
- Engagement metrics (copies, exports, regenerations)

### Files Created (28 new files):
- `docs/CHANGELOG_CURSOR.md`
- `supabase/schema-v2.sql`
- `src/types/database.ts`
- `src/types/jobs.ts`
- `src/types/contracts.ts`
- `src/trigger/client.ts`
- `src/trigger/jobs/process-video.ts`
- `src/lib/jobs/state-machine.ts`
- `src/lib/pipeline/validation.ts`
- `src/lib/pipeline/ingestion.ts`
- `src/lib/pipeline/transcription.ts`
- `src/lib/pipeline/insights.ts`
- `src/lib/pipeline/drafting.ts`
- `src/lib/pipeline/qa-review.ts`
- `src/lib/pipeline/delivery.ts`
- `src/lib/pipeline/index.ts`
- `src/lib/analytics/events.ts`
- `src/lib/prompts/index.ts`
- `src/app/api/jobs/route.ts`
- `src/app/api/jobs/[id]/route.ts`
- `src/app/api/jobs/[id]/runs/route.ts`
- `src/app/api/artifacts/[id]/route.ts`
- `src/app/api/trigger/route.ts`
- `src/app/api/workspaces/route.ts`
- `src/app/api/workspaces/[id]/route.ts`
- `src/app/api/workspaces/[id]/presets/route.ts`
- `src/components/jobs/job-list.tsx`
- `src/components/jobs/job-detail.tsx`
- `src/components/jobs/create-job.tsx`
- `src/components/jobs/index.ts`
- `src/app/(dashboard)/dashboard/jobs/[id]/page.tsx`
- `env.example`

### Files Updated (3 files):
- `src/types/index.ts` - Added exports for all new types
- `src/app/(dashboard)/dashboard/page.tsx` - Added tabs and job components
- `src/app/(dashboard)/analytics/page.tsx` - New job-based analytics
- `package.json` - Added Trigger.dev and date-fns dependencies

---

## 2026-01-07T14:00:00Z — Fix polling issues and improve Gemini error handling

**Reason:** Job list and job detail components were polling the API constantly even when jobs were complete or tab was hidden, causing unnecessary API calls. Also improved error classification for Gemini API failures.

**Files changed:**
- `src/components/jobs/job-list.tsx` (updated) - Added:
  - Complete list of terminal states (8 states total)
  - Visibility change listener to pause polling when tab is hidden
  - Immediate fetch when tab becomes visible
- `src/components/jobs/job-detail.tsx` (updated) - Same improvements as job-list
- `src/types/jobs.ts` (updated) - Added new error codes:
  - `API_QUOTA_EXCEEDED` - For Gemini 429 errors
  - `API_KEY_INVALID` - For auth errors
  - `API_UNAVAILABLE` - For service unavailable errors
- `src/lib/pipeline/insights.ts` (updated) - Added:
  - Error classification for Gemini API errors (429, 401, 503, timeout, network)
  - Changed model from `gemini-2.0-flash-exp` to `gemini-1.5-flash` for better free tier limits
- `src/lib/pipeline/drafting.ts` (updated) - Same error classification improvements and model update

**Notes:**
- Terminal states now include: ANALYTICS_LOGGED, FAILED, FAILED_VALIDATION, BLOCKED_ENTITLEMENT, REQUIRES_MANUAL_REVIEW, NEEDS_USER_INPUT, STORED, DELIVERED
- Polling only happens when document.visibilityState === 'visible'
- When tab becomes visible, fetch happens immediately, then polling resumes
- Gemini API errors are now properly classified for better user feedback:
  - 429/quota/RESOURCE_EXHAUSTED → API_QUOTA_EXCEEDED
  - 401/API key/UNAUTHENTICATED → API_KEY_INVALID
  - 503/unavailable/UNAVAILABLE → API_UNAVAILABLE
  - timeout/DEADLINE_EXCEEDED → TIMEOUT
  - network/ECONNREFUSED → NETWORK_ERROR

**Follow-ups:**
- Consider adding toast notifications for API errors
- Add retry button for transient failures

---

## 2026-01-07T14:15:00Z — Add delete job functionality to job list

**Reason:** User requested ability to remove jobs from the list to stop unnecessary API polling for completed/failed jobs.

**Files changed:**
- `src/components/jobs/job-list.tsx` (updated) - Added:
  - Import `Trash2` icon from lucide-react
  - `deletingId` state to track which job is being deleted
  - `deleteJob` function that calls DELETE `/api/jobs/[id]` endpoint
  - Delete button on each job card with confirmation dialog
  - Optimistic UI update (removes job from list immediately after delete)

**Notes:**
- Delete button uses `stopPropagation` to prevent navigation when clicking
- Shows loading spinner while delete is in progress
- Confirmation dialog prevents accidental deletions
- Jobs are removed from local state immediately for instant feedback

**Update:** Replaced native `confirm()` with shadcn Dialog component:
- Proper modal UI with title, description, and job preview
- Cancel and Delete buttons with loading state
- Error display if delete fails
- Matches app design system

---

## 2026-01-07T14:30:00Z — Add Trigger.dev documentation

**Reason:** User requested documentation explaining how Trigger.dev integration works.

**Files created:**
- `docs/TRIGGER_DEV.md` - Comprehensive guide covering:
  - File structure overview
  - Job creation flow diagram
  - Pipeline execution steps (7 steps)
  - Retry logic and error classification
  - State machine diagram
  - Environment variables
  - Development vs production setup
  - Troubleshooting guide
  - API reference for triggering events and defining jobs

---

