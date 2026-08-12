"use server";

import { getTranslations } from "next-intl/server";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { createOwnerNameSchema } from "../validation/schemas";
import { onboardingService } from "../services/onboarding.service";

export async function saveOwnerNameAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("validation");
  const parsed = createOwnerNameSchema(t).safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await onboardingService.saveOwnerName(workspace.id, workspace, user.id, parsed.data.name);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
