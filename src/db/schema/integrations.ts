import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/**
 * Only the SHA-256 hash of the actual key is ever stored (same principle as a
 * password hash) — the plaintext key is shown to the user exactly once, at
 * creation, and is unrecoverable afterward. `keyPrefix` (first 8 chars of the
 * plaintext) is stored in the clear purely so the UI can show "sk_live_a1b2..."
 * in a list without ever re-displaying the full key.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("api_keys_workspace_id_idx").on(table.workspaceId)],
);

/**
 * A dedicated, always-on notification channel for external tools (Zapier,
 * Make, a custom script) — distinct from automation's `webhook_call` action,
 * which is one step inside a conditional workflow. This fires on every
 * occurrence of a subscribed event type, unconditionally, for the whole
 * workspace. `secret` HMAC-signs each delivery (X-Webhook-Signature header)
 * so the receiver can verify it actually came from this platform.
 */
export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    eventTypes: jsonb("event_types").$type<string[]>().notNull().default([]),
    secret: text("secret").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("webhook_subscriptions_workspace_id_idx").on(table.workspaceId)],
);

/**
 * Integrations Monitoring depth (PART 13 gap #165) — one row per delivery
 * attempt, success or failure, so a workspace owner can actually see whether
 * their Zapier/Make endpoint is receiving events instead of guessing from
 * silence. Deliberately a flat log, not a retry queue — see
 * `notifyWebhookSubscribers`'s own comment on why retries aren't built yet.
 */
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => webhookSubscriptions.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    success: boolean("success").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("webhook_deliveries_subscription_id_idx").on(table.subscriptionId, table.createdAt)],
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type NewWebhookSubscription = typeof webhookSubscriptions.$inferInsert;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
