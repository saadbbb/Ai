CREATE TYPE "public"."storefront_event_type" AS ENUM('page_view', 'product_view', 'form_submission');--> statement-breakpoint
CREATE TABLE "storefront_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"type" "storefront_event_type" NOT NULL,
	"path" text,
	"product_id" uuid,
	"form_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "storefront_events" ADD CONSTRAINT "storefront_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_events" ADD CONSTRAINT "storefront_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "storefront_events_workspace_id_idx" ON "storefront_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "storefront_events_workspace_type_created_idx" ON "storefront_events" USING btree ("workspace_id","type","created_at");