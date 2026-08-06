import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Global operational flags, not to be confused with plans.enabledFeatures
 * (that gates product *modules* like Orders/Automations per what a workspace
 * pays for). These gate individual, often experimental or riskier code paths
 * — e.g. the AI Workflow Generator — so a Super Admin can kill just that one
 * thing platform-wide without touching billing/plans or the AI Operations
 * kill switch. A flag with no row yet (key not created) resolves to enabled
 * — see featureFlagRepository.isEnabled — so shipping a new gated code path
 * never silently breaks until an admin explicitly creates+disables its flag.
 */
export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
