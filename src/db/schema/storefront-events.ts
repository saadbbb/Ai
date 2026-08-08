import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { products } from "./products";
import { workspaces } from "./workspaces";

/** Website analytics depth (PART 13 gap #144) — a flat event log, not a full web-analytics pipeline (no sessions/UTM/funnels). */
export const storefrontEventTypeEnum = pgEnum("storefront_event_type", ["page_view", "product_view", "form_submission"]);

export const storefrontEvents = pgTable(
  "storefront_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: storefrontEventTypeEnum("type").notNull(),
    /** Set for page_view — the /store/[slug]/... path visited. */
    path: text("path"),
    /** Set for product_view. */
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    /** Set for form_submission — e.g. "contact" | "quote" | "support" | "order" | "appointment" | "newsletter". */
    formType: text("form_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("storefront_events_workspace_id_idx").on(table.workspaceId),
    index("storefront_events_workspace_type_created_idx").on(table.workspaceId, table.type, table.createdAt),
  ],
);

export type StorefrontEvent = typeof storefrontEvents.$inferSelect;
export type NewStorefrontEvent = typeof storefrontEvents.$inferInsert;
export type StorefrontEventType = (typeof storefrontEventTypeEnum.enumValues)[number];
