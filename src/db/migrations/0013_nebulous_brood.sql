ALTER TYPE "public"."workflow_action" ADD VALUE 'remove_contact_tag';--> statement-breakpoint
ALTER TYPE "public"."workflow_trigger" ADD VALUE 'order_created';--> statement-breakpoint
ALTER TYPE "public"."workflow_trigger" ADD VALUE 'lead_created';--> statement-breakpoint
ALTER TYPE "public"."workflow_trigger" ADD VALUE 'appointment_created';--> statement-breakpoint
ALTER TYPE "public"."workflow_trigger" ADD VALUE 'appointment_status_changed';--> statement-breakpoint
CREATE TABLE "workflow_pending_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"event_type" "workflow_trigger" NOT NULL,
	"event_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"run_after" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "delay_days" integer;--> statement-breakpoint
ALTER TABLE "workflow_pending_runs" ADD CONSTRAINT "workflow_pending_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_pending_runs" ADD CONSTRAINT "workflow_pending_runs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_pending_runs" ADD CONSTRAINT "workflow_pending_runs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_pending_runs_workspace_id_idx" ON "workflow_pending_runs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workflow_pending_runs_run_after_idx" ON "workflow_pending_runs" USING btree ("run_after");