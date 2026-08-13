import { and, desc, eq, ilike, inArray, isNotNull, isNull, lte, or, sum } from "drizzle-orm";
import { db } from "@/db/client";
import {
  type Contact,
  contacts,
  type NewOrder,
  type NewOrderItem,
  type Order,
  orderItems,
  type OrderItem,
  orders,
  type OrderStatus,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { decrementStock, restockOrderItems } from "@/features/inventory/lib/stock";

export interface OrderListItem {
  order: Order;
  contact: Contact;
  items: OrderItem[];
}

const listSelection = { order: orders, contact: contacts };

async function attachItems(rows: { order: Order; contact: Contact }[]): Promise<OrderListItem[]> {
  if (rows.length === 0) return [];

  const items = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((row) => row.order.id),
      ),
    );

  return rows.map((row) => ({
    ...row,
    items: items.filter((item) => item.orderId === row.order.id),
  }));
}

export const orderRepository = {
  async findByWorkspaceId(workspaceId: string, search?: string): Promise<OrderListItem[]> {
    const trimmed = search?.trim();
    const rows = await db
      .select(listSelection)
      .from(orders)
      .innerJoin(contacts, eq(orders.contactId, contacts.id))
      .where(and(eq(orders.workspaceId, workspaceId), trimmed ? ilike(contacts.fullName, `%${trimmed}%`) : undefined))
      .orderBy(desc(orders.createdAt));
    return attachItems(rows);
  },

  async findByContactId(contactId: string, workspaceId: string): Promise<OrderListItem[]> {
    const rows = await db
      .select(listSelection)
      .from(orders)
      .innerJoin(contacts, eq(orders.contactId, contacts.id))
      .where(and(eq(orders.contactId, contactId), eq(orders.workspaceId, workspaceId)))
      .orderBy(desc(orders.createdAt));
    return attachItems(rows);
  },

  async findById(id: string, workspaceId: string): Promise<OrderListItem | null> {
    const [row] = await db
      .select(listSelection)
      .from(orders)
      .innerJoin(contacts, eq(orders.contactId, contacts.id))
      .where(and(eq(orders.id, id), eq(orders.workspaceId, workspaceId)))
      .limit(1);
    if (!row) return null;

    const [withItems] = await attachItems([row]);
    return withItems;
  },

  /**
   * Public order-confirmation lookup — the storefront checkout success screen's only entry point
   * to an anonymous visitor's own order. Same query/shape as `findById`, kept as a distinctly named
   * alias so it's clear at every call site that this one is meant to be reachable with no session,
   * scoped only by knowing the exact order UUID plus a workspace resolved from the store's own slug
   * (never from auth) — the same trust model any e-commerce "order confirmation" link uses.
   */
  async findByIdForConfirmation(id: string, workspaceId: string): Promise<OrderListItem | null> {
    return orderRepository.findById(id, workspaceId);
  },

  async create(order: NewOrder, items: Omit<NewOrderItem, "orderId">[]): Promise<OrderListItem> {
    return db.transaction(async (tx) => {
      const [createdOrder] = await tx.insert(orders).values(order).returning();
      const createdItems = items.length
        ? await tx
            .insert(orderItems)
            .values(items.map((item) => ({ ...item, orderId: createdOrder.id })))
            .returning()
        : [];

      const trackedItems = createdItems
        .filter((item) => item.productId)
        .map((item) => ({ productId: item.productId as string, quantity: item.quantity }));
      if (trackedItems.length > 0) {
        const result = await decrementStock(tx, order.workspaceId, trackedItems);
        if (!result.ok) {
          throw new AppError("OUT_OF_STOCK", "One or more items in this order are no longer available in the requested quantity.");
        }
      }

      const [contact] = await tx.select().from(contacts).where(eq(contacts.id, createdOrder.contactId)).limit(1);

      return { order: createdOrder, contact, items: createdItems };
    });
  },

  async updateStatus(id: string, workspaceId: string, status: OrderStatus): Promise<Order | null> {
    return db.transaction(async (tx) => {
      const [order] = await tx
        .update(orders)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(orders.id, id), eq(orders.workspaceId, workspaceId)))
        .returning();
      if (!order) return null;

      if (status === "cancelled") {
        await restockOrderItems(tx, workspaceId, order.id);
      }

      return order;
    });
  },

  async updateShipping(
    id: string,
    workspaceId: string,
    data: { shippingCarrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null },
  ): Promise<Order | null> {
    const [order] = await db
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.workspaceId, workspaceId)))
      .returning();
    return order ?? null;
  },

  /** Total ordered quantity per product, across every order status — feeds the storefront's "best-selling" sort. */
  async sumQuantityByProductId(workspaceId: string): Promise<Map<string, number>> {
    const rows = await db
      .select({ productId: orderItems.productId, total: sum(orderItems.quantity) })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.workspaceId, workspaceId), isNotNull(orderItems.productId)))
      .groupBy(orderItems.productId);
    return new Map(rows.filter((row) => row.productId !== null).map((row) => [row.productId as string, Number(row.total)]));
  },

  /** Used for lead scoring (see lead-score.ts) — one query instead of an order check per lead. */
  async findContactIdsWithOrders(workspaceId: string, contactIds: string[]): Promise<Set<string>> {
    if (contactIds.length === 0) return new Set();
    const rows = await db
      .selectDistinct({ contactId: orders.contactId })
      .from(orders)
      .where(and(eq(orders.workspaceId, workspaceId), inArray(orders.contactId, contactIds)));
    return new Set(rows.map((row) => row.contactId));
  },

  /** Orders stuck in "draft"/"pending" since before `createdBefore`, not followed up yet (or last followed up before `renotifyBefore`) — feeds the daily order-followups cron. */
  async findStalePending(createdBefore: Date, renotifyBefore: Date): Promise<OrderListItem[]> {
    const rows = await db
      .select(listSelection)
      .from(orders)
      .innerJoin(contacts, eq(orders.contactId, contacts.id))
      .where(
        and(
          inArray(orders.status, ["draft", "pending"]),
          lte(orders.createdAt, createdBefore),
          or(isNull(orders.followupNotifiedAt), lte(orders.followupNotifiedAt, renotifyBefore)),
        ),
      )
      .orderBy(desc(orders.createdAt));
    return attachItems(rows);
  },

  async markFollowupNotified(id: string): Promise<void> {
    await db.update(orders).set({ followupNotifiedAt: new Date() }).where(eq(orders.id, id));
  },
};
