import { describe, expect, it } from "vitest";
import type { ToolContext, ToolSignals } from "./types";
import { requestHumanHandoverTool } from "./request-human-handover.tool";

function makeContext(): ToolContext {
  const signals: ToolSignals = { handoverRequested: false };
  return { workspaceId: "workspace-1", contactId: "contact-1", conversationId: "conversation-1", signals };
}

describe("requestHumanHandoverTool", () => {
  it("records the category and reason on the shared signals object", async () => {
    const context = makeContext();

    await requestHumanHandoverTool.execute(context, { category: "refund_request", reason: "Wants a refund for order #123." });

    expect(context.signals.handoverRequested).toBe(true);
    expect(context.signals.handoverCategory).toBe("refund_request");
    expect(context.signals.handoverReason).toBe("Wants a refund for order #123.");
  });

  it("rejects an input missing a category", () => {
    const result = requestHumanHandoverTool.schema.safeParse({ reason: "Needs help" });
    expect(result.success).toBe(false);
  });

  it("rejects an unrecognized category", () => {
    const result = requestHumanHandoverTool.schema.safeParse({ category: "not_real", reason: "Needs help" });
    expect(result.success).toBe(false);
  });
});
