CREATE TYPE "public"."support_ticket_category" AS ENUM('billing', 'technical', 'account', 'feature_request', 'other');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'support_ticket_assigned' BEFORE 'ai_enabled_changed';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'support_ticket_category_changed' BEFORE 'ai_enabled_changed';--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD COLUMN "is_internal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "category" "support_ticket_category" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "assigned_admin_user_id" uuid;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_admin_user_id_users_id_fk" FOREIGN KEY ("assigned_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;