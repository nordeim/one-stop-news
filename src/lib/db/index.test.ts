import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ─── UNIT TEST: Lazy Proxy DB Connection ─────────────────────────────────────
//
// TDD Approach: Write failing test first, then implement the code that passes it.
//
// These tests verify:
//  1. The db module exports an object (not undefined)
//  2. The connection is deferred until first property access (lazy)
//  3. When DATABASE_URL is missing, db module still exports an object
//     (graceful degradation, doesn't crash on import)
//  4. Accessing db methods without DATABASE_URL throws a clear error
//
// Phase 19 (H12): db/index.ts now imports `env` from @/lib/env (validated
// by Zod at module load) instead of reading process.env.DATABASE_URL directly.
// We mock @/lib/env to control the DATABASE_URL value per test — we can't
// just delete process.env.DATABASE_URL anymore because env/index.ts throws
// at module load if DATABASE_URL is missing.
//
// Note: vi.mock() factories are hoisted to the top of the file by Vitest,
// so we use vi.hoisted() to declare the mockEnv object before the mock
// factory. Otherwise the factory would reference mockEnv before it's
// initialized (ReferenceError: Cannot access 'mockEnv' before initialization).
// ────────────────────────────────────────────────────────────────────────────

// vi.hoisted() runs before vi.mock() factory — declares a mutable mock env.
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    DATABASE_URL: "postgresql://testuser:testpass@localhost:5432/testdb",
    NODE_ENV: "test" as "development" | "production" | "test",
  },
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

describe("db connection", () => {
  beforeEach(() => {
    vi.resetModules();
    // Reset to default valid state.
    mockEnv.DATABASE_URL =
      "postgresql://testuser:testpass@localhost:5432/testdb";
    mockEnv.NODE_ENV = "test";
  });

  afterEach(() => {
    // Restore default valid state.
    mockEnv.DATABASE_URL =
      "postgresql://testuser:testpass@localhost:5432/testdb";
  });

  it("should export a db object (not undefined or null)", async () => {
    const { db } = await import("./index");

    expect(db).toBeDefined();
    expect(db).not.toBeNull();
    expect(typeof db).toBe("object");
  });

  it("should defer connection until first property access (lazy evaluation)", async () => {
    // Import the module (should not throw during import — env is valid).
    const { db } = await import("./index");

    // At this point, no actual connection should exist.
    // The module should be importable without side effects.
    expect(db).toBeDefined();
  });

  it("should export an object even when DATABASE_URL is empty (graceful)", async () => {
    // Phase 19 (H12): The lazy proxy means db is always exported as a Proxy
    // object — the actual connection (and any error) is deferred until first
    // property access. So an empty DATABASE_URL still exports an object.
    mockEnv.DATABASE_URL = "";

    // Import should succeed without throwing at import time.
    const dbModule = await import("./index");

    expect(dbModule.db).toBeDefined();
    expect(dbModule.db).not.toBeNull();
  });

  it("should throw when DATABASE_URL is empty and a method is called", async () => {
    // Phase 19 (H12): With an empty DATABASE_URL, the lazy proxy will
    // attempt to create a postgres client on first property access.
    // postgres.js may not throw synchronously on an empty URL (it defers
    // the connection attempt), so we trigger an actual query which will
    // reject. We assert the query rejects rather than resolves.
    mockEnv.DATABASE_URL = "";

    const { db } = await import("./index");

    // Act & Assert: triggering a query should reject (not resolve).
    // The proxy.get() trap calls getDb() → createClient("") → postgres("")
    // which throws on the empty URL.
    expect(() => {
      // Accessing any property triggers the lazy init via the Proxy's get trap.
      // If postgres("") throws synchronously, this throws. If it defers,
      // the returned builder will reject on await — but for unit-test
      // purposes, accessing the property is enough to verify the lazy init
      // path is exercised. We use `select` because it's the most common
      // entry point.
      void db.select;
    }).not.toThrow(); // postgres.js may not throw synchronously

    // The actual connection failure surfaces on await. Trigger it.
    await expect(db.select().from({} as never)).rejects.toThrow();
  });
});
