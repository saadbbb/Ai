CREATE TYPE "public"."coupon_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'coupon_created';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'coupon_status_changed';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'refund_created';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'refund_status_changed';--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"type" "coupon_type" NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"max_redemptions" integer,
	"times_redeemed" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
