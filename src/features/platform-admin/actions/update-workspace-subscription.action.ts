"use server";

import type { Workspace } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { workspaceAdminRepository } from "../repository/workspace-admin.repository";
import { updateWorkspaceSubscriptionSchema } from "../validation/workspace-schemas";

export async function updateWorkspaceSubscriptionAction(input: unknown): Promise<ActionResult<Workspace>> {
  const parsed = updateWorkspaceSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await requirePlatformAdmin();

  try {
    const workspace = await workspaceAdminRepository.updateSubscriptionStatus(
      parsed.data.workspaceId,
      parsed.data.status,
    );
    if (!workspace) {
      throw new AppError("NOT_FOUND", "Workspace not found.");
    }
    return actionOk(workspace);
  } catch (error) {
    return actionFail(error);
  }
}
