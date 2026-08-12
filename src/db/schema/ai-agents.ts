import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

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
export type AiCreativity = (typeof aiCreativityEnum.enumValues)[number];

/**
 * DaySchedule/WorkingHours used to type ai_agents.working_hours (removed —
 * per-agent working hours was dropped from the product, the AI replies
 * 24/7 regardless; see prompt-builder.ts and DEFERRED_TASKS.md history).
 * isWithinWorkingHours in features/ai/lib/working-hours.ts is kept as
 * harmless dead code — it fails open (always "within hours") when passed
 * undefined, which is what every caller now always passes, so any workflow
 * still referencing that old automation condition keeps working exactly as
 * if the business were always open, with zero migration needed.
 */
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
 *
 * language/creativity/workingHours were removed from this table (see PART 3
 * follow-up, 2026-08-12): reply language now always matches the customer's own
 * language (prompt-builder.ts), creativity is a single platform-wide default
 * (platform_settings.defaultCreativity) instead of a per-merchant choice, and
 * working hours were dropped entirely — the AI replies the same at any hour.
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
    tone: aiToneEnum("tone").notNull().default("friendly"),
    handoverEnabled: boolean("handover_enabled").notNull().default(false),
    handoverInstructions: text("handover_instructions"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_agents_workspace_id_idx").on(table.workspaceId)],
);

export type AiAgent = typeof aiAgents.$inferSelect;
export type NewAiAgent = typeof aiAgents.$inferInsert;
