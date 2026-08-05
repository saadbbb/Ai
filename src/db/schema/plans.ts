import { integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly"]);

/**
 * The full list of feature keys a plan can grant. Mirrors the dashboard's
 * main modules 1:1 (see FEATURE_KEYS in features/platform-admin/lib/features.ts,
 * the single source of truth both the admin UI and the gating checks read from).
 */
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  defaultDurationDays: integer("default_duration_days").notNull().default(30),
  enabledFeatures: jsonb("enabled_features").$type<string[]>().notNull().default([]),
  // Nullable — a plan created before pricing existed, or one the admin hasn't
  // priced yet, is simply excluded from MRR/ARR rather than counted as free.
  price: numeric("price", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("IQD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type BillingCycle = (typeof billingCycleEnum.enumValues)[number];
