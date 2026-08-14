import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/**
 * Website Advertisements — replaces the home page's hero text area with a merchant-
 * uploaded banner (or carousel, when more than one is published). Distinct from the
 * unrelated existing `ads.ts` (adAccounts/adCampaigns — Meta ad-campaign attribution).
 */
export const storefrontAds = pgTable(
  "storefront_ads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    linkUrl: text("link_url"),
    title: text("title"),
    altText: text("alt_text"),
    isPublished: boolean("is_published").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("storefront_ads_workspace_id_idx").on(table.workspaceId)],
);

export type StorefrontAd = typeof storefrontAds.$inferSelect;
export type NewStorefrontAd = typeof storefrontAds.$inferInsert;
