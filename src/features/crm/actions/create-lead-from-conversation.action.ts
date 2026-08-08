"use server";

import type { Lead } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { crmService } from "../services/crm.service";
import { createLeadFromConversationSchema } from "../validation/schemas";

export async function createLeadFromConversationAction(input: unknown): Promise<ActionResult<Lead>> {
  const parsed = createLeadFromConversationSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "crm.records.manage");

  try {
    const lead = await crmService.createLeadFromConversation(workspace.id, parsed.data.conversationId, {
      type: "human",
      userId: user.id,
    });
    return actionOk(lead);
  } catch (error) {
    return actionFail(error);
  }
}
