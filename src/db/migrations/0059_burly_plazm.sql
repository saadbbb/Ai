CREATE TYPE "public"."conversation_priority" AS ENUM('normal', 'high');--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "priority" "conversation_priority" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "last_message_sender_type" text;