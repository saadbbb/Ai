"use server";

import type { PlatformAdmin } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { platformAdminRepository } from "../repository/platform-admin.repository";
import { setPlatformAdminRoleSchema } from "../validation/schemas";

export async function setPlatformAdminRoleAction(input: unknown): Promise<ActionResult<PlatformAdmin>> {
  const parsed = setPlatformAdminRoleSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const updated = await platformAdminRepository.updateRole(parsed.data.id, parsed.data.role);
    if (!updated) throw new AppError("NOT_FOUND", "Platform admin not found.");

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "platform_admin_role_changed",
      targetType: "platform_admin",
      targetId: updated.id,
      summary: `Changed ${updated.email}'s role to "${updated.role}".`,
    });

    return actionOk(updated);
  } catch (error) {
    return actionFail(error);
  }
}
