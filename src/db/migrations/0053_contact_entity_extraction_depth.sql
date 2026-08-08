CREATE TYPE "public"."preferred_contact_method" AS ENUM('whatsapp', 'instagram', 'phone', 'email');--> statement-breakpoint
ALTER TYPE "public"."contact_lifecycle_stage" ADD VALUE 'quotation' BEFORE 'customer';--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "budget" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "preferred_contact_method" "preferred_contact_method";--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "preferred_products" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "birth_date" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "timezone" text;