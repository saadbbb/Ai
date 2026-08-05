import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Platform-wide tables (no workspaceId) — this is the seam for the Super Admin
 * Platform from spec Part 9, deliberately kept isolated from the multi-tenant
 * schema. The first slice: who can access /admin, and where the platform
 * points customers who want to subscribe (a WhatsApp number, not a payment
 * gateway yet — see DEFERRED_TASKS.md).
 *
 * Self-service admin list. The ultimate bootstrap/recovery mechanism is the
 * PLATFORM_ADMIN_EMAILS env var (see auth-guard.ts) — that one can never be
 * locked out by database state, only by redeploying with a different env var.
 */
export const platformAdmins = pgTable("platform_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  addedByEmail: text("added_by_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type NewPlatformAdmin = typeof platformAdmins.$inferInsert;
