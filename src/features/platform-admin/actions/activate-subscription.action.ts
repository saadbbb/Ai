"use server";

import type { Workspace } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { workspaceAdminRepository } from "../repository/workspace-admin.repository";
import { activateSubscriptionSchema } from "../validation/plan-schemas";

export async function activateSubscriptionAction(input: unknown): Promise<ActionResult<Workspace>> {
  const parsed = activateSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requirePlatformAdmin();

  try {
    const workspace = await workspaceAdminRepository.activateSubscription(
      parsed.data.workspaceId,
      parsed.data.planId,
      parsed.data.days,
    );
    if (!workspace) throw new AppError("NOT_FOUND", "Workspace not found.");

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "subscription_activated",
      targetType: "workspace",
      targetId: workspace.id,
      summary: `Activated a ${parsed.data.days}-day subscription for "${workspace.name}".`,
      metadata: { planId: parsed.data.planId, days: parsed.data.days },
    });

    return actionOk(workspace);
  } catch (error) {
    return actionFail(error);
  }
}
