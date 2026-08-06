ALTER TYPE "public"."notification_type" ADD VALUE 'crm_followup';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_followup_notified_at" timestamp with time zone;