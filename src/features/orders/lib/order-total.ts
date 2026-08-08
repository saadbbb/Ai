import type { Order, OrderItem } from "@/db/schema";

export function orderSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + Number.parseFloat(item.unitPrice) * item.quantity, 0);
}

export function orderGrandTotal(items: OrderItem[], order: Pick<Order, "discountAmount" | "taxAmount" | "deliveryFee">): number {
  return (
    orderSubtotal(items) -
    Number.parseFloat(order.discountAmount) +
    Number.parseFloat(order.taxAmount) +
    Number.parseFloat(order.deliveryFee)
  );
}
