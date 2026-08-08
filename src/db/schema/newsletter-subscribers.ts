import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/** Forms depth (PART 13 gap #140) — a newsletter signup is intentionally its own lightweight table, not a Lead: it's an opt-in mailing list entry, not a sales-pipeline record. */
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("newsletter_subscribers_workspace_id_idx").on(table.workspaceId),
    uniqueIndex("newsletter_subscribers_workspace_email_idx").on(table.workspaceId, table.email),
  ],
);

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
