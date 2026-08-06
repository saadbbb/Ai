CREATE TYPE "public"."workflow_approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'create_order';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'book_appointment';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'send_ai_reply';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'request_approval';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'draft' BEFORE 'active';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'disabled';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'archived';--> statement-breakpoint
ALTER TYPE "public"."workspace_audit_action" ADD VALUE 'workflow_ai_generated';--> statement-breakpoint
ALTER TYPE "public"."workspace_audit_action" ADD VALUE 'workflow_approval_decided';--> statement-breakpoint
CREATE TABLE "workflow_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"event_type" "workflow_trigger" NOT NULL,
	"event_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"instructions" text,
	"on_approve_workflow_id" uuid,
	"status" "workflow_approval_status" DEFAULT 'pending' NOT NULL,
	"decided_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_on_approve_workflow_id_workflows_id_fk" FOREIGN KEY ("on_approve_workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_approvals_workspace_id_idx" ON "workflow_approvals" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workflow_approvals_status_idx" ON "workflow_approvals" USING btree ("status");