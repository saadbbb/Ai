CREATE TYPE "public"."storefront_custom_domain_status" AS ENUM('none', 'pending', 'verified', 'failed');--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "track_quantity" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "quantity" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "low_stock_threshold" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_id" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_name" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "hero_cta_label" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "hero_cta_link" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "custom_domain" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "custom_domain_status" "storefront_custom_domain_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "custom_domain_verification_token" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "custom_domain_verified_at" timestamp with time zone;