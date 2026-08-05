import { jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/**
 * One row per workspace (workspaceId is the primary key, upserted) — a daily
 * cache, not a log. Regenerating on every dashboard visit would call the AI
 * provider on every page load, which Part 7/8 of the spec explicitly warns
 * against ("never run expensive queries on every page load", AI cost tracking).
 */
export const aiInsights = pgTable("ai_insights", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  insights: jsonb("insights").$type<string[]>().notNull().default([]),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AiInsights = typeof aiInsights.$inferSelect;
export type NewAiInsights = typeof aiInsights.$inferInsert;
