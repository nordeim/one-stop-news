import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Phase 19 (H12): providers.ts now reads OAuth env vars via the typed `env`
 * export (validated by Zod at module load) instead of process.env.* directly.
 * This means tests can't mutate process.env to control provider selection —
 * we must mock the `@/lib/env` module and provide a mutable `env` object.
 *
 * The mock object is reset before each test to ensure isolation.
 *
 * Note: vi.mock() factories are hoisted to the top of the file by Vitest,
 * so we use vi.hoisted() to declare the mockEnv object before the mock
 * factory. Otherwise the factory would reference mockEnv before it's
 * initialized (ReferenceError: Cannot access 'mockEnv' before initialization).
 */

// vi.hoisted() runs before vi.mock() factory — declares a mutable mock env.
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {} as {
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
  },
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

// Mock the DB so the Credentials provider's authorize() doesn't try to
// query Postgres during these unit tests.
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([])) })),
      })),
    })),
  },
}));

import { buildProviders } from "./providers";

/**
 * Helper: extract the `id` from each provider safely.
 *
 * Auth.js v5's `Provider` type is a union of (a) configured provider objects
 * (which have `id`) and (b) a function form (which doesn't). At runtime,
 * `buildProviders()` always returns configured objects, so this narrowing is
 * safe. We use `'id' in p` to satisfy TypeScript's narrowing rules.
 */
function providerIds(providers: ReturnType<typeof buildProviders>): string[] {
  return providers.map((p) => ("id" in p ? p.id : "unknown"));
}

describe("buildProviders", () => {
  beforeEach(() => {
    // Reset all OAuth env vars before each test
    delete mockEnv.GOOGLE_CLIENT_ID;
    delete mockEnv.GOOGLE_CLIENT_SECRET;
    delete mockEnv.GITHUB_CLIENT_ID;
    delete mockEnv.GITHUB_CLIENT_SECRET;
  });

  it("returns only the credentials provider when no OAuth env vars are set", () => {
    const providers = buildProviders();
    expect(providers).toHaveLength(1);
    expect(providerIds(providers)[0]).toBe("credentials");
  });

  it("includes Google provider when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set", () => {
    mockEnv.GOOGLE_CLIENT_ID = "google-id-123";
    mockEnv.GOOGLE_CLIENT_SECRET = "google-secret-456";

    const providers = buildProviders();
    const ids = providerIds(providers);
    expect(ids).toContain("credentials");
    expect(ids).toContain("google");
  });

  it("includes GitHub provider when GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set", () => {
    mockEnv.GITHUB_CLIENT_ID = "github-id-123";
    mockEnv.GITHUB_CLIENT_SECRET = "github-secret-456";

    const providers = buildProviders();
    const ids = providerIds(providers);
    expect(ids).toContain("credentials");
    expect(ids).toContain("github");
  });

  it("includes all three providers when all OAuth env vars are set", () => {
    mockEnv.GOOGLE_CLIENT_ID = "google-id-123";
    mockEnv.GOOGLE_CLIENT_SECRET = "google-secret-456";
    mockEnv.GITHUB_CLIENT_ID = "github-id-123";
    mockEnv.GITHUB_CLIENT_SECRET = "github-secret-456";

    const providers = buildProviders();
    const ids = providerIds(providers).sort();
    expect(ids).toEqual(["credentials", "github", "google"]);
  });

  it("does NOT include Google provider if only GOOGLE_CLIENT_ID is set (missing secret)", () => {
    mockEnv.GOOGLE_CLIENT_ID = "google-id-123";
    // GOOGLE_CLIENT_SECRET intentionally not set

    const providers = buildProviders();
    const ids = providerIds(providers);
    expect(ids).not.toContain("google");
    expect(ids).toContain("credentials");
  });

  it("does NOT include GitHub provider if only GITHUB_CLIENT_SECRET is set (missing id)", () => {
    // GITHUB_CLIENT_ID intentionally not set
    mockEnv.GITHUB_CLIENT_SECRET = "github-secret-456";

    const providers = buildProviders();
    const ids = providerIds(providers);
    expect(ids).not.toContain("github");
    expect(ids).toContain("credentials");
  });
});
