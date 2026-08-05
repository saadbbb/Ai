"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, type ActionResult } from "@/lib/errors/app-error";
import { inboxService } from "../services/inbox.service";
import type { ConversationListItem } from "../repository/conversation.repository";

/** Polled client-side by the Inbox list to approximate real-time updates (see InboxList). */
export async function listConversationsAction(): Promise<ActionResult<ConversationListItem[]>> {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const conversations = await inboxService.listConversations(workspace.id);
    return actionOk(conversations);
  } catch (error) {
    return actionFail(error);
  }
}
