"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { messageTemplateRepository } from "../repository/message-template.repository";
import { deleteTemplateSchema } from "../validation/schemas";

export async function deleteTemplateAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = deleteTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await messageTemplateRepository.delete(parsed.data.templateId, workspace.id);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
