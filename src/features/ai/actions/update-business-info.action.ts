"use server";

import { getTranslations } from "next-intl/server";
import { createWorkspaceProfileSchema } from "@/features/workspace/validation/profile-schemas";
import { workspaceRepository } from "@/features/workspace/repository/workspace.repository";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";

export async function updateBusinessInfoAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("validation");
  const parsed = createWorkspaceProfileSchema(t).safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await workspaceRepository.update(workspace.id, parsed.data);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
