"use client";

/**
 * AuthErrorMessage — Client component that reads the ?error= query param
 * and renders an actionable message.
 *
 * Phase 19 (M6): Previously the auth-error page rendered a generic
 * "Something went wrong" message regardless of the error type. Now we
 * detect the `OAuthAccountNotLinked` error specifically and link the user
 * to /account where they can link the new provider.
 *
 * Phase 19+ remediation (Batch 3 / F2): The "link from your account settings"
 * text now links to the actual /account page (which previously didn't exist).
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function AuthErrorMessage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (error === "OAuthAccountNotLinked") {
    return (
      <div className="font-ui text-sm text-ink-600 mb-8 max-w-md mx-auto space-y-3">
        <p>
          An account with this email already exists using a different sign-in
          method. Please sign in with your original method first, then link the
          new provider from your account settings.
        </p>
        <p>
          <Link
            href="/account"
            className="font-mono text-[10px] uppercase tracking-widest text-dispatch-ember underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2"
          >
            Go to account settings →
          </Link>
        </p>
      </div>
    );
  }

  if (error === "CredentialsSignin") {
    return (
      <p className="font-ui text-sm text-ink-600 mb-8 max-w-md mx-auto">
        Invalid email or password. Please check your credentials and try again.
      </p>
    );
  }

  if (error === "AccessDenied") {
    return (
      <p className="font-ui text-sm text-ink-600 mb-8 max-w-md mx-auto">
        Access denied. You may not have permission to sign in, or your account
        has been disabled. Contact an administrator if you believe this is an
        error.
      </p>
    );
  }

  if (error === "Verification") {
    return (
      <p className="font-ui text-sm text-ink-600 mb-8 max-w-md mx-auto">
        The sign-in link has expired or already been used. Please request a new
        sign-in link.
      </p>
    );
  }

  // Default: unknown error.
  return (
    <p className="font-ui text-sm text-ink-600 mb-8 max-w-md mx-auto">
      Something went wrong during the sign-in process. The link may have
      expired, the session may have timed out, or the provider may be
      temporarily unavailable. Please try again.
    </p>
  );
}
