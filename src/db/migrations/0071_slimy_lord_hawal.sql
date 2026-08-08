ALTER TYPE "public"."workspace_audit_action" ADD VALUE 'api_key_created';--> statement-breakpoint
ALTER TYPE "public"."workspace_audit_action" ADD VALUE 'api_key_revoked';--> statement-breakpoint
ALTER TYPE "public"."workspace_audit_action" ADD VALUE 'webhook_created';--> statement-breakpoint
ALTER TYPE "public"."workspace_audit_action" ADD VALUE 'webhook_revoked';--> statement-breakpoint
ALTER TYPE "public"."workspace_audit_action" ADD VALUE 'campaign_sent';--> statement-breakpoint
ALTER TYPE "public"."workspace_audit_action" ADD VALUE 'ad_campaign_created';--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "marketing_opt_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "segment_churn_risk" boolean DEFAULT false NOT NULL;