"use server";

import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { platformAdminRepository } from "../repository/platform-admin.repository";
import { removePlatformAdminSchema } from "../validation/schemas";

export async function removePlatformAdminAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = removePlatformAdminSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const target = await platformAdminRepository.findById(parsed.data.id);
    if (!target) throw new AppError("NOT_FOUND", "Platform admin not found.");

    await platformAdminRepository.delete(parsed.data.id);

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "platform_admin_removed",
      targetType: "platform_admin",
      targetId: parsed.data.id,
      summary: `Revoked platform admin access from ${target.email}.`,
    });

    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
