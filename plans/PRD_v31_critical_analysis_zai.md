# OneStopNews PRD v3.1 — Critical Analysis & Web-Validated Review

> **Document Type:** Independent Technical Review with Web-Validated Fact-Checking  
> **Subject:** OneStopNews Definitive PRD v3.1 (Unified & Production-Locked)  
> **Methodology:** Claim-by-claim validation against live web sources, architectural coherence analysis, schema completeness audit, and component-data contract verification  
> **Date:** June 10, 2026  

---

## Executive Summary

The proposed PRD v3.1 is a well-structured, architecturally coherent document that consolidates the key decisions from previous iterations. The "Editorial Dispatch" design philosophy is distinctive and production-viable. The schema, component code, and routing patterns are generally implementation-ready.

However, this review identifies **three critical factual errors**, **two significant architectural risks**, and **fourteen schema/design gaps** that collectively undermine the "production-locked" claim. The most serious issues are: (1) React `<ViewTransition>` is still **experimental** — not production-stable as the PRD implies, (2) Next.js 16 was released in **October 2025**, not March 2026, and (3) the C2PA alignment claim is **misleading** for a text-content platform. Additionally, the six schema gaps identified in the PRD's own self-review are validated and expanded upon with additional findings.

The PRD's self-review (appended to the proposed document) identifies six gaps with reasonable fixes. This independent review confirms those six gaps and adds eight more issues ranging from factual inaccuracies to missing production safeguards. With all corrections applied, the blueprint would be genuinely production-ready.

---

## Part 1: Technical Claim Validation

Every specific technical assertion in the PRD was validated against current web sources. The results are organized by severity.

### 1.1 Confirmed Claims (No Action Required)

| Claim | Status | Evidence |
|---|---|---|
| Next.js 16 exists with App Router, PPR, `proxy.ts`, Cache Components | **Confirmed** | Official blog at nextjs.org/blog/next-16; `proxy.ts` confirmed via nextjs.org/docs/messages/middleware-to-proxy |
| `proxy.ts` replaces `middleware.ts` in Next.js 16 | **Confirmed** | Official Next.js docs: "Proxy: Middleware replaced by proxy.ts to clarify network boundary" |
| React 19.2 is released and stable | **Confirmed** | React Native 0.83 includes React 19.2; Facebook post confirms release with Activity, useEffectEvent |
| Claude 4.5 Haiku released October 15, 2025 | **Confirmed** | Anthropic official announcement at anthropic.com/news/claude-haiku-4-5; CNBC coverage; GitHub Blog public preview |
| GPT-5 Mini exists as cost-efficient fallback | **Confirmed** | OpenAI official: GPT-5 released August 7, 2025; GPT-5 mini available; GPT-5.4 mini as of March 2026 |
| CSS Grid Subgrid is Baseline Widely Available | **Confirmed** | web.dev: "Baseline Newly available as of September 15, 2023"; 97% global support in 2025-2026 per frontendtools.tech |
| `pg_textsearch` BM25 extension v1.0 GA | **Confirmed** | postgresql.org announcement of v1.0; available for PG 17 and 18 per GitHub repo |
| PostgreSQL 17 as production datastore | **Confirmed** | Current stable major version; supported by pg_textsearch and Drizzle ORM |
| Node.js 24 LTS | **Confirmed** | Released May 6, 2025; LTS since October 2025; supported through April 2028 per endoflife.date |
| BullMQ v5 | **Confirmed** | Currently at v5.78.0 per npm (published June 2, 2026); changelog at docs.bullmq.io |
| Drizzle ORM with custom tsvector type and generated columns | **Confirmed** | Official Drizzle docs: customType for tsvector; `.generatedAlwaysAs()` for generated columns; FTS guide available |
| Tailwind CSS v4 with `grid-rows-subgrid` utility | **Confirmed** | Official Tailwind docs at tailwindcss.com/docs/grid-template-rows documents `grid-rows-subgrid` |
| Auth.js v5 (formerly NextAuth) | **Confirmed** | Available at authjs.dev; migration guide exists; widely used with Next.js 16 |
| `use cache` directive in Next.js 16 | **Confirmed** | Official docs at nextjs.org/docs/app/api-reference/directives/use-cache |
| Async `params: Promise<T>` routing contract | **Confirmed** | Established in Next.js 15; continues in 16; documented pattern |
| EU AI Act Article 50 transparency obligations | **Confirmed** | Official text at artificialintelligenceact.eu/article/50; August 2026 enforcement deadline |
| Vercel AI SDK `generateObject()` with Zod schema | **Confirmed** | Official docs at ai-sdk.dev; supports structured output with Zod validation |

### 1.2 CRITICAL — Factual Errors Requiring Correction

#### Error 1: Next.js 16 Release Date

**PRD Claims:** "Next.js 16.2, Stable release (March 2026)"

**Reality:** Next.js 16 was released on **October 21, 2025** (confirmed by MakerKit: "Next.js 16 shipped on October 21, 2025"; Wikipedia: "In October 2025, Vercel released Next.js 16"; Vercel community post dated October 25, 2025 about upgrading to Next.js 16). Next.js 16.2 is a subsequent point release — not the initial stable release. The 16.3 canary branch is active as of June 2026 (GitHub releases: v16.3.0-canary.46).

**Impact:** The "March 2026" date is factually incorrect. It doesn't change the technical content, but it undermines credibility of the document as a "definitive, production-locked blueprint." The correct versioning reference should be: "Next.js 16 (released October 2025), with 16.2 as the current stable point release."

**Correction:** Change the Architectural Commitment table from "Next.js 16.2" with rationale "Stable release (March 2026)" to "Next.js 16.2" with rationale "Stable point release on the 16.x line (October 2025 initial release)."

#### Error 2: React `<ViewTransition>` Stability

**PRD Claims:** "React 19.2 (stable) — Production-stable; natively includes `<ViewTransition>` and `<Activity>`" and "View Transitions: Native React 19.2 — Enabled via `viewTransition: true` in `next.config.js`. Dropped 3rd-party polyfills."

**Reality:** React View Transitions are **explicitly experimental**. The official React Labs blog at react.dev states: "React View Transitions are a new experimental feature that makes it easier to add animations to UI transitions in your app." The Next.js documentation for the `viewTransition` config at nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition states: "This feature is currently experimental and subject to change, it's not recommended for production." Multiple community sources confirm: rebeccamdeprey.com ("The React `<ViewTransition>` component is experimental and only available in React Canary. It's not stable yet."), Motion Magazine ("React is experimenting with a new animation API"), and a YouTube video titled "Reacts New ViewTransition Component Is A Little Flakey."

Furthermore, the `viewTransition: true` config must be placed under the `experimental` key in `next.config.js` — it is NOT a top-level stable configuration option. The PRD omits this critical detail, which would cause a configuration error at runtime if implemented as written.

**Impact:** This is the single most dangerous claim in the PRD. Building a "production-locked" blueprint on an experimental API that the React team explicitly warns against using in production creates real technical risk. If the ViewTransition API changes before stabilization, every component using it will need refactoring.

**Correction Options:**

- **Option A (Conservative):** Remove ViewTransition from the Phase 1 blueprint entirely. Use CSS-only transitions (which are production-stable) for hover effects and page transitions. Add ViewTransition as a Phase 2 enhancement when the API stabilizes.

- **Option B (Pragmatic):** Include ViewTransition but clearly mark it as experimental in the Architectural Commitment table. Document the configuration as `experimental: { viewTransition: true }` rather than implying it's a stable feature. Add a risk register entry specifically for ViewTransition API instability.

- **Option C (Isolation):** Use ViewTransition but wrap all usage in a thin abstraction layer (e.g., a custom `<PageTransition>` component) so that if the API changes, only the abstraction layer needs updating — not every page component.

**Recommendation:** Option B with Option C's isolation pattern. The PRD should update the Architectural Commitment table to say "Experimental — `experimental: { viewTransition: true }`" and add an entry to the Risk Register. All `<ViewTransition>` usage should be wrapped in a project-level `<PageTransition>` component.

#### Error 3: C2PA Alignment for Text Content

**PRD Claims:** "Machine-readable: `<meta name="ai-provenance">` injected via `generateMetadata()` — Automated detection, regulatory audit, C2PA alignment."

**Reality:** C2PA (Coalition for Content Provenance and Authenticity) is an open technical standard designed primarily for **media content** — images, video, and audio. The C2PA specification uses cryptographic binding (X.509 certificates, signed manifests) to establish provenance of digital media assets. There is no established C2PA standard or specification for text content provenance. The C2PA website (c2pa.org) describes verifying "media content sources" and the specification (spec.c2pa.org) focuses on asset manifests for multimedia. The truescreen.io analysis of C2PA limitations in 2026 confirms that C2PA's applicability to text remains an open question.

Furthermore, a simple `<meta name="ai-provenance">` HTML tag does not constitute C2PA compliance. C2PA requires cryptographically signed manifests embedded in or associated with the content — not just metadata tags. The PRD's implementation is more accurately described as "custom metadata for AI provenance disclosure" rather than "C2PA alignment."

The EU AI Act Article 50 itself requires "machine-readable" marking of AI-generated content, but the European Commission's draft Code of Practice specifies that providers must mark outputs with "at least two layers of machine readable active marking" including "digitally signed metadata." A plain HTML meta tag does not meet this bar.

**Impact:** Claiming "C2PA alignment" for a text-based news platform is misleading and could create a false sense of regulatory compliance. The actual machine-readable disclosure mechanism needs to be redesigned to meet EU AI Act requirements.

**Correction:** Replace "C2PA alignment" with accurate language. The machine-readable layer should implement:

1. **JSON-LD structured data** (schema.org `CreativeWork` with `isBasedOn` and `accountablePerson` properties) embedded in the page — this is machine-readable and parsable by search engines and audit tools.
2. **HTTP response headers** (e.g., `X-AI-Provenance: model=claude-4.5-haiku; generated-at=2026-06-10T12:00:00Z; sources=3; compliance=eu-ai-act-art50`) — these are visible to automated crawlers and regulatory audit tools without parsing HTML.
3. **Invisible text watermarking** (Phase 2/3) — embedding detectable markers in the AI-generated text itself, as recommended by the EU AI Act Code of Practice.

The `<meta>` tag approach in `generateMetadata()` is a reasonable first step for Phase 1, but it should NOT be described as "C2PA alignment." It should be described as "HTML metadata provenance marker" with a Phase 2 roadmap item for "cryptographic provenance signing (C2PA-for-text, pending standardisation)."

### 1.3 Significant — Architectural Risks Requiring Documentation

#### Risk 1: Auth.js v5 Beta Status

**PRD Claims:** "Auth.js v5 — HttpOnly session cookies, Next.js-native."

**Reality:** Auth.js v5 is still in **beta** (5.0.0-beta.26 as of recent npm publishes). The official authjs.dev documentation references "next-auth@5.0.0-beta and later." While one LogRocket article claims "Auth.js v5 hit stable in late 2024 as a near-complete rewrite," the official npm package and documentation still use the beta label. A Medium guide notes it is "at present in beta/RC, but stable enough for everyone."

**Impact:** For a "production-locked" blueprint, depending on a beta authentication library is a significant risk. Auth.js v5 has been in beta for an extended period, and while it is widely used in production, the beta label means the API could change without a major version bump.

**Recommendation:** Document the beta status explicitly. Add a Risk Register entry: "Auth.js v5 remains in beta (5.0.0-beta.x); API surface may change. Mitigation: pin exact version in package.json; monitor GitHub discussions for stabilization timeline." Consider evaluating alternatives like Better Auth (which shipped v1 in early 2025 per LogRocket) as a fallback option.

#### Risk 2: Missing `cacheComponents: true` Configuration

**PRD Claims:** The caching strategy table references `use cache` and "PPR + `use cache` for feed shell" without specifying the required configuration flag.

**Reality:** The `use cache` directive requires enabling `cacheComponents: true` in `next.config.js`. The official Next.js docs state: "Cache Components enables component and function-level caching using the use cache directive. To enable the cacheComponents flag, set it to true." Multiple community sources confirm this is not enabled by default — it must be explicitly configured.

**Impact:** If a developer follows the PRD's caching strategy without adding `cacheComponents: true` to the Next.js config, the `use cache` directives will be silently ignored, and no caching will occur. This would result in dramatically worse performance than the PRD's targets.

**Recommendation:** Add a configuration section to the PRD (or expand Section 9) that explicitly documents the required `next.config.js`:

```javascript
const nextConfig = {
  cacheComponents: true,
  experimental: {
    viewTransition: true,
  },
};
```

This should be in the blueprint, not left as implicit knowledge.

---

## Part 2: Schema Completeness Audit

The PRD's own self-review identifies six schema gaps. This independent review confirms all six and adds additional findings.

### 2.1 Confirmed Gaps from PRD Self-Review

| # | Gap | Severity | Verdict |
|---|---|---|---|
| 1 | Missing `subcategories` table + FK | **High** | **Confirmed.** The two-level topic model (Category → Subcategory) requires database backing. Without this, the `/topics/[category]/[sub]` route pattern is unimplementable. |
| 2 | Missing `userPreferences` table | **High** | **Confirmed.** Sections 8.2 and Phase 2 reference notification preferences and user preference centre with no backing store. |
| 3 | Missing `politicalLeaning` on articles | **Medium** | **Confirmed.** Phase 2 blind-spot detection requires this field. Adding it as nullable now is zero-cost for V1. |
| 4 | `summary.originalArticleUrl` doesn't exist on schema | **High** | **Confirmed.** The NutritionLabel component references `summary.originalArticleUrl` but this field doesn't exist on the `summaries` table. Will produce `undefined` at runtime — broken "Verify with Original Source" link. |
| 5 | `article.source.name` has implicit JOIN requirement | **Low** | **Confirmed.** Not a bug but an undocumented contract. Feed queries must JOIN with `sources` table. |
| 6 | Missing `lastFetchedAt` / `failureCount` on sources | **Medium** | **Confirmed.** Operational fields essential for backoff logic and source health monitoring. |

### 2.2 Additional Schema & Design Gaps

#### Gap 7: `subcategories` Table Missing Composite Unique Constraint

The proposed fix for Gap 1 adds a `subcategories` table but does not include a composite unique constraint on `(categoryId, slug)`. Without this, the database allows duplicate slugs within the same category (e.g., two "politics" subcategories under "World"), which would break subcategory-based routing and article queries.

**Fix:**

```typescript
export const subcategories = pgTable('subcategories', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
}, (table) => ({
  categorySlugIdx: uniqueIndex('subcategories_category_slug_idx').on(table.categoryId, table.slug),
}));
```

#### Gap 8: Missing Summary Review Workflow

The `summaryStatusEnum` includes `needs_review` and `disabled` states, but the PRD provides no workflow for how summaries transition between states. Questions left unanswered:

- Who reviews flagged summaries? (Admin role only? Dedicated reviewer role?)
- What UI does the reviewer use? (No admin summary review component specified)
- What happens to the article display when a summary is `needs_review`? (Show the article without summary? Show a "Summary under review" badge?)
- How does a summary move from `needs_review` back to `ok`? (Manual admin action? Automatic after re-generation?)

**Recommendation:** Add a Section 7.3 "Summary Review Workflow" that documents the state machine:

```
none → pending → ok → needs_review → ok / disabled
                                    ↑___________|
                                    (manual flag)
```

And add a Phase 1 admin component for reviewing flagged summaries.

#### Gap 9: Missing `contentAvailability` Determination Logic

The `contentAvailability` enum (`title_only`, `excerpt`, `partial_text`, `full_text`) is defined on the `articles` table but the ingestion pipeline (Section 8.1) does not specify how this field is determined. The AI summarization quality depends critically on content availability — you cannot generate a meaningful summary from `title_only` content.

**Recommendation:** Add a step in the ingestion pipeline that determines content availability based on what was extracted from the source:

1. After parsing, check which fields have content.
2. If only `title` exists → `title_only`
3. If `title` + `excerpt` → `excerpt`
4. If `title` + `excerpt` + partial body → `partial_text`
5. If `title` + `excerpt` + full body → `full_text`

And add a summarization guard: only enqueue `summarize` job if `contentAvailability` is at least `partial_text`. Articles with `title_only` or `excerpt` should not be summarized — the AI would be fabricating content.

#### Gap 10: No Pagination Specification for Feed

The feed components (`FeedGrid`, `Feed`) render a flat list of articles with no pagination mechanism. For a news aggregation platform with potentially thousands of articles per category, this is a critical omission. Loading all articles at once would cause:

- Excessive database queries
- Large RSC payloads
- Poor initial page load performance (contradicting the ≤1.5s LCP target)

**Recommendation:** Document the pagination strategy for feeds. Options include:

- **Cursor-based pagination** (recommended for real-time feeds): Use `publishedAt` cursor with `WHERE publishedAt < cursor ORDER BY publishedAt DESC LIMIT 30`. This is stable even as new articles are ingested.
- **Offset-based pagination**: Simpler but can skip/duplicate items when new articles are inserted between page loads.

The Feed component should accept a `cursor` prop and render a "Load More" button or infinite scroll intersection observer.

#### Gap 11: Missing Error Boundary Patterns

The PRD shows `Suspense` boundaries for loading states but no `ErrorBoundary` components. For a production app that fetches from external sources and calls AI APIs, error boundaries are essential for graceful degradation. Without them, a single failed component can crash the entire page.

**Recommendation:** Add error boundary wrappers around:

1. Feed components (if a category query fails, show error message but don't crash the page shell)
2. NutritionLabel (if summary data is malformed, degrade to "Summary unavailable" rather than a white screen)
3. Search results (if FTS query fails, show "Search temporarily unavailable")

Next.js App Router supports `error.tsx` files at the route segment level. Document these as part of the routing architecture.

#### Gap 12: `userPreferences.pushQuietStart/End` Timezone Handling

The `userPreferences` table stores `pushQuietStart` and `pushQuietEnd` as PostgreSQL `time` type (time-of-day without timezone) and `briefingTimezone` as a separate `text` field. The quiet hours comparison logic needs to:

1. Convert the stored time to the user's timezone
2. Compare against the current time in that timezone
3. Handle DST transitions (a quiet period of 22:00–07:00 changes meaning during DST shifts)

This complexity is not documented anywhere in the PRD.

**Recommendation:** Add a note in the worker job specification that quiet hours must be evaluated using the stored timezone, and that the comparison should use a library like `luxon` or `date-fns-tz` that handles DST correctly. Consider storing quiet hours as UTC offsets rather than local times to simplify the comparison logic.

#### Gap 13: Web Push Subscription Key Security

The `pushSubscriptions` table stores VAPID keys (`p256dh` and `auth`) in plain `jsonb`. These keys are sensitive — they are used to encrypt push notification payloads. While they are not as sensitive as private keys (they are endpoint-specific public keys), they should still be protected.

**Recommendation:** Add a note that push subscription keys should be encrypted at rest using application-level encryption (e.g., AES-256-GCM with a key stored in environment variables) before being stored in the database. This is particularly important if the database is shared or replicated.

#### Gap 14: `metadata.other` Provenance Key Is Not Standardized

The `generateMetadata()` implementation in the PRD uses `metadata.other['ai-provenance']` to embed machine-readable AI provenance data. However, the `other` key in Next.js Metadata API produces arbitrary `<meta>` tags that are not understood by any automated tool, search engine, or regulatory audit system.

A crawler or audit tool encountering `<meta name="ai-provenance" content="model:claude-4.5-haiku;...">` would have no way to parse this without prior knowledge of the schema. This undermines the "machine-readable" claim.

**Recommendation:** Replace the custom `ai-provenance` meta tag with structured data that automated tools can actually parse:

1. **JSON-LD** (primary): Embed a `schema.org/CreativeWork` object with `isBasedOn` (linking to cited sources), `generator` (identifying the AI model), and `dateModified` (generation timestamp). This is parsable by Google, Bing, and all major search engines.

2. **HTTP response header** (secondary): Add `X-AI-Provenance` header with the same data. Headers are accessible without parsing HTML body.

3. **Custom meta tag** (tertiary): Keep the `ai-provenance` meta tag as a fallback, but document that it is a custom, non-standardized format.

---

## Part 3: Component-Data Contract Analysis

### 3.1 ArticleCard Component

**Component references:**
- `article.source.name` — requires JOIN with `sources` table
- `article.hasSummary` — exists on `articles` table
- `article.publishedAt` — exists on `articles` table
- `article.title`, `article.excerpt`, `article.id` — exist on `articles` table

**Verdict:** The component is well-designed and correctly uses subgrid alignment. The only issue is the implicit JOIN requirement for `article.source.name`, which should be documented in the query layer. The feed query must use Drizzle's relational API or explicit `leftJoin`:

```typescript
// Required query pattern (document this)
const articles = await db
  .select({
    id: articlesTable.id,
    title: articlesTable.title,
    excerpt: articlesTable.excerpt,
    publishedAt: articlesTable.publishedAt,
    hasSummary: articlesTable.hasSummary,
    sourceName: sourcesTable.name,
  })
  .from(articlesTable)
  .leftJoin(sourcesTable, eq(articlesTable.sourceId, sourcesTable.id))
  .where(eq(articlesTable.categoryId, categoryId))
  .orderBy(desc(articlesTable.publishedAt))
  .limit(30);
```

### 3.2 NutritionLabel Component

**Component references:**
- `summary.summaryText` — exists
- `summary.model` — exists
- `summary.generatedAt` — exists
- `summary.aiStatement` — exists
- `summary.coveragePercentage` — exists
- `summary.sourcesCited` — exists
- `summary.originalArticleUrl` — **DOES NOT EXIST** (Gap 4)
- `summary.sourcesCited[i].url` / `.title` — exists per schema type definition

**Verdict:** The NutritionLabel component is well-designed for the "AI Nutrition Label" concept. The missing `originalArticleUrl` is a confirmed runtime error. The fix (adding it to the `summaries` table as a denormalised field) is the cleanest approach because it makes the summary a self-contained artefact — an important property for audit and archival purposes.

### 3.3 FeedGrid Component

**Component references:**
- `articles: Article[]` — standard prop

**Verdict:** The FeedGrid correctly implements the parent grid with `gap-x-8` and delegates vertical spacing to child cards. The `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` responsive pattern is correct. However, there is no `gap-y` on the parent, and the child uses `mb-10` for vertical spacing. This works but means the vertical spacing is uniform regardless of row position. The last row of cards will have an unnecessary `mb-10` margin that may cause layout issues with the footer. Consider adding `last:mb-0` or using `gap-y` on the parent instead.

### 3.4 Routing Pattern Analysis

The async `params: Promise<T>` pattern is correctly applied to both `article/[id]/page.tsx` and `topics/[category]/page.tsx`. The `generateMetadata` function correctly awaits params before accessing properties. The `ViewTransition` wrapping is syntactically correct (assuming the experimental feature is enabled).

**Missing route:** The PRD references `/topics/[category]/[sub]` routing pattern but provides no code example for the `[sub]` route page. This should be added:

```typescript
// src/app/topics/[category]/[sub]/page.tsx
export default async function SubcategoryPage({
  params,
}: {
  params: Promise<{ category: string; sub: string }>;
}) {
  const { category, sub } = await params;
  // Query articles by subcategory
  return (
    <ViewTransition name={`feed-${category}-${sub}`}>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed category={category} subcategory={sub} />
      </Suspense>
    </ViewTransition>
  );
}
```

---

## Part 4: Architectural Coherence Assessment

### 4.1 What the PRD Gets Right (Strong Endorsement)

**The "Editorial Dispatch" design system is production-viable.** The typographic choices (Newsreader for headlines, Instrument Sans for UI, Commit Mono for metadata) create a distinctive visual identity that genuinely differentiates from generic SaaS aesthetics. The explicit rejection of Inter, Roboto, and Space Grotesk is a meaningful design decision. The CSS Subgrid feed architecture solves a real alignment problem without JavaScript hacks.

**The AI Nutrition Label concept is best-in-class.** The dual human-readable/machine-readable approach aligns with emerging EU AI Act requirements. The inclusion of `aiStatement`, `coveragePercentage`, and explicit source citations goes beyond what most news AI products offer. This is a genuine trust-building feature, not a compliance checkbox.

**The technology selection is sound.** PostgreSQL 17 with GIN-indexed tsvector and BM25 via pg_textsearch is a robust, Elasticsearch-free FTS solution. Drizzle ORM provides TypeScript-native schema definition with excellent type inference. BullMQ on Redis is the right choice for Node.js-native job processing. The async params routing pattern is correctly applied.

**The source-cited AI disclosure model is well-designed.** The requirement that every AI summary include provenance label, inline source citations, model name, generation timestamp, confidence indicator, and "Read original" escape hatch addresses the key finding from earlier research: AI disclosure can erode trust unless paired with source citations.

### 4.2 What Needs Correction (Prioritized)

| Priority | Issue | Type | Effort |
|---|---|---|---|
| **P0** | ViewTransition is experimental, not production-stable | Factual Error | Update documentation + config |
| **P0** | Missing `cacheComponents: true` config for `use cache` | Omission | Add config section |
| **P1** | Next.js 16 release date is wrong (October 2025, not March 2026) | Factual Error | Update table |
| **P1** | C2PA alignment claim is misleading for text content | Factual Error | Rewrite description |
| **P1** | `summary.originalArticleUrl` missing from schema | Schema Gap | Add field |
| **P1** | Missing `subcategories` table | Schema Gap | Add table + constraints |
| **P1** | Missing `userPreferences` table | Schema Gap | Add table |
| **P2** | Auth.js v5 beta status not documented | Risk Omission | Add risk register entry |
| **P2** | Missing `lastFetchedAt`/`failureCount` on sources | Schema Gap | Add fields |
| **P2** | Missing pagination specification | Design Gap | Add strategy |
| **P2** | Missing `contentAvailability` determination logic | Design Gap | Add ingestion step |
| **P2** | Missing Error Boundary patterns | Design Gap | Add error.tsx specs |
| **P2** | `metadata.other` provenance key not standardized | Design Gap | Add JSON-LD + HTTP header |
| **P3** | Missing summary review workflow | Design Gap | Add state machine |
| **P3** | `subcategories` missing composite unique constraint | Schema Gap | Add constraint |
| **P3** | Quiet hours timezone handling not documented | Documentation Gap | Add note |
| **P3** | Push subscription key security not addressed | Security Gap | Add encryption note |
| **P3** | FeedGrid last-row margin issue | CSS Fix | Add `last:mb-0` |
| **P3** | Missing `/topics/[category]/[sub]` route example | Documentation Gap | Add code example |

---

## Part 5: Corrected Architectural Commitment Table

The following table incorporates all corrections identified in this review:

| Concern | Choice | Rationale / Correction |
|---|---|---|
| Web framework | **Next.js 16.2** | Stable point release on the 16.x line (initial release: October 2025). |
| UI runtime | **React 19.2** (stable) | Production-stable runtime. Note: `<Activity>` is stable; `<ViewTransition>` is experimental. |
| View Transitions | **React `<ViewTransition>` (experimental)** | Enabled via `experimental: { viewTransition: true }` in next.config.js. **Not production-stable.** Wrapped in project-level `<PageTransition>` abstraction for isolation. Risk: API may change before stabilization. |
| Styling | **Tailwind CSS v4** + CSS Subgrid | Utility-first with structural subgrid for flawless card alignment. |
| Component primitives | **Shadcn UI (Radix)** | Library-first mandate; wrapped for bespoke aesthetic. |
| Job queue | **BullMQ v5** on Redis | Definitive for Node.js job graphs, priorities, and monitoring. |
| Database | **PostgreSQL 17** | Only production datastore. |
| FTS | **GIN `tsvector` + `pg_textsearch` BM25** | Elasticsearch-free; production-validated (pg_textsearch v1.0 GA). |
| ORM | **Drizzle ORM** | TypeScript-native strict mode; customType for tsvector. |
| Auth | **Auth.js v5** (beta) | HttpOnly session cookies, Next.js-native. **Currently 5.0.0-beta.x.** Pin exact version; monitor stabilization. |
| Worker runtime | **Node.js 24 LTS** | Current LTS (October 2025 – April 2028). |
| Validation | **Zod** | Schema-first, composable. |
| Network boundary | **`proxy.ts`** | Next.js 16 standard (replaces `middleware.ts`). |
| Cache configuration | **`cacheComponents: true`** | Required in next.config.js to enable `use cache` directive. |
| AI model (primary) | **Claude 4.5 Haiku** | Released October 15, 2025; best cost/quality for news summarization. |
| AI model (fallback) | **GPT-5 Mini** | Released August 7, 2025; validated cost/quality fallback. |
| AI disclosure | **Dual Compliance** | Human-readable Nutrition Label + Machine-readable JSON-LD + HTTP headers + HTML meta tag. **Not C2PA.** |
| Typography | **Newsreader + Instrument Sans + Commit Mono** | Anti-generic, deliberate pairing. |
| Accent color | **`--dispatch-ember`** (`#c7513f`) | Coral-red avoids "warning" connotation of amber. |

---

## Part 6: Recommended Corrected Schema (All Gaps Closed)

The following schema incorporates all corrections from both the PRD's self-review and this independent review:

```typescript
import { pgTable, uuid, text, timestamp, boolean, integer, real, jsonb, 
         index, uniqueIndex, pgEnum, time, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Custom tsvector type
export const tsvector = customType<{ data: string }>({
  dataType() { return 'tsvector'; },
});

// Enums
export const userRoleEnum = pgEnum('user_role', ['reader', 'admin']);
export const feedTypeEnum = pgEnum('feed_type', ['rss', 'atom', 'json_api']);
export const contentAvailabilityEnum = pgEnum('content_availability', 
  ['title_only', 'excerpt', 'partial_text', 'full_text']);
export const summaryStatusEnum = pgEnum('summary_status', 
  ['none', 'pending', 'ok', 'needs_review', 'disabled']);

// --- Tables ---

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: userRoleEnum('role').default('reader').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
});

export const subcategories = pgTable('subcategories', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
}, (table) => ({
  categorySlugIdx: uniqueIndex('subcategories_category_slug_idx')
    .on(table.categoryId, table.slug),
}));

export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  feedUrl: text('feed_url').notNull().unique(),
  feedType: feedTypeEnum('feed_type').notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  priority: integer('priority').default(2).notNull(),
  pollIntervalMinutes: integer('poll_interval_minutes').default(15).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastFetchedAt: timestamp('last_fetched_at'),          // Gap 6: added
  failureCount: integer('failure_count').default(0).notNull(), // Gap 6: added
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const articles = pgTable('articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  subcategoryId: uuid('subcategory_id').references(() => subcategories.id), // Gap 1: added
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  canonicalUrl: text('canonical_url').notNull(),
  contentHash: text('content_hash').notNull(),
  contentAvailability: contentAvailabilityEnum('content_availability').default('excerpt').notNull(),
  importanceScore: real('importance_score').default(0.5).notNull(),
  hasSummary: boolean('has_summary').default(false).notNull(),
  summaryStatus: summaryStatusEnum('summary_status').default('none').notNull(),
  politicalLeaning: text('political_leaning'), // Gap 3: added (nullable for Phase 2)
  publishedAt: timestamp('published_at').notNull(),
  ingestedAt: timestamp('ingested_at').defaultNow().notNull(),
  searchVector: tsvector('search_vector').generatedAlwaysAs(
    sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')`
  ).notNull(),
}, (table) => ({
  canonicalUrlIdx: uniqueIndex('articles_canonical_url_idx').on(table.canonicalUrl),
  categoryPublishedIdx: index('articles_category_published_idx')
    .on(table.categoryId, table.publishedAt.desc()),
  subcategoryPublishedIdx: index('articles_subcategory_published_idx')
    .on(table.subcategoryId, table.publishedAt.desc()), // Gap 1: added index
  searchVectorIdx: index('articles_search_vector_gin_idx')
    .using('gin', table.searchVector),
}));

export const summaries = pgTable('summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id').references(() => articles.id, { onDelete: 'cascade' }).notNull().unique(),
  summaryText: text('summary_text').notNull(),
  keyPoints: jsonb('key_points').$type<string[]>().default([]).notNull(),
  sourcesCited: jsonb('sources_cited').$type<{ url: string; title: string }[]>().default([]).notNull(),
  model: text('model').notNull(),
  tokensUsed: integer('tokens_used').notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  status: summaryStatusEnum('status').default('ok').notNull(),
  flagReason: text('flag_reason'),
  aiStatement: text('ai_statement').notNull(),
  complianceStatement: text('compliance_statement').default('EU AI Act Article 50 compliant').notNull(),
  coveragePercentage: integer('coverage_percentage').notNull(),
  originalArticleUrl: text('original_article_url').notNull(), // Gap 4: added
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  keys: jsonb('keys').$type<{ p256dh: string; auth: string }>().notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  favoriteCategories: jsonb('favorite_categories').$type<string[]>().default([]).notNull(),
  mutedSources: jsonb('muted_sources').$type<string[]>().default([]).notNull(),
  pushEnabled: boolean('push_enabled').default(false).notNull(),
  pushCategories: jsonb('push_categories').$type<string[]>().default([]).notNull(),
  pushQuietStart: time('push_quiet_start'),
  pushQuietEnd: time('push_quiet_end'),
  pushMaxPerDay: integer('push_max_per_day').default(10).notNull(),
  briefingEnabled: boolean('briefing_enabled').default(false).notNull(),
  briefingTime: time('briefing_time'),
  briefingTimezone: text('briefing_timezone'),
  readingModeDefault: boolean('reading_mode_default').default(false).notNull(),
});
```

---

## Part 7: Updated Risk Register

The following additions should be merged into the existing Risk Register:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| React ViewTransition API instability | **High** (explicitly experimental) | **High** (refactor all page transitions) | Wrap in `<PageTransition>` abstraction; mark experimental in config; monitor React Labs for stabilization |
| Auth.js v5 remains in beta | **Medium** | **Medium** (API surface change) | Pin exact version in package.json; evaluate Better Auth as fallback |
| `cacheComponents` not enabled (silently ignored) | **Medium** (developer oversight) | **High** (no caching, missed perf targets) | Document in config section; add build-time validation check |
| C2PA-for-text standard not established | **High** (no spec exists) | **Medium** (compliance gap) | Use JSON-LD + HTTP headers for Phase 1; track C2PA text provenance spec development for Phase 2 |
| EU AI Act machine-readable marking insufficient | **Medium** (meta tag alone may not comply) | **High** (regulatory non-compliance) | Implement JSON-LD + HTTP headers + invisible watermarking (Phase 2); track Code of Practice finalization |
| Duplicate subcategory slugs | **Low** (developer discipline) | **Medium** (broken routing) | Composite unique constraint on `(categoryId, slug)` |
| AI summarization of title-only content | **Medium** (guard may be missed) | **High** (fabricated summaries) | Enqueue summarize job only if `contentAvailability >= 'partial_text'` |
| Feed unbounded query (no pagination) | **High** (obvious in production) | **High** (performance collapse) | Implement cursor-based pagination with 30-item limit |

---

## Part 8: Verdict and Recommendations

### Overall Assessment

| Dimension | Rating | Notes |
|---|---|---|
| Technical accuracy | ★★★★☆ | Three factual errors (ViewTransition stability, release date, C2PA) but core architecture is sound |
| Design coherence | ★★★★★ | "Editorial Dispatch" is distinctive and well-executed; CSS Subgrid is the right structural choice |
| Schema completeness | ★★★☆☆ | Six gaps from self-review confirmed + eight additional gaps identified; needs work before `drizzle-kit generate` |
| Production readiness | ★★★☆☆ | Experimental features without documentation + missing config + missing operational fields = not yet production-locked |
| Regulatory compliance | ★★★★☆ | Human-readable label is excellent; machine-readable layer needs redesign (not C2PA, add JSON-LD + headers) |
| Self-review quality | ★★★★★ | The PRD's own six-gap analysis is accurate and well-reasoned; the proposed fixes are correct |

### Critical Path to "Production-Locked"

For the PRD to genuinely earn the "Production-Locked" status, the following corrections must be applied in order:

1. **Update ViewTransition status** to "experimental" in the Architectural Commitment table. Change config to `experimental: { viewTransition: true }`. Add `<PageTransition>` abstraction. Add Risk Register entry.

2. **Add `cacheComponents: true`** to a new or expanded configuration section documenting required `next.config.js` settings.

3. **Correct Next.js 16 release date** from "March 2026" to "October 2025 initial release."

4. **Replace "C2PA alignment"** with accurate machine-readable disclosure description (JSON-LD + HTTP headers + HTML meta tag). Add Phase 2 roadmap item for cryptographic text provenance when standards mature.

5. **Close all six schema gaps** from the self-review (subcategories, userPreferences, politicalLeaning, originalArticleUrl, JOIN documentation, operational fields).

6. **Close the eight additional gaps** identified in this review (composite unique constraint, review workflow, content availability logic, pagination, error boundaries, quiet hours timezone, push key security, standardized provenance metadata).

7. **Document Auth.js v5 beta status** in the Risk Register and Architectural Commitment table.

With these corrections applied, the OneStopNews PRD v3.1 would be genuinely production-ready — a document that can be handed to an engineering team with confidence that every claim is accurate, every schema field has a purpose, and every component has the data it needs at runtime.

---

*End of Independent Critical Analysis*  
*All claims validated against live web sources as of June 10, 2026*
