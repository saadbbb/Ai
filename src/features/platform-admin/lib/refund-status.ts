import type { RefundStatus } from "@/db/schema";

// "requested" is the only entry point; approved must clear to completed once
// the money has actually moved. Rejected/completed are terminal.
const ALLOWED_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["completed", "rejected"],
  rejected: [],
  completed: [],
};

export function canTransitionRefundStatus(from: RefundStatus, to: RefundStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
