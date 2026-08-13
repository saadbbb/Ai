import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/**
 * A named option (e.g. "Large", "Red") with an optional price override — options only,
 * not independently stock-tracked (inventory in this schema is product-level, see
 * `trackQuantity`/`quantity` below). `id` is generated server-side the next time a
 * variant list is saved without one, so pre-existing rows pick it up lazily.
 */
export interface ProductVariant {
  id: string;
  name: string;
  priceOverride: string | null;
}

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 12, scale: 2 }),
    /** Set only while a discount is active — null means the regular price applies. Never used to compute anything; purely display/AI context. */
    discountedPrice: numeric("discounted_price", { precision: 12, scale: 2 }),
    /** Free text, business-specific — same convention as contacts.source. */
    category: text("category"),
    // Raw URL text field, same convention as workspaces.logoUrl — no upload widget until
    // Cloudflare R2 credentials exist (see DEFERRED_TASKS.md). Used by the public storefront.
    imageUrl: text("image_url"),
    /** Additional gallery images beyond imageUrl (the primary/thumbnail) — same raw-URL convention, no upload widget. */
    galleryImageUrls: jsonb("gallery_image_urls").$type<string[]>().notNull().default([]),
    variants: jsonb("variants").$type<ProductVariant[]>().notNull().default([]),
    /** Simple product-level inventory (spec: no ERP — no warehouses/locations/ledgers). When false, `quantity` is ignored and the product is always orderable. */
    trackQuantity: boolean("track_quantity").notNull().default(false),
    quantity: integer("quantity"),
    /** "Low stock" badge threshold — not exposed in the basic product form, editable only from Advanced. */
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    /** Auto-generated ("PRD-0001"), editable only from Advanced — never required from the user. */
    sku: text("sku"),
    /** Auto-generated from `name`, unique per workspace (app-enforced, same convention as storefronts.slug uniqueness). */
    slug: text("slug"),
    isActive: boolean("is_active").notNull().default(true),
    /** Separate from isActive — a product can be shown on the storefront but deliberately excluded from what the AI recommends (e.g. an item requiring an in-person fitting). Defaults true so existing products behave exactly as before. */
    aiVisible: boolean("ai_visible").notNull().default(true),
    /** Manually curated, shown in the storefront's "Featured" promotions section (PART 13 gap #138) — independent of any sort/sales signal. */
    featured: boolean("featured").notNull().default(false),
    /** When set and in the future, the storefront shows a countdown against `discountedPrice` — a limited-time offer, not a general sale. Null = the discount (if any) has no end date. */
    promotionEndsAt: timestamp("promotion_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("products_workspace_id_idx").on(table.workspaceId)],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
