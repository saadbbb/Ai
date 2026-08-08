ALTER TYPE "public"."notification_type" ADD VALUE 'new_message';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'human_handover';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'missed_conversation';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'webhook_failure';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'assignment';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'mention';--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "missed_notified_at" timestamp with time zone;