ALTER TYPE "public"."audit_action" ADD VALUE 'ai_enabled_changed';--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "ai_enabled" boolean DEFAULT true NOT NULL;