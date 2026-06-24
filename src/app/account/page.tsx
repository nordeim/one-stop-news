import { Suspense } from "react";
import { verifySession } from "@/lib/auth/dal";
import { getLinkedProviders } from "./actions";
import { AccountClient } from "./AccountClient";

/**
 * /account — Account settings page.
 *
 * Phase 19+ remediation, Batch 3 / F2.
 *
 * Shows the user's currently-linked auth providers (Credentials + any OAuth)
 * and lets them initiate linking a new OAuth provider.
 *
 * The page shell is synchronous; all data access (verifySession +
 * getLinkedProviders) happens inside the Suspense-wrapped AccountData
 * component, satisfying Next.js 16 cacheComponents requirements.
 */

/* ------------------------------------------------------------------ */
/* Skeleton (rendered by Suspense while AccountData fetches)          */
/* ------------------------------------------------------------------ */
function AccountSkeleton() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-paper-50 text-ink-600 font-ui"
    >
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 border-b border-ink-100 pb-6 animate-pulse">
          <div className="h-3 w-16 bg-ink-200 rounded mb-4" />
          <div className="h-9 w-64 bg-ink-200 rounded mb-2" />
          <div className="h-4 w-48 bg-ink-100 rounded mt-2" />
        </div>
        <div className="space-y-4">
          <div className="h-16 bg-ink-100 rounded" />
          <div className="h-16 bg-ink-100 rounded" />
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Async data component (Server Component)                             */
/* ------------------------------------------------------------------ */
async function AccountData() {
  const { user } = await verifySession();
  const linkedProviders = await getLinkedProviders();

  return (
    <main
      id="main-content"
      className="min-h-screen bg-paper-50 text-ink-600 font-ui"
    >
      <div className="mx-auto max-w-2xl px-6 py-12">
        <header className="mb-8 border-b border-ink-100 pb-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-300">
            Account
          </p>
          <h1 className="mt-2 font-editorial text-3xl font-[800] leading-tight tracking-[-0.02em] text-ink-900">
            Linked Providers
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Signed in as{" "}
            <span className="font-mono text-ink-900">
              {user.name ?? user.id}
            </span>
          </p>
        </header>

        <AccountClient linkedProviders={linkedProviders} />
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Page shell (synchronous — delegates data fetch to AccountData)      */
/* ------------------------------------------------------------------ */
export default function AccountPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <AccountData />
    </Suspense>
  );
}
