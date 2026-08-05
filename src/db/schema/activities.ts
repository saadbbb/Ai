import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { users } from "./users";
import { workspaces } from "./workspaces";

/**
 * The unified per-customer timeline (Part 5 of the spec: "every customer owns
 * one timeline"). One row per business event — never per raw chat message,
 * which would drown out what actually matters; conversations stay linked, not
 * duplicated, from the contact page's own Conversations section.
 */
export const activityTypeEnum = pgEnum("activity_type", [
  "lead_created",
  "lead_stage_changed",
  "order_created",
  "order_status_changed",
  "appointment_created",
  "appointment_status_changed",
  "contact_tagged",
  "contact_untagged",
  "contact_updated",
  "conversation_handed_over",
  "note_added",
  "task_created",
  "task_completed",
]);

/** Who caused the event — distinguishes a human click from something the AI decided on its own. */
export const activityActorTypeEnum = pgEnum("activity_actor_type", ["human", "ai", "automation", "system"]);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    actorType: activityActorTypeEnum("actor_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    summary: text("summary").notNull(),
    link: text("link"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("activities_workspace_id_idx").on(table.workspaceId),
    index("activities_contact_id_idx").on(table.contactId),
  ],
);

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type ActivityType = (typeof activityTypeEnum.enumValues)[number];
export type ActivityActorType = (typeof activityActorTypeEnum.enumValues)[number];
