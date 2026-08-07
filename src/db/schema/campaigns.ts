import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contactLifecycleStageEnum } from "./contacts";
import { workspaces } from "./workspaces";

export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "sent"]);

/**
 * Sends over email — the one real, working outbound channel today (Resend,
 * sandboxed but functional; see DEFERRED_TASKS.md). WhatsApp/Instagram would
 * be the natural broadcast channel once Meta OAuth lands (Phase 7), but
 * building fake send code against an API that doesn't exist yet would be a
 * placeholder implementation. `segmentLifecycleStage`/`segmentTag` reuse the
 * exact same filter primitives the Contacts/Leads list pages already use —
 * no new segment-builder concept invented.
 */
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  segmentLifecycleStage: contactLifecycleStageEnum("segment_lifecycle_stage"),
  segmentTag: text("segment_tag"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CampaignStatus = (typeof campaignStatusEnum.enumValues)[number];
