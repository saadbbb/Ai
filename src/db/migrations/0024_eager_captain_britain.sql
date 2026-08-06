ALTER TABLE "ai_agents" DROP CONSTRAINT "ai_agents_workspace_id_unique";--> statement-breakpoint
CREATE INDEX "ai_agents_workspace_id_idx" ON "ai_agents" USING btree ("workspace_id");