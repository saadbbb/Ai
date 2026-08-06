CREATE TYPE "public"."support_ticket_author_type" AS ENUM('tenant', 'admin');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'support_ticket_reply';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'support_ticket_replied';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'support_ticket_status_changed';--> statement-breakpoint
ALTER TYPE "public"."workspace_audit_action" ADD VALUE 'support_ticket_created';--> statement-breakpoint
ALTER TYPE "public"."workspace_audit_action" ADD VALUE 'support_ticket_replied';--> statement-breakpoint
CREATE TABLE "support_ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"author_type" "support_ticket_author_type" NOT NULL,
	"author_user_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "support_ticket_priority" DEFAULT 'medium' NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_ticket_messages_ticket_id_idx" ON "support_ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_ticket_messages_workspace_id_idx" ON "support_ticket_messages" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "support_tickets_workspace_id_idx" ON "support_tickets" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");