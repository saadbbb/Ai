import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { users } from "./users";
import { workspaces } from "./workspaces";

/**
 * "team" (default) = visible to the whole workspace. "private" = visible only
 * to its author — filtered out for everyone else at the repository layer.
 * "ai" = written by the automation engine's create_note action, no human
 * author; shown with a distinct badge rather than treated as private.
 */
export const noteTypeEnum = pgEnum("note_type", ["team", "private", "ai"]);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    type: noteTypeEnum("type").notNull().default("team"),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notes_workspace_id_idx").on(table.workspaceId), index("notes_contact_id_idx").on(table.contactId)],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type NoteType = (typeof noteTypeEnum.enumValues)[number];
