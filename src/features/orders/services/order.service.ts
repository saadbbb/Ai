import "server-only";
import type { Order, OrderStatus } from "@/db/schema";
import { automationService } from "@/features/automation/services/automation.service";
import { AppError } from "@/lib/errors/app-error";
import { orderRepository, type OrderListItem } from "../repository/order.repository";

interface OrderItemInput {
  productId?: string;
  name: string;
  unitPrice: string;
  quantity: number;
}

interface CreateOrderInput {
  contactId: string;
  conversationId?: string;
  notes?: string;
  items: OrderItemInput[];
}

async function listOrders(workspaceId: string): Promise<OrderListItem[]> {
  return orderRepository.findByWorkspaceId(workspaceId);
}

async function getOrder(workspaceId: string, orderId: string): Promise<OrderListItem> {
  const order = await orderRepository.findById(orderId, workspaceId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.");
  }
  return order;
}

async function createOrder(workspaceId: string, input: CreateOrderInput): Promise<OrderListItem> {
  if (input.items.length === 0) {
    throw new AppError("VALIDATION_ERROR", "An order needs at least one item.");
  }

  const created = await orderRepository.create(
    {
      workspaceId,
      contactId: input.contactId,
      conversationId: input.conversationId ?? null,
      notes: input.notes ?? null,
    },
    input.items.map((item) => ({
      productId: item.productId ?? null,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
  );

  await automationService.dispatch(workspaceId, { type: "order_created", contactId: created.order.contactId });

  return created;
}

async function updateOrderStatus(workspaceId: string, orderId: string, status: OrderStatus): Promise<Order> {
  const order = await orderRepository.updateStatus(orderId, workspaceId, status);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.");
  }

  await automationService.dispatch(workspaceId, {
    type: "order_status_changed",
    contactId: order.contactId,
    status,
  });

  return order;
}

export const orderService = {
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
};
