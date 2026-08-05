"use server";

import { agentNameSchema } from "@/features/ai/validation/schemas";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { onboardingService } from "../services/onboarding.service";

export async function saveAgentNameAction(input: unknown): Promise<ActionResult> {
  const parsed = agentNameSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const user = await requireUser();
    const workspace = await requireWorkspaceForUser(user.id);
    await onboardingService.saveAgentName(workspace.id, workspace, parsed.data.name);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
