import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock window.matchMedia for RevealProvider (now rendered inside the page)
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

// Mock next-auth/react so UserMenu (rendered inside Header) doesn't throw
// "useSession must be wrapped in <SessionProvider>" during unit tests.
// In production, SessionProvider wraps the entire app in layout.tsx.
vi.mock("next-auth/react", () => ({
  useSession: vi
    .fn()
    .mockReturnValue({ data: null, status: "unauthenticated" }),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock FeedData to avoid DB access during the unit test.
vi.mock("@/features/feed/components/FeedData", () => ({
  FeedData: () => <div data-testid="feed-data-mock" />,
}));

import HomePage from "./page";

describe("HomePage", () => {
  it("renders without errors", () => {
    const { container } = render(<HomePage />);
    expect(container).toBeDefined();
  });

  it("has a <main> element with id='main-content' as the skip-link target", () => {
    // The skip link in layout.tsx points to #main-content; every page must
    // render a <main id="main-content"> for the skip link to work.
    const { container } = render(<HomePage />);
    const main = container.querySelector("main#main-content");
    expect(main).not.toBeNull();
  });
});
