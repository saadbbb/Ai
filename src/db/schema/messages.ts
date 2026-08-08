import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const messageSenderTypeEnum = pgEnum("message_sender_type", ["customer", "ai", "agent", "system"]);

/**
 * PART 4's Intent Detection — a deterministic keyword/pattern classifier
 * (src/features/ai/lib/intent-detection.ts), same reasoning as
 * lead-score.ts's deterministic stand-in for "AI calculates score": cheap,
 * auditable, no extra AI call per message. Only ever set on a "customer"
 * message; null means not yet classified (e.g. rows written before this
 * column existed) or classification found nothing confident to report.
 */
export const messageIntentEnum = pgEnum("message_intent", [
  "greeting",
  "question",
  "complaint",
  "purchase_intent",
  "price_inquiry",
  "appointment_request",
  "cancellation",
  "urgent",
  "spam",
  "other",
]);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Denormalized from conversations.workspaceId so every repository query can
    // filter by workspace directly, per the multi-tenant rule that every query
    // must verify the workspace instead of trusting a join to enforce it.
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderType: messageSenderTypeEnum("sender_type").notNull(),
    senderUserId: uuid("sender_user_id").references(() => users.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    detectedIntent: messageIntentEnum("detected_intent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversationId),
    index("messages_workspace_id_idx").on(table.workspaceId),
  ],
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageSenderType = (typeof messageSenderTypeEnum.enumValues)[number];
export type MessageIntent = (typeof messageIntentEnum.enumValues)[number];
