import type { OrderItem } from "@/db/schema";

export function orderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + Number.parseFloat(item.unitPrice) * item.quantity, 0);
}
