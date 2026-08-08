import type { LeadStage } from "@/db/schema";

const ACTIVE_STAGES: LeadStage[] = ["new", "qualified", "contacted", "negotiation", "waiting", "appointment", "proposal_sent"];
const TERMINAL_STAGES: LeadStage[] = ["won", "lost", "cancelled"];

/**
 * Deliberately looser than the Orders/Appointments state machines: a sales
 * pipeline isn't strictly linear (a rep can move a card backward from
 * "negotiation" to "qualified" after new information, or skip straight to
 * "proposal_sent") — free movement between the active stages is normal CRM
 * usage, not a bug. What *is* a bug (see FULL_CODE_AUDIT_2026-08-07.md) is a
 * closed lead silently reopening, e.g. "won" -> "new". Once a lead reaches a
 * terminal stage, it stays there — reopening it is a deliberate action this
 * function doesn't support yet, not an accidental drag.
 */
export function canTransitionLeadStage(from: LeadStage, to: LeadStage): boolean {
  if (from === to) return true;
  if (TERMINAL_STAGES.includes(from)) return false;
  return ACTIVE_STAGES.includes(to) || TERMINAL_STAGES.includes(to);
}
