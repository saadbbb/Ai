import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { languageEnum, workspaces } from "./workspaces";

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
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("contacts_workspace_id_idx").on(table.workspaceId)],
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
