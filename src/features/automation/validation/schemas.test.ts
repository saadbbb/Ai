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

  it.each(["tag_added", "message_received", "message_replied", "ai_failed"] as const)(
    "requires no extra config for the %s trigger",
    (triggerType) => {
      const result = createWorkflowSchema.safeParse({ ...BASE, triggerType });
      expect(result.success).toBe(true);
    },
  );

  it.each(["create_lead", "close_conversation"] as const)("requires no extra config for the %s action", (actionType) => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType,
    });
    expect(result.success).toBe(true);
  });

  it("requires actionAssignedUserId for assign_agent", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "assign_agent",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["actionAssignedUserId"]);
    }
  });

  it("accepts assign_agent with a valid user id", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "assign_agent",
      actionAssignedUserId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("requires actionWebhookUrl for webhook_call", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "webhook_call",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["actionWebhookUrl"]);
    }
  });

  it("rejects a non-https webhook URL", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "webhook_call",
      actionWebhookUrl: "http://example.com/hook",
    });
    expect(result.success).toBe(false);
  });

  it("accepts webhook_call with a valid https URL", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "webhook_call",
      actionWebhookUrl: "https://example.com/hook",
    });
    expect(result.success).toBe(true);
  });

  it("requires actionTargetWorkflowId for trigger_another_workflow", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "trigger_another_workflow",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["actionTargetWorkflowId"]);
    }
  });

  it("accepts trigger_another_workflow with a valid target workflow id", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "trigger_another_workflow",
      actionTargetWorkflowId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("requires actionTaskTitle for create_task", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "create_task",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["actionTaskTitle"]);
    }
  });

  it("accepts create_task with a title, priority, and due-in-days", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "create_task",
      actionTaskTitle: "Call back",
      actionTaskPriority: "high",
      actionTaskDueInDays: 3,
    });
    expect(result.success).toBe(true);
  });

  it("requires actionNoteContent for create_note", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "create_note",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["actionNoteContent"]);
    }
  });

  it("requires actionContactLanguage for update_contact_language", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "update_contact_language",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["actionContactLanguage"]);
    }
  });

  it("rejects an invalid language for update_contact_language", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "update_contact_language",
      actionContactLanguage: "fr",
    });
    expect(result.success).toBe(false);
  });

  it("accepts update_contact_language with a valid language", () => {
    const result = createWorkflowSchema.safeParse({
      name: "Test",
      triggerType: "lead_created",
      actionType: "update_contact_language",
      actionContactLanguage: "ar",
    });
    expect(result.success).toBe(true);
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

  it("accepts conditions with a valid field and matchType", () => {
    const result = createWorkflowSchema.safeParse({
      ...BASE,
      triggerType: "lead_created",
      conditions: [{ field: "tag", value: "VIP" }],
      conditionsMatchType: "any",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a condition with an unknown field", () => {
    const result = createWorkflowSchema.safeParse({
      ...BASE,
      triggerType: "lead_created",
      conditions: [{ field: "sentiment", value: "positive" }],
    });
    expect(result.success).toBe(false);
  });

  it.each(["lead_score", "order_value", "working_hours"] as const)(
    "accepts the %s condition field",
    (field) => {
      const result = createWorkflowSchema.safeParse({
        ...BASE,
        triggerType: "lead_created",
        conditions: [{ field, value: field === "working_hours" ? "true" : "70" }],
      });
      expect(result.success).toBe(true);
    },
  );

  it("rejects a condition with an empty value", () => {
    const result = createWorkflowSchema.safeParse({
      ...BASE,
      triggerType: "lead_created",
      conditions: [{ field: "tag", value: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 conditions", () => {
    const result = createWorkflowSchema.safeParse({
      ...BASE,
      triggerType: "lead_created",
      conditions: Array.from({ length: 6 }, (_, i) => ({ field: "tag" as const, value: `tag-${i}` })),
    });
    expect(result.success).toBe(false);
  });

  it("allows conditions to be omitted entirely (unconditional workflow)", () => {
    const result = createWorkflowSchema.safeParse({ ...BASE, triggerType: "lead_created" });
    expect(result.success).toBe(true);
  });
});
