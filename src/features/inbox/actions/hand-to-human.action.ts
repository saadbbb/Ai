"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { inboxService } from "../services/inbox.service";
import { handToHumanSchema } from "../validation/schemas";

export async function handToHumanAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = handToHumanSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await inboxService.handToHuman(workspace.id, parsed.data.conversationId, user.id);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
