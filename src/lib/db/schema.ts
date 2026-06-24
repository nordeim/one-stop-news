import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Custom Types ─────────────────────────────────────────────────────────
/**
 * Native PostgreSQL tsvector type — required for generated column FTS.
 */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ─── Enums ────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["reader", "admin"]);
export const feedFormatEnum = pgEnum("feed_format", [
  "rss",
  "atom",
  "json_api",
]);

/**
 * contentAvailabilityEnum — Controls whether an article is eligible for AI summarisation.
 * SUMMARISATION GUARD: Only enqueue summarise job when value is 'partial_text' or 'full_text'.
 */
export const contentAvailabilityEnum = pgEnum("content_availability", [
  "title_only", // Title extracted only. DO NOT summarise.
  "excerpt", // Title + short excerpt (≤300 chars). DO NOT summarise.
  "partial_text", // Title + excerpt + partial body (300–1500 chars). Summarise permitted.
  "full_text", // Title + excerpt + full body (>1500 chars). Summarise preferred.
]);

/**
 * summaryStatusEnum — Controls what UI is shown on the article page.
 */
export const summaryStatusEnum = pgEnum("summary_status", [
  "none",
  "pending",
  "ok",
  "needs_review",
  "disabled",
]);

// ─── Derived Types (Single Source of Truth) ───────────────────────────────
// All consumers MUST import these types instead of hand-writing union
// literals. Deriving via `typeof enum.enumValues[number]` guarantees the
// type stays in sync with the schema — if the enum changes, every consumer
// gets a compile error pointing to the divergence.
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type FeedFormat = (typeof feedFormatEnum.enumValues)[number];
export type ContentAvailability =
  (typeof contentAvailabilityEnum.enumValues)[number];
export type SummaryStatus = (typeof summaryStatusEnum.enumValues)[number];

// ─── Tables ───────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  role: userRoleEnum("role").default("reader").notNull(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
});

export const subcategories = pgTable(
  "subcategories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .references(() => categories.id, { onDelete: "cascade" })
      .notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
  },
  (table) => ({
    categorySlugIdx: uniqueIndex("subcategories_category_slug_idx").on(
      table.categoryId,
      table.slug,
    ),
  }),
);

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  feedUrl: text("feed_url").notNull().unique(),
  feedFormat: feedFormatEnum("feed_format").notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  priority: integer("priority").default(2).notNull(),
  pollIntervalMinutes: integer("poll_interval_minutes").default(15).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastFetchedAt: timestamp("last_fetched_at"),
  failureCount: integer("failure_count").default(0).notNull(),
  lastErrorMessage: text("last_error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .references(() => sources.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: uuid("category_id").references(() => categories.id),
    subcategoryId: uuid("subcategory_id").references(() => subcategories.id),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    /**
     * Full article body (plain text, HTML-stripped).
     * Populated by the ingest worker from RSS content:encoded / Atom <content> /
     * JSON Feed content_text. Nullable because not all feeds provide full body
     * content (e.g., title-only feeds).
     *
     * Used by the summarize worker as input to AI summarization when
     * contentAvailability is 'partial_text' or 'full_text'.
     *
     * Phase 19 (H11): Now also indexed in the searchVector generated column
     * with weight C, so articles can be found by searching for body-only terms.
     */
    body: text("body"),
    /**
     * Denormalized source name for cross-field search.
     *
     * Phase 19 (H11): Postgres generated columns cannot reference joined
     * tables, so we denormalize the source name onto the article row. The
     * ingest worker keeps this in sync on every upsert. Indexed in the
     * searchVector with weight D.
     */
    sourceName: text("source_name"),
    canonicalUrl: text("canonical_url").notNull(),
    contentHash: text("content_hash").notNull(),
    contentAvailability: contentAvailabilityEnum("content_availability")
      .default("excerpt")
      .notNull(),
    importanceScore: real("importance_score").default(0.5).notNull(),
    hasSummary: boolean("has_summary").default(false).notNull(),
    summaryStatus: summaryStatusEnum("summary_status")
      .default("none")
      .notNull(),
    politicalLeaning: text("political_leaning"),
    publishedAt: timestamp("published_at").notNull(),
    ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
    /**
     * Full-text search vector with weighted fields.
     *
     * Phase 19 (H11): Previously only title (A) and excerpt (B) were indexed.
     * Now includes body (C) and source_name (D) for cross-field search:
     *   - title        → weight A (highest relevance)
     *   - excerpt      → weight B
     *   - body         → weight C
     *   - source_name  → weight D (lowest, but enables "find by source")
     *
     * ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', ...) in queries.ts uses these
     * weights to rank results — title matches outrank body matches, etc.
     */
    searchVector: tsvector("search_vector")
      .generatedAlwaysAs(
        sql`
          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(body, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(source_name, '')), 'D')
        `,
      )
      .notNull(),
  },
  (table) => ({
    canonicalUrlIdx: uniqueIndex("articles_canonical_url_idx").on(
      table.canonicalUrl,
    ),
    categoryPublishedIdx: index("articles_category_published_idx").on(
      table.categoryId,
      table.publishedAt,
    ),
    subcategoryPublishedIdx: index("articles_subcategory_published_idx").on(
      table.subcategoryId,
      table.publishedAt,
    ),
    searchVectorIdx: index("articles_search_vector_gin_idx").using(
      "gin",
      table.searchVector,
    ),
  }),
);

export const summaries = pgTable("summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  articleId: uuid("article_id")
    .references(() => articles.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  summaryText: text("summary_text").notNull(),
  keyPoints: jsonb("key_points").$type<string[]>().default([]).notNull(),
  sourcesCited: jsonb("sources_cited")
    .$type<{ url: string; title: string }[]>()
    .default([])
    .notNull(),
  model: text("model").notNull(),
  tokensUsed: integer("tokens_used").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  status: summaryStatusEnum("status").default("ok").notNull(),
  flagReason: text("flag_reason"),
  aiStatement: text("ai_statement").notNull(),
  complianceStatement: text("compliance_statement")
    .default("EU AI Act Article 50 compliant")
    .notNull(),
  coveragePercentage: integer("coverage_percentage").notNull(),
  originalArticleUrl: text("original_article_url").notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  /**
   * Encrypted push subscription keys (AES-256-GCM encrypted envelope).
   *
   * Stores the entire encrypted JSON envelope as a single string. The
   * legacy `keys` column (which stored `{ p256dh: encryptedEnvelope, auth:
   * "encrypted" }` and was semantically misleading) was dropped in migration
   * `0005` after Phase 14 verified no code reads it.
   */
  encryptedKeys: text("encrypted_keys"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  favoriteCategories: jsonb("favorite_categories")
    .$type<string[]>()
    .default([])
    .notNull(),
  mutedSources: jsonb("muted_sources").$type<string[]>().default([]).notNull(),
  pushEnabled: boolean("push_enabled").default(false).notNull(),
  pushCategories: jsonb("push_categories")
    .$type<string[]>()
    .default([])
    .notNull(),
  pushQuietStart: time("push_quiet_start"),
  pushQuietEnd: time("push_quiet_end"),
  pushMaxPerDay: integer("push_max_per_day").default(10).notNull(),
  briefingEnabled: boolean("briefing_enabled").default(false).notNull(),
  briefingTime: time("briefing_time"),
  briefingTimezone: text("briefing_timezone"),
  readingModeDefault: boolean("reading_mode_default").default(false).notNull(),
});

// ─── Auth.js Adapter Tables ──────────────────────────────────────────────
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => ({
    providerAccountIdx: uniqueIndex("accounts_provider_account_idx").on(
      table.provider,
      table.providerAccountId,
    ),
    // Phase 24 / F3: Enforce (userId, provider) uniqueness at the DB level.
    // This is the defense-in-depth invariant for linkOAuthProvider — even if
    // the application-level check has a race condition, the DB rejects the
    // duplicate insert. The existing onConflictDoNothing() in the action
    // silently handles the conflict (returns success) instead of throwing.
    userProviderIdx: uniqueIndex("accounts_user_provider_idx").on(
      table.userId,
      table.provider,
    ),
  }),
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires").notNull(),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────
// Re-export inferred types for each table — these are the single source of truth
// for all derived domain types. All TypeScript types derive from the schema.

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Subcategory = typeof subcategories.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Summary = typeof summaries.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type VerificationToken = typeof verificationTokens.$inferSelect;
