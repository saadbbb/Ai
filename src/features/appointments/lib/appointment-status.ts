import type { AppointmentStatus } from "@/db/schema";

// "completed"/"cancelled"/"no_show" are terminal outcomes — nothing moves out
// of them. A scheduled appointment can be confirmed, cancelled, or (rarely)
// marked as a no-show/completed directly if it was never formally confirmed.
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "cancelled", "no_show", "completed"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransitionAppointmentStatus(from: AppointmentStatus, to: AppointmentStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}
