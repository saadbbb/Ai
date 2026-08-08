ALTER TYPE "public"."activity_type" ADD VALUE 'order_shipping_updated' BEFORE 'appointment_created';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_carrier" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_url" text;