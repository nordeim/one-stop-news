"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/shared/lib/utils";
import { Search } from "lucide-react";
import { UserMenu } from "./UserMenu";

/**
 * Header — Sticky editorial masthead with category navigation.
 *
 * PRD §4.3, PAD §5.5, HTML Mockup §2–3
 * - Sticky with `backdrop-blur-sm bg-paper-50/90`
 * - Newspaper-style wordmark in Newsreader 800
 * - Desktop: horizontal category tabs with colour dots
 * - Mobile: hamburger menu trigger (Radix Dialog)
 * - Search icon button routing to `/search`
 */

/* ─── Category Configuration ───────────────────────────────────────────── */
export const CATEGORIES = [
  {
    slug: "top-stories",
    name: "Top Stories",
    colourClass: "bg-dispatch-ember",
    activeBorder: "border-dispatch-ember",
  },
  {
    slug: "local",
    name: "Local",
    colourClass: "bg-dispatch-clay",
    activeBorder: "border-dispatch-clay",
  },
  {
    slug: "tech",
    name: "Tech",
    colourClass: "bg-dispatch-slate",
    activeBorder: "border-dispatch-slate",
  },
  {
    slug: "global",
    name: "Global",
    colourClass: "bg-dispatch-slate",
    activeBorder: "border-dispatch-slate",
  },
  {
    slug: "finance",
    name: "Finance",
    colourClass: "bg-dispatch-sage",
    activeBorder: "border-dispatch-sage",
  },
  {
    slug: "politics",
    name: "Politics",
    colourClass: "bg-dispatch-clay",
    activeBorder: "border-dispatch-clay",
  },
  {
    slug: "culture",
    name: "Culture",
    colourClass: "bg-dispatch-violet",
    activeBorder: "border-dispatch-violet",
  },
];

/* ─── Component Interface ─────────────────────────────────────────────── */
export interface HeaderProps {
  /** Explicitly set the active category. Falls back to deriving from `usePathname()`. */
  activeCategory?: string;
  className?: string;
}

/* ─── Component ───────────────────────────────────────────────────────── */
export function Header({
  activeCategory: activeCategoryProp,
  className,
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Derive activeCategory from explicit prop or current URL path
  const activeCategory = React.useMemo(() => {
    if (activeCategoryProp) return activeCategoryProp;
    const parts = pathname?.split("/");
    if (parts?.[1] === "topics" && parts[2]) return parts[2];
    return "top-stories";
  }, [activeCategoryProp, pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-paper-50/95 backdrop-blur-sm border-b border-paper-200",
        className,
      )}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row: wordmark + actions */}
        <div className="flex items-center justify-between py-4">
          {/* Wordmark */}
          <Link
            href="/"
            className="font-editorial text-xl tracking-tight text-ink-900 hover:text-dispatch-ember transition-colors duration-150"
          >
            OneStopNews
          </Link>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/search"
              className="inline-flex items-center justify-center h-9 w-9 rounded-sm text-ink-400 hover:text-ink-900 hover:bg-paper-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
              aria-label="Search news"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </Link>
            {/* Phase 19 (H2): Auth-aware user menu — Sign In link when
                unauthenticated, Sign Out button when authenticated. */}
            <UserMenu />
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-sm text-ink-600 hover:bg-paper-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Desktop category nav */}
        <nav
          className="hidden md:flex items-center gap-1 py-2 overflow-x-auto category-nav"
          aria-label="Topic categories"
          role="tablist"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.slug;
            return (
              <Link
                key={cat.slug}
                href={`/topics/${cat.slug}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-150 rounded-t-sm",
                  isActive
                    ? `${cat.activeBorder} text-ink-900 bg-dispatch-ember-light/40`
                    : "border-transparent text-ink-600 hover:text-ink-900 hover:bg-paper-100",
                )}
                role="tab"
                aria-selected={isActive}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    cat.colourClass,
                  )}
                  aria-hidden="true"
                />
                {cat.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile menu dialog */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-paper-50 p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="font-editorial text-lg text-ink-900">
                OneStopNews
              </span>
              <Dialog.Close asChild>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-400 hover:bg-paper-100 hover:text-ink-900 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
                  aria-label="Close menu"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-2">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.slug;
                return (
                  <Link
                    key={cat.slug}
                    href={`/topics/${cat.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-sm transition-colors duration-150",
                      isActive
                        ? "bg-dispatch-ember-light/40 text-ink-900"
                        : "text-ink-600 hover:bg-paper-100 hover:text-ink-900",
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        cat.colourClass,
                      )}
                      aria-hidden="true"
                    />
                    {cat.name}
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-paper-200">
              <Link
                href="/search"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-paper-100 hover:text-ink-900 rounded-sm transition-colors duration-150"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Search
              </Link>
              {/* Phase 19 (H2): Auth-aware user menu in mobile drawer too. */}
              <div className="mt-2">
                <UserMenu />
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
