import { index, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { currencyEnum } from "./plans";
import { invoices } from "./invoices";
import { workspaces } from "./workspaces";

export const refundStatusEnum = pgEnum("refund_status", ["requested", "approved", "rejected", "completed"]);

/**
 * Manual bookkeeping, same model as invoices — there's no payment gateway to
 * actually reverse a charge through yet (see DEFERRED_TASKS.md), so
 * "completed" means an admin manually returned the money outside the
 * platform (e.g. bank transfer) and is recording that it happened.
 */
export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: currencyEnum("currency").notNull(),
    reason: text("reason").notNull(),
    status: refundStatusEnum("status").notNull().default("requested"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("refunds_workspace_id_idx").on(table.workspaceId)],
);

export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;
export type RefundStatus = (typeof refundStatusEnum.enumValues)[number];
