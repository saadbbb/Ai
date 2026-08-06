import "server-only";
import { z } from "zod";
import { automationService } from "@/features/automation/services/automation.service";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import type { AiTool, ToolContext } from "./types";

const schema = z.object({
  tag: z.string().trim().min(1).max(50),
});

async function execute(context: ToolContext, input: z.infer<typeof schema>): Promise<string> {
  await contactRepository.addTag(context.contactId, context.workspaceId, input.tag);
  await activityRepository.log({
    workspaceId: context.workspaceId,
    contactId: context.contactId,
    type: "contact_tagged",
    actor: { type: "ai" },
    summary: `AI tagged the customer with "${input.tag}".`,
  });
  await automationService.dispatch(context.workspaceId, {
    type: "tag_added",
    contactId: context.contactId,
    tag: input.tag,
  });
  return `Tagged the customer with "${input.tag}".`;
}

export const addTagTool: AiTool<z.infer<typeof schema>> = {
  name: "add_tag",
  description:
    "Add a short descriptive tag to this customer's profile, e.g. \"VIP\", \"Interested\", \"Wholesale\". " +
    "Use it to help the team filter and prioritize customers later — never mention tags to the customer.",
  schema,
  jsonSchema: {
    type: "object",
    properties: { tag: { type: "string", description: "Short tag, e.g. VIP or Interested." } },
    required: ["tag"],
    additionalProperties: false,
  },
  execute,
};
