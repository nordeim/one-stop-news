Here is Part 3 of the consolidated OneStopNews Master Project Architecture Document (PAD) v2.0.
This section covers the definitive component designs, operational procedures, testing strategy, risk register, and deployment checklist.
PART III: COMPONENT DESIGN 7. Authentication & Authorization
7.1 3-Layer Defense-in-Depth Model
Layer
Location
Purpose
Rule
Layer 1 (UX)
proxy.ts
Optimistic redirect for unauthenticated users hitting /admin/_
NOT a security boundary. No DB calls. Cookie presence check only.
Layer 2 (Route)
app/(admin)/layout.tsx
Session validation & RBAC enforcement
Calls auth.api.getSession(). Redirects to /sign-in if invalid.
Layer 3 (Server Action)
features/_/actions.ts
Mutations require explicit authorization
Verifies session.user.role === 'admin' before executing any domain logic.
7.2 Better Auth & Session Schema
Better Auth manages session lifecycle. The following Drizzle tables must exist in the schema for the database adapter to function, but direct writes are prohibited (use auth.api._ methods).
typescript
123456789101112131415161718192021222324 8. Ingestion Pipeline
8.1 Ingestion Job Handler (bullmq ingest queue)
typescript
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566676869707172737475767778798081828384
8.2 Importance Scoring Algorithm
Scoring runs in the score queue after ingestion. Weights are fixed and auditable.
typescript
123456789101112131415161718192021222324252627282930313233 9. AI Summarization Pipeline
9.1 Prompt Construction & Content Assembly
typescript
1234567
9.2 Dual-Model Strategy & Fallback
Primary: claude-3-5-haiku-20241022. Fallback: gpt-4o-mini.
typescript
12345678910111213
9.3 Source-Cited Disclosure Enforcement
Critical Trust Requirement: The AI response must be validated by Zod before database insertion. If validation fails, the job retries with a strict system prompt or marks summaryStatus: 'needs_review'.
typescript
1234567891011 10. Search & Caching Architecture
10.1 FTS Query Builder (Production)
typescript
1234567891011121314151617181920212223242526
10.2 Autocomplete (pg_trgm)
typescript
123456789101112131415
10.3 Phase 2 BM25 Migration Path
sql
123456
10.4 Cache Invalidation Taxonomy
Trigger
Method
Scope
Use Case
User Mutation
revalidateTag(tag, { type: 'layout' })
Immediate
Read-your-writes after Server Action
Worker Completion
revalidateTag(tag, { maxAge: 'max' })
Background
Feed refresh after ingestion/scoring
Admin Action
revalidatePath('/admin/_')
Immediate
Source CRUD, category updates
Cache Component
use cache + cacheLife('stable')
Edge/CDN
Static nav, source lists, SEO shells
PART IV: OPERATIONS & DELIVERY 11. Infrastructure & Local Development
11.1 Docker Compose
yaml
12345678910111213141516171819202122232425
11.2 init.sql (DB Bootstrap)
sql
123 12. Environment Variable Schema
Validated via Zod at application startup. Missing/invalid vars cause immediate exit.
typescript
12345678910111213141516 13. Observability & Alerting
Structured Logging: JSON format, includes correlationId, jobId, sourceId, durationMs.
Metrics Exposed: Queue depth (bullmq:ingest:depth), job duration histograms, AI token usage counters, DB pool utilization %.
Alert Rules (PagerDuty/Slack):
sourceHealth.consecutiveFailures > 3 for Tier-1 source
queue.summarize.depth > 500 for > 15 minutes
db.pool.active_connections > 80% of max_connections
ai.error_rate > 5% over 5-minute window 14. Operational Runbooks
🔴 Runbook 1: Ingestion Source Failure
Identify: Check sourceHealthSnapshots or BullMQ failed jobs.
Diagnose: curl -I <source.feedUrl> (check HTTP status, robots.txt, SSL expiry).
Mitigate:
If 429/Rate-Limited: Increase pollIntervalMinutes, add exponential backoff.
If 403/Blocked: Rotate User-Agent, check if source moved to paywall.
If Feed Broken: Admin marks sources.isActive = false. Manual feed URL update.
Recover: await ingestQueue.upsertJobScheduler(...) to restart polling. Clear consecutive failures in DB.
🔴 Runbook 2: AI Summarization Incident
Identify: summarize queue depth spikes. failed jobs show ZodError or RateLimitError.
Diagnose: Check Anthropic/OpenAI status pages. Verify API keys in env.
Mitigate:
If API Down: Toggle summaryStatus to pending in DB. Queue will retry on backoff.
If Hallucination Rate High: Update prompt template version, set needs_review for recent outputs.
Recover: Restart workers. Run drizzle-kit to verify summaries schema matches prompt expectations.
🔴 Runbook 3: Database Connection Exhaustion
Identify: FATAL: remaining connection slots are reserved for non-replication superuser connections.
Diagnose: SELECT count(\*), state FROM pg_stat_activity GROUP BY state;
Mitigate:
Scale down Worker concurrency immediately (summarize → 2, ingest → 10).
Verify Lazy Proxy pattern is active (lib/db/index.ts).
If Web App is leaking connections: Deploy hotfix, clear Next.js server cache.
Recover: Restart Postgres (if self-hosted) or scale up instance. Re-enable worker concurrency. 15. Testing Strategy
Tier
Tool
Coverage Target
Validation Criteria
Unit
Vitest
Domain logic, scoring, URL normalization, prompt builders

> 90% branch coverage. Deterministic mocks.
> Integration
> @lib/db/test + Testcontainers
> Drizzle queries, BullMQ job handlers, auth flows
> Ephemeral PG17 + Redis. Schema matches prod.
> E2E
> Playwright
> Feed load, search, admin source add, summary generation, PPR hydration
> Critical paths pass on main merge.
> Performance
> k6
> Queue throughput, TTFB, FCP, INP
> Queue: >50 jobs/min. Web: TTFB < 200ms, LCP < 2.5s.
> Accessibility
> axe-core + Playwright
> WCAG 2.1 AA compliance
> 0 critical violations. Keyboard nav complete.
> Security
> OWASP ZAP + Snyk
> Auth bypass, XSS, SQLi, dependency vulns
> 0 high/critical. Secrets scanned. 16. Risk Register
> Risk
> Probability
> Impact
> Mitigation Strategy
> AI Hallucination / Fabrication
> Medium
> High
> Strict Zod schema, sourcesCited enforcement, needs_review fallback, human-in-the-loop admin dashboard.
> Source Blocking / Feed Breakage
> High
> Medium
> Graceful degradation (excerpt → title_only), User-Agent rotation, health monitoring, admin toggle.
> Redis Memory Pressure / Eviction
> Low
> High
> maxmemory-policy noeviction, explicit TTLs on feed slices, Upstash monitoring alerts, capacity planning.
> DB Migration Lock / Downtime
> Low
> Critical
> Additive-only schema changes, generate + migrate pre-deploy, read replica for heavy queries, zero-downtime deploy strategy.
> Auth.js Deprecation
> Resolved
> Resolved
> Better Auth adopted. Session revocation verified. Security-patch-only status acknowledged and mitigated.
> Queue Backlog / Worker Starvation
> Medium
> High
> Flow producer DAG ensures priority ordering. Concurrency tuned per resource type. Dead-letter queue inspection dashboard. 17. Deployment Checklist
> ✅ Pre-Deploy
> Env schema validates successfully on target environment
> drizzle-kit generate produces clean, additive SQL migration
> Queue depth < 100 pending jobs (drain if necessary)
> Feature flags set to false for untested components
> Backup taken (DB snapshot + Redis AOF dump)
> 🚀 Deploy
> Database Migration: Run tsx scripts/migrate.ts (pre-deploy step)
> Worker Rollout: Deploy Node.js worker service first (backward-compatible job schema)
> Web App Rollout: Deploy Next.js 16 app (PPR cache warm, edge invalidation)
> Cache Warm: Trigger revalidateTag for top 10 categories
> Queue Re-sync: Run bootstrapScheduler() to ensure idempotent cron alignment
> 🔍 Post-Deploy
> Health endpoint returns 200 OK with DB & Redis connectivity
> Playwright smoke tests pass on production URL
> BullMQ dashboard shows ingest & summarize queues processing normally
> Structured logs show 0 errors in first 15 minutes
> AI token usage & cost projection within expected baseline
> PPR cache serving static shells (verified via x-nextjs-cache headers)
> End of Part 3.
> This concludes the OneStopNews Master Project Architecture Document (PAD) v2.0. The document is now fully consolidated, strictly aligned with PRD v2.0, and production-ready for engineering execution. All contradictions have been resolved, critical patterns have been preserved, and operational guardrails are explicitly defined.
