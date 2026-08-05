import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const workflowTriggerEnum = pgEnum("workflow_trigger", [
  "lead_stage_changed",
  "order_status_changed",
  "conversation_handed_over",
]);

export const workflowActionEnum = pgEnum("workflow_action", ["add_contact_tag", "notify_owner_email"]);

export const workflowStatusEnum = pgEnum("workflow_status", ["active", "paused"]);

/**
 * Shape depends on triggerType: only `stage` is set for lead_stage_changed,
 * only `status` for order_status_changed, neither for conversation_handed_over.
 */
export interface WorkflowTriggerConfig {
  stage?: string;
  status?: string;
}

/** Shape depends on actionType: `tag` for add_contact_tag, `subject`/`message` for notify_owner_email. */
export interface WorkflowActionConfig {
  tag?: string;
  subject?: string;
  message?: string;
}

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    triggerType: workflowTriggerEnum("trigger_type").notNull(),
    triggerConfig: jsonb("trigger_config").$type<WorkflowTriggerConfig>().notNull().default({}),
    actionType: workflowActionEnum("action_type").notNull(),
    actionConfig: jsonb("action_config").$type<WorkflowActionConfig>().notNull().default({}),
    status: workflowStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workflows_workspace_id_idx").on(table.workspaceId),
    index("workflows_trigger_type_idx").on(table.triggerType),
  ],
);

export const workflowExecutions = pgTable(
  "workflow_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    success: boolean("success").notNull(),
    summary: text("summary"),
    errorMessage: text("error_message"),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("workflow_executions_workflow_id_idx").on(table.workflowId)],
);

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowTrigger = (typeof workflowTriggerEnum.enumValues)[number];
export type WorkflowAction = (typeof workflowActionEnum.enumValues)[number];
export type WorkflowStatus = (typeof workflowStatusEnum.enumValues)[number];
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;
