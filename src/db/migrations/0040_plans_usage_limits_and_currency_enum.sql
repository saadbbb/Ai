CREATE TYPE "public"."currency" AS ENUM('IQD', 'USD', 'SAR', 'AED', 'KWD');--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "currency" SET DEFAULT 'IQD'::"public"."currency";--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "currency" SET DATA TYPE "public"."currency" USING "currency"::"public"."currency";--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_users" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_ai_agents" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_channels" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_conversations_per_month" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_storage_mb" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_knowledge_files" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_automation_workflows" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_api_calls_per_month" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_integrations" integer;