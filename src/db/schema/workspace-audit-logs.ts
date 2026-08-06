import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

/**
 * Per-workspace audit trail for administrative actions (Part 2/3 of the spec:
 * "log every team-management action... in the Audit Log"). Distinct from
 * `audit_logs`, which is the cross-tenant Super Admin/platform-operator trail
 * (see that schema's own comment) — this one is scoped to a single workspace
 * and meant to be readable by that workspace's own Owner/Admin, not mixed
 * into the platform-wide feed.
 */
export const workspaceAuditActionEnum = pgEnum("workspace_audit_action", [
  "member_invited",
  "invitation_revoked",
  "member_role_changed",
  "member_removed",
]);

export const workspaceAuditLogs = pgTable(
  "workspace_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    // Snapshotted alongside actorUserId — still readable in the log if the member account is later removed.
    actorEmail: text("actor_email").notNull(),
    action: workspaceAuditActionEnum("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workspace_audit_logs_workspace_id_idx").on(table.workspaceId),
    index("workspace_audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export type WorkspaceAuditLog = typeof workspaceAuditLogs.$inferSelect;
export type NewWorkspaceAuditLog = typeof workspaceAuditLogs.$inferInsert;
export type WorkspaceAuditAction = (typeof workspaceAuditActionEnum.enumValues)[number];
