CREATE TYPE "public"."note_type" AS ENUM('team', 'private', 'ai');--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "type" "note_type" DEFAULT 'team' NOT NULL;