import { index, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { conversations } from "./conversations";
import { products } from "./products";
import { workspaces } from "./workspaces";

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
]);

export const orderPaymentMethodEnum = pgEnum("order_payment_method", ["cash", "card", "bank_transfer", "other"]);

export const orderDeliveryMethodEnum = pgEnum("order_delivery_method", ["pickup", "delivery"]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    status: orderStatusEnum("status").notNull().default("pending"),
    // Flat monetary amounts (not percentages) so the grand total is a simple
    // sum/subtraction — see orderGrandTotal() in ../lib/order-total.ts.
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    deliveryFee: numeric("delivery_fee", { precision: 12, scale: 2 }).notNull().default("0"),
    paymentMethod: orderPaymentMethodEnum("payment_method"),
    deliveryMethod: orderDeliveryMethodEnum("delivery_method"),
    // Per-order, not the contact's general profile address (contacts.address) —
    // a customer can ship different orders to different places.
    deliveryAddress: text("delivery_address"),
    notes: text("notes"),
    followupNotifiedAt: timestamp("followup_notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_workspace_id_idx").on(table.workspaceId),
    index("orders_contact_id_idx").on(table.contactId),
  ],
);

/**
 * Name and unitPrice are snapshotted from the product at order time — the
 * catalog can change its price/name later without rewriting past orders.
 * productId is nullable so a line item can be a one-off not in the catalog.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type OrderPaymentMethod = (typeof orderPaymentMethodEnum.enumValues)[number];
export type OrderDeliveryMethod = (typeof orderDeliveryMethodEnum.enumValues)[number];
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
