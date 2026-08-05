CREATE TABLE "ai_tool_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"conversation_id" uuid,
	"contact_id" uuid,
	"tool_name" text NOT NULL,
	"input" jsonb NOT NULL,
	"success" boolean NOT NULL,
	"result_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_tool_executions" ADD CONSTRAINT "ai_tool_executions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_executions" ADD CONSTRAINT "ai_tool_executions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_executions" ADD CONSTRAINT "ai_tool_executions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_tool_executions_workspace_id_idx" ON "ai_tool_executions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ai_tool_executions_conversation_id_idx" ON "ai_tool_executions" USING btree ("conversation_id");