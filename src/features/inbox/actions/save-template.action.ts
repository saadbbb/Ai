"use server";

import type { MessageTemplate } from "@/db/schema";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { messageTemplateRepository } from "../repository/message-template.repository";
import { createTemplateSchema } from "../validation/schemas";

export async function saveTemplateAction(input: unknown): Promise<ActionResult<MessageTemplate>> {
  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const template = await messageTemplateRepository.create({ ...parsed.data, workspaceId: workspace.id });
    return actionOk(template);
  } catch (error) {
    return actionFail(error);
  }
}
