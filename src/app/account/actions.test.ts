import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * linkOAuthProvider server action tests — Phase 19+ remediation, Batch 3 / F2.
 *
 * These tests verify the server action that allows a user to manually link
 * a new OAuth provider (Google / GitHub) to their existing account. This
 * closes the gap documented in lib/auth/index.ts:signIn() TODO and the
 * AuthErrorMessage.tsx "link from your account settings" message that
 * previously pointed to a non-existent page.
 *
 * Behavior contract:
 *   - Requires authenticated session (calls verifySession first)
 *   - Validates the provider name is one of "google" | "github"
 *   - Returns early with `{ status: "already_linked" }` if the provider is already linked
 *   - Inserts a new row in the `accounts` table with the current user's ID
 *   - Returns `{ status: "linked", provider }` on success
 *   - Returns `{ status: "error", message }` on DB failure
 */

// Mock verifySession — defaults to an authenticated reader user.
const { mockVerifySession } = vi.hoisted(() => ({
  mockVerifySession: vi.fn(),
}));
vi.mock("@/lib/auth/dal", () => ({
  verifySession: mockVerifySession,
  verifyAdminSession: mockVerifySession,
}));

// Mock the db — capture insert calls + setup select chain.
// The select chain is established once at module load; per-test overrides
// use mockResolvedValueOnce on mockWhereResult.
const mockValues = vi.fn();
const mockOnConflictDoNothing = vi.fn().mockReturnThis();
const mockWhereResult = vi.fn().mockResolvedValue([]);

vi.mock("@/lib/db", () => {
  const selectChain = {
    from: () => ({
      where: mockWhereResult,
    }),
  };
  return {
    db: {
      insert: () => ({
        values: mockValues.mockReturnValue({
          onConflictDoNothing: mockOnConflictDoNothing,
        }),
      }),
      select: () => selectChain,
      query: {
        accounts: {
          findFirst: vi.fn(),
        },
      },
    },
  };
});

// Mock the accounts schema export (the action references it for the where clause).
vi.mock("@/lib/db/schema", () => ({
  accounts: {
    userId: "user_id",
    provider: "provider",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // onConflictDoNothing should return a resolved promise by default (success case)
  mockOnConflictDoNothing.mockResolvedValue(undefined);
  mockWhereResult.mockResolvedValue([]);
  mockVerifySession.mockResolvedValue({
    user: { id: "user-123", role: "reader", name: "Test User" },
    sessionId: "session-123",
  });
});

describe("linkOAuthProvider server action", () => {
  it("is exported as a function", async () => {
    const { linkOAuthProvider } = await import("./actions");
    expect(typeof linkOAuthProvider).toBe("function");
  });

  it("calls verifySession first (auth required)", async () => {
    const { linkOAuthProvider } = await import("./actions");
    await linkOAuthProvider("google");
    expect(mockVerifySession).toHaveBeenCalled();
  });

  it("rejects invalid provider names", async () => {
    const { linkOAuthProvider } = await import("./actions");
    const result = await linkOAuthProvider("facebook" as "google");
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).toMatch(/invalid provider/i);
    }
  });

  it("returns 'already_linked' when the provider is already linked to this user", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.query.accounts.findFirst).mockResolvedValueOnce({
      id: "acc-1",
      userId: "user-123",
      provider: "google",
      providerAccountId: "g-123",
    } as never);

    const { linkOAuthProvider } = await import("./actions");
    const result = await linkOAuthProvider("google");

    expect(result.status).toBe("already_linked");
    if (result.status === "already_linked") {
      expect(result.provider).toBe("google");
    }
  });

  it("inserts a new account row with the current user's ID and provider", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.query.accounts.findFirst).mockResolvedValueOnce(undefined);

    const { linkOAuthProvider } = await import("./actions");
    const result = await linkOAuthProvider("google");

    expect(result.status).toBe("linked");
    if (result.status === "linked") {
      expect(result.provider).toBe("google");
    }
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        provider: "google",
      }),
    );
  });

  it("returns 'error' status when db insert fails", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.query.accounts.findFirst).mockResolvedValueOnce(undefined);
    // The production code awaits .values(...).onConflictDoNothing(), so the
    // rejection must come from onConflictDoNothing, not values.
    mockOnConflictDoNothing.mockRejectedValueOnce(
      new Error("DB connection lost"),
    );

    const { linkOAuthProvider } = await import("./actions");
    const result = await linkOAuthProvider("github");

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).toMatch(/db connection lost/i);
    }
  });

  it("supports both 'google' and 'github' providers", async () => {
    const { db } = await import("@/lib/db");
    // Each call to findFirst should return undefined (not yet linked)
    vi.mocked(db.query.accounts.findFirst)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const { linkOAuthProvider } = await import("./actions");
    const googleResult = await linkOAuthProvider("google");
    const githubResult = await linkOAuthProvider("github");
    expect(googleResult.status).toBe("linked");
    if (googleResult.status === "linked") {
      expect(googleResult.provider).toBe("google");
    }
    expect(githubResult.status).toBe("linked");
    if (githubResult.status === "linked") {
      expect(githubResult.provider).toBe("github");
    }
  });
});

describe("getLinkedProviders (read query for /account page)", () => {
  it("is exported as a function", async () => {
    const { getLinkedProviders } = await import("./actions");
    expect(typeof getLinkedProviders).toBe("function");
  });

  it("calls verifySession first (auth required)", async () => {
    const { getLinkedProviders } = await import("./actions");
    await getLinkedProviders();
    expect(mockVerifySession).toHaveBeenCalled();
  });

  it("returns the list of provider names already linked to the current user", async () => {
    // Override the default empty array for this test
    mockWhereResult.mockResolvedValueOnce([
      { provider: "google" },
      { provider: "credentials" },
    ]);

    const { getLinkedProviders } = await import("./actions");
    const result = await getLinkedProviders();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain("google");
    expect(result).toContain("credentials");
  });

  it("returns ['credentials'] when no OAuth providers are linked", async () => {
    mockWhereResult.mockResolvedValueOnce([{ provider: "credentials" }]);

    const { getLinkedProviders } = await import("./actions");
    const result = await getLinkedProviders();

    expect(result).toEqual(["credentials"]);
  });
});
