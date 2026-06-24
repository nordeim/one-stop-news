/**
 * index.test.ts — Tests for the Zod env validation schema.
 *
 * Verifies that TRUSTED_PROXY is a recognized, optional env var. The
 * schema must accept its presence (with any string value) and its absence
 * (since it's .optional()).
 *
 * These tests directly exercise envSchema (not the module-level `env`
 * export, which validates process.env at module load and would throw in
 * the test environment if vars were missing).
 */

import { describe, it, expect } from "vitest";
import { envSchema } from "./index";

// Minimal required-vars payload that satisfies every required field in
// envSchema. Individual tests spread this and add/override fields.
const BASE_REQUIRED = {
  DATABASE_URL: "postgres://user:pass@host:5432/db",
  REDIS_URL: "redis://localhost:6379",
  AUTH_SECRET: "x".repeat(32),
  AUTH_URL: "http://localhost:3000",
  ANTHROPIC_API_KEY: "sk-ant-test-key",
  OPENAI_API_KEY: "sk-test-key",
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: "vapid-public",
  VAPID_PRIVATE_KEY: "vapid-private",
  VAPID_SUBJECT: "mailto:test@example.com",
  PUSH_KEY_ENCRYPTION_KEY: "0".repeat(64),
} as const;

describe("envSchema — TRUSTED_PROXY field", () => {
  it("accepts TRUSTED_PROXY='true' (trusted-proxy mode enabled)", () => {
    const result = envSchema.safeParse({
      ...BASE_REQUIRED,
      TRUSTED_PROXY: "true",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.TRUSTED_PROXY).toBe("true");
    }
  });

  it("accepts TRUSTED_PROXY='false' (explicit disable)", () => {
    const result = envSchema.safeParse({
      ...BASE_REQUIRED,
      TRUSTED_PROXY: "false",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.TRUSTED_PROXY).toBe("false");
    }
  });

  it("accepts absence of TRUSTED_PROXY (optional — defaults to undefined)", () => {
    const result = envSchema.safeParse(BASE_REQUIRED);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.TRUSTED_PROXY).toBeUndefined();
    }
  });

  it("accepts arbitrary string value (no enum constraint)", () => {
    // The schema declares TRUSTED_PROXY as z.string().optional() — any
    // string is valid. The route handler interprets === "true" specially,
    // but the schema itself is permissive (documented behavior).
    const result = envSchema.safeParse({
      ...BASE_REQUIRED,
      TRUSTED_PROXY: "yes",
    });
    expect(result.success).toBe(true);
  });
});

describe("envSchema — AUTH_SECRET weak-value rejection (S8)", () => {
  // S8 fix: In production (NODE_ENV=production), the schema rejects known-weak
  // AUTH_SECRET values that are committed to the public .env.example file or
  // commonly used in dev. This prevents accidental deployment with a publicly
  // known secret (which would allow JWT session forgery).
  //
  // In development/test, weak secrets are ALLOWED (developers need quick setup).

  const WEAK_SECRETS = [
    "dev-secret-do-not-use-in-production", // from .env, .env.docker, .env.example
    "dev-secret-not-for-production-use-only-change-me-42chars", // from .env.local
    "test-secret-at-least-32-characters-long-xxx", // from src/test/setup.ts
    "ci-dummy-secret-at-least-32-characters-long-xxx", // from CI workflow
    "secret-at-least-32-chars-for-testing-only", // common test pattern
    "change-me-to-a-real-secret-32-chars-or-more", // common placeholder
  ];

  for (const weakSecret of WEAK_SECRETS) {
    it(`rejects known-weak AUTH_SECRET "${weakSecret.substring(0, 20)}..." in production`, () => {
      const result = envSchema.safeParse({
        ...BASE_REQUIRED,
        AUTH_SECRET: weakSecret,
        NODE_ENV: "production",
      });
      expect(result.success).toBe(false);
    });

    it(`accepts known-weak AUTH_SECRET "${weakSecret.substring(0, 20)}..." in development`, () => {
      const result = envSchema.safeParse({
        ...BASE_REQUIRED,
        AUTH_SECRET: weakSecret,
        NODE_ENV: "development",
      });
      expect(result.success).toBe(true);
    });
  }

  it("accepts a strong random AUTH_SECRET in production (32+ chars, not in blocklist)", () => {
    const result = envSchema.safeParse({
      ...BASE_REQUIRED,
      AUTH_SECRET: "k7$mB2xQ9vL4nR8wY3pF6jH1cZ5aD0sT", // 32 chars, random
      NODE_ENV: "production",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a strong random AUTH_SECRET in production (64 chars, not in blocklist)", () => {
    const result = envSchema.safeParse({
      ...BASE_REQUIRED,
      AUTH_SECRET:
        "k7$mB2xQ9vL4nR8wY3pF6jH1cZ5aD0sTk7$mB2xQ9vL4nR8wY3pF6jH1cZ5aD0sT",
      NODE_ENV: "production",
    });
    expect(result.success).toBe(true);
  });
});
