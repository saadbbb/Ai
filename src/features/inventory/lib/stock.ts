import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orderItems, products } from "@/db/schema";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface StockDeductionItem {
  productId: string;
  quantity: number;
}

export interface StockDeductionResult {
  ok: boolean;
  insufficientProductIds: string[];
}

/**
 * Atomically decrements stock for every tracked product in `items`, guarded by
 * `quantity >= requested` inside the same UPDATE so concurrent checkouts can
 * never oversell — there's no read-then-write race window since Postgres
 * evaluates the WHERE clause (and locks the row) at UPDATE time. Untracked
 * products (trackQuantity=false) are skipped entirely — always orderable.
 *
 * Must run inside the same `tx` as the order/order-items insert (see
 * orderRepository.create) so an insufficient-stock item rolls back the whole
 * order, not just the stock write.
 */
export async function decrementStock(
  tx: DbTransaction,
  workspaceId: string,
  items: StockDeductionItem[],
): Promise<StockDeductionResult> {
  const insufficientProductIds: string[] = [];

  for (const item of items) {
    if (item.quantity <= 0) continue;

    const [row] = await tx
      .select({ trackQuantity: products.trackQuantity })
      .from(products)
      .where(and(eq(products.id, item.productId), eq(products.workspaceId, workspaceId)))
      .limit(1);
    if (!row?.trackQuantity) continue;

    const [updated] = await tx
      .update(products)
      .set({ quantity: sql`${products.quantity} - ${item.quantity}` })
      .where(
        and(
          eq(products.id, item.productId),
          eq(products.workspaceId, workspaceId),
          eq(products.trackQuantity, true),
          gte(products.quantity, item.quantity),
        ),
      )
      .returning({ id: products.id });

    if (!updated) insufficientProductIds.push(item.productId);
  }

  return { ok: insufficientProductIds.length === 0, insufficientProductIds };
}

/**
 * Reverses decrementStock for a cancelled order. No insufficient-stock guard
 * needed — restocking can't go negative. Safe to call only once per order:
 * the caller (orderService.updateOrderStatus) only reaches this when the
 * order's status transition lands on "cancelled", and the order-status state
 * machine treats "cancelled" as terminal, so a second cancel attempt is
 * rejected before this ever runs again for the same order.
 */
export async function restockOrderItems(tx: DbTransaction, workspaceId: string, orderId: string): Promise<void> {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    if (!item.productId || item.quantity <= 0) continue;

    await tx
      .update(products)
      .set({ quantity: sql`${products.quantity} + ${item.quantity}` })
      .where(and(eq(products.id, item.productId), eq(products.workspaceId, workspaceId), eq(products.trackQuantity, true)));
  }
}
