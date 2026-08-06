ALTER TYPE "public"."workflow_action" ADD VALUE 'create_task';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'create_note';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'update_contact_language';--> statement-breakpoint
ALTER TYPE "public"."workflow_trigger" ADD VALUE 'tag_added';--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;