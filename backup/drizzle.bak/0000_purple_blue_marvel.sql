CREATE TYPE "public"."content_availability" AS ENUM('title_only', 'excerpt', 'partial_text', 'full_text');--> statement-breakpoint
CREATE TYPE "public"."feed_format" AS ENUM('rss', 'atom', 'json_api');--> statement-breakpoint
CREATE TYPE "public"."summary_status" AS ENUM('none', 'pending', 'ok', 'needs_review', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('reader', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"category_id" uuid,
	"subcategory_id" uuid,
	"title" text NOT NULL,
	"excerpt" text,
	"canonical_url" text NOT NULL,
	"content_hash" text NOT NULL,
	"content_availability" "content_availability" DEFAULT 'excerpt' NOT NULL,
	"importance_score" real DEFAULT 0.5 NOT NULL,
	"has_summary" boolean DEFAULT false NOT NULL,
	"summary_status" "summary_status" DEFAULT 'none' NOT NULL,
	"political_leaning" text,
	"published_at" timestamp NOT NULL,
	"ingested_at" timestamp DEFAULT now() NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (
          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
        ) STORED NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"feed_url" text NOT NULL,
	"feed_format" "feed_format" NOT NULL,
	"category_id" uuid,
	"priority" integer DEFAULT 2 NOT NULL,
	"poll_interval_minutes" integer DEFAULT 15 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sources_feed_url_unique" UNIQUE("feed_url")
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"summary_text" text NOT NULL,
	"key_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources_cited" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text NOT NULL,
	"tokens_used" integer NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"status" "summary_status" DEFAULT 'ok' NOT NULL,
	"flag_reason" text,
	"ai_statement" text NOT NULL,
	"compliance_statement" text DEFAULT 'EU AI Act Article 50 compliant' NOT NULL,
	"coverage_percentage" integer NOT NULL,
	"original_article_url" text NOT NULL,
	CONSTRAINT "summaries_article_id_unique" UNIQUE("article_id")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"favorite_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"muted_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"push_enabled" boolean DEFAULT false NOT NULL,
	"push_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"push_quiet_start" time,
	"push_quiet_end" time,
	"push_max_per_day" integer DEFAULT 10 NOT NULL,
	"briefing_enabled" boolean DEFAULT false NOT NULL,
	"briefing_time" time,
	"briefing_timezone" text,
	"reading_mode_default" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'reader' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_idx" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_canonical_url_idx" ON "articles" USING btree ("canonical_url");--> statement-breakpoint
CREATE INDEX "articles_category_published_idx" ON "articles" USING btree ("category_id","published_at");--> statement-breakpoint
CREATE INDEX "articles_subcategory_published_idx" ON "articles" USING btree ("subcategory_id","published_at");--> statement-breakpoint
CREATE INDEX "articles_search_vector_gin_idx" ON "articles" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "subcategories_category_slug_idx" ON "subcategories" USING btree ("category_id","slug");