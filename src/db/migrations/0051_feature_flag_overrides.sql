ALTER TYPE "public"."audit_action" ADD VALUE 'feature_flag_override_set' BEFORE 'coupon_created';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'feature_flag_override_removed' BEFORE 'coupon_created';--> statement-breakpoint
CREATE TABLE "feature_flag_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_flag_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flag_overrides_flag_workspace_unique" UNIQUE("feature_flag_id","workspace_id")
);
--> statement-breakpoint
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_feature_flag_id_feature_flags_id_fk" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feature_flag_overrides_workspace_id_idx" ON "feature_flag_overrides" USING btree ("workspace_id");