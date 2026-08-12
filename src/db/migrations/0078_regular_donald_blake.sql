CREATE TYPE "public"."theme" AS ENUM('dark', 'light');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme" "theme" DEFAULT 'dark' NOT NULL;