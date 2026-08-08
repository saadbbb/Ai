import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Platform-wide tables (no workspaceId) — this is the seam for the Super Admin
 * Platform from spec Part 9, deliberately kept isolated from the multi-tenant
 * schema. The first slice: who can access /admin, and where the platform
 * points customers who want to subscribe (a WhatsApp number, not a payment
 * gateway yet — see DEFERRED_TASKS.md).
 *
 * "read_only" is the one role actually enforced today (see
 * requireWritePlatformAdmin in auth-guard.ts) — every other role can read and
 * write everything a database-managed admin can. Finer-grained separation
 * (Finance only touching billing, Support only touching tickets, etc.) is a
 * real gap, not silently done here — see DEFERRED_TASKS.md.
 */
export const platformAdminRoleEnum = pgEnum("platform_admin_role", [
  "administrator",
  "support_agent",
  "finance",
  "developer",
  "read_only",
]);

/**
 * Self-service admin list. The ultimate bootstrap/recovery mechanism is the
 * PLATFORM_ADMIN_EMAILS env var (see auth-guard.ts) — that one can never be
 * locked out by database state, only by redeploying with a different env var,
 * and is always full-access regardless of any row here.
 */
export const platformAdmins = pgTable("platform_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  role: platformAdminRoleEnum("role").notNull().default("administrator"),
  addedByEmail: text("added_by_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type NewPlatformAdmin = typeof platformAdmins.$inferInsert;
export type PlatformAdminRole = (typeof platformAdminRoleEnum.enumValues)[number];
