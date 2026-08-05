import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { conversations } from "./conversations";
import { workspaces } from "./workspaces";

/**
 * One row per AI tool call attempted during a reply (see the Tool Dispatcher
 * in src/features/ai/tools) — the audit trail the Action Engine spec requires
 * for every tool, independent of ai_usage (which tracks model calls, not
 * the actions those calls triggered).
 */
export const aiToolExecutions = pgTable(
  "ai_tool_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    toolName: text("tool_name").notNull(),
    input: jsonb("input").notNull(),
    success: boolean("success").notNull(),
    resultSummary: text("result_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_tool_executions_workspace_id_idx").on(table.workspaceId),
    index("ai_tool_executions_conversation_id_idx").on(table.conversationId),
  ],
);

export type AiToolExecution = typeof aiToolExecutions.$inferSelect;
export type NewAiToolExecution = typeof aiToolExecutions.$inferInsert;
