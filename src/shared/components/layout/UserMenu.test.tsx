/**
 * UserMenu.test.tsx — Tests for the auth-aware user menu in the Header.
 *
 * Phase 19 (High H2): The Header had no sign-in/sign-out button. Users could
 * only sign in by typing /sign-in directly, and could not sign out from any
 * page. This new client component renders:
 *   - "Sign In" link to /sign-in when unauthenticated
 *   - "Sign Out" button (form action calling signOut()) when authenticated
 *
 * Wrapped in SessionProvider so useSession() works in tests.
 */

import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next-auth/react — we control the session state per test.
const mockUseSession = vi.fn();
const mockSignOut = vi.fn().mockImplementation(async () => Promise.resolve());
vi.mock("next-auth/react", () => ({
  useSession: mockUseSession,
  signOut: mockSignOut,
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Import after mocks are registered.
const { UserMenu } = await import("./UserMenu");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UserMenu — unauthenticated state", () => {
  it("renders 'Sign In' link pointing to /sign-in", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<UserMenu />);
    const signInLink = screen.getByRole("link", { name: /sign in/i });
    expect(signInLink).toBeDefined();
    expect(signInLink.getAttribute("href")).toBe("/sign-in");
  });

  it("does not render Sign Out button when unauthenticated", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<UserMenu />);
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
  });
});

describe("UserMenu — authenticated state", () => {
  it("renders 'Sign Out' button when session is present", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "u1",
          name: "Alice",
          email: "alice@example.com",
          role: "reader",
        },
      },
      status: "authenticated",
    });
    render(<UserMenu />);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeDefined();
  });

  it("does not render Sign In link when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "u1",
          name: "Alice",
          email: "alice@example.com",
          role: "reader",
        },
      },
      status: "authenticated",
    });
    render(<UserMenu />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
  });

  it("Sign Out button has focus-visible:ring-* classes (WCAG AAA)", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "u1",
          name: "Alice",
          email: "alice@example.com",
          role: "reader",
        },
      },
      status: "authenticated",
    });
    render(<UserMenu />);
    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    expect(signOutButton.className).toMatch(/focus-visible:ring/);
  });
});

describe("UserMenu — loading state", () => {
  it("renders nothing while session status is 'loading'", () => {
    mockUseSession.mockReturnValue({ data: null, status: "loading" });
    const { container } = render(<UserMenu />);
    expect(container.textContent).toBe("");
  });
});
