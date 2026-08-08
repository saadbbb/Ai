"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { inboxService } from "../services/inbox.service";
import { suggestReplySchema } from "../validation/schemas";

export async function suggestReplyAction(input: unknown): Promise<ActionResult<string>> {
  const parsed = suggestReplySchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const text = await inboxService.suggestReply(workspace.id, parsed.data.conversationId);
    return actionOk(text);
  } catch (error) {
    return actionFail(error);
  }
}
