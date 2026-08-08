CREATE TYPE "public"."storefront_button_style" AS ENUM('rounded', 'square', 'pill');--> statement-breakpoint
CREATE TYPE "public"."storefront_corner_style" AS ENUM('sharp', 'soft', 'round');--> statement-breakpoint
CREATE TYPE "public"."storefront_font" AS ENUM('inter', 'poppins', 'playfair', 'roboto_mono');--> statement-breakpoint
CREATE TYPE "public"."storefront_footer_style" AS ENUM('standard', 'minimal');--> statement-breakpoint
CREATE TYPE "public"."storefront_header_style" AS ENUM('standard', 'centered', 'minimal');--> statement-breakpoint
CREATE TYPE "public"."storefront_theme" AS ENUM('modern', 'minimal', 'classic', 'bold');--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "favicon_url" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "banner_image_url" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "secondary_color" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "font" "storefront_font" DEFAULT 'inter' NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "button_style" "storefront_button_style" DEFAULT 'rounded' NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "corner_style" "storefront_corner_style" DEFAULT 'soft' NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "header_style" "storefront_header_style" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "footer_style" "storefront_footer_style" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "dark_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "theme" "storefront_theme" DEFAULT 'modern' NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "social_links" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "tracking_ids" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "storefronts" ADD COLUMN "seo_description" text;