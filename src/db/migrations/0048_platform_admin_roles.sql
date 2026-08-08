CREATE TYPE "public"."platform_admin_role" AS ENUM('administrator', 'support_agent', 'finance', 'developer', 'read_only');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'platform_admin_role_changed' BEFORE 'plan_saved';--> statement-breakpoint
ALTER TABLE "platform_admins" ADD COLUMN "role" "platform_admin_role" DEFAULT 'administrator' NOT NULL;