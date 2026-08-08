import { boolean, index, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { featureFlags } from "./feature-flags";
import { workspaces } from "./workspaces";

/**
 * PART 9's "target specific workspaces" gap for feature flags — a flag's
 * `enabled` column stays the platform-wide default; a row here overrides
 * that default for one workspace in either direction (force-enable a
 * globally-disabled flag for a beta tester, or force-disable a
 * globally-enabled one for a workspace having trouble with it). No
 * broader "beta cohort"/"enterprise tier" targeting exists yet — that
 * would need a workspace tagging concept this table doesn't try to invent;
 * see DEFERRED_TASKS.md.
 */
export const featureFlagOverrides = pgTable(
  "feature_flag_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    featureFlagId: uuid("feature_flag_id")
      .notNull()
      .references(() => featureFlags.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("feature_flag_overrides_flag_workspace_unique").on(table.featureFlagId, table.workspaceId),
    index("feature_flag_overrides_workspace_id_idx").on(table.workspaceId),
  ],
);

export type FeatureFlagOverride = typeof featureFlagOverrides.$inferSelect;
export type NewFeatureFlagOverride = typeof featureFlagOverrides.$inferInsert;
