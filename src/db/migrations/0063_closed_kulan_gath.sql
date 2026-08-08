ALTER TABLE "storefronts" ADD COLUMN "sections" jsonb DEFAULT '["hero","about","products","services","contact"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "privacy_policy_text" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "terms_text" text;