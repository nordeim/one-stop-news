"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/Button";

/**
 * SignInClient — Client view for the /sign-in page.
 *
 * Receives `showGoogle` and `showGithub` as props from the Server Component
 * parent (which inspects env vars at request time). Renders the appropriate
 * combination of OAuth buttons + Credentials form.
 *
 * Accessibility:
 *   - Single `<h1>` for page heading
 *   - Form `<label>` elements associated with inputs via htmlFor/id
 *   - OAuth buttons use `aria-label` for explicit identification
 *   - Back-to-home link has descriptive accessible name
 */
interface SignInClientProps {
  /** Whether to render the Google OAuth button. */
  showGoogle: boolean;
  /** Whether to render the GitHub OAuth button. */
  showGithub: boolean;
}

export function SignInClient({ showGoogle, showGithub }: SignInClientProps) {
  return (
    <main
      id="main-content"
      className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16"
    >
      <div className="w-full max-w-md">
        {/* Heading */}
        <header className="text-center mb-10">
          <span
            className="block w-1.5 h-1.5 rounded-full bg-dispatch-ember mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-300 mb-2">
            OneStopNews
          </p>
          <h1 className="font-editorial text-3xl text-ink-900 leading-tight">
            Sign In
          </h1>
        </header>

        {/* OAuth buttons (server-action forms — progressive enhancement) */}
        {(showGoogle || showGithub) && (
          <div className="space-y-3 mb-6">
            {showGoogle && (
              <form action="/api/auth/signin/google" method="post">
                <Button
                  type="submit"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  aria-label="Sign in with Google"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </Button>
              </form>
            )}
            {showGithub && (
              <form action="/api/auth/signin/github" method="post">
                <Button
                  type="submit"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  aria-label="Sign in with GitHub"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Sign in with GitHub
                </Button>
              </form>
            )}
          </div>
        )}

        {/* Divider (only shown if OAuth options exist) */}
        {(showGoogle || showGithub) && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-paper-50 px-3 font-mono text-[10px] uppercase tracking-widest text-ink-300">
                or
              </span>
            </div>
          </div>
        )}

        {/* Credentials form (server action) */}
        <form
          action="/api/auth/callback/credentials"
          method="post"
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="block font-mono text-[10px] uppercase tracking-widest text-ink-600 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              className="w-full h-10 px-3 rounded-sm border border-ink-100 bg-paper-50 text-ink-900 font-ui text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block font-mono text-[10px] uppercase tracking-widest text-ink-600 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full h-10 px-3 rounded-sm border border-ink-100 bg-paper-50 text-ink-900 font-ui text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            aria-label="Sign in with credentials"
          >
            Sign in with Credentials
          </Button>
        </form>

        {/* Back to home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-widest text-ink-600 hover:text-dispatch-ember transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
