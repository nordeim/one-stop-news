I'll execute this meticulously: read the current state of all 3 docs, identify every section that needs updating based on the 4 remediation batches, then make targeted edits.

## Phase 1: ANALYZE — Audit Current Doc State

Let me grep all 3 docs in parallel for sections that need updating based on the 4 batches:
The repo got wiped again between sessions. Let me check and re-clone:
Repo gone. Re-clone and restore the 4 remediation commits:
The clone is from the remote (which I haven't pushed to). My 4 local commits are gone. I need to re-apply the 4 batches. But since this task is **documentation alignment**, I have a strategic choice:

**Option A:** Re-apply all 4 code batches first, then update docs (long, redundant work)
**Option B:** Update docs to describe the intended state (the 4 batches) and note that the code changes need to be re-applied

The user's request is to "update README.md, CLAUDE.md and AGENTS.md to align with the latest code changes, issues fixed, gotchas to look out for, troubleshooting tips, lessons learnt, outstanding issues and recommendations." This implies the code changes ARE the latest state — but they're not in the cloned repo.

Let me re-apply the 4 batches quickly (I have the exact code in my conversation history) and THEN do the doc updates. This preserves the integrity of the work. Let me set up pnpm first and verify baseline:
Baseline confirmed: 279 tests / 49 suites (Phase 15 state). Now I'll re-apply all 4 batches efficiently using script-persisted file writes. Let me create a single shell script that applies all 4 batches at once:
Let me re-apply Batch 1 (AdminGuard). I'll write all files in parallel:

---

I'll start by cloning the repo and then systematically review all the documentation and validate against the codebase. Let me begin.
Now let me read all the key documentation files in parallel:
Now let me read the Validation Report and explore the src directory structure:
No `Codebase_Review_Validation_Report_3.md` found. Let me check the existing validation reports and read the key source files for the batch validations:
Now let me read more critical files and check for the AdminGuard, TRUSTED_PROXY, and other batch implementations:
Now let me read the key source files for the batch validations and check the remaining items:
Now let me install dependencies and run pnpm check and pnpm test:
Now let me run the type check and tests, and also check more files for batch validation:
Excellent! All 279 tests pass across 49 suites. Now let me dig deeper into the specific batch items:
Now let me look at a few more files to complete my analysis - particularly the admin pages and any remaining stale references:
Let me check for the remaining items - stale references and Dockerfile issues:
Let me check a few more Batch 5 items - stale references, Redis policy, and the `getCategories` references in markdown:
Now let me check a few more things to verify the architecture alignment:
Now I have all the data I need. Let me compile the comprehensive validation report:
Here's the comprehensive validation summary:

## Validation Complete — Key Findings

**Quality Gates:** ✅ 279 tests pass (49 suites), `pnpm check` clean — the core codebase is solid.

**Batch-by-Batch Reality Check:**

| Batch                       | Claimed                          | Actual                                                                                                                                              | Gap                                                |
| --------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **1 — AdminGuard**          | "Added with 5 tests"             | ⚠️ No `AdminGuard` component exists — admin protection works via `proxy.ts` + `verifyAdminSession()` DAL pattern                                    | Functionally equivalent, architecturally different |
| **2 — TRUSTED_PROXY**       | "Moved to Zod schema"            | ❌ Still reads `process.env` directly; NOT in Zod schema                                                                                            | Full gap — needs migration                         |
| **3 — Push Key Validation** | "Module-level validation"        | ⚠️ Zod validates at module load ✅ but `encrypt.ts` re-reads `process.env` independently                                                            | Split-brain pattern                                |
| **4 — Docker/deploy.sh**    | "Shebang fixed, compose updated" | ❌ Shebang still broken (`#!/bin/bash.#`), deploy.sh has `$DOCKER_REGISTRY` interpolation bug, sample compose has wrong Redis policy + exposed port | Multiple unfixed items                             |
| **5 — Doc cleanup**         | "High-impact sweep"              | ❌ Not done — 14 drift items found (6 HIGH severity)                                                                                                | Full gap                                           |

**Most Critical Fixes (7 items, ~12 min total):**

1. Fix `deploy.sh` shebang and `$DOCKER_REGISTRY` interpolation
2. Add `TRUSTED_PROXY` to Zod env schema + update `route.ts`
3. Fix `docker-compose-sample.yml` Redis policy (`allkeys-lru` → `noeviction`), port binding, and Dockerfile path

The full report with prioritized remediation plan is saved at `Codebase_Review_Validation_Report_3.md`.

---

I'll execute this meticulously per the workflow: **ANALYZE → PLAN → VALIDATE** (then await your explicit confirmation before IMPLEMENT).

## Phase 1: ANALYZE — Re-Validation + Root Cause Investigation

First, verify the repo exists and re-read every relevant source file to confirm the 5 HIGH/MEDIUM findings and identify root causes.
Repo is intact at HEAD `4371cc6`. Now let me read all the critical files in parallel to validate the 5 findings and identify root causes:
All 5 findings confirmed in source. Let me also check a few more files to validate the test patterns I'll follow + the existing test files I need to extend:
I now have all the evidence I need. Let me also quickly check the SummaryPanel test pattern (how `redirect()` is tested) and verify the baseline test count:
**Baseline confirmed**: `pnpm check` clean, `pnpm test` 279/49 in 23s. Now I have everything needed to produce the plan.

---

# OneStopNews — Comprehensive Remediation Plan

## Phase 1: ANALYZE — Validated Findings with Root Causes

I have re-validated every severity-rated finding by reading the actual source files. All 5 HIGH/MEDIUM issues are **confirmed present in the current codebase** (HEAD `4371cc6`). No CRITICAL severity issues exist (no production-down, no data-loss, no active security breach).

### Final Severity Matrix

| #     | Finding                                                          | Severity                              | Confirmed?                                                                                                                   | Root Cause                                                                                                                                                                                                                                                                                               |
| ----- | ---------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | `(admin)/layout.tsx` does not call `verifyAdminSession()`        | **HIGH** (security exposure)          | ✅ Confirmed (layout.tsx lines 5-7 comment admits the workaround; SummariesData.tsx:13 and SourcesData.tsx:54 still call it) | Next.js 16 `cacheComponents` rejects async layouts; the layout was made synchronous as a workaround, pushing the guard into per-page data components. **Latent risk:** any new admin page added without a Suspense-wrapped data component that calls `verifyAdminSession()` will be publicly accessible. |
| **2** | `TRUSTED_PROXY` not declared in Zod env schema                   | **MEDIUM** (silent misconfig)         | ✅ Confirmed (env/index.ts has no TRUSTED_PROXY field; route.ts:51 uses `process.env.TRUSTED_PROXY`)                         | When `TRUSTED_PROXY` was added in Phase 14, it was read directly via `process.env` instead of being added to the Zod schema. This violates the "all env vars declared in Zod" principle and means typos cannot be caught at boot.                                                                        |
| **3** | `PUSH_KEY_ENCRYPTION_KEY` validation is lazy, not at module load | **MEDIUM** (deferred failure)         | ✅ Confirmed (encrypt.ts:5-11 still has `getKey()`; module-load throw does NOT exist)                                        | `encrypt.ts` calls `getKey()` inside `encryptPushKeys()`/`decryptPushKeys()` rather than at module scope. Boot succeeds even if the env var is missing/invalid; first push operation 500s.                                                                                                               |
| **4** | `docker-compose.prod.yml` Redis missing `noeviction` + AOF       | **MEDIUM** (data loss under pressure) | ✅ Confirmed (redis service lines 71-80 has NO `command:` block)                                                             | The `command:` block was added to `docker-compose-dev.yml:51-57` (correctly) but never propagated to `docker-compose.prod.yml:71-80`. Default Redis policy is `noeviction` BUT without `--appendonly yes` there's no AOF persistence — jobs can be lost on Redis restart.                                |
| **5** | `scripts/deploy.sh` shebang malformed + var interpolation bug    | **MEDIUM** (broken deploy script)     | ✅ Confirmed (line 1 is `#!/bin/bash.# Deployment script...`; lines 20-21 use `"DOCKER_REGISTRY/..."` without `$`)           | Line 1 is a single line where shebang is concatenated with a comment. The interpreter path becomes `/bin/bash.#` which doesn't exist; the script won't execute via `./deploy.sh`. Lines 20-21 also have a var interpolation bug: `"DOCKER_REGISTRY/..."` should be `"${DOCKER_REGISTRY}/..."`.           |

---

## Phase 2: PLAN — Prioritized Remediation Roadmap

I propose **4 sequential batches** (deferred Batch 5 LOW cleanup per your previous instruction). Each batch is independently testable and committable. TDD applies per the SOP: **write failing test → make it pass → refactor → commit.**

### Batch 1 — HIGH Security: Centralize Admin Auth Guard in Layout

**Goal:** Make `verifyAdminSession()` run at the layout boundary (Layer 1) so any future admin page is automatically protected, while preserving `cacheComponents` compliance.

**Root cause fix:** Next.js 16 `cacheComponents` requires that any async operation in a layout be wrapped in `<Suspense>`. The current pattern of pushing auth into page data components is fragile — it relies on every page author remembering to do it. The fix is to introduce an `AdminGuard` async Server Component that calls `verifyAdminSession()`, wrap it in `<Suspense>` inside the layout, and render `children` only after the guard passes.

**Files affected:**

- `src/shared/components/auth/AdminGuard.tsx` — **NEW** — async Server Component that calls `verifyAdminSession()` then returns `children`
- `src/shared/components/auth/AdminGuardSkeleton.tsx` — **NEW** — Suspense fallback (dark sidebar skeleton)
- `src/shared/components/auth/AdminGuard.test.tsx` — **NEW** — TDD test (4 tests)
- `src/app/(admin)/layout.tsx` — MODIFY — wrap `{children}` in `<Suspense fallback={<AdminGuardSkeleton />}><AdminGuard>{children}</AdminGuard></Suspense>`
- `src/app/(admin)/layout.test.tsx` — **NEW** — TDD test (1 test asserting layout wraps children in AdminGuard)
- `src/features/summaries/components/SummariesData.tsx` — MODIFY — remove redundant `verifyAdminSession()` call (now handled by layout)
- `src/features/sources/components/SourcesData.tsx` — MODIFY — remove redundant `verifyAdminSession()` call

**TDD test plan (RED first):**

1. `AdminGuard` renders `children` when `verifyAdminSession` returns admin user
2. `AdminGuard` calls `redirect("/")` when user is non-admin (verifyAdminSession mock invokes redirect spy)
3. `AdminGuard` calls `redirect("/sign-in")` when no session (verifyAdminSession mock invokes redirect spy)
4. `AdminGuard` always invokes `verifyAdminSession` exactly once per render
5. `(admin)/layout.tsx` wraps children in `<AdminGuard>` (integration test with AdminGuard spy)

**Mocking strategy** (matches existing `push/subscribe/route.test.ts` pattern):

- `vi.mock("@/lib/auth/dal", ...)` to control `verifyAdminSession` behavior
- `vi.mock("next/navigation", () => ({ redirect: vi.fn() }))` to assert redirect calls

**Verification:** `pnpm check && pnpm test` green; expected delta: +5 tests, +2 suites (284/51 from 279/49).

**Estimated effort:** 1 commit (~30 min).

---

### Batch 2 — MEDIUM Security: Add `TRUSTED_PROXY` to Zod Env Schema

**Goal:** Make `TRUSTED_PROXY` declarable in the Zod schema so typos are caught at boot.

**Root cause fix:** Add `TRUSTED_PROXY: z.string().optional()` to `envSchema` in `src/lib/env/index.ts`. Switch `src/app/api/articles/route.ts:51` from `process.env.TRUSTED_PROXY` to `env.TRUSTED_PROXY`. This aligns with the documented "all env vars declared in Zod" principle.

**Files affected:**

- `src/lib/env/index.ts` — MODIFY — add `TRUSTED_PROXY: z.string().optional()` to schema (with documentation comment)
- `src/lib/env/index.test.ts` — **NEW** — TDD test (4 tests for TRUSTED_PROXY field)
- `src/app/api/articles/route.ts` — MODIFY — import `env`, replace `process.env.TRUSTED_PROXY` with `env.TRUSTED_PROXY`
- `src/app/api/articles/route.test.ts` — MODIFY — add `vi.mock("@/lib/env", ...)` with mutable `mockEnv` object; refactor "uses rightmost IP" test to mutate `mockEnv.TRUSTED_PROXY` instead of `vi.stubEnv`
- `.env.example` — MODIFY — add commented `# TRUSTED_PROXY=true` placeholder with explanation
- `.github/workflows/ci.yml` — MODIFY — add `TRUSTED_PROXY: "true"` to CI env block
- `src/test/setup.ts` — MODIFY — add `process.env.TRUSTED_PROXY = "true"` for test isolation

**TDD test plan (RED first):**

1. `envSchema.parse({ ...allRequiredVars, TRUSTED_PROXY: "true" })` succeeds with `TRUSTED_PROXY: "true"`
2. `envSchema.parse({ ...allRequiredVars, TRUSTED_PROXY: "false" })` succeeds with `TRUSTED_PROXY: "false"`
3. `envSchema.parse({ ...allRequiredVars })` succeeds with `TRUSTED_PROXY: undefined` (optional)
4. `envSchema.parse({ ...allRequiredVars, TRUSTED_PROXY: "yes" })` succeeds (arbitrary string accepted)
5. `/api/articles` route uses rightmost IP when `env.TRUSTED_PROXY === "true"` (existing test, refactored to mock env)
6. `/api/articles` route uses leftmost IP when `env.TRUSTED_PROXY` is undefined (existing test, refactored)

**Key design decision:** Since `env` is computed at module load (frozen object), tests can't use `vi.stubEnv` to change it dynamically. The pattern from `src/workers/lib/cacheInvalidation.test.ts` (which mocks `@/lib/env`) is the right approach. The route test will mock `@/lib/env` with a mutable `mockEnv` object that tests can control via direct property assignment.

**Verification:** `pnpm check && pnpm test` green; expected delta: +4 env tests, +1 env test suite (288/52 from 284/51).

**Estimated effort:** 1 commit (~25 min).

---

### Batch 3 — MEDIUM Security: Hoist `PUSH_KEY_ENCRYPTION_KEY` Validation to Module Load

**Goal:** Make the encryption module fail fast at boot if `PUSH_KEY_ENCRYPTION_KEY` is missing/invalid.

**Root cause fix:** Move the validation from `getKey()` (called lazily) to module scope. Cache the validated key buffer so we don't re-validate on every call. This matches the pattern in `env/index.ts:109` (`export const env = validateEnv();`).

**Files affected:**

- `src/lib/security/encrypt.ts` — MODIFY — hoist validation to module scope:
  - Module-scope: `const PUSH_KEY_HEX = process.env.PUSH_KEY_ENCRYPTION_KEY;` → validation check (must be 64 hex chars) → `const KEY_BUFFER = Buffer.from(PUSH_KEY_HEX, "hex");`
  - Remove the `getKey()` function
  - `encryptPushKeys` and `decryptPushKeys` use the cached `KEY_BUFFER`
- `src/lib/security/encrypt.test.ts` — MODIFY — add 4 new module-load validation tests using `vi.resetModules()` + dynamic `import()`:
  1. Module loads successfully when `PUSH_KEY_ENCRYPTION_KEY` is a valid 64-hex string
  2. Module throws at import time when `PUSH_KEY_ENCRYPTION_KEY` is missing
  3. Module throws at import time when `PUSH_KEY_ENCRYPTION_KEY` is not 64 chars
  4. Module throws at import time when `PUSH_KEY_ENCRYPTION_KEY` is not hex

**Test strategy note:** The existing 4 tests (round-trip, invalid format, random IV, long keys) will still pass because `src/test/setup.ts` already sets `PUSH_KEY_ENCRYPTION_KEY` to a valid 64-hex string before any test file imports. The new "throws at import" tests must use `vi.resetModules()` + dynamic `import()` to re-trigger the module load with controlled env state.

**Verification:** `pnpm check && pnpm test` green; expected delta: +4 module-load tests (292/52 from 288/52).

**Estimated effort:** 1 commit (~25 min).

---

### Batch 4 — MEDIUM Infra: Production Redis Hardening + Deploy Script Fix + CI Validation Gate

**Goal:** Make `docker-compose.prod.yml` Redis production-safe, fix `deploy.sh`, and add a CI gate for "no TDD" items (shell + YAML validation) per your previous request.

**Root cause fixes:**

**4a. Redis hardening:** Add `command:` block to `redis` service in `docker-compose.prod.yml` mirroring `docker-compose-dev.yml:51-57` with prod-appropriate `--maxmemory 1gb`:

```
command: >
  redis-server
  --maxmemory 1gb
  --maxmemory-policy noeviction
  --appendonly yes
  --save 60 1000
  --loglevel warning
```

**4b. deploy.sh shebang:** Split line 1 into `#!/bin/bash` on line 1 and `# Deployment script...` on line 2. Also fix the `DOCKER_REGISTRY` variable interpolation on lines 20-21 (change `"DOCKER_REGISTRY/onestopnews-web:$IMAGE_TAG"` to `"${DOCKER_REGISTRY}/onestopnews-web:${IMAGE_TAG}"`).

**4c. CI validation gate:** Add a new "Validate Shell Scripts & Docker Compose Configs" step to `ci.yml` that runs BEFORE `pnpm install` (fail-fast gate). The step:

- Runs `bash -n` on all `scripts/*.sh` files (catches syntax errors)
- Validates shebang regex (must be exactly `#!/bin/bash` or `#!/usr/bin/env bash` with no trailing text — catches the deploy.sh bug)
- Runs `python3 scripts/validate-compose.py` on all docker-compose\*.yml files (catches malformed YAML)

**Files affected:**

- `docker-compose.prod.yml` — MODIFY — add `command:` block to redis service
- `scripts/deploy.sh` — MODIFY — fix shebang (split line 1) + fix `$DOCKER_REGISTRY` interpolation (lines 20-21)
- `scripts/validate-compose.py` — **NEW** — Python YAML validator script (extracted to separate file to avoid shell-heredoc quoting hell with f-strings)
- `.github/workflows/ci.yml` — MODIFY — add "Validate Shell Scripts & Docker Compose Configs" step after Checkout, before Setup Node

**TDD test plan (no TypeScript tests — infra-only per TDD exception for "pure CSS/layout/infra changes"):**

- `bash -n scripts/deploy.sh` exits 0 (proves syntax OK after fix)
- `./scripts/deploy.sh` executes directly (proves shebang is recognized — currently fails with "cannot execute: required file not found")
- `python3 scripts/validate-compose.py` exits 0 (proves all docker-compose files are valid YAML)
- **Negative test:** temporarily re-introduce the shebang bug → confirm the CI gate catches it (exits 1)

**Verification:** `bash -n scripts/deploy.sh` exits 0; `python3 scripts/validate-compose.py` exits 0; `pnpm check && pnpm test` green (no test count change — infra-only).

**Estimated effort:** 1 commit (~20 min).

---

## Phase 3: VALIDATE — Plan Feasibility Review Against Codebase

I have validated the plan against the actual codebase for feasibility. Findings:

### ✅ Batch 1 Feasibility (AdminGuard)

- `verifyAdminSession()` is already async-friendly (uses `cache()` from `react` in `dal.ts:42`)
- `(admin)/layout.tsx` is currently synchronous (lines 10-50) — making it async + wrapping children in `<Suspense>` is the canonical Next.js 16 pattern
- `SummariesData.tsx` and `SourcesData.tsx` already call `verifyAdminSession()` — we can safely remove these calls after the layout-level guard is in place (the `cache()` memoization means the call is deduplicated per-request anyway)
- **No risk of breaking existing tests** — there are no existing tests for `SummariesData`/`SourcesData` (verified via Glob)
- The `push/subscribe/route.test.ts` pattern (lines 38-43) shows how to mock `@/lib/auth/dal` — I'll follow this exactly

### ✅ Batch 2 Feasibility (TRUSTED_PROXY)

- `envSchema` is a plain Zod object (lines 9-77) — adding a field is safe
- `env.TRUSTED_PROXY` access pattern is identical to other env vars (`env.DATABASE_URL` etc. used in `rateLimit.ts:20`, `queue/index.ts:2`, etc.)
- The `/api/articles/route.test.ts` already exists with 12 tests — extending it is straightforward
- The existing "uses rightmost IP" test (lines 148-167) uses `vi.stubEnv` — this will need refactoring to mock `@/lib/env` instead (since `env` is computed at module load)
- CI env block already sets 14 vars; adding 1 more is trivial
- **Risk:** The route test refactor must preserve all 12 existing tests. The `mockEnv` object pattern is proven by `cacheInvalidation.test.ts:35`.

### ✅ Batch 3 Feasibility (Push Key Validation)

- `encrypt.ts` is small (62 lines) — refactor is contained
- Module-scope validation is the same pattern as `env/index.ts:109` (`export const env = validateEnv();`)
- Tests already exist at `src/lib/security/encrypt.test.ts` (4 tests) — extending with module-load tests via `vi.resetModules()` is the standard Vitest pattern
- `src/test/setup.ts:25-26` already sets `PUSH_KEY_ENCRYPTION_KEY` to a valid 64-hex string, so importing `encrypt.ts` in existing tests will continue to work
- **Risk:** The `push/subscribe/route.test.ts` mocks `@/lib/security/encrypt` (lines 33-35), so it won't be affected by the module-load validation. No other test files import `encrypt` directly (verified via Grep).

### ✅ Batch 4 Feasibility (Docker + Deploy Script + CI Gate)

- `docker-compose-dev.yml:51-57` already has the correct command block — copy-paste with prod-appropriate `--maxmemory 1gb`
- `deploy.sh` is 32 lines; the shebang fix is a 1-line split; the `DOCKER_REGISTRY` variable interpolation bug is a 2-line fix (lines 20-21)
- `docker compose config` is a non-destructive validation command (parses YAML without starting containers) — but docker isn't available in this environment, so I'll use Python's `yaml.safe_load` as an alternative validator
- **Risk:** The CI gate's Python f-string had an escaping issue in a previous attempt (f-string with `\"` inside a single-quoted shell heredoc). Extracting the validator to `scripts/validate-compose.py` avoids this entirely.

### 🚨 No Critical Issues Found

After comprehensive re-validation, I confirm there are **no CRITICAL severity issues** — no production-down exposures, no data-loss bugs, no active security breaches. The 5 HIGH/MEDIUM issues are all latent risks that should be fixed before the next production deploy but don't block current development.

---

## Detailed TDD ToDo List

Below is the consolidated, sequenced ToDo list. Each item follows RED → GREEN → REFACTOR → COMMIT:

### Batch 1 — AdminGuard (HIGH) — 1 commit

1. **[RED]** Write `src/shared/components/auth/AdminGuard.test.tsx` — 4 tests (renders children for admin; redirects non-admin to `/`; redirects no-session to `/sign-in`; always invokes verifyAdminSession once)
2. **[RED]** Write `src/app/(admin)/layout.test.tsx` — 1 test (asserts layout wraps children in AdminGuard)
3. **[GREEN]** Create `src/shared/components/auth/AdminGuard.tsx` + `AdminGuardSkeleton.tsx` — async Server Component calling `verifyAdminSession()`, returns `children` on success
4. **[GREEN]** Update `src/app/(admin)/layout.tsx` — wrap `{children}` in `<Suspense fallback={<AdminGuardSkeleton />}><AdminGuard>{children}</AdminGuard></Suspense>`
5. **[REFACTOR]** Remove redundant `verifyAdminSession()` calls from `SummariesData.tsx:9,13` and `SourcesData.tsx:8,54` (the `cache()` memo makes this safe)
6. **[COMMIT]** Verify `pnpm check && pnpm test` green (284/51); commit "fix(admin): centralize verifyAdminSession in layout via AdminGuard"

### Batch 2 — TRUSTED_PROXY (MEDIUM) — 1 commit

7. **[RED]** Write `src/lib/env/index.test.ts` — 4 tests for TRUSTED_PROXY field (accepts 'true', accepts 'false', accepts absence, accepts arbitrary string)
8. **[GREEN]** Add `TRUSTED_PROXY: z.string().optional()` to `envSchema` in `src/lib/env/index.ts` (with documentation comment)
9. **[GREEN]** Update `src/app/api/articles/route.ts` — import `env` from `@/lib/env`, replace `process.env.TRUSTED_PROXY` with `env.TRUSTED_PROXY`
10. **[GREEN]** Update `src/app/api/articles/route.test.ts` — add `vi.mock("@/lib/env", ...)` with mutable `mockEnv` object; refactor "uses rightmost IP" test to mutate `mockEnv.TRUSTED_PROXY` instead of `vi.stubEnv`
11. **[GREEN]** Update `.env.example` (add commented `# TRUSTED_PROXY=true` placeholder), `.github/workflows/ci.yml` (add `TRUSTED_PROXY: "true"` to env block), `src/test/setup.ts` (add `process.env.TRUSTED_PROXY = "true"`)
12. **[COMMIT]** Verify `pnpm check && pnpm test` green (288/52); commit "fix(env): declare TRUSTED_PROXY in Zod schema; route uses env.TRUSTED_PROXY"

### Batch 3 — Push Key Validation (MEDIUM) — 1 commit

13. **[RED]** Extend `src/lib/security/encrypt.test.ts` — 4 new module-load validation tests using `vi.resetModules()` + dynamic `import()` (valid key loads OK; missing key throws at import; non-64-char key throws at import; non-hex key throws at import)
14. **[GREEN]** Refactor `src/lib/security/encrypt.ts` — hoist validation to module scope: `const PUSH_KEY_HEX = process.env.PUSH_KEY_ENCRYPTION_KEY; if (!PUSH_KEY_HEX || !/^[0-9a-fA-F]{64}$/.test(PUSH_KEY_HEX)) throw new Error(...); const KEY_BUFFER = Buffer.from(PUSH_KEY_HEX, "hex");` then use `KEY_BUFFER` in encrypt/decrypt
15. **[REFACTOR]** Remove `getKey()` function; ensure `encryptPushKeys`/`decryptPushKeys` use cached `KEY_BUFFER`
16. **[COMMIT]** Verify `pnpm check && pnpm test` green (292/52); commit "fix(security): hoist PUSH_KEY_ENCRYPTION_KEY validation to module load"

### Batch 4 — Docker + Deploy Script + CI Gate (MEDIUM) — 1 commit

17. **[VERIFY]** `./scripts/deploy.sh` should fail with "cannot execute: required file not found" (proves the shebang bug exists)
18. **[GREEN]** Fix `scripts/deploy.sh` line 1 — split shebang from comment; also fix `"${DOCKER_REGISTRY}/..."` variable interpolation on lines 20-21
19. **[VERIFY]** `./scripts/deploy.sh` executes directly (proves the fix); `bash -n scripts/deploy.sh` exits 0
20. **[GREEN]** Update `docker-compose.prod.yml` `redis:` service — add `command:` block mirroring `docker-compose-dev.yml:51-57` with prod-appropriate `--maxmemory 1gb`
21. **[GREEN]** Create `scripts/validate-compose.py` — Python YAML validator script
22. **[GREEN]** Update `.github/workflows/ci.yml` — add "Validate Shell Scripts & Docker Compose Configs" step after Checkout, before Setup Node
23. **[VERIFY]** `python3 scripts/validate-compose.py` exits 0; negative test (temporarily break shebang → confirm gate catches it); `pnpm check && pnpm test` green (292/52, unchanged — infra-only)
24. **[COMMIT]** Commit "fix(infra): harden prod Redis; fix deploy.sh; add CI validation gate"

---

## Phase 4: VALIDATE — Request Explicit Confirmation

Per the Meticulous Approach, **I will not proceed to IMPLEMENT (Phase 5) until you explicitly confirm this plan.**

### Plan Summary

- **4 batches**, 24 ToDo items, all TDD-driven where applicable
- **0 CRITICAL** issues (none exist)
- **1 HIGH** issue (admin guard centralization) — Batch 1
- **4 MEDIUM** issues — Batches 2, 3, 4 (TRUSTED_PROXY, push key validation, prod Redis + deploy.sh + CI gate)
- **Estimated total effort:** ~1.5-2 hours of focused implementation
- **All batches ship green** — `pnpm check && pnpm test` must pass before each commit
- **Expected final state:** 292 tests / 52 suites (from baseline 279/49), all quality gates green, all 5 HIGH/MEDIUM issues resolved

### Questions for You Before I Proceed

1. **Scope confirmation:** Proceed with all 4 batches (HIGH + MEDIUM severity), one commit per batch, on `main` branch — confirmed?

2. **Batch 5 (LOW severity cleanup):** Per your previous instruction, I'm deferring Batch 5 (DRY enum types, version pins, doc alignment, etc.). Should I continue deferring it, or include any specific sub-items?

3. **CI gate inclusion:** The Batch 4 CI gate (shell + YAML validation) is included per your previous request. Should I also add it to the `e2e.yml` workflow, or only `ci.yml`?

4. **Push strategy:** Should I push each commit to origin/main immediately after creation, or batch all 4 commits and push at the end? (Previous session's commits were lost because they weren't pushed.)

---

I'll proceed with all 4 batches per my best recommendations: **all batches on `main`, defer Batch 5, CI gate only in `ci.yml`, push each commit immediately** (critical — previous session's commits were lost because they weren't pushed).

## Phase 0 — Setup & Baseline Verification

## **Baseline verified:** `pnpm check` clean, `pnpm test` 279/49 in 23s. Working tree clean at `4371cc6`. Now Batch 1.

## Batch 1 — HIGH Security: Centralize Admin Auth Guard in Layout

### Step 1.1 — RED: Write Tests First

Now run the tests to confirm RED (both should fail — AdminGuard doesn't exist, layout doesn't wrap in AdminGuard):
**RED confirmed** for both test files — AdminGuard.test.tsx fails because `./AdminGuard` doesn't exist; layout.test.tsx fails because AdminGuardSpy was called 0 times (layout doesn't use AdminGuard). Now GREEN.

### Step 1.2 — GREEN: Create AdminGuard + AdminGuardSkeleton

**AdminGuard tests GREEN — all 4 pass.** Now update the layout.

### Step 1.3 — GREEN: Update `(admin)/layout.tsx`

**Layout test GREEN.** Now REFACTOR.

### Step 1.4 — REFACTOR: Remove Redundant `verifyAdminSession()` Calls

### Step 1.5 — VERIFY + COMMIT + PUSH

**Batch 1 VERIFIED GREEN:** `pnpm check` clean, `pnpm test` **284/51** (was 279/49 → +5 tests, +2 suites as predicted). Now commit + push:
**Batch 1 committed** (`822f5d0`). Push failed because there are no GitHub credentials configured in this environment — the commit is safely in local history. Let me note this and continue with Batch 2:

---

## Batch 2 — MEDIUM Security: Add `TRUSTED_PROXY` to Zod Env Schema

### Step 2.1 — RED: Write env test + refactor route test

**RED confirmed** for 2 of 4 tests (the `true` and `false` value tests fail because TRUSTED_PROXY is stripped as unknown). Now GREEN — add the field to the schema:

### Step 2.2 — GREEN: Add `TRUSTED_PROXY` to Schema + Switch Route

Now refactor the route test to mock `@/lib/env` (matching the `cacheInvalidation.test.ts` pattern):
Now update `.env.example`, `ci.yml`, and `test/setup.ts`:

### Step 2.3 — GREEN: Update `.env.example`, `ci.yml`, `test/setup.ts`

### Step 2.4 — VERIFY + COMMIT

**Batch 2 VERIFIED GREEN:** `pnpm check` clean, `pnpm test` **288/52** (was 284/51 → +4 env tests, +1 env test suite as predicted). Commit:
**Batch 2 committed** (`17998ce`). Now Batch 3.

---

## Batch 3 — MEDIUM Security: Hoist `PUSH_KEY_ENCRYPTION_KEY` Validation to Module Load

### Step 3.1 — RED: Write Tests First

**RED confirmed** for 3 of 4 new tests (missing key, too-short, non-hex all fail because module loads OK with lazy validation). Now GREEN.

### Step 3.2 — GREEN: Hoist Validation to Module Scope

**All 8 encrypt tests pass.** Now run the full suite + check:

### Step 3.3 — VERIFY + COMMIT

**Batch 3 VERIFIED GREEN:** `pnpm check` clean, `pnpm test` **292/52** (was 288/52 → +4 module-load tests as predicted). Commit:
**Batch 3 committed** (`aaa3eac`). Now Batch 4.

---

## Batch 4 — MEDIUM Infra: Production Redis Hardening + Deploy Script Fix + CI Validation Gate

### Step 4.1 — RED/VERIFY: Prove the deploy.sh bug exists

**All 3 bugs confirmed:**

1. `./scripts/deploy.sh` fails with "cannot execute: required file not found" (shebang `/bin/bash.#` doesn't exist)
2. Lines 20-21 use `"DOCKER_REGISTRY/..."` without `$` prefix (literal string)
3. Prod redis has NO `command:` block (dev has it correctly)

Now GREEN fixes.

### Step 4.2 — GREEN: Fix `deploy.sh` + Add Redis `command:` Block + Create `validate-compose.py`

Now add the CI validation step:

### Step 4.3 — VERIFY: Validate All Fixes + Run CI Gate Simulation

**All fixes verified:**

- ✅ `deploy.sh` shebang clean (`#!/bin/bash$` — no concatenated comment)
- ✅ `deploy.sh` var interpolation fixed (`"${DOCKER_REGISTRY}/..."` with `$`)
- ✅ `./scripts/deploy.sh` executes directly (fails later only because `docker` isn't installed — expected)
- ✅ Prod redis has `command:` block with `noeviction` + AOF
- ✅ CI gate simulation passes (all 4 docker-compose files valid)

Now let me also run the **negative test** to confirm the CI gate actually catches the bug:
**Negative test confirmed**: CI gate catches the malformed shebang and exits 1. deploy.sh restored. Now run the full test suite + check:
**Batch 4 VERIFIED GREEN:** `pnpm check` clean, `pnpm test` **292/52** (unchanged from Batch 3 — Batch 4 is infra-only, validated by CI gate). Commit:
**Batch 4 committed** (`62752f4`). All 4 batches done. Now final verification.

---

## Phase 5 — VERIFY: Final Comprehensive Validation

**Final verification complete — all systems green.** Let me also try pushing (it may work now if credentials were cached):
Push still requires GitHub credentials that aren't configured in this environment. The 4 commits are safely in local history (`822f5d0`, `17998ce`, `aaa3eac`, `62752f4`), ready to push when credentials are available.

---

# Phase 6 — DELIVER: Complete Handoff

## Remediation Summary

All 4 batches executed via TDD discipline, one commit per batch, on `main` branch. **4 commits ahead of origin/main**, ready to push when GitHub credentials are configured.

### Commit Log

| Commit    | Batch | Severity | Summary                                                                       |
| --------- | ----- | -------- | ----------------------------------------------------------------------------- |
| `822f5d0` | 1     | **HIGH** | `fix(admin): centralize verifyAdminSession in layout via AdminGuard`          |
| `17998ce` | 2     | MEDIUM   | `fix(env): declare TRUSTED_PROXY in Zod schema; route uses env.TRUSTED_PROXY` |
| `aaa3eac` | 3     | MEDIUM   | `fix(security): hoist PUSH_KEY_ENCRYPTION_KEY validation to module load`      |
| `62752f4` | 4     | MEDIUM   | `fix(infra): harden prod Redis; fix deploy.sh; add CI validation gate`        |

### Test Count Progression

| Stage                               | Tests   | Suites | Delta                                 |
| ----------------------------------- | ------- | ------ | ------------------------------------- |
| Baseline (Phase 15)                 | 279     | 49     | —                                     |
| After Batch 1 (AdminGuard)          | 284     | 51     | +5 tests, +2 suites                   |
| After Batch 2 (TRUSTED_PROXY)       | 288     | 52     | +4 tests, +1 suite                    |
| After Batch 3 (encrypt module-load) | 292     | 52     | +4 tests                              |
| After Batch 4 (infra)               | 292     | 52     | +0 (infra-only, validated by CI gate) |
| **Final**                           | **292** | **52** | **+13 tests, +3 suites**              |

### Quality Gates Verified

- ✅ `pnpm check`: zero TypeScript errors, zero ESLint warnings
- ✅ `pnpm test`: 292/292 tests pass across 52 suites in ~24s
- ✅ All 4 docker-compose files pass YAML validation
- ✅ Both shell scripts pass `bash -n` syntax check
- ✅ Negative test confirmed: CI gate catches the deploy.sh shebang bug if reintroduced

### What Was Fixed (Root Causes Addressed)

**Batch 1 — HIGH Security (AdminGuard):**

- Created `src/shared/components/auth/AdminGuard.tsx` + `AdminGuardSkeleton.tsx`
- Updated `(admin)/layout.tsx` to wrap children in `<Suspense><AdminGuard>{children}</AdminGuard></Suspense>`
- Removed redundant `verifyAdminSession()` calls from `SummariesData` + `SourcesData` (safe due to `cache()` memoization)
- **Result:** Any future admin page added under `(admin)/` is automatically protected at the layout boundary

**Batch 2 — MEDIUM Security (TRUSTED_PROXY):**

- Added `TRUSTED_PROXY: z.string().optional()` to Zod env schema
- Switched `/api/articles` route from `process.env.TRUSTED_PROXY` to typed `env.TRUSTED_PROXY`
- Updated `.env.example`, `ci.yml`, `test/setup.ts` to declare the var
- Refactored route test to mock `@/lib/env` (matching the `cacheInvalidation.test.ts` pattern)
- **Result:** Typos in `TRUSTED_PROXY` are caught at boot; the var is now part of the validated env contract

**Batch 3 — MEDIUM Security (Push Key Validation):**

- Hoisted `PUSH_KEY_ENCRYPTION_KEY` validation from lazy `getKey()` to module scope
- Cached the validated `KEY_BUFFER` so encrypt/decrypt don't re-validate on every call
- Added 4 module-load tests using `vi.resetModules()` + dynamic `import()`
- **Result:** Worker/web server fails fast at boot if env var is missing/invalid (was: 500 on first push operation)

**Batch 4 — MEDIUM Infra (Redis + Deploy + CI Gate):**

- Added `command:` block to `docker-compose.prod.yml` redis service: `--maxmemory 1gb --maxmemory-policy noeviction --appendonly yes --save 60 1000 --loglevel warning`
- Fixed `scripts/deploy.sh` line 1 shebang (was concatenated with comment)
- Fixed `scripts/deploy.sh` lines 20-21 `DOCKER_REGISTRY` variable interpolation (was missing `$` prefix)
- Added new CI step "Validate Shell Scripts & Docker Compose Configs" that runs BEFORE `pnpm install` (fail-fast gate for infra-only changes)
- Created `scripts/validate-compose.py` YAML validator
- **Result:** Prod Redis is now properly hardened; deploy script is executable directly; future shell/YAML bugs are caught at CI time before they reach production

### Push Status

The 4 commits are in local history but **not yet pushed to origin/main** — `git push` failed with "could not read Username for 'https://github.com'" because GitHub credentials aren't configured in this environment. To push, you'll need to either:

1. Configure GitHub credentials in this environment, OR
2. Run `git push origin main` from a machine that has GitHub access (the commits will be present since they're in local history)

### Next Steps You May Want to Consider

1. **Push to remote:** `git push origin main` — your 4 commits are ready (requires GitHub credentials).
2. **Verify CI passes on GitHub:** The new "Validate Shell Scripts & Docker Compose Configs" step will run for the first time on the next push. It passed locally (including the negative test), so it should pass on GitHub Actions.
3. **Optional Batch 5 (LOW severity cleanup):** Per your instruction, I deferred Batch 5. If you'd like me to proceed with it (DRY enum types, version pins, doc alignment, etc.), just say the word.
4. **Update `Codebase_Review_Validation_Report_2.md` and `Codebase_Review_Validation_Report_3.md`:** Both are now stale — would be worth updating to reflect these 4 remediation batches (now 292 tests / 52 suites).
5. **Deploy validation:** When you're ready to deploy, run `docker compose -f docker-compose.prod.yml config` to verify the prod compose renders correctly with the new Redis command block.

Everything is committed and the working tree is clean (only `tsconfig.tsbuildinfo` shows as modified, which is a benign side-effect of `tsc --noEmit` and isn't part of any commit). The remediation is complete and verified.

---

I'll execute this meticulously: audit all 3 docs for sections that need updating based on the 4 remediation batches, then make targeted edits with new sections documenting the fixes, gotchas, lessons, outstanding issues, and recommendations.

## Phase 1: ANALYZE — Audit Current Doc State

All 4 remediation commits present (`822f5d0`, `17998ce`, `aaa3eac`, `62752f4`). Now grep all 3 docs in parallel for sections that need updating:
I now have a comprehensive map of every section that needs updating. Let me look at a few key sections to understand the exact structure, then make the updates. Let me read the end of each doc to know where to append new Phase 16 sections:
I now have the complete structure. Let me make targeted updates. I'll update each doc to:

1. Update test count (279→292) and add Phase 16 entry
2. Add new anti-patterns/lessons for the 4 batches
3. Update file inventories
4. Add new troubleshooting entries

Let me start with **CLAUDE.md** — update the key sections in parallel:

## Phase 2: IMPLEMENT — Update CLAUDE.md

### 2.1 CLAUDE.md — Update anti-patterns table (add 4 new entries)

### 2.2 CLAUDE.md — Update Phase Status table (add Phase 16 row + update test count)

### 2.3 CLAUDE.md — Update file inventory (add new files) + test count

### 2.4 CLAUDE.md — Append new Phase 16 Lessons Learned section at end

CLAUDE.md updates complete. Now AGENTS.md.

## Phase 2 (cont'd): Update AGENTS.md

### 3.1 AGENTS.md — Update anti-patterns table

### 3.2 AGENTS.md — Update Phase Status table + file inventory + test count

The string has subtle whitespace differences. Let me search for the exact location:
The AGENTS.md has a different (shorter) Phase 15 description. Let me use the exact text:
Now update the file inventory in AGENTS.md to add Phase 16 files, and append the Phase 16 Lessons Learned section at the end:

### 3.3 AGENTS.md — Append Phase 16 Lessons Learned section at end

AGENTS.md done. Now README.md.

## Phase 2 (cont'd): Update README.md

### 4.1 README.md — Update test count (279→292)

### 4.2 README.md — Update Phase Status table + add Phase 16 row

### 4.3 README.md — Update the docker-compose.prod.yml description to mention the new Redis command block

### 4.4 README.md — Add new troubleshooting entries for Phase 16 issues + update CI section

Let me find a good insertion point for the new Phase 16 troubleshooting entries (after the existing Phase 15 entries):
Insert the Phase 16 troubleshooting entries before the `## Recommendations` section:

### 4.5 README.md — Update the "Access control" line in the Compliance section to mention AdminGuard

### 4.6 README.md — Update the CI/CD section to mention the new validation gate

### 4.7 README.md — Append Phase 16 Lessons Learned section at end (before License)

All 3 docs updated. Now verify pnpm check still green and commit.

## Phase 3: VERIFY — Sanity Check + Commit

**All green:** `pnpm check` clean, `pnpm test` **292/52** (unchanged — doc edits don't affect tests). 3 doc files modified. Commit:
**Documentation commit complete** (`ea96e76`). Let me do a final verification:

---

# Documentation Alignment — Complete

## Summary

All 3 mandated docs (`README.md`, `CLAUDE.md`, `AGENTS.md`) have been meticulously updated to align with the Phase 16 remediation batches. **1 commit** (`ea96e76`) — **330 insertions, 7 deletions across 3 files**.

### Commit Log (5 commits ahead of origin/main)

| Commit    | Type | Summary                                                 |
| --------- | ---- | ------------------------------------------------------- |
| `822f5d0` | fix  | Batch 1: AdminGuard (HIGH security)                     |
| `17998ce` | fix  | Batch 2: TRUSTED_PROXY in Zod schema                    |
| `aaa3eac` | fix  | Batch 3: PUSH_KEY_ENCRYPTION_KEY module-load validation |
| `62752f4` | fix  | Batch 4: Prod Redis + deploy.sh + CI gate               |
| `ea96e76` | docs | Align README/CLAUDE/AGENTS with Phase 16                |

### What Was Updated in Each Doc

**CLAUDE.md** (21 Phase 16 mentions, 2 "292 tests" mentions):

- ✅ Anti-Patterns table: 7 new entries (admin auth, TRUSTED_PROXY, lazy push key validation, prod Redis, shebang, var interpolation, and the existing entries updated)
- ✅ Phase Status table: new Phase 16 row with full deliverable summary
- ✅ File Inventory: 7 new file entries (AdminGuard, AdminGuardSkeleton, AdminGuard.test, layout.test, env/index.test, validate-compose.py, and modified files)
- ✅ Test count: 279/49 → 292/52
- ✅ New "Phase 16: Remediation Batches 1-4 — Lessons Learned" section with 4 gotcha entries + 6 recommendations

**AGENTS.md** (14 Phase 16 mentions, 2 "292 tests" mentions):

- ✅ Anti-Patterns table: 7 new entries (same as CLAUDE.md)
- ✅ Phase Status table: new Phase 16 row
- ✅ File Inventory: 18 new/modified file entries (most detailed inventory of all 3 docs)
- ✅ New "Phase 16: Remediation Batches 1-4 — Lessons Learned" section (appended before the closing note)

**README.md** (26 Phase 16 mentions, 4 "292 tests" mentions):

- ✅ Test count: 279/49 → 292/52 (verification table + test suite growth recommendation)
- ✅ Phase Status table: new Phase 16 row
- ✅ File tree: `docker-compose.prod.yml` annotation updated ("hardened: noeviction + AOF, Phase 16"); `(admin)/layout.tsx` annotation updated ("wraps children in `<AdminGuard>` (Phase 16)")
- ✅ CI/CD section: documented the new "Validate Shell Scripts & Docker Compose Configs" CI gate with 3-check description
- ✅ Troubleshooting section: 5 new entries (deploy.sh shebang, deploy.sh var interpolation, prod Redis job loss, lazy push key validation, TRUSTED_PROXY schema bypass) — each with Symptom/Cause/Fix/Verification
- ✅ Compliance section: "Network boundary" row updated to mention `<AdminGuard>` (Phase 16)
- ✅ New "Phase 16: Remediation Batches 1-4 — Lessons Learned" section (appended before License)

### Quality Gates Verified

- ✅ `pnpm check`: zero TypeScript errors, zero ESLint warnings
- ✅ `pnpm test`: 292/292 tests pass across 52 suites (unchanged — doc-only edits)
- ✅ Working tree clean (only `tsconfig.tsbuildinfo` modified, excluded from commit)

### What the Docs Now Cover (Phase 16 Section in Each)

1. **Issues Fixed** — 4 detailed gotcha entries (Issue/Fix/Lesson for each batch):
   - Batch 1: AdminGuard centralization (HIGH security)
   - Batch 2: TRUSTED_PROXY in Zod schema
   - Batch 3: PUSH_KEY_ENCRYPTION_KEY module-load validation
   - Batch 4: Prod Redis + deploy.sh + CI gate

2. **Gotchas to Look Out For** — 7 new anti-patterns in each doc's Anti-Patterns table

3. **Troubleshooting Tips** — 5 new entries in README.md (Symptom/Cause/Fix/Verification format)

4. **Lessons Learnt** — 4 detailed lessons (one per batch) in the Phase 16 section of each doc

5. **Outstanding Issues** — Batch 5 LOW severity items documented in the recommendations (7 items: version pins, missing direct deps, hand-written enum types, db:push script, fastupdate=off, .number-counter CSS, stale docker-compose-sample.yml)

6. **Recommendations** — 6 actionable next steps in each doc (push commits, verify CI, run E2E, address Batch 5, update stale reports, deploy validation)

### Next Steps You May Want to Consider

1. **Push all 5 commits to remote:** `git push origin main` (requires GitHub credentials — not available in this environment)
2. **Verify CI passes on GitHub:** The new "Validate Shell Scripts & Docker Compose Configs" step runs for the first time on the next push
3. **Optional Batch 5 (LOW severity cleanup):** The 7 outstanding LOW items are documented in each doc's Phase 16 Recommendations section — say the word if you'd like me to execute them
4. **Update the stale `Codebase_Review_Validation_Report_2.md` and `Codebase_Review_Validation_Report_3.md`:** Both still reference the pre-Phase-16 state (279/49); they should be updated to reflect 292/52 + the 4 remediation batches

The documentation is now fully aligned with the codebase reality.

---

I'll create a tar archive of the remediated codebase, excluding `node_modules`, `.next`, and `.git` folders, and place it in the download directory.
Repo is at HEAD `ea96e76` (all 5 remediation commits present). Let me verify what will be excluded and what the archive will contain:
Good — `node_modules` is 820M (excluded), `.git` is 13M (excluded), `.next` doesn't exist (already excluded). After exclusions the archive will be ~19M. Let me create the tar archive with gzip compression:
Archive created successfully (11M). Now let me verify the archive's integrity and confirm the exclusions worked:
All verifications pass. Let me do one final check to confirm the Phase 16 source files (the actual fixes) are all in the archive:
All 22 Phase 16 files confirmed present in the archive.

---

# Tar Archive — Complete

## Summary

The remediated codebase has been archived and is ready for download.

### Archive Details

| Property      | Value                                                               |
| ------------- | ------------------------------------------------------------------- |
| **File path** | `/home/z/my-project/download/onestopnews-phase16-remediated.tar.gz` |
| **Size**      | 11 MB (gzipped)                                                     |
| **Files**     | 483                                                                 |
| **Format**    | gzip-compressed tar (`.tar.gz`)                                     |
| **Integrity** | ✅ Verified (`gzip -t` passed)                                      |

### Exclusions Verified (all 0 matches)

- ✅ `node_modules/` — excluded (would have been 820 MB)
- ✅ `.next/` — excluded (didn't exist, but excluded anyway)
- ✅ `.git/` — excluded (would have been 13 MB)

### Phase 16 Files Confirmed Present (all 22 ✅)

All files from the 4 remediation batches + the documentation alignment commit are in the archive:

- **Batch 1 (AdminGuard):** `AdminGuard.tsx`, `AdminGuardSkeleton.tsx`, `AdminGuard.test.tsx`, `(admin)/layout.tsx`, `(admin)/layout.test.tsx`, `SummariesData.tsx`, `SourcesData.tsx`
- **Batch 2 (TRUSTED_PROXY):** `env/index.ts`, `env/index.test.ts`, `articles/route.ts`, `articles/route.test.ts`, `.env.example`, `ci.yml`, `test/setup.ts`
- **Batch 3 (encrypt):** `encrypt.ts`, `encrypt.test.ts`
- **Batch 4 (infra):** `docker-compose.prod.yml`, `deploy.sh`, `validate-compose.py`, `ci.yml`
- **Docs alignment:** `README.md`, `CLAUDE.md`, `AGENTS.md`

### What's Included (483 files)

- All source code (`src/`)
- All config files (`next.config.ts`, `tsconfig.json`, `package.json`, `pnpm-lock.yaml`, `postcss.config.mjs`, `vitest.config.ts`, `eslint.config.mjs`, `playwright.config.ts`, `lighthouserc.js`, `drizzle.config.ts`)
- All Docker files (`Dockerfile.web`, `Dockerfile.worker`, `Dockerfile.dev`, `Dockerfile.worker.dev`, `docker-compose.prod.yml`, `docker-compose-dev.yml`, `docker-compose-nginx.yml`, `docker-compose-sample.yml`)
- All migrations (`drizzle/0000` through `0005` + `custom-indexes.sql`)
- All scripts (`scripts/deploy.sh`, `scripts/dev-setup.sh`, `scripts/validate-compose.py`, `scripts/migrate.ts`, `scripts/init-extensions.sql`)
- All CI workflows (`.github/workflows/ci.yml`, `.github/workflows/e2e.yml`)
- All documentation (`README.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `MASTER_EXECUTION_PLAN.md`, `Project_Architecture_Document_v4.5.md`, `Project_Requirements_Document_v4.3.md`, phase docs, etc.)
- E2E tests (`e2e/smoke.spec.ts`)
- Self-hosted font (`public/fonts/commit-mono-400.woff2`)
- `.env.example`, `.dockerignore`, `.gitignore`

### How to Use to Refresh Your GitHub Repo

1. **Download** the archive from `/home/z/my-project/download/onestopnews-phase16-remediated.tar.gz`

2. **Extract** it to a temp location:

   ```bash
   tar -xzf onestopnews-phase16-remediated.tar.gz
   cd onestopnews
   ```

3. **Refresh your GitHub repo** (pick one):

   **Option A — Replace working tree (preserves git history):**

   ```bash
   # From your existing onestopnews clone:
   cd your-existing-onestopnews-repo
   # Remove old source (keep .git)
   find . -maxdepth 1 -not -name '.git' -not -name '.' -exec rm -rf {} +
   # Copy extracted files in
   cp -r /path/to/extracted/onestopnews/. .
   # Commit and push
   git add -A
   git commit -m "Refresh codebase with Phase 16 remediation (5 commits)"
   git push origin main
   ```

   **Option B — Fresh clone + copy (cleanest):**

   ```bash
   git clone https://github.com/nordeim/onestopnews.git fresh-clone
   cd fresh-clone
   find . -maxdepth 1 -not -name '.git' -not -name '.' -exec rm -rf {} +
   cp -r /path/to/extracted/onestopnews/. .
   git add -A
   git commit -m "Refresh codebase with Phase 16 remediation"
   git push origin main
   ```

4. **Reinstall deps and verify:**

   ```bash
   pnpm install --frozen-lockfile
   pnpm check   # should be green (0 TS errors, 0 lint warnings)
   pnpm test    # should be 292 tests / 52 suites, all passing
   ```

5. **Verify the CI gate** runs successfully on GitHub Actions after the push — the new "Validate Shell Scripts & Docker Compose Configs" step will run for the first time.

### Quality State of the Archive

- ✅ `pnpm check`: zero TypeScript errors, zero ESLint warnings
- ✅ `pnpm test`: 292 tests / 52 suites, all passing in ~24s
- ✅ All 5 Phase 16 commits' changes are baked in (`822f5d0`, `17998ce`, `aaa3eac`, `62752f4`, `ea96e76`)
- ✅ gzip integrity verified

The archive is ready for download and will refresh your GitHub repo with the fully remediated Phase 16 codebase.

#
