import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { languageEnum, workspaces } from "./workspaces";
import { users } from "./users";

/**
 * Part 5's Customer Lifecycle, the post-order half only — everything before
 * "customer" (Unknown Visitor -> Lead -> Qualified -> ... -> Order) is already
 * represented by leads.stage; this enum picks up where that leaves off.
 * Auto-advanced by crmService (order completion / repeat-order thresholds),
 * never set by the customer-facing UI directly.
 */
export const contactLifecycleStageEnum = pgEnum("contact_lifecycle_stage", [
  "lead",
  "customer",
  "repeat_customer",
  "vip",
  "loyal_customer",
]);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    whatsappId: text("whatsapp_id"),
    instagramId: text("instagram_id"),
    email: text("email"),
    language: languageEnum("language"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    notes: text("notes"),
    aiSummary: text("ai_summary"),
    avatarUrl: text("avatar_url"),
    country: text("country"),
    city: text("city"),
    /** Free text — "Instagram Ad", "Referral", "Walk-in", etc. Never an enum; sources are business-specific. */
    source: text("source"),
    lifecycleStage: contactLifecycleStageEnum("lifecycle_stage").notNull().default("lead"),
    assignedAgentId: uuid("assigned_agent_id").references(() => users.id, { onDelete: "set null" }),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("contacts_workspace_id_idx").on(table.workspaceId),
    index("contacts_assigned_agent_id_idx").on(table.assignedAgentId),
  ],
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ContactLifecycleStage = (typeof contactLifecycleStageEnum.enumValues)[number];
