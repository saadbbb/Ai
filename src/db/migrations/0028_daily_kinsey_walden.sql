ALTER TYPE "public"."workflow_action" ADD VALUE 'assign_agent';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'webhook_call';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'trigger_another_workflow';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'conversation_assigned' BEFORE 'note_added';