import { index, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { conversations } from "./conversations";
import { workspaces } from "./workspaces";

/**
 * Fixed default pipeline for MVP — Part 5 of the spec calls for "unlimited custom
 * pipelines" eventually, but that's a pipeline-builder feature of its own. This
 * enum is the seam to widen later (e.g. a workspace-owned `pipeline_stages` table)
 * without touching how leads reference their stage.
 */
export const leadStageEnum = pgEnum("lead_stage", [
  "new",
  "qualified",
  "contacted",
  "negotiation",
  "waiting",
  "appointment",
  "proposal_sent",
  "won",
  "lost",
  "cancelled",
]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    // The conversation this lead was raised from, if any — leads can also be
    // created without one (a walk-in, a phone call logged directly as a lead).
    conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    stage: leadStageEnum("stage").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_workspace_id_idx").on(table.workspaceId),
    index("leads_contact_id_idx").on(table.contactId),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadStage = (typeof leadStageEnum.enumValues)[number];
