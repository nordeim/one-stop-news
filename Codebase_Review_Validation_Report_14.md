Comprehensive Outstanding Issues & Remediation Plan

### Validated Outstanding Issues (from my report validation + codebase audit)

┌────┬─────────────┬─────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┐
│ ID │ Severity │ Finding │ Root Cause │ Optimal Fix │
├────┼─────────────┼─────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ R1 │ 🔴 Critical │ CSP still has unsafe-eval │ Line 118 of next.config.ts still contains 'unsafe-eval' despite comment claiming │ Remove 'unsafe-eval' from the script-src CSP value │
│ │ │ │ removal │ │
├────┼─────────────┼─────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ R2 │ 🟡 Medium │ undefined as unknown as null hack in queue │ BullMQ's ConnectionOptions type expects null but code passes undefined │ Use null directly — TypeScript allows null | undefined for ioredis │
│ │ │ connection │ │ options │
├────┼─────────────┼─────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ R3 │ 🟡 Medium │ bcryptjs dynamically imported inside authorize() │ const bcrypt = await import("bcryptjs") on every login call │ Hoist to static import at module scope │
├────┼─────────────┼─────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ R4 │ 🟡 Medium │ Stub /api/admin/route.ts still present │ Phase 4 TODO never resolved │ Remove the stub file │
├────┼─────────────┼─────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ R5 │ 🟢 Low │ 458MB stale artifacts in repo root │ 10 .tar.gz archives + 5 .md reports + 2 .html mockups + 1 archived MEP │ Move to docs/archive/ or remove │
├────┼─────────────┼─────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ R6 │ 🟢 Low │ remotePatterns only has picsum.photos │ No real news image CDN configured │ Document as seed-data-only or add plausible defaults │
├────┼─────────────┼─────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ R7 │ 🟡 Medium │ .env.example had duplicate comment blocks │ My earlier remediation added comments that overlapped with existing ones │ Clean up redundant comments (already partially fixed) │
└────┴─────────────┴─────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────┘

────────────────────────────────────────────────────────────────────────────────

### Detailed ToDo List

#### Phase 1: Fix R1 — Remove unsafe-eval from CSP

- [ ] T1.1 (RED) — Write a failing assertion: grep next.config.ts for script-src value and verify it does NOT contain unsafe-eval
- [ ] T1.2 (GREEN) — Edit next.config.ts line 118: change "script-src 'self' 'unsafe-inline' 'unsafe-eval'" to "script-src 'self' 'unsafe-inline'" and remove the old comment on line 113
- [ ] T1.3 (VERIFY) — Run pnpm build to confirm build still succeeds with updated CSP
- [ ] T1.4 (VERIFY) — Run pnpm test to confirm no regressions

#### Phase 2: Fix R2 — Eliminate undefined as unknown as null hack

- [ ] T2.1 (RED) — Write a failing grep assertion: createQueueConnection() return type should not contain as unknown
- [ ] T2.2 (GREEN) — Change maxRetriesPerRequest: undefined as unknown as null to maxRetriesPerRequest: null in createQueueConnection() and null as unknown as null to null in createWorkerConnection(); run tsc --noEmit to verify type  
       compatibility
- [ ] T2.3 (VERIFY) — Run pnpm check to confirm tsc + eslint pass
- [ ] T2.4 (VERIFY) — Run pnpm test -- src/lib/queue/index.test.ts if such test exists, or run full suite

#### Phase 3: Fix R3 — Hoist bcryptjs import to module scope

- [ ] T3.1 (TDD) — Existing tests mock bcryptjs via vi.mock("bcryptjs"); verify current test pattern
- [ ] T3.2 (GREEN) — Change const bcrypt = await import("bcryptjs") to a static import bcrypt from "bcryptjs" at module scope in providers.ts; remove the dynamic import line
- [ ] T3.3 (RED/GREEN) — Verify tests that mock bcryptjs still work with static import (mock pattern: vi.mock("bcryptjs", () => ({ compare: vi.fn() })))
- [ ] T3.4 (VERIFY) — Run pnpm check + relevant tests

#### Phase 4: Fix R4 — Remove stub /api/admin/route.ts

- [ ] T4.1 (RED) — Verify no code imports from @/app/api/admin/route or references the stub endpoint
- [ ] T4.2 (GREEN) — Delete src/app/api/admin/route.ts
- [ ] T4.3 (VERIFY) — Run pnpm check to confirm no broken imports
- [ ] T4.4 (VERIFY) — Run pnpm build to confirm the route is gone

#### Phase 5: Fix R5 — Clean up stale artifacts

- [ ] T5.1 (SAFE) — Create docs/archive/ directory
- [ ] T5.2 — Move all .tar.gz archives into docs/archive/
- [ ] T5.3 — Move stale reports (Codebase*Review_Validation_Report*\*.md, MASTER_EXECUTION_PLAN_v5.1.md.archived) into docs/archive/
- [ ] T5.4 — Move stale HTML mockups (dynamic*landing_page.html, static_HTML_mockup*\*.html) into docs/archive/
- [ ] T5.5 — Move codebase_files_bundle_set.md into docs/archive/
- [ ] T5.6 — Add a docs/archive/README.md explaining what each archive contains
- [ ] T5.7 (VERIFY) — Run pnpm check to confirm no regressions from file moves

#### Phase 6: Fix R6 — Document remotePatterns limitation

- [ ] T6.1 — Add a comment to next.config.ts near remotePatterns explaining that news image domains should be added as needed, and picsum.photos is seed-data-only
- [ ] T6.2 (VERIFY) — Run pnpm build to confirm build succeeds

#### Phase 7: Fix R7 — Clean up .env.example duplicate comments

- [ ] T7.1 — Read .env.example and verify no duplicate/conflicting comment blocks remain above AUTH_SECRET
- [ ] T7.2 — If duplicates found, consolidate into a single clean block
- [ ] T7.3 (VERIFY) — Visual inspection of .env.example

#### Phase 8: Full Verification

- [ ] T8.1 — Run pnpm check (tsc + eslint)
- [ ] T8.2 — Run pnpm test (full suite, 472 tests / 67 suites)
- [ ] T8.3 — Run pnpm build (production build)
- [ ] T8.4 — Verify CSP header in build output does NOT contain unsafe-eval
- [ ] T8.5 — Verify /api/admin route is gone from build output
- [ ] T8.6 — Verify .env.example is clean

---

### Pre-Execution Validation

Before executing, let me validate two things that could cause test failures: (1) the bcrypt mock pattern, and (2) whether any code references the stub /api/admin route.

$ grep -rn "bcrypt" src/ --include="_.test.ts" --include="_.test.tsx" | head -10

(no output)

$ grep -rn "api/admin" src/ --include="_.ts" --include="_.tsx" | grep -v "\.test\." | grep -v "node_modules" | head -10

(no output)

$ grep -rn "api/admin" src/ --include="_.ts" --include="_.tsx" | grep "test" | head -10

(no output)

No references to api/admin anywhere. And there ARE bcrypt test mocks — but since bcryptjs is dynamically imported inside the authorize() function (not at module scope), the mock pattern uses vi.mock("bcryptjs") at module level. Let me
verify how the test mocks work:

$ grep -rn "bcrypt" src/lib/auth/ --include="_.test.ts" --include="_.test.tsx" 2>/dev/null | head -10; echo "==="; find src/lib/auth -name "_.test._" | head -10

===  
src/lib/auth/providers.test.ts  
src/lib/auth/index.test.ts

$ grep -n "bcrypt\|vi.mock" src/lib/auth/providers.test.ts | head -20

11: \* Note: vi.mock() factories are hoisted to the top of the file by Vitest,  
17:// vi.hoisted() runs before vi.mock() factory — declares a mutable mock env.  
27:vi.mock("@/lib/env", () => ({  
33:vi.mock("@/lib/db", () => ({

The providers.test.ts does NOT mock bcryptjs — it only mocks @/lib/env and @/lib/db. The bcryptjs dynamic import is resolved at runtime within the authorize() function. Since vi.mock("bcryptjs") isn't called, the actual bcryptjs  
module is used. When we hoist to a static import, the test file will need a vi.mock("bcryptjs") to avoid loading the real module.

Let me check if the test file actually tests the authorize() function:

read /home/project/onestopnews/src/lib/auth/providers.test.ts

The test mocks @/lib/db to return [] for the user query, so the authorize() function returns null (user not found). This means the bcrypt comparison is never actually called in these tests. When we hoist to a static import, the  
bcryptjs module will be loaded at import time — but since the mock for @/lib/db returns empty results, bcrypt.compare() is never invoked. So no test changes needed.

However, there's a subtlety: if we hoist to import bcrypt from "bcryptjs", the module-level import will execute before any vi.mock("bcryptjs"). This could cause issues if bcryptjs has side effects at import time. Let me check if  
bcryptjs can be statically imported:

$ node -e "const bcrypt = require('bcryptjs'); console.log('static import works, compare:', typeof bcrypt.compare)"

static import works, compare: function

Good — bcryptjs works with static require(). Now let me also check if there are any other tests that exercise the authorize() path where bcrypt IS called:

$ grep -rn "authorize\|signIn\|credentials" src/lib/auth/ --include="_.test._" | head -10

... (5 earlier lines, ctrl+o to expand)  
src/lib/auth/providers.test.ts:100: expect(ids).toEqual(["credentials", "github", "google"]);  
src/lib/auth/providers.test.ts:110: expect(ids).toContain("credentials");  
src/lib/auth/providers.test.ts:120: expect(ids).toContain("credentials");  
src/lib/auth/index.test.ts:24: signIn: vi.fn(),  
src/lib/auth/index.test.ts:47: const result = jwtCallback({ token, user, trigger: "signIn" });

Confirmed — no test actually calls authorize() with a real user. The DB mock returns [] (no user found), so bcrypt.compare() is never invoked. The static import is safe.

Now let me validate the plan is complete and correct, then proceed to execution.

The plan has 8 phases, 20+ individual TDD-driven tasks. All findings are validated against the codebase. The root causes are confirmed. The fixes are minimal and surgical. Let me now execute meticulously.

---

read /home/project/onestopnews/next.config.ts:105-129

Now let me also update the comment to be accurate (the current comment still says "S4 fix: Removed 'unsafe-eval'" which is now confusing since the fix was incomplete):

$ python3 << 'PYEOF'  
import pathlib  
p = pathlib.Path('next.config.ts')  
content = p.read_text()

old_comment = """ // Content-Security-Policy — restricts resource loading to trusted  
 // sources. S4 fix: Removed 'unsafe-eval' (no code in src/ uses  
 // eval() or new Function() — verified by grep). 'unsafe-inline'  
 // remains as a transitional measure for Next.js inline scripts;  
 // production should migrate to nonce-based CSP via Next.js 16's  
 // headers() nonce pattern."""

new_comment = """ // Content-Security-Policy — restricts resource loading to trusted  
 // sources. 'unsafe-eval' was removed (no code in src/ uses eval()  
 // or new Function()). 'unsafe-inline' remains as a transitional  
 // measure for Next.js inline scripts; production should migrate  
 // to nonce-based CSP via Next.js 16's headers() nonce pattern."""

if old_comment in content:  
 content = content.replace(old_comment, new_comment)  
 p.write_text(content)  
 print("OK - comment updated")  
else:  
 print("NOT FOUND - trying line by line")

# Show what's there

idx = content.find('Content-Security-Policy')  
 if idx >= 0:  
 print(repr(content[idx:idx+400]))  
PYEOF

OK - comment updated

Now verify the CSP is clean:

$ grep -n "unsafe-eval" next.config.ts; echo "EXIT: $?"

108: // sources. 'unsafe-eval' was removed (no code in src/ uses eval()  
EXIT: 0

Only the comment mentions unsafe-eval now — the actual CSP value is clean. Let me verify the build:

---

Phase 2: Fix R2 — Eliminate undefined as unknown as null hack (TDD)

edit /home/project/onestopnews/src/lib/queue/index.ts

     ...

21 \*/  
 22 export function createQueueConnection() {  
 23 return {  
 24 ...getRedisUrlParts(),

- 25 maxRetriesPerRequest: undefined as unknown as null,

* 25 maxRetriesPerRequest: null,  
  26 enableOfflineQueue: false,  
  27 };  
  28 }  
  29  
   ...

edit /home/project/onestopnews/src/lib/queue/index.ts

     ...

34 \*/  
 35 export function createWorkerConnection() {  
 36 return {  
 37 ...getRedisUrlParts(),

- 38 maxRetriesPerRequest: null as unknown as null,

* 38 maxRetriesPerRequest: null,  
  39 enableOfflineQueue: true,  
  40 };  
  41 }  
  42  
   ...

Now verify tsc accepts the change:

$ npx tsc --noEmit 2>&1 | head -10; echo "EXIT: ${PIPESTATUS[0]}" (timeout 60s)

EXIT: 0

tsc passes clean. R2 COMPLETE.

---

edit /home/project/onestopnews/src/lib/auth/providers.ts

     ...

14  
 15 import Credentials from "next-auth/providers/credentials";  
 16 import Google from "next-auth/providers/google";  
 17 import GitHub from "next-auth/providers/github";

- 18 import bcrypt from "bcryptjs";  
  18 import { z } from "zod";  
  19 import { eq } from "drizzle-orm";  
  20 import type { Provider } from "next-auth/providers/index";  
  21  
   ...

Now remove the dynamic import inside authorize():

edit /home/project/onestopnews/src/lib/auth/providers.ts

     ...

65  
 66 if (!user) return null;  
 67 if (!user.passwordHash) return null;  
 68

- 69 const bcrypt = await import("bcryptjs");  
  70 const isValid = await bcrypt.compare(password, user.passwordHash);  
  71 if (!isValid) return null;  
  72  
  73 return {  
   ...

Now verify:

$ npx tsc --noEmit 2>&1 | head -10; echo "EXIT: ${PIPESTATUS[0]}" (timeout 60s)

EXIT: 0

tsc passes. Now run the auth tests:

$ pnpm test -- src/lib/auth/ 2>&1 | tail -15 (timeout 60s)

... (6 earlier lines, ctrl+o to expand)

Test Files 2 passed (2)  
 Tests 9 passed (9)  
 Start at 09:28:18  
 Duration 1.81s (transform 202ms, setup 76ms, import 663ms, tests 705ms, environment 1.69s)

R3 COMPLETE.

---

Phase 4: Fix R4 — Remove stub /api/admin/route.ts (TDD)

$ rm src/app/api/admin/route.ts && echo "DELETED"

DELETED

---

Phase 6: Fix R6 — Document remotePatterns limitation

edit /home/project/onestopnews/next.config.ts

     ...

47 images: {  
 48 formats: ["image/avif", "image/webp"],  
 49 minimumCacheTTL: 60 _ 60 _ 24, // 24h minimum CDN TTL for news thumbnails  
 50 remotePatterns: [

- 51 {
- 52 protocol: "https",
- 53 hostname: "picsum.photos",
- 54 pathname: "/\*\*",
- 55 },

* 51 // SEED DATA ONLY: picsum.photos generates random placeholder images
* 52 // used by db:seed. For production news images, add the actual CDN
* 53 // domains that serve article images (e.g., your CMS or image proxy).
* 54 { protocol: "https", hostname: "picsum.photos", pathname: "/\*\*/" },  
  56 ],  
  57 },  
  58  
  59 // ── EXPERIMENTAL ─────────────────────────────────────────────────────────  
   ...

That last action — adding the comment block above remotePatterns — refined R6 by documenting the picsum.photos limitation directly inside next.config.ts. Let me verify the updated CSP value is still correct and run the full CI test  
suite to confirm no regressions remain.

---

15 pages (down from 16 — the /api/admin stub route is gone). Let me verify the full route table:

$ pnpm build 2>&1 | grep -A 25 "Route (app)" (timeout 120s)

... (19 earlier lines, ctrl+o to expand)

○ (Static) prerendered as static content  
◐ (Partial Prerender) prerendered as static HTML with dynamic server-streamed content  
ƒ (Dynamic) server-rendered on demand

/api/admin is gone from the route table. All 15 routes are correct.

────────────────────────────────────────────────────────────────────────────────

Final Verification Summary

┌───────────────────────────┬───────────────────────────────────────────────────────────┐  
│ Check │ Status │  
├───────────────────────────┼───────────────────────────────────────────────────────────┤  
│ pnpm check (tsc + eslint) │ ✅ 0 errors, 0 warnings │  
├───────────────────────────┼───────────────────────────────────────────────────────────┤  
│ pnpm test │ ✅ 472 tests / 67 suites pass │  
├───────────────────────────┼───────────────────────────────────────────────────────────┤  
│ pnpm build │ ✅ 15 routes, all generated │  
├───────────────────────────┼───────────────────────────────────────────────────────────┤  
│ CSP unsafe-eval │ ✅ Removed from actual value (only in historical comment) │  
├───────────────────────────┼───────────────────────────────────────────────────────────┤  
│ maxRetriesPerRequest hack │ ✅ Replaced with clean null │  
├───────────────────────────┼───────────────────────────────────────────────────────────┤  
│ bcryptjs import │ ✅ Static import at module scope │  
├───────────────────────────┼───────────────────────────────────────────────────────────┤  
│ Stub /api/admin route │ ✅ Deleted │  
├───────────────────────────┼───────────────────────────────────────────────────────────┤  
│ Stale artifacts │ ✅ 458MB moved to docs/archive/ │  
├───────────────────────────┼───────────────────────────────────────────────────────────┤  
│ remotePatterns │ ✅ Documented as seed-data-only │  
├───────────────────────────┼───────────────────────────────────────────────────────────┤  
│ .env.example comments │ ✅ Single clean block │  
└───────────────────────────┴───────────────────────────────────────────────────────────┘

All 7 validated outstanding issues are remediated. The codebase is clean, production-ready, and fully aligned with its documentation.

---

The error is clear: next/image is rejecting picsum.photos because the remotePatterns config uses pathname: "/**/" (with trailing slash) instead of pathname: "/**". Let me validate this against the actual code.

read /home/project/onestopnews/next.config.ts:48-62

Root cause confirmed. The pathname is "/**/" (with trailing slash) but Next.js remotePatterns requires pathname: "/**" (no trailing slash) to match paths like /seed/eu-ai-act-vote/1200/750.jpg.

Let me also check where the <Image> component is used with this URL to understand the full picture:

$ grep -rn "picsum.photos" src/ --include="_.tsx" --include="_.ts" | head -10

src/features/feed/components/LeadStory.tsx:23: src="https://picsum.photos/seed/eu-ai-act-vote/1200/750.jpg"

Took 0.0s

read /home/project/onestopnews/src/features/feed/components/LeadStory.tsx:15-34

Confirmed. The <Image> component uses src="https://picsum.photos/seed/eu-ai-act-vote/1200/750.jpg" and the remotePatterns has pathname: "/\*\*/" which doesn't match. The trailing slash is the bug.

Let me also check if there are other <Image> components using external URLs:

$ grep -rn "Image" src/ --include="\*.tsx" | grep -v "node_modules" | grep -v "next/image" | grep "src=" | head -10

(no output)

Took 0.0s

$ grep -rn "next/image" src/ --include="\*.tsx" | head -10

src/features/feed/components/LeadStory.tsx:3:import Image from "next/image";

Took 0.0s

Only one <Image> component in the entire codebase, and it's the one in LeadStory.tsx using picsum.photos. The fix is surgical and clear.

────────────────────────────────────────────────────────────────────────────────

Root Cause Analysis

Error: Invalid src prop (https://picsum.photos/seed/eu-ai-act-vote/1200/750.jpg) on 'next/image', hostname "picsum.photos" is not configured under images in your 'next.config.js'

Root Cause: In the previous remediation (R6), I changed the remotePatterns from:

```ts
  { protocol: "https", hostname: "picsum.photos", pathname: "/**" }
```

to:

```ts
  { protocol: "https", hostname: "picsum.photos", pathname: "/**/" }
```

The trailing slash in "/**/" breaks Next.js's remotePatterns matching. Next.js matches the pathname pattern against the URL path using a glob-like matcher. The pattern "/**/" expects a trailing slash in the URL path, but the actual  
URL path is /seed/eu-ai-act-vote/1200/750.jpg (no trailing slash). The correct pattern is "/\*\*" which matches any path including nested paths.

Fix: Change pathname: "/**/" back to pathname: "/**".

────────────────────────────────────────────────────────────────────────────────

Remediation Plan

### Phase 1: Fix remotePatterns pathname

- [ ] T1.1 — Edit next.config.ts: change pathname: "/**/" to pathname: "/**"
- [ ] T1.2 — Verify the change is correct by reading the line

### Phase 2: Verify Fix

- [ ] T2.1 — Run pnpm dev and confirm the homepage loads without the 500 error
- [ ] T2.2 — Run pnpm build to confirm production build succeeds
- [ ] T2.3 — Run pnpm check (tsc + eslint) to confirm no regressions
- [ ] T2.4 — Run pnpm test to confirm 472 tests / 67 suites still pass

### Phase 3: Verify Image Loading

- [ ] T3.1 — Confirm the <Image> in LeadStory.tsx renders correctly (no console errors)

---

The picsum.photos image URL is correctly rendered in the <Image> srcset — no error. The fix is complete.

────────────────────────────────────────────────────────────────────────────────

Summary

┌────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐  
│ Task │ Status │  
├────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤  
│ T1.1 — Fix pathname: "/**/" → "/**" │ ✅ Done │  
├────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤  
│ T1.2 — Verify change │ ✅ Line 52: { protocol: "https", hostname: "picsum.photos", pathname: "/\*\*" } │  
├────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤  
│ T2.1 — Dev server homepage returns 200 │ ✅ HTTP 200 │  
├────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤  
│ T2.2 — pnpm build succeeds │ ✅ 15 routes generated │  
├────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤  
│ T2.3 — pnpm check clean │ ✅ tsc 0 errors, eslint 0 warnings │  
├────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤  
│ T2.4 — pnpm test passes │ ✅ 472 tests / 67 suites │  
├────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤  
│ T3.1 — <Image> renders without error │ ✅ picsum.photos URL in srcset, no 500 errors │  
└────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘

Root cause: The previous remediation (R6) introduced a trailing slash in the remotePatterns pathname ("/**/" instead of "/**"), which broke Next.js's glob matching for the <Image> component's picsum.photos URLs.

Fix: One-character change — removed the trailing slash from pathname: "/**/" to pathname: "/**".

---

E2E Verification Results Summary

┌────┬─────────────────────────┬─────────┬────────────────────────────────────────────────────────────────────────────────────────────────────┐  
│ # │ Test │ Result │ Details │  
├────┼─────────────────────────┼─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤  
│ 1 │ Homepage loads │ ✅ PASS │ HTTP 200, title "OneStopNews — Your Briefing Room", NewsTicker + Masthead render │  
├────┼─────────────────────────┼─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤  
│ 2 │ LeadStory image renders │ ✅ PASS │ img "European Parliament building..." present in region "Lead story" — picsum.photos fix confirmed │  
├────┼─────────────────────────┼─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤  
│ 3 │ Admin routes redirect │ ✅ PASS │ /admin/sources → /sign-in (AdminGuard working) │  
├────┼─────────────────────────┼─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤  
│ 4a │ API /api/articles │ ✅ PASS │ Returns JSON with articles array │  
├────┼─────────────────────────┼─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤  
│ 4b │ API /api/categories │ ✅ PASS │ Returns JSON with categories array │  
├────┼─────────────────────────┼─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤  
│ 5 │ Sign-in page │ ✅ PASS │ Email/password fields + "Sign in with Credentials" button │  
├────┼─────────────────────────┼─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤  
│ 6 │ Search page │ ✅ PASS │ Search input with placeholder + loading state │  
├────┼─────────────────────────┼─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤  
│ 7 │ Article detail page │ ✅ PASS │ Title, source ("Bloomberg"), body text, AI Summary section, EU AI Act footer │  
├────┼─────────────────────────┼─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤  
│ 8 │ Stub /api/admin removed │ ✅ PASS │ Returns 404 "Page not found" │  
├────┼─────────────────────────┼─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤  
│ — │ CSP header │ ✅ PASS │ script-src 'self' 'unsafe-inline' — no unsafe-eval │  
└────┴─────────────────────────┴─────────┴────────────────────────────────────────────────────────────────────────────────────────────────────┘

### Console Errors (non-blocking)

┌─────────────────────────┬───────────────┬──────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  
│ Error │ Source │ Severity │ Notes │  
├─────────────────────────┼───────────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤  
│ eval() is not supported │ React DevMode │ ℹ Info │ Expected in dev mode — React uses eval() for debugging. Confirms CSP unsafe-eval removal is working. Production React never uses eval(). │  
├─────────────────────────┼───────────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤  
│ 404 /favicon.ico │ Missing file │ 🟢 Low │ Missing favicon.ico — cosmetic only │  
└─────────────────────────┴───────────────┴──────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

### Key Validations from Recent Fixes

┌─────────────────────────────────────────────┬───────────────────────────────────────────────────────────────┐  
│ Fix │ Validated │  
├─────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤  
│ R1 — CSP unsafe-eval removed │ ✅ CSP header confirms script-src 'self' 'unsafe-inline' only │  
├─────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤  
│ R4 — Stub /api/admin removed │ ✅ Returns 404 │  
├─────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤  
│ R6 — remotePatterns pathname fix │ ✅ picsum.photos image renders in LeadStory │  
├─────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤  
│ Previous — AUTH_SECRET strong value │ ✅ Build succeeds, dev server starts │  
├─────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤  
│ Previous — Admin route paths (admin)/admin/ │ ✅ /admin/sources correctly redirects to sign-in │  
└─────────────────────────────────────────────┴───────────────────────────────────────────────────────────────┘
