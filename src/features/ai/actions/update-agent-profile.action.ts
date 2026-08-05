"use server";

import { getTranslations } from "next-intl/server";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { aiAgentRepository } from "../repository/ai-agent.repository";
import { createAgentProfileSchema } from "../validation/schemas";

export async function updateAgentProfileAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("validation");
  const parsed = createAgentProfileSchema(t).safeParse(input);
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
