"use server";

import { businessDescriptionSchema } from "@/features/ai/validation/schemas";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { onboardingService } from "../services/onboarding.service";

export async function saveBusinessDescriptionAction(input: unknown): Promise<ActionResult> {
  const parsed = businessDescriptionSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await onboardingService.saveBusinessDescription(workspace.id, workspace, parsed.data.businessDescription);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
