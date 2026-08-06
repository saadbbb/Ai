ALTER TYPE "public"."workflow_action" ADD VALUE 'create_lead';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'close_conversation';--> statement-breakpoint
ALTER TYPE "public"."workflow_trigger" ADD VALUE 'message_received';--> statement-breakpoint
ALTER TYPE "public"."workflow_trigger" ADD VALUE 'message_replied';--> statement-breakpoint
ALTER TYPE "public"."workflow_trigger" ADD VALUE 'ai_failed';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'conversation_closed' BEFORE 'note_added';