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

# draft_PRD_1.md
```md
You already have a well-formed MVP concept and visual direction for OneStopNews; the next step is to formalize it into an enterprise-grade, topic‑first AI news platform with a clear architecture, data model, and PRD skeleton tailored to Next.js 16, React 19, Tailwind v4, Shadcn UI, and PostgreSQL 17 (SQLite fallback). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)

Below I’ll stay in ANALYZE → PLAN mode only: no code yet, just a rigorous research‑backed blueprint and a detailed plan for the Project Requirements Document (PRD).

***

## Executive Summary

- OneStopNews is already a topic‑first aggregator MVP: category‑driven navigation, subcategories, search, sort, live status pills, and on‑demand AI summaries, implemented as a vanilla JS + HTML/CSS single page with a server API. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)
- Best‑of‑breed news aggregators (Google News, Feedly, high‑end content aggregators) converge on a few patterns: topic or interest‑based feeds, strong scanning layouts (lead story + dense cards), personalization, powerful search, and clear source attribution. [systemdesignhandbook](https://www.systemdesignhandbook.com/guides/google-news-system-design/)
- For an enterprise‑grade implementation, the PRD should elevate your MVP into a system with: robust ingestion pipelines, deduplication, observability, AI summarization governance, SSO-ready auth, multi‑tenant readiness, and a resilient Postgres‑centric data model. [hellointerview](https://www.hellointerview.com/community/questions/news-aggregator-feed/cm96lh25n0039ad08067audlg)
- I’ll outline:  
  - Product & UX insights from existing MVP + external research.  
  - Target architecture for Next.js + Postgres + AI summarization.  
  - Data model and API surface.  
  - Frontend architecture and avant‑garde UI direction (using Shadcn/Tailwind v4).  
  - A detailed PRD structure in markdown to be drafted next.  

***

## ANALYZE – Product & UX Context

### Current MVP capabilities

From the attached mockup/code, OneStopNews already implements: [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)

- Topic‑first browsing with main categories (Top, Local, Tech, Global, Finance, Politics, Gossip) and subcategory drilldown via a sticky topic nav with hover/expand menus. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)
- Controls panel with “Current view,” result count, subcategory select, and sort (latest, impact, summary ready). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)
- Layout: a lead card (hero story) plus a responsive grid of article cards, each showing source chip, category tag, time‑ago, title, and excerpt. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)
- Detail panel with dual mode: AI Summary vs Original Source, clear disclosure that full content stays with publisher, and a big source link. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)
- Status strip for ingestion (feeds online, last ingested, summarized count) and a “Refresh live feeds” control that triggers /api/ingest then reloads /api/articles. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)

This already mirrors modern aggregator UX goals: topic‑driven discovery, fast scanning, and preserving canonical publisher ownership. [globaldev](https://globaldev.tech/blog/how-to-build-content-aggregator-website)

### External patterns from best‑of‑breed aggregators

Research into system design guides for Google News and generic “design a news aggregator” exercises reveals common architectural and UX elements: [prachub](https://prachub.com/interview-questions/design-a-news-aggregator-system)

- Topic and interest feeds: category feeds (Sports, Tech, Politics) plus personalized feeds based on user behavior and explicit interests. [github](https://github.com/mishnit/awesome-system-design/blob/main/News%20aggregator.md)
- Ingestion pipeline: RSS/API/crawler ingestion, parsing, enrichment (entities/topics), deduplication, ranking, and caching for low‑latency reads. [linkedin](https://www.linkedin.com/posts/rmn-52012_systemdesign-newsaggregator-realtimedata-activity-7269372264498761729-hfQt)
- Search: full‑text search, filters (time, source, topic), and ranking tuned for recency and relevance. [prachub](https://prachub.com/interview-questions/design-a-news-aggregator-system)
- Real‑time freshness: schedulers and streaming pipelines to keep feeds fresh during spikes (breaking news) while respecting rate limits. [reddit](https://www.reddit.com/r/aws/comments/g7smug/architecture_deepdive_how_a_news_aggregator/)

For UI, case studies of content aggregators emphasize minimalist layouts (to foreground content) with “read later”, reminders, and personalization chips, while keeping typography editorial and legible. [dribbble](https://dribbble.com/shots/14602087-News-Aggregator-UI-UX-Design-Case-Study)

### AI summarization in enterprise context

Enterprise‑grade AI summarization is treated as a governed capability, not a gimmick: [readpartner](https://readpartner.com/blog/ai-news-summarization)

- Summaries are on‑demand or policy‑driven to control cost and avoid mass hallucinations. [cloud.google](https://cloud.google.com/use-cases/ai-summarization)
- Clear labeling and disclaimers around AI content, plus links to source, are standard to manage trust. [readpartner](https://readpartner.com/blog/ai-news-summarization)
- Enterprise concerns include prompt injection / AI recommendation poisoning and subtle bias in summaries, requiring audit logs, configurable policies, and transparency in how AI is invoked. [cio](https://www.cio.com/article/4130985/companies-are-using-summarize-with-ai-to-manipulate-enterprise-chatbots.html)

Your MVP’s pattern of “summarize only on explicit user request, then cache result, show clear disclosure, and always link to source” is already aligned with these best practices; the PRD should formalize these as strict requirements. [cloud.google](https://cloud.google.com/use-cases/ai-summarization)

***

## ANALYZE – Enterprise‑Grade Requirements

Based on MVP + external patterns, an enterprise‑ready OneStopNews should add:

- Reliability & scalability  
  - Robust ingestion scheduler with health checks, backoff, and replay/backfill for ingestion jobs. [hellointerview](https://www.hellointerview.com/community/questions/news-aggregator-feed/cm96lh25n0039ad08067audlg)
  - Horizontal scaling for read APIs and summarization workers; caching hot feeds and heavy searches. [systemdesignhandbook](https://www.systemdesignhandbook.com/guides/google-news-system-design/)

- Security & governance  
  - OAuth2/SSO readiness (e.g., SAML/OIDC) for enterprise tenants.  
  - Strict separation between PII (user profiles, preferences) and public news data.  
  - AI usage policies: who can trigger summarization, rate limits, logging of AI prompts/responses for audit. [cio](https://www.cio.com/article/4130985/companies-are-using-summarize-with-ai-to-manipulate-enterprise-chatbots.html)

- Compliance & content policy  
  - Respect robots.txt/terms for scraping; prefer official APIs or RSS where possible. [learn.microsoft](https://learn.microsoft.com/en-us/answers/questions/722208/whats-the-best-way-to-create-a-news-aggregator-sit)
  - Do not store full copyrighted content beyond what’s legally allowed; store only normalized metadata + safe excerpts. [learn.microsoft](https://learn.microsoft.com/en-us/answers/questions/722208/whats-the-best-way-to-create-a-news-aggregator-sit)

- Observability & operations  
  - Metrics for ingest latency, feed freshness per source, error rates, and summary coverage rate. [linkedin](https://www.linkedin.com/posts/rmn-52012_systemdesign-newsaggregator-realtimedata-activity-7269372264498761729-hfQt)
  - Dashboards and alerts for ingestion failures, API latency, and summarization errors.  

The PRD we plan should treat these as first‑class non‑functional requirements, not afterthoughts.

***

## PLAN – High‑Level System Architecture

Target stack: Next.js 16 (App Router), React 19, Tailwind v4, Shadcn UI, Postgres 17 (primary), SQLite fallback (local/embedded scenarios).

### Core components

Drawing from news aggregator system design literature, an enterprise architecture typically includes: [reddit](https://www.reddit.com/r/aws/comments/g7smug/architecture_deepdive_how_a_news_aggregator/)

- Source Registry & Configuration  
  - Table of sources: RSS endpoint, API credentials, update frequency, crawl rules, category mapping, health state.  
  - Admin UI to enable/disable sources, set priorities, and override category mapping.  

- Ingestion & Normalization Pipeline  
  - Scheduler (cron/queue‑driven) to fetch from RSS/APIs/feeds per source profile. [systemdesignhandbook](https://www.systemdesignhandbook.com/guides/google-news-system-design/)
  - Parsing/normalization: extract title, canonical URL, published time, source, categories/tags, and safe excerpt.  
  - Deduplication: near‑duplicate detection (via URL canonicalization + hash of title/summary) before persisting. [hellointerview](https://www.hellointerview.com/community/questions/news-aggregator-feed/cm96lh25n0039ad08067audlg)
  - Topic classification: rule‑based mapping (from sources’ tags) plus optional ML classifier for future “topics beyond source tags”. [microsoft](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr-2007-02.pdf)

- Storage & Indexing  
  - Postgres 17 as primary relational store for articles, sources, categories, summaries, and user data; optional Postgres full‑text search for baseline search capability. [github](https://github.com/mishnit/awesome-system-design/blob/main/News%20aggregator.md)
  - SQLite as local developer fallback or for offline/edge demo scenarios with a reduced schema.  

- Summarization Service  
  - Async worker that receives requests to summarize article content (extracted from HTML or retrieved via API) and writes summaries back to DB. [readpartner](https://readpartner.com/blog/ai-news-summarization)
  - Clear flags on article for “has summary”, “summary last updated at”, and cost metrics per summary.  

- Query & API layer  
  - Next.js Route Handlers exposing:  
    - /api/categories: computed counts per category/subcategory, derived from article metadata (as in MVP). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)
    - /api/articles: filter by category, subcategory, search query, sort (latest/impact/summary ready), pagination.  
    - /api/source‑health: live health snapshot for status pills. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)
    - /api/ingest: admin or privileged endpoint to trigger ingestion (with auth + rate limiting). [prachub](https://prachub.com/interview-questions/design-a-news-aggregator-system)
    - /api/summarize/[id]: protected endpoint to enqueue summarization job.  

- Admin & Ops UI (future but PRD‑worthy)  
  - Ingestion job dashboards, error logs, latency histograms.  
  - Source configuration editor, summary coverage stats by category, AI cost dashboards. [linkedin](https://www.linkedin.com/posts/rmn-52012_systemdesign-newsaggregator-realtimedata-activity-7269372264498761729-hfQt)

The PRD should contain diagrams and textual descriptions for each component and their interactions, aligning with this architecture.

***

## PLAN – Data Model & Schema Direction

Drawing from standard news aggregator requirements and your current state, the PRD should define at least these core entities: [github](https://github.com/mishnit/awesome-system-design/blob/main/News%20aggregator.md)

- Source  
  - id, name, type (RSS, API, custom), base_url, fetch_config (interval, timeout), legal_status (allowed/disallowed), last_success_at, last_error_at, status, default_category.  

- Article  
  - id, source_id, canonical_url, title, normalized_title, excerpt, content_availability, category_id, subcategory_id, published_at, fetched_at, language, dedupe_group_id, importance_score, summary_ready flag. [hellointerview](https://www.hellointerview.com/community/questions/news-aggregator-feed/cm96lh25n0039ad08067audlg)

- Category / Subcategory  
  - id, label, slug, parent_id (for hierarchy), display_order, color token (for visual category theming), description. [microsoft](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr-2007-02.pdf)

- Summary  
  - article_id, summary_text, key_points (JSON), based_on (what content was used), generated_by_model, generated_at, token_count, status (ok/needs_review). [cloud.google](https://cloud.google.com/use-cases/ai-summarization)

- User  
  - id, email (or SSO subject), role, tenant_id (optional), created_at, last_seen_at.  

- UserPreferences  
  - user_id, favorite_categories, muted_sources, saved_searches, read_later_list, notification_settings. [globaldev](https://globaldev.tech/blog/how-to-build-content-aggregator-website)

- IngestionJob / IngestionEvent  
  - id, source_id, run_at, started_at, finished_at, status, num_fetched, num_new, num_errors; plus error details.  

- SourceHealthSnapshot  
  - aggregated metrics per source for rendering status pills (feeds online, last ingested time). [linkedin](https://www.linkedin.com/posts/rmn-52012_systemdesign-newsaggregator-realtimedata-activity-7269372264498761729-hfQt)

The PRD should specify constraints (indexes, uniqueness, foreign keys), plus data retention and archival strategies.

***

## PLAN – Frontend Architecture & UI Direction

### Route and component structure

Given Next.js 16 and React 19, a best‑practice structure is:

- App Router structure  
  - /(marketing) – Optional public marketing/landing page.  
  - /app – Authenticated shell for the news experience.  
    - /topics/[category]/[subcategory] – Main listing view.  
    - /article/[id] – Detail view; can be rendered as side panel or full page depending on viewport.  
    - /admin/sources, /admin/ingestion – Admin tools (if in scope).  

- Data fetching  
  - Use server components for topic pages to fetch categories + initial article lists from Postgres, enabling streaming and progressive hydration. [systemdesignhandbook](https://www.systemdesignhandbook.com/guides/google-news-system-design/)
  - Use client components for interactive controls (search input, sort select, toggles, summarize button) that call Route Handlers akin to your current JS fetch layer. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)

This aligns with aggregator patterns emphasizing fast, low‑latency feeds with minimal client‑side complexity. [globaldev](https://globaldev.tech/blog/how-to-build-content-aggregator-website)

### Shadcn UI & Tailwind v4 usage

To avoid custom primitive re‑implementation while preserving an avant‑garde look:

- Use Shadcn primitives for:  
  - Navigation (Tabs, DropdownMenu) to implement topic nav and subcategory grid.  
  - Select for sort/subcategory controls.  
  - Card for lead & article cards.  
  - Toggle / Segmented control for Original vs Summary mode.  
  - Badge for source chips and feed status pills.  

- Tailwind v4 + CSS variables:  
  - Promote your current color system (ink, paper, sage, clay, etc.) into Tailwind design tokens and CSS variables. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)
  - Define layout primitives (shell grid, sticky nav, detail panel) as Tailwind utility compositions, not arbitrary bespoke CSS, while keeping bespoke micro‑interactions (hover lifts, subtle shadows) where they matter. [globaldev](https://globaldev.tech/blog/how-to-build-content-aggregator-website)

### Avant‑garde visual direction (anti‑generic)

From research, many aggregators lean into minimalist, content‑first aesthetics to reduce cognitive load and make scanning effortless. [dribbble](https://dribbble.com/shots/14602087-News-Aggregator-UI-UX-Design-Case-Study)

For OneStopNews, the PRD should lock in a distinct direction:

- Tone: editorial‑industrial  
  - Editorial typography for headlines (retain an editorial serif or similar) but pair with a non‑generic grotesk (e.g., Space Grotesk) instead of Inter/Roboto. [dribbble](https://dribbble.com/shots/14602087-News-Aggregator-UI-UX-Design-Case-Study)
  - Maintain strong small caps “eyebrow” labels and uppercase chips for category DNA, as in your MVP. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)

- Differentiators to call out in PRD:  
  - Sticky topic ribbon that expands into a full “topic palette” panel with story counts, matching patterns from taxonomy work on aggregator interfaces. [microsoft](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr-2007-02.pdf)
  - Dual‑pane layout that preserves context: lead + grid on the left and a sticky detail panel on the right for large screens; collapses to stacked sections on mobile. [globaldev](https://globaldev.tech/blog/how-to-build-content-aggregator-website)
  - Intentionally restrained palette (paper/ink/sage/clay) with category‑tinted gradients in thumbnails, avoiding skeuomorphic clutter or trendy purple gradients. [globaldev](https://globaldev.tech/blog/how-to-build-content-aggregator-website)

The PRD should describe not just UI components but the conceptual UX: “calm scanning,” “topic as primary axis,” and “AI as an explicit option, never hidden.”

***

## PLAN – Non‑Functional Requirements to Capture

Based on system design and enterprise AI references, the PRD should explicitly capture: [cio](https://www.cio.com/article/4130985/companies-are-using-summarize-with-ai-to-manipulate-enterprise-chatbots.html)

- Performance  
  - Target p95 page load and feed load times.  
  - Limits on acceptable ingestion staleness per source and per category.  

- Availability & resilience  
  - Error handling UX from your MVP (“No live articles loaded yet…”) plus retry logic and graceful degradation when ingestion is down. [linkedin](https://www.linkedin.com/posts/rmn-52012_systemdesign-newsaggregator-realtimedata-activity-7269372264498761729-hfQt)
  - Circuit breakers per source and backoff policies.  

- Security  
  - Authentication/authorization flows (including how admin actions like /api/ingest are protected).  
  - AI prompt and output logging with access controls; policies against storing sensitive data in logs. [cloud.google](https://cloud.google.com/use-cases/ai-summarization)

- Accessibility  
  - WCAG alignment; proper landmark roles, focus states, keyboard nav for topic nav menus and cards.  
  - Screen‑reader‑friendly labels for AI summary disclosers and toggles.  

- Observability  
  - Metrics per component (ingestion, summarization, feed queries), structured logging, tracing for slow API calls. [reddit](https://www.reddit.com/r/aws/comments/g7smug/architecture_deepdive_how_a_news_aggregator/)

***

## PLAN – Project Requirements Document (Markdown) Structure

Here’s the detailed PRD structure I propose to draft next, tuned for your stack and goals.

### 1. Overview

- 1.1 Product name and tagline (OneStopNews – “Everything important, sorted by topic”). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)
- 1.2 Problem statement – fragmented news sources and topic‑centric mental model.  
- 1.3 Vision – calm, topic‑first news for enterprise users and consumers.  
- 1.4 Out of scope (e.g., no full article republishing, no real‑time comment system initially). [globaldev](https://globaldev.tech/blog/how-to-build-content-aggregator-website)

### 2. Goals & Success Metrics

- 2.1 Primary goals (fast scanning by topic, trustworthy summaries, minimal tab‑hopping). [readpartner](https://readpartner.com/blog/ai-news-summarization)
- 2.2 Secondary goals (enterprise readiness, observability, extensibility). [hellointerview](https://www.hellointerview.com/community/questions/news-aggregator-feed/cm96lh25n0039ad08067audlg)
- 2.3 Success metrics (feed freshness, summary adoption rate, latency targets).  

### 3. Target Users & Personas

- 3.1 Daily news scanner (consumer).  
- 3.2 Enterprise analyst / researcher needing topic‑centric monitoring. [readpartner](https://readpartner.com/blog/ai-news-summarization)
- 3.3 Editor/admin persona managing sources and categories.  

### 4. Use Cases & User Stories

- 4.1 Browse by topic and subtopic.  
- 4.2 Search and sort news.  
- 4.3 Open AI summary with clear disclosure.  
- 4.4 Jump to original source.  
- 4.5 Admin: add/edit sources, monitor ingestion health. [prachub](https://prachub.com/interview-questions/design-a-news-aggregator-system)
- 4.6 Enterprise: configure AI policies, monitor AI usage/costs. [cio](https://www.cio.com/article/4130985/companies-are-using-summarize-with-ai-to-manipulate-enterprise-chatbots.html)

### 5. Information Architecture & Navigation

- 5.1 Topic model and category hierarchy (Top, Local, Tech, etc. plus subcategories). [microsoft](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr-2007-02.pdf)
- 5.2 Navigation model: topic ribbon, subcategory selector, responsive behavior.  
- 5.3 URL schema (/topics/[category]/[subcategory], /article/[id]).  

### 6. UX & UI Requirements

- 6.1 Layout patterns (lead + grid + sticky detail, mobile stacking). [globaldev](https://globaldev.tech/blog/how-to-build-content-aggregator-website)
- 6.2 Components (topic nav, status pills, search, sort, article card, detail panel, AI summary box). [dribbble](https://dribbble.com/shots/14602087-News-Aggregator-UI-UX-Design-Case-Study)
- 6.3 Visual language (palette, typography choices, spacing and density philosophies).  
- 6.4 Interaction details (hover behaviors, keyboard shortcuts, focus management).  

### 7. Functional Requirements

- 7.1 Ingestion  
  - Supported source types, scheduling, retries, failure handling. [systemdesignhandbook](https://www.systemdesignhandbook.com/guides/google-news-system-design/)
- 7.2 Article lifecycle  
  - Fetch, normalize, dedupe, categorize, store.  
- 7.3 Summarization  
  - Trigger model (on‑demand vs batch), caching, invalidation, labeling, guardrails. [cloud.google](https://cloud.google.com/use-cases/ai-summarization)
- 7.4 Search & filtering  
  - Keyword search, filters, sort orders, pagination. [github](https://github.com/mishnit/awesome-system-design/blob/main/News%20aggregator.md)
- 7.5 User features  
  - Favorites, muted sources, read later (potential V2 but described in roadmap). [dribbble](https://dribbble.com/shots/14602087-News-Aggregator-UI-UX-Design-Case-Study)
- 7.6 Admin features  
  - Source management, ingestion monitoring, AI usage dashboards. [hellointerview](https://www.hellointerview.com/community/questions/news-aggregator-feed/cm96lh25n0039ad08067audlg)

### 8. System Architecture

- 8.1 Logical component diagram (web app, APIs, workers, DB, external APIs). [systemdesignhandbook](https://www.systemdesignhandbook.com/guides/google-news-system-design/)
- 8.2 Ingestion pipeline details (scheduling, transformation, dedupe, error handling). [prachub](https://prachub.com/interview-questions/design-a-news-aggregator-system)
- 8.3 Summarization service (queue, worker, third‑party AI provider).  
- 8.4 Data flow from source → DB → Next.js server components → UI.  

### 9. Data Model & Storage

- 9.1 Entity definitions and relationships (Source, Article, Category, Summary, User, etc.). [github](https://github.com/mishnit/awesome-system-design/blob/main/News%20aggregator.md)
- 9.2 Indexing strategy (by category/time, search, dedupe).  
- 9.3 PostgreSQL vs SQLite usage and migration strategy.  

### 10. API Design

- 10.1 Public/internal HTTP APIs (endpoints, parameters, response shapes).  
- 10.2 Auth requirements per endpoint.  
- 10.3 Rate limits and error formats.  

### 11. Non‑Functional Requirements

- 11.1 Performance and scalability targets. [hellointerview](https://www.hellointerview.com/community/questions/news-aggregator-feed/cm96lh25n0039ad08067audlg)
- 11.2 Security & compliance (authN, authZ, AI safety, content policies). [cio](https://www.cio.com/article/4130985/companies-are-using-summarize-with-ai-to-manipulate-enterprise-chatbots.html)
- 11.3 Availability, backup, and disaster recovery.  
- 11.4 Accessibility (WCAG targets).  

### 12. Observability & Operations

- 12.1 Metrics, logs, and tracing. [reddit](https://www.reddit.com/r/aws/comments/g7smug/architecture_deepdive_how_a_news_aggregator/)
- 12.2 Alerting policies.  
- 12.3 Operational runbooks (e.g., what to do when ingestion fails).  

### 13. Rollout Plan & Phasing

- 13.1 MVP scope (roughly your current functionality plus minimal re‑architecture).  
- 13.2 Phase 2 (personalization, admin tools).  
- 13.3 Phase 3 (advanced topic modeling, recommendations).  

### 14. Risks & Open Questions

- 14.1 Legal/content sourcing risk.  
- 14.2 AI summarization risk (accuracy, bias, poisoning). [cloud.google](https://cloud.google.com/use-cases/ai-summarization)
- 14.3 Operational risk (ingestion scaling, source changes).  

***

## Implementation Direction (High‑Level)

Even though we’re not writing code yet, the PRD should anchor implementation assumptions:

- Next.js 16 App Router with server components for feeds and Route Handlers as API layer.  
- React 19 with strict mode and modern patterns (server components + client islands for interactivity).  
- Tailwind CSS v4 with design tokens reflecting your current palette and spacing system. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEZKS3K2VX&Signature=2q3yYccG4vswmwvSfyNTyB4clIw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCQCQOgW7B8TZ4V0xjis1v4l4y2dKDCtKh00w7hzBYqKgIhAJnfQaoQSibKD1qw6cWGWAi1zc%2BkNAziH%2FAmGFSceD5ZKvwECK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxWA8i5DRvKHnZXFqkq0ARYT%2FyrA569j58yGd3fpZwV7rCws8T%2BXPiKLqB%2FlViKeBxfxI%2Fff4zSbcsaqCoEu15sirpPe6EgouCNf2%2BiJabuYjCxQtnHWKLPd9kuiCn5nha1yl6TwFXuo%2B2tE70YymNICLb7xRi3YPWp53MwnWlyvV0IjXhgkEi6FkYxn97CJJ2p9m%2BtrWj1KymnYZWsfxY0beyu9qeWQe5n9lvTeW381wcafgi%2BuFyBbKmVz%2BM1GRWRqEHgNFDvU%2FZvU7szTqsJjbL7PVSV5KFzDlMa7RCjfNlCOuXGKF7AoBrwXaDEDGhjp9uQDBlzR0AcvTENP3b7mO%2Fdq4221o4%2FMqXsb3Z%2FjFJCCJnM%2FrsSsJtgiPlI1qK1u%2BVnuR8dtoY8fXikopK61Kcy6kYnfWRoqv6fNsIJSLiHYRQFhURA2VajiPD%2Bses5%2FygOtmzViQoWYOZ7UWnYgfgGEczVWelP9vj53sbOkcOUULGVge1ZxpKZPRHcfAiVa2Nn0Vt3V62KlslacalyVQh1JsPWgcqFc5u%2BkGx9zuIeGcgCKMb%2BmrbN2bAjHyNL%2BwJTe79sUzvgW9MtPAKKT9NYDVvI03epF9IDp0oAUuwzp2qXV4cdIALYbetYgfKpFUIhlutNoVwRechr6DSvtCbOeLI%2BThEnnm4lfLFe1Gf9ZkV8bhCT7nzMoFQOn9ys%2FQNyXrfQu5O1M%2Fdy0mBoF0idCvODBNyGfz4rAKlDVO31y7LAhgNotaExiqdtk6qOsgpj2rkC7x0kAWbkPr0Qt5uzHMZx1Vl6sGY%2FBvKjMJ2tmdEGOpcBQzFOhVB3fsZxctex8mV0VeWagVIzY1dTrYwkJT43dRh%2FSGgAmSglPgk2g7%2B%2F0wgvj4sF%2BKZ0onek94Lwj4oijIZkBB7yo%2BtBqLjKvqC4NT0H%2FgUGrBTyySY6Ib5TjrU553c%2BwFshjXL9rLeOOyVbhT3phkmXQxmISE7sUI%2BxI8HT4CrUK%2B6%2BNA%2BdkFQ%2FKKOOcw7OSVI2sg%3D%3D&Expires=1780900976)
- Shadcn UI as primary primitive library (no reinvented buttons/inputs/cards), wrapped with a custom design system to realize the editorial‑industrial aesthetic. [dribbble](https://dribbble.com/shots/14602087-News-Aggregator-UI-UX-Design-Case-Study)
- PostgreSQL 17 as canonical data store for all domain entities with migrations; SQLite fallback explicitly scoped to dev/local.  

The PRD will describe these as non‑negotiable technical constraints.

***

## Documentation & Validation Approach

For the PRD itself:

- Every requirement will be testable: e.g., “Feed must display at least N fresh stories per category, with max staleness X minutes under normal conditions.” [systemdesignhandbook](https://www.systemdesignhandbook.com/guides/google-news-system-design/)
- Non‑functional requirements will include measurable thresholds (latency, uptime, coverage, AI summary quality guidelines).  
- Traceability: map user stories → features → endpoints → metrics so QA and ops can validate end‑to‑end behavior. [reddit](https://www.reddit.com/r/aws/comments/g7smug/architecture_deepdive_how_a_news_aggregator/)

***

## Next Steps

If you’re aligned with this research‑backed architecture and the proposed PRD structure, the next step is for me to draft the full `Project Requirements Document` in markdown following this outline, tailored exactly to your tech stack and design philosophy.

---

I’ve drafted the full `Project_Requirements_Document_1.md` for OneStopNews as a standalone Markdown report artifact. It covers:

- Product vision, scope, and success metrics  
- Detailed UX/IA and topic model  
- Ingestion, summarization, search, and admin features  
- Target architecture for Next.js 16, React 19, Tailwind v4, Shadcn UI, and PostgreSQL 17  
- Data model, APIs, non‑functional requirements, observability, rollout phases, and risks  

---

You’re broadly on the right track with the PRD, but it currently encodes “one obvious architecture” and doesn’t explore alternative shapes or trade‑offs. Below is a critical review, then three concrete implementation designs, followed by a comparison and a merged recommendation.

***

## Executive Summary

- The existing PRD is solid as a **product spec** but under‑specifies **caching, ranking, and data volume assumptions**, and somewhat over‑commits to a single architectural style (monolithic Next.js with background workers) without naming alternatives. [systemdesignhandbook](https://www.systemdesignhandbook.com/guides/google-news-system-design/)
- Three viable designs for OneStopNews (all staying in the Next.js + Node + Postgres universe) are:\n  - **Design A – Monolithic Next.js + In‑Process Jobs**: simplest, great for fast delivery, limited headroom.  \n  - **Design B – Modular Monolith with External Queue** (recommended): Next.js app for read paths, separate Node worker service for ingestion/summarization, shared Postgres, decoupled via SQS/RabbitMQ/Redis‑queue.  \n  - **Design C – Full Event‑Driven Microservices**: multiple services (ingestion, processing, ranking, API) communicating via Kafka; huge scalability/flexibility, large complexity overhead. [linkedin](https://www.linkedin.com/posts/punitkumar99_golang-microservices-rabbitmq-activity-7373634709454675969-7hMC)
- The best practical endpoint for you now is **Design B**, borrowing a few ideas from C (event‑style ingestion + queues) while preserving the cohesiveness and simplicity of A. [blog.algomaster](https://blog.algomaster.io/p/designing-a-scalable-news-feed-system)

***

## Detailed Plan

### 1. Critical review of the current PRD

#### 1.1 Strengths

- **Product framing is clear**: topic‑first, AI summaries on‑demand, always link to source; this matches both your MVP and established aggregator principles. [github](https://github.com/mishnit/awesome-system-design/blob/main/News%20aggregator.md)
- **Good domain model**: Source, Article, Category, Summary, User, Preferences, IngestionJob, SourceHealth are well chosen and align with common “news aggregator / feed” designs. [prachub](https://prachub.com/interview-questions/design-a-news-aggregator-system)
- **Non‑functional awareness**: mentions latency targets, availability, robots.txt compliance, AI safety, and observability rather than leaving them implicit. [hellointerview](https://www.hellointerview.com/community/questions/news-aggregator-feed/cm96lh25n0039ad08067audlg)
- **UX is coherent**: lead + grid, sticky topic nav, status pills, dual‑pane detail view are consistent with content‑first UX patterns and your current MVP. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEWR5Z24TB&Signature=UpZWMLbzNLmyGdCEYx%2Bzd%2FTx4K0%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCIBal9d13mvBvKAkzyc1b%2F5dE0p3Von0dhmexc3xqW%2FPKAiBO8YW5OVnQ7Y6tZcs82vl79N%2Fz3sYUHwZ3jxThNwT2PCr8BAiv%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAEaDDY5OTc1MzMwOTcwNSIMPr9l2%2F4cBFt9o5jbKtAE%2Bxx8BQbW9B8fyYhbIQyewTxmTfKKupZo%2FAJGb%2BSE1e0PgzjRL8NhVwMrnGJ0XnUB2ch2sJaaM6wNIQtTQPQ7nznXafNW7%2Be8P0TwSnLqvWBbChf9piOwk1VJvVhgWqAllLtHfsXbI2GxbpGHgh8y6eG4f3Ije8sMZuICxar32%2FBT0iKy8myNX36Ot8s6pRD0EaBTVVkvOnpqvMFkGGptK4qfPwKc27v4R0YyDZtuoF0ayaACXbTZiBB3EDCQBEvlYgJN61uoGsi%2FD3T95eMoslLWBTG63Yyks3%2Bxwn1oVCA8bU6cltPrbJck8ZPA1Iey4%2BYKjGINlNQU7xiclFlhNcamTt0BxhjdgB0rsRW5WhiYkIaaC5%2Bj1c4sVx1zxCxZ%2BKgMzpx5RC6zgFKEHJ06KAozDj9c8BUB0WQISs7Lenf1a3h8tuebD6B8kAEGBatew9Onadjp0uHw2RCUGiM7tNWMbnqk356qBCAQwrPqvUKhSrceZsjIdM6YOwvUaAh61NwHOXWS2xLGv1kxGpOsa5QitIJzPZDXCflHdqSBd%2BhELjaqvliqq3PCDGI4ZKCRsvePSAmWDBdiBuG2TJgSVpssW3CvqJZEUBYjdDFnmMCYlCB%2BtvNSV7UIQ9qQ9WJ9MIW%2BhaNm63Ch7odItyaDStDOvUjQdApbx7GutjSuQTjKCJI9osjl7boTJQlIiw1MZMpSOlScHv3wxx81agzxTFvNn3RmEsw%2BXd%2B66o4lB6WZbLQhBh2tuwf1GBHVV74r%2F3S%2FsJqLLOVRtPSZB7m7JzC8sZnRBjqZAc6kv545tWNk%2F65HUKDsYE%2FF4lGVME7%2BeoYyo4wz3Zc6SVnyvY6HBO%2FWcJtcEMbmuxdxjHzmvQKf0KzL54LGIdpdwTJCD%2FnXIDVkF3m3V6jYuxc%2BrjZxQU2NtqBswLClpOuHXksfb%2FPZaOQzWDsFAURvNOLrsrbNkzHkb1caTxVlSahP0uHnZV4UT2B4sGjHI3clhQ2N70nrlw%3D%3D&Expires=1780901519)

#### 1.2 Gaps / weaknesses

1. **Traffic and volume assumptions are missing**  
   - There are no explicit numbers for expected articles/day, active users, or QPS per endpoint. That makes it hard to reason about whether a monolith is enough or if you need queues and specialized storage. [0xkishan](https://www.0xkishan.com/blogs/designing-a-scalable-news-feed-architecture)

2. **Caching & feed generation strategy is under‑specified**  
   - The PRD doesn’t describe how feed responses are cached (Next.js cache, Redis, Postgres materialized views) or whether feeds are computed on‑read vs pre‑computed. [arno.surfacew](https://arno.surfacew.com/posts/nextjs-architecture)
   - News/feed systems often need aggressive caching and pre‑computed timelines to handle spikes and to avoid hammering storage on every request. [0xkishan](https://www.0xkishan.com/blogs/designing-a-scalable-news-feed-architecture)

3. **Ranking / “impact” is hand‑waved**  
   - “Impact sort” is listed, but there is no definition of score inputs (recency, source weight, topic density, duplication cluster, social signals) or compute path (batch vs near‑real‑time). [systemdesignhandbook](https://www.systemdesignhandbook.com/guides/google-news-system-design/)

4. **Next.js architecture is high‑level only**  
   - It says “Next.js 16 + React 19 + server components” but does not choose a concrete front‑end architecture pattern (feature‑based, FSD, layered services/hooks) or define what runs in RSC vs client components vs Route Handlers. [dev](https://dev.to/addwebsolutionpvtltd/architecting-large-scale-nextjs-applications-folder-structure-patterns-best-practices-2dpj)
   - There is no explicit caching layer plan (Next.js fetch cache, route cache, edge cache, Redis) even though those are central to large‑scale Next apps. [magicui](https://magicui.design/blog/next-js-project-structure)

5. **Ingestion pipeline design is simplistic**  
   - It describes a scheduled pull model but doesn’t consider event‑driven vs purely scheduled, or the use of queues for decoupling collection, processing, and storage. [redpanda](https://www.redpanda.com/blog/building-event-driven-pipelines-sqs-s3)
   - Deduplication strategy (URL + hash) is mentioned, but not how to handle errors, retries, or out‑of‑order delivery beyond basic retry. [prachub](https://prachub.com/interview-questions/design-a-news-aggregator-system)

6. **AI summarization governance could be stronger**  
   - Good on labeling and caching, but doesn’t define quality evaluation loops, sampling for review, or structured feedback channels from analysts/admins to improve prompts/models. [cloud.google](https://cloud.google.com/use-cases/ai-summarization)

7. **Scaling roadmap is linear, not architectural**  
   - The PRD implies you can “scale up” but doesn’t make explicit whether that’s vertical scaling of a monolith, horizontal scaling behind a load balancer, or an eventual move towards more decoupled services. [blog.kubesimplify](https://blog.kubesimplify.com/event-driven-architecture-simplified-monolith-to-microservices)

In short: the PRD is a very good **product requirements** document, but light on **architectural variability, caching strategy, and concrete scale assumptions**.

***

### 2. Three implementation designs

All three assume: Next.js 16 App Router, React 19, Tailwind v4, Shadcn UI, PostgreSQL 17 (plus optional Redis/queue). They differ in how ingestion, summarization, and API responsibilities are carved up.

#### Design A — Monolithic Next.js app with in‑process jobs

**Concept:** A single Next.js app (monolith) handles web UI, API routes, ingestion tasks, and summarization jobs, all running in one deployable unit. This is essentially the “basic monolith” step many feed systems start from. [news.ycombinator](https://news.ycombinator.com/item?id=32000598)

**Backend shape**

- **One repo, one deployable**: Next.js app with:  
  - `/app` for routes and layouts  
  - `/app/api/*` route handlers as the only HTTP API  
  - `/lib` for domain services (ingestion, summarization, ranking)  
  - A small “job runner” layer (e.g., node‑cron or a lightweight scheduler) inside the same process.  
- Ingestion jobs: scheduled code inside the monolith (e.g., cron‑like tasks) run in a long‑lived server instance, pulling feeds, normalizing, deduping, and writing to Postgres. [blog.algomaster](https://blog.algomaster.io/p/designing-a-scalable-news-feed-system)
- Summarization: jobs triggered via internal function calls from API route handlers; longer jobs may run in background tasks within the same process (e.g., using worker pools or simple in‑process queue).  

**Frontend shape**

- Uses Next.js App Router with server components for feeds and detail pages, Route Handlers as BFF.  
- Feature‑based folder structure, but all code in one project according to large‑scale Next guidelines. [dev](https://dev.to/addwebsolutionpvtltd/architecting-large-scale-nextjs-applications-folder-structure-patterns-best-practices-2dpj)

**Caching & performance**

- Use Next.js built‑in cache (fetch cache + route cache) plus HTTP caching on `/api/articles` to avoid repeated queries for the same topic/subcategory. [magicui](https://magicui.design/blog/next-js-project-structure)
- Optional in‑memory or Redis cache for hot feeds (e.g., “Top Stories”) if needed.  

**Pros**

- Very fast to build and deploy; minimal infra footprint. [blog.bitsrc](https://blog.bitsrc.io/frontend-architecture-a-complete-guide-to-building-scalable-next-js-applications-d28b0000e2ee)
- Simple mental model: one codebase, one CI/CD, one place to debug.  
- Great alignment with current MVP and team size (likely small).  

**Cons**

- Background jobs and API compete for the same process resources; ingestion/summarization spikes can impact user‑facing latency. [0xkishan](https://www.0xkishan.com/blogs/designing-a-scalable-news-feed-architecture)
- Harder to scale ingestion/summarization independently — you typically scale the whole app.  
- Observability and failure isolation are weaker (e.g., memory leak in ingestion affects the web tier). [news.ycombinator](https://news.ycombinator.com/item?id=32000598)

**When Design A is appropriate**

- Modest traffic, low to mid ingestion volume, small team.  
- Primary goal is speed to production and you’re okay with refactoring later. [blog.algomaster](https://blog.algomaster.io/p/designing-a-scalable-news-feed-system)

***

#### Design B — Modular monolith + external queue (recommended)

**Concept:** Keep **one logical product** and one database, but split the system into two deployables: the **Next.js app** and a **Node worker service**. They share a Postgres DB and communicate asynchronously via a managed queue (e.g., SQS, RabbitMQ, or a Redis‑based queue like BullMQ). This mirrors many “scalable but not over‑microserviced” news aggregators. [automq](https://www.automq.com/blog/kafka-vs-sqs-messaging-streaming-platforms-comparison)

**Backend shape**

- **Services:**  
  - **Web App** (Next.js): handles UI, public API endpoints, and lightweight write operations (preferences, triggers).  
  - **Worker Service** (Node 24): runs ingestion jobs, summarization jobs, and heavy enrichment (dedupe, ranking computation).  
- **Queue:**  
  - Ingestion: `ingest-source` jobs per source; the scheduler (could be in worker or an external scheduler) enqueues jobs; workers consume and write to Postgres. [prefect](https://www.prefect.io/blog/event-driven-versus-scheduled-data-pipelines)
  - Summarization: `summarize-article` jobs per article; API route `/api/summarize/[id]` enqueues a job and returns immediately; worker calls AI, writes summaries, and the UI polls or uses revalidation. [cio](https://www.cio.com/article/4130985/companies-are-using-summarize-with-ai-to-manipulate-enterprise-chatbots.html)
- All services share **one Postgres** schema; no data duplication; the system is still a “modular monolith” at the data level. [arno.surfacew](https://arno.surfacew.com/posts/nextjs-architecture)

**Frontend shape**

- Same as A, but with clearer layering:  
  - UI layer: Shadcn components and page layouts.  
  - Hooks/services: data fetching hooks using `fetch`/SWR/TanStack Query that call Next.js Route Handlers. [blog.bitsrc](https://blog.bitsrc.io/frontend-architecture-a-complete-guide-to-building-scalable-next-js-applications-d28b0000e2ee)
  - Route Handlers: thin HTTP layer calling domain services; domain services do not know if they are called from web or worker (helps testability). [arno.surfacew](https://arno.surfacew.com/posts/nextjs-architecture)

**Caching & performance**

- Introduce **explicit caching strategy**:  
  - Use Next.js RSC fetch caching for feed queries, with time‑based revalidation per category (e.g., `revalidate=60` for Top/Finance, `300` for slower areas). [magicui](https://magicui.design/blog/next-js-project-structure)
  - Optionally add Redis as a feed cache (pre‑computed feed slices keyed by topic/subtopic/sort) to avoid repeated expensive queries. [0xkishan](https://www.0xkishan.com/blogs/designing-a-scalable-news-feed-architecture)
- Worker can pre‑compute ranked IDs for hot feeds periodically and store them in Postgres/Redis for fast retrieval.  

**Pros**

- Decouples ingestion and summarization from the web tier — a spike in ingestion doesn’t directly kill the UI. [linkedin](https://www.linkedin.com/posts/punitkumar99_golang-microservices-rabbitmq-activity-7373634709454675969-7hMC)
- Keeps the system conceptually simple: one domain, one DB, minimal inter‑service contracts.  
- Easy to scale workers separately (more summarization workers during the day, fewer at night).  
- Queue provides retries, backoff, and dead‑letter handling for flaky sources and AI providers. [automq](https://www.automq.com/blog/kafka-vs-sqs-messaging-streaming-platforms-comparison)

**Cons**

- More infra pieces: queue, worker deploy, scheduler.  
- Still not fully isolated; a bad migration or DB issue affects all components.  
- Requires discipline to keep data and domain logic centralized, not duplicated across web and worker (enforce a domain layer).  

**When Design B is appropriate**

- Medium traffic and ingestion volume, where ingestion and summarization load is non‑trivial.  
- Team wants more reliability and observability than a pure monolith, without going full microservices.  
- This maps well to your stated “enterprise‑grade but pragmatic” goal. [blog.algomaster](https://blog.algomaster.io/p/designing-a-scalable-news-feed-system)

***

#### Design C — Full event‑driven microservices with Kafka

**Concept:** Decompose into multiple services: **Source Collector**, **Processor/Enricher**, **Ranker**, **API/BFF**, plus optional **Search** & **Notification** services, all communicating via an event streaming platform (Kafka/Redpanda) and queues. Each service owns its own data and schema; Postgres may be split by bounded context. [blog.kubesimplify](https://blog.kubesimplify.com/event-driven-architecture-simplified-monolith-to-microservices)

**Backend shape**

- Services (examples):  
  - Source Collector: fetches RSS/APIs, publishes `RawArticleFetched` events to Kafka.  
  - Processor: consumes those events, normalizes, dedupes, categorizes, writes to an `articles` store, emits `ArticleUpdated` events. [linkedin](https://www.linkedin.com/posts/punitkumar99_golang-microservices-rabbitmq-activity-7373634709454675969-7hMC)
  - Ranker: consumes article events, computes impact scores and feed ordering, writes to a `feeds` store.  
  - Summarizer: consumes `SummarizeArticleRequested` events, calls AI, publishes `SummaryGenerated`.  
  - API/BFF: Next.js app that reads from `articles` + `feeds` stores and exposes HTTP/GraphQL interfaces.  
- Storage:  
  - Postgres for core data (possibly multiple logical DBs).  
  - Optional Elasticsearch for search, Redis for caching. [linkedin](https://www.linkedin.com/posts/punitkumar99_golang-microservices-rabbitmq-activity-7373634709454675969-7hMC)

**Frontend shape**

- Essentially the same as B (Next.js RSC, Shadcn), but the API layer may call multiple backing services or an API gateway.  

**Caching & performance**

- Feeds are pre‑computed and stored as materialized views or separate feed tables keyed by user/topic; reads are extremely fast. [0xkishan](https://www.0xkishan.com/blogs/designing-a-scalable-news-feed-architecture)
- Kafka enables event replay to recompute feeds or apply new ranking models over historical data. [automq](https://www.automq.com/blog/kafka-vs-sqs-messaging-streaming-platforms-comparison)

**Pros**

- Highly scalable and resilient; ingestion, processing, ranking, search, and UI can all scale independently. [blog.kubesimplify](https://blog.kubesimplify.com/event-driven-architecture-simplified-monolith-to-microservices)
- Great for complex enterprise deployments with many teams and heterogeneous workloads.  
- Event log provides excellent auditing and replay capabilities.  

**Cons**

- Very high complexity for your current stage; significant operational overhead (Kafka clusters, multiple services, cross‑service debugging). [news.ycombinator](https://news.ycombinator.com/item?id=32000598)
- Requires strong discipline in schema evolution, versioning events, and distributed tracing.  
- Overkill unless you have truly large scale (tens of millions of articles, many teams).  

**When Design C is appropriate**

- Very high article volumes and strict low‑latency requirements across multiple tenants/regions.  
- Large engineering org with dedicated platform team.  

***

## Implementation (Conceptual): Comparison & Evaluation

### 3.1 Comparison table

| Dimension              | Design A – Monolith                        | Design B – Modular + Queue                         | Design C – Event‑Driven Microservices               |
|------------------------|--------------------------------------------|---------------------------------------------------|-----------------------------------------------------|
| Complexity             | Low                                        | Medium                                            | High                                                |
| Time‑to‑market         | Fastest                                   | Fast                                              | Slowest                                             |
| Operational overhead   | Lowest (1 app)                            | Moderate (app + worker + queue)                  | Highest (many services + Kafka + search)           |
| Scalability headroom   | Limited                                   | Good for mid–high                                | Very high                                          |
| Failure isolation      | Weak                                      | Moderate                                         | Strong                                              |
| Fit for current MVP    | High                                      | Very high                                        | Low                                                 |
| Future enterprise fit  | OK (requires refactors later)             | Strong (good long‑term compromise)               | Strong but over‑engineered now                     |
| Alignment w/ Next best practices | OK but can be messy if jobs mix with web | Strong (clean layering, services, RSC)         | Depends heavily on gateway design                  |
| AI summarization load handling | Limited (same process)             | Good (workers scale separately)                  | Excellent (dedicated summarizer service)           |

Sources on monolith vs modular vs microservices and evolution patterns. [blog.bitsrc](https://blog.bitsrc.io/frontend-architecture-a-complete-guide-to-building-scalable-next-js-applications-d28b0000e2ee)

### 3.2 Critical evaluation

- **Design A** is exactly what many guides recommend as the starting point: a monolithic app with a relational DB, especially for feed systems. [news.ycombinator](https://news.ycombinator.com/item?id=32000598)
  - However, you already know this domain, and your MVP exists; the PRD’s goal is “enterprise‑grade”. A pure monolith under‑delivers on operational isolation and robustness for ingestion and AI workloads.  

- **Design C** is what you’d see at the scale of Google News or an enterprise media monitoring platform with multiple teams. [systemdesignhandbook](https://www.systemdesignhandbook.com/guides/google-news-system-design/)
  - It offers beautiful separation and resilience, but at the cost of a lot of infra and cognitive overhead. For the current scope and team size, it’s unjustified.  

- **Design B** is the pragmatic middle: queues and separate workers give you most of the reliability benefits of C, while keeping code in a small number of deployables like A. [blog.kubesimplify](https://blog.kubesimplify.com/event-driven-architecture-simplified-monolith-to-microservices)
  - It’s also very compatible with modern Next.js architecture advice: feature‑based, layered, with a clear domain layer shared between web and workers. [dev](https://dev.to/addwebsolutionpvtltd/architecting-large-scale-nextjs-applications-folder-structure-patterns-best-practices-2dpj)

***

## Validation: Merged “Best of All Three” Design

Here’s a synthesized architecture that merges the best aspects of all three, and that the PRD should evolve toward:

### 4.1 Backend architecture (merged)

- **Core shape:** Design B (modular monolith + queue) as default.  
- **Event‑flavored pipeline:** Borrow from C by modeling key transitions as events internally (e.g., `ArticleIngested`, `ArticleRankUpdated`, `SummaryGenerated`), even if they’re implemented as messages on SQS/Redis‑queue rather than Kafka initially. [prefect](https://www.prefect.io/blog/event-driven-versus-scheduled-data-pipelines)
- **Domain‑centric modules:** Adopt a layered architecture inside the repo:  
  - `domain/` — Source, Article, Summary, Ranking services (pure, testable). [arno.surfacew](https://arno.surfacew.com/posts/nextjs-architecture)
  - `infra/` — Postgres access (Prisma/SQL), queue clients, AI client.  
  - `apps/web/` — Next.js UI and API route handlers.  
  - `apps/worker/` — Worker service that imports the same domain layer.  

This keeps Design A’s simplicity and C’s “events as first‑class concepts” without introducing full microservice bloat.

### 4.2 Frontend architecture (merged)

- **Use Next.js App Router and server components heavily** for feed pages, with Route Handlers providing a clean internal API. [magicui](https://magicui.design/blog/next-js-project-structure)
- **Feature‑based organization** (FSD‑inspired): slices like `topics`, `article-detail`, `admin`, each with UI, hooks, and service layer. [dev](https://dev.to/addwebsolutionpvtltd/architecting-large-scale-nextjs-applications-folder-structure-patterns-best-practices-2dpj)
- **Client islands** only where needed (search input, sort/select, summarize button, topic nav interactions); everything else SSR/RSC to minimize JS and improve performance. [magicui](https://magicui.design/blog/next-js-project-structure)

### 4.3 Caching & feed strategy (merged)

- Take the monolithic “simple queries” baseline from A and harden it with B and C ideas:  
  - **Short‑TTL RSC fetch caching** for feeds with `revalidate` tuned per category freshness needs. [arno.surfacew](https://arno.surfacew.com/posts/nextjs-architecture)
  - Optional **feed materialization**: workers periodically compute ranked ID lists for hot feeds and store them in a `feed_slices` table or Redis, so `/api/articles` becomes a quick lookup. [blog.algomaster](https://blog.algomaster.io/p/designing-a-scalable-news-feed-system)
  - Introduce **per‑source freshness metrics** and use them both for status pills and for caching TTL hints. [hellointerview](https://www.hellointerview.com/community/questions/news-aggregator-feed/cm96lh25n0039ad08067audlg)

### 4.4 Ingestion and summarization (merged)

- **Ingestion**  
  - Scheduled (cron‑style) jobs in the worker service enqueue source‑level ingest jobs; you can switch to event‑driven triggers later if a provider offers webhooks. [redpanda](https://www.redpanda.com/blog/building-event-driven-pipelines-sqs-s3)
  - Deduplicate and categorize using shared domain logic; emit events into the queue for downstream ranking or enrichment if needed.  

- **Summarization**  
  - `/api/summarize/[id]` only enqueues; worker does all AI calls, with backoff and dead‑lettering. [cloud.google](https://cloud.google.com/use-cases/ai-summarization)
  - Summaries are versioned and can be flagged “needs_review”; admin UI for sampling and QA.  

### 4.5 PRD adjustments implied by this merged design

You don’t need a brand‑new PRD, but you should refine the existing one in a few places:

1. **Add explicit scale assumptions** (articles/day, expected peak QPS) and map them to why you’re choosing “modular monolith + queue” rather than pure monolith or microservices. [prachub](https://prachub.com/interview-questions/design-a-news-aggregator-system)
2. **Clarify architecture variant**: explicitly state “two‑service architecture (web + worker) with shared Postgres and managed queue; designed to evolve into more event‑driven patterns if/when scale demands.” [automq](https://www.automq.com/blog/kafka-vs-sqs-messaging-streaming-platforms-comparison)
3. **Specify caching/feeding strategy**: Name the use of Next.js RSC fetch caching, optional Redis or materialized feed slices, and when you’d move to pre‑computed feeds. [0xkishan](https://www.0xkishan.com/blogs/designing-a-scalable-news-feed-architecture)
4. **Tighten the ranking section**: Describe a first‑cut impact score formula and where it runs (worker vs DB vs API), and note this as evolvable (weights, ML later). [systemdesignhandbook](https://www.systemdesignhandbook.com/guides/google-news-system-design/)
5. **Deepen AI governance**: Add QA sampling, review workflow, and monitoring for AI summarization (false facts, bias, prompt injection). [readpartner](https://readpartner.com/blog/ai-news-summarization)

***

## Next Steps

If you’d like, the next iteration can:

- Update the existing PRD text to explicitly encode **Design B + event‑flavored internals**, including a short “Architectural Variants Considered” section documenting why A/C were rejected for now (which is useful for future reviewers).  
- Then we can start a **concrete implementation roadmap**: repo structure, services layout, and initial migrations for Postgres that match this merged design.

---

I’ve created a fully updated / improved PRD as a new Markdown report artifact (`onestopnews-prd-updated-architecture.md`) based on the modular‑monolith + worker + queue design we discussed, aligned with modern large‑scale Next.js and feed‑system architecture practices. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/44072005/d3d8c212-7bd3-4358-b16e-24d1533f55db/mockup_design.md?AWSAccessKeyId=ASIA2F3EMEYEWYR7BXMK&Signature=NLX4pHE5ZwFYD5NJzxvSzlUAP00%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEOb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJHMEUCIQC0U7oreTzZNI%2Bz%2Fs1ZRd8L0QyvOO%2BtKaAbiYiaxnz0FAIgcWc9O6impR2Plv6JMKEvpLF9H48NGTYih0NtV62wFUEq%2FAQIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARABGgw2OTk3NTMzMDk3MDUiDITJBt1nVARBg4pgDSrQBBQFbUiggxK9rpOCfadnQzCCiSmi0DnRa1FLnuYQloQKyaUygUobji47IXN89hiRoeLrZDlVQ6jR%2B8LVzpNnQPaHxzAQcNA6otDS%2FGyXqVGZW0VXd8154etmXqX4HypJSdGhcFb2OM5eu3tqYV4yPI4YRE3KlMs8nrHjJ94PIX953rA5RdbayOtiWrsGJHH%2FCbWRerscetB1JYIjpY84vK0yuKVHHQZl%2BxtbFW0TgOKvnD6wJewMsnHyjl%2F1Vez0IZosf9p5Xc%2FB4eoF1w%2FaG6hGK21oPTJEoAxiqIz5gIMMUYjx68w483mRHAZXMr6zFpTqb6KPIpSiNY%2F0SMMOJbIYjn%2BnYsylhV2ok69%2BYEDnNLUzSnQ2ouKK%2FIRorHtHQTluTSQDT4zxLLI%2BxhH5hKKq4z13ctjUAjtwM0rqHN9SnaE2goUSrRfhfuba2Z%2FmmzrTQofkqx442ESaU%2FaFhc6SHoOWkYpMMh7lENtZfa8Qrs8CepHhMuSILt5KRcjrkRSCj9fA70nR0VyQb7o0oO9QWh1ModKmlkeT3eBju9wB8vv0h3kAUSksaDs1FY3IODDAwTQ0i7y4H4FB%2F5oExJUj%2BA02qZEa0oPPjwYLctkY4%2BexsOAfxdPNsTJaSOG%2BzwLORAQ5cpQeNSGFWTB5FMsnOMK46yMswb%2BXtQreYUO3I%2B7ZUDkBDtbv%2FZHZ%2BaMx3LY2pPSUSRl65OYTTHRBICHXnk%2FjUthQKJ2V5Yly93hPPhy6%2FzGnFQmMgFcDCOrwtSShYgKRvNfN0IKCFvK4%2BSswq6yZ0QY6mAHNogHOVOPQbkeltI0EBbW580CLMQwApO9wcZVRQ0NQhKt68fd4LNucI43NGqIzQsF1he2O1cJ5FFYxcyMXCY8jV%2FxFhmXdS7U0rsGl7MkWHUiO23P8keB321TyY88B1aVFuIcsWUnY8JDgeqE9aX33s6YPkofC6bAY4VUiihwPiDVrRqHG6puBotUR4%2B2CllzapSOeKJo2Gw%3D%3D&Expires=1780900862)

Key upgrades encoded in this new PRD:

- **Explicit architecture choice:**  
  - Web App (Next.js 16 + React 19) + separate Worker Service (Node 24+) + managed queue + shared PostgreSQL 17, rather than a single all‑in‑one process. [systemdesignhandbook](https://www.systemdesignhandbook.com/guides/google-news-system-design/)
- **Feature‑based, layered Next.js structure:**  
  - Clear separation of UI, hooks, domain services, and Route Handlers, following large‑scale Next.js guidance. [microsoft](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr-2007-02.pdf)
- **Defined scale assumptions and feed strategy:**  
  - Daily article volumes, user scale, and read‑heavy patterns are now explicit, with matching caching and feed‑slice strategy inspired by news/feed system design literature. [hellointerview](https://www.hellointerview.com/community/questions/news-aggregator-feed/cm96lh25n0039ad08067audlg)
- **Queue‑backed ingestion & summarization:**  
  - Ingestion and AI summarization flow through dedicated jobs with retries/backoff and isolation from the web tier. [learn.microsoft](https://learn.microsoft.com/en-us/answers/questions/722208/whats-the-best-way-to-create-a-news-aggregator-sit)
- **Ranking and impact score:**  
  - An initial scoring model (recency + source priority + cluster size) is defined, computed in workers, and tied to “Impact” sort semantics. [blog.stackademic](https://blog.stackademic.com/designing-a-scalable-news-aggregator-system-google-news-scale-a-deep-dive-with-full-explanation-fc39ee5ea13b)
- **Stronger AI governance:**  
  - Summaries labeled, versioned, sampled for QA, with admin workflows to flag/regenerate and guardrails around prompts/output. [cloud.google](https://cloud.google.com/use-cases/ai-summarization)

You can open/download the `Project_Requirements_Document_2.md` Markdown report from the artifacts pane and drop it straight into your repo as the canonical PRD. If you’d like, the next step can be: translate this into a concrete repo layout + initial migrations and service scaffolding.

# https://www.perplexity.ai/search/you-are-claw-code-my-elite-cod-HVESLPS6Qb6QdQ85nrgbgg 

```

# mockup_design.md
```md
# README.md
```md
# OneStopNews

**Everything important, sorted by topic.**

Live site: https://onestopnews.onrender.com/

OneStopNews is a topic-first news aggregator that helps readers scan major stories quickly. Instead of organizing articles by publisher, it groups them by what they are about: local news, tech, global news, finance, politics, gossip, and top stories.

The goal is simple: make the news easier to browse when important stories are spread across many different sources.

---

## What OneStopNews Does

OneStopNews collects public news article information, sorts articles into clear categories, and presents them in a clean reading interface.

For each article, readers can see:

- the article title
- the source
- the category and subcategory
- the published time
- a short summary when requested
- a link to the original article

OneStopNews is designed for quick scanning first. Readers can browse by topic, search across stories, open subcategories, and jump to the original publisher when they want the full article.

---

## Main Categories

| Category | Includes |
|---|---|
| **Top Stories** | Major headlines and widely relevant stories |
| **Local News** | Singapore headlines, transport, housing, and local business |
| **Tech News** | Apple news, AI, startups, cybersecurity, and other tech |
| **Global News** | China news, US news, Asia-Pacific, Europe, and other world news |
| **Finance News** | Markets, earnings, personal finance, crypto, and commodities |
| **Politics News** | Singapore politics, US politics, China politics, and geopolitics |
| **Gossip News** | Singapore gossip, Korea gossip, global gossip, and internet culture |

---

## Key Features

| Feature | Description |
|---|---|
| **Topic-first browsing** | Articles are grouped by category instead of publisher. |
| **Dropdown subcategories** | Larger topics can be narrowed down into more specific news areas. |
| **Search and sorting** | Readers can find stories by keyword and sort the feed. |
| **Original source links** | Every article links back to the publisher. |
| **On-demand summaries** | Summaries are generated only when a reader asks for them. |
| **Mobile-friendly design** | The interface is built to work comfortably on phones and desktops. |
| **Source visibility** | Readers can still see where each story came from. |

---

## Content Approach

OneStopNews does **not** copy and republish full articles.

The app is built around article discovery, categorization, and summarization. The full article remains with the original publisher.

Each story includes a direct link to the original source so readers can continue to the publisher's website for the full article.

---

## Why It Exists

News is often organized around publishers, but readers usually think in topics.

OneStopNews is built around questions like:

- What are the biggest stories right now?
- What is happening in Singapore?
- What is happening in Apple and tech?
- What is moving markets?
- What political stories are developing?
- What gossip or internet stories are trending?

The product is meant to reduce tab-hopping and make daily news scanning feel calmer, faster, and easier to follow.

---

## Product Principles

- Organize news by topic, not by source.
- Keep the interface clean and readable.
- Always show where an article came from.
- Never hide the original publisher link.
- Do not republish full copyrighted articles.
- Summarize only selected articles.
- Treat gossip and discussion-based content carefully.
- Label summaries clearly.
- Make mobile browsing feel first-class.

---

## Status

OneStopNews is currently an MVP.

The live version already supports topic browsing, subcategories, live article listings, source links, search, sorting, and on-demand summaries.

Future improvements may include broader source coverage, stronger deduplication, better personalization, and higher-quality AI summaries.

---

## License

Private - all rights reserved.

```

# app.js
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

# index.html
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

# styles.css
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


```

