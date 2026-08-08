CREATE TYPE "public"."storefront_popup_trigger" AS ENUM('first_visit', 'delay', 'exit_intent');--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "promotion_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "announcement_bar_text" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "announcement_bar_link" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "popup_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "popup_title" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "popup_message" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "popup_button_text" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "popup_button_link" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "popup_trigger" "storefront_popup_trigger" DEFAULT 'delay' NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "popup_delay_seconds" integer DEFAULT 5 NOT NULL;