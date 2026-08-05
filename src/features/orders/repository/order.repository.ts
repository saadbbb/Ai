import { and, desc, eq, inArray } from "drizzle-orm";
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
  async findByWorkspaceId(workspaceId: string): Promise<OrderListItem[]> {
    const rows = await db
      .select(listSelection)
      .from(orders)
      .innerJoin(contacts, eq(orders.contactId, contacts.id))
      .where(eq(orders.workspaceId, workspaceId))
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
};
