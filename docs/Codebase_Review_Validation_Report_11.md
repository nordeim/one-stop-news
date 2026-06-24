# Run page test with filter

$ pnpm test -- src/app/\(public\)/page.test.tsx 2>&1

> onestopnews@0.1.0 test /home/project/onestopnews
> vitest run "src/app/(public)/page.test.tsx"
> RUN v4.1.9 /home/project/onestopnews
> stderr | src/app/(public)/page.test.tsx > HomePage > renders without errors
> [vitest] The vi.fn() mock did not use 'function' or 'class' in its implementation, see https://vitest.dev/api/vi#vi-spyon for examples.
> stderr | src/app/(public)/page.test.tsx > HomePage > has a <main> element with id='main-content' as the skip-link target
> …
> Click to expand
> The error indicates the IntersectionObserver mock is not a constructor because vi.fn(() => ({ ... })) returns a regular function, not a class. new IntersectionObserver() requires a class/function that can be instantiated with new. Let me fix the mock to use a proper class or function: I need to fix the IntersectionObserver mock — new expects a constructor function: </think>
> ← Edit src/app/(public)/page.test.tsx
> Now let me run the test again: Let me run the test again: </think>

# Rerun page test after IO mock fix

$ pnpm test -- src/app/\(public\)/page.test.tsx 2>&1

> onestopnews@0.1.0 test /home/project/onestopnews
> vitest run "src/app/(public)/page.test.tsx"
> RUN v4.1.9 /home/project/onestopnews
> Test Files 1 passed (1)

      Tests  2 passed (2)

Start at 12:08:32
…
Click to expand
The test passes. Now let me provide a summary of the root causes, the fix, and the changes made.
Summary
Root Cause Analysis
The build error Route "/account": Uncached data was accessed outside of <Suspense> was caused by /account/page.tsx using await verifySession() directly inside the page component. In Next.js 16 with cacheComponents: true, an Async Server Component that fetches dynamic data (like await auth()) without a <Suspense> boundary is treated as a blocking route, which causes the prerender to fail with a fatal error.
What I Changed

1. Modified src/app/account/page.tsx — Refactored to use the Next.js 16 Suspense + async Server Component pattern (consistent with every other page in the app). The page component is now synchronous and wraps the async data fetch in <Suspense>:

- AccountPage (sync) → <Suspense fallback={<AccountSkeleton />}>
- AccountData (async, inside <Suspense>) → calls await verifySession() and await getLinkedProviders()

2. Moved RevealProvider from src/app/layout.tsx to src/app/(public)/page.tsx — Removed RevealProvider from the root layout where it was wrapping all pages unnecessarily, and placed it only in the homepage where .reveal elements exist. This also prevents a synchronous Client Component from wrapping async Server Components at the layout level.
3. Updated src/app/layout.test.tsx — Removed the now-unnecessary vi.mock for RevealProvider.
4. Updated src/app/(public)/page.test.tsx — Added window.matchMedia and IntersectionObserver mocks to handle the fact that RevealProvider is now rendered inside the page.
   Build & Test Verification

- ✅ pnpm tsc --noEmit — TypeScript passes
- ✅ pnpm check — TypeScript + ESLint pass
- ✅ pnpm build — Next.js production build succeeds (no more blocking-route error)
- ✅ pnpm test -- src/app/(public)/page.test.tsx — page tests pass$
- ⚠️ Existing 200 .gemini/ vitest failures are pre-existing (external package tests being picked up by the vitest runner) and not related to this change. I will provide a comprehensive summary: </think> The test passes. Let me provide a complete summary: Let me verify the final state of the key modified files:
  → Read src/app/account/page.tsx
  The file looks correct. Now let me provide the final summary to the user. </think> ## Root Cause Analysis & Fix Summary
  Primary Root Cause
  The fatal build error came from /account/page.tsx directly calling await verifySession() inside the page component without a <Suspense> boundary. In Next.js 16 with \_sta.ceComponents: true enabled, this is the official "blocking-route" pattern: any Async Server Component that performs dynamic data fetching (like auth() reading cookies) outside of a <Suspense> boundary blocks the entire prerender, causing the fatal error you saw.
  The initial error misleadingly pointed to RevealProvider.tsx:18 because it's a synchronous Client Component in the React tree above the async /account page. But the true trigger was the await auth() in src/lib/auth/dal.ts:15.
  Corrective Changes

1. src/app/account/page.tsx — Refactored to Next.js 16 Suspense + async Server Component pattern

- Made the page component synchronous (export default function AccountPage())
- Extracted data fetching into a separate async function AccountData() Server Component
- Wrapped <AccountData /> with <Suspense fallback={<AccountSkeleton />}> so the prerender can stream the fallback immediately while the async data fetch happens server-side
  This is the exact pattern used by every other page in your app (search/page.tsx, article/[id]/page.tsx, (admin)/sources/page.tsx, etc.)

2. src/app/layout.tsx — Removed RevealProvider from root layout

- RevealProvider was wrapping all pages but only .reveal elements on the homepage use it
- Moved it to src/app/(public)/page.tsx to scope its effect to the only page where scroll-reveal is used
- This also cleans up the render tree by not having a synchronous Client Component block Server Component streaming at the layout level for all pages

3. src/app/(public)/page.tsx — Added RevealProvider to homepage only

- Wrapped the page content with <RevealProvider> to preserve scroll-reveal animations

4. src/app/layout.test.tsx — Removed obsolete RevealProvider mock

- The mock was only needed because RevealProvider was in the root layout; now that it's only in the homepage, the mock is no longer needed in layout tests

5. src/app/(public)/page.test.tsx — Added missing browser API mocks

- Added window.matchMedia and IntersectionObserver mocks in beforeEach so the test environment can handle RevealProvider now that it renders in the page tree
  Verification
- ✅ pnpm tsc --noEmit — TypeScript passes
- ✅ pnpm check — ESLint + TypeScript pass (no warnings)
- ✅ pnpm build — Next.js production build completes successfully; /account is now ◐ (Partial Prerender) instead of a fatal crash
- ✅ pnpm test -- src/app/(public)/page.test.tsx — both homepage tests pass
