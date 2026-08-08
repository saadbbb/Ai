import { integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly"]);

/** The currencies this platform is prepared to bill in — see PART 8's Multi-Currency section. */
export const currencyEnum = pgEnum("currency", ["IQD", "USD", "SAR", "AED", "KWD"]);

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  defaultDurationDays: integer("default_duration_days").notNull().default(30),
  enabledFeatures: jsonb("enabled_features").$type<string[]>().notNull().default([]),
  // Nullable — a plan created before pricing existed, or one the admin hasn't
  // priced yet, is simply excluded from MRR/ARR rather than counted as free.
  price: numeric("price", { precision: 12, scale: 2 }),
  currency: currencyEnum("currency").notNull().default("IQD"),
  // Usage limits — every one of these is nullable, meaning "unlimited" when
  // not set, so existing plans created before limits existed keep working
  // unchanged. maxStorageMb/maxApiCallsPerMonth are honest placeholders: no
  // file-storage system or per-request API counter exists yet to measure
  // them against (see DEFERRED_TASKS.md and usage.service.ts), so they're
  // stored for when those land but never enforced or reported today.
  maxUsers: integer("max_users"),
  maxAiAgents: integer("max_ai_agents"),
  maxChannels: integer("max_channels"),
  maxConversationsPerMonth: integer("max_conversations_per_month"),
  maxStorageMb: integer("max_storage_mb"),
  maxKnowledgeFiles: integer("max_knowledge_files"),
  maxAutomationWorkflows: integer("max_automation_workflows"),
  maxApiCallsPerMonth: integer("max_api_calls_per_month"),
  maxIntegrations: integer("max_integrations"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type BillingCycle = (typeof billingCycleEnum.enumValues)[number];
export type Currency = (typeof currencyEnum.enumValues)[number];
