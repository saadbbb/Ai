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

  async create(order: NewOrder, items: Omit<NewOrderItem, "orderId">[]): Promise<OrderListItem> {
    return db.transaction(async (tx) => {
      const [createdOrder] = await tx.insert(orders).values(order).returning();
      const createdItems = items.length
        ? await tx
            .insert(orderItems)
            .values(items.map((item) => ({ ...item, orderId: createdOrder.id })))
            .returning()
        : [];

      const [contact] = await tx.select().from(contacts).where(eq(contacts.id, createdOrder.contactId)).limit(1);

      return { order: createdOrder, contact, items: createdItems };
    });
  },

  async updateStatus(id: string, workspaceId: string, status: OrderStatus): Promise<Order | null> {
    const [order] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
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
