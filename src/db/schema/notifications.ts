import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/**
 * Kept as an enum rather than a free-text type so new notification sources
 * can be added later without a schema change, just a new enum value.
 * "automation" = created by the automation engine's notify_owner_email
 * action (src/features/automation/services/automation.service.ts) — the
 * in-app copy is unconditional even if the paired email fails, same pattern
 * as the subscription ones below. "crm_followup" = the crm-followups cron
 * flagging a stale open lead (see subscription-check.service.ts for the
 * daily-cron pattern this follows).
 */
export const notificationTypeEnum = pgEnum("notification_type", [
  "subscription_expiring",
  "subscription_suspended",
  "automation",
  "crm_followup",
  "support_ticket_reply",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    link: text("link"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_workspace_id_idx").on(table.workspaceId)],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
