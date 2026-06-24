import { z } from "zod";

/**
 * Environment variable validation schema.
 * All environment variables used by the application MUST be declared here.
 * This ensures the app fails fast with a clear error if any required
 * variable is missing or invalid.
 */
export const envSchema = z
  .object({
    // ── Database ────────────────────────────────────────────────────────────
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .refine(
        (val) =>
          val.startsWith("postgres://") || val.startsWith("postgresql://"),
        "DATABASE_URL must start with postgres:// or postgresql://",
      ),

    // ── Redis (BullMQ) ──────────────────────────────────────────────────────
    REDIS_URL: z
      .string()
      .min(1, "REDIS_URL is required")
      .refine(
        (val) => val.startsWith("redis://"),
        "REDIS_URL must start with redis://",
      ),

    // ── Auth.js ─────────────────────────────────────────────────────────────
    // S8 fix: AUTH_SECRET uses a basic min(32) check here. The production-only
    // weak-value rejection is enforced via superRefine below (which has access
    // to the parsed NODE_ENV value, not process.env.NODE_ENV).
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must be at least 32 characters"),
    AUTH_URL: z.string().min(1, "AUTH_URL is required"),

    // ── AI Providers ────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: z
      .string()
      .min(1, "ANTHROPIC_API_KEY is required")
      .refine(
        (val) => val.startsWith("sk-ant-"),
        "ANTHROPIC_API_KEY must start with sk-ant-",
      ),
    OPENAI_API_KEY: z
      .string()
      .min(1, "OPENAI_API_KEY is required")
      .refine(
        (val) => val.startsWith("sk-"),
        "OPENAI_API_KEY must start with sk-",
      ),

    // ── Push Notifications ──────────────────────────────────────────────────
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
    VAPID_PRIVATE_KEY: z.string().min(1),
    VAPID_SUBJECT: z.string().min(1),

    // ── Push Key Encryption ─────────────────────────────────────────────────
    PUSH_KEY_ENCRYPTION_KEY: z
      .string()
      .length(64, "PUSH_KEY_ENCRYPTION_KEY must be exactly 64 hex characters")
      .refine(
        (val) => /^[0-9a-fA-F]{64}$/.test(val),
        "PUSH_KEY_ENCRYPTION_KEY must be 64 hex characters",
      ),

    // ── OAuth Providers (optional) ──────────────────────────────────────────
    // When both CLIENT_ID and CLIENT_SECRET for a given provider are present,
    // the provider is enabled in src/lib/auth/providers.ts. When absent, the
    // app falls back to Credentials-only auth (backward compat).
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),

    // ── Trusted Proxy (optional) ────────────────────────────────────────────
    // When set to "true", the rate limiter (src/lib/rateLimit.ts consumer
    // in /api/articles) uses the RIGHTMOST IP from x-forwarded-for — the
    // trusted proxy's view of the client. This prevents IP spoofing behind
    // a CDN/reverse proxy. Default (unset) uses the leftmost IP, which is
    // spoofable but acceptable for direct-exposure deployments.
    // The string is intentionally permissive (z.string().optional()) rather
    // than a boolean enum so any truthy string can be set; the route handler
    // checks === "true" specifically.
    TRUSTED_PROXY: z.string().optional(),

    // ── Trusted Proxy CIDRs (optional, Phase 19 / M2) ──────────────────────
    // Comma-separated list of trusted proxy CIDRs (e.g., "10.0.0.0/8,172.16.0.0/12").
    // When TRUSTED_PROXY=true AND TRUSTED_PROXY_CIDRS is set, the rate limiter
    // walks the x-forwarded-for chain from the right, skipping IPs that belong
    // to a trusted CIDR, and returns the first untrusted IP. This is the gold
    // standard for proxy-chain IP extraction (vs. the binary toggle which
    // trusts the rightmost IP unconditionally).
    //
    // When TRUSTED_PROXY=true but TRUSTED_PROXY_CIDRS is unset, falls back to
    // the simpler rightmost-IP behavior (the historical default).
    TRUSTED_PROXY_CIDRS: z.string().optional(),

    // ── Node Environment ────────────────────────────────────────────────────
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  })
  .superRefine((data, ctx) => {
    // S8 fix: In production, reject known-weak AUTH_SECRET values that are
    // committed to the public .env.example file or commonly used in dev.
    // This prevents accidental deployment with a publicly known secret
    // (which would allow JWT session forgery). In development/test, weak
    // secrets are allowed for developer convenience.
    //
    // Uses superRefine (not per-field refine) because we need access to the
    // PARSED NODE_ENV value, not process.env.NODE_ENV (which may differ in
    // tests that call envSchema.safeParse() directly with a custom NODE_ENV).
    if (data.NODE_ENV === "production") {
      const weakPatterns = [
        /dev[-_ ]?secret/i,
        /test[-_ ]?(secret|ing)/i,
        /ci[-_ ]?dummy/i,
        /do[-_ ]?not[-_ ]?use/i,
        /not[-_ ]?for[-_ ]?production/i,
        /change[-_ ]?me/i,
        /placeholder/i,
      ];
      if (weakPatterns.some((pattern) => pattern.test(data.AUTH_SECRET))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["AUTH_SECRET"],
          message:
            "AUTH_SECRET appears to be a known-weak/placeholder value. Generate a strong random secret with: openssl rand -base64 33",
        });
      }
    }
  });

type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables at module load time.
 * Throws a descriptive error if any required variable is missing/invalid.
 */
function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues;
    const messages = issues.map((issue) => {
      const path = issue.path.join(".");
      return `  - ${path}: ${issue.message}`;
    });

    const errorMessage = [
      "Environment variable validation failed:",
      ...messages,
      "", // Empty line for readability
      "Please check your .env file and ensure all required variables are set.",
    ].join("\n");

    throw new Error(errorMessage);
  }

  return parsed.data;
}

/** Exported validated environment variables. Import from here, not process.env. */
export const env = validateEnv();

// Phase 19 (M2): Warn at boot if running in production without TRUSTED_PROXY.
// Direct-exposure prod deployments are vulnerable to X-Forwarded-For spoofing
// on the rate limiter. The warning is non-blocking (prod may legitimately be
// behind a CDN that strips XFF), but it surfaces the risk so operators can
// make an informed decision.
if (env.NODE_ENV === "production" && env.TRUSTED_PROXY !== "true") {
  console.warn(
    "[env] WARNING: NODE_ENV=production but TRUSTED_PROXY is not set to 'true'.\n" +
      "  The rate limiter will use the leftmost (client-supplied) X-Forwarded-For IP,\n" +
      "  which is spoofable. Set TRUSTED_PROXY=true if behind a CDN/reverse proxy.\n" +
      "  For finer-grained control, also set TRUSTED_PROXY_CIDRS to walk the proxy chain.",
  );
}
