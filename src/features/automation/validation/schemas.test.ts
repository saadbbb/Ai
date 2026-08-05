import { describe, expect, it } from "vitest";
import { createWorkflowSchema } from "./schemas";

const BASE = {
  name: "Test workflow",
  actionType: "notify_owner_email" as const,
  actionMessage: "Hello",
};

describe("createWorkflowSchema", () => {
  it("accepts a minimal valid conversation_handed_over -> notify_owner_email workflow", () => {
    const result = createWorkflowSchema.safeParse({ ...BASE, triggerType: "conversation_handed_over" });
    expect(result.success).toBe(true);
  });

  it("requires triggerStage for lead_stage_changed", () => {
    const result = createWorkflowSchema.safeParse({ ...BASE, triggerType: "lead_stage_changed" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["triggerStage"]);
    }
  });

  it("accepts lead_stage_changed when triggerStage is provided", () => {
    const result = createWorkflowSchema.safeParse({
      ...BASE,
      triggerType: "lead_stage_changed",
      triggerStage: "won",
    });
    expect(result.success).toBe(true);
  });

  it.each(["order_status_changed", "appointment_status_changed"] as const)(
    "requires triggerStatus for %s",
    (triggerType) => {
      const result = createWorkflowSchema.safeParse({ ...BASE, triggerType });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["triggerStatus"]);
      }
    },
  );

  it("accepts an order status for order_status_changed and an appointment status for appointment_status_changed", () => {
    expect(
      createWorkflowSchema.safeParse({ ...BASE, triggerType: "order_status_changed", triggerStatus: "delivered" })
        .success,
    ).toBe(true);
    expect(
      createWorkflowSchema.safeParse({
        ...BASE,
        triggerType: "appointment_status_changed",
        triggerStatus: "completed",
      }).success,
    ).toBe(true);
  });

  it.each(["order_created", "lead_created", "appointment_created"] as const)(
    "requires no extra config for %s",
    (triggerType) => {
      const result = createWorkflowSchema.safeParse({ ...BASE, triggerType });
      expect(result.success).toBe(true);
    },
  );

  it.each(["add_contact_tag", "remove_contact_tag"] as const)("requires actionTag for %s", (actionType) => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["actionTag"]);
    }
  });

  it("requires actionMessage for notify_owner_email", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "notify_owner_email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["actionMessage"]);
    }
  });

  it.each([0, 1, 365])("accepts delayDays = %i", (delayDays) => {
    const result = createWorkflowSchema.safeParse({ ...BASE, triggerType: "lead_created", delayDays });
    expect(result.success).toBe(true);
  });

  it.each([-1, 366, 1.5])("rejects an invalid delayDays value: %s", (delayDays) => {
    const result = createWorkflowSchema.safeParse({ ...BASE, triggerType: "lead_created", delayDays });
    expect(result.success).toBe(false);
  });

  it("allows delayDays to be omitted (runs immediately)", () => {
    const result = createWorkflowSchema.safeParse({ ...BASE, triggerType: "lead_created" });
    expect(result.success).toBe(true);
  });
});
