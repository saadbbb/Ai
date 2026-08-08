import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { plans } from "./plans";

/**
 * Shared across workspaces.language (dashboard/UI language) and ai_agents.language
 * (the AI's reply language) — the two are independent settings that happen to draw
 * from the same option set.
 */
export const languageEnum = pgEnum("language", ["ar", "en", "ku"]);

/**
 * Manual for now — there's no payment gateway yet (see DEFERRED_TASKS.md), so
 * activating/renewing is a platform admin setting this by hand at
 * /admin/workspaces after a customer subscribes via the WhatsApp flow.
 * "trial" is the default for every new signup. The full lifecycle (see
 * subscription-check.service.ts): trial/active -> past_due (0-2 days past
 * subscriptionExpiresAt, not blocked) -> grace (3-6 days past, not blocked,
 * final warning) -> suspended (7+ days past, blocks dashboard access) ->
 * expired (suspended for 90+ more days — a terminal record-keeping state,
 * functionally identical to suspended). "cancelled" is never set by the
 * cron — it's a deliberate admin action (blocks access immediately, like
 * suspended) that the cron leaves alone rather than overriding.
 */
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trial",
  "active",
  "past_due",
  "grace",
  "suspended",
  "cancelled",
  "expired",
]);

/** Statuses where the workspace still has full access to its plan's features — see feature-access.service.ts. */
export const IN_GOOD_STANDING_STATUSES = ["active", "past_due", "grace"] as const;

/** Statuses that block dashboard access entirely — see dashboard/layout.tsx. */
export const BLOCKED_SUBSCRIPTION_STATUSES = ["suspended", "cancelled", "expired"] as const;

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
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
  subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
  // Which "days remaining" reminder was last sent (3, 2, or 1) — prevents the
  // daily cron from re-sending the same reminder if it runs more than once.
  lastReminderDaysSent: integer("last_reminder_days_sent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];
