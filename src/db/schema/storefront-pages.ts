import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/**
 * Merchant-managed custom pages (About, FAQ, Return Policy, etc.) — the merchant
 * decides the name and content, nothing is a forced fixed page. Only published
 * pages, in sortOrder, appear as extra footer links on the public storefront.
 */
export const storefrontPages = pgTable(
  "storefront_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: text("content").notNull(),
    isPublished: boolean("is_published").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("storefront_pages_workspace_id_idx").on(table.workspaceId),
    uniqueIndex("storefront_pages_workspace_slug_idx").on(table.workspaceId, table.slug),
  ],
);

export type StorefrontPage = typeof storefrontPages.$inferSelect;
export type NewStorefrontPage = typeof storefrontPages.$inferInsert;
