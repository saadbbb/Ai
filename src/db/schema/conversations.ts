import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { channels } from "./channels";
import { contacts } from "./contacts";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const conversationStatusEnum = pgEnum("conversation_status", ["open", "closed"]);

/**
 * "active" = AI replies automatically. "paused" = an agent is handling it manually
 * but it can be handed back. "handed_over" = the AI decided (or was told) it should
 * not reply further — see GenerateReplyResult.needsHumanHandover.
 */
export const conversationAiStatusEnum = pgEnum("conversation_ai_status", ["active", "paused", "handed_over"]);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "restrict" }),
    status: conversationStatusEnum("status").notNull().default("open"),
    aiStatus: conversationAiStatusEnum("ai_status").notNull().default("active"),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessagePreview: text("last_message_preview"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("conversations_workspace_id_idx").on(table.workspaceId),
    index("conversations_contact_id_idx").on(table.contactId),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ConversationStatus = (typeof conversationStatusEnum.enumValues)[number];
export type ConversationAiStatus = (typeof conversationAiStatusEnum.enumValues)[number];
