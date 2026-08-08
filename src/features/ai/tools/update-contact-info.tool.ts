import "server-only";
import { z } from "zod";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { AppError } from "@/lib/errors/app-error";
import type { AiTool, ToolContext } from "./types";

const schema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().min(3).max(50).optional(),
    email: z.string().trim().email().optional(),
    address: z.string().trim().min(1).max(500).optional(),
    budget: z.string().trim().min(1).max(100).optional(),
    preferredContactMethod: z.enum(["whatsapp", "instagram", "phone", "email"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update.");

async function execute(context: ToolContext, input: z.infer<typeof schema>): Promise<string> {
  const updated = await contactRepository.update(context.contactId, context.workspaceId, input);
  if (!updated) {
    throw new AppError("NOT_FOUND", "Could not find this customer's profile to update.");
  }
  const fields = Object.keys(input).join(", ");
  await activityRepository.log({
    workspaceId: context.workspaceId,
    contactId: context.contactId,
    type: "contact_updated",
    actor: { type: "ai" },
    summary: `AI updated the customer's profile (${fields}).`,
  });
  return `Updated the customer's profile (${fields}).`;
}

export const updateContactInfoTool: AiTool<z.infer<typeof schema>> = {
  name: "update_contact_info",
  description:
    "Save or correct information about the customer as you learn it during the conversation: full name, phone " +
    "number, email, address, a mentioned budget, or which contact method they said they prefer.",
  schema,
  jsonSchema: {
    type: "object",
    properties: {
      fullName: { type: "string", description: "The customer's full name." },
      phone: { type: "string", description: "The customer's phone number." },
      email: { type: "string", description: "The customer's email address." },
      address: { type: "string", description: "The customer's address, if they mentioned one." },
      budget: { type: "string", description: "A budget or price range the customer mentioned, in their own words." },
      preferredContactMethod: {
        type: "string",
        enum: ["whatsapp", "instagram", "phone", "email"],
        description: "Which way the customer said they'd prefer to be contacted.",
      },
    },
    additionalProperties: false,
  },
  execute,
};
