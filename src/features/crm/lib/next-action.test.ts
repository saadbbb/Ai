import { describe, expect, it } from "vitest";
import { suggestNextAction } from "./next-action";

const BASE = {
  hasDraftOrder: false,
  overdueTaskTitle: null,
  hasUpcomingAppointment: false,
  isHotLead: false,
  lifecycleStage: "customer" as const,
  daysSinceLastContact: null,
};

describe("suggestNextAction", () => {
  it("returns null when nothing is actionable", () => {
    expect(suggestNextAction(BASE)).toBeNull();
  });

  it("prioritizes a pending draft order above everything else", () => {
    const result = suggestNextAction({ ...BASE, hasDraftOrder: true, overdueTaskTitle: "Call back", isHotLead: true });
    expect(result).toEqual({ type: "follow_up_draft_order" });
  });

  it("surfaces an overdue task with its title when there's no draft order", () => {
    const result = suggestNextAction({ ...BASE, overdueTaskTitle: "Send the quote" });
    expect(result).toEqual({ type: "complete_overdue_task", detail: "Send the quote" });
  });

  it("suggests preparing for an upcoming appointment", () => {
    const result = suggestNextAction({ ...BASE, hasUpcomingAppointment: true });
    expect(result).toEqual({ type: "prepare_for_appointment" });
  });

  it("suggests reaching out to a hot lead", () => {
    const result = suggestNextAction({ ...BASE, isHotLead: true });
    expect(result).toEqual({ type: "reach_out_hot_lead" });
  });

  it("suggests checking in on a stale VIP contact", () => {
    const result = suggestNextAction({ ...BASE, lifecycleStage: "vip", daysSinceLastContact: 20 });
    expect(result).toEqual({ type: "check_in_vip" });
  });

  it("does not flag a VIP contact who was recently in touch", () => {
    const result = suggestNextAction({ ...BASE, lifecycleStage: "vip", daysSinceLastContact: 3 });
    expect(result).toBeNull();
  });

  it("does not flag a non-VIP stale contact", () => {
    const result = suggestNextAction({ ...BASE, lifecycleStage: "customer", daysSinceLastContact: 30 });
    expect(result).toBeNull();
  });
});
