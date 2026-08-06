import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const supportTicketStatusEnum = pgEnum("support_ticket_status", ["open", "in_progress", "resolved", "closed"]);
export const supportTicketPriorityEnum = pgEnum("support_ticket_priority", ["low", "medium", "high", "urgent"]);
export const supportTicketAuthorTypeEnum = pgEnum("support_ticket_author_type", ["tenant", "admin"]);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    status: supportTicketStatusEnum("status").notNull().default("open"),
    priority: supportTicketPriorityEnum("priority").notNull().default("medium"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("support_tickets_workspace_id_idx").on(table.workspaceId),
    index("support_tickets_status_idx").on(table.status),
  ],
);

/**
 * `workspaceId` is denormalized from the parent ticket (same pattern as
 * messages.workspaceId on conversations) so tenant-scoped queries can filter
 * directly without a join. `authorType` distinguishes "the tenant" from "the
 * platform team" for rendering even if authorUserId is later null (deleted
 * account) — both tenant members and Super Admins are rows in `users`, so a
 * single FK covers both sides.
 */
export const supportTicketMessages = pgTable(
  "support_ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    authorType: supportTicketAuthorTypeEnum("author_type").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("support_ticket_messages_ticket_id_idx").on(table.ticketId),
    index("support_ticket_messages_workspace_id_idx").on(table.workspaceId),
  ],
);

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
export type SupportTicketStatus = (typeof supportTicketStatusEnum.enumValues)[number];
export type SupportTicketPriority = (typeof supportTicketPriorityEnum.enumValues)[number];
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type NewSupportTicketMessage = typeof supportTicketMessages.$inferInsert;
export type SupportTicketAuthorType = (typeof supportTicketAuthorTypeEnum.enumValues)[number];
