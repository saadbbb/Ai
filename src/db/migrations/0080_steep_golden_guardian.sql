CREATE TYPE "public"."storefront_product_display_mode" AS ENUM('grid', 'list', 'full');--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "product_display_mode" "storefront_product_display_mode" DEFAULT 'grid' NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "show_product_description" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "show_compare_price" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "show_categories" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "show_search" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "show_footer" boolean DEFAULT true NOT NULL;