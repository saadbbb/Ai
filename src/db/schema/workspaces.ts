import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Shared across workspaces.language (dashboard/UI language) and ai_agents.language
 * (the AI's reply language) — the two are independent settings that happen to draw
 * from the same option set.
 */
export const languageEnum = pgEnum("language", ["ar", "en", "ku"]);

/**
 * Manual for now — there's no payment gateway yet (see DEFERRED_TASKS.md), so
 * a platform admin sets this by hand at /admin/workspaces after a customer
 * subscribes via the WhatsApp flow. "trial" is the default for every new
 * signup and is never blocked; only "suspended" blocks dashboard access.
 */
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trial", "active", "suspended"]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  businessType: text("business_type"),
  country: text("country"),
  timezone: text("timezone").notNull().default("UTC"),
  language: languageEnum("language").notNull().default("en"),
  logoUrl: text("logo_url"),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("trial"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];
