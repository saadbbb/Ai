import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * System roles are seeded data (see src/db/seed/roles-permissions.seed.ts), not a hardcoded
 * enum, so per-workspace custom roles can be added later without a schema change.
 */
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
