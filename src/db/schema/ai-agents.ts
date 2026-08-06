import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { languageEnum, workspaces } from "./workspaces";

export const aiToneEnum = pgEnum("ai_tone", [
  "friendly",
  "professional",
  "luxury",
  "formal",
  "casual",
  "medical",
  "corporate",
]);

export const aiCreativityEnum = pgEnum("ai_creativity", ["low", "medium", "high"]);

export interface DaySchedule {
  closed: boolean;
  open: string;
  close: string;
}

export interface WorkingHours {
  timezone: string;
  schedule: {
    mon: DaySchedule;
    tue: DaySchedule;
    wed: DaySchedule;
    thu: DaySchedule;
    fri: DaySchedule;
    sat: DaySchedule;
    sun: DaySchedule;
  };
  holidayNotes: string | null;
}

/**
 * One AI Employee per workspace today — application code (see onboardingService
 * and aiAgentRepository) only ever creates one per workspace via a check-then-create
 * pattern, not a DB-level constraint, so multiple agents per workspace can be
 * supported later without a breaking migration.
 */
export const aiAgents = pgTable(
  "ai_agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    businessDescription: text("business_description"),
    language: languageEnum("language").notNull().default("en"),
    tone: aiToneEnum("tone").notNull().default("friendly"),
    creativity: aiCreativityEnum("creativity").notNull().default("medium"),
    workingHours: jsonb("working_hours").$type<WorkingHours>(),
    handoverEnabled: boolean("handover_enabled").notNull().default(false),
    handoverInstructions: text("handover_instructions"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_agents_workspace_id_idx").on(table.workspaceId)],
);

export type AiAgent = typeof aiAgents.$inferSelect;
export type NewAiAgent = typeof aiAgents.$inferInsert;
