CREATE TYPE "public"."ad_account_provider" AS ENUM('meta');--> statement-breakpoint
CREATE TYPE "public"."ad_account_status" AS ENUM('not_connected', 'connected');--> statement-breakpoint
CREATE TYPE "public"."ad_campaign_status" AS ENUM('active', 'paused', 'ended');--> statement-breakpoint
CREATE TABLE "ad_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" "ad_account_provider" DEFAULT 'meta' NOT NULL,
	"status" "ad_account_status" DEFAULT 'not_connected' NOT NULL,
	"external_account_id" text,
	"connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"utm_campaign" text NOT NULL,
	"status" "ad_campaign_status" DEFAULT 'active' NOT NULL,
	"budget" numeric(12, 2),
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"external_campaign_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;