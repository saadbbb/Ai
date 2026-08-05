import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const businessPolicies = pgTable("business_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .unique()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  shippingPolicy: text("shipping_policy"),
  returnsPolicy: text("returns_policy"),
  paymentsPolicy: text("payments_policy"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BusinessPolicy = typeof businessPolicies.$inferSelect;
export type NewBusinessPolicy = typeof businessPolicies.$inferInsert;
