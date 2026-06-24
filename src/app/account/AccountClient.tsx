"use client";

import { useTransition } from "react";
import { linkOAuthProvider, type LinkedProviderList } from "./actions";

/**
 * AccountClient — Client component for the /account page.
 *
 * Renders the list of linked providers + buttons to link new OAuth providers.
 * Uses useTransition for instant UI feedback (button disables + shows
 * "Linking..." during the server action).
 */

interface AccountClientProps {
  linkedProviders: LinkedProviderList;
}

const OAUTH_PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
};

// Only show "Link" buttons for OAuth providers we support.
const LINKABLE_PROVIDERS = ["google", "github"] as const;

export function AccountClient({ linkedProviders }: AccountClientProps) {
  const [isPending, startTransition] = useTransition();

  function handleLink(provider: string) {
    startTransition(async () => {
      const result = await linkOAuthProvider(provider);
      if (result.status === "linked") {
        // Refresh the page to show the updated provider list
        window.location.reload();
      } else if (result.status === "already_linked") {
        // Already linked — nothing to do
      } else {
        // Error — surface to the user
        alert(`Failed to link ${provider}: ${result.message}`);
      }
    });
  }

  return (
    <section aria-label="Authentication providers" className="space-y-6">
      <div>
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-ink-300">
          Currently linked
        </h2>
        <ul className="mt-3 space-y-2">
          {linkedProviders.map((provider) => (
            <li
              key={provider}
              className="flex items-center justify-between border-b border-ink-100 py-2"
            >
              <span className="font-ui text-base text-ink-900">
                {OAUTH_PROVIDER_LABELS[provider] ?? provider}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-dispatch-sage">
                Active
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-ink-300">
          Link a new provider
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Linking a provider lets you sign in with it in the future. You can
          unlink a provider at any time by contacting support.
        </p>
        <div className="mt-4 flex gap-3">
          {LINKABLE_PROVIDERS.map((provider) => {
            const isLinked = linkedProviders.includes(provider);
            return (
              <button
                key={provider}
                type="button"
                onClick={() => handleLink(provider)}
                disabled={isLinked || isPending}
                className="btn-ember rounded px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2"
                aria-label={`Link ${OAUTH_PROVIDER_LABELS[provider]} as a sign-in provider`}
              >
                {isPending
                  ? "Linking..."
                  : isLinked
                    ? "Linked"
                    : `Link ${OAUTH_PROVIDER_LABELS[provider]}`}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
