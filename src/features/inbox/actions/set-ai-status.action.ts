"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { inboxService } from "../services/inbox.service";
import { conversationIdSchema } from "../validation/schemas";

export async function pauseAiAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = conversationIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await inboxService.pauseAi(workspace.id, parsed.data.conversationId);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}

export async function resumeAiAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = conversationIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await inboxService.resumeAi(workspace.id, parsed.data.conversationId);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}

export async function closeConversationAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = conversationIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await inboxService.closeConversation(workspace.id, parsed.data.conversationId);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}

export async function reopenConversationAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = conversationIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await inboxService.reopenConversation(workspace.id, parsed.data.conversationId);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
