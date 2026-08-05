import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/**
 * Currently only created by the subscription-check cron (see
 * subscriptionCheckService) — kept as an enum rather than a free-text type so
 * new notification sources (new lead, AI handover, etc. — see Part 3/7 of the
 * spec) can be added later without a schema change, just a new enum value.
 */
export const notificationTypeEnum = pgEnum("notification_type", [
  "subscription_expiring",
  "subscription_suspended",
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
