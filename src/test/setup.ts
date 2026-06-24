import { beforeAll, afterAll } from "vitest";

// Override required environment variables BEFORE any test file imports modules
// that import @/lib/env (which validates at module load time and throws
// if any required var is missing or invalid).
//
// IMPORTANT: Use direct assignment (=), not nullish coalescing (??=).
// The shell environment may contain values that fail the env schema
// (e.g., a SQLite DATABASE_URL from the parent project). We always want
// tests to use these dummy values for isolation.
//
// NOTE on NODE_ENV: TypeScript types process.env.NODE_ENV as a read-only
// property (because @types/node declares it as such). Use Object.defineProperty
// to bypass the type check at runtime — vitest already sets NODE_ENV="test",
// so this is just a defensive explicit set.
process.env.DATABASE_URL =
  "postgres://test:test@localhost:5432/test?sslmode=disable";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long-xxx";
process.env.AUTH_URL = "http://localhost:3000";
process.env.ANTHROPIC_API_KEY = "sk-ant-test-dummy-key";
process.env.OPENAI_API_KEY = "sk-test-dummy-key";
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-public-key";
process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key";
process.env.VAPID_SUBJECT = "mailto:test@onestopnews.com";
process.env.PUSH_KEY_ENCRYPTION_KEY =
  "0000000000000000000000000000000000000000000000000000000000000000";
// OAuth env vars are optional in env/index.ts (Zod .optional()). Set dummy
// values so tests that exercise the auth module don't trigger env validation
// errors if the schema ever changes to require them.
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
process.env.GITHUB_CLIENT_ID = "test-github-client-id";
process.env.GITHUB_CLIENT_SECRET = "test-github-client-secret";
// TRUSTED_PROXY is optional in env/index.ts. Set to "true" so the
// /api/articles route test (which exercises the trusted-proxy IP-extraction
// path) has the var available at module load time. Individual tests override
// this via the mocked env object (see route.test.ts).
process.env.TRUSTED_PROXY = "true";
// NODE_ENV is set by vitest to "test" — no need to set it manually.
// If a test needs a different NODE_ENV, use vi.stubEnv("NODE_ENV", value).

// Global test setup
beforeAll(() => {
  console.log("Test suite starting...");
});

// Global test teardown
afterAll(() => {
  console.log("Test suite complete.");
});
