import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/**
 * "manual" is not a real external channel — it's the always-connected internal
 * conduit for conversations a staff member logs by hand (a phone call, a walk-in),
 * and it's what the Unified Inbox runs on before WhatsApp/Instagram OAuth exists.
 * Every workspace gets one row per type via channelRepository.ensureDefaultChannels.
 */
export const channelTypeEnum = pgEnum("channel_type", ["manual", "whatsapp", "instagram"]);

export const channelStatusEnum = pgEnum("channel_status", ["connected", "not_connected"]);

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: channelTypeEnum("type").notNull(),
    status: channelStatusEnum("status").notNull().default("not_connected"),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("channels_workspace_id_type_idx").on(table.workspaceId, table.type)],
);

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type ChannelType = (typeof channelTypeEnum.enumValues)[number];
export type ChannelStatus = (typeof channelStatusEnum.enumValues)[number];
