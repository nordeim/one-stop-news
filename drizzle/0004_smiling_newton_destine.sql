ALTER TABLE "push_subscriptions" ALTER COLUMN "keys" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "encrypted_keys" text;