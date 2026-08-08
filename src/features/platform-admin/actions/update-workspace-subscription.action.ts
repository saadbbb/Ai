"use server";

import type { Workspace } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { workspaceAdminRepository } from "../repository/workspace-admin.repository";
import { updateWorkspaceSubscriptionSchema } from "../validation/workspace-schemas";

export async function updateWorkspaceSubscriptionAction(input: unknown): Promise<ActionResult<Workspace>> {
  const parsed = updateWorkspaceSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const workspace = await workspaceAdminRepository.updateSubscriptionStatus(
      parsed.data.workspaceId,
      parsed.data.status,
    );
    if (!workspace) {
      throw new AppError("NOT_FOUND", "Workspace not found.");
    }

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "subscription_status_changed",
      targetType: "workspace",
      targetId: workspace.id,
      summary: `Changed "${workspace.name}"'s subscription status to "${parsed.data.status}".`,
      metadata: { status: parsed.data.status },
    });

    return actionOk(workspace);
  } catch (error) {
    return actionFail(error);
  }
}
