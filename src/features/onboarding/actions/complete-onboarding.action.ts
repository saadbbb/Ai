"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, type ActionResult } from "@/lib/errors/app-error";
import { onboardingService } from "../services/onboarding.service";

export async function completeOnboardingAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspaceForUser(user.id);
    await onboardingService.completeOnboarding(workspace.id);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
