import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/**
 * One published storefront per workspace, reachable at /store/[workspaces.slug]
 * with zero auth (see src/middleware.ts's matcher — /store isn't in it, so it's
 * public by omission, same as /invitations/accept). Reads products/services
 * live from the existing catalog tables rather than duplicating them — a
 * storefront is a public *view* onto data that already exists, not a second
 * source of truth. One row per workspace, enforced app-side (check-then-create,
 * same pattern as ai_agents) rather than a DB unique constraint, so a future
 * multi-page/multi-theme site doesn't need a breaking migration.
 */
export const storefronts = pgTable(
  "storefronts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    isPublished: boolean("is_published").notNull().default(false),
    heroTitle: text("hero_title"),
    heroSubtitle: text("hero_subtitle"),
    aboutText: text("about_text"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    primaryColor: text("primary_color"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("storefronts_workspace_id_idx").on(table.workspaceId)],
);

export type Storefront = typeof storefronts.$inferSelect;
export type NewStorefront = typeof storefronts.$inferInsert;
