import type { ContactLifecycleStage } from "@/db/schema";

export type NextActionType =
  | "follow_up_draft_order"
  | "complete_overdue_task"
  | "prepare_for_appointment"
  | "reach_out_hot_lead"
  | "check_in_vip";

export interface NextActionResult {
  type: NextActionType;
  /** Extra detail for the message, e.g. a task title or appointment time — kept as data, not baked into a translated string. */
  detail?: string;
}

export interface NextActionInput {
  hasDraftOrder: boolean;
  overdueTaskTitle: string | null;
  hasUpcomingAppointment: boolean;
  isHotLead: boolean;
  lifecycleStage: ContactLifecycleStage;
  daysSinceLastContact: number | null;
}

const VIP_STAGES: ContactLifecycleStage[] = ["vip", "loyal_customer"];
const VIP_STALE_DAYS = 14;

/**
 * Deterministic and explainable — same "compute live, don't fake an ML
 * model" approach as lead-score.ts and churn-risk.ts. Checked in priority
 * order: an already-started transaction or a missed deadline outranks a
 * softer "reach out" nudge. Returns at most one suggestion — the CRM shows
 * one clear next step, not a backlog.
 */
export function suggestNextAction(input: NextActionInput): NextActionResult | null {
  if (input.hasDraftOrder) return { type: "follow_up_draft_order" };
  if (input.overdueTaskTitle) return { type: "complete_overdue_task", detail: input.overdueTaskTitle };
  if (input.hasUpcomingAppointment) return { type: "prepare_for_appointment" };
  if (input.isHotLead) return { type: "reach_out_hot_lead" };
  if (
    VIP_STAGES.includes(input.lifecycleStage) &&
    input.daysSinceLastContact !== null &&
    input.daysSinceLastContact >= VIP_STALE_DAYS
  ) {
    return { type: "check_in_vip" };
  }
  return null;
}
