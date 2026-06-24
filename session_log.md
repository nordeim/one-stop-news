The /sources page is still failing. The issue is that verifyAdminSession() in the page itself is performing a database query outside of <Suspense>. This triggers the blocking-route error because verifyAdminSession() is awaited before the <Suspense> boundary.
Wait, but verifyAdminSession() is doing db.query.users.findFirst() which is a database query. Next.js 16's cacheComponents treats ALL database queries as "uncached data" unless wrapped in <Suspense>. The <Suspense> wrap needs to happen ABOVE the verifyAdminSession() call, or verifyAdminSession() itself needs to be cached.
Actually, let me look at how other pages handle this — specifically how the /sign-in or other pages avoid this.
The fix may be to wrap the verifyAdminSession() call inside a Suspense boundary, or to add caching to it.
Let me check the other pages and the verifyAdminSession implementation.
→Read src/lib/auth/dal.ts
The issue is clear now: verifyAdminSession() does db.select() directly without "use cache" + cacheLife. In Next.js 16 with cacheComponents: true, ANY database query outside <Suspense> causes blocking-route, even if it's wrapped in React.cache().
The Fix
I have two options:

1. Add "use cache" + cacheLife to the auth DAL functions — but this could have side effects because auth state changes should be dynamic.
2. Move the auth check INSIDE the <Suspense> boundary, or wrap the entire page content (including verifyAdminSession()) in <Suspense> — technically we can wrap the whole page in a Suspense boundary, but this feels wrong.
3. Don't await verifyAdminSession() at the top level; instead, call it inside the Server Component that Suspense wraps — pass the requirement to SourcesData, which calls it.
   Actually, the cleanest fix for admin pages is option 1, but with a very short cacheLife. Auth checks are lightweight (single row lookup by email), and React.cache() already memoizes per-request. Adding "use cache" to verifySession and verifyAdminSession would be acceptable for prerender purposes.
   However, the AGENTS.md says "Auth at the DAL" and "redirect() not throw" — this is a DAL function. Adding "use cache" to it is appropriate because in Next.js 16, every dynamic DB access must be either:

- Wrapped in <Suspense>
- Inside a "use cache" function with cacheLife
  Given the FeedData / <Suspense> pattern works for the public feed, the analogous pattern for admin pages is to either:
- Cache the verifySession / verifyAdminSession DAL functions with "use cache" + cacheLife("auth") (or similar)
- Or move the verifyAdminSession() call into SourcesData so it happens inside the <Suspense> boundary
  I'll use the second approach — move verifyAdminSession() call from the Page into SourcesData — because it's consistent with the Suspense + Data Component pattern we've already established. The page just renders the Suspense boundary; data fetching AND auth both happen inside SourcesData.
  Wait, re-checking the error message: at body (<anonymous>) and at html (<anonymous>). This means the error is happening at the root level, before any Suspense. The await verifyAdminSession() at line 17 of the page is triggering it.
  But moving verifyAdminSession() into SourcesData means the page will render the Suspense fallback, then inside the Suspense boundary SourcesData will call verifyAdminSession() and redirect if not admin. This is correct.
  Let me update both the page and SourcesData.tsx.
  Actually, the better approach here is to keep the await verifyAdminSession() in the page (for security, to fail fast), but wrap ALL page content — including the await — in a Server Component that Suspense wraps.
  Wait, no. The await at the page level is the problem. The page is an async function. When Next.js tries to prerender it, it hits the await which triggers the DB query. This blocks the page.
  The solution: make the page a SYNC function, and do ALL data fetching (including auth) inside the <Suspense> boundary.
  Or, even simpler: keep the await verifyAdminSession() in the page but add "use cache" + cacheLife to it. But this means the auth check during prerender would be cached, which is incorrect (prerender has no session).
  The correct approach for prerender: Next.js 16 will NOT call Server Actions / cookies during prerender. The auth() function from Auth.js reads cookies, which returns null during prerender. So verifyAdminSession() would redirect to /sign-in during prerender... which is also wrong for a prerender.
  The real issue is: admin pages should NOT be statically prerendered at all. We need to make them dynamic.
  In Next.js 16, making a page dynamic means either:
- Adding unstable_noStore() (not recommended anymore in Next.js 16)
- Using a dynamic segment or searchParams
- Or using const dynamic = "force-dynamic" in the page
  But wait, the error is blocking-route, not not-serializable. The issue is specifically that the db.select() in verifyAdminSession is considered "uncached data" that blocks the page.
  Hmm. Actually, in Next.js 16 with cacheComponents: true, the error message "Uncached data was accessed outside of <Suspense>" means: any function that accesses the database MUST either be:

1. Called inside a <Suspense> boundary
2. Or be wrapped in "use cache" + cacheLife
   The verifyAdminSession() function hits the database. So it must be either:

- Inside a <Suspense> boundary
- Or have "use cache" + cacheLife
  Since we don't want to cache auth (private data), the only option is to put it inside <Suspense>. But how does that work? If we wrap the whole page in <Suspense>, then verifyAdminSession() runs inside it. The page itself returns the <Suspense> immediately. This is valid.
  But actually, the NEXT-1404 spec says: the blocking-route error only triggers for data reads outside of <Suspense>, not for function calls that happen to read data inside a Suspense boundary. So putting verifyAdminSession() inside a child component that's wrapped in <Suspense> would work.
  But the issue is: if we move verifyAdminSession() into SourcesData, the page will render the Suspense fallback first, then SourcesData will call verifyAdminSession() which will either:
- Return the user (if authenticated) → proceed to fetch data
- Or redirect("/sign-in") (if not authenticated) → Next.js handles the redirect
  This is the correct behavior. The redirect from within a Server Component inside a Suspense boundary is handled by Next.js.
  Let me restructure the page to remove the top-level await and pass auth responsibility down to SourcesData.
  Actually, looking at this more carefully — verifyAdminSession() redirects if no session. If we put it inside a Suspense-wrapped component, the component will call verifyAdminSession() which will redirect("/sign-in"). Next.js will handle the redirect. This is exactly what we want.
  But wait: the page header (the <header> with <h1> and <p>) should still render even if the data is loading. In the current code, the header is outside the <Suspense> boundary, which is correct. The problem is only the await verifyAdminSession() at the top of the page which blocks.
  If we move verifyAdminSession() into SourcesData, the page becomes synchronous:
  export default function SourcesPage() {
  return (
  <div>
  <header className="mb-8">
  <h1 className="font-editorial text-3xl font-[800] text-paper-50">Sources</h1>
  <p className="mt-2 font-ui text-sm text-paper-300">
  Manage RSS/Atom/JSON sources
  </p>
  </header>
  <Suspense fallback={<SourcesSkeleton />}>
  <SourcesData />
  </Suspense>
  </div>
  );
  }
  And SourcesData will call await verifyAdminSession() at the top of its async function, then fetch data. But wait — verifyAdminSession() inside SourcesData will STILL block that specific component, which is fine because it's inside Suspense.
  Actually, I just realized: verifyAdminSession() itself does a DB call. If we put it inside <Suspense>, the DB call will happen inside the Suspense boundary. This is exactly the fix.
  So the plan:

1. Remove await verifyAdminSession() from the page, make the page synchronous
2. Move await verifyAdminSession() into SourcesData
3. Done
   Let me implement this. </think> The build is still failing on /sources. The core issue: verifyAdminSession() at the top of the page does a DB query (db.select()) before the <Suspense> boundary, so Next.js 16 treats it as an uncached data read and throws blocking-route.
   Fix
4. Make the page itself synchronous (remove async and the top-level await).
5. Move await verifyAdminSession() into SourcesData so it runs inside the <Suspense> boundary.
   This is consistent with the Next.js 16 requirement: all data access must happen inside a Suspense-wrapped component.
   ← Edit src/app/(admin)/sources/page.tsx

- page.tsx — Admin source management page. \* page.tsx — Admin source management page.
- -
- PRD §6: Source management table with status badges. \* PRD §6: Source management table with status badges.
- -
- NOTE: Data fetching is delegated to SourcesData.tsx (Server Component) \* The page shell is synchronous; all data access (including the
- and wrapped in <Suspense> to prevent blocking-route errors in Next.js 16 \* admin-session check) happens inside the Suspense-wrapped
- with cacheComponents enabled. _ SourcesData component, satisfying Next.js 16 cacheComponents.
  _/ \*/

import { Suspense } from "react";import { Suspense } from "react";
import { verifyAdminSession } from "@/lib/auth/dal";
import { SourcesData } from "@/features/sources/components/SourcesData";import { SourcesData } from "@/features/sources/components/SourcesData";
import { SourcesSkeleton } from "@/features/sources/components/SourcesSkeleton";import { SourcesSkeleton } from "@/features/sources/components/SourcesSkeleton";

export default async function SourcesPage() {export default function SourcesPage() {
await verifyAdminSession();

return ( return (

<div> <div>
<header className="mb-8"> <header className="mb-8">
<h1 className="font-editorial text-3xl font-[800] text-paper-50"> <h1 className="font-editorial text-3xl font-[800] text-paper-50">

→Read src/features/sources/components/SourcesData.tsx
Now I need to add verifyAdminSession() to the SourcesData component so the auth check happens inside the <Suspense> boundary.
← Edit src/features/sources/components/SourcesData.tsx

- Separates data fetching from the page to enable <Suspense> wrapping \* Separates data fetching from the page to enable <Suspense> wrapping
- in Next.js 16 with cacheComponents enabled. _ in Next.js 16 with cacheComponents enabled.
  _/ \*/

import { verifyAdminSession } from "@/lib/auth/dal";
import { getAllSources, getCategoryMap } from "@/features/sources/queries";import { getAllSources, getCategoryMap } from "@/features/sources/queries";

/** Source item as returned by the database query. \*//** Source item as returned by the database query. \*/
interface SourceRow {interface SourceRow {
{sources.map((source) => ( {sources.map((source) => (

<tr key={source.id} className="border-b border-ink-800"> <tr key={source.id} className="border-b border-ink-800">
<td className="py-3 px-4 font-ui text-sm text-paper-200">{source.name}</td> <td className="py-3 px-4 font-ui text-sm text-paper-200">{source.name}</td>
<td className="py-3 px-4 font-ui text-sm text-paper-400 truncate max-w-xs">{source.feedUrl}</td> <td className="py-3 px-4 font-ui text-sm text-paper-400 truncate max-w-xs">{source.feedUrl}</td>
<td className="py-3 px-4 font-ui text-sm text-paper-400">{source.categoryId ? categoryMap[source.categoryId] || "—" : "阳的"}</td> <td className="py-3 px-4 font-ui text-sm text-paper-400">{source.categoryId ? categoryMap[source.categoryId] || "—" : "—"}</td>
<td className="py-3 px-4"> <td className="py-3 px-4">
<span className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase ${source.isActive ? "bg-dispatch-sage/20 text-dispatch-sage" : "bg-dispatch-ember/20 text-dispatch-ember"}`}> <span className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase ${source.isActive ? "bg-dispatch-sage/20 text-dispatch-sage" : "bg-dispatch-ember/20 text-dispatch-ember"}`}>
<span className={`w-1.5 h-1.5 rounded-full ${source.isActive ? "bg-dispatch-sage" : "bg-dispatch-ember"}`} /> <span className={`w-1.5 h-1.5 rounded-full ${source.isActive ? "bg-dispatch-sage" : "bg-dispatch-ember"}`} />
{source.isActive ? "Active" : "Paused"} {source.isActive ? "Active" : "Paused"}
); );
}}

export async function SourcesData() {export async function SourcesData() {
await verifyAdminSession();

const sources = await getAllSources(); const sources = await getAllSources();
const categoryMap = await getCategoryMap(); const categoryMap = await getCategoryMap();

return <SourceTable sources={sources} categoryMap={categoryMap} />; return <SourceTable sources={sources} categoryMap={categoryMap} />;

# Run Next.js build to verify /sources fix

$ pnpm build 2>&1 | tail -80

> onestopnews@0.1.0 build /home/project/onestopnews
> next build

▲ Next.js 16.2.9 (Turbopack)

- Environments: .env.local, .env
- Cache Components enabled
- Experiments (use with caution):
  ✓ viewTransition

  Creating an optimized production build ...
  …
