/**
 * page.tsx — Auth error page.
 *
 * Referenced in src/lib/auth/index.ts `pages.error: "/auth-error"`.
 * Auth.js v5 redirects here when a sign-in flow fails (e.g., OAuth provider
 * returns an error, Credentials validation fails, session expired).
 *
 * The actual error reason is passed via the `?error=` query param. We render
 * a calm, on-brand error page with a link back to /sign-in.
 *
 * Phase 19 (M6): Added a specific message for `OAuthAccountNotLinked` —
 * when a user signs in with Credentials first, then tries OAuth with the
 * same email, Auth.js throws this error. The message tells the user to
 * sign in with their original method first.
 */

import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/shared/components/layout/Header";
import { AuthErrorMessage } from "./AuthErrorMessage";

export const metadata = {
  title: "Authentication Error",
  description: "An error occurred during sign-in.",
};

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-paper-50">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main
        id="main-content"
        className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12"
      >
        <div className="max-w-3xl mx-auto py-24 text-center">
          <span
            className="block w-1.5 h-1.5 rounded-full bg-dispatch-ember mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-300 mb-2">
            Authentication Error
          </p>
          <h1 className="font-editorial text-3xl text-ink-900 mb-4 leading-tight">
            Sign-in failed
          </h1>
          {/* Phase 19 (M6): Render an actionable message based on the
              ?error= query param. AuthErrorMessage is a client component
              that reads useSearchParams() — wrapped in Suspense because
              useSearchParams requires a Suspense boundary in Next.js 16. */}
          <Suspense
            fallback={
              <p className="font-ui text-sm text-ink-600 mb-8 max-w-md mx-auto">
                Something went wrong during the sign-in process. Please try
                again.
              </p>
            }
          >
            <AuthErrorMessage />
          </Suspense>
          <Link
            href="/sign-in"
            className="font-mono text-[11px] uppercase tracking-widest text-dispatch-ember hover:underline"
          >
            ← Back to Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}
