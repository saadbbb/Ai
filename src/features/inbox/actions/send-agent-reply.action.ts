"use server";

import type { Message } from "@/db/schema";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { inboxService } from "../services/inbox.service";
import { sendAgentReplySchema } from "../validation/schemas";

export async function sendAgentReplyAction(input: unknown): Promise<ActionResult<Message>> {
  const parsed = sendAgentReplySchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const message = await inboxService.sendAgentReply(
      workspace.id,
      parsed.data.conversationId,
      user.id,
      parsed.data.content,
    );
    return actionOk(message);
  } catch (error) {
    return actionFail(error);
  }
}
