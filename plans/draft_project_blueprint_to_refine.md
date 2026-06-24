# README.md
```md
# OneStopNews · Topic‑First AI News Aggregator

> Everything important, sorted by topic — with on‑demand AI summaries.

[![Tech Stack](https://img.shields.io/badge/Next.js-16%2B-black.svg)](#-tech-stack)
[![React](https://img.shields.io/badge/React-19%2B-61dafb.svg)](#-tech-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38b2ac.svg)](#-tech-stack)
[![Database](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](#-tech-stack)
[![License](https://img.shields.io/badge/License-Private-red.svg)](#-license)

---

## ✨ What is OneStopNews?

OneStopNews is a **topic‑first news aggregation platform** that groups stories by what they are about (Top, Local, Tech, Global, Finance, Politics, Gossip) instead of who published them.

It is designed for:

- **Daily readers** who want a calm, fast way to scan important stories by topic.
- **Analysts and researchers** who need a structured, high‑signal view of news, plus **on‑demand AI summaries** for compression and triage.
- **Developers** who want a reference‑grade Next.js + React + Tailwind + Shadcn architecture for a modern content app.

At its core, OneStopNews is:

- **Topic‑first**: curated categories and subcategories are the primary navigation axis.
- **Source‑respectful**: always links to the original publisher; never republishes full copyrighted content.
- **AI‑assisted, not AI‑controlled**: summaries are optional, clearly labeled, and easily compared against the original article.

---

## 🔍 Key Features

### Reader Experience

- **Topic‑first browsing**
  - Top‑level categories (Top, Local, Tech, Global, Finance, Politics, Gossip).
  - Curated subcategories (e.g., “Apple & Devices”, “Singapore transport”, “US politics”).
- **Scan‑optimized layout**
  - Lead story card + dense grid of article cards.
  - Sticky “Current view” header with story counts.
- **Search & filters**
  - Keyword search across titles/excerpts.
  - Filter by category, subcategory, time, summary availability.
  - Sort by latest, impact (importance score), or “summary ready”.
- **AI summaries on demand**
  - Per‑article summaries with bullet‑point key takeaways.
  - Clear toggle between “AI Summary” and “Original Source”.
  - Prominent external link to the publisher.

### Operational / Enterprise Features

- **Robust ingestion pipeline**
  - RSS / Atom / JSON API based ingestion.
  - Deduplication by canonical URL + content hash.
  - Source health tracking and feed freshness metrics.
- **Modular architecture**
  - Next.js web app for UI + APIs.
  - Separate worker service for ingestion, ranking, and summarization.
  - Queue‑backed jobs for reliability and backpressure.
- **AI governance**
  - Summaries cached and versioned.
  - Admin review tools for problematic outputs (roadmap).
  - Clear user‑facing disclaimers.

---

## 🧱 Tech Stack

| Layer            | Technology                                      |
|------------------|-------------------------------------------------|
| Framework        | Next.js 16+ (App Router, Route Handlers)       |
| UI               | React 19+, Shadcn UI, Tailwind CSS v4          |
| Language         | TypeScript (strict mode)                       |
| Styling          | Tailwind CSS v4 + CSS variables for theming    |
| Backend Runtime  | Node.js 24+                                    |
| Database         | PostgreSQL 17 (primary), SQLite (dev/fallback) |
| Caching (opt.)   | Redis (feed slices, hot data)                  |
| Queue            | SQS / RabbitMQ / Redis‑backed queue            |
| AI Summaries     | Pluggable LLM provider (HTTP API)              |

---

## 🏗️ High‑Level Architecture

OneStopNews adopts a **modular monolith** architecture:

- **Web App** (Next.js + React) for UI and HTTP APIs.
- **Worker Service** (Node.js) for ingestion/summarization/ranking.
- **Queue** for job orchestration.
- **PostgreSQL** as the system of record.

```mermaid
flowchart LR
  subgraph WebApp[Web App · Next.js]
    UI[UI · React + Shadcn]
    API[Route Handlers / API]
  end

  subgraph Queue[Job Queue]
    Q[(ingest, summarize, rank)]
  end

  subgraph Worker[Worker Service · Node.js]
    ING[Ingestion Jobs]
    RANK[Ranking Jobs]
    SUM[Summarization Jobs]
  end

  DB[(PostgreSQL 17)]

  UI --> API
  API --> DB
  API --> Q

  Q --> ING
  Q --> RANK
  Q --> SUM

  ING --> DB
  RANK --> DB
  SUM --> DB

  Worker --> DB
```

### Data Flow: Ingestion → Feed → Summary

```mermaid
sequenceDiagram
  participant S as Source (RSS/API)
  participant W as Worker
  participant Q as Queue
  participant DB as PostgreSQL
  participant A as API (Next.js)
  participant U as User

  rect rgb(245,245,245)
    Note over W,DB: Ingestion
    W->>Q: Schedule ingest jobs
    Q-->>W: ingest(source)
    W->>S: Fetch latest items
    S-->>W: Feed data
    W->>W: Normalize + deduplicate
    W->>DB: Upsert articles + metrics
  end

  rect rgb(245,245,245)
    Note over DB,U: Browsing
    U->>A: GET /topics/:category
    A->>DB: Query feed slice
    DB-->>A: Article list
    A-->>U: Render lead + grid
  end

  rect rgb(245,245,245)
    Note over W,U: Summarization
    U->>A: POST /api/summarize/:id
    A->>Q: enqueue summarize(articleId)
    Q-->>W: summarize(articleId)
    W->>DB: Read article
    W->>W: Call LLM provider
    W->>DB: Store summary
    U->>A: GET /article/:id (refresh)
    A->>DB: Article + summary
    A-->>U: Show AI summary
  end
```

---

## 📁 Project Structure

The repo is organized as a small **multi‑app workspace**:

```text
onestopnews/
├─ apps/
│  ├─ web/                # Next.js 16+ app (UI + HTTP APIs)
│  └─ worker/             # Node.js worker service (ingest, summarize, rank)
├─ packages/
│  ├─ domain/             # Pure domain logic (articles, sources, summaries, ranking)
│  ├─ db/                 # PostgreSQL access layer (ORM/SQL, migrations, seeds)
│  ├─ ui/                 # Shadcn UI wrappers + design system primitives
│  ├─ config/             # Shared config (env parsing, logging, queue clients)
│  └─ utils/              # Shared utilities (date, formatting, etc.)
├─ prisma/ or migrations/ # Database schema & migrations
├─ docs/
│  ├─ prd.md              # Project Requirements Document (PRD)
│  └─ architecture.md     # Extended architecture notes (optional)
├─ .github/
│  ├─ workflows/          # CI/CD pipelines (lint, test, typecheck, build)
├─ README.md
└─ package.json           # Workspaces, scripts, tooling
```

### Repo Structure Diagram

```mermaid
graph TD
  root[onestopnews/]

  subgraph apps[apps/]
    web[web · Next.js app]
    worker[worker · Node worker]
  end

  subgraph packages[packages/]
    domain[domain · business logic]
    db[db · persistence layer]
    ui[ui · shared UI]
    config[config · env/logging/queue]
    utils[utils · helpers]
  end

  docs[docs/]
  gh[.github/]

  root --> apps
  root --> packages
  root --> docs
  root --> gh

  apps --> web
  apps --> worker
  packages --> domain
  packages --> db
  packages --> ui
  packages --> config
  packages --> utils
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 24+
- pnpm / npm / yarn (pnpm recommended)
- PostgreSQL 17 running locally or in the cloud
- (Optional) Redis for caching, SQS/RabbitMQ or Redis‑queue for jobs

### 1. Clone & Install

```bash
git clone https://github.com/<your-org>/onestopnews.git
cd onestopnews

# using pnpm
pnpm install
```

### 2. Environment Configuration

Create `.env` files for web and worker apps:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
```

Set values such as:

- `DATABASE_URL` (PostgreSQL connection string)
- `REDIS_URL` (optional, for caching and queue)
- `QUEUE_URL` / `QUEUE_TYPE`
- `AI_PROVIDER_API_KEY`
- Any auth / SSO configs (when enabled)

### 3. Database Setup

Run migrations:

```bash
# example with Prisma
pnpm db:migrate
pnpm db:seed
```

### 4. Run in Development

```bash
# terminal 1: web app
pnpm dev:web   # wraps next dev in apps/web

# terminal 2: worker service
pnpm dev:worker   # runs the job worker in apps/worker
```

Visit:

- Web app: `http://localhost:3000`

---

## 🧬 Architecture Details

### Web App (apps/web)

- **Next.js 16+ App Router**
  - Server Components for feed pages and layout.
  - Route Handlers for HTTP APIs under `/api/*`.
- **Feature‑based structure** (example):

```text
apps/web/src/
├─ app/
│  ├─ (marketing)/
│  ├─ (app)/
│  │  ├─ topics/
│  │  │  ├─ [category]/
│  │  │  │  └─ [subcategory]/page.tsx
│  │  ├─ article/
│  │  │  └─ [id]/page.tsx
│  │  └─ layout.tsx
│  └─ api/
│     ├─ articles/route.ts
│     ├─ categories/route.ts
│     ├─ source-health/route.ts
│     ├─ ingest/route.ts
│     └─ summarize/[id]/route.ts
├─ features/
│  ├─ topics/
│  ├─ feed/
│  ├─ article-detail/
│  ├─ search/
│  └─ admin/
└─ shared/
   ├─ components/
   ├─ hooks/
   └─ lib/
```

- **UI Layer**: Shadcn UI primitives wrapped in a `packages/ui` design system.
- **Data Layer**: Typed fetchers calling Route Handlers; React Query or RSC `fetch` as appropriate.

### Worker Service (apps/worker)

- Long‑running Node.js process listening to queue events:
  - `ingest-source`
  - `rank-feeds`
  - `summarize-article`
- Uses `packages/domain` + `packages/db` to:
  - Fetch and normalize sources.
  - Deduplicate and persist articles.
  - Compute importance scores and feed slices.
  - Call AI provider for summaries.

---

## 🧪 Quality, Testing & Tooling

- **TypeScript strict mode** across all apps and packages.
- **ESLint + Prettier** for consistent style.
- **Jest / Vitest** (or similar) for:
  - Domain logic unit tests (ranking, dedupe, classification).
  - API route handler tests.
- **Playwright / Cypress** for end‑to‑end flows (browsing topics, summarizing, admin actions).
- **GitHub Actions** CI:
  - `lint` → `typecheck` → `test` → `build`.

Example scripts (root `package.json`):

```jsonc
{
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:worker": "pnpm --filter worker dev",
    "build": "pnpm build:web && pnpm build:worker",
    "lint": "eslint .",
    "typecheck": "tsc -b",
    "test": "vitest run"
  }
}
```

---

## 🤝 Contributing

Contributions are welcome — from UI polish to ingestion adapters.

### How to Contribute

1. **Fork** the repo.
2. Create a feature branch: `feat/topic-nav-keyboard-access`.
3. Keep changes **surgical**:
   - Touch only what you need.
   - Match existing style & patterns.
4. Add or update tests.
5. Run:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
6. Open a PR with:
   - Clear description.
   - Screenshots / CLI output where helpful.
   - Notes on trade‑offs or open questions.

### Good First Issues

- Add new subcategories and topic copy.
- Improve accessibility (keyboard nav, ARIA).
- Add new ingestion adapters for public RSS/API sources.
- Improve AI summary prompts / formatting.

---

## 🗺️ Roadmap

- **v1.0 – Productionized MVP**
  - Modular monolith + worker + queue.
  - Topic‑first browsing, search, on‑demand summaries.
- **v1.1 – Personalization & Admin**
  - Persistent user preferences and read‑later list.
  - Admin dashboards for ingestion/summarization.
- **v1.2 – Advanced Ranking & Feeds**
  - Improved impact scoring.
  - Pre‑computed feed slices and smarter caching.
- **v2.0 – Enterprise Extensions**
  - SSO / SAML / OIDC.
  - Advanced topic modeling, alerts, and multi‑tenant support.

---

## 📜 License

This project is currently **private / all rights reserved**.  
Contact the maintainer if you want to discuss licensing or collaboration.

```

# plan_PRD.md
```md
Based on the blueprint you provided, OneStopNews is already substantially beyond a typical MVP specification. The biggest opportunity is not adding more features—it is refining:
- Product positioning
- Information architecture
- Editorial UX
- Enterprise operational requirements
- AI governance
- Ranking strategy
- Observability
- Monetization readiness
- Production deployment architecture
- Design system direction

Before writing the PRD, I recommend conducting a structured research and planning phase.

2. Phase 1 — ANALYZE

Applied Expertise

- Product Architecture
- Enterprise SaaS Architecture
- News Aggregation Systems
- AI Summarization Systems
- Information Architecture
- Frontend Architecture (Next.js 16 / React 19)
- Design Systems
- Editorial Product Design

Current Understanding

OneStopNews is:

- Topic-first rather than source-first
- Reader-focused but expandable into enterprise intelligence
- AI-assisted but source-respectful
- Modular-monolith architecture
- Search + aggregation + summarization platform
- Potentially competing with:
  - Google News
  - Ground News
  - Feedly
  - Inoreader
  - SmartNews
  - Artifact-style AI discovery
  - Bloomberg Terminal-lite workflows
  - AlphaSense-lite intelligence workflows

Key Strengths

Your blueprint already demonstrates:

- Strong architectural direction
- Good separation of concerns
- Queue-based ingestion
- Worker isolation
- Modern frontend stack
- Enterprise scalability awareness
- Explicit AI governance

Potential Weaknesses / Risks

1. Category-Only Navigation Risk

Problem:
- Topic-first is powerful
- But users often think in entities:
  - Apple
  - Nvidia
  - Trump
  - Singapore Airlines

Recommendation:
- PRD should include entity extraction roadmap
- Topics + Entities dual navigation model

2. Summary Cost Explosion

Problem:
- On-demand summaries reduce cost
- Popular articles may generate repeated requests

Recommendation:
- Aggressive summary caching
- Summary versioning
- Popularity-triggered pre-generation

3. Search Scalability

Current:
- PostgreSQL FTS

Risk:
- Eventually insufficient for:
  - advanced relevance
  - typo tolerance
  - semantic retrieval

Recommendation:
- PRD should define:
  - V1 PostgreSQL FTS
  - V2 Meilisearch
  - V3 OpenSearch

4. News Deduplication Complexity

Canonical URL alone is insufficient.

Examples:
- Reuters story republished everywhere
- AP syndicated content
- Multiple headlines describing same event

Recommendation:
PRD should include:

- Exact duplicate detection
- Near duplicate clustering
- Event clustering roadmap

5. AI Governance Requirements

Enterprise customers will ask:

- Which model generated this?
- When?
- What source text?
- Can we audit it?

Recommendation:
Add:

- Summary provenance
- Prompt version
- Model version
- Regeneration history

6. Monetization Ambiguity

Current PRD does not define:

- Free tier
- Pro tier
- Enterprise tier

This affects:

- Architecture
- Auth
- Permissions
- Feature flags

3. Product Research Framework (Recommended)

Instead of researching random competitors, I recommend extracting best practices from six product categories.

Research Track A — News Aggregators

Examples:

- Google News
- SmartNews
- Yahoo News

Study:

- Topic organization
- Story clustering
- Breaking news handling

Research Track B — News Intelligence Platforms

Examples:

- Feedly
- Inoreader

Study:

- Power-user workflows
- Monitoring
- Saved searches

Research Track C — Enterprise Intelligence

Examples:

- AlphaSense
- Factiva
- Bloomberg

Study:

- Analyst workflows
- Entity monitoring
- Signal extraction

Research Track D — AI Summarization Products

Examples:

- Perplexity
- Readwise Reader
- Glean

Study:

- Summary presentation
- Trust mechanisms
- Citation patterns

Research Track E — Editorial Design Systems

Examples:

- Financial Times
- Reuters
- The Economist

Study:

- Typography
- Density
- Reading experience

Research Track F — Modern SaaS Systems

Examples:

- Linear
- Stripe
- Vercel

Study:

- Information hierarchy
- Admin UX
- Operational tooling

4. Design Direction Analysis

I strongly recommend avoiding:

- Generic SaaS cards
- Purple gradients
- AI-generated illustration styles
- Generic dashboard layouts

Recommended Direction

Concept:
"Editorial Intelligence Terminal"

Tone:
- Industrial editorial
- Newsroom meets research terminal

Memorable Differentiator:

Instead of a traditional card grid:

- Topic pages become "story maps"
- Lead story behaves like an editorial front page
- Related stories cluster visually
- Density increases deeper into the feed

Typography

Avoid:

- Inter-first hierarchy

Consider:

- Headlines:
  - Newsreader
  - Tiempos
  - Freight Display

- UI:
  - Satoshi
  - Geist
  - ABC Diatype
  - Suisse Intl

Visual System

Palette:

- Paper
- Ink
- Clay
- Moss
- Oxide
- Slate

The interface should feel:

- Research-grade
- Calm
- Information-dense
- Premium

not:

- Startup
- Dashboard
- AI app

5. Proposed PRD Structure

The final PRD should contain:

1. Executive Summary
2. Vision & Positioning
3. Product Strategy
4. Competitive Landscape
5. User Personas
6. User Journeys
7. Information Architecture
8. Navigation System
9. Content Model
10. Topic Taxonomy
11. Entity Taxonomy
12. Search Architecture
13. Ranking Architecture
14. AI Summary System
15. AI Governance
16. User Features
17. Admin Features
18. Enterprise Features
19. Analytics Requirements
20. Security Requirements
21. Accessibility Requirements
22. Performance Requirements
23. Architecture
24. Database Design
25. API Design
26. Worker Design
27. Queue Design
28. Observability
29. CI/CD
30. Deployment Architecture
31. Disaster Recovery
32. Cost Model
33. Monetization Strategy
34. Rollout Plan
35. Success Metrics
36. Open Questions
37. Future Roadmap

6. Phase 2 — PLAN

Proposed Execution Plan

Phase A — Product Discovery
- Analyze blueprint
- Identify gaps
- Define positioning
- Define enterprise scope

Deliverable:
- Product Strategy Section

Success Criteria:
- Clear differentiation from Google News and Feedly

Phase B — UX Research Synthesis
- Extract best practices
- Define navigation model
- Define reading workflows

Deliverable:
- UX Requirements Section

Success Criteria:
- Complete IA and journey mapping

Phase C — System Architecture
- Refine architecture
- Define deployment
- Define scalability model

Deliverable:
- Architecture Section

Success Criteria:
- Production-ready architecture specification

Phase D — Data & AI
- Entity model
- Ranking model
- Summarization model
- Governance model

Deliverable:
- Data and AI Sections

Success Criteria:
- Enterprise auditability defined

Phase E — Operations
- Monitoring
- Security
- Compliance
- Disaster recovery

Deliverable:
- Operations Section

Success Criteria:
- Enterprise readiness documented

Phase F — Final PRD Assembly
- Consolidate
- Normalize terminology
- Produce markdown PRD

Deliverable:
- Complete PRD.md

Success Criteria:
- Ready for engineering execution

7. VALIDATE

Given that OneStopNews is consumer-first, the PRD should optimize for:

- Daily habit formation
- Fast news scanning
- Low cognitive load
- Trust and transparency
- Mobile-first consumption
- High-performance content delivery
- Optional AI assistance
- Future expansion into analyst and enterprise workflows

This changes several strategic decisions:

- Google News is a closer benchmark than AlphaSense.
- Feed readability matters more than research tooling.
- Story clustering matters more than complex querying.
- Personalization should be lightweight initially.
- AI summaries should reduce reading time rather than act as a research copilot.
- The primary KPI becomes daily active engagement and return frequency rather than analyst productivity.

The PRD should therefore be written as a production-ready specification for a premium consumer news platform with enterprise-grade architecture underneath.

---

# Phase 1 — ANALYZE

## Product Positioning

### Core Product Thesis

"Everything important, sorted by topic."

OneStopNews is not:

- A newspaper
- A social network
- A blogging platform
- An AI chat product

OneStopNews is:

- A news navigation layer
- A news compression layer
- A topic intelligence layer

The value proposition:

Instead of visiting 10 websites:

1. Open OneStopNews
2. Pick a topic
3. Scan the most important stories
4. Read AI summaries when useful
5. Visit original publishers when deeper context is needed

---

## Competitive Analysis Framework

The PRD should contain a dedicated competitor analysis section covering:

### Tier 1 Direct Competitors

#### Google News

Strengths

- Story clustering
- Topic organization
- Freshness

Weaknesses

- Busy interface
- Weak personalization transparency
- Generic presentation

Lessons

- Story clustering is essential
- Source diversity matters

---

#### Ground News

Strengths

- Bias transparency
- Source comparison

Weaknesses

- Heavy emphasis on political framing

Lessons

- Source transparency increases trust

Potential roadmap item:

- Coverage diversity indicators

---

#### SmartNews

Strengths

- Scan efficiency
- Mobile consumption

Weaknesses

- Weak information architecture

Lessons

- Speed matters more than visual complexity

---

### Tier 2 Inspiration Products

#### Feedly

Lessons

- Excellent monitoring workflows

Use selectively.

Do not turn OneStopNews into an RSS reader.

---

#### Reuters

Lessons

- Editorial hierarchy
- Information density
- Typography

---

#### Financial Times

Lessons

- Serious visual language
- Reading-focused layout

---

## Consumer User Research Model

The PRD should define three primary personas.

### Persona 1 — Daily Scanner

Age

25–55

Behavior

- Opens multiple times daily
- Reads headlines
- Rarely reads full articles

Needs

- Fast scanning
- Topic filtering
- Minimal clutter

Priority

Highest

---

### Persona 2 — Curious Professional

Behavior

- Wants to understand trends
- Reads summaries
- Follows sectors

Needs

- Better organization
- AI compression

Priority

High

---

### Persona 3 — Enthusiast

Behavior

- Follows specific niches
- Reads deeply

Needs

- Search
- Topic depth

Priority

Medium

---

# Phase 2 — INFORMATION ARCHITECTURE PLAN

## Navigation Architecture

Current blueprint is good but should evolve.

### Level 1

Primary Categories

- Top
- Local
- Tech
- Global
- Finance
- Politics
- Culture

Recommendation:

Replace:

"Gossip"

with

"Culture"

Reason:

- Broader
- More premium
- More advertiser friendly
- Scales better

Subcategories can still contain celebrity content.

---

## Secondary Navigation

Each category contains:

- Description
- Story count
- Trending subtopics

Example:

Tech

- AI & ML
- Apple
- Startups
- Cybersecurity
- Semiconductors

---

## Search Architecture

V1

Postgres Full Text Search

V2

Meilisearch

The PRD should define both.

---

# Phase 3 — DESIGN SYSTEM PLANNING

## Design Vision

The PRD should contain a dedicated design strategy chapter.

### Concept

Editorial Intelligence

Not:

- Dashboard
- Magazine
- AI app

Instead:

- Modern newspaper
- Research notebook
- Information terminal

---

## Visual Direction

### Typography

Headlines

Newsreader

Body

Satoshi

This pairing is distinctive while remaining readable.

---

### Color System

Avoid:

- Purple gradients
- Neon AI branding

Primary Palette

- Paper
- Ink
- Moss
- Clay
- Slate

Accent colors assigned by category.

Example:

Tech

Deep electric blue

Finance

Forest green

Politics

Burnt amber

---

## Layout Strategy

### Desktop

Three-zone layout

Zone A

Topic navigation

Zone B

Feed

Zone C

Sticky detail panel

---

### Mobile

Single-column reading experience

The PRD should define:

- Thumb zones
- Bottom navigation
- Summary interactions

---

# Phase 4 — FEATURE REQUIREMENTS PLAN

The PRD should specify requirements for:

---

## Feed System

### Story Card States

Required

- Loading
- Error
- Empty
- Success

---

### Lead Story

Requirements

- Largest visual weight
- Highest ranked article
- Summary availability indicator

---

### Article Cards

Display

- Headline
- Source
- Time
- Category
- Summary status

---

## Story Clustering

Critical Addition

Current blueprint lacks this.

The PRD should define:

### Event Cluster

Example

"Apple announces new AI features"

Cluster contains:

- Reuters
- Bloomberg
- The Verge
- CNBC

One lead story

Multiple source perspectives

This becomes a major differentiator.

---

## AI Summary System

The PRD should define:

### Summary Structure

Required

- Overview
- Key Takeaways
- Why It Matters

Avoid:

Single blob paragraphs.

---

### Summary Provenance

Display:

- Generated timestamp
- Model version
- Summary disclaimer

---

# Phase 5 — ENTERPRISE-GRADE TECHNICAL REQUIREMENTS

## Architecture Chapter

Should expand significantly beyond current draft.

---

### Monorepo

Recommended

pnpm workspaces

Apps

- web
- worker

Packages

- db
- domain
- ui
- config
- observability

Add:

- analytics

package

---

### Queue

Recommendation

BullMQ + Redis

Reason

Consumer scale
Lower complexity
Strong Next.js ecosystem

The PRD should document:

Future migration path

BullMQ → SQS

if scale demands.

---

### Database

Recommendation

PostgreSQL 17

Provider examples:

- Neon
- RDS
- Supabase

Production requirement:

Read replicas supported.

---

## Search

V1

Postgres

V2

Meilisearch

Roadmap:

OpenSearch

---

## Caching

Required

Redis

Usage

- Feed caching
- Summary caching
- Counts
- Queue

---

# Phase 6 — DATA MODEL PLANNING

The PRD should contain a dedicated data architecture section.

## Core Entities

Current entities plus:

### EventCluster

Purpose

Story grouping

Fields

- id
- title
- slug
- category_id
- importance_score

---

### Topic

Separate from category.

Allows:

Tech
→ AI
→ OpenAI

without rigid category trees.

---

### ArticleMetrics

Stores

- views
- summary requests
- clicks

---

### SummaryVersion

Allows regeneration history.

---

# Phase 7 — SECURITY PLAN

The PRD should include:

## OWASP Requirements

- CSP
- CSRF protection
- Rate limiting
- Input validation
- Output sanitization

---

## AI Security

Requirements

- Prompt injection mitigation
- Content filtering
- Source verification

---

## Admin Security

Requirements

- MFA
- Audit logs
- RBAC

---

# Phase 8 — OBSERVABILITY PLAN

The PRD should contain a dedicated chapter.

## Metrics

### Product

- DAU
- WAU
- Topic engagement
- Summary usage

### Technical

- Feed latency
- Queue depth
- Ingestion failures

### AI

- Summary generation rate
- Cost per summary
- Error rate

---

## Logging

Structured logs

Required fields

- request_id
- job_id
- user_id
- article_id

---

# Phase 9 — DELIVERY PLAN

The final PRD should be organized into the following structure:

```text
01 Executive Summary
02 Product Vision
03 Product Strategy
04 Market & Competitor Analysis
05 User Personas
06 User Journeys
07 Success Metrics

08 Information Architecture
09 Taxonomy Strategy
10 Navigation Design
11 Search Experience

12 Design Vision
13 Visual Design System
14 Responsive Strategy
15 Accessibility

16 Functional Requirements
17 Feed System
18 Story Clustering
19 AI Summaries
20 Search & Discovery
21 Personalization
22 Admin Platform

23 System Architecture
24 Repository Architecture
25 Infrastructure
26 Queue Architecture
27 Caching Strategy
28 Database Design
29 Data Models
30 API Design

31 Security
32 Privacy
33 AI Governance
34 Compliance

35 Observability
36 Analytics
37 Monitoring
38 Alerting

39 Performance Requirements
40 Scalability Requirements
41 Reliability Requirements

42 Rollout Plan
43 Future Roadmap
44 Risks & Mitigations
45 Open Questions
```

# VALIDATION CHECKPOINT

Proposed outcome:

Create a comprehensive PRD that is:

- Consumer-first
- Production-ready
- Enterprise-grade internally
- Optimized for Next.js 16 + React 19
- Built around story clustering and topic intelligence
- Distinctive editorial-industrial design system
- AI-assisted rather than AI-centric
- Scalable to millions of articles and hundreds of thousands of users

One recommendation before drafting the full PRD: elevate "story clusters" to a first-class domain object alongside articles. This is the single highest-impact enhancement missing from the current blueprint and aligns OneStopNews much more closely with how users mentally consume news events rather than individual publisher articles.

---

# OneStopNews — Project Requirements Document (PRD)
Version: 1.0
Status: Product & Architecture Baseline
Audience: Product, Design, Engineering, Operations

---

# 1. Executive Summary

OneStopNews is a consumer-first, topic-centric news aggregation platform that helps people understand what is happening in the world without hopping across dozens of publisher websites.

Unlike traditional news readers that organize content by source, OneStopNews organizes content around topics and story clusters.

The platform aggregates content from trusted publishers, deduplicates overlapping coverage, groups related articles into evolving story clusters, and provides optional AI-generated summaries to accelerate comprehension.

Core Principle:

"Everything important, sorted by topic."

The platform must feel:

- Fast
- Calm
- Trustworthy
- Information-dense
- Editorial rather than algorithmically noisy

The system architecture must support enterprise-grade reliability while maintaining a consumer-focused experience.

---

# 2. Product Vision

## Vision Statement

Become the fastest and most trusted way to understand important news by organizing information around stories instead of publishers.

## Product Promise

A user should be able to:

1. Open OneStopNews.
2. Select a topic.
3. Understand major developments in under five minutes.
4. Dive deeper only when necessary.

## Strategic Positioning

OneStopNews sits between:

- Google News
- Ground News
- Feedly

But differentiates through:

- Topic-first navigation
- Story cluster intelligence
- AI-assisted compression
- Editorial-industrial design language
- High-density information architecture

---

# 3. Product Goals

## Primary Goals

### G1 — Reduce News Consumption Friction

Users should understand major events with minimal effort.

### G2 — Improve News Discovery

Users should discover stories through topics rather than publishers.

### G3 — Preserve Source Transparency

Publishers remain visible and credited.

### G4 — Use AI Responsibly

AI should compress information rather than replace journalism.

### G5 — Build Daily Habits

The product should encourage frequent return visits.

---

# 4. Success Metrics

## Product Metrics

### Daily Engagement

- DAU target
- Average sessions per user
- Articles viewed per session

### Reading Efficiency

- Time to understand major story
- Summary usage rate
- Topic exploration rate

### Retention

- D1 retention
- D7 retention
- D30 retention

## Platform Metrics

### Feed Freshness

95% of category feeds contain articles published within 24 hours.

### Availability

99.9% monthly availability.

### Feed Latency

p95 under 500ms.

### Page Load

Largest Contentful Paint under 2.0 seconds.

---

# 5. Target Users

## Daily Scanner

Goals

- Quickly understand important events.

Behavior

- Multiple visits per day.
- Mostly reads headlines.

Priority

Highest.

---

## Curious Professional

Goals

- Stay informed on industries and trends.

Behavior

- Reads summaries frequently.
- Uses search.

Priority

High.

---

## Enthusiast

Goals

- Follow niche topics deeply.

Behavior

- Consumes large volumes of content.

Priority

Medium.

---

# 6. Core Product Principles

## Topic First

Topics are primary navigation.

Sources are secondary.

## Story First

Events matter more than articles.

## AI Optional

AI enhances understanding but never becomes the primary source.

## Source Respect

Every article prominently links to the original publisher.

## Scan Optimized

Users should understand the feed without reading every article.

---

# 7. Information Architecture

## Top-Level Categories

### Top
Most important stories.

### Local
Regional and local coverage.

### Tech
Technology and innovation.

### Global
International news.

### Finance
Markets, companies, economics.

### Politics
Government and policy.

### Culture
Entertainment, internet culture, celebrities.

---

# 8. Story Cluster Architecture (First-Class Domain)

This becomes a foundational product capability.

## Why Story Clusters Exist

Users think:

"What's happening with Apple?"

Not:

"What did Reuters publish?"

## Example

Story Cluster:

Apple Announces New AI Features

Contains:

- Reuters article
- CNBC article
- Verge article
- Bloomberg article

Users see:

- One cluster
- Multiple perspectives

Instead of:

- Four duplicate cards

---

## Cluster Components

### Cluster Title

Representative event headline.

### Cluster Summary

Short overview.

### Timeline

Story evolution.

### Coverage Count

Number of articles.

### Sources Count

Number of publishers.

### Importance Score

Relative significance.

---

# 9. Navigation Model

## Desktop

Three-column architecture.

### Column 1

Topic navigation.

### Column 2

Feed.

### Column 3

Article/cluster detail.

---

## Tablet

Two-column architecture.

---

## Mobile

Single-column architecture.

Bottom navigation required.

---

# 10. Search & Discovery

## V1 Search

PostgreSQL Full Text Search.

Searches:

- Title
- Excerpt
- Topic
- Cluster title

---

## Filters

### Category

### Subcategory

### Date Range

### Summary Availability

### Source

---

## Sort

### Latest

### Impact

### Trending

### Summary Ready

---

# 11. Feed Experience

## Feed Structure

### Lead Story Cluster

Highest ranked cluster.

### Secondary Clusters

Grid/list hybrid.

### Continuous Feed

Chronological discovery.

---

## Feed States

Required:

### Loading

### Error

### Empty

### Success

---

# 12. Article Experience

## Article Detail

Displays:

- Headline
- Publisher
- Publish date
- Topic
- Cluster
- AI summary
- Original source link

---

## Original Source CTA

Must remain visually prominent.

---

# 13. AI Summary System

## Purpose

Reduce reading time.

## Not Intended To

Replace original journalism.

---

## Summary Structure

### Overview

2–3 sentence explanation.

### Key Takeaways

3–7 bullets.

### Why It Matters

Context section.

---

## Summary Metadata

Display:

- Generated date
- Model version
- Confidence indicator
- AI disclaimer

---

# 14. Personalization

## V1

User preferences.

### Favorite Categories

### Default Topic

### Preferred Sort

---

## V2

### Saved Searches

### Read Later

### Topic Following

---

# 15. Admin Platform

## Source Management

CRUD operations.

## Feed Health Monitoring

Source freshness.

## Summary Monitoring

Generation quality.

## Cost Monitoring

AI spending visibility.

---

# 16. Functional Requirements

## Ingestion

Must support:

- RSS
- Atom
- JSON APIs

---

## Deduplication

### Exact Duplicates

Canonical URL.

### Near Duplicates

Content similarity.

### Cluster Assignment

Event-level grouping.

---

## Ranking

Ranking score combines:

- Recency
- Source authority
- Cluster velocity
- Coverage volume
- User engagement

---

# 17. System Architecture

## Architecture Style

Modular Monolith + Worker Platform

---

## Deployables

### Web App

Next.js 16

Responsibilities:

- UI
- APIs
- Search
- Preferences

---

### Worker Service

Node.js

Responsibilities:

- Ingestion
- Clustering
- Ranking
- Summaries

---

### Redis

Responsibilities:

- Queue
- Cache

---

### PostgreSQL

System of record.

---

# 18. Repository Architecture

```text
apps/
  web/
  worker/

packages/
  domain/
  db/
  ui/
  config/
  analytics/
  observability/
  search/
```

---

# 19. Data Model

## Core Entities

### User

### UserPreference

### Category

### Subcategory

### Topic

### Source

### Article

### StoryCluster

### Summary

### SummaryVersion

### FeedSlice

### IngestionJob

### SourceHealthSnapshot

### AnalyticsEvent

---

# 20. StoryCluster Schema

```text
id
title
slug
summary
category_id
importance_score
article_count
source_count
created_at
updated_at
```

---

# 21. API Architecture

## Public APIs

### GET /api/categories

### GET /api/topics

### GET /api/clusters

### GET /api/articles

### GET /api/article/:id

---

## Actions

### POST /api/summarize/:id

### POST /api/preferences

---

## Admin APIs

### POST /api/ingest

### POST /api/sources

### GET /api/source-health

---

# 22. Security Requirements

## Authentication

Auth.js.

## Authorization

RBAC.

Roles:

- User
- Admin

---

## Security Controls

### CSP

### CSRF Protection

### Rate Limiting

### Input Validation

### Audit Logging

---

# 23. Accessibility Requirements

Target:

WCAG AA minimum.

Stretch Goal:

WCAG AAA where practical.

Requirements:

- Full keyboard navigation
- Screen reader support
- Reduced motion support
- Color contrast compliance

---

# 24. Design System Strategy

## Design Direction

Editorial Intelligence Terminal

Not:

- SaaS Dashboard
- AI Chat App
- Magazine Clone

---

## Typography

### Headlines

Newsreader

### Interface

Satoshi

---

## Color System

Foundation:

- Paper
- Ink
- Slate
- Moss
- Clay

Category accents:

- Tech → Electric Blue
- Finance → Forest Green
- Politics → Burnt Amber
- Global → Deep Indigo
- Culture → Rose Clay

---

# 25. Performance Requirements

## Core Web Vitals

### LCP

< 2.0s

### CLS

< 0.1

### INP

< 200ms

---

## Feed Rendering

Server Components preferred.

Minimal client-side JavaScript.

---

# 26. Observability

## Metrics

### Product

- DAU
- Retention
- Summary usage

### Platform

- API latency
- Queue depth
- Feed freshness

### AI

- Cost
- Errors
- Summary generation volume

---

## Logging

Structured logs required.

Fields:

```text
request_id
user_id
article_id
cluster_id
job_id
timestamp
```

---

# 27. AI Governance

## Transparency

Every summary must show:

- AI generated notice
- Timestamp
- Model version

---

## Review System

Admin can:

- Flag summary
- Disable summary
- Regenerate summary

---

## Safety

Prompt injection mitigation required.

---

# 28. Infrastructure

## Production

Recommended Stack:

- Vercel (Web)
- Railway/Fly.io/Render (Worker)
- PostgreSQL (Neon or RDS)
- Redis (Upstash or Redis Cloud)

---

# 29. Rollout Plan

## Phase 1

Production MVP

Includes:

- Topics
- Story clusters
- Search
- AI summaries
- Source management

---

## Phase 2

Personalization

Includes:

- Read later
- Saved searches
- Topic following

---

## Phase 3

Advanced Intelligence

Includes:

- Entity extraction
- Trend detection
- Topic timelines
- Alerting

---

# 30. Risks & Mitigations

## Risk

Duplicate stories overwhelm feeds.

Mitigation

StoryCluster architecture.

---

## Risk

AI costs become excessive.

Mitigation

Caching and popularity-based pre-generation.

---

## Risk

Search quality degrades.

Mitigation

Migration path:

Postgres → Meilisearch → OpenSearch.

---

## Risk

Source outages.

Mitigation

Health monitoring and failover sourcing.

---

# 31. Strategic Recommendation

The most important architectural decision for OneStopNews is to elevate StoryCluster to the same importance as Article.

Domain hierarchy should become:

```text
Category
  └── Topic
        └── Story Cluster
              └── Articles
                    └── AI Summary
```

This aligns the product with how users naturally consume news, significantly reduces feed duplication, improves ranking quality, creates a stronger differentiation from traditional aggregators, and provides a foundation for future features such as timelines, multi-source comparisons, trend analysis, and topic intelligence. It should be treated as a core V1 capability rather than a future enhancement.

```

# Project_Requirements_Document.md
```md
# OneStopNews Project Requirements Document (Updated Architecture)

## 1. Overview

OneStopNews is a topic‑first news aggregation and AI summarization platform that organizes public news content by what it is about rather than who published it. It collects article metadata from many sources, normalizes and categorizes stories, and presents them in a calm, scan‑friendly interface designed for both daily readers and enterprise analysts.[^1][^2][^3]

This document updates the previous PRD with an explicit architectural choice: a **modular monolith** built on Next.js 16 and React 19, combined with a **separate worker service** for ingestion and AI summarization, connected via a managed queue and a shared PostgreSQL 17 database. The goal is to balance fast delivery and simplicity with enterprise‑grade reliability, observability, and scaling headroom appropriate for a high‑volume news system.[^2][^4][^5][^6]

### 1.1 Scope

This PRD covers:

- Product requirements (features, UX, roles) for OneStopNews
- A concrete, production‑grade architecture based on:
  - Next.js 16+ (App Router, server components, Route Handlers)
  - React 19+
  - Tailwind CSS v4
  - Shadcn UI components
  - PostgreSQL 17 (primary datastore)
  - SQLite as a constrained local/fallback datastore
  - A worker service (Node.js 24+) for ingestion and summarization
  - A managed queue (e.g., SQS, RabbitMQ, or Redis‑backed) for decoupling jobs[^4][^5][^7]
- Non‑functional requirements for performance, reliability, observability, and AI governance

Out of scope for this iteration: full microservice decomposition, a dedicated data warehouse, and advanced personalization algorithms.

### 1.2 Context and Constraints

- OneStopNews is currently an MVP implemented as a mostly client‑side app with a topic‑first layout and on‑demand AI summaries.[^1]
- The updated system must remain deployable by a small team while supporting significant growth in article volume and user traffic.
- Architecture must be compatible with modern Next.js patterns: feature‑based organization, layered architecture, and heavy use of server components and Route Handlers for performance.[^8][^9][^4]

## 2. Goals and Success Metrics

### 2.1 Product Goals

- Provide a topic‑first news reading experience that reduces cognitive load and tab‑hopping across publisher sites.[^3][^1]
- Offer clearly labeled, trustworthy AI summaries that speed up comprehension while preserving the primacy of original articles.[^6][^1]
- Achieve enterprise‑grade reliability and observability across ingestion, search, and summarization pipelines.[^5][^2]
- Maintain a distinct editorial‑industrial visual identity that is anti‑generic but highly usable.[^3][^1]

### 2.2 Scale Assumptions

Initial targets and design assumptions:

- Sources: 50–200 RSS/API sources across major categories.
- Ingestion volume: 20k–100k new candidate articles per day after de‑duplication, with higher bursts during major events.[^10][^2][^6]
- Active users: up to low‑hundreds of thousands monthly active users in early enterprise deployments.
- Read patterns: read‑heavy vs write‑light, typical of newsfeeds; many reads per article, relatively few write operations.[^11][^2][^6]

These estimates justify a modular monolith with a separate worker tier, but do not yet require a full microservices or Kafka‑based event backbone.[^6][^11]

### 2.3 Success Metrics (V1 Targets)

- **Feed freshness:** 95% of category feeds display at least 20 stories from the last 24 hours during normal cycles.[^2][^6]
- **Latency (API):** p95 response time for feed queries (`GET /api/articles`) ≤ 500 ms server time under normal load.[^11][^2]
- **Latency (page):** p95 page render time for main feed ≤ 1.5 seconds in primary regions (using Next.js RSC and caching).[^4][^8]
- **Summarization coverage:** 30–50% of viewed articles in high‑interest categories have AI summaries generated within 24 hours of initial views.[^12][^6]
- **Summarization trust:** < 1% of audited summaries are flagged for material factual errors; flagged summaries are corrected or disabled.[^13][^12][^6]
- **Availability:** 99.5% monthly availability for read APIs and ingestion, excluding planned maintenance.[^2][^6]

## 3. Target Users and Personas

### 3.1 Daily Scanner

- Checks news multiple times a day, skims headlines and excerpts, occasionally opens original articles.
- Thinks in topics (e.g., "What is happening in Singapore?", "What is happening with Apple and AI?") rather than specific outlets.[^1][^3]
- Needs a fast, clean interface on mobile and desktop.

### 3.2 Enterprise Analyst / Researcher

- Works in finance, policy, or corporate strategy.
- Monitors specific companies, sectors, and regions continuously.
- Needs trustworthy topic grouping, accurate timestamps, source attribution, and AI summaries that compress reading time without hiding nuance.[^5][^12]

### 3.3 Editor / Admin

- Manages sources, categories, and ingestion policies.
- Monitors system health, ingestion lag, and AI summarization performance.
- Responsible for enforcing content and AI governance policies.

## 4. Use Cases and User Stories

### 4.1 Topic‑First Browsing

- As a user, I can select a topic (e.g., Tech News) and a subtopic (e.g., Apple & Devices) to see the latest and most impactful stories across sources.
- As a user, I can quickly switch topics via a sticky topic navigation ribbon, with each topic showing live story counts.

### 4.2 Search and Sorting

- As a user, I can search across all stories by keyword and filter results by category, subcategory, and time range.
- As a user, I can sort results by latest, impact (importance score), or summary‑ready.

### 4.3 Article Exploration and Detail

- As a user, I can see a lead story for a topic and then a dense grid of cards for remaining stories.
- As a user, I can click a card to open a detail view showing metadata, an AI summary (if available), and a link to the original article.

### 4.4 AI Summarization

- As a user, I can request an AI summary for an article that does not yet have one.
- As a user, I can toggle between "AI Summary" and "Original Source" views without losing my place in the feed.
- As an admin, I can review a sample of summaries by category, mark problematic ones, and trigger regeneration.

### 4.5 Source Transparency

- As a user, I can see the source outlet, category, subcategory, and time‑ago for each article.
- As a user, I can click "Open original source" to read the full article on the publisher site.

### 4.6 Admin & Operations

- As an admin, I can configure sources (URLs, polling intervals, default categories) and enable/disable them.
- As an admin, I can view dashboards for ingestion jobs, summarization jobs, and system metrics.

## 5. Information Architecture and Navigation

### 5.1 Topic Model

OneStopNews uses a curated hierarchy of categories and subcategories, similar to other topic‑centric news systems.[^1][^2]

| Category        | Example Subcategories                                     |
|-----------------|-----------------------------------------------------------|
| Top Stories     | All top stories, Breaking, Editor's picks                 |
| Local News      | Singapore transport, housing, local business, governance  |
| Tech News       | Apple & devices, AI & ML, startups, cybersecurity         |
| Global News     | China, US, Asia‑Pacific, Europe, Middle East              |
| Finance News    | Markets, earnings, personal finance, crypto, commodities  |
| Politics News   | SG politics, US politics, China politics, geopolitics     |
| Gossip News     | SG gossip, K‑culture, global gossip, internet culture     |

Categories and subcategories are stored in the database, not hard‑coded, to support evolution over time.[^2][^1]

### 5.2 Navigation Model

- Sticky topic navigation ribbon near the top of the app workspace.[^1]
- Each topic opens a panel with a description and a grid of subcategories with per‑subcategory story counts.
- Controls panel shows "Current view", selected category, result count, and filters.
- Dual‑pane layout on large screens (feed + detail panel) and stacked layout on smaller screens.

### 5.3 URL & Routing Schema

- `/` → Default topic feed (Top Stories / All)
- `/topics/[category]` → Default subcategory for that category
- `/topics/[category]/[subcategory]` → Feed filtered by both
- `/article/[id]` → Standalone article detail page (deep link)

## 6. UX & UI Requirements

### 6.1 Layout

- **Desktop:**
  - Grid layout with main workspace on the left and sticky detail panel on the right.
  - Topic nav and controls panel remain visible while scrolling the feed.
  - Lead card plus multi‑column grid of article cards.[^3][^1]

- **Tablet:**
  - Single column feed with topic nav collapsing into multi‑column grid and detail view below or on a separate route.

- **Mobile:**
  - Stacked layout: header, hero, navigation, controls, feed, detail.
  - Tap‑optimized controls and simplified topic nav.

### 6.2 Visual Language

- **Tone:** editorial‑industrial.
- **Colors:** restrained palette with ink/paper/sage/clay blue/violet, plus category‑tinted gradients for article art.[^1]
- **Typography:**
  - Headlines: editorial serif (e.g., Newsreader or equivalent), tight leading.
  - Body / UI: non‑generic grotesk (e.g., Space Grotesk / Satoshi), with strong weights for labels.
- **Components:** built with Shadcn UI primitives (Button, Card, DropdownMenu, Select, Badge, Tabs) wrapped in a custom design system for consistent styling.[^9][^8][^4]

### 6.3 Accessibility

- WCAG AA minimum for contrast and keyboard operability.[^13]
- Precise ARIA semantics for menus, tabs, toggles, and status indicators.
- Clear, screen‑reader‑friendly labels for AI summaries (e.g., "AI‑generated summary, verify with original source").[^12][^13]

## 7. Functional Requirements

### 7.1 Ingestion Pipeline

- The system must ingest data from configured sources via RSS, Atom, JSON APIs, or custom adapters.[^10][^2]
- A scheduler in the worker service launches ingestion jobs on a per‑source schedule (e.g., every 5–30 minutes depending on source priority).[^14][^10]
- Ingestion job steps:
  - Load source configuration.
  - Fetch feed or API data with timeouts and retries.
  - Parse and normalize into a unified article format.
  - Deduplicate using canonical URL normalization and content hashing.
  - Apply initial category/subcategory mapping based on source tags and rules.[^6][^2]
  - Persist new and updated articles into PostgreSQL.

- Ingestion errors must be logged and surfaced via metrics and dashboards.

### 7.2 Article Lifecycle

- Newly ingested articles are initially in a `pending` or `active` status.
- Articles may be updated if the source changes title, excerpt, or metadata.
- Articles are associated with a deduplication group where near‑duplicates from different sources are clustered.[^6][^2]
- Articles carry a `content_availability` flag describing stored content level (title only, excerpt, or partial/full text as per policy).[^7]

### 7.3 Ranking and Impact Score

- Each article has an `importance_score` used for "Impact" sorting.
- Initial scoring formula (v1):
  - Weighted combination of recency, source priority, category relevance, and deduplication cluster size.
- Ranking computation runs in the worker service and may periodically recompute scores for hot feeds, writing them to the DB or a feed slice table.[^15][^16][^17]

### 7.4 Summarization

- Users can request summaries from the detail view or lead card when `has_summary` is false.
- `/api/summarize/[id]` enqueues a `summarize-article` job and returns immediately with a pending state.[^18][^11]
- Summarization job steps:
  - Fetch article record; if `content_availability` is insufficient, retrieve full content via safe extractor or source API.
  - Run content through AI summarization model with a controlled prompt.
  - Store summary text, key points, `based_on`, model metadata, and token usage in the `summaries` table.[^11][^12]
  - Mark article `has_summary = true` and `summary_status = ok`.

- UI refresh: detail view either polls the article endpoint or uses revalidation to show the summary when available.
- Admin can flag a summary as `needs_review` or `disabled`.

### 7.5 Search and Filtering

- Search uses PostgreSQL full‑text search on `title`, `excerpt`, and optional full text where available.[^12][^2]
- Filters: category, subcategory, time range, summary status.
- Sort: latest, impact, summary ready.

### 7.6 User Features

V1:

- Session or user‑persisted default topic, subtopic, and sort.
- Basic preference model (favorite categories).

Roadmap:

- Read‑later list, muted sources, and saved searches.
- Alerts/notifications for saved topics (later, possibly as a separate service).

### 7.7 Admin Features

- Source management: CRUD for sources with validation.
- Ingestion monitoring dashboard with job histories and error details.
- Summarization monitoring: volume, error rates, cost proxies per model and category.[^19][^12]

## 8. System Architecture

### 8.1 High‑Level Architecture

The system follows a **modular monolith** pattern with two main deployables and a shared database:[^20][^4][^5]

- **Web App:** Next.js 16 + React 19 app handling UI, public/internal HTTP APIs, and light writes (preferences, trigger endpoints).
- **Worker Service:** Node.js 24+ service running ingestion, ranking, and summarization jobs.
- **Queue:** Managed message queue (e.g., SQS, RabbitMQ, Redis‑queue) connecting Web App triggers and Worker jobs.[^21][^22][^23]
- **Database:** PostgreSQL 17 cluster storing all domain entities; SQLite for local development only.[^12][^2]
- **Caching Layer (optional):** Redis for feed slices and hot data.

### 8.2 Internal Layering

Within each deployable (Web App and Worker Service), code is organized using feature‑based and layered architecture:[^24][^20][^8][^4]

- **Domain layer:** pure business logic for Sources, Articles, Summaries, Ranking, implemented as TypeScript modules with no framework dependencies.
- **Infrastructure layer:** Postgres (ORM/sql), queue clients, AI clients.
- **Application layer:**
  - In the Web App: Route Handlers, server actions, and RSC data loaders calling domain services.
  - In the Worker: job handlers that accept messages and call domain services.
- **UI layer (Web App only):** Shadcn components and feature‑specific layouts.

### 8.3 Data Flow

- **Ingestion:**
  - Scheduler → enqueue ingest jobs → Worker fetches and writes to Postgres → SourceHealth & metrics updated.[^14][^10][^2]

- **Feed queries:**
  - Client requests topic page → Next.js RSC fetches feed data from Postgres (or Redis feed slices) via domain services → page rendered and streamed.[^25][^20][^4]

- **Summarization:**
  - UI → `/api/summarize/[id]` → enqueue job → Worker runs summarization → summary stored → UI revalidates feed/article.

## 9. Data Model & Storage

### 9.1 Entities (Updated)

Core entities remain as before but are now explicitly linked to worker responsibilities.

- **Source, Category, Article, Summary, User, UserPreferences, IngestionJob, SourceHealthSnapshot** as previously defined.
- **FeedSlice (optional):** stores pre‑computed ordered lists of article IDs per `(category, subcategory, sort)` for hot feeds.[^16][^17]

### 9.2 Indexing and Storage Strategy

- Articles indexed on `(category_id, published_at DESC)` and `(subcategory_id, published_at DESC)`.
- Full‑text search indexes on `title`, `excerpt`, and `content` where permitted.[^2][^12]
- Unique index on normalized `canonical_url` plus source to avoid duplicates.[^6][^2]

### 9.3 PostgreSQL and SQLite

- PostgreSQL 17 is the only supported database in production, with appropriate read replicas and backups.
- SQLite is used for local development and testing only, with migration parity.

## 10. API Design

### 10.1 HTTP Endpoints

Key endpoints (HTTP/JSON):

- `GET /api/categories` → list categories and subcategories with article counts.
- `GET /api/articles` → feed endpoint with filters and sort options.
- `GET /api/source-health` → snapshot of source and ingestion health.
- `POST /api/ingest` → admin‑only; enqueue global or per‑source ingestion.
- `POST /api/summarize/[id]` → enqueue summarization for article.
- Admin‑only endpoints for source management and monitoring.

### 10.2 Authentication & Authorization

- Auth mechanisms (e.g., session tokens, Auth.js, or enterprise SSO in later phases) protect write and admin endpoints.[^20][^4]
- Role‑based access control for admin operations.

### 10.3 Error Handling

- JSON error format: `{ code, message, details? }`.
- UI surfaces errors through non‑blocking toasts and empty states with recovery guidance.

## 11. Caching, Performance & Scalability

### 11.1 Caching Strategy

- Use Next.js RSC fetch caching and route segment caching with category‑specific `revalidate` times.[^25][^20][^4]
- Consider Redis for:
  - FeedSlice storage for hot categories (Top, Finance, Tech).[^17][^16]
  - Caching frequent aggregate counts and metrics.

### 11.2 Performance Targets

- See Section 2.3 for latency goals.
- Optimize per Next.js best practices: server components, code‑splitting, minimal client JS, optimized fonts and images.[^24][^8][^4]

### 11.3 Scalability

- Horizontal scaling:
  - Web App: stateless Next.js instances behind a load balancer.
  - Worker Service: scale out worker instances based on queue depth.
- Database scaling via read replicas and careful query design.

## 12. Observability & Operations

### 12.1 Metrics

- Ingestion metrics per source: job counts, errors, latency, new articles.[^10][^2]
- Summarization metrics: request counts, success/failure, latency, token usage.[^11][^12]
- API metrics: QPS, latency, error rates per endpoint.[^9][^25]
- User metrics: summary adoption, category distribution, search usage.

### 12.2 Logging & Tracing

- Structured logs with correlation IDs for requests and jobs.
- Distributed tracing across Web App and Worker where supported.

### 12.3 Alerting and Runbooks

- Alerts for high ingestion failure rates, offline sources, API error spikes, summarization errors.
- Runbooks for ingestion failures, AI incidents, and DB issues.

## 13. AI Governance

### 13.1 Policy

- AI summaries are assistive, not authoritative; original articles remain the source of truth.[^11][^12]
- Clear labeling and disclosures accompany every AI summary.

### 13.2 Quality Control

- Sampling and review of summaries per category.
- Flags for problematic summaries with options to disable or regenerate.

### 13.3 Security & Safety

- Prompt design to reduce injection and bias.
- Output filters to remove problematic content.

## 14. Rollout Plan

### 14.1 Phase 1 – Productionized MVP

- Implement modular monolith with worker service and queue.
- Recreate MVP flows on the new architecture and styling system.

### 14.2 Phase 2 – Personalization & Admin

- Expand user preferences and admin dashboards.
- Improve ranking and feed caching.

### 14.3 Phase 3 – Advanced Topic Modeling & Enterprise Features

- Introduce ML‑based topic detection and clustering.[^15][^2]
- Harden SSO, multi‑tenant support, and integration with enterprise data pipelines.[^26][^19]

***

**End of Updated PRD**

---

## References

1. [mockup_design.md](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEVTUTKJ65&Signature=jX4INra8uCaLjZiX%2FnBWnCiXAes%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCIAmRnabL74aTQFfjCK1UiwHEAZEutru2AfsVqRVcRa81AiAYjzDMwkOhnPKrPRxbLUSUYQXHI1lh8SkgN6kqwKW1Xyr8BAiw%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAEaDDY5OTc1MzMwOTcwNSIMH5KI4rSXKCeygbRtKtAECuC5Vl%2BCbDEYMI97fKmObSc%2FfHo8MfeEleCfQqFizhToBQoo4qfvGOFB0HUcP8FWP4LDLKeAJM6nQsEcXHGgaKxqHA%2FiZJxKqiPGXaNncWaV5kwiF1cJ%2BZz7KQQy2QmadR48aJofTYUwX9cLm7QLv5b3j45BFuuIi5tKoIWva93SIXuPPRNb0PRl5QqfDzjpZENiqkOjnbMxp5SgcSSLWcXjdUv8fMIaNTF9QpAF4k9XyxqMsE6eRE9wgbi5nfDLRQN0WW2Y%2BMtWFSBn5GXIDlcnBqVu1P1T3Jmd%2B8eDAEiWb5aro2GGUmBOCkBBkXRyHeTKt%2FkC%2FPE6jf%2BaMAOvUFyKlpjy82XJM8CvdCLXXi05t1D19c8rIZMpM7MCmhMAoXUZsrYT4cZQlBCtW6XS9ynjYlbQF%2FUD4gdotgWnN9%2FLBg7pRbiw3SBKBh%2BHYMgsiygpd8qUnWtlzzKPAitEvFrDOFvUeTX0T2B2L7UigPy0mQ9ZdfsQ29tP8Cxf1JSOOm11Tk57c8frFO0XbKDkm4P3L3xnsO7pcHYGmsr0fS97SyMc1hJrDMYDPDt%2FD9n8FMrRYgOLXKysOdb3AoRmPGG3Xm2Y692ZjaD6Y9Jv6ZhqE4qt6YdYAdGzqi54Zy3vGpN2HbF0qlKykrJCw3CzEh5cOzWd0ixYUO4vDwj6hki9M4Z1vthkfCRfYVTjE5HJbd6zhul0AoqzJLWS%2BRDe%2BjyGCdBt53vyQpeXo3bitFLJzR7kKwLXcbKI2w4Em%2BKXkX0JYwv1naUymE9fhgWnETCNxpnRBjqZAe1gE2XtngzyG0lhyhWI9ssg1YCPvi9hKzGiNgzSRxy0GKMy8FuNLDLhW3ao7MP6pnyppp%2BJIXDfnhoCknWfqX4S1W71cfZN3OJfpSzfpqgqUjZMuFS47m%2BZHXBdd8IgoOIwxC2ngGOGj2uiHa%2BCQI8FsJJyT%2BO40kJpdu6hiY7CjTf%2BVttiqnlmGZYCUbgFAi5%2F9lQJa4hxGA%3D%3D&Expires=1780904160) - # README.md
```md
# OneStopNews

**Everything important, sorted by topic.**

Live site: https://ones...

2. [Design a News Aggregator System](https://www.hellointerview.com/community/questions/news-aggregator-feed/cm96lh25n0039ad08067audlg) - Design a news aggregation system like Google News that allows users to subscribe to different news s...

3. [Google News System Design: A Complete Guide](https://www.systemdesignhandbook.com/guides/google-news-system-design/) - Master Google News System Design with this in-depth guide. Learn architecture, scalability, ranking,...

4. [Taxonomies for News Aggregator Interfaces and User ...](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr-2007-02.pdf) - Abstract. In this paper we define terminology for discussing the design and usage patterns for news ...

5. [Designing a Scalable News Aggregator System (Google ...](https://blog.stackademic.com/designing-a-scalable-news-aggregator-system-google-news-scale-a-deep-dive-with-full-explanation-fc39ee5ea13b) - This article explains in depth the why and how behind such a system. It includes data flow, schedule...

6. [Design a news aggregator system | Rippling Interview ...](https://prachub.com/interview-questions/design-a-news-aggregator-system) - This question evaluates system design and distributed-systems competencies—specifically scalable ing...

7. [What's the best way to create a news aggregator site for ...](https://learn.microsoft.com/en-us/answers/questions/722208/whats-the-best-way-to-create-a-news-aggregator-sit) - I've been thinking about creating a site that searches the internet for all the news on a certain su...

8. [The impact of AI news summarization on business processes](https://readpartner.com/blog/ai-news-summarization) - The goal of this article is to explore why AI news summarization is useful in the enterprise media m...

9. [Raman Kumar's Post](https://www.linkedin.com/posts/rmn-52012_systemdesign-newsaggregator-realtimedata-activity-7269372264498761729-hfQt) - Building a news aggregator system that collects articles from various sources and delivers personali...

10. [News Aggregator UI/UX Design Case Study](https://dribbble.com/shots/14602087-News-Aggregator-UI-UX-Design-Case-Study) - First is Read Later, which makes it easier for users to save news or articles that will be read late...

11. [AI summarization](https://cloud.google.com/use-cases/ai-summarization) - AI summarization is the use of AI technologies to distill text, documents, or content into a short a...

12. [News aggregator.md - mishnit/awesome-system-design](https://github.com/mishnit/awesome-system-design/blob/main/News%20aggregator.md) - News Feed: Admin should be able to map country, categories, publications and RSS feed. ○ Crawl: The ...

13. [AI News Aggregator App: Design & Build Faster with AI](https://www.figma.com/solutions/ai-news-aggregator/) - How to Build a News Aggregator App with AI · Step 1: Start with a frame · Step 2: Describe the exper...

14. [How to Create a Data Pipeline: Complete Guide](https://kestra.io/resources/data/create-data-pipeline) - A pipeline runs on a trigger (schedule, event, or dependency), handles failures gracefully, and prod...

15. [System Design: Newsfeed System](https://www.educative.io/courses/grokking-the-system-design-interview/system-design-newsfeed-system) - Design a scalable newsfeed system by defining requirements and performing resource estimation for bi...

16. [Design Facebook's News Feed](https://www.hellointerview.com/learn/system-design/problem-breakdowns/fb-news-feed) - System design answer key for designing a social media news feed like Facebook's, built by FAANG mana...

17. [Designing a Scalable News Feed Architecture for Millions of ...](https://www.0xkishan.com/blogs/designing-a-scalable-news-feed-architecture) - In this article we are going to go over the basic constructs of a news feed and how we can design a ...

18. [Companies are using 'Summarize with AI' to manipulate ... - CIO](https://www.cio.com/article/4130985/companies-are-using-summarize-with-ai-to-manipulate-enterprise-chatbots.html) - Companies are using 'Summarize with AI' to manipulate enterprise chatbots · Hidden code behind the b...

19. [Enterprise Data Pipelines for Modern Data Infrastructure](https://www.integrate.io/blog/enterprise-data-pipelines/) - Ingestion methods include batch (scheduled loads), streaming (event-driven), and change data capture...

20. [Modern Full Stack Application Architecture Using Next.js 15+](https://softwaremill.com/modern-full-stack-application-architecture-using-next-js-15/) - In this article, we took a step-by-step look at modern full stack application architecture using Nex...

21. [Building a Scalable News Aggregator with Go and ...](https://www.linkedin.com/posts/punitkumar99_golang-microservices-rabbitmq-activity-7373634709454675969-7hMC) - Designing a Scalable News Aggregator System Here's a quick technical overview of the system architec...

22. [Building event-driven pipelines with SQS and S3](https://www.redpanda.com/blog/building-event-driven-pipelines-sqs-s3) - Learn how to build real-time, event-driven data pipelines directly from your object storage with Ama...

23. [Kafka vs. SQS: A Deep Dive into Messaging and Streaming ...](https://www.automq.com/blog/kafka-vs-sqs-messaging-streaming-platforms-comparison) - Apache Kafka is an open-source, distributed event streaming platform. Think of it as a highly scalab...

24. [A Complete Guide to Building Scalable Next.js Applications](https://blog.bitsrc.io/frontend-architecture-a-complete-guide-to-building-scalable-next-js-applications-d28b0000e2ee) - How to architect modern frontend applications that scale, perform, and delight users. After years of...

25. [Comprehensive Next.js Full Stack App Architecture Guide | Arno](https://arno.surfacew.com/posts/nextjs-architecture) - Arno shares his best practices for designing robust Next.js full-stack applications, drawing from la...

26. [The Role of Data Pipelines in Event Driven Architecture](https://www.equalexperts.com/blog/our-thinking/understanding-the-role-of-data-pipelines-and-data-platforms-in-event-driven-architecture/) - In order for low-latency information to be meaningful, it needs to be event-driven; it needs to be i...


```

# static-mvp/app.js
```js
const state = {
  categories: [],
  articles: [],
  counts: {},
  indexed: 0,
  summarized: 0,
  selectedCategory: "top",
  selectedSubcategory: "All top stories",
  selectedArticleId: null,
  selectedMode: "summary",
  openMenuId: "",
  q: "",
  sort: "latest",
  loading: false,
};

const els = {
  topicNav: document.querySelector("#topicNav"),
  subcategorySelect: document.querySelector("#subcategorySelect"),
  sortSelect: document.querySelector("#sortSelect"),
  searchInput: document.querySelector("#searchInput"),
  activeCategory: document.querySelector("#activeCategory"),
  resultCount: document.querySelector("#resultCount"),
  leadCard: document.querySelector("#leadCard"),
  articleGrid: document.querySelector("#articleGrid"),
  detailPanel: document.querySelector("#detailPanel"),
  refreshButton: document.querySelector("#refreshButton"),
  statusPills: document.querySelector("#statusPills"),
};

const visualByCategory = {
  local: ["#405247", "#b86f52"],
  tech: ["#243b55", "#64786a"],
  global: ["#334155", "#486b8f"],
  finance: ["#2f3a2f", "#c6a15b"],
  politics: ["#3f3446", "#8d5a4a"],
  gossip: ["#6d637e", "#b86f52"],
  top: ["#151719", "#64786a"],
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function currentCategory() {
  return state.categories.find((category) => category.id === state.selectedCategory) || state.categories[0];
}

function currentArticle() {
  return state.articles.find((article) => article.id === state.selectedArticleId) || state.articles[0];
}

function visualMarkup(article) {
  const colors = visualByCategory[article?.category] || visualByCategory.top;
  const label = article ? `${article.categoryLabel} / ${article.subcategory}` : "OneStopNews";
  return `<div class="news-art" style="--art-a: ${colors[0]}; --art-b: ${colors[1]}"><span>${escapeHtml(label)}</span></div>`;
}

function articleMeta(article) {
  return `
    <div class="meta-row">
      <span class="source-chip">${escapeHtml(article.source)}</span>
      <span class="category-tag">${escapeHtml(article.categoryLabel)} / ${escapeHtml(article.subcategory)}</span>
      <span>${timeAgo(article.publishedAt || article.fetchedAt)}</span>
      ${article.summary ? `<span class="summary-ready">Summary ready</span>` : ""}
    </div>
  `;
}

function timeAgo(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recent";
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} day ago`;
}

function articleCount(categoryId, subcategory = "") {
  const categoryCounts = state.counts[categoryId];
  if (!categoryCounts) return 0;
  if (subcategory) return categoryCounts.subcategories?.[subcategory] ?? 0;
  return categoryCounts.total ?? 0;
}

function renderTopicNav() {
  els.topicNav.innerHTML = state.categories
    .map((category) => {
      const subcategories = category.subcategories.filter((subcategory) => !subcategory.startsWith("All "));
      return `
        <div class="topic-item ${state.openMenuId === category.id ? "open" : ""}">
          <button class="topic-button" type="button" data-menu="${category.id}" aria-expanded="${state.openMenuId === category.id}">
            ${escapeHtml(category.label)}
          </button>
          <div class="topic-menu" role="menu">
            <div class="topic-menu-header">
              <div>
                <strong>${escapeHtml(category.label)}</strong>
                <span>Browse live coverage grouped by topic, not publisher.</span>
              </div>
              <div class="topic-count">${articleCount(category.id)} stories</div>
            </div>
            <div class="topic-subgrid">
              ${subcategories
                .map(
                  (subcategory) => `
                    <button class="topic-subitem" type="button" data-nav-category="${category.id}" data-nav-subcategory="${escapeHtml(subcategory)}">
                      ${escapeHtml(subcategory)}
                      <span>${articleCount(category.id, subcategory)}</span>
                    </button>
                  `,
                )
                .join("")}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderSubcategories() {
  const category = currentCategory();
  state.selectedSubcategory = category.subcategories.includes(state.selectedSubcategory) ? state.selectedSubcategory : category.subcategories[0];
  els.activeCategory.textContent = category.label;
  els.subcategorySelect.innerHTML = category.subcategories
    .map((subcategory) => `<option value="${escapeHtml(subcategory)}" ${subcategory === state.selectedSubcategory ? "selected" : ""}>${escapeHtml(subcategory)}</option>`)
    .join("");
}

function renderFeed() {
  const [lead, ...rest] = state.articles;
  els.resultCount.textContent = `${state.articles.length} article${state.articles.length === 1 ? "" : "s"} shown from ${state.indexed} indexed`;

  if (!lead) {
    els.leadCard.innerHTML = `<div class="empty">No live articles loaded yet. Try refreshing feeds. Some sources may block RSS requests locally.</div>`;
    els.articleGrid.innerHTML = "";
    els.detailPanel.innerHTML = `<div class="empty">Select an article after the feed loads.</div>`;
    return;
  }

  if (!state.selectedArticleId || !state.articles.some((article) => article.id === state.selectedArticleId)) {
    state.selectedArticleId = lead.id;
  }

  els.leadCard.innerHTML = `
    <div class="lead-image">${visualMarkup(lead)}</div>
    <div class="lead-content">
      ${articleMeta(lead)}
      <h2>${escapeHtml(lead.title)}</h2>
      <p>${escapeHtml(lead.excerpt || "No excerpt available. Open the source for the full publisher article.")}</p>
      <div class="lead-actions">
        <button class="primary-button" type="button" data-open="${lead.id}">Read brief</button>
        <button class="secondary-button" type="button" data-source="${escapeHtml(lead.canonicalUrl)}">Open source</button>
      </div>
    </div>
  `;

  els.articleGrid.innerHTML = rest
    .map(
      (article) => `
        <button class="article-card ${article.id === state.selectedArticleId ? "selected" : ""}" type="button" data-open="${article.id}">
          <div class="article-thumb">${visualMarkup(article)}</div>
          <div class="article-body">
            ${articleMeta(article)}
            <h3>${escapeHtml(article.title)}</h3>
            <p>${escapeHtml(article.excerpt || "Open source for details.")}</p>
          </div>
        </button>
      `,
    )
    .join("");

  renderDetail();
}

function renderDetail() {
  const article = currentArticle();
  if (!article) return;

  const summaryBody = article.summary
    ? `
      <div class="summary-box">
        <p>${escapeHtml(article.summary.summary)}</p>
        <ul>${article.summary.keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
        <div class="disclosure">AI-assisted summary. Based on ${escapeHtml(article.summary.basedOn)}. Verify sensitive details with the original source.</div>
      </div>
    `
    : `
      <div class="summary-box">
        <p>No summary has been generated yet.</p>
        <p>To keep costs low, OneStopNews summarizes only when you ask for it, then caches the result.</p>
        <button class="primary-button" type="button" data-summarize="${article.id}">Summarize this article</button>
      </div>
    `;

  const originalBody = `
    <div class="summary-box">
      <p><strong>Original article:</strong> OneStopNews does not copy the full publisher article.</p>
      <p>Use the source button below to read the article on ${escapeHtml(article.source)}.</p>
      <div class="disclosure">Stored content availability: ${escapeHtml(article.contentAvailability)}.</div>
    </div>
  `;

  els.detailPanel.innerHTML = `
    <article class="detail-card">
      <div class="detail-hero">${visualMarkup(article)}</div>
      <div class="detail-inner">
        ${articleMeta(article)}
        <h2>${escapeHtml(article.title)}</h2>
        <div class="toggle" role="group" aria-label="Article view mode">
          <button class="${state.selectedMode === "original" ? "active" : ""}" type="button" data-mode="original">Original Source</button>
          <button class="${state.selectedMode === "summary" ? "active" : ""}" type="button" data-mode="summary">AI Summary</button>
        </div>
        ${state.selectedMode === "summary" ? summaryBody : originalBody}
        <a class="source-link" href="${escapeHtml(article.canonicalUrl)}" target="_blank" rel="noreferrer">Open original source</a>
      </div>
    </article>
  `;
}

function renderStatus(payload) {
  const online = Object.values(payload.sources || {}).filter((source) => source.state === "online").length;
  const total = Object.values(payload.sources || {}).length;
  els.statusPills.innerHTML = `
    <span>${online}/${total || "?"} feeds online</span>
    <span>${payload.lastIngestedAt ? `Updated ${timeAgo(payload.lastIngestedAt)}` : "Not ingested yet"}</span>
    <span>${state.summarized} summarized</span>
  `;
}

async function loadCategories() {
  const response = await fetch("/api/categories");
  const payload = await response.json();
  state.categories = payload.categories;
}

async function loadArticles() {
  const params = new URLSearchParams({
    category: state.selectedCategory,
    subcategory: state.selectedSubcategory,
    sort: state.sort,
    q: state.q,
  });
  const response = await fetch(`/api/articles?${params}`);
  const payload = await response.json();
  state.articles = payload.articles || [];
  state.counts = payload.counts || {};
  state.indexed = payload.indexed || 0;
  state.summarized = payload.summarized || 0;
  renderStatus({ sources: Object.fromEntries((await fetch("/api/source-health").then((res) => res.json())).sources.map((source) => [source.id, source.status])), lastIngestedAt: payload.lastIngestedAt });
  renderTopicNav();
  renderSubcategories();
  renderFeed();
}

async function refreshFeeds() {
  els.refreshButton.disabled = true;
  els.refreshButton.textContent = "Refreshing...";
  try {
    const response = await fetch("/api/ingest", { method: "POST" });
    const payload = await response.json();
    renderStatus({ sources: payload.sources, lastIngestedAt: payload.lastIngestedAt });
    await loadArticles();
  } finally {
    els.refreshButton.disabled = false;
    els.refreshButton.textContent = "Refresh live feeds";
  }
}

async function summarize(articleId) {
  const button = document.querySelector(`[data-summarize="${articleId}"]`);
  if (button) {
    button.disabled = true;
    button.textContent = "Summarizing...";
  }

  const response = await fetch(`/api/summarize/${articleId}`, { method: "POST" });
  const payload = await response.json();
  const article = state.articles.find((item) => item.id === articleId);
  if (article && payload.summary) article.summary = payload.summary;
  renderFeed();
}

document.addEventListener("click", async (event) => {
  const menuButton = event.target.closest("[data-menu]");
  const navButton = event.target.closest("[data-nav-category]");
  const openButton = event.target.closest("[data-open]");
  const sourceButton = event.target.closest("[data-source]");
  const modeButton = event.target.closest("[data-mode]");
  const summarizeButton = event.target.closest("[data-summarize]");

  if (!event.target.closest(".topic-item")) {
    state.openMenuId = "";
    renderTopicNav();
  }

  if (menuButton) {
    state.openMenuId = state.openMenuId === menuButton.dataset.menu ? "" : menuButton.dataset.menu;
    renderTopicNav();
  }

  if (navButton) {
    state.selectedCategory = navButton.dataset.navCategory;
    state.selectedSubcategory = navButton.dataset.navSubcategory;
    state.openMenuId = "";
    await loadArticles();
  }

  if (openButton) {
    state.selectedArticleId = openButton.dataset.open;
    state.selectedMode = "summary";
    renderFeed();
    document.querySelector("#detailPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (sourceButton) {
    window.open(sourceButton.dataset.source, "_blank", "noreferrer");
  }

  if (modeButton) {
    state.selectedMode = modeButton.dataset.mode;
    renderDetail();
  }

  if (summarizeButton) {
    await summarize(summarizeButton.dataset.summarize);
  }
});

els.subcategorySelect.addEventListener("change", async () => {
  state.selectedSubcategory = els.subcategorySelect.value;
  await loadArticles();
});

els.sortSelect.addEventListener("change", async () => {
  state.sort = els.sortSelect.value;
  await loadArticles();
});

els.searchInput.addEventListener("input", async () => {
  state.q = els.searchInput.value;
  await loadArticles();
});

els.refreshButton.addEventListener("click", refreshFeeds);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.openMenuId) {
    state.openMenuId = "";
    renderTopicNav();
  }
});

await loadCategories();
await loadArticles();


```

# static-mvp/index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OneStopNews — Live AI News Aggregator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,550;6..72,700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="app-shell">
      <main class="workspace">
        <header class="site-header">
          <div class="brand">
            <div class="brand-mark">OSN</div>
            <div>
              <strong>OneStopNews</strong>
              <span>Everything important, sorted by topic</span>
            </div>
          </div>
          <div class="status-pills" id="statusPills">
            <span>Loading sources...</span>
          </div>
        </header>

        <section class="hero">
          <div>
            <p class="eyebrow">Live Brief</p>
            <h1>Major stories, grouped by what they are about.</h1>
          </div>
          <div class="hero-actions">
            <label class="search">
              <span>Search</span>
              <input id="searchInput" type="search" placeholder="Apple, Singapore, China, markets..." />
            </label>
            <button class="refresh-button" id="refreshButton" type="button">Refresh live feeds</button>
          </div>
        </section>

        <nav class="topic-nav" id="topicNav" aria-label="Topic navigation"></nav>

        <section class="controls-panel">
          <div>
            <div class="section-label">Current view</div>
            <div class="active-category" id="activeCategory">Top Stories</div>
            <div class="result-count" id="resultCount">Loading articles...</div>
          </div>
          <div class="field">
            <label for="subcategorySelect">Subcategory</label>
            <select id="subcategorySelect"></select>
          </div>
          <div class="field">
            <label for="sortSelect">Sort</label>
            <select id="sortSelect">
              <option value="latest">Latest</option>
              <option value="impact">Highest impact</option>
              <option value="summary">Summary ready</option>
            </select>
          </div>
        </section>

        <section class="feed-layout">
          <div class="lead-card" id="leadCard"></div>
          <div class="article-grid" id="articleGrid"></div>
        </section>
      </main>

      <aside class="detail-panel" id="detailPanel" aria-label="Selected article"></aside>
    </div>

    <script src="/app.js" type="module"></script>
  </body>
</html>

```

# static-mvp/styles.css
```css
:root {
  --ink-950: #151719;
  --ink-800: #262b31;
  --ink-600: #56616f;
  --ink-400: #8994a3;
  --paper: #f7f5ef;
  --surface: #fffdf8;
  --line: #ddd8cc;
  --soft-line: #ece7db;
  --sage: #64786a;
  --sage-dark: #405247;
  --clay: #b86f52;
  --blue: #486b8f;
  --violet: #6d637e;
  --shadow: 0 24px 70px rgba(28, 31, 35, 0.12);
  --radius: 8px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink-950);
  background:
    linear-gradient(140deg, rgba(100, 120, 106, 0.09), transparent 30%),
    linear-gradient(20deg, rgba(184, 111, 82, 0.09), transparent 36%),
    var(--paper);
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 410px;
  min-height: 100vh;
}

.workspace {
  min-width: 0;
  padding: 24px 28px 32px;
}

.site-header,
.hero,
.controls-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.site-header {
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: var(--radius);
  color: #fff;
  background: var(--ink-950);
  font-weight: 850;
  letter-spacing: 0.03em;
}

.brand strong,
.brand span {
  display: block;
}

.brand span {
  margin-top: 2px;
  color: var(--ink-600);
  font-size: 12px;
}

.status-pills {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.status-pills span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  border: 1px solid var(--soft-line);
  border-radius: 999px;
  color: var(--ink-600);
  background: rgba(255, 253, 248, 0.78);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 750;
}

.hero {
  align-items: flex-start;
  margin-bottom: 18px;
}

.eyebrow,
.section-label {
  margin: 0 0 8px;
  color: var(--sage-dark);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

h1 {
  max-width: 790px;
  margin: 0;
  font-family: Newsreader, Georgia, serif;
  font-size: clamp(36px, 5vw, 68px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 0;
}

.hero-actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  min-width: 420px;
}

.search,
.field {
  display: grid;
  gap: 6px;
  color: var(--ink-600);
  font-size: 12px;
  font-weight: 750;
}

.search {
  flex: 1;
}

.search input,
select {
  width: 100%;
  height: 42px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--ink-950);
  background: rgba(255, 253, 248, 0.94);
  padding: 0 12px;
  outline: none;
}

.search input:focus,
select:focus,
button:focus-visible {
  border-color: var(--sage);
  box-shadow: 0 0 0 3px rgba(100, 120, 106, 0.18);
  outline: none;
}

.refresh-button,
.primary-button,
.source-link {
  min-height: 42px;
  border: 0;
  border-radius: var(--radius);
  color: #fff;
  background: var(--ink-950);
  padding: 0 16px;
  font-weight: 850;
  text-decoration: none;
}

.refresh-button[disabled] {
  cursor: wait;
  opacity: 0.68;
}

.topic-nav {
  position: sticky;
  z-index: 8;
  top: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 18px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 253, 248, 0.94);
  backdrop-filter: blur(18px);
  box-shadow: 0 14px 40px rgba(28, 31, 35, 0.08);
}

.topic-item {
  position: relative;
}

.topic-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  border: 0;
  border-radius: 7px;
  color: var(--ink-600);
  background: transparent;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
}

.topic-button::after {
  content: "";
  width: 7px;
  height: 7px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translateY(-2px) rotate(45deg);
}

.topic-item.open .topic-button,
.topic-button:hover {
  color: var(--ink-950);
  background: #eef1ea;
}

.topic-menu {
  position: absolute;
  top: calc(100% + 9px);
  left: 0;
  display: none;
  width: min(560px, calc(100vw - 470px));
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.topic-item.open .topic-menu {
  display: grid;
  gap: 14px;
}

.topic-menu-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.topic-menu-header strong {
  display: block;
  font-family: Newsreader, Georgia, serif;
  font-size: 25px;
  line-height: 1;
}

.topic-menu-header span {
  display: block;
  margin-top: 4px;
  color: var(--ink-600);
  font-size: 13px;
  line-height: 1.4;
}

.topic-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 74px;
  min-height: 30px;
  border-radius: 999px;
  color: var(--sage-dark);
  background: #eef1ea;
  font-size: 12px;
  font-weight: 850;
}

.topic-subgrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.topic-subitem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  border: 1px solid var(--soft-line);
  border-radius: var(--radius);
  color: var(--ink-800);
  background: #fbf9f2;
  padding: 0 11px;
  text-align: left;
  font-size: 13px;
  font-weight: 800;
}

.topic-subitem:hover {
  border-color: rgba(64, 82, 71, 0.3);
  background: #f1f3ec;
}

.controls-panel {
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 253, 248, 0.82);
}

.active-category {
  font-size: 22px;
  font-weight: 850;
}

.result-count {
  margin-top: 4px;
  color: var(--ink-600);
  font-size: 13px;
  font-weight: 650;
}

.field {
  min-width: 190px;
}

.feed-layout {
  display: grid;
  grid-template-columns: minmax(310px, 0.92fr) minmax(380px, 1.08fr);
  gap: 16px;
}

.lead-card,
.article-card,
.detail-card,
.empty {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: 0 12px 30px rgba(28, 31, 35, 0.06);
}

.lead-card {
  overflow: hidden;
}

.news-art {
  width: 100%;
  height: 100%;
  min-height: 150px;
  display: grid;
  place-items: end start;
  padding: 18px;
  color: rgba(255, 255, 255, 0.88);
  background:
    linear-gradient(135deg, var(--art-a), var(--art-b)),
    var(--ink-800);
}

.news-art span {
  max-width: 82%;
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lead-image {
  height: 300px;
}

.lead-content,
.article-body,
.detail-inner {
  padding: 18px;
}

.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--ink-400);
  font-size: 12px;
}

.source-chip,
.summary-ready {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.04em;
}

.source-chip {
  color: var(--ink-950);
  background: #ede6d5;
}

.summary-ready {
  color: #fff;
  background: var(--blue);
}

.category-tag {
  color: var(--sage-dark);
  font-weight: 800;
}

.lead-card h2,
.article-card h3,
.detail-card h2 {
  margin: 0;
  font-family: Newsreader, Georgia, serif;
  letter-spacing: 0;
}

.lead-card h2 {
  font-size: 32px;
  line-height: 1.02;
}

.detail-card h2 {
  margin: 12px 0 8px;
  font-size: 30px;
  line-height: 1.06;
}

.lead-card p,
.article-card p,
.detail-card p,
.empty {
  color: var(--ink-600);
  line-height: 1.55;
}

.lead-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.secondary-button {
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--ink-950);
  background: transparent;
  padding: 0 14px;
  font-weight: 850;
}

.article-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.article-card {
  display: grid;
  grid-template-rows: 150px auto;
  min-height: 338px;
  overflow: hidden;
  text-align: left;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.article-card:hover,
.article-card.selected {
  transform: translateY(-2px);
  border-color: rgba(64, 82, 71, 0.34);
  box-shadow: var(--shadow);
}

.article-card h3 {
  font-size: 21px;
  line-height: 1.1;
}

.article-card p {
  margin-bottom: 0;
  font-size: 14px;
}

.detail-panel {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 22px 18px;
  border-left: 1px solid var(--line);
  background: rgba(255, 253, 248, 0.86);
  backdrop-filter: blur(18px);
  overflow: auto;
}

.detail-card {
  overflow: hidden;
}

.detail-hero {
  height: 180px;
}

.toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin: 18px 0;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #f1ece1;
}

.toggle button {
  min-height: 38px;
  border: 0;
  border-radius: 6px;
  color: var(--ink-600);
  background: transparent;
  font-weight: 850;
}

.toggle button.active {
  color: var(--ink-950);
  background: var(--surface);
  box-shadow: 0 8px 18px rgba(28, 31, 35, 0.08);
}

.summary-box {
  padding: 14px;
  border: 1px solid var(--soft-line);
  border-radius: var(--radius);
  background: #faf8f1;
}

.summary-box ul {
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--ink-600);
  line-height: 1.5;
}

.disclosure {
  margin-top: 12px;
  color: var(--ink-400);
  font-size: 12px;
  line-height: 1.45;
}

.source-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 14px;
}

.empty {
  padding: 22px;
}

@media (max-width: 1220px) {
  .app-shell {
    display: block;
  }

  .detail-panel {
    position: static;
    height: auto;
    border-left: 0;
    border-top: 1px solid var(--line);
  }

  .feed-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .workspace {
    padding: 18px;
  }

  .site-header,
  .hero,
  .hero-actions,
  .controls-panel {
    display: grid;
    min-width: 0;
  }

  .status-pills {
    justify-content: flex-start;
  }

  h1 {
    font-size: clamp(40px, 12vw, 58px);
  }

  .topic-nav {
    position: relative;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    gap: 8px;
    overflow: visible;
    padding: 10px;
  }

  .topic-item {
    position: static;
  }

  .topic-button {
    justify-content: space-between;
    width: 100%;
    min-height: 50px;
    padding: 0 14px;
    font-size: 14px;
    text-align: left;
  }

  .topic-menu {
    position: static;
    grid-column: 1 / -1;
    width: 100%;
    margin-top: 2px;
    padding: 14px;
    box-shadow: 0 14px 34px rgba(28, 31, 35, 0.12);
  }

  .topic-menu-header {
    display: grid;
    gap: 10px;
  }

  .topic-count {
    justify-self: start;
  }

  .topic-subgrid,
  .article-grid {
    grid-template-columns: 1fr;
  }

  .topic-subitem {
    min-height: 48px;
    font-size: 14px;
  }
}

@media (min-width: 640px) and (max-width: 860px) {
  .topic-nav {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .topic-subgrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

```

# static-1/index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    OneStopNews — Stop Reading The Same Story Five Times
  </title>

  <meta
    name="description"
    content="OneStopNews organizes coverage into living story clusters so you can understand what happened before deciding what to read."
  />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <link
    href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,700;6..72,800&display=swap"
    rel="stylesheet"
  />

  <link rel="stylesheet" href="./landing.css" />
</head>

<body>
  <div class="page-shell">

    <!-- ====================================== -->
    <!-- HEADER                                 -->
    <!-- ====================================== -->

    <header class="site-header">
      <div class="brand">
        <div class="brand-mark">OSN</div>

        <div>
          <strong>OneStopNews</strong>
          <span>Everything important, sorted by topic.</span>
        </div>
      </div>

      <nav class="main-nav">
        <a href="#clusters">Story Clusters</a>
        <a href="#topics">Topics</a>
        <a href="#ai">AI Summaries</a>
        <a href="#trust">Trust</a>
      </nav>

      <a class="header-cta" href="#cta">
        Start Reading
      </a>
    </header>

    <main>

      <!-- ====================================== -->
      <!-- HERO                                  -->
      <!-- ====================================== -->

      <section class="hero section">
        <div class="hero-copy">
          <div class="eyebrow">
            Editorial Intelligence
          </div>

          <h1>
            Stop reading
            the same story
            five times.
          </h1>

          <p class="hero-description">
            OneStopNews groups reporting from hundreds of
            publishers into living story clusters so you can
            understand what happened before deciding what
            deserves your attention.
          </p>

          <div class="hero-actions">
            <a href="#clusters" class="button-primary">
              Explore Story Clusters
            </a>

            <a href="#preview" class="button-secondary">
              Preview The Product
            </a>
          </div>
        </div>

        <div class="hero-stat-block">
          <div class="hero-stat">
            <strong data-counter="8000">0</strong>
            <span>Articles Indexed Daily</span>
          </div>

          <div class="hero-stat">
            <strong data-counter="250">0</strong>
            <span>News Sources</span>
          </div>

          <div class="hero-stat">
            <strong data-counter="42">0</strong>
            <span>Active Topics</span>
          </div>
        </div>
      </section>

      <!-- ====================================== -->
      <!-- STORY CLUSTER WALL                     -->
      <!-- ====================================== -->

      <section
        id="clusters"
        class="story-wall section reveal"
      >
        <div class="section-heading">
          <div class="eyebrow">Story Clusters</div>

          <h2>
            One event.
            Many perspectives.
          </h2>

          <p>
            Traditional news readers show every article.
            OneStopNews shows the story.
          </p>
        </div>

        <div class="cluster-stage">

          <div class="publisher-column">

            <div class="publisher-node">
              Reuters
            </div>

            <div class="publisher-node">
              Bloomberg
            </div>

            <div class="publisher-node">
              CNBC
            </div>

            <div class="publisher-node">
              BBC
            </div>

            <div class="publisher-node">
              The Verge
            </div>

          </div>

          <div class="cluster-core">

            <div class="cluster-ring"></div>

            <div class="cluster-card">

              <div class="cluster-label">
                Live Story Cluster
              </div>

              <h3 id="clusterTitle">
                Apple Expands AI Strategy
              </h3>

              <div class="cluster-metrics">
                <span>32 Sources</span>
                <span>147 Articles</span>
                <span>High Impact</span>
              </div>
            </div>

          </div>

          <div class="cluster-insights">

            <div class="insight-card">
              New AI products announced
            </div>

            <div class="insight-card">
              Enterprise rollout expands
            </div>

            <div class="insight-card">
              Developer ecosystem grows
            </div>

          </div>

        </div>
      </section>

      <!-- ====================================== -->
      <!-- PROCESS                               -->
      <!-- ====================================== -->

      <section class="process section reveal">

        <div class="section-heading">
          <div class="eyebrow">
            How It Works
          </div>

          <h2>
            Built for understanding.
          </h2>
        </div>

        <div class="process-grid">

          <article class="process-card">
            <span>01</span>

            <h3>Collect</h3>

            <p>
              Thousands of articles arrive from trusted
              publishers every day.
            </p>
          </article>

          <article class="process-card">
            <span>02</span>

            <h3>Cluster</h3>

            <p>
              Related coverage is grouped into a single
              evolving story.
            </p>
          </article>

          <article class="process-card">
            <span>03</span>

            <h3>Compress</h3>

            <p>
              Optional AI summaries help you understand
              developments in seconds.
            </p>
          </article>

        </div>
      </section>

      <!-- ====================================== -->
      <!-- COMPARISON                            -->
      <!-- ====================================== -->

      <section class="comparison section reveal">

        <div class="comparison-column">

          <div class="comparison-label">
            Traditional News
          </div>

          <div class="headline-stack">
            Apple Announces AI Platform
          </div>

          <div class="headline-stack">
            Apple Reveals AI Features
          </div>

          <div class="headline-stack">
            Apple Expands AI Roadmap
          </div>

          <div class="headline-stack">
            Apple Launches New AI Tools
          </div>

        </div>

        <div class="comparison-divider">
          →
        </div>

        <div class="comparison-column optimized">

          <div class="comparison-label">
            OneStopNews
          </div>

          <div class="story-node">
            APPLE AI STRATEGY
          </div>

          <p>
            One cluster.
            Multiple perspectives.
            Faster understanding.
          </p>

        </div>

      </section>

      <!-- ====================================== -->
      <!-- TOPICS                                -->
      <!-- ====================================== -->

      <section
        id="topics"
        class="topics section reveal"
      >

        <div class="section-heading">
          <div class="eyebrow">
            Topic Universe
          </div>

          <h2>
            Browse by what matters.
          </h2>
        </div>

        <div class="topic-cloud">

          <button
            class="topic-word"
            data-count="2342"
          >
            TECH
          </button>

          <button
            class="topic-word"
            data-count="1780"
          >
            FINANCE
          </button>

          <button
            class="topic-word"
            data-count="1291"
          >
            GLOBAL
          </button>

          <button
            class="topic-word"
            data-count="985"
          >
            POLITICS
          </button>

          <button
            class="topic-word"
            data-count="744"
          >
            CULTURE
          </button>

        </div>

        <div id="topicInfo" class="topic-info">
          Hover a topic to explore active coverage.
        </div>

      </section>

      <!-- ====================================== -->
      <!-- AI                                    -->
      <!-- ====================================== -->

      <section
        id="ai"
        class="ai-section section reveal"
      >

        <div class="section-heading">
          <div class="eyebrow">
            AI Summaries
          </div>

          <h2>
            AI when you need it.
            Not when you don't.
          </h2>
        </div>

        <div class="ai-grid">

          <div class="ai-panel">
            <h3>Original Source</h3>

            <p>
              Reuters reports Apple expanded its
              enterprise AI roadmap and announced
              new developer APIs.
            </p>
          </div>

          <div class="ai-panel summary">
            <h3>AI Summary</h3>

            <ul>
              <li>Enterprise AI rollout expands.</li>
              <li>Developer ecosystem grows.</li>
              <li>New competitive pressure emerges.</li>
            </ul>
          </div>

        </div>

      </section>

      <!-- ====================================== -->
      <!-- PRODUCT PREVIEW                       -->
      <!-- ====================================== -->

      <section
        id="preview"
        class="preview section reveal"
      >

        <div class="section-heading">
          <div class="eyebrow">
            Product Preview
          </div>

          <h2>
            Calm.
            Dense.
            Topic-first.
          </h2>
        </div>

        <div class="app-preview">

          <aside class="preview-nav">
            <span>TOP</span>
            <span>TECH</span>
            <span>FINANCE</span>
            <span>GLOBAL</span>
            <span>POLITICS</span>
          </aside>

          <div class="preview-feed">

            <div class="preview-cluster">
              <strong>
                Apple AI Strategy
              </strong>

              <span>
                147 articles · 32 sources
              </span>
            </div>

            <div class="preview-cluster">
              <strong>
                Nvidia Earnings
              </strong>

              <span>
                89 articles · 21 sources
              </span>
            </div>

            <div class="preview-cluster">
              <strong>
                Global Markets
              </strong>

              <span>
                56 articles · 18 sources
              </span>
            </div>

          </div>

          <aside class="preview-detail">

            <h4>
              AI Summary
            </h4>

            <p>
              Key developments summarized while
              preserving direct access to publishers.
            </p>

          </aside>

        </div>

      </section>

      <!-- ====================================== -->
      <!-- TRUST                                 -->
      <!-- ====================================== -->

      <section
        id="trust"
        class="trust section reveal"
      >

        <div class="section-heading">
          <div class="eyebrow">
            Trust & Transparency
          </div>

          <h2>
            Built for understanding.
            Not engagement farming.
          </h2>
        </div>

        <div class="trust-grid">

          <article>
            Sources Always Visible
          </article>

          <article>
            AI Clearly Labeled
          </article>

          <article>
            Publisher First
          </article>

          <article>
            No AI Written News
          </article>

        </div>

      </section>

      <!-- ====================================== -->
      <!-- CTA                                   -->
      <!-- ====================================== -->

      <section
        id="cta"
        class="cta section reveal"
      >

        <div class="eyebrow">
          OneStopNews
        </div>

        <h2>
          The news
          should make sense.
        </h2>

        <p>
          Everything important.
          Sorted by topic.
        </p>

        <a href="#" class="button-primary">
          Start Reading
        </a>

      </section>

    </main>

    <footer class="site-footer">
      <span>
        OneStopNews
      </span>

      <span>
        Topic-first news intelligence.
      </span>
    </footer>

  </div>

  <script src="./landing.js"></script>
</body>
</html>

```

# static-1/landing.css
```css
/* ====================================== */
/* DESIGN TOKENS                          */
/* ====================================== */

:root {
  --paper: #f6f3ec;
  --ink: #121416;
  --ink-light: #56616f;
  --ink-lighter: #8994a3;
  --slate: #526171;
  --moss: #4d6657;
  --moss-dark: #405247;
  --clay: #a86a4a;
  --clay-light: #c9a67f;

  --radius: 8px;
  --radius-lg: 12px;

  --shadow-sm: 0 4px 12px rgba(18, 20, 22, 0.06);
  --shadow-md: 0 12px 30px rgba(18, 20, 22, 0.12);
  --shadow-lg: 0 24px 70px rgba(18, 20, 22, 0.18);

  --transition-base: 240ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 420ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ====================================== */
/* GLOBAL STYLES                          */
/* ====================================== */

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  color: var(--ink);
  background: linear-gradient(140deg, rgba(77, 102, 87, 0.06), transparent 30%),
    linear-gradient(20deg, rgba(168, 106, 74, 0.06), transparent 36%),
    var(--paper);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue",
    sans-serif;
  font-size: 16px;
  line-height: 1.6;
}

/* ====================================== */
/* TYPOGRAPHY                             */
/* ====================================== */

h1,
h2,
h3,
h4,
h5,
h6 {
  margin: 0;
  font-family: "Newsreader", Georgia, serif;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.01em;
}

h1 {
  font-size: clamp(48px, 8vw, 72px);
  line-height: 0.98;
}

h2 {
  font-size: clamp(32px, 6vw, 52px);
  line-height: 1.02;
}

h3 {
  font-size: clamp(20px, 3vw, 28px);
  line-height: 1.1;
}

h4 {
  font-size: 18px;
  font-weight: 700;
}

p {
  margin: 0;
  color: var(--ink-light);
  line-height: 1.65;
}

.eyebrow {
  display: block;
  margin: 0 0 12px 0;
  color: var(--moss-dark);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* ====================================== */
/* PAGE SHELL                             */
/* ====================================== */

.page-shell {
  position: relative;
  width: 100%;
  overflow-x: hidden;
}

main {
  width: 100%;
}

/* ====================================== */
/* HEADER                                 */
/* ====================================== */

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(18, 20, 22, 0.08);
  background: rgba(246, 243, 236, 0.92);
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-sm);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: var(--radius);
  background: var(--ink);
  color: #fff;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.brand strong {
  display: block;
  font-size: 14px;
  font-weight: 800;
}

.brand span {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--ink-light);
  font-weight: 600;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-grow: 1;
}

.main-nav a {
  color: var(--ink-light);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: color var(--transition-base);
}

.main-nav a:hover {
  color: var(--ink);
}

.main-nav a:focus-visible {
  outline: 2px solid var(--moss);
  outline-offset: 2px;
  border-radius: 2px;
}

.header-cta {
  flex-shrink: 0;
}

@media (max-width: 860px) {
  .site-header {
    gap: 12px;
    padding: 12px 16px;
  }

  .main-nav {
    display: none;
  }
}

/* ====================================== */
/* BUTTONS                                */
/* ====================================== */

.button-primary,
.button-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 24px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  transition: all var(--transition-base);
  cursor: pointer;
  border: 0;
}

.button-primary {
  background: var(--ink);
  color: #fff;
}

.button-primary:hover {
  background: var(--ink-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.button-primary:focus-visible {
  outline: 2px solid var(--moss);
  outline-offset: 2px;
}

.button-secondary {
  background: transparent;
  color: var(--ink);
  border: 2px solid var(--ink-light);
}

.button-secondary:hover {
  border-color: var(--ink);
  background: rgba(18, 20, 22, 0.04);
}

.button-secondary:focus-visible {
  outline: 2px solid var(--moss);
  outline-offset: 2px;
}

/* ====================================== */
/* SECTIONS                               */
/* ====================================== */

.section {
  width: 100%;
  padding: 80px 24px;
  margin: 0 auto;
}

.section-heading {
  max-width: 720px;
  margin: 0 auto 60px;
  text-align: center;
}

.section-heading h2 {
  margin: 12px 0 16px;
}

.section-heading p {
  font-size: 18px;
}

@media (max-width: 860px) {
  .section {
    padding: 60px 18px;
  }

  .section-heading {
    margin-bottom: 40px;
  }
}

/* ====================================== */
/* REVEAL ANIMATION                       */
/* ====================================== */

.reveal {
  opacity: 0;
  transform: translateY(40px);
  animation: revealIn 0.8s ease-out forwards;
}

@keyframes revealIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
  }
}

/* ====================================== */
/* HERO                                   */
/* ====================================== */

.hero {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: start;
  padding-top: 100px;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.hero-description {
  font-size: 18px;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.hero-stat-block {
  display: grid;
  gap: 28px;
  padding: 40px;
  border: 1px solid rgba(18, 20, 22, 0.12);
  border-radius: var(--radius-lg);
  background: rgba(255, 253, 248, 0.94);
  box-shadow: var(--shadow-sm);
}

.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hero-stat strong {
  font-family: "Newsreader", Georgia, serif;
  font-size: 44px;
  font-weight: 800;
  line-height: 1;
}

.hero-stat span {
  color: var(--ink-light);
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 48px;
  }
}

@media (max-width: 860px) {
  .hero {
    padding-top: 60px;
    gap: 36px;
  }

  .hero-actions {
    flex-direction: column;
  }

  .button-primary,
  .button-secondary {
    width: 100%;
  }
}

/* ====================================== */
/* STORY WALL                             */
/* ====================================== */

.story-wall {
  max-width: 1400px;
  margin: 0 auto;
}

.cluster-stage {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 60px;
  align-items: center;
  margin: 60px 0;
}

.publisher-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.publisher-node {
  padding: 16px 20px;
  border: 1px solid rgba(18, 20, 22, 0.12);
  border-radius: var(--radius);
  background: rgba(255, 253, 248, 0.94);
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  text-align: center;
  transition: all var(--transition-base);
  animation: floatNode 4s ease-in-out infinite;
}

.publisher-node:nth-child(1) {
  animation-delay: 0s;
}

.publisher-node:nth-child(2) {
  animation-delay: 0.6s;
}

.publisher-node:nth-child(3) {
  animation-delay: 1.2s;
}

.publisher-node:nth-child(4) {
  animation-delay: 1.8s;
}

.publisher-node:nth-child(5) {
  animation-delay: 2.4s;
}

@keyframes floatNode {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .publisher-node {
    animation: none;
  }
}

.cluster-core {
  position: relative;
  display: grid;
  place-items: center;
}

.cluster-ring {
  position: absolute;
  width: 200px;
  height: 200px;
  border: 2px solid var(--moss);
  border-radius: 50%;
  animation: breathe 3s ease-in-out infinite;
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.3;
  }

  50% {
    transform: scale(1.1);
    opacity: 0.6;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cluster-ring {
    animation: none;
    opacity: 0.3;
  }
}

.cluster-card {
  position: relative;
  z-index: 2;
  padding: 28px;
  border: 1px solid var(--moss);
  border-radius: var(--radius-lg);
  background: var(--paper);
  text-align: center;
  width: 280px;
  box-shadow: var(--shadow-md);
}

.cluster-label {
  color: var(--moss-dark);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.cluster-card h3 {
  margin-bottom: 16px;
}

.cluster-metrics {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-light);
}

.cluster-insights {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.insight-card {
  padding: 16px;
  border: 1px solid rgba(77, 102, 87, 0.2);
  border-radius: var(--radius);
  background: rgba(77, 102, 87, 0.08);
  font-size: 14px;
  color: var(--ink);
  font-weight: 600;
}

@media (max-width: 1100px) {
  .cluster-stage {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .publisher-column {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .publisher-node {
    flex: 0 1 calc(33.33% - 11px);
  }
}

@media (max-width: 640px) {
  .cluster-card {
    width: 100%;
  }

  .publisher-node {
    flex: 1;
  }
}

/* ====================================== */
/* PROCESS                                */
/* ====================================== */

.process-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.process-card {
  padding: 40px;
  border: 1px solid rgba(18, 20, 22, 0.12);
  border-radius: var(--radius-lg);
  background: rgba(255, 253, 248, 0.94);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.process-card span {
  font-family: "Newsreader", Georgia, serif;
  font-size: 32px;
  font-weight: 800;
  color: var(--moss);
}

.process-card h3 {
  margin: 0;
}

@media (max-width: 900px) {
  .process-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

/* ====================================== */
/* COMPARISON                             */
/* ====================================== */

.comparison {
  max-width: 1200px;
  margin: 0 auto;
}

.comparison {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 60px;
  align-items: center;
}

.comparison-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comparison-label {
  color: var(--ink-light);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.headline-stack {
  padding: 16px;
  border-left: 3px solid var(--clay);
  background: rgba(168, 106, 74, 0.06);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink);
}

.comparison-divider {
  font-size: 32px;
  color: var(--moss);
  font-weight: 800;
}

.story-node {
  padding: 24px;
  border: 2px solid var(--moss);
  border-radius: var(--radius-lg);
  background: rgba(77, 102, 87, 0.08);
  font-family: "Newsreader", Georgia, serif;
  font-size: 20px;
  font-weight: 800;
  color: var(--moss-dark);
  text-align: center;
}

.comparison-column.optimized {
  gap: 20px;
}

.comparison-column.optimized p {
  color: var(--ink-light);
  font-size: 15px;
}

@media (max-width: 1000px) {
  .comparison {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .comparison-divider {
    text-align: center;
    transform: rotate(90deg);
  }
}

/* ====================================== */
/* TOPICS                                 */
/* ====================================== */

.topic-cloud {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 32px;
  margin: 60px 0;
}

.topic-word {
  background: none;
  border: none;
  color: var(--ink-light);
  font-family: "Newsreader", Georgia, serif;
  font-size: clamp(28px, 6vw, 56px);
  font-weight: 800;
  cursor: pointer;
  transition: all var(--transition-slow);
  position: relative;
  padding: 0;
}

.topic-word:hover {
  color: var(--moss-dark);
  transform: scale(1.08);
}

.topic-word:focus-visible {
  outline: 2px solid var(--moss);
  outline-offset: 4px;
  border-radius: 2px;
}

.topic-info {
  text-align: center;
  font-size: 15px;
  color: var(--ink-light);
  padding: 24px;
  border-radius: var(--radius);
  background: rgba(77, 102, 87, 0.06);
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
}

@media (max-width: 860px) {
  .topic-cloud {
    gap: 24px;
  }

  .topic-word {
    font-size: clamp(24px, 5vw, 40px);
  }
}

/* ====================================== */
/* AI SECTION                             */
/* ====================================== */

.ai-section {
  max-width: 1200px;
  margin: 0 auto;
}

.ai-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-top: 60px;
}

.ai-panel {
  padding: 32px;
  border: 1px solid rgba(18, 20, 22, 0.12);
  border-radius: var(--radius-lg);
  background: rgba(255, 253, 248, 0.94);
}

.ai-panel h3 {
  margin: 0 0 16px 0;
  color: var(--ink);
}

.ai-panel p {
  line-height: 1.7;
}

.ai-panel.summary {
  background: rgba(77, 102, 87, 0.08);
  border-color: rgba(77, 102, 87, 0.2);
}

.ai-panel ul {
  margin: 0;
  padding-left: 20px;
  list-style: disc;
  color: var(--ink-light);
}

.ai-panel li {
  margin-bottom: 8px;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .ai-grid {
    grid-template-columns: 1fr;
  }
}

/* ====================================== */
/* PRODUCT PREVIEW                        */
/* ====================================== */

.preview {
  max-width: 1400px;
  margin: 0 auto;
}

.app-preview {
  display: grid;
  grid-template-columns: 140px 1fr 280px;
  gap: 0;
  border: 1px solid rgba(18, 20, 22, 0.12);
  border-radius: var(--radius-lg);
  background: rgba(255, 253, 248, 0.94);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  margin-top: 60px;
  min-height: 480px;
}

.preview-nav {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: rgba(18, 20, 22, 0.04);
  border-right: 1px solid rgba(18, 20, 22, 0.08);
  padding: 16px;
}

.preview-nav span {
  padding: 12px;
  color: var(--ink-light);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-align: center;
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--transition-base);
}

.preview-nav span:hover {
  background: rgba(18, 20, 22, 0.08);
  color: var(--ink);
}

.preview-feed {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-cluster {
  padding: 16px;
  border: 1px solid rgba(77, 102, 87, 0.2);
  border-radius: var(--radius);
  background: rgba(77, 102, 87, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  transition: all var(--transition-base);
}

.preview-cluster:hover {
  background: rgba(77, 102, 87, 0.12);
  border-color: rgba(77, 102, 87, 0.4);
}

.preview-cluster strong {
  font-size: 13px;
  color: var(--ink);
  font-weight: 700;
}

.preview-cluster span {
  font-size: 11px;
  color: var(--ink-light);
  font-weight: 600;
}

.preview-detail {
  padding: 24px;
  border-left: 1px solid rgba(18, 20, 22, 0.08);
  background: rgba(18, 20, 22, 0.02);
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.preview-detail h4 {
  margin: 0;
}

.preview-detail p {
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .app-preview {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .preview-nav {
    flex-direction: row;
    border-right: 0;
    border-bottom: 1px solid rgba(18, 20, 22, 0.08);
    overflow-x: auto;
  }

  .preview-detail {
    border-left: 0;
    border-top: 1px solid rgba(18, 20, 22, 0.08);
  }
}

/* ====================================== */
/* TRUST                                  */
/* ====================================== */

.trust {
  max-width: 1200px;
  margin: 0 auto;
}

.trust-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  margin-top: 60px;
}

.trust-grid article {
  padding: 40px;
  border: 1px solid rgba(18, 20, 22, 0.12);
  border-radius: var(--radius-lg);
  background: rgba(255, 253, 248, 0.94);
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

@media (max-width: 900px) {
  .trust-grid {
    grid-template-columns: 1fr;
  }
}

/* ====================================== */
/* CTA SECTION                            */
/* ====================================== */

.cta {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}

.cta h2 {
  margin-bottom: 12px;
}

.cta p {
  font-size: 18px;
  margin-bottom: 32px;
}

/* ====================================== */
/* FOOTER                                 */
/* ====================================== */

.site-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 32px 24px;
  border-top: 1px solid rgba(18, 20, 22, 0.08);
  background: rgba(246, 243, 236, 0.94);
  color: var(--ink-light);
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 640px) {
  .site-footer {
    flex-direction: column;
    text-align: center;
  }
}

/* ====================================== */
/* ACCESSIBILITY                          */
/* ====================================== */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: more) {
  :root {
    --shadow-sm: 0 2px 4px rgba(18, 20, 22, 0.2);
    --shadow-md: 0 4px 8px rgba(18, 20, 22, 0.3);
    --shadow-lg: 0 8px 16px rgba(18, 20, 22, 0.4);
  }
}

/* Print styles */
@media print {
  .site-header,
  .site-footer,
  .header-cta {
    display: none;
  }

  .page-shell {
    background: #fff;
  }
}

```

# static-1/landing.js
```js
/* ====================================== */
/* LANDING PAGE INTERACTIONS              */
/* ====================================== */

/**
 * Story Cluster Wall
 * Rotates through example clusters with animations
 */

const clusterExamples = [
  {
    title: "Apple Expands AI Strategy",
    sources: 32,
    articles: 147,
  },
  {
    title: "Nvidia Earnings Surge",
    sources: 28,
    articles: 134,
  },
  {
    title: "Global Markets Shift",
    sources: 24,
    articles: 89,
  },
  {
    title: "US Election Developments",
    sources: 35,
    articles: 167,
  },
  {
    title: "Singapore Housing Policy",
    sources: 18,
    articles: 56,
  },
];

let currentClusterIndex = 0;

function rotateCluster() {
  const clusterTitle = document.getElementById("clusterTitle");

  if (!clusterTitle) return;

  const cluster = clusterExamples[currentClusterIndex];

  // Fade out
  clusterTitle.style.opacity = "0";
  clusterTitle.style.transform = "translateY(-8px)";

  setTimeout(() => {
    clusterTitle.textContent = cluster.title;

    // Update metrics
    const metrics = document.querySelectorAll(".cluster-metrics span");
    if (metrics[0]) metrics[0].textContent = `${cluster.sources} Sources`;
    if (metrics[1]) metrics[1].textContent = `${cluster.articles} Articles`;

    // Fade in
    clusterTitle.style.opacity = "1";
    clusterTitle.style.transform = "translateY(0)";

    currentClusterIndex = (currentClusterIndex + 1) % clusterExamples.length;
  }, 240);
}

// Rotate clusters every 6 seconds
setInterval(rotateCluster, 6000);

/* ====================================== */
/* TOPIC UNIVERSE INTERACTIONS            */
/* ====================================== */

const topicData = {
  TECH: {
    count: 2342,
    description: "AI, startups, semiconductors, cybersecurity.",
  },
  FINANCE: {
    count: 1780,
    description: "Markets, earnings, crypto, commodities.",
  },
  GLOBAL: {
    count: 1291,
    description: "International news, geopolitics, regional updates.",
  },
  POLITICS: {
    count: 985,
    description: "Elections, policy, government developments.",
  },
  CULTURE: {
    count: 744,
    description: "Entertainment, internet culture, celebrities.",
  },
};

function initTopicInteractions() {
  const topicWords = document.querySelectorAll(".topic-word");
  const topicInfo = document.getElementById("topicInfo");

  if (!topicInfo) return;

  topicWords.forEach((button) => {
    const topic = button.textContent.trim();

    button.addEventListener("mouseenter", () => {
      const data = topicData[topic];
      if (data) {
        topicInfo.textContent = `${data.count} active stories · ${data.description}`;
      }
    });

    button.addEventListener("mouseleave", () => {
      topicInfo.textContent = "Hover a topic to explore active coverage.";
    });

    // Mobile: click to show info
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const data = topicData[topic];
      if (data) {
        topicInfo.textContent = `${data.count} active stories · ${data.description}`;
      }
    });
  });
}

/* ====================================== */
/* COUNTER ANIMATION                      */
/* ====================================== */

function animateCounter(element, targetValue) {
  const duration = 1200; // ms
  const startValue = 0;
  const startTime = Date.now();

  function update() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function: easeOutCubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    const currentValue = Math.floor(
      startValue + (targetValue - startValue) * easeProgress,
    );

    element.textContent = currentValue.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  update();
}

function initCounterAnimations() {
  const counterElements = document.querySelectorAll("[data-counter]");

  if (counterElements.length === 0) return;

  // Use Intersection Observer to trigger animation when visible
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          const targetValue = parseInt(entry.target.dataset.counter, 10);
          animateCounter(entry.target, targetValue);
          entry.target.dataset.animated = "true";
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.5,
    },
  );

  counterElements.forEach((el) => {
    observer.observe(el);
  });
}

/* ====================================== */
/* SCROLL REVEAL ENHANCEMENT              */
/* ====================================== */

function initScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal");

  if (revealElements.length === 0) return;

  // Add staggered animation delays
  revealElements.forEach((el, index) => {
    el.style.animationDelay = `${index * 0.1}s`;
  });

  // Intersection Observer for late-loading reveals
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
    },
  );

  revealElements.forEach((el) => {
    observer.observe(el);
  });
}

/* ====================================== */
/* SMOOTH SCROLL ENHANCEMENT              */
/* ====================================== */

function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");

      if (href === "#") {
        e.preventDefault();
        return;
      }

      const target = document.querySelector(href);

      if (target) {
        e.preventDefault();

        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        // Focus management for accessibility
        target.focus({ preventScroll: true });
      }
    });
  });
}

/* ====================================== */
/* PUBLISHER NODE ANIMATION ENHANCEMENT   */
/* ====================================== */

function initPublisherNodeAnimations() {
  const publisherNodes = document.querySelectorAll(".publisher-node");

  if (publisherNodes.length === 0) return;

  publisherNodes.forEach((node) => {
    node.addEventListener("mouseenter", () => {
      node.style.transform = "scale(1.05) translateY(-4px)";
      node.style.boxShadow = "0 12px 30px rgba(18, 20, 22, 0.12)";
    });

    node.addEventListener("mouseleave", () => {
      node.style.transform = "";
      node.style.boxShadow = "";
    });
  });
}

/* ====================================== */
/* CLUSTER CARD ANIMATION                 */
/* ====================================== */

function initClusterCardAnimation() {
  const clusterCard = document.querySelector(".cluster-card");

  if (!clusterCard) return;

  // Subtle pulse on load
  clusterCard.style.animation = "clusterPulse 1.2s ease-out";
}

// Add dynamic keyframes for cluster pulse
function injectDynamicStyles() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes clusterPulse {
      0% {
        transform: scale(0.95);
        opacity: 0;
      }
      50% {
        transform: scale(1.02);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ====================================== */
/* PREVIEW PANEL INTERACTIONS             */
/* ====================================== */

function initPreviewInteractions() {
  const previewClusters = document.querySelectorAll(".preview-cluster");
  const previewDetail = document.querySelector(".preview-detail");

  if (!previewClusters.length || !previewDetail) return;

  previewClusters.forEach((cluster) => {
    cluster.addEventListener("click", () => {
      previewClusters.forEach((c) => c.style.borderColor = "");
      cluster.style.borderColor = "rgba(77, 102, 87, 0.6)";

      const title = cluster.querySelector("strong").textContent;
      previewDetail.innerHTML = `
        <h4>${title}</h4>
        <p>
          Key developments summarized while preserving direct access to publishers.
        </p>
        <p style="color: var(--ink-lighter); font-size: 12px; margin-top: 8px;">
          Click to see full story cluster with all source articles.
        </p>
      `;
    });
  });
}

/* ====================================== */
/* HEADER SCROLL EFFECT                   */
/* ====================================== */

function initHeaderScrollEffect() {
  const header = document.querySelector(".site-header");

  if (!header) return;

  let lastScrollY = 0;

  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > 50) {
      header.style.boxShadow = "var(--shadow-md)";
    } else {
      header.style.boxShadow = "var(--shadow-sm)";
    }

    lastScrollY = currentScrollY;
  });
}

/* ====================================== */
/* KEYBOARD NAVIGATION                    */
/* ====================================== */

function initKeyboardNavigation() {
  document.addEventListener("keydown", (e) => {
    // Skip to main content (Alt+M or Cmd+M)
    if ((e.altKey || e.metaKey) && e.key === "m") {
      e.preventDefault();
      const mainEl = document.querySelector("main");
      if (mainEl) {
        mainEl.focus({ preventScroll: true });
        mainEl.scrollIntoView({ behavior: "smooth" });
      }
    }

    // Navigate to first section (Alt+1)
    if ((e.altKey || e.metaKey) && e.key === "1") {
      e.preventDefault();
      const section = document.querySelector(".hero");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
  });
}

/* ====================================== */
/* PREFERENCE DETECTION                   */
/* ====================================== */

function initMotionPreferences() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion) {
    document.documentElement.style.setProperty(
      "--transition-base",
      "0ms cubic-bezier(0.4, 0, 0.2, 1)",
    );
    document.documentElement.style.setProperty(
      "--transition-slow",
      "0ms cubic-bezier(0.4, 0, 0.2, 1)",
    );
  }

  // Listen for preference changes
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
    if (e.matches) {
      document.documentElement.style.setProperty(
        "--transition-base",
        "0ms cubic-bezier(0.4, 0, 0.2, 1)",
      );
    } else {
      document.documentElement.style.setProperty(
        "--transition-base",
        "240ms cubic-bezier(0.4, 0, 0.2, 1)",
      );
    }
  });
}

/* ====================================== */
/* INITIALIZATION                         */
/* ====================================== */

function initializePageInteractions() {
  // Inject dynamic styles
  injectDynamicStyles();

  // Core interactions
  initTopicInteractions();
  initCounterAnimations();
  initScrollReveal();
  initSmoothScroll();

  // Enhancements
  initPublisherNodeAnimations();
  initClusterCardAnimation();
  initPreviewInteractions();
  initHeaderScrollEffect();
  initKeyboardNavigation();
  initMotionPreferences();

  // Initial cluster display
  const clusterTitle = document.getElementById("clusterTitle");
  if (clusterTitle) {
    const cluster = clusterExamples[0];
    clusterTitle.textContent = cluster.title;

    const metrics = document.querySelectorAll(".cluster-metrics span");
    if (metrics[0]) metrics[0].textContent = `${cluster.sources} Sources`;
    if (metrics[1]) metrics[1].textContent = `${cluster.articles} Articles`;
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePageInteractions);
} else {
  initializePageInteractions();
}

/* ====================================== */
/* PERFORMANCE MONITORING                 */
/* ====================================== */

// Log Core Web Vitals (if available)
if ("web-vital" in window) {
  // This would integrate with web-vitals library if needed
  // For now, we rely on browser's built-in performance APIs
}

// Performance observer for interaction-to-next-paint
if ("PerformanceObserver" in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Log or send metrics to analytics
        // console.log("Performance entry:", entry);
      }
    });

    observer.observe({ entryTypes: ["largest-contentful-paint", "layout-shift"] });
  } catch (e) {
    // Observer not supported
  }
}

```

# static-2/index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    OneStopNews — Stop Reading The Same Story Five Times
  </title>

  <meta
    name="description"
    content="OneStopNews organizes coverage into living story clusters so you can understand what happened before deciding what to read."
  />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <link
    href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,700;6..72,800&display=swap"
    rel="stylesheet"
  />

  <link rel="stylesheet" href="./landing.css" />
</head>

<body>
  <div class="page-shell">

    <!-- ====================================== -->
    <!-- HEADER                                 -->
    <!-- ====================================== -->

    <header class="site-header">
      <div class="brand">
        <div class="brand-mark">OSN</div>

        <div>
          <strong>OneStopNews</strong>
          <span>Everything important, sorted by topic.</span>
        </div>
      </div>

      <nav class="main-nav">
        <a href="#clusters">Story Clusters</a>
        <a href="#topics">Topics</a>
        <a href="#ai">AI Summaries</a>
        <a href="#trust">Trust</a>
      </nav>

      <a class="header-cta" href="#cta">
        Start Reading
      </a>
    </header>

    <main>

      <!-- ====================================== -->
      <!-- HERO                                  -->
      <!-- ====================================== -->

      <section class="hero section">
        <div class="hero-copy">
          <div class="eyebrow">
            Editorial Intelligence
          </div>

          <h1>
            Stop reading
            the same story
            five times.
          </h1>

          <p class="hero-description">
            OneStopNews groups reporting from hundreds of
            publishers into living story clusters so you can
            understand what happened before deciding what
            deserves your attention.
          </p>

          <div class="hero-actions">
            <a href="#clusters" class="button-primary">
              Explore Story Clusters
            </a>

            <a href="#preview" class="button-secondary">
              Preview The Product
            </a>
          </div>
        </div>

        <div class="hero-stat-block">
          <div class="hero-stat">
            <strong data-counter="8000">0</strong>
            <span>Articles Indexed Daily</span>
          </div>

          <div class="hero-stat">
            <strong data-counter="250">0</strong>
            <span>News Sources</span>
          </div>

          <div class="hero-stat">
            <strong data-counter="42">0</strong>
            <span>Active Topics</span>
          </div>
        </div>
      </section>

      <!-- ====================================== -->
      <!-- STORY CLUSTER WALL                     -->
      <!-- ====================================== -->

      <section
        id="clusters"
        class="story-wall section reveal"
      >
        <div class="section-heading">
          <div class="eyebrow">Story Clusters</div>

          <h2>
            One event.
            Many perspectives.
          </h2>

          <p>
            Traditional news readers show every article.
            OneStopNews shows the story.
          </p>
        </div>

        <div class="cluster-stage">

          <div class="publisher-column">

            <div class="publisher-node">
              Reuters
            </div>

            <div class="publisher-node">
              Bloomberg
            </div>

            <div class="publisher-node">
              CNBC
            </div>

            <div class="publisher-node">
              BBC
            </div>

            <div class="publisher-node">
              The Verge
            </div>

          </div>

          <div class="cluster-core">

            <div class="cluster-ring"></div>

            <div class="cluster-card">

              <div class="cluster-label">
                Live Story Cluster
              </div>

              <h3 id="clusterTitle">
                Apple Expands AI Strategy
              </h3>

              <div class="cluster-metrics">
                <span>32 Sources</span>
                <span>147 Articles</span>
                <span>High Impact</span>
              </div>
            </div>

          </div>

          <div class="cluster-insights">

            <div class="insight-card">
              New AI products announced
            </div>

            <div class="insight-card">
              Enterprise rollout expands
            </div>

            <div class="insight-card">
              Developer ecosystem grows
            </div>

          </div>

        </div>
      </section>

      <!-- ====================================== -->
      <!-- PROCESS                               -->
      <!-- ====================================== -->

      <section class="process section reveal">

        <div class="section-heading">
          <div class="eyebrow">
            How It Works
          </div>

          <h2>
            Built for understanding.
          </h2>
        </div>

        <div class="process-grid">

          <article class="process-card">
            <span>01</span>

            <h3>Collect</h3>

            <p>
              Thousands of articles arrive from trusted
              publishers every day.
            </p>
          </article>

          <article class="process-card">
            <span>02</span>

            <h3>Cluster</h3>

            <p>
              Related coverage is grouped into a single
              evolving story.
            </p>
          </article>

          <article class="process-card">
            <span>03</span>

            <h3>Compress</h3>

            <p>
              Optional AI summaries help you understand
              developments in seconds.
            </p>
          </article>

        </div>
      </section>

      <!-- ====================================== -->
      <!-- COMPARISON                            -->
      <!-- ====================================== -->

      <section class="comparison section reveal">

        <div class="comparison-column">

          <div class="comparison-label">
            Traditional News
          </div>

          <div class="headline-stack">
            Apple Announces AI Platform
          </div>

          <div class="headline-stack">
            Apple Reveals AI Features
          </div>

          <div class="headline-stack">
            Apple Expands AI Roadmap
          </div>

          <div class="headline-stack">
            Apple Launches New AI Tools
          </div>

        </div>

        <div class="comparison-divider">
          →
        </div>

        <div class="comparison-column optimized">

          <div class="comparison-label">
            OneStopNews
          </div>

          <div class="story-node">
            APPLE AI STRATEGY
          </div>

          <p>
            One cluster.
            Multiple perspectives.
            Faster understanding.
          </p>

        </div>

      </section>

      <!-- ====================================== -->
      <!-- TOPICS                                -->
      <!-- ====================================== -->

      <section
        id="topics"
        class="topics section reveal"
      >

        <div class="section-heading">
          <div class="eyebrow">
            Topic Universe
          </div>

          <h2>
            Browse by what matters.
          </h2>
        </div>

        <div class="topic-cloud">

          <button
            class="topic-word"
            data-count="2342"
          >
            TECH
          </button>

          <button
            class="topic-word"
            data-count="1780"
          >
            FINANCE
          </button>

          <button
            class="topic-word"
            data-count="1291"
          >
            GLOBAL
          </button>

          <button
            class="topic-word"
            data-count="985"
          >
            POLITICS
          </button>

          <button
            class="topic-word"
            data-count="744"
          >
            CULTURE
          </button>

        </div>

        <div id="topicInfo" class="topic-info">
          Hover a topic to explore active coverage.
        </div>

      </section>

      <!-- ====================================== -->
      <!-- AI                                    -->
      <!-- ====================================== -->

      <section
        id="ai"
        class="ai-section section reveal"
      >

        <div class="section-heading">
          <div class="eyebrow">
            AI Summaries
          </div>

          <h2>
            AI when you need it.
            Not when you don't.
          </h2>
        </div>

        <div class="ai-grid">

          <div class="ai-panel">
            <h3>Original Source</h3>

            <p>
              Reuters reports Apple expanded its
              enterprise AI roadmap and announced
              new developer APIs.
            </p>
          </div>

          <div class="ai-panel summary">
            <h3>AI Summary</h3>

            <ul>
              <li>Enterprise AI rollout expands.</li>
              <li>Developer ecosystem grows.</li>
              <li>New competitive pressure emerges.</li>
            </ul>
          </div>

        </div>

      </section>

      <!-- ====================================== -->
      <!-- PRODUCT PREVIEW                       -->
      <!-- ====================================== -->

      <section
        id="preview"
        class="preview section reveal"
      >

        <div class="section-heading">
          <div class="eyebrow">
            Product Preview
          </div>

          <h2>
            Calm.
            Dense.
            Topic-first.
          </h2>
        </div>

        <div class="app-preview">

          <aside class="preview-nav">
            <span>TOP</span>
            <span>TECH</span>
            <span>FINANCE</span>
            <span>GLOBAL</span>
            <span>POLITICS</span>
          </aside>

          <div class="preview-feed">

            <div class="preview-cluster">
              <strong>
                Apple AI Strategy
              </strong>

              <span>
                147 articles · 32 sources
              </span>
            </div>

            <div class="preview-cluster">
              <strong>
                Nvidia Earnings
              </strong>

              <span>
                89 articles · 21 sources
              </span>
            </div>

            <div class="preview-cluster">
              <strong>
                Global Markets
              </strong>

              <span>
                56 articles · 18 sources
              </span>
            </div>

          </div>

          <aside class="preview-detail">

            <h4>
              AI Summary
            </h4>

            <p>
              Key developments summarized while
              preserving direct access to publishers.
            </p>

          </aside>

        </div>

      </section>

      <!-- ====================================== -->
      <!-- TRUST                                 -->
      <!-- ====================================== -->

      <section
        id="trust"
        class="trust section reveal"
      >

        <div class="section-heading">
          <div class="eyebrow">
            Trust & Transparency
          </div>

          <h2>
            Built for understanding.
            Not engagement farming.
          </h2>
        </div>

        <div class="trust-grid">

          <article>
            Sources Always Visible
          </article>

          <article>
            AI Clearly Labeled
          </article>

          <article>
            Publisher First
          </article>

          <article>
            No AI Written News
          </article>

        </div>

      </section>

      <!-- ====================================== -->
      <!-- CTA                                   -->
      <!-- ====================================== -->

      <section
        id="cta"
        class="cta section reveal"
      >

        <div class="eyebrow">
          OneStopNews
        </div>

        <h2>
          The news
          should make sense.
        </h2>

        <p>
          Everything important.
          Sorted by topic.
        </p>

        <a href="#" class="button-primary">
          Start Reading
        </a>

      </section>

    </main>

    <footer class="site-footer">
      <span>
        OneStopNews
      </span>

      <span>
        Topic-first news intelligence.
      </span>
    </footer>

  </div>

  <script src="./landing.js"></script>
</body>
</html>

```

# static-2/landing.css
```css
/* =========================================
   DESIGN TOKENS
   ========================================= */

:root {
  /* palette */
  --paper: #f6f3ec;
  --paper-warm: #faf8f1;
  --surface: #fffdf8;
  --ink: #121416;
  --ink-800: #262b31;
  --ink-600: #56616f;
  --ink-400: #8994a3;
  --ink-200: #c4cad3;
  --moss: #4d6657;
  --moss-light: #eef1ea;
  --moss-muted: rgba(77, 102, 87, 0.08);
  --clay: #a86a4a;
  --clay-light: #f5ece4;
  --slate: #526171;
  --line: #ddd8cc;
  --line-soft: #ece7db;

  /* typography */
  --font-editorial: "Newsreader", Georgia, "Times New Roman", serif;
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Helvetica, Arial, sans-serif;

  /* spacing */
  --space-xs: 8px;
  --space-sm: 16px;
  --space-md: 24px;
  --space-lg: 48px;
  --space-xl: 80px;
  --space-2xl: 120px;

  /* sizing */
  --max-width: 1280px;
  --header-height: 64px;

  /* effects */
  --radius: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 2px 8px rgba(18, 20, 22, 0.05);
  --shadow-md: 0 12px 40px rgba(18, 20, 22, 0.08);
  --shadow-lg: 0 24px 70px rgba(18, 20, 22, 0.12);
}

/* =========================================
   RESET
   ========================================= */

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
}

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
  color: var(--ink);
  background: var(--paper);
  font-family: var(--font-ui);
  font-size: 16px;
  line-height: 1.6;
}

img {
  display: block;
  max-width: 100%;
}

button,
input,
select {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
  border: 0;
  background: none;
}

a {
  color: inherit;
  text-decoration: none;
}

ul {
  padding-left: 20px;
}

/* =========================================
   SHARED
   ========================================= */

.page-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
}

.section {
  width: 100%;
  max-width: var(--max-width);
  margin-inline: auto;
  padding: var(--space-xl) var(--space-md);
}

.section-heading {
  max-width: 720px;
  margin-bottom: var(--space-lg);
}

.section-heading p {
  margin-top: var(--space-sm);
  color: var(--ink-600);
  font-size: 18px;
  line-height: 1.55;
}

.eyebrow {
  margin-bottom: var(--space-sm);
  color: var(--moss);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1,
h2,
h3 {
  font-family: var(--font-editorial);
  letter-spacing: -0.01em;
  line-height: 0.95;
}

h2 {
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 700;
  white-space: pre-line;
}

/* =========================================
   BUTTONS
   ========================================= */

.button-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 28px;
  border-radius: var(--radius);
  color: var(--paper);
  background: var(--ink);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  transition:
    background 200ms ease,
    transform 200ms ease;
}

.button-primary:hover {
  background: var(--ink-800);
  transform: translateY(-1px);
}

.button-primary:focus-visible {
  outline: 3px solid var(--moss);
  outline-offset: 3px;
}

.button-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 28px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--ink);
  background: transparent;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  transition:
    border-color 200ms ease,
    background 200ms ease;
}

.button-secondary:hover {
  border-color: var(--ink-400);
  background: var(--moss-muted);
}

.button-secondary:focus-visible {
  outline: 3px solid var(--moss);
  outline-offset: 3px;
}

/* =========================================
   HEADER
   ========================================= */

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  width: 100%;
  max-width: var(--max-width);
  height: var(--header-height);
  margin-inline: auto;
  padding: 0 var(--space-md);
  background: rgba(246, 243, 236, 0.85);
  backdrop-filter: blur(16px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: var(--radius);
  color: var(--paper);
  background: var(--ink);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.brand strong {
  display: block;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.brand span {
  display: block;
  margin-top: 1px;
  color: var(--ink-600);
  font-size: 11px;
  font-weight: 500;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.main-nav a {
  color: var(--ink-600);
  font-size: 13px;
  font-weight: 650;
  transition: color 180ms ease;
}

.main-nav a:hover {
  color: var(--ink);
}

.main-nav a:focus-visible {
  outline: 2px solid var(--moss);
  outline-offset: 4px;
  border-radius: 3px;
}

.header-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 18px;
  border-radius: var(--radius);
  color: var(--paper);
  background: var(--ink);
  font-size: 13px;
  font-weight: 700;
  transition:
    background 200ms ease,
    transform 200ms ease;
}

.header-cta:hover {
  background: var(--ink-800);
  transform: translateY(-1px);
}

.header-cta:focus-visible {
  outline: 3px solid var(--moss);
  outline-offset: 3px;
}

/* =========================================
   HERO
   ========================================= */

.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-xl);
  align-items: end;
  padding-top: var(--space-2xl);
  padding-bottom: var(--space-xl);
}

.hero h1 {
  font-size: clamp(48px, 7vw, 88px);
  font-weight: 800;
  line-height: 0.92;
  white-space: pre-line;
}

.hero-description {
  max-width: 520px;
  margin-top: var(--space-md);
  color: var(--ink-600);
  font-size: 18px;
  line-height: 1.55;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: var(--space-lg);
}

.hero-stat-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.hero-stat {
  min-width: 160px;
  padding: var(--space-sm);
  border-radius: var(--radius);
  background: var(--paper-warm);
}

.hero-stat strong {
  display: block;
  font-family: var(--font-editorial);
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
}

.hero-stat span {
  display: block;
  margin-top: 6px;
  color: var(--ink-600);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* =========================================
   STORY CLUSTER WALL
   ========================================= */

.story-wall {
  padding-top: var(--space-2xl);
  padding-bottom: var(--space-2xl);
}

.cluster-stage {
  display: grid;
  grid-template-columns: 200px 1fr 240px;
  gap: var(--space-lg);
  align-items: center;
  min-height: 420px;
  padding: var(--space-lg);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--ink);
  box-shadow: var(--shadow-lg);
}

.publisher-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.publisher-node {
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius);
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.04);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  transition:
    background 300ms ease,
    color 300ms ease,
    border-color 300ms ease,
    transform 300ms ease;
}

.publisher-node.active {
  color: rgba(255, 255, 255, 0.95);
  background: rgba(77, 102, 87, 0.3);
  border-color: rgba(77, 102, 87, 0.6);
  transform: translateX(6px);
}

.cluster-core {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.cluster-ring {
  position: absolute;
  width: 280px;
  height: 280px;
  border: 2px solid rgba(77, 102, 87, 0.25);
  border-radius: 50%;
  animation: cluster-breathe 4s ease-in-out infinite;
}

@keyframes cluster-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.06);
    opacity: 0.8;
  }
}

.cluster-card {
  position: relative;
  z-index: 2;
  width: 260px;
  padding: var(--space-md);
  border: 1px solid rgba(77, 102, 87, 0.4);
  border-radius: var(--radius-lg);
  background: rgba(77, 102, 87, 0.12);
  backdrop-filter: blur(12px);
  text-align: center;
}

.cluster-label {
  margin-bottom: var(--space-xs);
  color: var(--moss);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.cluster-card h3 {
  color: var(--paper);
  font-size: 24px;
  line-height: 1.05;
}

.cluster-metrics {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: var(--space-sm);
}

.cluster-metrics span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.07);
  font-size: 11px;
  font-weight: 700;
}

.cluster-insights {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.insight-card {
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius);
  color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.03);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  transition:
    background 300ms ease,
    color 300ms ease,
    border-color 300ms ease;
}

.insight-card.active {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(168, 106, 74, 0.15);
  border-color: rgba(168, 106, 74, 0.4);
}

/* =========================================
   PROCESS
   ========================================= */

.process-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

.process-card {
  padding: var(--space-md);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  transition:
    border-color 200ms ease,
    box-shadow 200ms ease;
}

.process-card:hover {
  border-color: var(--moss);
  box-shadow: var(--shadow-md);
}

.process-card > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-bottom: var(--space-sm);
  border-radius: 50%;
  color: var(--moss);
  background: var(--moss-light);
  font-size: 13px;
  font-weight: 800;
}

.process-card h3 {
  margin-bottom: var(--space-xs);
  font-size: 24px;
}

.process-card p {
  color: var(--ink-600);
  font-size: 15px;
  line-height: 1.55;
}

/* =========================================
   COMPARISON
   ========================================= */

.comparison {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--space-lg);
  align-items: center;
}

.comparison-label {
  margin-bottom: var(--space-sm);
  color: var(--ink-400);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.headline-stack {
  padding: 14px 18px;
  margin-bottom: 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--ink-600);
  background: var(--surface);
  font-family: var(--font-editorial);
  font-size: 17px;
  font-weight: 500;
  line-height: 1.25;
}

.headline-stack:nth-child(3) {
  opacity: 0.75;
}

.headline-stack:nth-child(4) {
  opacity: 0.55;
}

.headline-stack:nth-child(5) {
  opacity: 0.35;
}

.comparison-divider {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  color: var(--moss);
  background: var(--moss-light);
  font-size: 20px;
  font-weight: 800;
}

.comparison-column.optimized {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.comparison-column.optimized p {
  margin-top: var(--space-sm);
  color: var(--ink-600);
  font-size: 16px;
  line-height: 1.55;
}

.story-node {
  display: flex;
  align-items: center;
  min-height: 120px;
  width: 100%;
  padding: var(--space-md) var(--space-md);
  border: 2px solid var(--moss);
  border-radius: var(--radius-lg);
  color: var(--ink);
  background: var(--moss-light);
  font-family: var(--font-editorial);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
}

/* =========================================
   TOPICS
   ========================================= */

.topic-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.topic-word {
  padding: var(--space-md) var(--space-lg);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  color: var(--ink);
  background: var(--surface);
  font-family: var(--font-editorial);
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  transition:
    background 200ms ease,
    border-color 200ms ease,
    color 200ms ease,
    transform 200ms ease,
    box-shadow 200ms ease;
}

.topic-word:hover,
.topic-word:focus-visible {
  color: var(--paper);
  background: var(--ink);
  border-color: var(--ink);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.topic-word:focus-visible {
  outline: 3px solid var(--moss);
  outline-offset: 3px;
}

.topic-info {
  margin-top: var(--space-md);
  min-height: 28px;
  color: var(--ink-400);
  font-size: 15px;
  font-weight: 600;
  transition: color 200ms ease;
}

.topic-info.active {
  color: var(--ink-600);
}

/* =========================================
   AI
   ========================================= */

.ai-section .section-heading h2 {
  white-space: pre-line;
}

.ai-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.ai-panel {
  padding: var(--space-md);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.ai-panel h3 {
  margin-bottom: var(--space-sm);
  font-size: 18px;
  line-height: 1.2;
}

.ai-panel p,
.ai-panel li {
  color: var(--ink-600);
  font-size: 15px;
  line-height: 1.6;
}

.ai-panel.summary {
  border-color: var(--moss);
  background: var(--moss-light);
}

.ai-panel.summary h3 {
  color: var(--moss);
}

.ai-panel ul {
  margin: 0;
}

.ai-panel li {
  margin-bottom: 6px;
}

/* =========================================
   PRODUCT PREVIEW
   ========================================= */

.app-preview {
  display: grid;
  grid-template-columns: 140px 1fr 260px;
  gap: 2px;
  min-height: 360px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--line);
  box-shadow: var(--shadow-lg);
}

.preview-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px;
  background: var(--ink);
}

.preview-nav span {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  transition: color 200ms ease;
}

.preview-nav span:first-child {
  color: var(--paper);
  background: rgba(255, 255, 255, 0.08);
}

.preview-feed {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px;
  background: var(--paper);
}

.preview-cluster {
  padding: 20px;
  border-bottom: 1px solid var(--line-soft);
  background: var(--surface);
  transition:
    background 200ms ease;
}

.preview-cluster:hover {
  background: var(--moss-light);
}

.preview-cluster strong {
  display: block;
  font-family: var(--font-editorial);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
}

.preview-cluster span {
  display: block;
  margin-top: 6px;
  color: var(--ink-400);
  font-size: 12px;
  font-weight: 600;
}

.preview-detail {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--space-md);
  background: var(--paper-warm);
}

.preview-detail h4 {
  margin-bottom: var(--space-xs);
  color: var(--moss);
  font-family: var(--font-editorial);
  font-size: 18px;
  font-weight: 700;
}

.preview-detail p {
  color: var(--ink-600);
  font-size: 14px;
  line-height: 1.55;
}

/* =========================================
   TRUST
   ========================================= */

.trust-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.trust-grid article {
  padding: var(--space-md);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  font-family: var(--font-editorial);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.15;
  transition:
    border-color 200ms ease,
    box-shadow 200ms ease;
}

.trust-grid article:hover {
  border-color: var(--moss);
  box-shadow: var(--shadow-sm);
}

/* =========================================
   CTA
   ========================================= */

.cta {
  text-align: center;
  padding-top: var(--space-2xl);
  padding-bottom: var(--space-2xl);
}

.cta h2 {
  font-size: clamp(42px, 8vw, 96px);
}

.cta p {
  margin-top: var(--space-sm);
  margin-bottom: var(--space-lg);
  color: var(--ink-600);
  font-size: 18px;
}

.cta .eyebrow {
  margin-bottom: var(--space-md);
}

/* =========================================
   FOOTER
   ========================================= */

.site-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: var(--max-width);
  margin-inline: auto;
  padding: var(--space-md);
  border-top: 1px solid var(--line);
  color: var(--ink-400);
  font-size: 13px;
}

.site-footer span:first-child {
  font-weight: 700;
  color: var(--ink-600);
}

/* =========================================
   SCROLL REVEAL
   ========================================= */

.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition:
    opacity 600ms ease,
    transform 600ms ease;
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* =========================================
   RESPONSIVE — TABLET
   ========================================= */

@media (max-width: 1024px) {
  .hero {
    grid-template-columns: 1fr;
    gap: var(--space-lg);
    padding-top: var(--space-xl);
  }

  .hero-stat-block {
    flex-direction: row;
  }

  .cluster-stage {
    grid-template-columns: 1fr;
    gap: var(--space-md);
    min-height: auto;
    padding: var(--space-md);
  }

  .publisher-column {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .cluster-insights {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .comparison {
    grid-template-columns: 1fr;
    gap: var(--space-md);
  }

  .comparison-divider {
    justify-self: center;
  }

  .ai-grid {
    grid-template-columns: 1fr;
  }

  .app-preview {
    grid-template-columns: 1fr;
  }

  .preview-nav {
    flex-direction: row;
    overflow-x: auto;
  }

  .trust-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* =========================================
   RESPONSIVE — MOBILE
   ========================================= */

@media (max-width: 640px) {
  :root {
    --space-xl: 56px;
    --space-2xl: 80px;
  }

  .site-header {
    flex-wrap: wrap;
    height: auto;
    padding: var(--space-sm);
    gap: var(--space-sm);
  }

  .main-nav {
    display: none;
  }

  .hero h1 {
    font-size: clamp(36px, 10vw, 56px);
  }

  .hero-stat-block {
    flex-direction: column;
  }

  .process-grid {
    grid-template-columns: 1fr;
  }

  .topic-cloud {
    flex-direction: column;
  }

  .topic-word {
    width: 100%;
    text-align: left;
  }

  .trust-grid {
    grid-template-columns: 1fr;
  }

  .site-footer {
    flex-direction: column;
    gap: var(--space-xs);
    text-align: center;
  }
}

/* =========================================
   REDUCED MOTION
   ========================================= */

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .cluster-ring {
    animation: none;
  }

  .publisher-node,
  .insight-card,
  .topic-word,
  .process-card,
  .trust-grid article,
  .button-primary,
  .button-secondary,
  .header-cta {
    transition: none;
  }
}

```

# static-2/landing.js
```js
/* =========================================
   LANDING.JS
   OneStopNews — Editorial Landing Page
   ========================================= */

(function () {
  "use strict";

  /* =========================================
     MODULE 1 — SCROLL REVEAL
     ========================================= */

  function initScrollReveal() {
    const sections = document.querySelectorAll(".reveal");

    if (!sections.length) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      sections.forEach(function (section) {
        section.classList.add("visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* =========================================
     MODULE 2 — STAT COUNTER ANIMATION
     ========================================= */

  function initCounters() {
    const counters = document.querySelectorAll("[data-counter]");

    if (!counters.length) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      counters.forEach(function (counter) {
        var target = parseInt(counter.getAttribute("data-counter"), 10);
        counter.textContent = formatNumber(target);
      });
      return;
    }

    var animated = new Set();

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          if (animated.has(entry.target)) return;

          animated.add(entry.target);
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.5,
      }
    );

    counters.forEach(function (counter) {
      observer.observe(counter);
    });
  }

  function animateCounter(element) {
    var target = parseInt(element.getAttribute("data-counter"), 10);
    var duration = 1800;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;

      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);

      var eased = easeOutExpo(progress);
      var current = Math.round(eased * target);

      element.textContent = formatNumber(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = formatNumber(target) + "+";
      }
    }

    requestAnimationFrame(step);
  }

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function formatNumber(n) {
    return n.toLocaleString("en-US");
  }

  /* =========================================
     MODULE 3 — STORY CLUSTER ROTATION
     ========================================= */

  function initClusterRotation() {
    var titleElement = document.getElementById("clusterTitle");

    if (!titleElement) return;

    var clusters = [
      {
        title: "Apple Expands AI Strategy",
        sources: 32,
        articles: 147,
        impact: "High Impact",
        publishers: [
          "Reuters",
          "Bloomberg",
          "CNBC",
          "BBC",
          "The Verge",
        ],
        insights: [
          "New AI products announced",
          "Enterprise rollout expands",
          "Developer ecosystem grows",
        ],
      },
      {
        title: "Nvidia Earnings Surge",
        sources: 21,
        articles: 89,
        impact: "High Impact",
        publishers: [
          "Reuters",
          "Bloomberg",
          "CNBC",
          "WSJ",
          "Financial Times",
        ],
        insights: [
          "Revenue beats estimates",
          "AI chip demand accelerates",
          "Supply chain concerns ease",
        ],
      },
      {
        title: "US Election Updates",
        sources: 45,
        articles: 203,
        impact: "Critical",
        publishers: [
          "AP",
          "Reuters",
          "CNN",
          "BBC",
          "NPR",
        ],
        insights: [
          "Polling shifts detected",
          "Key state developments",
          "Policy positions evolve",
        ],
      },
      {
        title: "Singapore Housing Policy",
        sources: 12,
        articles: 42,
        impact: "Medium Impact",
        publishers: [
          "CNA",
          "Straits Times",
          "Bloomberg",
          "Reuters",
          "TODAY",
        ],
        insights: [
          "New cooling measures proposed",
          "HDB supply increases",
          "Market sentiment shifts",
        ],
      },
      {
        title: "Global Markets Rally",
        sources: 18,
        articles: 56,
        impact: "High Impact",
        publishers: [
          "Bloomberg",
          "Reuters",
          "CNBC",
          "Financial Times",
          "WSJ",
        ],
        insights: [
          "Indices reach new highs",
          "Bond yields stabilize",
          "Investor sentiment improves",
        ],
      },
      {
        title: "OpenAI Launches New Model",
        sources: 28,
        articles: 134,
        impact: "High Impact",
        publishers: [
          "The Verge",
          "TechCrunch",
          "Reuters",
          "Bloomberg",
          "Wired",
        ],
        insights: [
          "Performance benchmarks released",
          "Enterprise pricing announced",
          "Safety measures detailed",
        ],
      },
    ];

    var currentIndex = 0;
    var metricsContainer = document.querySelector(".cluster-metrics");
    var publisherNodes = document.querySelectorAll(".publisher-node");
    var insightCards = document.querySelectorAll(".insight-card");
    var clusterCard = document.querySelector(".cluster-card");

    function updateCluster() {
      var cluster = clusters[currentIndex];

      if (clusterCard) {
        clusterCard.style.opacity = "0";
        clusterCard.style.transform = "scale(0.96)";
      }

      deactivateAll();

      setTimeout(function () {
        titleElement.textContent = cluster.title;

        if (metricsContainer) {
          metricsContainer.innerHTML =
            "<span>" +
            cluster.sources +
            " Sources</span>" +
            "<span>" +
            cluster.articles +
            " Articles</span>" +
            "<span>" +
            cluster.impact +
            "</span>";
        }

        if (clusterCard) {
          clusterCard.style.opacity = "1";
          clusterCard.style.transform = "scale(1)";
        }

        animatePublishers(cluster.publishers);
        animateInsights(cluster.insights);
      }, 400);

      currentIndex = (currentIndex + 1) % clusters.length;
    }

    function deactivateAll() {
      publisherNodes.forEach(function (node) {
        node.classList.remove("active");
      });

      insightCards.forEach(function (card) {
        card.classList.remove("active");
      });
    }

    function animatePublishers(publishers) {
      publisherNodes.forEach(function (node, index) {
        setTimeout(function () {
          node.textContent = publishers[index] || node.textContent;
          node.classList.add("active");
        }, index * 120);
      });
    }

    function animateInsights(insights) {
      insightCards.forEach(function (card, index) {
        setTimeout(function () {
          card.textContent = insights[index] || card.textContent;
          card.classList.add("active");
        }, 600 + index * 180);
      });
    }

    if (clusterCard) {
      clusterCard.style.transition =
        "opacity 400ms ease, transform 400ms ease";
    }

    var prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      updateCluster();
      return;
    }

    var clusterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            updateCluster();
            startRotation();
            clusterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    var stage = document.querySelector(".cluster-stage");
    if (stage) {
      clusterObserver.observe(stage);
    }

    var rotationInterval = null;

    function startRotation() {
      rotationInterval = setInterval(updateCluster, 5000);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        clearInterval(rotationInterval);
      } else {
        startRotation();
      }
    });
  }

  /* =========================================
     MODULE 4 — TOPIC UNIVERSE INTERACTION
     ========================================= */

  function initTopicInteraction() {
    var topicButtons = document.querySelectorAll(".topic-word");
    var infoElement = document.getElementById("topicInfo");

    if (!topicButtons.length || !infoElement) return;

    var topicDescriptions = {
      TECH: "2,342 active stories across AI, startups, cybersecurity, and devices.",
      FINANCE:
        "1,780 active stories across markets, earnings, crypto, and economics.",
      GLOBAL:
        "1,291 active stories across geopolitics, diplomacy, and regional affairs.",
      POLITICS:
        "985 active stories across domestic policy, elections, and governance.",
      CULTURE:
        "744 active stories across entertainment, internet culture, and media.",
    };

    var defaultText = infoElement.textContent;

    topicButtons.forEach(function (button) {
      button.addEventListener("mouseenter", function () {
        var topic = button.textContent.trim();
        var description = topicDescriptions[topic];

        if (description) {
          infoElement.textContent = description;
          infoElement.classList.add("active");
        }
      });

      button.addEventListener("mouseleave", function () {
        infoElement.textContent = defaultText;
        infoElement.classList.remove("active");
      });

      button.addEventListener("focus", function () {
        var topic = button.textContent.trim();
        var description = topicDescriptions[topic];

        if (description) {
          infoElement.textContent = description;
          infoElement.classList.add("active");
        }
      });

      button.addEventListener("blur", function () {
        infoElement.textContent = defaultText;
        infoElement.classList.remove("active");
      });
    });
  }

  /* =========================================
     MODULE 5 — SMOOTH SCROLL FOR NAV LINKS
     ========================================= */

  function initSmoothScroll() {
    var links = document.querySelectorAll('a[href^="#"]');

    links.forEach(function (link) {
      link.addEventListener("click", function (event) {
        var href = link.getAttribute("href");

        if (!href || href === "#") return;

        var target = document.querySelector(href);

        if (!target) return;

        event.preventDefault();

        var headerHeight =
          document.querySelector(".site-header")?.offsetHeight || 64;

        var targetPosition =
          target.getBoundingClientRect().top +
          window.scrollY -
          headerHeight -
          20;

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        });

        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    });
  }

  /* =========================================
     MODULE 6 — HEADER SCROLL BEHAVIOR
     ========================================= */

  function initHeaderScroll() {
    var header = document.querySelector(".site-header");

    if (!header) return;

    var lastScroll = 0;
    var ticking = false;

    function onScroll() {
      var currentScroll = window.scrollY;

      if (currentScroll > 120) {
        header.style.borderBottom = "1px solid var(--line)";
      } else {
        header.style.borderBottom = "1px solid transparent";
      }

      lastScroll = currentScroll;
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          requestAnimationFrame(onScroll);
          ticking = true;
        }
      },
      { passive: true }
    );

    header.style.borderBottom = "1px solid transparent";
    header.style.transition = "border-color 200ms ease";
  }

  /* =========================================
     MODULE 7 — COMPARISON ANIMATION
     ========================================= */

  function initComparisonAnimation() {
    var section = document.querySelector(".comparison");

    if (!section) return;

    var headlines = section.querySelectorAll(".headline-stack");
    var storyNode = section.querySelector(".story-node");

    if (!headlines.length || !storyNode) return;

    var prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          headlines.forEach(function (headline, index) {
            headline.style.opacity = "0";
            headline.style.transform = "translateX(-12px)";
            headline.style.transition =
              "opacity 500ms ease, transform 500ms ease";

            setTimeout(function () {
              headline.style.opacity =
                1 - index * 0.18 + "";
              headline.style.transform = "translateX(0)";
            }, index * 150);
          });

          storyNode.style.opacity = "0";
          storyNode.style.transform = "scale(0.95)";
          storyNode.style.transition =
            "opacity 600ms ease, transform 600ms ease";

          setTimeout(function () {
            storyNode.style.opacity = "1";
            storyNode.style.transform = "scale(1)";
          }, headlines.length * 150 + 200);

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(section);
  }

  /* =========================================
     MODULE 8 — PREVIEW HOVER INTERACTION
     ========================================= */

  function initPreviewInteraction() {
    var clusters = document.querySelectorAll(".preview-cluster");
    var detailTitle = document.querySelector(".preview-detail h4");
    var detailText = document.querySelector(".preview-detail p");

    if (!clusters.length || !detailTitle || !detailText) return;

    var previewData = [
      {
        title: "AI Summary",
        text: "Apple is expanding its enterprise AI strategy with new developer APIs and model improvements across its product line.",
      },
      {
        title: "AI Summary",
        text: "Nvidia reports record quarterly revenue driven by accelerating demand for AI training and inference chips.",
      },
      {
        title: "AI Summary",
        text: "Global markets rally as bond yields stabilize and investor sentiment improves across major indices.",
      },
    ];

    clusters.forEach(function (cluster, index) {
      cluster.addEventListener("mouseenter", function () {
        var data = previewData[index];

        if (!data) return;

        clusters.forEach(function (c) {
          c.style.background = "";
        });

        cluster.style.background = "var(--moss-light)";
        detailTitle.textContent = data.title;
        detailText.textContent = data.text;
      });

      cluster.addEventListener("mouseleave", function () {
        cluster.style.background = "";
      });
    });
  }

  /* =========================================
     MODULE 9 — KEYBOARD ACCESSIBILITY
     ========================================= */

  function initKeyboardAccessibility() {
    document.addEventListener("keydown", function (event) {
      if (event.key === "Tab") {
        document.body.classList.add("keyboard-nav");
      }
    });

    document.addEventListener("mousedown", function () {
      document.body.classList.remove("keyboard-nav");
    });
  }

  /* =========================================
     INITIALIZATION
     ========================================= */

  function init() {
    initScrollReveal();
    initCounters();
    initClusterRotation();
    initTopicInteraction();
    initSmoothScroll();
    initHeaderScroll();
    initComparisonAnimation();
    initPreviewInteraction();
    initKeyboardAccessibility();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

```

