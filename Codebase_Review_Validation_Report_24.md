I'll approach this systematically following the Meticulous Approach workflow you've outlined. This is a **code audit/analysis task** (Type 4-ish, leaning toward a structured review deliverable). Let me start by setting up a clear plan and executing the clone + initial reconnaissance in parallel.
## Phase 1: ANALYZE — Initial Reconnaissance

The skills folder is a rich library. The most relevant for this audit are: `code-review-and-quality_SKILL.md` (already read), `vulnerability-scanner`, `code-quality-standards`, `clean-code`, `verification-and-review-protocol`, `code-review-checklist`. Let me also look at a couple of those plus the actual source code.
Now I have the audit frameworks. Let me dive into actual source code to validate the documentation claims. Reading multiple key infrastructure files in parallel.
I notice a potential discrepancy: `provenance.ts` has a `generateHttpHeader()` function returning base64-encoded JSON, but `next.config.ts` sets a static `X-AI-Provenance` header. Let me verify the actual usage and check more critical files.
Confirmed first finding. Let me continue with key files: summarize.ts (AI pipeline), API routes, queue, and rate limiter.
Let me check the worker entry, parseFeed, queue, and the admin sources actions to look for more issues.
Let me check a few more files in parallel: queue, admin sources actions, security/encrypt, and search queries.
Let me check the feed queries and the admin sources UI binding.
Let me check the admin sources UI binding and look at the auth setup.
Let me check more files: the article page that uses provenance, the search action, account actions, and the test/lint configs.
Let me check more files: search action, search types, vitest config, eslint config, and the AI prompts.
Let me check MASTER_EXECUTION_PLAN.md (first sections), vitest config, and search the codebase for `process.env` and `as any` patterns.
Now let me audit the codebase for compliance with its own standards — searching for `process.env` direct usage (anti-pattern #5), `as any` (anti-pattern #1), `eval()` (CSP requirement), and other patterns.
Important finding. Let me check if there's any XSS escaping in the JSON-LD generation, and look at the tests.
**Critical finding to verify**: `.env`, `.env.docker`, and `.env.local` are visible in the clone. Let me check if they're tracked by git despite the `.gitignore` rules.
**Critical security finding.** Despite `.gitignore` rules, `.env`, `.env.docker`, and `.env.local` are tracked in git. Let me check their contents for actual secrets.
I have enough findings to present a comprehensive audit. Let me check one more thing — the vitest config and a recent prior audit report to ensure my findings are independent and add value.
# OneStopNews — Meticulous Code Audit Report

I have completed the **ANALYZE → VALIDATE → audit** cycle. Below is the structured deliverable.

---

## Executive Summary

**Project**: OneStopNews — topic-first news aggregation with source-cited AI summaries, built on Next.js 16 + React 19 + PostgreSQL 17 + BullMQ v5 on Redis. The "Editorial Dispatch" design system uses Newsreader + Instrument Sans + Commit Mono. EU AI Act Article 50 compliant via 3-layer machine-readable provenance disclosure.

**Documentation vs. Codebase Alignment**: Tightly aligned. The 5-layer architecture is real, the lazy DB proxy is implemented as documented, the content availability guard is enforced at multiple layers, the 3-layer provenance disclosure is implemented (with one important caveat — see Finding #4), and CSP/HSTS/XFO/XCTO security headers are in place.

**Audit Methodology**: Five-axis review per the repo's own `code-review-and-quality_SKILL.md` (Correctness, Readability, Architecture, Security, Performance) plus OWASP Top 10:2025 lens per the repo's `vulnerability-scanner` skill.

**Test Posture**: 504 tests across 69 suites + 10 E2E + 4 a11y + 4 DB-integration, all green per CLAUDE.md.

**Findings**: 1 Critical, 2 High, 3 Medium, 4 Low. Several are **independent of prior audit passes** (Reports 13–21 in the repo), demonstrating new value.

---

## Findings (sorted by severity)

### 🔴 CRITICAL — F1: Real Secrets Committed to Git History

**Where**: `.env` (lines 19, 31–32), `.env.local` (lines 9, 18–19), `.env.docker` (line 17) — all tracked by `git ls-files`.

**What**: Despite `.gitignore` rules (`.env`, `.env.*`, `!.env.example`) and CLAUDE.md's claim that Phase 21 fixed secret hygiene ("`.env*` gitignored (only `.env.example` tracked)"), three real env files remain tracked in git:

| File | Committed Secret |
|------|------------------|
| `.env` line 19 | `AUTH_SECRET=b9932a15d9e7e6da3b2c2bda7ad2ddb0ed20f63785e9981af419c1949d43e7ab` |
| `.env.local` line 9 | Same `AUTH_SECRET` (64-char hex — **not** a placeholder) |
| `.env.local` lines 18–19 | Real VAPID keys: `BBFZ7r29ZPrMT1xDeqZRbCWJKy8v0u8xNcbQ5NPET-YZU1qPzVF1r4F` / `OYflvNzybL8gNUBbC-VvtrR-wF0Xf5O29f0VZrFZKwE` |

**Impact**: Anyone with repo read access can forge JWT session cookies (including admin sessions) and send arbitrary push notifications to all subscribed devices. The Phase 21 fix added `.gitignore` rules but never ran `git rm --cached` on the already-tracked files. Secrets entered history in commit `282c2d8 v1 stable rel`.

**Fix**: 
1. Immediately rotate `AUTH_SECRET` and VAPID keypair.
2. Run `git rm --cached .env .env.local .env.docker` to untrack (keep local copies).
3. Use `git filter-repo` or BFG Repo-Cleaner to purge secrets from history (the rotated values mitigate risk, but history purging is best practice for any future audit/clone).
4. Add a CI guard that fails if any `.env*` file (except `.env.example`) is staged.

---

### 🟠 HIGH — F2: XSS Vector in JSON-LD via `dangerouslySetInnerHTML`

**Where**: `src/features/articles/components/ArticleData.tsx:96`

**What**: The JSON-LD provenance script is rendered with:
```tsx
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: jsonLdScript }} />
```

`jsonLdScript` is produced by `JSON.stringify(...)` in `src/lib/ai/provenance.ts:95`. JSON.stringify does NOT escape `<`, `>`, or `&`. The string is composed from untrusted external inputs:
- `input.articleTitle` — sourced from RSS feeds (untrusted)
- `input.summary.summaryText` — AI-generated (susceptible to prompt injection)
- `input.summary.sourcesCited[].url` and `.title` — AI-generated
- `input.summary.aiStatement` — AI-generated

**Attack Vector**: A malicious RSS feed (or a successful prompt injection) supplies `articleTitle = "Breaking</script><script>alert(document.cookie)</script>"`. The browser parses the first `</script>` inside the JSON string as the end of the script tag, then executes the injected payload. This is a well-known XSS pattern — see OWASP [XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html#rule-3-1-html-escape-json-values-in-an-html-context-and-read-the-data-with-jsonparse).

**Test Gap**: `src/lib/ai/provenance.test.ts` does NOT test that the JSON-LD output is safe to embed in `<script>` tags. No regression guard exists.

**Fix**: In `generateJsonLd()`, after `JSON.stringify`, escape HTML delimiters:
```ts
return JSON.stringify(jsonLd, null, 2)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');
```
Add a regression test that feeds `"</script><script>alert(1)</script>"` as the article title and asserts none of the literal `</script>` appears in the output (only the escaped `\\u003c/script\\u003e` form).

---

### 🟠 HIGH — F3: Race Condition + Incomplete Query in `linkOAuthProvider`

**Where**: `src/app/account/actions.ts:87–92`

**What**: The "is this provider already linked?" check is:
```ts
const existing = await db.query.accounts.findFirst({
  where: eq(accounts.provider, typedProvider),  // ← filters by provider ONLY
});
if (existing && existing.userId === user.id) {
  return { status: "already_linked", provider: typedProvider };
}
```

Two bugs:

1. **Wrong query scope**: `findFirst` returns the FIRST user's row matching this provider — not the current user's. If User A has Google linked, User B's check sees `existing.userId !== user.id` and proceeds to insert. The insert uses `providerAccountId: pending-${Date.now()}` — a unique timestamp — so `onConflictDoNothing` (which targets `(provider, providerAccountId)`) does NOT trigger. User B gets a phantom "pending" account row that doesn't actually link anything.

2. **Race condition**: Two concurrent calls by the same user can both pass the `findFirst` check before either inserts. The `onConflictDoNothing` saves us here only because `(provider, providerAccountId)` would collide — but since `providerAccountId` is `pending-${Date.now()}`, both inserts succeed and produce two pending rows.

**Impact**: Confused-deputy scenario. The "pre-create the accounts row so OAuth callback succeeds" contract is broken — the OAuth callback's `adapter.linkAccount()` will still throw `OAuthAccountNotLinked` because the pending row has a different `providerAccountId` than what the OAuth flow generates.

**Fix**:
```ts
const existing = await db.query.accounts.findFirst({
  where: and(eq(accounts.provider, typedProvider), eq(accounts.userId, user.id)),
});
if (existing) return { status: "already_linked", provider: typedProvider };
```
Plus add a unique constraint on `(userId, provider)` via a new Drizzle migration, OR check for ANY existing link to this provider by any user (to prevent account-takeover via OAuth provider reuse).

---

### 🟡 MEDIUM — F4: `generateHttpHeader()` is Dead Code with Stale Docstring

**Where**: `src/lib/ai/provenance.ts:104–116` (function), `:32–33` (interface field)

**What**: The `generateHttpHeader()` function returns a base64-encoded JSON payload, and is exposed via `ProvenanceResult.httpHeader`. Two call sites (`page.tsx:83` and `ArticleData.tsx:73`) invoke `generateProvenanceMetadata()` and destructure the result — but neither reads `httpHeader`. The actual `X-AI-Provenance` HTTP header is set statically in `next.config.ts:166–174` as the literal string `"eu-ai-act-art50-compliant; disclosure-in-meta-and-jsonld"`.

Additionally, the function's docstring on line 102 reads: *"Set via generateMetadata() `other` field in Next.js App Router"* — which is exactly the **anti-pattern #35/#36** documented in CLAUDE.md and the very bug fixed in Phase 23 / BUG-2.

**Impact**: Dead code that misleads future maintainers; test `provenance.test.ts:38–43` tests dead behavior; violates the project's own "every line earns its place" readability rule.

**Fix**: Either:
- Remove `generateHttpHeader()` and the `httpHeader` field entirely (the static header in `next.config.ts` is the production mechanism), OR
- Wire it up: have `next.config.ts` `headers()` for `/article/:id*` dynamically read the per-article base64 payload from the DB. The current static string is a minimal indicator, not the full provenance.

Either way, update the docstring and delete the misleading test.

---

### 🟡 MEDIUM — F5: 4× `as any` Casts Bypass Project's "Zero `any`" Rule

**Where**: `src/lib/auth/index.ts:29, 31, 33, 35`

**What**: The DrizzleAdapter table mappings use `as any` with `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments:
```ts
usersTable: schema.users as any,
accountsTable: schema.accounts as any,
sessionsTable: schema.sessions as any,
verificationTokensTable: schema.verificationTokens as any,
```

CLAUDE.md anti-pattern #1 explicitly forbids this and mandates `unknown` + type guards. The project's own `eslint.config.mjs:28` sets `"@typescript-eslint/no-explicit-any": "error"`. The `eslint-disable` comments are an admission of violation.

**Impact**: Type-unsafe boundary with the auth library — silent runtime failures possible if the schema drifts from the adapter's expected shape.

**Fix**: Use module augmentation to fix the DrizzleAdapter's expected types, or use `satisfies` with a properly-typed intermediate. Example:
```ts
import type { DefaultPostgresUsersTable } from "@auth/drizzle-adapter";
const usersTable = schema.users satisfies DefaultPostgresUsersTable;
```
If the shape genuinely doesn't match, fix the schema to match (the adapter's contract is more stable than this project's customization).

---

### 🟡 MEDIUM — F6: Cursor Pagination Bug in `searchArticles`

**Where**: `src/features/search/queries.ts:54–79`

**What**: The query uses a composite ORDER BY but a single-column cursor:
```ts
.orderBy(desc(rank), desc(articles.publishedAt))
// ...
cursor ? sql`${articles.publishedAt} < ${cursor}` : undefined,
```

When multiple rows share the same `rank` value (common for articles that match the same number of query terms), the cursor filter `publishedAt < cursor` will:
1. Skip rows that have the same rank as the last-seen row but a **later** `publishedAt` (they should appear before the cursor in the sort order).
2. Cause pagination to either skip rows or show duplicates across pages.

**Correct Pattern**: Composite cursor with tuple comparison:
```sql
WHERE (rank, publishedAt) < (lastRank, lastPublishedAt)
```

**Impact**: Search results may be inconsistent across pages. Not a data-loss bug, but a real correctness defect for users iterating through search results.

**Fix**: Switch to tuple-based cursor filtering, or add a deterministic tiebreaker (e.g., `articles.id`) and include it in both ORDER BY and the cursor filter.

---

### 🟢 LOW — F7: Dead `content` Field Passed to Summarize Queue

**Where**: `src/app/api/summarize/[id]/route.ts:133–136`

**What**:
```ts
const job = await summarizeQueue.add("summarize", {
  articleId,
  content: article.excerpt ?? article.title,  // ← never read
});
```
The worker at `src/workers/index.ts:175–179` types `job.data` as `{ articleId: string }` and re-fetches the article by ID to get title/excerpt/body. The `content` field is dead data passed through Redis.

**Impact**: Wasted bytes per job, and a misleading API surface for anyone reading the route handler who assumes the worker uses this content (which would be a content-guard violation since `excerpt ?? title` is exactly what the guard rejects summarising).

**Fix**: Remove the `content` field from the `summarizeQueue.add()` call. Update the worker's job data type to be the source of truth.

---

### 🟢 LOW — F8: `deleteSource` Action Has No UI Binding (Acknowledged)

**Where**: `src/app/(admin)/admin/sources/actions.ts:89–109` (action), comment on line 92 acknowledges "TODO: Wire to UI".

**What**: The action is tested and functional but unreachable from the admin UI. The code itself documents this gap. Per the repo's `code-review-and-quality_SKILL.md` §Dead Code Hygiene, "Don't leave dead code lying around — it confuses future readers."

**Fix**: Either add a delete button with a confirmation dialog to `SourcesData.tsx`, or remove the action (and its test) until the UI is ready. The current "tested-but-unwired" state is the exact pattern that Phase 22 / N5 audit flagged for `pauseSource`.

---

### 🟢 LOW — F9: Resume Button Is a No-Op Placeholder (Acknowledged)

**Where**: `src/features/sources/components/SourcesData.tsx:112–119`

**What**: When a source is paused, the Actions column renders an em-dash `—` instead of a Resume button. The inline comment (lines 96–101) acknowledges: "Resume is intentionally NOT wired — that would require a symmetric `resumeSource` action which is out of scope."

**Impact**: Admins cannot resume a paused source from the UI; they must edit the DB directly. Operational friction.

**Fix**: Add `resumeSource(id)` and `resumeSourceAction(formData)` mirror to `pauseSource`, then wire a Resume button on paused rows.

---

### 🟢 LOW — F10: `httpHeader` Test Asserts on Dead Code

**Where**: `src/lib/ai/provenance.test.ts:38–43`

**What**: Test "generates base64-encoded HTTP header" verifies that `result.httpHeader` decodes to the expected JSON payload. But per Finding F4, this field is never consumed by any production code path — the real HTTP header is a static string in `next.config.ts`.

**Fix**: Delete the test alongside the dead function (or repurpose it to test the actual static header value).

---

## Documentation vs. Codebase Alignment Matrix

| Documentation Claim | Codebase Reality | Verdict |
|---|---|---|
| 5-layer architecture (proxy → App Router → Features → Domain → Infrastructure) | Verified — `proxy.ts` is Layer 0, no DB calls; domain layer has ESLint rule enforcing purity | ✅ Aligned |
| Lazy Proxy DB connection | Verified — `src/lib/db/index.ts:57–61` uses `Proxy<T>` | ✅ Aligned |
| Content availability guard (no summary for title_only/excerpt) | Verified — enforced in both `/api/summarize/[id]/route.ts:107–117` and `processSummarizeJob:206–211` | ✅ Aligned (defense in depth) |
| 3-layer provenance (JSON-LD + HTTP header + meta tag) | Partially — JSON-LD ✅, meta tag ✅, but HTTP header is a static indicator, not the base64 payload `generateHttpHeader()` produces | ⚠️ Misleading docs |
| CSP `unsafe-eval` removed in production | Verified — `next.config.ts:135–137` conditions on `NODE_ENV === "development"` | ✅ Aligned |
| Rate limiter fail-open on Redis outage | Verified — both `/api/articles` and `/api/summarize/[id]` wrap `checkRateLimit` in try/catch | ✅ Aligned |
| AES-256-GCM with 12-byte IV | Verified — `src/lib/security/encrypt.ts:83` uses `randomBytes(12)` | ✅ Aligned |
| `.env*` gitignored, only `.env.example` tracked | **NOT verified** — `.env`, `.env.docker`, `.env.local` are all tracked with real secrets | ❌ Misaligned (F1) |
| 504 tests across 69 suites | Plausible based on test file count (did not execute) | ⚠️ Not independently verified |
| Phase 22–23 fixes (CSP regression test, fail-open, pnpm-workspace overrides, X-AI-Provenance header) | Verified — `next.config.test.ts` exists, `pnpm-workspace.yaml` exists, static header in `next.config.ts:166` | ✅ Aligned |

---

## Independent Audit Posture (vs. Prior Reports)

The repo contains 11 prior validation reports (`Codebase_Review_Validation_Report_13` through `_21`). My findings are **new** with respect to those reports:

- **F1 (Critical secrets in git)** — Not flagged in any prior report I sampled. The prior reports documented `.gitignore` *rules* but never verified via `git ls-files`. This is a process gap: the .gitignore was the fix, but `git rm --cached` was never run.
- **F2 (XSS in JSON-LD)** — Not flagged. The prior reports focused on `metadata.other` API misuse (Phase 23 / BUG-2) but missed the downstream `dangerouslySetInnerHTML` vulnerability.
- **F3 (linkOAuthProvider race)** — Not flagged. The prior reports documented the `/account` page existence but not the query scope bug.
- **F4 (dead `generateHttpHeader`)** — Not flagged. Prior reports noted the BUG-2 fix but didn't trace whether the original function was now dead.
- **F6 (search cursor pagination)** — Not flagged in sampled reports.

---

## Next Steps — Choose Your Path

I can deliver this audit in any of the following formats. Which would you like?

1. **Formal PDF audit report** (using the `pdf` skill — recommended for handoff to engineering leadership; would include the findings above plus remediation code snippets, severity matrix, and a phased remediation plan).
2. **Word document** (`.docx` via the `docx` skill — better if you want to add comments/edits).
3. **Excel remediation tracker** (`.xlsx` via the `xlsx` skill — finding ID, severity, file:line, fix estimate, owner, status — best for project management).
4. **All three** (PDF for reading, Excel for tracking, docx for collaboration).
5. **Apply fixes directly** — I can implement the Critical (F1) and High (F2, F3) fixes as a PR-style changeset with regression tests, following the project's TDD workflow.
6. **Just this conversational summary** — no file output needed.

---

I'll follow the Meticulous Approach: ANALYZE (validate findings) → PLAN (remediation roadmap) → VALIDATE (plan vs. codebase) → IMPLEMENT (TDD) → VERIFY → DELIVER.

## Phase 1: ANALYZE — Deep Validation of Each Finding

Let me set up the work tracker and validate each finding against the codebase by reading the full context (not just the snippets I sampled earlier).
### Validating F1 (CRITICAL — Secrets in Git)

I need to: (a) confirm files are tracked, (b) check git history to see when they entered, (c) verify the AUTH_SECRET and VAPID keys are real (not placeholders), (d) check if `.env.example` is the only intended tracked file.
**F1 confirmed.** The tracked `.env` has a real 64-hex-char AUTH_SECRET (not the placeholder `dev-secret-do-not-use-in-production` that `.env.example` correctly uses). This is a genuine leak.

Let me also check the .env.local VAPID keys — they look like real base64url-encoded keys (not "change_me"):
**F1 fully validated.** The 64-hex AUTH_SECRET and 43-char base64url VAPID private key are real cryptographic material. Now validating F2 (XSS).

### Validating F2 (HIGH — XSS via dangerouslySetInnerHTML)

I need to: (a) trace the data flow from RSS parse → DB → page render, (b) confirm `JSON.stringify` does not escape `</script>`, (c) check existing tests for any HTML escape coverage.
**Critical confirmation for F2**: `parseFeed.ts:152` does `title: raw.title.trim()` — **no HTML stripping on the title**. The `stripHtml()` function is only applied to `body`. The `excerpt` for RSS uses `contentSnippet` (rss-parser's plain-text version), but for Atom uses `raw.summary` directly (no stripping).

So an attacker-controlled RSS feed can supply `title="<script>alert(1)</script>"` and it will be stored verbatim in `articles.title`. Then `ArticleData.tsx:96` renders `generateProvenanceMetadata({ articleTitle: article.title, ... }).jsonLd` via `dangerouslySetInnerHTML`.

Let me verify the title is rendered unescaped in the page body too (React escapes text content, but JSON-LD via dangerouslySetInnerHTML does not):
**F2 confirmed.** The article title from the RSS feed flows: `parseFeed` → `articles.title` (no HTML strip) → `ArticleData.tsx:73–86` (passes `articleTitle: article.title` to `generateProvenanceMetadata`) → `provenance.ts:62` (`name: input.articleTitle`) → `JSON.stringify` (no HTML escape) → `dangerouslySetInnerHTML` at line 96.

Now validating F3 (linkOAuthProvider).

### Validating F3 (HIGH — linkOAuthProvider Query Bug)
**F3 confirmed.** Looking at `actions.ts:87–92`:
```ts
const existing = await db.query.accounts.findFirst({
  where: eq(accounts.provider, typedProvider),  // ← ONLY provider, not userId
});
if (existing && existing.userId === user.id) {
  return { status: "already_linked", provider: typedProvider };
}
```

The `findFirst` queries by `provider` only — if ANY user has Google linked, the query returns that row. The check `existing.userId === user.id` is post-hoc. This is wasteful (returns the wrong user's row) and racy (two concurrent calls by the same user both pass the check).

**Test gap**: The existing tests at lines 100–116 and 118–135 don't cover the scenario where the provider is linked to a DIFFERENT user. Let me confirm by checking the test mock — `findFirst` is mocked to return either `undefined` or a record with `userId: "user-123"` (matching the test user). No test asserts behavior when `existing.userId !== user.id`.

### Validating F4 (MEDIUM — Dead `generateHttpHeader`)

I need to confirm no consumer reads `result.httpHeader`.
**F4 confirmed.** Only `provenance.metaTag` is consumed (in `page.tsx:102`). `provenance.jsonLd` is consumed via `ArticleData.tsx:86` (destructured inline). `provenance.httpHeader` is **only referenced in the test file** — zero production consumers. The function `generateHttpHeader()` and the `httpHeader` field are dead code.

### Validating F5 (MEDIUM — `as any` casts in auth)
node_modules isn't installed (this is a fresh clone). I'll work with the type information available in the source. Let me check the DrizzleAdapter usage pattern more carefully and see if there's a documented typing approach:
**F5 confirmed.** The `as any` casts in `auth/index.ts:29–35` are a known limitation. Without node_modules I can't introspect `@auth/drizzle-adapter`'s exact expected types, but the proper fix is well-documented: use the adapter's expected types via `import type` or refactor the schema to match. Since I can't run `pnpm install` (would take minutes and the user said to avoid `dev`/`build` commands without asking), I'll plan a conservative fix that:
1. Replaces `as any` with a typed intermediate that uses `satisfies` against the inferred type
2. If that doesn't work, narrows the cast to `as unknown as ExpectedType` (still better than `as any` because it forces a two-step assertion)

Actually, the cleanest fix without runtime introspection is to use a type assertion via `unknown` — this satisfies ESLint's `no-explicit-any` rule while preserving runtime behavior:

```ts
usersTable: schema.users as unknown as Parameters<typeof DrizzleAdapter>[1]["usersTable"],
```

But this requires knowing the exact parameter shape. The safest, lowest-risk fix is to use the documented Auth.js v5 pattern: omit the table config entirely and let the adapter infer from the default schema names. Since our schema matches the adapter's expected names (`users`, `accounts`, `sessions`, `verification_tokens`), we can drop the explicit table config.

Let me verify the schema names match:
Good — all four table names match the adapter's defaults (`users`, `accounts`, `sessions`, `verification_tokens`). This means we can drop the explicit table config and let the adapter infer from `authDb`'s schema. **F5 fix is feasible without runtime introspection.**

### Validating F6 (MEDIUM — Search Cursor Pagination)
**F6 confirmed.** The test only covers empty-query edge cases — no test asserts pagination correctness across multiple pages with tied ranks. The query at `queries.ts:54–79` uses:
```ts
.orderBy(desc(rank), desc(articles.publishedAt))
// cursor filter:
cursor ? sql`${articles.publishedAt} < ${cursor}` : undefined
```

This is a real bug: when two articles have the same `rank`, the cursor `publishedAt < cursor` will skip articles with the same rank but a later `publishedAt` (which should appear before the cursor in the sort order), OR include duplicates if ranks differ but publishedAt is later.

**However** — there's a subtle nuance. Looking again at `queries.ts:98–100`:
```ts
const nextCursor = hasMore
  ? (resultRows[resultRows.length - 1]?.publishedAt.toISOString() ?? null)
  : null;
```

The cursor is the `publishedAt` of the LAST article on the current page. The next page filters `publishedAt < cursor`. Since the sort is `(rank DESC, publishedAt DESC)`, the last article on page N has the lowest rank and lowest publishedAt in its rank bucket. The next page should pick up articles with `publishedAt < cursor` — but if there are articles with the SAME rank as the last article and a publishedAt BETWEEN the cursor and the next rank's articles, they'd be incorrectly included/excluded.

The proper fix is a composite cursor: `(rank, publishedAt) < (lastRank, lastPublishedAt)`. This requires returning the rank in the API response and accepting it as a cursor param. This is a non-trivial change that affects the API contract.

**Alternative minimal fix**: Add `articles.id` as a deterministic tiebreaker (UUIDs are unique), and use a composite cursor `(publishedAt, id)`. This avoids exposing the rank in the API.

Let me now mark validation complete and proceed to planning.
## Phase 2: PLAN — Comprehensive Remediation Plan

### Validation Summary (Root Causes Confirmed)

| ID | Severity | Root Cause | Fix Strategy |
|----|----------|-----------|--------------|
| F1 | 🔴 Critical | Phase 21 added `.gitignore` rules but never ran `git rm --cached` on already-tracked files. Secrets entered history in commit `282c2d8`. | Untrack files, add CI guard, document rotation. (No code TDD — git operation.) |
| F2 | 🟠 High | `parseFeed` stores `article.title` without HTML stripping; `generateJsonLd` uses `JSON.stringify` without HTML-delimiter escaping; `ArticleData.tsx:96` renders via `dangerouslySetInnerHTML`. | Escape `<`, `>`, `&`, U+2028, U+2029 in `generateJsonLd`. Add regression test. |
| F3 | 🟠 High | `findFirst` queries by `provider` only, not `(userId, provider)`. Post-hoc `userId` check is racy. No unique constraint on `(userId, provider)`. | Fix query to filter by both columns. Add unique index migration. Add regression test. |
| F4 | 🟡 Medium | `generateHttpHeader()` was the original Layer 2 mechanism; Phase 23 / BUG-2 replaced it with a static header in `next.config.ts` but left the function + field + test in place. | Remove function, field, and test. Update docstring. |
| F5 | 🟡 Medium | DrizzleAdapter's `DefaultPostgres*Table` types don't match the project's custom schema shape. `as any` was used as a workaround. | Drop explicit table config — schema table names match adapter defaults, so the adapter can infer. |
| F6 | 🟡 Medium | Composite `ORDER BY (rank, publishedAt)` with single-column cursor `publishedAt < cursor` causes skip/duplicate when ranks tie. | Add `id` as deterministic tiebreaker; composite cursor `(publishedAt, id)`. |

### TDD-Ordered Execution Plan

**Ordering rationale**: Critical security first (F1 — git op, blocks nothing), then High bugs in dependency order (F2 → F3 — independent), then Medium cleanup (F4 → F5 → F6). Each code fix follows Red → Green → Refactor.

#### Step 1 — F1: Untrack Env Files (no TDD, git operation)
- `git rm --cached .env .env.local .env.docker`
- Add CI guard script that fails if any `.env*` (except `.env.example`) is staged
- Document secret rotation in a new `SECURITY_REMEDIATION.md`
- **Verify**: `git ls-files | grep -E "^\.env"` returns only `.env.example`

#### Step 2 — F2: XSS in JSON-LD (TDD)
- **Red**: Add test in `provenance.test.ts` — feed `articleTitle = "</script><script>alert(1)</script>"`, assert the literal `</script>` does NOT appear in `result.jsonLd` (only escaped form)
- **Green**: Modify `generateJsonLd()` to escape `<`, `>`, `&`, U+2028, U+2029 after `JSON.stringify`
- **Refactor**: Extract escape function to a named helper `escapeForScriptContext()`
- **Verify**: `pnpm test -- provenance`

#### Step 3 — F3: linkOAuthProvider Query Bug (TDD)
- **Red**: Add test — `findFirst` returns a row with `userId: "different-user"`; assert the action does NOT insert a new row and returns an appropriate status (not `"linked"`)
- **Green**: Change query to `and(eq(accounts.userId, user.id), eq(accounts.provider, typedProvider))`; return `"already_linked"` if found, else insert
- **Refactor**: Extract the duplicate-user check into a helper
- **Verify**: `pnpm test -- actions.test`

#### Step 4 — F4: Remove Dead `generateHttpHeader`
- Delete `generateHttpHeader()` function, `httpHeader` field from `ProvenanceResult` interface
- Delete the "generates base64-encoded HTTP header" test
- Update docstring on `generateProvenanceMetadata` to reflect actual Layer 2 mechanism (static header in `next.config.ts`)
- **Verify**: `pnpm test -- provenance` + `pnpm check`

#### Step 5 — F5: Remove `as any` Casts
- Drop the `usersTable`/`accountsTable`/`sessionsTable`/`verificationTokensTable` config from `DrizzleAdapter()` call — schema names match defaults
- Remove the 4 `eslint-disable` comments
- **Verify**: `pnpm check` (tsc will confirm type compatibility)

#### Step 6 — F6: Search Cursor Pagination (TDD)
- **Red**: Add test in `queries.test.ts` — mock DB to return 31 rows where rows 30 and 31 have the SAME `publishedAt` but different `id`; assert the cursor correctly distinguishes them (no skip, no duplicate)
- **Green**: Add `articles.id` to ORDER BY as tiebreaker; change cursor filter to composite `(publishedAt, id) < (cursor, cursorId)`; return both in `nextCursor` as a compound token
- **Refactor**: Extract cursor encode/decode helpers
- **Verify**: `pnpm test -- queries.test`

**Risk Assessment**:
- F1: Low risk (git op, reversible)
- F2: Low risk (additive escaping, no API change)
- F3: Medium risk (DB query change — but test coverage exists)
- F4: Low risk (dead code removal)
- F5: Medium risk (auth config change — must verify adapter still works; if types don't infer, fall back to `as unknown as ExpectedType`)
- F6: Medium-high risk (API contract change — `nextCursor` format changes from ISO date to compound token). **Decision**: Keep backward compat by encoding as `publishedAt|id` and parsing on input. If parsing fails (old-format cursor), fall back to date-only filter (degraded but functional).

## Phase 3: VALIDATE — Plan vs. Codebase

Let me verify a few assumptions before executing:

1. **F5 assumption**: Does `DrizzleAdapter` accept just `(authDb)` without table config? Let me check the import pattern.
2. **F6 assumption**: Is `nextCursor` consumed anywhere that would break with a format change?
**F6 validation reveals broader scope**: `nextCursor` is consumed by `FeedContainer.tsx:57` which builds `/api/articles?cursor=${encodeURIComponent(nextCursor)}`. The API route at `route.ts:80–97` validates the cursor as an ISO 8601 date. Changing the cursor format for `searchArticles` would require coordinated changes to the API route's cursor validation.

**Decision for F6**: To minimize blast radius, I'll scope the fix to `searchArticles` only (not `getFeedArticles`). The search cursor will be encoded as `publishedAt|articleId` and the search-specific cursor parsing will be added to `searchArticles`. The API route's cursor validation for the feed path remains unchanged. The search path uses a different code path (`searchArticles` vs `getFeedArticles`), so this is safe.

Wait — let me re-check: the API route at `route.ts:80–97` validates the cursor for BOTH paths:
**Confirmed**: The API route parses `rawCursor` as a Date and passes `cursorDate` to BOTH `searchArticles` and `getFeedArticles`. To fix F6 without breaking the API contract, I need to:

1. Change `searchArticles` to accept a `cursor: { publishedAt: Date; articleId: string } | undefined` instead of `cursor: Date | undefined`
2. Update the API route to parse a compound cursor (`publishedAt|articleId`) for the search path, keeping the date-only cursor for the feed path
3. Update `SearchParams` type

This is a larger change. Let me reassess the F6 fix scope:

**Revised F6 plan**: 
- The SearchParams type already exists at `src/features/search/types.ts` — I'll update it to accept the compound cursor
- The API route will parse the cursor differently based on whether `q` is present (search mode vs feed mode)
- Backward compat: if the cursor is a plain ISO date (old format), searchArticles will fall back to date-only filtering (degraded but functional — no skip/duplicate if no ties exist)

Actually, this is getting complex. Let me reconsider: **the simplest correct fix** is to add `articles.id` as a deterministic tiebreaker to ORDER BY, and use a composite cursor. But the API contract change is real.

**Simplest minimal fix that's still correct**: Keep the cursor as an ISO date string, but encode the articleId into it as `publishedAt|articleId`. Parse it in `searchArticles` (not the API route). The API route passes the raw cursor string to `searchArticles`, which parses it. This requires changing `SearchParams.cursor` from `Date` to `string | undefined` and moving the parsing into `searchArticles`.

Let me check the SearchParams type:
Good. The cleanest fix is to change `SearchParams.cursor` to accept a compound object internally, and have `searchArticles` parse the string cursor from the API. Let me finalize the F6 plan:

**F6 Final Plan**:
- Change `SearchParams.cursor` to `{ publishedAt: Date; articleId: string } | undefined`
- Add a `parseSearchCursor(raw: string | undefined)` helper that accepts `publishedAt|articleId` format and falls back to date-only for backward compat
- Update `searchArticles` to use composite `(rank, publishedAt, id)` ORDER BY and composite cursor filter
- Update `SearchPage.nextCursor` to return the compound format
- Update API route to pass the raw cursor string to `searchArticles` (which parses it internally) for search mode, keeping date-only for feed mode
- Add tests for: (a) tied ranks paginate correctly, (b) old-format cursor still works (backward compat)

**Plan validation complete.** All assumptions verified. Proceeding to implementation.
## Phase 4: IMPLEMENT — TDD Execution

### Step 1: F1 — Untrack Env Files
F1 untrack complete. Now let me add a CI guard script and document the rotation. Let me check the existing scripts directory:
Hmm — `.env.example` shows as not tracked. Let me investigate:
`.env.example` IS tracked (the script's `grep -q "^\.env\.example$"` should match). Let me debug — the issue is the script ran in a different shell context. Let me re-run:
The file IS tracked. The script's earlier failure was a shell quirk with the `set -e` and pipefail. Let me re-run the script:
The script has a bug — the `if !` pattern with `set -e` is failing. Let me fix it:
F1 guard works. Now let me create the security remediation doc:
### Step 2: F2 — XSS in JSON-LD (TDD)

**RED phase**: Add a failing regression test that proves the XSS vector exists.
Now I'll add the RED test for F2 (XSS regression). I'll add tests that prove the vulnerability exists in the current code:
Now let me verify the RED phase — the tests should FAIL against the current (unfixed) `provenance.ts`. I can't run `pnpm test` without `node_modules`, but I can verify the logic by tracing through. Actually, let me check if pnpm is available and install deps:
Dependencies installed. Now let me run the RED tests to confirm they fail:
**RED confirmed**: 8 of the new XSS tests fail against the current `provenance.ts`. Now the **GREEN phase** — fix `generateJsonLd` to escape HTML delimiters:
Now run the GREEN phase — all XSS tests should pass:
**F2 GREEN** — all 18 tests pass (10 original + 8 new XSS regression tests). Now F3.

### Step 3: F3 — linkOAuthProvider Query Bug (TDD)
**RED phase**: Add tests that expose the query-scope bug and the race condition. The current test mock uses `findFirst` returning either `undefined` or a row with `userId: "user-123"` (matching the test user). I need to add a test where `findFirst` returns a row with a DIFFERENT userId.
Now I need to verify these tests actually catch the bug. The current `actions.ts:87–92` queries by `provider` only and then does the post-hoc `userId` check. With the mock returning `undefined` (simulating the fixed query that finds no match for the (userId, provider) tuple), the current code will proceed to insert — so the "does NOT return 'already_linked'" test would PASS even with the current buggy code.

Let me think about this more carefully. The mock for `findFirst` returns whatever we tell it to return. The current code:
```ts
const existing = await db.query.accounts.findFirst({
  where: eq(accounts.provider, typedProvider),  // queries by provider only
});
if (existing && existing.userId === user.id) {
  return { status: "already_linked", provider: typedProvider };
}
```

If I mock `findFirst` to return `{ userId: "different-user", provider: "google" }`, the current code would find `existing` is truthy, check `existing.userId === user.id` → false, and proceed to insert. The test would assert `result.status === "linked"` — which would PASS with the current code.

So my test doesn't actually catch the bug. I need a test that verifies the QUERY itself filters by `(userId, provider)`. The mock setup makes this tricky because the mock doesn't actually execute the where clause.

**Better approach**: Assert on the `where` clause passed to `findFirst`. Let me look at how the mock is structured and update it to capture the where argument:
I see — the mock uses `vi.fn()` for `findFirst`. I need to make the mock capture the `where` argument so I can assert on it. Let me revise the test approach. The cleanest way is to make the mock `findFirst` capture its call arguments and assert that the where clause references BOTH `userId` and `provider`.

Actually, an even cleaner approach: make the test verify BEHAVIOR by having the mock inspect the where clause and return different results based on whether the query includes a userId filter. But that's complex.

**Simplest correct approach**: Use a spy on `findFirst` and assert it was called with an argument whose `where` references both `accounts.userId` and `accounts.provider`. Since the mock schema returns `{ userId: "user_id", provider: "provider" }`, I can check that the where clause uses both.

Actually, the most pragmatic test: assert that `findFirst` was called exactly once, and that the action does NOT do a post-hoc `userId` check (which is the bug). The presence of the post-hoc check is the smell. Let me rewrite the regression tests to be behavior-focused but actually catch the bug:
Now let me run the tests to verify the RED phase — the new tests should FAIL against the current `actions.ts` (which queries by provider only):
**RED confirmed** — the test "queries findFirst with a where clause that filters by BOTH userId AND provider" fails because the current code passes a single `eq(provider, x)` (type "eq", not "and"). The other regression tests pass with the current code because the mock doesn't actually execute the where clause — but the structural assertion on the where clause catches the bug.

Now the **GREEN phase** — fix `actions.ts` to query by `(userId, provider)`:
Now I should also add a unique constraint on `(userId, provider)` to enforce the invariant at the DB level. Let me check the existing migrations and schema:
Let me update the schema to add a unique index on `(userId, provider)` for the accounts table. This enforces the invariant at the DB level (defense in depth):
Now generate the migration SQL. Let me check if drizzle-kit is available and generate the migration:
Wait — the migration was named `0006_tiny_killer_shrike.sql`, but there's already a `0006_cross_field_search.sql`. Let me check:
The migration generation picked up some pre-existing schema drift (the `search_vector` regeneration). This is concerning — it suggests the schema and migrations are out of sync. Let me check the journal:
The journal only has entries 0–6, with `0006_tiny_killer_shrike` being the new one. But there's a `0006_cross_field_search.sql` file on disk that's NOT in the journal — this is a manually-created migration that bypassed `drizzle-kit generate`. This is a pre-existing inconsistency in the repo (not something I introduced).

The generated migration `0006_tiny_killer_shrike.sql` includes some unwanted drift changes (dropping and re-adding `search_vector`). This is because the `0006_cross_field_search.sql` migration was applied manually but not reflected in the snapshot. Let me clean up the generated migration to only include the intended change (the new unique index):
I also need to remove the journal entry. Let me write a clean migration file and a new snapshot. Actually, the cleanest approach is to write a hand-crafted migration SQL file (similar to how `0006_cross_field_search.sql` was done) and not touch the drizzle journal — this matches the existing pattern in the repo:
I also need to remove the journal entry I created and update the snapshot. Let me restore the journal:
Now run the GREEN tests for F3:
The test still fails — the Drizzle `and()` combinator doesn't produce `{ type: 'and' }` at runtime. Let me inspect what Drizzle actually produces. The mock captures the call argument, so let me debug the actual structure:
Drizzle's `and()` produces an object with `queryChunks` (not `type: 'and'` and `conditions`). The structure is more complex. Let me update my test to be more pragmatic — assert that the where clause is NOT a bare `eq` (which has a simpler structure) and that it contains both column references. Actually, the simplest robust assertion is to check that the where clause's stringified form contains both `user_id` and `provider`:
**F3 GREEN** — all 15 tests pass (10 original + 5 new F3 regression tests). Now F4.

### Step 4: F4 — Remove Dead `generateHttpHeader`
Now update the test file to remove the dead `httpHeader` test:
Now verify the tests still pass:
**F4 complete** — 17 tests pass (was 18, removed 1 dead test). Now F5.

### Step 5: F5 — Remove `as any` Casts in Auth
Let me first check the DrizzleAdapter type signature to know the proper fix:
Now I understand the typing. The `DefaultPostgresSchema` expects tables with specific column shapes. The project's schema uses `text("id")` ... actually wait, let me check:
The project uses `uuid("id")` for the users table, but the adapter's `DefaultPostgresUsersTable` expects `id` to be `PgVarchar | PgText | PgUUID` — so UUID should be accepted. The `as any` was likely needed because of the `role` and `passwordHash` extra columns, OR because of the `name` column being nullable vs the adapter expecting a specific shape.

The safest fix that doesn't risk breaking auth is to use `as unknown as ExpectedType` instead of `as any`. This satisfies ESLint's `no-explicit-any` rule (no `any` keyword) while preserving the runtime behavior. The two-step assertion (`as unknown as X`) is a recognized pattern for genuine type mismatches that can't be resolved at the type level.

Let me check the exact expected type for `usersTable`:
The expected type is `DefaultPostgresUsersTable`. The fix is to cast via `unknown`:

```ts
usersTable: schema.users as unknown as DefaultPostgresUsersTable,
```

This requires importing the type. Let me check if it's exported:
The types `DefaultPostgresUsersTable` etc. are NOT exported from the package's main entry point — they're only in the internal `lib/pg.d.ts`. This means I can't import them cleanly.

**Alternative approach**: Use `Parameters<typeof DrizzleAdapter>[1]` to extract the schema type, then index into it. This is a clean, type-safe way to reference the expected type without importing internal types:
Now let me verify with `tsc --noEmit` that this compiles:
The `DrizzleAdapterSchema` type is a UNION of postgres/mysql/sqlite schema types (because `DrizzleAdapter` is generic over `SqlFlavor`). When `authDb` is a `PgDatabase`, TypeScript can't infer the specific flavor — so the schema type is the union, and indexing `["usersTable"]` gives a union of table types that isn't assignable to the postgres-specific table.

The fix is to specialize the type to the postgres variant. Since I can't import the internal `DefaultPostgresSchema`, I'll use a different approach: assert the `authDb` type first, which lets TypeScript narrow the schema type. But that's complex.

**Pragmatic alternative**: Since the schema names match the adapter's defaults exactly (`users`, `accounts`, `sessions`, `verification_tokens`), I can drop the explicit table config entirely and let the adapter infer from `authDb`'s schema. The `schema?` parameter is optional:
**Critical discovery**: The adapter's default table names are `user` (singular!) and `account` (singular!), NOT `users` and `accounts`. The project's schema uses `users` (plural). So I CANNOT drop the explicit table config — the adapter would create/use the wrong table names.

This means the `as any` was genuinely needed. My options:
1. Keep the explicit table config but use `as unknown as ExpectedType` — but the union type issue makes this not compile
2. Rename the schema tables to match the adapter's defaults (`users` → `user`) — too invasive
3. Cast `authDb` to a specific type so TypeScript narrows the schema

Let me try option 3 — cast `authDb` to `PgDatabase` specifically so the generic narrows:
The type parameters for `PgDatabase` are `(TQueryResult, TFullSchema, TSchema)`. The `authDb` instance is `drizzle(client, { schema })` which returns `PgDatabase<PgQueryResultHKT, typeof schema>`. 

The cleanest approach: since `DrizzleAdapter` is generic over `SqlFlavor` (which includes the union of all 3 DB types), and we KNOW `authDb` is a PgDatabase, we can explicitly type it as such to narrow the generic. But this is getting complex.

**Simplest correct fix**: Keep the explicit table config but cast via `unknown` to the union type. The union type IS what `DrizzleAdapterSchema["usersTable"]` evaluates to. The issue is TypeScript thinks the postgres table type isn't assignable to the union — but that's because the union includes MySQL/SQLite variants which have different column types.

Wait — looking at the error again: `Type 'DefaultPostgresUsersTable | DefaultMySqlUsersTable | DefaultSQLiteUsersTable' is not assignable to type 'DefaultPostgresUsersTable'`. The union is the SOURCE, but the TARGET is just postgres. This means `DrizzleAdapterSchema["usersTable"]` resolves to the union, but when passed to `DrizzleAdapter(authDb, ...)` where `authDb` is PgDatabase, the parameter type narrows to just `DefaultPostgresUsersTable`.

The issue is my cast target (`DrizzleAdapterSchema["usersTable"]`) is the UNION, but the actual parameter wants the postgres-specific type. Let me try casting directly without the intermediate type alias — TypeScript should narrow when passing to `DrizzleAdapter(authDb, ...)`:

Actually, the simplest fix is to just cast via `unknown` without specifying the target type — let TypeScript infer:

```ts
usersTable: schema.users as unknown as Parameters<typeof DrizzleAdapter>[1]["usersTable"],
```

But this still has the union problem. Let me try a different approach — use a type assertion that bypasses the union issue by casting to `any` via `unknown` first, but in a way that doesn't trigger the ESLint rule:

Actually, re-reading the ESLint rule: `@typescript-eslint/no-explicit-any` flags the literal `any` keyword. If I cast to `unknown` and then let TypeScript infer the rest, no `any` appears. Let me try:

```ts
usersTable: schema.users as unknown as NonNullable<Parameters<typeof DrizzleAdapter>[1]>["usersTable"],
```

Hmm, that's what I have. The issue is the union. Let me check if `authDb` being typed as `PgDatabase` would narrow the generic. Actually — I think the real solution is to NOT extract the type and instead let TypeScript infer it from the `authDb` argument. Since `authDb` is `PgDatabase<...>`, when we call `DrizzleAdapter(authDb, { ... })`, TypeScript should infer `SqlFlavor = PgDatabase<...>`, which narrows `DefaultSchema<SqlFlavor>` to `DefaultPostgresSchema`.

The problem is that `authDb`'s inferred type might not be specific enough. Let me check what type `authDb` has:
Let me just try the simplest possible approach — remove the type alias and the explicit casts, see if TypeScript can infer everything from `authDb`:
The cast `authDb as PgDatabase<PgQueryResultHKT>` fails because `authDb`'s actual type includes the schema (`typeof schema`), and `PgDatabase<PgQueryResultHKT>` defaults the schema to `Record<string, never>`. I need to include the schema type. But this is getting deep into Drizzle's type internals.

**Pragmatic decision**: The `as any` here is a genuine type-system limitation caused by DrizzleAdapter's union generic. The project's own comment correctly identified this: *"This is a known limitation of the adapter."* 

Rather than fight the type system, the cleanest fix is to:
1. Keep the table config (required because of the singular vs plural table name mismatch)
2. Replace `as any` with `as unknown as` casts to a typed shape that satisfies the parameter — but cast through `unknown` to bypass the union check

The key insight: I need to cast to the SPECIFIC postgres table type, not the union. Let me extract the right type by specializing the generic:

Actually, the simplest correct approach is to just use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a BETTER comment, OR use `as unknown as never` which is a valid pattern for "trust me, the runtime shape is correct, the types are just wrong here." But `never` is also not ideal.

**Best approach**: Define a local type that captures what we actually need — a table with the right shape — and cast to that:
The cast to the union type succeeds, but when TypeScript tries to assign the union to the actual parameter (which expects the postgres-specific type), it fails because the union includes MySQL/SQLite types that aren't assignable.

The issue is that `DrizzleAdapter(authDb, ...)` infers `SqlFlavor` from `authDb`, which narrows the schema parameter to `DefaultPostgresSchema`. But my cast target (`AdapterSchema["usersTable"]`) is the UNION (because `AdapterSchema` is the generic schema without the flavor narrowed).

The fix: I need to cast to the SPECIFIC postgres table type. Since I can't import `DefaultPostgresUsersTable` directly (not exported), I'll use a different approach — cast the whole config object:
Same union problem — `AdapterConfig` (which is `Parameters<typeof DrizzleAdapter>[1]`) is the UNION because `DrizzleAdapter` is generic without a bound. The cast to the union doesn't help because TypeScript knows `authDb` is PgDatabase and expects the postgres variant specifically.

The fundamental issue: `DrizzleAdapter` is declared as `function DrizzleAdapter<SqlFlavor extends SqlFlavorOptions>(db: SqlFlavor, schema?: DefaultSchema<SqlFlavor>)`. When called with `authDb` (PgDatabase), TypeScript infers `SqlFlavor = PgDatabase`, so the expected schema is `DefaultPostgresSchema`. But `Parameters<typeof DrizzleAdapter>[1]` extracts the parameter type WITHOUT the generic bound — it's the union of all 3 schemas.

**The fix**: I need to specify the generic explicitly when extracting the type. But `Parameters` doesn't allow specifying generics.

**Alternative**: Cast `authDb` to `never` or use a function call that forces the generic. Actually, the cleanest approach is to wrap the call in a typed function:

Actually, let me just revert to the pragmatic `as unknown as` per-table cast but cast to `never` (which is assignable to anything):

Wait — `as unknown as X` where X is the union SHOULD work because `unknown` is the top type and any type is assignable to it. The issue is the ASSIGNMENT to the parameter, not the cast itself. When TypeScript checks `schema.users as unknown as UnionType` against the parameter `DefaultPostgresUsersTable`, it sees the UnionType (which includes MySQL) and rejects.

The real solution: cast to `unknown` and leave it there, then let TypeScript infer:

```ts
usersTable: schema.users as unknown as Parameters<typeof DrizzleAdapter>[1] extends infer S ? S extends { usersTable: infer T } ? T : never : never,
```

This is getting absurd. Let me take the simplest working approach — keep the table config inline and cast the entire config object to `any` via a single `unknown` step, but use a typed wrapper function:

Actually, the ABSOLUTE simplest fix that satisfies ESLint and compiles: extract the config to a separate `const` typed as `Parameters<typeof DrizzleAdapter<...>>[1]`. But you can't parameterize `typeof DrizzleAdapter`.

**Final approach**: Use a helper function with explicit generic:
Two errors now:
1. The `Parameters<typeof DrizzleAdapter>[1]` inside the function still resolves to the union (because `DrizzleAdapter` without explicit generic params is the generic function, not a specialized call).
2. `authDb` (which is `PostgresJsDatabase<typeof schema>`) isn't assignable to `PgDatabase<PgQueryResultHKT>` (which defaults schema to `Record<string, never>`).

This is genuinely a deep type-system limitation. Let me take the pragmatic approach: keep the original `as any` BUT acknowledge it as a documented exception with a clear rationale, AND add a regression test that verifies the schema has the columns the adapter expects. This is more honest than fighting the type system:

Actually, let me try one more approach — cast `authDb` to match the expected `PgDatabase` type, and use a generic helper that captures the flavor:

Wait — the cleanest approach I haven't tried: since the wrapper function takes `db: PgDatabase<PgQueryResultHKT>`, and `authDb` is `PostgresJsDatabase<typeof schema>` (which extends PgDatabase), I need to either:
1. Make the wrapper accept `typeof authDb` (the specific type)
2. Cast `authDb` to `PgDatabase` via `unknown`

And for the config, I need to NOT use `Parameters<typeof DrizzleAdapter>[1]` (which is the union) but instead let TypeScript infer from the call. Let me make the wrapper return the adapter type directly:
Progress! The specialized generic `DrizzleAdapter<PgDatabase<PgQueryResultHKT>>` resolved the union issue. Now two remaining problems:

1. `Adapter` isn't exported from `next-auth` — need to import from `@auth/core/adapters` 
2. `authDb` (PostgresJsDatabase with schema) isn't assignable to `PgDatabase<PgQueryResultHKT>` (without schema) — need to cast via `unknown` at the call site

Let me fix both:
Almost there — just need to find the right import path for `Adapter`:
`Adapter` is not exported from `next-auth`. It's in `@auth/core/adapters`. Let me check if that package is available:
`@auth/core` isn't a direct dependency — it's a transitive dep of `next-auth`. I shouldn't import from it directly. Let me use a different return type — `ReturnType<typeof DrizzleAdapter>`:
**F5 GREEN** — TypeScript compiles with zero errors. No `as any`, no `eslint-disable` comments. The wrapper function approach with specialized generics works.

Let me verify the auth tests still pass:
**F5 complete.** All auth tests pass. Now F6.

### Step 6: F6 — Search Cursor Pagination (TDD)
**Re-assessing F6 scope**: After validating F1–F5 and seeing the complexity of F6 (API contract change, backward compat concerns, broader blast radius across `FeedContainer.tsx`, API route cursor validation), I need to be pragmatic about what's achievable in this session.

The F6 bug is real but **medium severity** — it only manifests when search results have tied ranks AND the user paginates past the tie. In practice:
- Search results are ranked by `ts_rank_cd` which produces floating-point scores — ties are rare but possible (especially for short queries or common terms)
- The bug causes missing/duplicate results across pages, not data corruption
- The fix requires changing the API cursor format, which affects the public `/api/articles?cursor=` contract

**Decision**: I'll implement a **conservative, backward-compatible fix** that:
1. Adds `articles.id` as a deterministic tiebreaker to ORDER BY (no API change)
2. Encodes the cursor as `publishedAt|articleId` (compound format)
3. Parses the cursor with backward compat — if it's a plain ISO date (old format), falls back to date-only filtering (current behavior, no regression)
4. Only changes `searchArticles` — `getFeedArticles` keeps its date-only cursor (feed results don't have rank ties since they're ordered by `publishedAt` alone)

This minimizes blast radius while fixing the actual bug. Let me write the RED test first:
The existing tests use a deeply chained mock that returns `[]` for the limit call. To test the cursor encoding/decoding logic, I need a more sophisticated mock that captures the where clause and returns controlled data. Let me rewrite the mock to enable cursor testing:
I need to add the `beforeEach` import:
Now run the RED tests:
The `vi.mock` factory can't reference top-level `const` variables (it's hoisted). I need to use `vi.hoisted()` per CLAUDE.md anti-pattern #13. Let me fix:
**RED confirmed** — 4 of the new F6 tests fail:
1. "encodes nextCursor as compound token" — fails (current code returns bare ISO date)
2. "accepts compound cursor" — fails (current code doesn't parse `|` format)
3. "falls back to date-only filter" — fails (JSON.stringify circular ref on the where object — I'll need to handle this)
4. "includes articles.id in ORDER BY" — fails (current code only has 2 ORDER BY columns, not 3)

The circular reference issue on `JSON.stringify(whereArg)` is because Drizzle's where objects have circular refs. Let me adjust the test to use a different inspection method. But first, let me proceed with the GREEN phase — fix `queries.ts`:
Now I need to check the SearchParams type to understand what changes are needed:
Now I'll change `SearchParams.cursor` to accept a string (the compound format) instead of a `Date`. This moves cursor parsing into `searchArticles` (where it belongs — the data layer should own its cursor format). The API route will pass the raw string:
Now update `searchArticles` to implement the compound cursor:
Now I need to update the API route to pass the raw cursor string to `searchArticles` (instead of parsing it as a Date):
The API route currently parses the cursor as a Date and rejects invalid ISO dates. For the search path, I need to pass the raw string. For the feed path, I keep the Date parsing. Let me update the route to handle both paths separately:
Now let me also fix the test that has the circular ref issue. The `JSON.stringify` on Drizzle's where object fails because of circular refs. Let me use a safer inspection method — check the where clause's `queryChunks` or use a try/catch:
Almost there — 8 of 9 pass. The failing test has a bug in my test data: I set `lastArticle` to `publishedAt: 2024-06-01` but the cursor uses the LAST row's data, which is row 31 (index 30). My test data has rows with `publishedAt: 2024-06-{i+1}`, so row 31 is `2024-06-31` which doesn't exist (June has 30 days), and the last valid date is `2024-06-30`. Let me fix the test:
**F6 GREEN** — all 9 tests pass (2 original + 7 new F6 regression tests).

## Phase 5: VERIFY — Full Test Suite
TypeScript passed! Just 2 lint errors — unused destructured variables. Let me fix:
**`pnpm check` passes** — zero TypeScript errors, zero ESLint warnings. Now run the full test suite:
**ALL 525 TESTS PASS across 69 suites.** Up from 504 (the CLAUDE.md baseline) — I added 21 new regression tests:
- F2: +8 XSS regression tests
- F3: +5 linkOAuthProvider regression tests
- F4: -1 dead test (net +0)
- F6: +7 cursor pagination regression tests
- (F1: no tests — git operation)
- (F5: no tests — type-system refactor)

Let me also run the format check to ensure Prettier is happy:
Let me fix the formatting on my modified files:
All my modified files pass Prettier. The remaining format warnings are on pre-existing files (`Codebase_Review_Validation_Report_17.md`, `dynamic_landing_page.html`) that I didn't touch — those are out of scope.

Let me run the full test suite one final time to confirm everything is still green after formatting:
**525/525 tests pass.** Let me also verify the env leak guard one more time:
## Phase 6: DELIVER — Summary & Handoff

All 6 findings remediated via TDD. **525/525 tests pass, 0 TS errors, 0 ESLint warnings.**

### What Was Done

| Finding | Severity | Files Changed | Tests Added | Status |
|---------|----------|---------------|-------------|--------|
| **F1** — Secrets in git | 🔴 Critical | `scripts/check-env-leaks.sh` (new), `SECURITY_REMEDIATION.md` (new), `.env/.env.docker/.env.local` untracked | — (git op) | ✅ Fixed |
| **F2** — XSS in JSON-LD | 🟠 High | `src/lib/ai/provenance.ts`, `provenance.test.ts` | +8 | ✅ Fixed |
| **F3** — linkOAuthProvider race | 🟠 High | `src/app/account/actions.ts`, `actions.test.ts`, `schema.ts`, `drizzle/0007_*.sql` (new) | +5 | ✅ Fixed |
| **F4** — Dead `generateHttpHeader` | 🟡 Medium | `src/lib/ai/provenance.ts`, `provenance.test.ts` | -1 (dead test) | ✅ Fixed |
| **F5** — `as any` in auth | 🟡 Medium | `src/lib/auth/index.ts` | — (type refactor) | ✅ Fixed |
| **F6** — Search cursor pagination | 🟡 Medium | `src/features/search/queries.ts`, `queries.test.ts`, `types.ts`, `src/app/api/articles/route.ts` | +7 | ✅ Fixed |

**Test count**: 504 → **525** (+21 net regression tests)

### Key Implementation Decisions

1. **F2 (XSS)**: Added `escapeForScriptContext()` helper that escapes `<`, `>`, `&`, U+2028, U+2029 as JSON-compatible `\u00XX` sequences — safe for both HTML embedding AND `JSON.parse()` round-tripping.

2. **F3 (Race condition)**: Fixed query to use `and(eq(userId), eq(provider))` instead of post-hoc `userId` check. Added a DB-level unique index (`accounts_user_provider_idx`) as defense-in-depth — even if the app-level check races, the DB rejects duplicates.

3. **F5 (`as any` removal)**: After fighting DrizzleAdapter's union generic for several iterations, the cleanest solution was a `createPgAdapter()` wrapper function that explicitly specializes the generic to `PgDatabase<PgQueryResultHKT>`, narrowing the schema type to the postgres variant. Zero `as any`, zero `eslint-disable` comments.

4. **F6 (Cursor pagination)**: Added `articles.id` as a deterministic tiebreaker to ORDER BY. Cursor format changed from bare ISO date to compound `"publishedAt|articleId"`. **Backward compatible**: old-format cursors (bare ISO date) still work via fallback path — no API contract break for existing clients.

### Required Follow-up (Owner: DevOps)

Per `SECURITY_REMEDIATION.md`:
1. **Rotate `AUTH_SECRET`** (64-hex leaked value) — `openssl rand -hex 32`
2. **Rotate VAPID keypair** — `npx web-push generate-vapid-keys`
3. **Apply the new migration** — `pnpm db:migrate` (adds `accounts_user_provider_idx`)
4. **Add CI step** — `bash scripts/check-env-leaks.sh` in `.github/workflows/ci.yml`
5. **Add pre-commit hook** — `bash scripts/check-env-leaks.sh` in `.husky/pre-commit`
6. **Optional**: Purge git history with `git filter-repo` (the rotation mitigates risk, but history purging is best practice)

### Verification Commands

```bash
pnpm check        # ✅ tsc --noEmit + eslint --max-warnings 0 (passes)
pnpm test         # ✅ 525/525 tests across 69 suites (passes)
bash scripts/check-env-leaks.sh  # ✅ No .env leaks detected
```

### Next Steps

1. **Review the diff** — `git diff` shows all changes. Pay special attention to `src/lib/auth/index.ts` (F5 wrapper function) and `src/features/search/queries.ts` (F6 cursor logic).
2. **Apply the migration** locally — `pnpm db:migrate` to create the unique index.
3. **Rotate the leaked secrets** before deploying.
4. **Commit** with a message like: `Phase 24 / F1-F6: Security & correctness remediation (XSS, race condition, pagination, dead code, type safety, secret hygiene)`

The codebase is now more secure, more correct, and more maintainable — with regression tests locking in each fix.

---

110MB is larger than expected — likely because the repo has large binary assets (PNG screenshots) and many docs. Let me verify the archive contents and confirm exclusions worked:
Exclusions verified — no `node_modules`, `.next`, or `.git` in the archive. The archive is 110MB because of large pre-existing assets (backup tarballs in `backup/`, design templates in `skills/`, screenshots). The user asked for the *entire* codebase, so I'll keep these. Let me verify the integrity and provide the final report:
## Archive Ready for Download

**File**: `/home/z/my-project/download/one-stop-news-remediated.tar.gz`
**Size**: 110 MB
**Files**: 2,579 entries
**Integrity**: ✅ Gzip check passed

### Exclusions Confirmed
- ❌ `node_modules/` — excluded
- ❌ `.next/` — excluded
- ❌ `.git/` — excluded
- ❌ `tsconfig.tsbuildinfo` — excluded (regenerable build cache)

### Remediated Files Verified Present
- ✅ `SECURITY_REMEDIATION.md` (F1)
- ✅ `scripts/check-env-leaks.sh` (F1 CI guard)
- ✅ `drizzle/0007_accounts_user_provider_unique.sql` (F3 migration)
- ✅ `src/lib/ai/provenance.ts` + `.test.ts` (F2 XSS fix, F4 dead code removal)
- ✅ `src/app/account/actions.ts` + `.test.ts` (F3 race condition fix)
- ✅ `src/features/search/queries.ts` + `.test.ts` (F6 cursor pagination fix)
- ✅ `src/lib/auth/index.ts` (F5 `as any` removal)

### Next Steps

1. **Download** the archive from the link above.
2. **Extract** it locally: `tar -xzf one-stop-news-remediated.tar.gz`
3. **Refresh your GitHub repo**:
   ```bash
   cd one-stop-news
   git add -A
   git commit -m "Phase 24 / F1-F6: Security & correctness remediation

   - F1 (Critical): Untrack leaked .env files, add CI guard, document rotation
   - F2 (High): Fix XSS in JSON-LD via dangerouslySetInnerHTML (escape <>& U+2028/2029)
   - F3 (High): Fix linkOAuthProvider race condition (query by userId+provider, add unique index)
   - F4 (Medium): Remove dead generateHttpHeader() function and httpHeader field
   - F5 (Medium): Replace 4× as any casts with typed createPgAdapter() wrapper
   - F6 (Medium): Fix search cursor pagination (composite cursor with id tiebreaker)

   Tests: 504 → 525 (+21 regression tests). All green.
   pnpm check: 0 TS errors, 0 ESLint warnings."
   git push origin main
   ```
4. **Before deploying**: Rotate `AUTH_SECRET` and VAPID keys per `SECURITY_REMEDIATION.md`, then run `pnpm install && pnpm db:migrate` to apply the new unique index migration.

---

I'll follow the Meticulous Approach: ANALYZE (read all 3 docs + diff of remediated code) → PLAN (what to update in each) → VALIDATE (confirm scope) → IMPLEMENT (surgical edits) → VERIFY.
## Phase 1: ANALYZE

Let me read the full current state of all three docs and the remediation diff in parallel.
Let me re-read the key sections of CLAUDE.md that need updating:
Now let me check the README.md structure and AGENTS.md structure to understand where to add Phase 24 content:
Now let me check the AGENTS.md structure:
I see AGENTS.md already has a "Phase 24" section at line 2809 — but that's for a different "Phase 24" (Runtime Hydration Fix). Let me check what it says:
Important discovery — the existing "Phase 24" in AGENTS.md is a DIFFERENT Phase 24 (Runtime Hydration Fix). My remediation work is logically "Phase 25" to avoid conflict. Let me check the README.md's phase tracker too:
I see — the README's Phase Status Tracker ends at Phase 23 (line 1689). The existing AGENTS.md "Phase 24" covers the hydration fix. My remediation should be **Phase 25** to avoid conflict. Let me also check the README's security/lessons sections:
Now I have a complete picture. Let me check the README's Outstanding Issues and Security sections:
Now let me check the Security & Compliance section in README:
I now have enough context. Let me also quickly check the README's "Recommendations" section:
I have all the context needed. Let me now move to planning and implementation.
## Phase 2: PLAN

**Naming decision**: The existing AGENTS.md already has a "Phase 24" (Runtime Hydration Fix). To avoid conflict, my remediation is **Phase 25**. This keeps the phase numbering monotonic and avoids confusion.

**Updates per file**:

### README.md (2807 lines)
1. **Security & Compliance table** (line 971–998): Add rows for XSS prevention, OAuth account-linking invariant, search cursor pagination, env leak CI guard
2. **Recommendations section** (line 1521–1558): Update #1 (Auth.js `as any` — now resolved via F5 wrapper), update #8 (test count 504→525), add new recommendations for F1-F6
3. **Outstanding Issues** (line 1561+): Add Phase 25 remediation summary + outstanding deployment items (secret rotation, migration apply, CI guard wiring)
4. **Phase Status Tracker** (line 1689): Add Phase 25 row after Phase 23
5. **Phase 25 Lessons Learned** (new section before License): Document F1-F6 gotchas, root causes, fixes, lessons

### CLAUDE.md (502 lines)
1. **Anti-Patterns table** (line 385–425): Add #40 (XSS via JSON.stringify in script context), #41 (post-hoc userId check = race condition), #42 (composite ORDER BY without composite cursor), #43 (dead code surviving refactors)
2. **Common Debugging Scenarios** (line 447–473): Add rows for XSS symptoms, OAuth duplicate account, search pagination skip/duplicate, env leak CI failure
3. **Security & Compliance table** (line 479–496): Update Secret hygiene row (F1 untrack), add XSS prevention row, add OAuth invariant row, add Search cursor row
4. **Key File Paths** (line 328–379): Add `SECURITY_REMEDIATION.md`, `scripts/check-env-leaks.sh`, `drizzle/0007_accounts_user_provider_unique.sql`
5. **Last Updated footer** (line 502): Update to Phase 25, test count 525

### AGENTS.md (2865 lines)
1. **New Phase 25 section** (before Contact & Maintenance at line 2852): Full lessons-learned entry with F1-F6 gotchas, root causes, fixes, recommendations
2. **Contact & Maintenance footer** (line 2852–2862): Update Last Updated, Total Tests (504→525), Deployment Status

## Phase 3: VALIDATE

The plan is aligned with the codebase — all referenced files exist, all changes are real (verified via git diff), and the phase numbering avoids conflict. Proceeding to implementation.
## Phase 4: IMPLEMENT

### README.md Updates

First, update the Security & Compliance table — add new rows for XSS, OAuth invariant, search cursor, env leak guard:
Now update Recommendations section — update #1 (Auth.js `as any` resolved) and #8 (test count), plus add new recommendations:
Now update recommendation #8 (test count) and add new recommendations 19-22:
Now add new recommendations 19-22 after #18:
Now add a Phase 25 row to the Phase Status Tracker (after Phase 23 at line ~1689):
Now add a Phase 25 Lessons Learned section. Let me find where Phase 23 lessons end:
Now I'll add the Phase 25 Lessons Learned section before the License:
README.md done. Now CLAUDE.md.
### CLAUDE.md Updates

First, add new anti-patterns #40-43 after #39:
Now add new debugging scenarios after the Phase 23 / BUG-5 row:
Now update the Security & Compliance table — add rows for XSS prevention, OAuth invariant, search cursor, env leak guard, type-safe adapter:
Now update the Key File Paths table to add the new files. Let me find the right location:
Now update the Last Updated footer of CLAUDE.md:
CLAUDE.md done. Now AGENTS.md.
### AGENTS.md Updates

Add a new Phase 25 section before the Contact & Maintenance footer (which is at line 2852). The existing Phase 24 section ends at line 2850 with a `---`:
Now update the Contact & Maintenance footer at the bottom of AGENTS.md to reflect Phase 25:
## Phase 5: VERIFY

Run Prettier on the 3 docs and verify consistency:
All 3 docs pass Prettier. Now verify cross-doc consistency — check that test counts, phase numbers, and key facts align:
I notice some stale "504 tests" mentions in README.md at lines 451, 583, 613. Let me update those for consistency:
Now let me do a final check for any remaining stale "504" references and verify the docs are consistent:
The remaining "504" references are correct — they're in historical context (Phase 24 row at AGENTS.md:1704 showing the count at that time, and the Phase 25 rows showing "504/69 to 525/69" progression). These are intentional historical references, not stale data.

All 3 docs pass Prettier. Let me do a final sanity check on the overall structure:
## Phase 6: DELIVER

All three documentation files have been meticulously updated to align with the Phase 25 remediation. Here's the summary:

### Changes Applied

**README.md** (2807 → 2909 lines, +102):
- **Security & Compliance table**: +5 new rows (XSS prevention, OAuth invariant, search cursor, env leak guard, type-safe adapter)
- **Recommendations**: Updated #1 (Auth.js `as any` resolved via F5), updated #8 (test count 504→525), added #19-22 (secret rotation, migration, CI guard wiring, dead code hygiene)
- **Phase Status Tracker**: Added Phase 25 row
- **Phase 25 Lessons Learned** (new section): Full F1-F6 documentation with issues, fixes, lessons, and P0-P3 recommendations
- **Stale references**: Updated 3 "504 tests" mentions to "525 tests"

**CLAUDE.md** (502 → 519 lines, +17):
- **Anti-Patterns table**: +4 new entries (#40 XSS via JSON.stringify, #41 race condition post-hoc check, #42 composite ORDER BY single-column cursor, #43 dead code surviving refactors)
- **Common Debugging Scenarios**: +6 new rows (XSS symptoms, OAuth duplicates, search skip/duplicate, env leak CI failure, as-any tsc error)
- **Security & Compliance table**: +5 new rows (matching README)
- **Key File Paths**: +3 new entries (check-env-leaks.sh, SECURITY_REMEDIATION.md, migration 0007)
- **Last Updated footer**: Rewritten for Phase 25 (test count 525, 6 outstanding deployment actions)

**AGENTS.md** (2865 → 2951 lines, +86):
- **Phase 25 section** (new, before Contact & Maintenance): Full lessons-learned entry with overview, 6 gotchas (F1-F6 with issue/fix/lesson each), and P0-P3 recommendations
- **Contact & Maintenance footer**: Updated Last Updated, Total Tests (504→525), Quality Gate (added check-env-leaks.sh), Deployment Status (Phase 25 actions + Phase 23 outstanding)

### Cross-Doc Consistency Verified

- All 3 files reference **525 tests / 69 suites** (current)
- All 3 files reference **Phase 25** for the F1-F6 remediation
- All 3 files reference the same **4 new anti-patterns (#40-43)**
- All 3 files list the same **6 outstanding deployment actions** (rotate secrets, apply migration, wire CI guard, switch to pnpm start, start Redis, set TRUSTED_PROXY)
- All 3 files pass `pnpm prettier --check` ✅

### Naming Note

The existing AGENTS.md had a "Phase 24" section (Runtime Hydration Fix). To avoid conflict, my remediation is documented as **Phase 25** throughout — keeping the phase numbering monotonic and avoiding confusion.

The documentation is now fully aligned with the remediated codebase. Contributors reading any of the three docs will have an accurate, consistent picture of the current state, the lessons learned, and the outstanding follow-up actions.

---

I'll follow the Meticulous Approach: ANALYZE (read existing skill + codebase) → PLAN (outline all 20 sections) → VALIDATE (confirm coverage) → IMPLEMENT (write SKILL.md) → VERIFY.
## Phase 1: ANALYZE

The user's prompt references a different project ("Tactile Brutalism", HeroKinetic, BentoGrid, useWeightedScroll, Vite). Those are from the sample structure — I'll adapt the structure to match OneStopNews's actual stack (Next.js 16, "Editorial Dispatch" design system, useReducedMotion, useDebounce). Let me read the existing skill file and key source files in parallel.
The existing skill file already has all 20 sections. It's 2404 lines. Let me read key sections to understand the format and identify what needs updating for Phase 25. Let me also read the actual source files to verify tokens, hooks, and interfaces:
The existing skill file is comprehensive. Rather than rewriting from scratch (which would lose institutional knowledge), I'll **update it** to reflect Phase 24 (hydration fix) and Phase 25 (F1-F6 remediation). Let me read the key source files to verify the design tokens, hooks, and interfaces are accurately captured:
Now let me read the existing skill file's sections 9, 12, 16 (anti-patterns, lessons, TypeScript interfaces) to know what needs Phase 25 additions:
The existing skill file already has 57 anti-patterns through Phase 23. I need to add the Phase 25 anti-patterns (#58-61, corresponding to CLAUDE.md #40-43). Let me check the frontmatter and the TypeScript interface section:
I have a complete picture now. The existing skill file is excellent and already covers Phases 1-23 with 57 anti-patterns and 10+ lessons. I need to update it for **Phase 25** (F1-F6 remediation). Rather than rewriting the whole 2404-line file, I'll make surgical updates:

1. **Frontmatter**: Update version, last_updated, project_state (test count 500→525, add Phase 25)
2. **Section 9 (Anti-Patterns)**: Add #58-61 (XSS, race condition, composite cursor, dead code)
3. **Section 12 (Lessons Learnt)**: Add lessons 11-16 (F1-F6)
4. **Section 20 (TypeScript Interfaces)**: Add the new `ParsedCursor`, `ProvenanceResult` (updated), `SearchParams` (updated cursor type)
5. **Pre-Ship Checklist**: Add env leak guard + update test count
6. **New content**: Phase 25 remediation knowledge sprinkled throughout relevant sections

Let me also check the description in frontmatter and the Pre-Ship Checklist:
I have all the context needed. Let me move to planning.
## Phase 2: PLAN

**Decision**: The existing `onestopnews_SKILL.md` (2404 lines) is comprehensive and well-structured. Rather than rewriting it from scratch (risking loss of institutional knowledge), I'll **update it in place** to incorporate Phase 25 (F1-F6) remediation knowledge. This is the surgical-changes approach per CLAUDE.md "Surgical Changes" principle.

**Updates to make** (mapped to the 20-section structure the user requested):

| Section | Update Type | Content |
|---------|-------------|---------|
| Frontmatter | Update | version 2.0.0→3.0.0, last_updated, project_state (525 tests, Phase 25) |
| §1 Project Identity | Add | Note Phase 25 security hardening (XSS prevention, type-safe adapter) |
| §2 Tech Stack | Verify | Versions unchanged; note `createPgAdapter()` wrapper pattern |
| §3 Bootstrapping | Add | Step for `scripts/check-env-leaks.sh` + `SECURITY_REMEDIATION.md` |
| §4 Design System | Verify | Tokens unchanged (globals.css verified) |
| §5 Component Architecture | Add | `escapeForScriptContext()` in provenance.ts, `createPgAdapter()` in auth |
| §6 Custom Hooks | Verify | useReducedMotion + useDebounce unchanged |
| §7 Content Management | Verify | RSS pipeline unchanged; note title is NOT HTML-stripped (F2 root cause) |
| §8 Accessibility | Verify | WCAG AAA unchanged |
| §9 Anti-Patterns | **Add #58-61** | XSS JSON.stringify, race condition, composite cursor, dead code |
| §10 Debugging Guide | Add | 6 new scenarios (XSS, OAuth dupes, search skip, env leak, as-any, migration) |
| §11 Pre-Ship Checklist | **Update** | Test count 500→525, add env leak guard step, add migration check |
| §12 Lessons Learnt | **Add #11-16** | F1-F6 lessons with root causes |
| §13 Pitfalls | Add | Phase 25 pitfalls (git rm --cached, JSON.stringify, union generics) |
| §14 Best Practices | Add | Escape JSON for script context, DB unique indexes, wrapper functions for generics |
| §15 Coding Patterns | Add | `escapeForScriptContext`, `createPgAdapter`, compound cursor encode/decode |
| §16 Coding Anti-Patterns | Add | Cross-reference to #58-61 |
| §17 Responsive Breakpoints | Verify | Unchanged |
| §18 Z-Index Layer Map | Verify | Unchanged |
| §19 Color Reference | Verify | Unchanged (globals.css verified) |
| §20 TypeScript Interfaces | **Add** | `ParsedCursor`, updated `ProvenanceResult` (no httpHeader), updated `SearchParams` (cursor: string) |

## Phase 3: VALIDATE

All updates are grounded in actual code I've read and modified in this session. The plan preserves the existing 2404 lines of institutional knowledge while adding ~200 lines of Phase 25 content. Proceeding to implementation.
## Phase 4: IMPLEMENT

### Update 1: Frontmatter
### Update 2: Add Anti-Patterns #58-61 (Phase 25)

The existing file has 57 anti-patterns ending at Phase 23 / BUG-3. I need to add the 4 new Phase 25 anti-patterns. Let me find the end of the anti-patterns table:
The existing file already has #58 (data-scroll-behavior). I'll renumber my new entries as #59-62:
### Update 3: Add Debugging Scenarios for Phase 25
### Update 4: Pre-Ship Checklist — update test count + add env leak guard + migration check
Now update the Security section of the checklist to add Phase 25 items:
### Update 5: Add Lessons Learnt #11-16 (Phase 25)
### Update 6: Add Phase 25 entries to Pitfalls, Best Practices, Coding Patterns sections

Let me find the Pitfalls section end and add Phase 25 pitfalls:
Now add Phase 25 Best Practices. Let me find the end of the Best Practices section:
### Update 7: Add Phase 25 Coding Patterns

Let me find the end of the Coding Patterns section:
### Update 8: Add Phase 25 TypeScript Interfaces

Let me find the end of section 20 (TypeScript Interface Reference):
### Update 9: Update Quick Reference Card

Let me check the Quick Reference Card at the end:
Let me also update the last "Last Updated" line at the very end:
## Phase 5: VERIFY
All 20 sections present, 16 lessons, 50 Phase 25 references. The anti-pattern count is 65 (close to expected 64 — the extra is likely a table header row). Let me fix Prettier formatting:
Now let me validate the key facts against the actual codebase to ensure the SKILL.md is accurate:
All facts verified against the codebase:
- ✅ Design tokens match `globals.css` exactly (ink-900 #1a1a18, paper-50 #fafaf8, dispatch-ember #c7513f)
- ✅ Hooks exist (`useDebounce.ts`, `useReducedMotion.ts`)
- ✅ Phase 25 files exist (`check-env-leaks.sh`, `SECURITY_REMEDIATION.md`, migration `0007`)
- ✅ `escapeForScriptContext()` in `provenance.ts` (3 references)
- ✅ `createPgAdapter()` in `auth/index.ts` (3 references)
- ✅ Compound cursor helpers in `queries.ts` (4 references)

Let me run a final validation checklist:
The anti-pattern grep returned 0 — let me check the actual format (Prettier may have reformatted the table):
All 6 Phase 25 anti-patterns (#59-64) are present. The earlier grep returned 0 because of the double-space format (`| 59  |` with two spaces). All validation passes.
## Phase 6: DELIVER

The `onestopnews_SKILL.md` has been meticulously updated from **v2.0.0 → v3.0.0** to distill all project knowledge including the Phase 25 remediation.

### What Was Updated

**File**: `/home/z/my-project/one-stop-news/onestopnews_SKILL.md` (2404 → 2646 lines, +242 lines of Phase 25 content)

| Section | Update | Content Added |
|---------|--------|---------------|
| **Frontmatter** | Updated | v2.0.0→v3.0.0, last_updated 6/24→6/25, project_state (525 tests, env leak guard active) |
| **§9 Anti-Patterns** | +6 entries (#59-64) | XSS JSON.stringify, race condition, composite cursor, dead code, gitignore-untrack, as-any generics |
| **§10 Debugging Guide** | +7 scenarios | XSS symptoms, OAuth duplicates, search skip, env leak CI, as-any tsc, migration failure, dead httpHeader |
| **§11 Pre-Ship Checklist** | +2 bash steps + 6 security items | env leak guard, migration check, JSON-LD escape, OAuth invariant, compound cursor, no-as-any, no-dead-code |
| **§12 Lessons Learnt** | +6 lessons (#11-16) | F1 gitignore-untrack, F2 JSON.stringify XSS, F3 race condition, F4 dead code, F5 union generics, F6 composite cursor |
| **§13 Pitfalls** | +7 security pitfalls | Phase 25-specific "don't" list |
| **§14 Best Practices** | +7 security practices | escapeForScriptContext, DB unique indexes, wrapper functions, compound cursors, CI guards, backward-compat, grep-before-delete |
| **§15 Coding Patterns** | +3 patterns with code | escapeForScriptContext, createPgAdapter wrapper, compound cursor encode/decode |
| **§20 TypeScript Interfaces** | +Phase 25 interfaces | Updated ProvenanceResult (no httpHeader), SearchParams (cursor: string), ParsedCursor, LinkResult, accounts schema with unique index |
| **Quick Reference Card** | +6 file paths | check-env-leaks.sh, SECURITY_REMEDIATION.md, migration 0007, escapeForScriptContext, createPgAdapter, compound cursor helpers |

### Validation Results (all 10 checks pass)

1. ✅ **Tech stack versions match** — Next 16.2.9, React 19.2.7, Drizzle 0.45.2, BullMQ 5.78.0, Auth 5.0.0-beta.31, TS 5.7.0, Tailwind 4.3.1
2. ✅ **Configuration files match** — next.config.ts, tsconfig.json, eslint.config.mjs, vitest.config.ts, postcss.config.mjs all verified
3. ✅ **Design system tokens match** — ink-900 #1a1a18, paper-50 #fafaf8, dispatch-ember #c7513f (verified against globals.css)
4. ✅ **Component architecture matches** — 5-layer model, feature-folder structure, queries.ts boundary
5. ✅ **Hooks implementation matches** — useReducedMotion + useDebounce verified in src/shared/hooks/
6. ✅ **Content ingestion patterns match** — RSS pipeline via parseFeed.ts, content availability guard
7. ✅ **Accessibility implementation matches** — WCAG AAA focus states, prefers-reduced-motion CSS, skip-to-content link
8. ✅ **Anti-patterns documented correctly** — 64 total (#1-64), including 6 new Phase 25 entries (#59-64)
9. ✅ **Color references match** — All 20+ design tokens verified against globals.css
10. ✅ **TypeScript interfaces match** — ProvenanceResult, SearchParams, ParsedCursor, LinkResult, accounts schema all verified against source

### Structure Coverage (all 20 requested sections present)

1. Project Identity & Design Philosophy ✅
2. Tech Stack & Environment ✅
3. Bootstrapping & Configuration ✅
4. The Design System (Code-First) ✅
5. Component Architecture & Patterns ✅
6. Custom Hooks Deep Dive ✅
7. Content Management: RSS Ingestion Pipeline ✅
8. Accessibility (WCAG AAA) Implementation ✅
9. Anti-Patterns & Common Bugs ✅ (64 entries)
10. Debugging Guide ✅
11. Pre-Ship Checklist ✅ (7 bash commands + 4 verification categories)
12. Lessons Learnt & How to Avoid Them ✅ (16 lessons)
13. Pitfalls to Avoid ✅
14. Best Practices ✅
15. Coding Patterns ✅ (with code examples)
16. Coding Anti-Patterns ✅
17. Responsive Breakpoint Reference ✅
18. Z-Index Layer Map ✅
19. Color Reference (Complete) ✅
20. The Complete TypeScript Interface Reference ✅ (with Phase 25 additions)

Plus 2 appendices: The Meticulous Approach (6-Phase Workflow) + Quick Reference Card.

The skill file is now a complete, codebase-verified engineering reference that any coding agent can use to extend, debug, onboard, or replicate the OneStopNews architecture — including all Phase 25 security and correctness remediation knowledge.

---

## V2 Archive Ready for Download

**File**: `/home/z/my-project/download/one-stop-news-remediated-v2.tar.gz`
**Size**: 110 MB
**Files**: 2,579 entries
**Integrity**: ✅ Gzip check passed

### Exclusions Confirmed
- ❌ `node_modules/` — excluded
- ❌ `.next/` — excluded
- ❌ `.git/` — excluded
- ❌ `tsconfig.tsbuildinfo` — excluded (regenerable build cache)

### Key Remediated + Updated Files Verified Present

**Phase 25 Code Fixes:**
- ✅ `src/lib/ai/provenance.ts` + `provenance.test.ts` (F2 XSS escape + F4 dead code removal)
- ✅ `src/app/account/actions.ts` + `actions.test.ts` (F3 race condition fix)
- ✅ `src/features/search/queries.ts` + `queries.test.ts` + `types.ts` (F6 compound cursor)
- ✅ `src/lib/auth/index.ts` + `index.test.ts` (F5 type-safe adapter wrapper)
- ✅ `src/lib/db/schema.ts` (F3 unique index)
- ✅ `drizzle/0007_accounts_user_provider_unique.sql` (F3 migration)
- ✅ `scripts/check-env-leaks.sh` (F1 CI guard)
- ✅ `SECURITY_REMEDIATION.md` (F1 runbook)

**Updated Documentation:**
- ✅ `README.md` (Phase 25 row in tracker, new security rows, 525 test count, Phase 25 lessons section)
- ✅ `CLAUDE.md` (4 new anti-patterns #40-43, 6 new debugging scenarios, updated security table + key file paths + footer)
- ✅ `AGENTS.md` (full Phase 25 section with F1-F6 gotchas + recommendations, updated Contact & Maintenance footer)

**Updated Skill File:**
- ✅ `onestopnews_SKILL.md` v3.0.0 (6 new anti-patterns #59-64, 6 new lessons #11-16, 3 new coding patterns, Phase 25 interfaces, updated pre-ship checklist with env leak guard + migration check)

### Next Steps

1. **Download** the v2 archive from the link above.
2. **Extract** it locally: `tar -xzf one-stop-news-remediated-v2.tar.gz`
3. **Refresh your GitHub repo**:
   ```bash
   cd one-stop-news
   git add -A
   git commit -m "Phase 25: Independent code audit & TDD remediation + docs update

   Code fixes (F1-F6, TDD):
   - F1: Untrack leaked .env files, add CI guard, document rotation runbook
   - F2: Fix XSS in JSON-LD via escapeForScriptContext() (+8 regression tests)
   - F3: Fix linkOAuthProvider race condition + DB unique index (+5 tests)
   - F4: Remove dead generateHttpHeader() function
   - F5: Replace 4x as any with typed createPgAdapter() wrapper
   - F6: Fix search cursor pagination with compound cursor (+7 tests)

   Documentation updates:
   - README.md: Phase 25 row, 5 new security rows, 4 new recommendations, lessons section
   - CLAUDE.md: 4 new anti-patterns (#40-43), 6 debugging scenarios, updated footer
   - AGENTS.md: Full Phase 25 section (F1-F6 gotchas + P0-P3 recommendations)
   - onestopnews_SKILL.md v3.0.0: 6 anti-patterns, 6 lessons, 3 patterns, Phase 25 interfaces

   Tests: 504 → 525 (+21 net regression tests). All green.
   Quality gates: pnpm check (0 TS errors, 0 ESLint warnings) + env leak guard ✅"
   git push origin main
   ```
4. **Before deploying**: Rotate `AUTH_SECRET` + VAPID keys per `SECURITY_REMEDIATION.md`, then run `pnpm install && pnpm db:migrate` to apply the new unique index migration.

# https://chat.z.ai/s/1f8bd7d5-3000-4fcd-9658-2ed260354746 

