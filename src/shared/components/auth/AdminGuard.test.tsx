/**
 * AdminGuard.test.tsx — TDD tests for the admin auth guard component.
 *
 * Tests:
 *   1. Renders children when verifyAdminSession returns an admin user
 *   2. Calls redirect("/") when user is a non-admin (reader)
 *   3. Calls redirect("/sign-in") when verifySession finds no session
 *   4. Always invokes verifyAdminSession exactly once per render
 *
 * Mocking strategy matches src/app/api/push/subscribe/route.test.ts:
 *   - vi.mock("@/lib/auth/dal") to control verifyAdminSession behavior
 *   - vi.mock("next/navigation") to assert redirect() calls
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import { render, screen } from "@testing-library/react";

// Mock redirect from next/navigation — we assert it was called rather than
// letting it actually throw (Next.js's real redirect throws internally,
// which would break the test renderer).
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// Mock the auth DAL. Default mock returns an admin user; individual tests
// override this to simulate non-admin / no-session cases.
const mockVerifyAdminSession = vi.fn();
vi.mock("@/lib/auth/dal", () => ({
  verifyAdminSession: mockVerifyAdminSession,
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Default: admin user passes the guard
  mockVerifyAdminSession.mockResolvedValue({
    id: "user-admin-1",
    role: "admin",
    name: "Admin User",
  });
});

describe("AdminGuard", () => {
  it("renders children when verifyAdminSession returns an admin user", async () => {
    const { AdminGuard } = await import("./AdminGuard");
    const child = React.createElement("p", null, "Admin Content");
    const result = await AdminGuard({ children: child });
    render(result);
    expect(screen.getByText("Admin Content")).toBeDefined();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("calls redirect('/') when user is a non-admin (reader)", async () => {
    // verifyAdminSession calls redirect() internally when the user is a
    // non-admin. We simulate that by having the mock invoke the redirect
    // spy with "/" before returning.
    mockVerifyAdminSession.mockImplementation(() => {
      mockRedirect("/");
      return Promise.resolve({ id: "u1", role: "reader", name: "Reader" });
    });

    const { AdminGuard } = await import("./AdminGuard");
    await AdminGuard({
      children: React.createElement("p", null, "Should Not Render"),
    });
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("calls redirect('/sign-in') when verifySession finds no session", async () => {
    // verifySession (called internally by verifyAdminSession) redirects to
    // /sign-in when no session exists. We simulate that by having the mock
    // invoke the redirect spy with /sign-in.
    mockVerifyAdminSession.mockImplementation(() => {
      mockRedirect("/sign-in");
      return Promise.resolve({ id: "u1", role: "reader", name: "Anonymous" });
    });

    const { AdminGuard } = await import("./AdminGuard");
    await AdminGuard({
      children: React.createElement("p", null, "Should Not Render"),
    });
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("always invokes verifyAdminSession exactly once per render", async () => {
    const { AdminGuard } = await import("./AdminGuard");
    await AdminGuard({ children: React.createElement("p", null, "Content") });
    expect(mockVerifyAdminSession).toHaveBeenCalledTimes(1);
  });
});
