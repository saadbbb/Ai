import "server-only";
import { z } from "zod";
import type { AiTool, ToolContext } from "./types";

const CATEGORIES = ["explicit_request", "complaint", "refund_request", "legal_or_medical", "payment_issue", "unable_to_help", "other"] as const;

const schema = z.object({
  category: z.enum(CATEGORIES),
  reason: z.string().trim().min(1).max(500),
});

/**
 * Only records intent on the shared signals object — inbox.service (the
 * existing owner of a conversation's aiStatus transitions) is what actually
 * flips it to handed_over and dispatches the automation event, so the
 * transition happens exactly once regardless of how it was triggered.
 */
async function execute(context: ToolContext, input: z.infer<typeof schema>): Promise<string> {
  context.signals.handoverRequested = true;
  context.signals.handoverReason = input.reason;
  context.signals.handoverCategory = input.category;
  return "A team member will follow up with the customer shortly.";
}

export const requestHumanHandoverTool: AiTool<z.infer<typeof schema>> = {
  name: "request_human_handover",
  description:
    "Hand this conversation over to a human team member. Use when the customer explicitly asks for a human, " +
    "has a complaint or refund request, needs legal or medical advice, mentions a payment problem, or you're " +
    "unable to help after genuinely trying. After calling this, write a short reassuring reply telling the " +
    "customer a team member will follow up.",
  schema,
  jsonSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: [...CATEGORIES],
        description: "Which kind of situation is triggering the handover.",
      },
      reason: { type: "string", description: "A short, specific description of why this conversation needs a human." },
    },
    required: ["category", "reason"],
    additionalProperties: false,
  },
  execute,
};
