ALTER TYPE "public"."notification_type" ADD VALUE 'order_followup';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "followup_notified_at" timestamp with time zone;