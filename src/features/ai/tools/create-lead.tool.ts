import "server-only";
import { z } from "zod";
import { crmService } from "@/features/crm/services/crm.service";
import type { AiTool, ToolContext } from "./types";

const schema = z.object({});

async function execute(context: ToolContext): Promise<string> {
  await crmService.createLeadFromConversation(context.workspaceId, context.conversationId, { type: "ai" });
  return "Lead recorded for this conversation.";
}

export const createLeadTool: AiTool<z.infer<typeof schema>> = {
  name: "create_lead",
  description:
    "Record this customer as a sales lead in the CRM. Call this once you've identified genuine purchase " +
    "or booking intent — not for simple questions. Safe to call more than once in the same conversation; " +
    "it will not create a duplicate.",
  schema,
  jsonSchema: { type: "object", properties: {}, additionalProperties: false },
  execute,
};
