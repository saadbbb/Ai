"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { aiAgentRepository } from "../repository/ai-agent.repository";
import { toneSchema } from "../validation/schemas";

export async function updatePersonalityAction(input: unknown): Promise<ActionResult> {
  const parsed = toneSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await aiAgentRepository.update(workspace.id, parsed.data);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
