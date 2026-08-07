CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'sent');--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'campaign_message_sent';--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"segment_lifecycle_stage" "contact_lifecycle_stage",
	"segment_tag" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;