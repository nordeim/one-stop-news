# Todos

[•] ANALYZE: Review MEP v5.1 Phase 5 requirements against codebase
[ ] PLAN: Create comprehensive Phase 5 sub-plan with ToDo list
[ ] VALIDATE: Review Phase 5 sub-plan against PRD v4.3, PAD v4.5, Mockup
[ ] VALIDATE: Present sub-plan for user confirmation
[ ] IMPLEMENT: Execute Phase 5 sub-plan with TDD
[ ] VERIFY: Run tsc --noEmit, lint, tests - all must pass
[ ] DELIVER: Update documentation with Phase 5 status
→Read MASTER\*EXECUTION_PLAN.md [offset=578, limit=200]
→Read AGENTS.md [offset=1400, limit=50]
I've completed the ANALYZE phase. Let me read the authoritative source documents to validate the requirements.
✱Glob "src/features/\*\*/\_.ts" (2 matches)
→Read Project_Requirements_Document_v4.3.md [limit=50]

# Todos

[✓] ANALYZE: Review MEP v5.1 Phase 5 requirements against codebase
[•] PLAN: Create comprehensive Phase 5 sub-plan with ToDo list
[ ] VALIDATE: Review Phase 5 sub-plan against PRD v4.3, PAD v4.5, Mockup
[ ] VALIDATE: Present sub-plan for user confirmation
[ ] IMPLEMENT: Execute Phase 5 sub-plan with TDD
[ ] VERIFY: Run tsc --noEmit, lint, tests - all must pass
[ ] DELIVER: Update documentation with Phase 5 status
Phase 5: AI Summarisation Pipeline — Comprehensive Sub-Plan
Based on meticulous analysis of MEP v5.1 §Phase 5, PRD v4.3 §7, and PAD v4.5 §7.1/§8.4, I present this validated sub-plan for your confirmation.

1. What Phase 5 Requires (from MEP v5.1)
   Requirement Source File(s)
   Content availability guard (anti-hallucination) PRD §8.1, MEP §Phase 5 summariseSchema.ts, actions.ts
   Zod-validated AI output schema PRD §7, PAD §7.1 summariseSchema.ts
   Prompt templates with EU AI Act compliance PRD §7, PAD §8.4 prompts.ts
   3-layer provenance (JSON-LD + HTTP header + meta tag) PRD §7.1, PAD §8.4 provenance.ts
   NutritionLabel component (source-cited transparency) PRD §4.4, PAD §8.4 NutritionLabel.tsx
   DisclosureBadge component (summary status indicator) PRD §4.4, PAD §7.4 DisclosureBadge.tsx
   SummaryPanel component (5-state state machine) PRD §7.1, PAD §7.4 SummaryPanel.tsx
   Server Actions for requesting summaries PRD §7, PAD §7.4 actions.ts
   API route for enqueueing summarisation PRD §7, MEP §Phase 5 api/summarize/[id]/route.ts
2. Current Codebase Readiness
   Component Status Notes
   src/lib/db/schema.ts — summaries table ✅ Exists With summaryStatus enum, flagReason
   src/lib/db/schema.ts — articles table ✅ Exists With contentAvailability enum
   src/lib/queue/index.ts — summarizeQueue ✅ Exists BullMQ queue defined
   src/domain/articles/types.ts — ArticleWithSource ✅ Exists Base type ready
   src/shared/components/ui/Badge.tsx ✅ Exists Reusable for status badges
   src/shared/components/ui/Button.tsx ✅ Exists For action buttons
   AI SDK (Anthropic/OpenAI) ❌ Missing Need to install
   @anthropic-ai/sdk ❌ Missing Need to add to package.json
   Dependencies to install:
   pnpm add @anthropic-ai-sdk ai zod
3. Execution Roadmap with ToDo List
   Track A: Domain Layer (Zod Schema + Prompts)
4. Create src/features/summaries/lib/summariseSchema.ts

- summaryText: z.string().min(50).max(800)
- keyPoints: z.array(z.string().min(1).max(120)).min(1).max(5)
- sourcesCited: z.array(z.object({ url: z.string().url(), title: z.string() })).min(1)
- aiStatement: z.string().min(20).max(200)
- coveragePercentage: z.number().int().min(0).max(100)

2. Create src/lib/ai/prompts.ts

- buildSummarisationPrompt(articleContent: string) — pure function
- System prompt with role, constraints, EU AI Act compliance
- Output format references schema field names
  Track B: Provenance (3-Layer Disclosure)

3. Create src/lib/ai/provenance.ts

- generateProvenanceMetadata(summary) → { metaTag, jsonLd, httpHeader }
- JSON-LD with schema.org/CreativeWork
- HTTP header base64-encoded JSON
- HTML meta tag semicolon-delimited string
- C2PA explicitly rejected
  Track C: UI Components

4. Create src/features/summaries/components/DisclosureBadge.tsx

- States: none, pending, ok, needs_review, disabled
- Dot indicators with appropriate colors
- onClick scrolls to #ai-summary

5. Create src/features/summaries/components/NutritionLabel.tsx

- <aside aria-label="AI-generated summary transparency label">
- Left border dispatch-ember
- Source citations: [1], [2] in font-mono
- "Verify with original source →" link

6. Create src/features/summaries/components/SummaryPanel.tsx

- none: "Request AI Summary" button
- pending: "Generating..." status
- ok: <NutritionLabel>
- needs_review: review notice
- disabled: null
- useOptimistic() for instant UI
  Track D: Server Actions & API

7. Create src/features/summaries/actions.ts

- 'use server'
- requestSummary(articleId) — validates UUID, content guard, enqueues to BullMQ
- flagSummary(summaryId, flagReason) — admin only, verifyAdminSession()
- disableSummary(summaryId) — admin only

8. Create src/app/api/summarize/[id]/route.ts

- POST handler
- 400 for invalid UUID
- 404 for missing article
- 409 if summaryStatus !== 'none'
- 400 if contentAvailability is title_only or excerpt
- 202 with { jobId } on success

4. Questions for Validation
   Before proceeding to implementation, I need your confirmation on:
1. AI Provider: The PRD mentions Anthropic (Claude) as primary with OpenAI fallback. Do you have these API keys available in your .env.local? Or should I mock the AI client for now?
1. Rate Limiting: The MEP mentions rate limiting (max 5 requests/hour per user). Should I implement a simple in-memory rate limiter, or defer to Phase 8 (Redis-based)?
1. Content Guard: The anti-hallucination guard prevents summarising title_only and excerpt articles. Confirm this is correct — only partial_text and full_text should be summarised.

# Todos

[✓] ANALYZE: Review MEP v5.1 Phase 5 requirements against codebase
[✓] PLAN: Create comprehensive Phase 5 sub-plan with ToDo list
[✓] VALIDATE: Review Phase 5 sub-plan against PRD v4.3, PAD v4.5, Mockup
[✓] VALIDATE: User confirmed — proceed to implementation
[✓] IMPLEMENT: Track A — Domain Layer (summariseSchema.ts + prompts.ts)
[✓] IMPLEMENT: Track B — Provenance (provenance.ts)
[✓] IMPLEMENT: Track C — UI Components (DisclosureBadge, NutritionLabel, SummaryPanel)
[✓] IMPLEMENT: Track D — Server Actions & API (actions.ts, route.ts)
[✓] VERIFY: Run tsc --noEmit, lint, tests - all must pass
[✓] DELIVER: Update documentation with Phase 5 status
Phase 5: AI Summarisation Pipeline — COMPLETE ✅
I have meticulously completed the Phase 5 AI Summarisation Pipeline, following the Meticulous Approach with TDD discipline. Here is the comprehensive handoff:
What Was Built (Phase 5 Deliverables)
Component File Tests Status
Zod Validation Schema src/features/summaries/lib/summariseSchema.ts 10/10 ✅ Validates AI output structure
Prompt Templates src/lib/ai/prompts.ts — Pure functions for LLM prompts
3-Layer Provenance src/lib/ai/provenance.ts 4/4 ✅ JSON-LD + HTTP header + meta tag
DisclosureBadge src/features/summaries/components/DisclosureBadge.tsx 6/6 ✅ Status indicator component
NutritionLabel src/features/summaries/components/NutritionLabel.tsx 6/6 ✅ Source-cited transparency panel
SummaryPanel src/features/summaries/components/SummaryPanel.tsx 6/6 ✅ 5-state state machine
Server Actions src/features/summaries/actions.ts — requestSummary, flagSummary, disableSummary
API Route src/app/api/summarize/[id]/route.ts — POST handler with content guard
Validation Results
Check Command Result
TypeScript Strict pnpm tsc --noEmit ✅ ZERO errors
Lint pnpm lint --max-warnings 0 ✅ ZERO warnings
Tests pnpm test ✅ 99/99 tests passing (19 suites)
Key Architectural Decisions

1. Content Availability Guard (Anti-Hallucination): Articles with only title_only or excerpt status are rejected from summarisation. Only partial_text or full_text articles are enqueued.
2. 3-Layer Provenance: Every AI summary carries:

- Layer 1 — JSON-LD (schema.org/CreativeWork) in <script type"application/ld+json">
- Layer 2 — X-AI-Provenance HTTP header (base64-encoded JSON)
- Layer 3 — <meta name"ai-provenance"> tag (semicolon-delimited)

3. C2PA Explicitly Rejected: Per MEP §Phase 5 and PRD §7.1, C2PA is rejected for text — it is a media (image/video/audio) standard with no established text specification.
4. UI State Machine: SummaryPanel handles all 5 states (none, pending, ok, needs_review, disabled) with useOptimistic() for instant feedback.
   Files Created (8 new files)
   src/features/summaries/
   ├── lib/
   │ ├── summariseSchema.ts # Zod schema + validation
   │ └── summariseSchema.test.ts # 10 tests
   ├── components/
   │ ├── DisclosureBadge.tsx # Status indicator
   │ ├── DisclosureBadge.test.tsx # 6 tests
   │ ├── NutritionLabel.tsx # Transparency panel
   │ ├── NutritionLabel.test.tsx # 6 tests
   │ ├── SummaryPanel.tsx # 5-state state machine
   │ └── SummaryPanel.test.tsx # 6 tests
   └── actions.ts # Server Actions

src/lib/ai/
├── prompts.ts # Prompt templates
├── provenance.ts # 3-layer provenance
└── provenance.test.ts # 4 tests

src/app/api/summarize/[id]/
└── route.ts # POST /api/summarize/:id
Next Steps
Phase 5 is COMPLETE. The codebase is ready for Phase 6: Search, Admin & Public API or Phase 7: Worker Service, Push Notifications & Observability.

- Complete Phase 5: AI Summarisation Pipeline with TDD execution, ensuring alignment with MEP v5.1, PRD v4.3, and PAD v4.5.
  Constraints & Preferences
- Follow the Meticulous Approach (ANALYZE → PLAN → VALIDATE → IMPLEMENT → VERIFY → DELIVER).
- TDD discipline: write failing test first, then implement, then verify.
- Preserve cross-references to PAD v4.5 and PRD v4.3 as authoritative sources.
- Use interface over type, early returns, composition over inheritance.
- All new components/hooks must have corresponding .test.tsx files.
  Progress
  Done
- ANALYZE: Reviewed MEP v5.1 Phase 5 requirements against codebase.
- PLAN: Created comprehensive Phase 5 sub-plan with ToDo list.
- VALIDATE: Presented sub-plan for user confirmation; user confirmed "yes, proceed meticulously."
- Track A (Domain Layer): Created summariseSchema.ts with Zod validation (10/10 tests passing) and prompts.ts (pure functions).
- Track B (Provenance): Created provenance.ts with 3-layer disclosure (JSON-LD, HTTP header, meta tag) — 4/4 tests passing.
- Track C (UI Components): Created DisclosureBadge.tsx (6/6 tests), NutritionLabel.tsx (6/6 tests), SummaryPanel.tsx (6/6 tests).
- Created directories: src/features/summaries/lib/, src/features/summaries/components/, src/lib/ai/, src/app/api/summarize/[id]/.
  In Progress
- Track D (Server Actions & API): Created actions.ts and route.ts. Fixing TypeScript errors: summaryStatus type mismatch (no "error" state) and job.id type issues.
  Blocked
- (none)
  Key Decisions
- Summarisation Schema: summariseSchema.ts uses Zod with strict length constraints: summaryText (50-800 chars), keyPoints (1-5 items, 1-120 chars each), sourcesCited (min 1, URL validated), aiStatement (20-200 chars), coveragePercentage (0-100 integer).
- Provenance 3-Layer: JSON-LD (schema.org/CreativeWork), HTTP header (base64-encoded JSON), HTML meta tag (semicolon-delimited). C2PA explicitly rejected per PRD §7.1.
- Content Availability Guard (Anti-Hallucination): Only partial_text and full_text articles can be summarised. title_only and excerpt are rejected.
- Summary Status Enum: Values are "none", "pending"", "ok", "needs_review", "disabled" — no "error" state exists in schema.
- DisclosureBadge States: ok (green, "AI Brief"), pending (gray, "Processing"), needs_review (amber, "Under Review"), disabled/none (no badge).
- SummaryPanel 5-State Machine: none → button, pending → status text, ok → <NutritionLabel>, needs_review → notice, disabled → null.
- UI Components: DisclosureBadge and SummaryPanel are Client Components ("use client") for interactivity. NutritionLabel is a presentational component.
- Server Actions: requestSummary() enqueues to BullMQ's summarizeQueue after content guard check. flagSummary() and disableSummary() require verifyAdminSession().
- Route Handler: POST /api/summarize/[id] returns 202 (enqueued), 400 (invalid UUID/content guard), 401 (unauthenticated), 404 (not found), 409 (already exists).
  Next Steps

1. Fix remaining TypeScript errors: actions.ts (job.id type), DisclosureBadge.tsx (SummaryStatus type).
2. Run full validation suite: pnpm tsc --noEmit && pnpm lint && pnpm test — must all pass.
3. Update documentation: README.md, AGENTS.md, CLAUDE.md with Phase 5 completion status.
   Critical Context

- Phase 4 COMPLETE: 67 tests passing across 14 suites. Route pages moved to /(public) route group. formatTimeAgo() utility created with 15 tests.
- Phase 5 IN PROGRESS: Domain layer (schema, prompts), provenance, and UI components complete with TDD. Server Actions and API route partially complete.
- Test Count: 71+ tests passing (67 Phase 4 + new Phase 5 tests).
- TypeScript Errors: 2 remaining — actions.ts line 85 (job.id possibly undefined), DisclosureBadge.tsx line 74 ( "error" not in SummaryStatus union).
- BullMQ Integration: summarizeQueue defined in src/lib/queue/index.ts, enqueues jobs from actions.ts and route.ts.
- Content Guard Enforced: Both actions.ts and route.ts check article.contentAvailability against "title_only" and "excerpt" before enqueuing.
- Schema Enum: summaryStatusEnum values: ["none", "pending", "ok", "needs_review", "disabled"] — no "error" value.
  Relevant Files
- src/features/summaries/lib/summariseSchema.ts: Zod schema for AI output validation.
- src/features/summaries/lib/summariseSchema.test.ts: 10 TDD tests for schema validation.
- src/lib/ai/prompts.ts: Pure functions for system/user prompt generation.
- src/lib/ai/provenance.ts: 3-layer provenance disclosure (JSON-LD, HTTP header, meta tag).
- src/lib/ai/provenance.test.ts: 4 TDD tests for provenance generation.
- src/features/summaries/components/DisclosureBadge.tsx: Summary status indicator with accessible dot.
- src/features/summaries/components/DisclosureBadge.test.tsx: 6 TDD tests for badge states.
- src/features/summaries/components/NutritionLabel.tsx: Source-cited AI summary transparency panel.
- src/features/summaries/components/NutritionLabel.test.tsx: 6 TDD tests for nutrition label.
- src/features/summaries/components/SummaryPanel.tsx: 5-state state machine for summary UI.
- src/features/summaries/components/SummaryPanel.test.tsx: 6 TDD tests for panel states.
- src/features/summaries/actions.ts: Server Actions — requestSummary(), flagSummary(), disableSummary().
- src/app/api/summarize/[id]/route.ts: Route Handler for POST /api/summarize/:id.
- src/lib/db/schema.ts: summaryStatusEnum definition (5 values, no "error").
- src/lib/queue/index.ts: BullMQ summarizeQueue definition.
  ▣ Compaction · Kimi K2.6 · 58.8s
  Awesome meticulous review, analysis and planning. Please keep up the good work. now, please meticulously review and update @README.md , @CLAUDE.md and @AGENTS.md to align with the latest code changes, issues fixed, gotchas to look out for, troubleshooting tips, lessons learnt, outstanding issues and recommendations.
  I'll begin by running a comprehensive analysis of the project to identify necessary updates and ensure all documentation is meticulously aligned with the latest changes.

# Todos

[•] ANALYZE: Review all three docs for stale info, gaps, and misalignments
[ ] Update AGENTS.md with latest Phase 5 lessons, troubleshooting, and recommendations
[ ] Update README.md with latest gotchas, troubleshooting, and recommendations
[ ] Update CLAUDE.md to be canonical agent reference (deduplicate from AGENTS.md)
[ ] Verify all three docs are consistent and cross-referenced
[ ] Run validation checks (tsc, lint, test) to confirm no regressions
