import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/**
 * Reviews & testimonials depth (PART 13 gap #142) — scoped to staff-entered
 * storefront testimonials (author, rating, quote), not a public review-
 * submission system with moderation queues and verified-purchase checks.
 * Store-wide rather than per-product, since the storefront has no purchase
 * history to verify against.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull(),
    rating: integer("rating").notNull(),
    text: text("text").notNull(),
    isFeatured: boolean("is_featured").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reviews_workspace_id_idx").on(table.workspaceId)],
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
