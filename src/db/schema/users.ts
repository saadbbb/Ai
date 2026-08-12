import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Only two values, ever — no "system"/"auto". Stored per-account (not just a
 * cookie) so a logged-in user sees the same theme on every device they use,
 * per the 2026-08-12 fix: the OS/browser color-scheme preference must never
 * decide this, on any device. See src/lib/theme/config.ts for the read path.
 */
export const themeEnum = pgEnum("theme", ["dark", "light"]);
export type Theme = (typeof themeEnum.enumValues)[number];

/**
 * A user is identified by email OR phone (never neither) — enforced at every
 * write path (profileSyncService.ensureLocalUser, the phone sign-up action),
 * not by a DB constraint, since Drizzle/Postgres CHECK constraints across two
 * nullable columns add migration friction disproportionate to the benefit here.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").unique(),
  phone: text("phone").unique(),
  passwordHash: text("password_hash"),
  theme: themeEnum("theme").notNull().default("dark"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
