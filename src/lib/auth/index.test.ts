/**
 * index.test.ts — Tests for auth configuration.
 *
 * Verifies that the NextAuth callbacks correctly propagate `id` and `role`
 * into the JWT and Session objects without type assertion bypasses.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock the auth config before importing so the callbacks can be tested in isolation.
vi.mock("@auth/drizzle-adapter", () => ({
  DrizzleAdapter: vi.fn().mockReturnValue({}),
}));

// Capture the callbacks configuration for testing.
let capturedCallbacks: Record<string, (...args: unknown[]) => unknown> = {};

vi.mock("next-auth", () => ({
  default: vi.fn().mockImplementation((config) => {
    capturedCallbacks = config.callbacks;
    return {
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  }),
}));

describe("auth callbacks", () => {
  beforeAll(async () => {
    // Trigger the module evaluation to capture the callbacks.
    await import("./index");
  });

  it("jwt callback sets token.id and token.role from user", () => {
    const jwtCallback = capturedCallbacks.jwt as (params: {
      token: Record<string, unknown>;
      user: Record<string, unknown>;
      trigger?: string;
      session?: Record<string, unknown>;
    }) => Record<string, unknown>;

    const token = {};
    const user = { id: "user-123", role: "admin" };

    const result = jwtCallback({ token, user, trigger: "signIn" });

    expect(result).toMatchObject({
      id: "user-123",
      role: "admin",
    });
  });

  it("jwt callback defaults role to 'reader' when user role is absent", () => {
    const jwtCallback = capturedCallbacks.jwt as (params: {
      token: Record<string, unknown>;
      user: Record<string, unknown>;
      trigger?: string;
      session?: Record<string, unknown>;
    }) => Record<string, unknown>;

    const token = {};
    const user = { id: "user-456" };

    const result = jwtCallback({ token, user, trigger: "signIn" });

    expect(result).toMatchObject({
      id: "user-456",
      role: "reader",
    });
  });

  it("session callback propagates token.id and token.role to session.user", () => {
    const sessionCallback = capturedCallbacks.session as (params: {
      session: { user: Record<string, unknown> };
      token: Record<string, unknown>;
    }) => { user: Record<string, unknown> };

    const session = { user: { name: "Test", email: "test@example.com" } };
    const token = { id: "user-789", role: "admin" };

    const result = sessionCallback({ session, token });

    expect(result.user).toMatchObject({
      id: "user-789",
      role: "admin",
      name: "Test",
      email: "test@example.com",
    });
  });
});
