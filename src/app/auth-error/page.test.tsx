/**
 * page.test.tsx — Tests for the /auth-error page.
 *
 * Verifies:
 *   1. The page renders a <main> element with id="main-content" (skip-link target)
 *   2. The page renders the "Sign-in failed" heading
 *   3. The page renders a link back to /sign-in
 *
 * The skip-link target test ensures WCAG AAA compliance — every page template
 * must include <main id="main-content"> for the skip-to-content link in the
 * root layout to have a valid target.
 */

import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the Header component (Client Component — avoid usePathname in test)
vi.mock("@/shared/components/layout/Header", () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

// Phase 19 (M6): Mock AuthErrorMessage so the test doesn't need a
// NextNavigationProvider wrapper (useSearchParams requires it). The
// AuthErrorMessage component is tested separately.
vi.mock("./AuthErrorMessage", () => ({
  AuthErrorMessage: () => <p>Mocked error message</p>,
}));

const { default: AuthErrorPage } = await import("./page");

describe("AuthErrorPage", () => {
  it("renders a <main> element with id='main-content' as the skip-link target", () => {
    const { container } = render(<AuthErrorPage />);
    const main = container.querySelector("main#main-content");
    expect(main).not.toBeNull();
  });

  it("renders the 'Sign-in failed' heading", () => {
    render(<AuthErrorPage />);
    expect(
      screen.getByRole("heading", { name: /sign-in failed/i }),
    ).toBeDefined();
  });

  it("renders a link back to /sign-in", () => {
    render(<AuthErrorPage />);
    const signInLink = screen.getByRole("link", { name: /back to sign in/i });
    expect(signInLink).toBeDefined();
    expect(signInLink.getAttribute("href")).toBe("/sign-in");
  });
});
