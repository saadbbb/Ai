"use server";

import { workingHoursSchema } from "@/features/ai/validation/schemas";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { onboardingService } from "../services/onboarding.service";

export async function saveWorkingHoursAction(input: unknown): Promise<ActionResult> {
  const parsed = workingHoursSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await onboardingService.saveWorkingHours(workspace.id, workspace, parsed.data);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
