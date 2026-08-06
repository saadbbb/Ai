import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Platform-operator audit trail (Part 9/10 of the spec: every sensitive Super
 * Admin action must be logged). Scoped to actions that mutate cross-tenant
 * state — plans, workspace subscriptions, other admins, platform settings —
 * not per-tenant CRM activity, which lives in `activities` instead.
 */
export const auditActionEnum = pgEnum("audit_action", [
  "subscription_activated",
  "subscription_status_changed",
  "platform_admin_added",
  "platform_admin_removed",
  "plan_saved",
  "plan_deleted",
  "platform_settings_updated",
  "impersonation_started",
  "support_ticket_replied",
  "support_ticket_status_changed",
]);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    // Snapshotted alongside actorUserId — still readable in the log if the admin account is later removed.
    actorEmail: text("actor_email").notNull(),
    action: auditActionEnum("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_logs_created_at_idx").on(table.createdAt)],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type AuditAction = (typeof auditActionEnum.enumValues)[number];
