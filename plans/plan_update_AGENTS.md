## Executive Summary

I will design a systematic **validation plan** to cross‑examine `AGENTS.md` against the three reference documents:

- `MASTER_EXECUTION_PLAN_v5.1.md` (MEP) – the authoritative engineering blueprint
- `DISTILLED-LEARNINGS.md` (DL) – Next.js 16 / React 19 / Tailwind v4 / Drizzle battle‑tested patterns
- `luxeverse-architect-skill.md` (LAS) – advanced architectural patterns (service factories, i18n split, etc.)

The goal is to **flag inconsistencies, omissions, or contradictions** and, where appropriate, propose concrete revisions to align `AGENTS.md` with the other sources. The output will be a structured validation report, not code changes (unless the user later requests a patch).

---

## Phase 1: ANALYZE – Requirement Mining & Document Understanding

### 1.1 Scoping the validation

**Primary question:** Does `AGENTS.md` faithfully reflect the project‑specific and generic technical standards documented in MEP, DL, and LAS?

**Boundaries:**
- Focus on **factual alignment** (configuration flags, code patterns, anti‑patterns, environment variables, tool versions).
- Do **not** validate subjective design opinions unless they directly contradict stated requirements.
- **Do not** validate against missing `PAD v4.5` or `PRD v4.3` – only against the three provided documents.

### 1.2 Document summaries (implicit and explicit content)

| Document | Key sections relevant to validation |
|----------|--------------------------------------|
| `AGENTS.md` | Foundational principles, implementation standards (Next.js, Drizzle, Auth, design system, worker, AI pipeline), anti‑patterns, layer model. |
| `MASTER_EXECUTION_PLAN_v5.1.md` | Phase structure, `next.config.ts` requirements (`cacheComponents`, `cacheLife` with `expire`), `proxy.ts` matcher, BullMQ split connections, `noUncheckedIndexedAccess`, CVE pinning, search FTS (`@@ websearch_to_tsquery` + `ts_rank_cd`), content availability guard, 3‑layer disclosure, importance score float, etc. |
| `DISTILLED-LEARNINGS.md` | Next.js 16 `params` duality, `cookies()` async, root layout paradox, stale `.next/types/` cache, import path hygiene, Tailwind v4 migrations (`outline-hidden`, `bg-linear-to-r`), service factory pattern, RSC data boundaries, error tracking fallback. |
| `luxeverse-architect-skill.md` | i18n v4 split (`routing.ts` / `request.ts`), `proxy.ts` vs `middleware.ts`, `next-intl` Turbopack alias, server‑side auth (Auth.js v5), `useShallow` for Zustand, `partialize` discipline, `params: Promise<>` pattern. |

### 1.3 Implicit requirements

- `AGENTS.md` claims to be the “institutional knowledge” for the OneStopNews codebase.  
  → It should **not** contain statements that directly clash with MEP v5.1 (the definitive execution plan).
- `AGENTS.md` references “PAD v4.5” and “PRD v4.3” as authoritative, but those are not provided.  
  → Any divergence between `AGENTS.md` and the three given files must be flagged – we cannot assume the missing docs override the supplied ones.

### 1.4 Potential risk areas to check

| Risk | Why |
|------|-----|
| **Outdated Next.js flags** | `AGENTS.md` still mentions `experimental.ppr` or missing `cacheComponents` placement. |
| **Conflicting auth patterns** | `AGENTS.md` shows `verifySession` with `redirect`, but DL/LAS may advocate different cookie handling. |
| **Tailwind v4 migrations** | `AGENTS.md` might still reference `outline-none` or `bg-gradient-to-r`. |
| **Worker queue config** | MEP v5.1 requires split BullMQ connections (Worker vs Producer); `AGENTS.md` may only show a unified config. |
| **i18n architecture** | `AGENTS.md` doesn’t mention i18n at all – but MEP/LAS assume `next-intl` and `proxy.ts` for locale routing. |
| **Service factory pattern** | `AGENTS.md` is silent; LAS/DL strongly recommend it. |
| **TypeScript `noUncheckedIndexedAccess`** | MEP v5.1 requires it; `AGENTS.md` does not mention. |

---

## Phase 2: PLAN – Structured Validation Roadmap

### 2.1 Validation phases (with checklists)

#### Phase A – Core configuration & Next.js 16 compliance
- [ ] Compare `next.config.ts` requirements (MEP §1.4) vs `AGENTS.md` “Critical Configuration” table.
  - `cacheComponents: true` **top‑level** – is that correctly stated?
  - `cacheLife` profiles **must** include `stale`, `revalidate`, **and `expire`** (MEP v5.1 fix). Does `AGENTS.md` show `expire`?
  - `turbopack: {}` top‑level – mentioned?
  - `experimental.viewTransition` inside `experimental` – correct placement?
  - **Absence** of `experimental.ppr` / `dynamicIO` – enforced?
- [ ] `proxy.ts` matcher – MEP §1.5 requires broad `['/((?!_next/static|_next/image|favicon.ico).*)']`. Does `AGENTS.md` use the old narrow `/admin/*` pattern?
- [ ] Async `params`/`searchParams` – `AGENTS.md` correctly states `await`? (DL §1.1)

#### Phase B – Database & Drizzle ORM
- [ ] Lazy proxy connection pattern – present?
- [ ] `max: 10` connection pool + warning about serverless – present?
- [ ] `noUncheckedIndexedAccess` – **missing** in `AGENTS.md` (MEP §2.4 requires it). Flag as omission.

#### Phase C – Design system & Tailwind v4
- [ ] Check for deprecated utilities in `AGENTS.md` (e.g., `outline-none`, `bg-gradient-to-r`, `flex-shrink-0`). Should be replaced with v4 equivalents.
- [ ] Font stack – `Newsreader`, `Instrument Sans`, `Commit Mono`. Good.
- [ ] No raw hex colors in Tailwind classes – enforced? `AGENTS.md` says “use design tokens”, but no explicit prohibition.

#### Phase D – AI pipeline & disclosure
- [ ] Content availability guard (`title_only` / `excerpt` → no summarisation) – matches MEP §5.
- [ ] 3‑layer disclosure (JSON‑LD, HTTP header, meta tag) – correctly described.
- [ ] C2PA explicitly rejected – correct.
- [ ] `calculateImportanceScore` returns **float** [0.0,1.0] – MEP v5.1 fix. Does `AGENTS.md` still say 0–100?

#### Phase E – Worker & BullMQ
- [ ] Redis config split (Worker vs Queue) – MEP §7 requires separate connection options. `AGENTS.md` currently shows “Redis config: maxRetriesPerRequest: null, noeviction policy” – **no split mentioned**.
- [ ] Concurrency values: ingest 50, summarize 5, score 20, feed‑slice 10 – present? (MEP §7)
- [ ] Job scheduler idempotency – mentioned?

#### Phase F – Authentication & authorization
- [ ] `verifySession` uses `cache()` from `react` – present.
- [ ] `redirect()` not `throw` – present.
- [ ] Auth.js v5 beta pin – present. No conflicting `getServerSession` usage (MEP/LAS warn against it).

#### Phase G – Anti‑patterns & code quality
- [ ] Zero `any` – present.
- [ ] Interface over type – present.
- [ ] Early returns – present.
- [ ] Import path hygiene (use `@/` aliases) – present (DL §1.11). Good.
- [ ] Stale `.next/` cache after route deletion – missing from `AGENTS.md` (DL §1.10). Flag.
- [ ] Service factory pattern – not mentioned (LAS §5.6, DL §5.6). Should it be added?

#### Phase H – Additional topics from DL/LAS that `AGENTS.md` lacks
- [ ] `cookies()` is async – not explicitly stated (DL §1.2).
- [ ] `useActionState` for forms – not mentioned (DL §2.2).
- [ ] `prefers-reduced-motion` hook – missing (DL §9.1).
- [ ] i18n split (`routing.ts` / `request.ts`) – completely absent. Is OneStopNews i18n‑aware? MEP does not require i18n, but LAS assumes it. **Need clarification** – likely not required.

### 2.2 Success criteria for validation

After executing the above checklists, the validation is successful if:

1. Every item in the checklists is marked **✅** (compliant) or **⚠️** (non‑compliant with a documented fix).
2. A summary report is produced listing:
   - **Critical inconsistencies** (must fix)
   - **Missing important patterns** (should add)
   - **Minor clarifications** (nice to have)
3. For each issue, a concrete suggestion is provided (e.g., “change line X from A to B”).

### 2.3 Effort estimate

- **Manual comparison** – 30–40 minutes (full‑document scan).
- **Reporting** – 15 minutes.

---

## Phase 3: VALIDATE – Request for Confirmation

Before I begin the actual line‑by‑line validation, I need your explicit approval on the following:

1. **Scope confirmation** – Validate only against MEP v5.1, DISTILLED-LEARNINGS.md, and luxeverse-architect-skill.md.  
   *(Do not infer missing PAD/PRD content.)*

2. **Handling of missing topics** – If `AGENTS.md` omits a pattern that is recommended by DL/LAS but not explicitly required by MEP (e.g., service factories, `useShallow`), should I:
   - a) Flag as a **suggestion** (non‑critical)?
   - b) Ignore unless MEP mandates it?

3. **Output format** – Do you want:
   - a) A structured markdown report with issue severity and proposed edits.
   - b) A direct diff/patch to `AGENTS.md` (after your approval)?
   - c) Both (report first, then produce patch upon request).

4. **i18n handling** – `AGENTS.md` does not mention internationalisation. MEP also does not require it for OneStopNews. Should we consider that a **non‑issue**? (I assume yes.)

---

