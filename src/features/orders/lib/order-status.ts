import type { OrderStatus } from "@/db/schema";

// Cancelled/refunded are terminal — nothing moves out of them. Every other
// status can also move to "cancelled" directly (a business can cancel at any
// point before delivery). "delivered" is the only status that can reach
// "refunded" other than "completed", since a refund implies the goods were
// already handed over.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending", "cancelled"],
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: ["completed", "refunded"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}
