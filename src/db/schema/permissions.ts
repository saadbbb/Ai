import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
