import "server-only";
import { z } from "zod";
import type { AiTool, ToolContext } from "./types";

const schema = z.object({
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
  return "A team member will follow up with the customer shortly.";
}

export const requestHumanHandoverTool: AiTool<z.infer<typeof schema>> = {
  name: "request_human_handover",
  description:
    "Hand this conversation over to a human team member. Use when the customer explicitly asks for a human, " +
    "has a complaint or refund request, needs legal or medical advice, or you're unable to help after genuinely " +
    "trying. After calling this, write a short reassuring reply telling the customer a team member will follow up.",
  schema,
  jsonSchema: {
    type: "object",
    properties: { reason: { type: "string", description: "Why this conversation needs a human." } },
    required: ["reason"],
    additionalProperties: false,
  },
  execute,
};
