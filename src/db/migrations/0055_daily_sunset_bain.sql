ALTER TYPE "public"."notification_type" ADD VALUE 'task_reminder';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "reminder_sent_at" timestamp with time zone;