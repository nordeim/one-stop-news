I now have a comprehensive understanding of all the source materials. Let me craft the CLAUDE.md plan by mapping what we know from the PRD/PAD/README to the skill's template sections. I need to present a plan, not the implementation.  
  
The key insight from the skill is that a CLAUDE.md should have these sections (from the template):  
1. Core Identity & Purpose  
2. Foundational Principles (Meticulous Approach 6-phase)  
3. Implementation Standards (language, framework, design system)  
4. Development Workflow (commands, scripts)  
5. Testing Strategy  
6. Code Quality Standards  
7. Git & Version Control  
8. Error Handling & Debugging  
9. Communication & Documentation  
10. Project-Specific Standards (Architecture, API, Database, etc.)  
  
For OneStopNews, I need to synthesize from:  
- PRD v4.3: Product goals, personas, design system, 3-layer disclosure, EU AI Act  
- PAD v4.5: ADRs, 5-layer request model, Lazy Proxy DB, BullMQ topology  
- README.md: Quick start, env vars, security, contributing conventions  
  
Key unique elements for this project's CLAUDE.md:  
1. The "Editorial Dispatch" anti-generic design mandate  
2. 5-Layer Request Model (not just standard web app)  
3. Lazy Proxy DB pattern (critical for Next.js build-time safety)  
4. EU AI Act Article 50 compliance (provenance, nutrition labels)  
5. BullMQ + separate worker (not monolith)  
6. Strict "no any" TypeScript with inference preference  
7. Auth DAL pattern (redirect() + cache() + DB validation)  
8. Content availability guards (preventing AI hallucination)  
  
I should present the plan as: section-by-section with specific content bullets traced to source documents. This way the user can validate before I write the file.  

────────────────────────────────────────────────────────────────────────────────  
  
PLAN: CLAUDE.md for OneStopNews  
  
### Synthesis of Source Documents  
  
I have analyzed the claude-md skill template, the framework-templates companion skill, and all three source documents (PRD v4.3, PAD v4.5, README.md). Below is the structured execution plan.  
  
────────────────────────────────────────────────────────────────────────────────  
  
### Section Map: CLAUDE.md ←→ Source Documents  
  
┌─────────────────────────────────┬───────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ CLAUDE.md Section               │ Primary Source(s)                                 │ Key Content                                                                                                                                      │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Core Identity                   │ README.md §Overview, §Key Features                │ "Topic-first news aggregation with source-cited AI summaries." 3 personas: Daily Scanner, Enterprise Analyst, Editor/Admin.                      │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Foundational Principles         │ claude-md template, PAD §Architecture Decision    │ Meticulous Approach 6-phase workflow. 7 locked ADRs. "Library Discipline" (Shadcn/Radix first).                                                  │ 
│                                 │ Records                                           │                                                                                                                                                  │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Implementation Standards        │ PRD §4, PAD §5, README §Contributing              │ TypeScript strict (no any). interface > type. Early returns. Composition. All UI states. Auth DAL with redirect(). Lazy Proxy DB. Zero any.      │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Next.js 16 Specifics            │ PRD §5.2, PAD §5, README §Critical Configuration  │ cacheComponents top-level. cacheLife profiles. turbopack top-level. experimental.viewTransition nested. proxy.ts not middleware.ts. Opt-in "use  │ 
│                                 │ Invariants                                        │ cache".                                                                                                                                          │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ React 19.2 Specifics            │ PAD §5.4                                          │ View Transitions progressive enhancement. <Activity> for zero-shift summary loading. useTransition for async navigation.                         │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Database & ORM                  │ PAD §7, README §Security & Compliance             │ Drizzle ORM with Lazy Proxy (max: 10 dedicated runtime). PgBouncer for serverless. Migration generate + migrate, never push. Named profiles.     │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Authentication & Authorization  │ PAD §8.1, PAD_compare recommendation              │ Auth.js v5 beta, Drizzle adapter. verifySession() with redirect() + cache() + DB user fetch. verifyAdminSession() redirects non-admins. proxy.ts │ 
│                                 │                                                   │  only UX, not security.                                                                                                                          │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Design System ("Editorial       │ PRD §4.1–4.3, README §Design System               │ Anti-generic mandate: Newsreader + Instrument Sans + Commit Mono. dispatch-ember #c7513f. CSS Subgrid grid-rows-subgrid. Explicit rejections:    │ 
│ Dispatch")                      │                                                   │ Inter, Roboto, Space Grotesk.                                                                                                                    │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Component Architecture          │ PRD §4.3, §4.4, PAD §5.3, README §File Hierarchy  │ 5-Layer Request Model. RSC by default, 'use client' for interactivity. Shadcn UI wrapped, never rebuilt. ArticleCard with subgrid.               │ 
│                                 │                                                   │ NutritionLabel for AI disclosure.                                                                                                                │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ API & Server Actions            │ PRD §6, PAD §5, README §API Reference             │ Route Handlers in app/api/. Server Actions for mutations. Cursor pagination LIMIT 31. Async params as Promise<T>.                                │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Worker & Queue                  │ PAD §6, README §Architecture                      │ BullMQ v5 on Upstash Redis. maxRetriesPerRequest: null. upsertJobScheduler for RSS. FlowProducer for DAG. Concurrency rationales: ingest=50,     │ 
│                                 │                                                   │ summarize=5, score=20, feed-slice=10.                                                                                                            │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ AI Pipeline & Disclosure        │ PRD §7, PAD §8.4, README §Key Features            │ 3-layer disclosure: JSON-LD + HTTP X-AI-Provenance + HTML meta. C2PA explicitly rejected. contentAvailabilityEnum guards against hallucination   │ 
│                                 │                                                   │ (title_only, excerpt never summarised).                                                                                                          │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Summary Review Workflow         │ PAD §7.4, PRD §7.3                                │ State machine: ok → needs_review → (ok                                                                                                           │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Development Workflow            │ README §Quick Start, §Contributing                │ pnpm required. drizzle-kit generate → migrate. pnpm dev (Turbopack). pnpm worker:dev. pnpm tsc --noEmit before commit.                           │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Testing Strategy                │ PAD §10, README §Testing                          │ Vitest (unit). Test containers for DB/Redis. Playwright (E2E). k6 (performance). 80% line coverage target.                                       │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Security & Compliance           │ README §Security & Compliance, PAD §11 Risk       │ Pin ≥16.2.6 (CVE-2025-55182). EU AI Act Art. 50. C2PA rejected. AES-256-GCM push keys. Content availability guard.                               │ 
│                                 │ Register                                          │                                                                                                                                                  │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Environment Variables           │ README §Environment Variables, PAD §9.2           │ Table with DATABASE_URL, REDIS_URL, AUTH_SECRET, ANTHROPIC_API_KEY, VAPID_*, PUSH_KEY_ENCRYPTION_KEY.                                            │ 
├─────────────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Anti-Patterns                   │ PAD_compare, README §Contributing, PRD invariant  │ No any (ever). No custom components when Shadcn provides one. No throw new Error() in RSC auth (use redirect()). No eager DB connections (build  │ 
│                                 │                                                   │ crash). No drizzle-kit push in prod.                                                                                                             │ 
└─────────────────────────────────┴───────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
  
────────────────────────────────────────────────────────────────────────────────  
  
### Traceability: Plan → Source Document Citations  
  
Every bullet below is directly verifiable in the indicated source:  
  
#### 1. Core Identity & Purpose  
  
- "Topic-first news aggregation with source-cited AI summaries" — README.md §Overview  
- "3 personas: Daily Scanner, Enterprise Analyst, Editor/Admin" — PRD v4.3 §3  
- "50–200+ diverse RSS/Atom/JSON feeds" — PRD v4.3 §1  
  
#### 2. Foundational Principles  
  
- "Meticulous Approach 6-phase" — claude-md skill template  
- "ADR-001 through ADR-007 locked" — PAD v4.5 §3  
- "Library Discipline: if Shadcn UI/Radix provides it, use it" — PRD v4.3 §1.1  
  
#### 3. Implementation Standards  
  
- "Strict TypeScript, no any" — README.md §Contributing, PAD §2 table  
- "interface over type" — README.md §Contributing  
- "Early returns, composition over inheritance" — README.md §Contributing  
- "All UI states: loading, error, empty, success" — PRD invariant, claude-md skill  
  
#### 4. Next.js 16 / React 19.2 Specifics  
  
- "cacheComponents: true top-level" — PAD §5.3 next.config.ts, README §Critical Configuration Invariants  
- "cacheLife named profiles: feed, topicShell, reference" — PRD §5.2 table, PAD §5.3  
- "turbopack top-level" — PRD §1.1, PAD §5.3  
- "experimental.viewTransition nested" — PRD §5.2, PAD §5.3  
- "proxy.ts replaces middleware.ts" — PAD §5.1 Layer Model, PRD §1.1  
- "Async params as Promise<T>" — PAD §5.7, PRD §5.3  
  
#### 5. Database & ORM  
  
- "Lazy Proxy DB pattern" — PAD §5.3 lib/db/index.ts, README §Security & Compliance  
- "max: 10 assumes dedicated runtime; serverless needs PgBouncer" — PAD §5.3 DEPLOYMENT NOTE  
- "generate + migrate only; never push in production" — PAD §7.3 Migration Strategy  
  
#### 6. Authentication  
  
- "verifySession() uses redirect() + cache() + DB user fetch" — PAD §8.1, PAD_compare remediation  
- "verifyAdminSession() redirects non-admins to /" — PAD §8.1  
- "Auth.js v5 beta, Drizzle adapter, exact version pin" — PAD §3 ADR-004, §2 Stack  
  
#### 7. Design System ("Editorial Dispatch")  
  
- "Newsreader (variable, 800) + Instrument Sans (400–600) + Commit Mono (400)" — PRD §4.1, README §Design System  
- "Anti-generic rejections: Inter, Roboto, Space Grotesk" — PRD §4.1 explicit  
- "dispatch-ember #c7513f, ink-900 #1a1a18, paper-50 #fafaf8" — PRD §4.2, README §Design System  
  
#### 8. AI Pipeline & 3-Layer Disclosure  
  
- "JSON-LD (schema.org/CreativeWork) + HTTP X-AI-Provenance + HTML meta" — PRD §7.1, PAD §8.4  
- "C2PA explicitly rejected for text" — PRD §7.1 bold, PAD §8.4 bold  
- "contentAvailabilityEnum guards: title_only/excerpt never summarised" — PRD §7, PAD §7.1  
- "NutritionLabel.tsx human-readable layer" — PRD §4.4, README §Key Features  
  
#### 9. Worker & BullMQ  
  
- "maxRetriesPerRequest: null, noeviction" — PAD §6, §9.1  
- "Concurrency: ingest 50, summarize 5, score 20, feed-slice 10" — PAD §6.2, §6.5  
- "FlowProducer for DAG ingest→score→refresh" — PAD §6.4  
  
#### 10. Testing  
  
- "Vitest unit, Playwright E2E, k6 performance" — PAD §10  
- "80% line coverage target" — README §Testing  
  
────────────────────────────────────────────────────────────────────────────────  
  
### Validation Checklist (before implementation)  
  
┌────┬────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────┬────────┐  
│ #  │ Checkpoint                                                                 │ Source                                                        │ Status │  
├────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┼────────┤  
│ 1  │ Every section cites at least one source document (PRD/PAD/README)          │ All above                                                     │ ✅     │  
├────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┼────────┤  
│ 2  │ "Editorial Dispatch" design system fully captured (fonts, colors, subgrid) │ PRD §4.1–4.3, README §Design System                           │ ✅     │  
├────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┼────────┤  
│ 3  │ Next.js 16 config topology is exact (top-level vs nested flags)            │ PRD §5.2, PAD §5.3, README §Critical Configuration Invariants │ ✅     │  
├────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┼────────┤  
│ 4  │ Auth DAL uses redirect() not throw                                         │ PAD §8.1, PAD_compare                                         │ ✅     │  
├────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┼────────┤  
│ 5  │ Lazy Proxy DB with deployment footgun note                                 │ PAD §5.3, README §Security & Compliance                       │ ✅     │  
├────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┼────────┤  
│ 6  │ 3-layer AI disclosure (not C2PA) with provenance.ts                        │ PRD §7.1, PAD §8.4                                            │ ✅     │  
├────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┼────────┤  
│ 7  │ BullMQ concurrency rationales documented                                   │ PAD §6.2, §6.5                                                │ ✅     │  
├────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┼────────┤  
│ 8  │ Content availability guard against hallucination                           │ PRD §7, PAD §7.1                                              │ ✅     │  
├────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┼────────┤  
│ 9  │ interface > type, no any, early returns                                    │ README §Contributing, claude-md skill                         │ ✅     │  
├────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┼────────┤  
│ 10 │ EU AI Act Art. 50 compliance path documented                               │ PRD §7, PAD §8.4, README §Security & Compliance               │ ✅     │  
└────┴────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────┴────────┘  
  
────────────────────────────────────────────────────────────────────────────────  
  
### Proposed File Structure  
  
The CLAUDE.md will be created at /home/project/onestopnews/CLAUDE.md with the following top-level sections:  
  
```  
  CLAUDE.md  
  ├── [Frontmatter - IMPORTANT flag]  
  ├── Core Identity & Purpose  
  ├── Foundational Principles  
  │   ├── Meticulous Approach (Six-Phase)  
  │   └── OneStopNews-Specific Principles  
  ├── Implementation Standards  
  │   ├── TypeScript Strict Mode  
  │   ├── React / Next.js 16 App Router  
  │   ├── Database (Drizzle + PostgreSQL)  
  │   ├── Authentication & Authorization  
  │   ├── Design System ("Editorial Dispatch")  
  │   ├── Component Architecture  
  │   ├── AI Pipeline & Disclosure  
  │   └── Error Handling  
  ├── Development Workflow  
  │   ├── Prerequisites  
  │   ├── Environment Setup  
  │   └── Build/Test/Lint Commands  
  ├── Testing Strategy  
  ├── Code Quality Standards  
  ├── Security & Compliance  
  └── Project-Specific Anti-Patterns  
```  
  
────────────────────────────────────────────────────────────────────────────────  
  
### Before Implementation  
  
Do you approve this plan? Specifically:  
  
1. Scope: Should I include the Summary Review Workflow (§7.4 from PAD) as a dedicated subsection under "Implementation Standards", or fold it into the broader "AI Pipeline" section?  
2. Async Params: Should the PageTransition abstraction live under "Next.js 16 Specifics" or "Component Architecture"?  
3. Quick Start commands: The README lists pnpm dev and pnpm worker:dev. Since this is a blueprint phase with no live package.json, should the CLAUDE.md list these as target commands (from README) or focus on the architectural  
   conventions only?  
  
Please confirm and I will proceed to generate the complete CLAUDE.md. 

The user has approved the plan. I need to generate the complete CLAUDE.md file for the OneStopNews project. Let me synthesize all the information I've gathered from:  
  
1. PRD v4.3 (Project_Requirements_Document_v4.3.md)  
2. PAD v4.5 (Project_Architecture_Document_v4.5.md)  
3. README.md (the project's README)  
4. The claude-md skill template guidance  
5. The framework-templates skill (Next.js specific)  
  
I need to create a comprehensive, production-grade CLAUDE.md that serves as a project-level instruction file for future AI coding agents. The document should be concise but comprehensive, following the Meticulous Approach framework,   
with practical commands and conventions derived from the actual project documents.  
  
Key sections to include:  
- Frontmatter with IMPORTANT flag  
- Core Identity & Purpose  
- Foundational Principles (Meticulous Approach + project-specific)  
- Implementation Standards (TypeScript, Next.js 16, Drizzle, Auth, Design System, Components, AI Pipeline)  
- Development Workflow (setup, commands)  
- Testing Strategy  
- Code Quality Standards  
- Security & Compliance  
- Anti-Patterns  
  
Let me write this now.  

Proceeding with the full CLAUDE.md generation.  

  
write /home/project/onestopnews/CLAUDE.md

The verification kemencuat verification is complete. Let me review the results:  
  
1. Structure is solid — all main sections present (Foundational Principles, Implementation Standards, Development Workflow, Testing Strategy, Code Quality Standards, Security & Compliance, Anti-Patterns, plus Quick Reference Layer  
   Model)  
2. Critical content is present:  
    - Meticulous Approach 6-phase: 6 mentions ✓  
    - Library Discipline: 2 mentions ✓  
    - Auth DAL with redirect(): present ✓  
    - "throw new Error" in RSC auth discussion: 3 mentions (includes the anti-pattern table) ✓  
    - Design system (Newsreader, dispatch-ember): 4 mentions ✓  
    - 3-layer AI disclosure: 4 mentions ✓  
    - C2PA rejected: 2 mentions ✓  
    - Content availability guard: 4 mentions ✓  
    - next.config.ts critical flags table: 3 mentions ✓  
    - Lazy Proxy DB: 3 mentions ✓  
    - Summary Review Workflow: 2 mentions ✓  
    - BullMQ concurrency rationales: 1 mention ✓  
    - Worker graceful shutdown: 1 mention ✓  
    - Zero any in TypeScript: 2 mentions ✓  
    - PAD/PRD cross-references: 2 mentions (in header and footer) ✓  
3. Anti-patterns table is present (2 mentions of "Anti-Pattern") ✓  
4. Document stats: 319 lines, 2119 words, 14,595 bytes — concise but comprehensive.  
  
Everything looks good. Let me present the final summary.  

✅ CLAUDE.md Created Successfully  
  
### Verification Results  
  
┌───┬───────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────┐  
│ # │ Checkpoint                                                                │ Result                                                                       │  
├───┼───────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤  
│ 1 │ Core Identity present                                                     │ ✅ ("Topic-first news aggregation...")                                       │  
├───┼───────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤  
│ 2 │ Foundational Principles — Meticulous Approach + project-specific          │ ✅ 6-phase workflow + Library Discipline                                     │  
├───┼───────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤  
│ 3 │ Implementation Standards — all subsections present                        │ ✅ TypeScript, Next.js 16, Drizzle, Auth, Design System, Worker, AI Pipeline │  
├───┼───────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤  
│ 4 │ Development Workflow — commands, setup, pre-commit gate                   │ ✅                                                                           │  
├───┼───────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤  
│ 5 │ Testing Strategy — tools, targets, infrastructure                         │ ✅                                                                           │  
├───┼───────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤  
│ 6 │ Code Quality Standards — lint, types, naming                              │ ✅                                                                           │  
├───┼───────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤  
│ 7 │ Security & Compliance — version pin, auth, AI disclosure, push encryption │ ✅                                                                           │  
├───┼───────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤  
│ 8 │ Anti-Patterns Table — 10 forbidden patterns with why + replacement        │ ✅                                                                           │  
├───┼───────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤  
│ 9 │ Quick Reference: Layer Model — 5-layer summary                            │ ✅                                                                           │  
└───┴───────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────┘  
  
### Critical Coverage Confirmed  
  
┌────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────┐  
│ Domain                                                 │ Evidence                                            │  
├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
│ Auth DAL uses redirect()                               │ Full code block in §Auth                            │  
├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
│ throw new Error() forbidden in RSC                     │ Documented in anti-patterns table                   │  
├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
│ Zero any in TypeScript                                 │ Enforced twice (standards + anti-patterns)          │  
├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
│ cacheComponents / turbopack / viewTransition positions │ Exact placement table with "What breaks if wrong"   │  
├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
│ Design system: Newsreader, dispatch-ember              │ Typographic + colour contract tables                │  
├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
│ CSS Subgrid grid-rows-subgrid                          │ Described with contract                             │  
├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
│ 3-layer AI disclosure (not C2PA)                       │ JSON-LD + HTTP + meta, C2PA explicitly rejected     │  
├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
│ Content availability guard                             │ title_only / excerpt → "DO NOT summarise"           │  
├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
│ BullMQ concurrency rationales                          │ ingest: 50, summarize: 5, score: 20, feed-slice: 10 │  
├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
│ Lazy Proxy DB with serverless footgun                  │ DEPLOYMENT NOTE: PgBouncer / Supavisor              │  
├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
│ Summary Review Workflow                                │ ok → needs_review → (ok | disabled)                 │  
└────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────┘  
  
### Document Metrics  
  
- Lines: 319  
- Words: 2,119  
- Bytes: 14,595  
- Location: /home/project/onestopnews/CLAUDE.md  
  
────────────────────────────────────────────────────────────────────────────────  
  
The CLAUDE.md is ready. Future AI coding agents will have a single, authoritative reference for all project conventions, commands, and non-negotiable patterns — directly traceable to the PRD v4.3, PAD v4.5, and README.md.

