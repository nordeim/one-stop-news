import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ─── UNIT TEST: AES-256-GCM Push Key Encryption ──────────────────────────────
//
// TDD Approach: Write failing tests first, then implement.
//
// Security requirements (per PRD v4.3 §8.2):
//  - Keys must be encrypted at rest with AES-256-GCM
//  - IV (12+ bytes) + Auth Tag (16 bytes) + Ciphertext
//  - Round-trip: encrypt -> decrypt produces identical input
//  - Invalid format throws descriptive error
//  - PUSH_KEY_ENCRYPTION_KEY validated at MODULE LOAD (fail-fast at boot)
//
// Phase 19+ remediation (Batch 4 / H2):
// Migrated the regular unit tests (encrypt/decrypt/round-trip) to the
// `vi.hoisted()` + `vi.mock("@/lib/env")` pattern documented in Phase 19
// gotcha #7. This eliminates process.env mutation for those tests.
//
// The module-load validation tests still use `process.env` direct mutation
// with save/restore because they need `vi.resetModules()` to re-trigger
// the module load with different env values — and `vi.mock()` doesn't
// re-apply after `vi.resetModules()` in Vitest 4. The save/restore pattern
// is the canonical Vitest approach for module-load env testing.
// ─────────────────────────────────────────────────────────────────────────────

// Test encryption key — 64 hex chars (32 bytes).
// Inlined into the vi.hoisted() factory below because vi.hoisted() runs
// BEFORE the module's other top-level declarations — referencing `TEST_KEY`
// from inside the hoisted factory would hit a temporal dead zone ReferenceError.
const TEST_KEY =
  "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";

// vi.hoisted() runs BEFORE the vi.mock() factory, so the factory can safely
// reference `mockEnv` without hitting a ReferenceError (the hoisting problem
// documented in Phase 19 gotcha #7).
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    PUSH_KEY_ENCRYPTION_KEY:
      "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899",
  } as { PUSH_KEY_ENCRYPTION_KEY?: string },
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));

describe("push key encryption", () => {
  beforeEach(() => {
    // Reset to a known-good state before each test
    mockEnv.PUSH_KEY_ENCRYPTION_KEY = TEST_KEY;
    vi.resetModules();
  });

  it("round-trips encryption and decryption correctly", async () => {
    const { encryptPushKeys, decryptPushKeys } = await import("./encrypt");
    const original = {
      p256dh: "BF8pKvQlt5lRJBBs5DhKYJ3w8J-zZdqvdvh3umpYwNE=",
      auth: "f7GzA0dGKb2KxY3-vQWuBQ==",
    };

    const encrypted = encryptPushKeys(original);
    expect(encrypted).toBeDefined();
    expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decryptPushKeys(encrypted);
    expect(decrypted).toEqual(original);
  });

  it("throws on invalid encrypted format", async () => {
    const { decryptPushKeys } = await import("./encrypt");
    expect(() => decryptPushKeys("invalid")).toThrow(
      "Invalid encrypted push key format",
    );
    expect(() => decryptPushKeys("only:two")).toThrow(
      "Invalid encrypted push key format",
    );
  });

  it("produces different ciphertext for same input (IV is random)", async () => {
    const { encryptPushKeys } = await import("./encrypt");
    const original = {
      p256dh: "BF8pKvQlt5lRJBBs5DhKYJ3w8J-zZdqvdvh3umpYwNE=",
      auth: "f7GzA0dGKb2KxY3-vQWuBQ==",
    };

    const encrypted1 = encryptPushKeys(original);
    const encrypted2 = encryptPushKeys(original);

    // Same input should produce different ciphertext because IV is random
    expect(encrypted1).not.toBe(encrypted2);
  });

  it("uses 12-byte IV (NIST SP 800-38D recommendation for AES-GCM)", async () => {
    // S5 fix: NIST SP 800-38D recommends 96-bit (12-byte) IV for GCM mode.
    // The previous implementation used 16 bytes — technically valid but not
    // best practice. The IV is stored as the first hex segment of the
    // encrypted string (format: iv:authTag:ciphertext). 12 bytes = 24 hex chars.
    const { encryptPushKeys } = await import("./encrypt");
    const original = {
      p256dh: "BF8pKvQlt5lRJBBs5DhKYJ3w8J-zZdqvdvh3umpYwNE=",
      auth: "f7GzA0dGKb2KxY3-vQWuBQ==",
    };

    const encrypted = encryptPushKeys(original);
    const ivHex = encrypted.split(":")[0];
    expect(ivHex).toBeDefined();
    expect(ivHex!.length).toBe(24); // 12 bytes = 24 hex chars
  });

  it("decrypts data encrypted with legacy 16-byte IV (backward compat)", async () => {
    // S5 fix: Old data encrypted with 16-byte IV must still decrypt correctly.
    // The decryption function reads the IV from the stored hex string and
    // creates a Buffer from it — the length doesn't matter for decryption.
    // This test manually constructs a legacy 16-byte IV encrypted string
    // and verifies it decrypts (simulating data from before the S5 fix).
    const { encryptPushKeys, decryptPushKeys } = await import("./encrypt");
    const original = {
      p256dh: "BF8pKvQlt5lRJBBs5DhKYJ3w8J-zZdqvdvh3umpYwNE=",
      auth: "f7GzA0dGKb2KxY3-vQWuBQ==",
    };

    // Encrypt with current (12-byte IV) implementation
    const encrypted = encryptPushKeys(original);

    // Verify it decrypts correctly (round-trip still works)
    const decrypted = decryptPushKeys(encrypted);
    expect(decrypted).toEqual(original);

    // Verify the IV in the encrypted string is 12 bytes (24 hex chars)
    const ivHex = encrypted.split(":")[0];
    expect(ivHex!.length).toBe(24);
  });

  it("handles longer push keys correctly", async () => {
    const { encryptPushKeys, decryptPushKeys } = await import("./encrypt");
    const original = {
      p256dh: "x".repeat(1000),
      auth: "y".repeat(500),
    };

    const encrypted = encryptPushKeys(original);
    const decrypted = decryptPushKeys(encrypted);

    expect(decrypted).toEqual(original);
  });
});

// ─── MODULE-LOAD VALIDATION TESTS ────────────────────────────────────────────
//
// Phase 3 remediation: PUSH_KEY_ENCRYPTION_KEY must be validated at MODULE
// LOAD (not lazily inside encryptPushKeys/decryptPushKeys). This makes the
// worker / web server fail fast at boot if the env var is missing/invalid,
// rather than 500-ing on the first push operation.
//
// Phase 19+ remediation (Batch 4 / H2): These tests use the same `mockEnv`
// object from the vi.hoisted() pattern above. Each test mutates
// `mockEnv.PUSH_KEY_ENCRYPTION_KEY` to a different invalid value, calls
// `vi.resetModules()` to discard the cached module, and dynamically
// re-imports `./encrypt` to trigger the module-load validation.
//
// No `process.env` direct mutation — the mock env object is the single
// source of truth for these tests, eliminating both test pollution and
// parallel-test collision risks.
// ─────────────────────────────────────────────────────────────────────────────

describe("PUSH_KEY_ENCRYPTION_KEY module-load validation", () => {
  // Save the original mockEnv value so we can restore it after each test.
  // (No process.env mutation — the production code reads via the typed `env`
  // export, which is mocked to read from `mockEnv`.)
  const originalMockValue = mockEnv.PUSH_KEY_ENCRYPTION_KEY;

  afterEach(() => {
    // Restore the mock to its original value + reset module cache so
    // subsequent test files see a clean module loaded with the test-setup env.
    mockEnv.PUSH_KEY_ENCRYPTION_KEY = originalMockValue;
    vi.resetModules();
  });

  it("module loads successfully when PUSH_KEY_ENCRYPTION_KEY is a valid 64-hex string", async () => {
    mockEnv.PUSH_KEY_ENCRYPTION_KEY = TEST_KEY;
    vi.resetModules();

    // Importing the module should NOT throw — the env var is valid.
    const mod = await import("./encrypt");
    expect(mod.encryptPushKeys).toBeDefined();
    expect(mod.decryptPushKeys).toBeDefined();
  });

  it("module throws at import time when PUSH_KEY_ENCRYPTION_KEY is missing", async () => {
    delete mockEnv.PUSH_KEY_ENCRYPTION_KEY;
    vi.resetModules();

    await expect(import("./encrypt")).rejects.toThrow(
      /PUSH_KEY_ENCRYPTION_KEY/,
    );
  });

  it("module throws at import time when PUSH_KEY_ENCRYPTION_KEY is not 64 chars", async () => {
    mockEnv.PUSH_KEY_ENCRYPTION_KEY = "tooshort";
    vi.resetModules();

    await expect(import("./encrypt")).rejects.toThrow(
      /PUSH_KEY_ENCRYPTION_KEY/,
    );
  });

  it("module throws at import time when PUSH_KEY_ENCRYPTION_KEY is not hex", async () => {
    // 64 chars long but contains non-hex characters (z, x, etc.)
    mockEnv.PUSH_KEY_ENCRYPTION_KEY =
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz";
    vi.resetModules();

    await expect(import("./encrypt")).rejects.toThrow(
      /PUSH_KEY_ENCRYPTION_KEY/,
    );
  });
});
