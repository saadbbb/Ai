"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { inboxService } from "../services/inbox.service";
import { conversationIdSchema } from "../validation/schemas";

type ConversationDetail = Awaited<ReturnType<typeof inboxService.getConversation>>;

/** Polled client-side by ConversationThread to approximate real-time updates. */
export async function getConversationAction(input: unknown): Promise<ActionResult<ConversationDetail>> {
  const parsed = conversationIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const data = await inboxService.getConversation(workspace.id, parsed.data.conversationId);
    return actionOk(data);
  } catch (error) {
    return actionFail(error);
  }
}
