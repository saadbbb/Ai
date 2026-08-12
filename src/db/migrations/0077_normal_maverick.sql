ALTER TABLE "workspaces" ALTER COLUMN "language" SET DEFAULT 'ar';--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "country";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "timezone";--> statement-breakpoint
ALTER TABLE "ai_agents" DROP COLUMN "language";--> statement-breakpoint
ALTER TABLE "ai_agents" DROP COLUMN "creativity";--> statement-breakpoint
ALTER TABLE "ai_agents" DROP COLUMN "working_hours";