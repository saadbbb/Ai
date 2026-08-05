"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { businessInfoSchema } from "../validation/schemas";
import { onboardingService } from "../services/onboarding.service";

export async function saveBusinessInfoAction(input: unknown): Promise<ActionResult> {
  const parsed = businessInfoSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const user = await requireUser();
    const workspace = await requireWorkspaceForUser(user.id);
    await onboardingService.saveBusinessInfo(workspace.id, parsed.data);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
