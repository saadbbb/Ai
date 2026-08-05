"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { inboxService } from "../services/inbox.service";
import { startConversationSchema } from "../validation/schemas";

export async function startConversationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = startConversationSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const conversation = await inboxService.startConversation(workspace.id, parsed.data);
    return actionOk(conversation);
  } catch (error) {
    return actionFail(error);
  }
}
