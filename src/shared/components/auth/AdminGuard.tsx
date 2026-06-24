/**
 * AdminGuard.tsx — Layer 1 admin auth boundary.
 *
 * Async Server Component that calls verifyAdminSession() before rendering
 * children. This centralizes admin authorization at the layout boundary
 * (src/app/(admin)/layout.tsx) so ANY future admin page is automatically
 * protected — no per-page guard needed.
 *
 * Why this exists:
 *   - Next.js 16 cacheComponents rejects synchronous layouts that perform
 *     async work. The previous workaround pushed verifyAdminSession() into
 *     per-page data components (SummariesData, SourcesData), which created
 *     a latent security gap: any new admin page that forgot to call the
 *     guard would be publicly accessible.
 *   - This AdminGuard wraps the auth call in a Suspense-friendly async
 *     Server Component. The layout composes:
 *
 *       <Suspense fallback={<AdminGuardSkeleton />}>
 *         <AdminGuard>{children}</AdminGuard>
 *       </Suspense>
 *
 *   - verifyAdminSession() is memoized via React.cache() inside dal.ts,
 *     so multiple calls within the same request are deduplicated.
 *
 * Behavior:
 *   - Admin user → renders children
 *   - Non-admin user → verifyAdminSession calls redirect("/")
 *   - No session → verifyAdminSession calls redirect("/sign-in")
 *
 * The redirect() calls happen inside dal.ts (not here) — AdminGuard is a
 * thin async wrapper that just awaits the guard then returns children.
 */

import * as React from "react";
import { verifyAdminSession } from "@/lib/auth/dal";

export interface AdminGuardProps {
  children: React.ReactNode;
}

export async function AdminGuard({
  children,
}: AdminGuardProps): Promise<React.ReactElement> {
  // verifyAdminSession() redirects internally on failure; if it returns,
  // the user is an admin and we can render the children.
  await verifyAdminSession();
  return <>{children}</>;
}
