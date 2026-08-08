import "server-only";
import type { Order, OrderDeliveryMethod, OrderPaymentMethod, OrderStatus } from "@/db/schema";
import { activityRepository, type ActivityActor } from "@/features/crm/repository/activity.repository";
import { crmService } from "@/features/crm/services/crm.service";
import { automationService } from "@/features/automation/services/automation.service";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { notifyWorkspaceOwner } from "@/features/notifications/services/notify-owner.service";
import { AppError } from "@/lib/errors/app-error";
import { orderGrandTotal } from "../lib/order-total";
import { canTransitionOrderStatus } from "../lib/order-status";
import { orderRepository, type OrderListItem } from "../repository/order.repository";

const REVENUE_ORDER_STATUSES: OrderStatus[] = ["delivered", "completed"];

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
  discountAmount?: string;
  taxAmount?: string;
  deliveryFee?: string;
  paymentMethod?: OrderPaymentMethod;
  deliveryMethod?: OrderDeliveryMethod;
  deliveryAddress?: string;
}

async function listOrders(workspaceId: string, search?: string): Promise<OrderListItem[]> {
  return orderRepository.findByWorkspaceId(workspaceId, search);
}

async function getOrder(workspaceId: string, orderId: string): Promise<OrderListItem> {
  const order = await orderRepository.findById(orderId, workspaceId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.");
  }
  return order;
}

async function createOrder(workspaceId: string, input: CreateOrderInput, actor: ActivityActor): Promise<OrderListItem> {
  if (input.items.length === 0) {
    throw new AppError("VALIDATION_ERROR", "An order needs at least one item.");
  }

  const contact = await contactRepository.findById(input.contactId, workspaceId);
  if (!contact) {
    throw new AppError("NOT_FOUND", "Contact not found.");
  }

  const created = await orderRepository.create(
    {
      workspaceId,
      contactId: input.contactId,
      conversationId: input.conversationId ?? null,
      notes: input.notes ?? null,
      discountAmount: input.discountAmount ?? "0",
      taxAmount: input.taxAmount ?? "0",
      deliveryFee: input.deliveryFee ?? "0",
      paymentMethod: input.paymentMethod ?? null,
      deliveryMethod: input.deliveryMethod ?? null,
      deliveryAddress: input.deliveryAddress ?? null,
    },
    input.items.map((item) => ({
      productId: item.productId ?? null,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
  );

  await automationService.dispatch(workspaceId, { type: "order_created", contactId: created.order.contactId });
  await activityRepository.log({
    workspaceId,
    contactId: created.order.contactId,
    type: "order_created",
    actor,
    summary: `Order created with ${created.items.length} item(s).`,
    link: `/dashboard/orders/${created.order.id}`,
  });

  const isVip = contact.tags.some((tag) => tag.toLowerCase() === "vip");
  if (isVip) {
    await notifyWorkspaceOwner({
      workspaceId,
      type: "dashboard",
      title: "New order from a VIP customer",
      message: `${contact.fullName} (VIP) just placed an order totaling ${orderGrandTotal(created.items, created.order).toFixed(2)}.`,
      link: `/dashboard/orders/${created.order.id}`,
    });
  }

  return created;
}

async function updateOrderStatus(workspaceId: string, orderId: string, status: OrderStatus, actor: ActivityActor): Promise<Order> {
  const existing = await orderRepository.findById(orderId, workspaceId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Order not found.");
  }
  if (!canTransitionOrderStatus(existing.order.status, status)) {
    throw new AppError("VALIDATION_ERROR", `An order can't move from "${existing.order.status}" to "${status}".`);
  }

  const order = await orderRepository.updateStatus(orderId, workspaceId, status);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.");
  }

  await automationService.dispatch(workspaceId, {
    type: "order_status_changed",
    contactId: order.contactId,
    status,
  });
  await activityRepository.log({
    workspaceId,
    contactId: order.contactId,
    type: "order_status_changed",
    actor,
    summary: `Order status changed to "${status}".`,
    link: `/dashboard/orders/${order.id}`,
  });

  if (REVENUE_ORDER_STATUSES.includes(status)) {
    await crmService.advanceLifecycleStage(workspaceId, order.contactId);
  }

  return order;
}

export const orderService = {
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
};
