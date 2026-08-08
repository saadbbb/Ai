import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { languageEnum, workspaces } from "./workspaces";
import { users } from "./users";

/**
 * Part 5's Customer Lifecycle, the post-order half only — everything before
 * "customer" (Unknown Visitor -> Lead -> Qualified -> ... -> Order) is already
 * represented by leads.stage; this enum picks up where that leaves off.
 * Auto-advanced by crmService (order completion / repeat-order thresholds),
 * never set by the customer-facing UI directly. "quotation" is the one
 * manually-set exception — a business marks a contact as having received a
 * quote while still deciding, before any order exists to auto-advance from.
 */
export const contactLifecycleStageEnum = pgEnum("contact_lifecycle_stage", [
  "lead",
  "quotation",
  "customer",
  "repeat_customer",
  "vip",
  "loyal_customer",
]);

/** What the customer said they'd prefer, extracted from conversation (see update-contact-info.tool.ts) — not necessarily the channel they first messaged on. */
export const preferredContactMethodEnum = pgEnum("preferred_contact_method", ["whatsapp", "instagram", "phone", "email"]);

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
    // Everything below is extracted from conversation by update_contact_info.tool.ts
    // (PART 4's Entity Extraction) or set manually — all optional, all free-form
    // where a business-specific format makes an enum impractical.
    address: text("address"),
    /** Free text on purpose — currencies and formats ("500k IQD", "$200-300") vary too much for a numeric column to stay honest. */
    budget: text("budget"),
    preferredContactMethod: preferredContactMethodEnum("preferred_contact_method"),
    /** Product names the customer mentioned wanting/liking — informal, not a FK to products (they may not exist in the catalog, e.g. a discontinued item or a competitor's product). */
    preferredProducts: jsonb("preferred_products").$type<string[]>().notNull().default([]),
    birthDate: text("birth_date"),
    gender: text("gender"),
    /** IANA timezone (e.g. "Asia/Baghdad") — distinct from workspaces.timezone, which is the business's own. */
    timezone: text("timezone"),
    /** Campaign Security & Compliance depth (PART 13 gap #176) — set via the unsubscribe link in every campaign email footer; excluded from every future campaign's recipient list. Never affects transactional/AI-reply messages, only broadcast campaigns. */
    marketingOptOut: boolean("marketing_opt_out").notNull().default(false),
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
