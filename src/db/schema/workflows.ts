import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { workspaces } from "./workspaces";

export const workflowTriggerEnum = pgEnum("workflow_trigger", [
  "lead_stage_changed",
  "order_status_changed",
  "conversation_handed_over",
  "order_created",
  "lead_created",
  "appointment_created",
  "appointment_status_changed",
  "tag_added",
  "message_received",
  "message_replied",
  "ai_failed",
]);

export const workflowActionEnum = pgEnum("workflow_action", [
  "add_contact_tag",
  "notify_owner_email",
  "remove_contact_tag",
  "create_task",
  "create_note",
  "update_contact_language",
  "create_lead",
  "close_conversation",
  "assign_agent",
  "webhook_call",
  "trigger_another_workflow",
]);

export const workflowStatusEnum = pgEnum("workflow_status", ["active", "paused"]);

/**
 * Shape depends on triggerType: only `stage` is set for lead_stage_changed,
 * only `status` for order_status_changed, `tag` for tag_added (informational —
 * matching a specific tag is done via Conditions, not here), neither for
 * conversation_handed_over.
 */
export interface WorkflowTriggerConfig {
  stage?: string;
  status?: string;
  tag?: string;
}

/**
 * Shape depends on actionType: `tag` for add_contact_tag/remove_contact_tag,
 * `subject`/`message` for notify_owner_email (`message` is also reused as an
 * optional free-text note sent in the webhook_call payload), `taskTitle`/
 * `taskPriority`/`taskDueInDays` for create_task, `noteContent` for
 * create_note, `contactLanguage` for update_contact_language,
 * `assignedUserId` for assign_agent, `webhookUrl` for webhook_call,
 * `targetWorkflowId` for trigger_another_workflow.
 */
export interface WorkflowActionConfig {
  tag?: string;
  subject?: string;
  message?: string;
  taskTitle?: string;
  taskPriority?: "low" | "medium" | "high";
  taskDueInDays?: number;
  noteContent?: string;
  contactLanguage?: string;
  assignedUserId?: string;
  webhookUrl?: string;
  targetWorkflowId?: string;
}

/**
 * Evaluated against the event's contact before the action runs. Kept to a flat
 * rule list with one top-level AND/OR (`matchType`) rather than nested groups —
 * covers every example in the spec ("Tag contains VIP", "Language = Arabic")
 * without a boolean-tree UI. null/no rules = unconditional (original behavior).
 */
export type WorkflowConditionField = "tag" | "language";
export type WorkflowConditionMatchType = "all" | "any";

export interface WorkflowConditionRule {
  field: WorkflowConditionField;
  value: string;
}

export interface WorkflowConditions {
  matchType: WorkflowConditionMatchType;
  rules: WorkflowConditionRule[];
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
    conditions: jsonb("conditions").$type<WorkflowConditions | null>(),
    status: workflowStatusEnum("status").notNull().default("active"),
    /** Null/0 = run the action immediately when the trigger fires (original behavior). */
    delayDays: integer("delay_days"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workflows_workspace_id_idx").on(table.workspaceId),
    index("workflows_trigger_type_idx").on(table.triggerType),
  ],
);

/**
 * Queue for workflows whose action is delayed (workflows.delayDays > 0).
 * Populated by automationService.dispatch, drained by processDueRuns() on a
 * daily cron (src/app/api/cron/automation-delays) — day granularity only,
 * since a daily cron is the only scheduling primitive this app has.
 */
export const workflowPendingRuns = pgTable(
  "workflow_pending_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    eventType: workflowTriggerEnum("event_type").notNull(),
    eventPayload: jsonb("event_payload").$type<WorkflowTriggerConfig>().notNull().default({}),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workflow_pending_runs_workspace_id_idx").on(table.workspaceId),
    index("workflow_pending_runs_run_after_idx").on(table.runAfter),
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
    /** How many retries happened before this result — 0 means it succeeded/failed on the first attempt. */
    retryCount: integer("retry_count").notNull().default(0),
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
export type WorkflowPendingRun = typeof workflowPendingRuns.$inferSelect;
export type NewWorkflowPendingRun = typeof workflowPendingRuns.$inferInsert;
