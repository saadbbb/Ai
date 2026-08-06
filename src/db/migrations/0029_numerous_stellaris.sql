CREATE TYPE "public"."contact_lifecycle_stage" AS ENUM('lead', 'customer', 'repeat_customer', 'vip', 'loyal_customer');--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "lifecycle_stage" "contact_lifecycle_stage" DEFAULT 'lead' NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "assigned_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_assigned_agent_id_users_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_assigned_agent_id_idx" ON "contacts" USING btree ("assigned_agent_id");