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
 * daily-cron pattern this follows). "billing" covers invoice-generated and
 * refund-status-changed events (see notify-owner.service.ts) — one type for
 * several billing-adjacent messages, same reasoning as "automation" above.
 * "dashboard" covers the owner-facing operational nudges from PART 7's
 * Dashboard Notifications (a VIP customer just ordered, a team member has
 * gone quiet) — see dashboard-alerts.service.ts. "task_reminder" = the
 * daily task-reminders cron flagging a due/overdue open task (see
 * task-reminder.service.ts). "order_followup" = the order-followups cron
 * flagging an order left in "draft"/"pending" too long (see
 * order-followup.service.ts) — the Follow-up Engine's cart-abandonment case.
 * The remaining six are the Inbox's own notification triggers: "new_message"
 * (a customer messaged and the AI isn't handling it), "human_handover" (AI or
 * a team member handed a conversation to a human), "missed_conversation" (the
 * missed-conversations cron flagging one nobody's answered in a while),
 * "webhook_failure" (an automation's webhook_call action failed after every
 * retry), "assignment" (a conversation was assigned to a team member), and
 * "mention" (a note content mentions a team member by @email-prefix). A
 * seventh reference-spec trigger, "connection lost", is deliberately not
 * implemented — channels never transition to "connected" today since
 * WhatsApp/Instagram OAuth doesn't exist yet, so there is nothing to lose.
 */
export const notificationTypeEnum = pgEnum("notification_type", [
  "subscription_expiring",
  "subscription_suspended",
  "automation",
  "crm_followup",
  "support_ticket_reply",
  "appointment_reminder",
  "usage_warning",
  "billing",
  "dashboard",
  "task_reminder",
  "order_followup",
  "new_message",
  "human_handover",
  "missed_conversation",
  "webhook_failure",
  "assignment",
  "mention",
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
