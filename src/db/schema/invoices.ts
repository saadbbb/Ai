import { index, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { currencyEnum, plans } from "./plans";
import { workspaces } from "./workspaces";

/**
 * "pending"/"failed" exist for schema completeness (see PART 8's Payment
 * Status field) even though today's manual-billing model only ever writes
 * "paid" — an admin activating a subscription IS the recorded payment
 * confirmation (see invoice.service.ts). They're real states to use once an
 * automated payment gateway lands (see DEFERRED_TASKS.md), not decoration.
 */
export const invoiceStatusEnum = pgEnum("invoice_status", ["paid", "pending", "failed"]);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // Nullable — if the plan is later deleted, the invoice (a historical
    // record) survives; planName below keeps the plan's name readable either way.
    planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
    planName: text("plan_name").notNull(),
    invoiceNumber: text("invoice_number").notNull().unique(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: currencyEnum("currency").notNull(),
    status: invoiceStatusEnum("status").notNull().default("paid"),
    periodDays: integer("period_days").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("invoices_workspace_id_idx").on(table.workspaceId)],
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
