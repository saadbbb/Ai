"use server";

import type { Message } from "@/db/schema";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { inboxService } from "../services/inbox.service";
import { logCustomerMessageSchema } from "../validation/schemas";

export async function logCustomerMessageAction(input: unknown): Promise<ActionResult<Message[]>> {
  const parsed = logCustomerMessageSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const messages = await inboxService.logCustomerMessage(
      workspace.id,
      parsed.data.conversationId,
      parsed.data.content,
    );
    return actionOk(messages);
  } catch (error) {
    return actionFail(error);
  }
}
