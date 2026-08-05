"use server";

import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { planRepository } from "../repository/plan.repository";
import { deletePlanSchema } from "../validation/plan-schemas";

export async function deletePlanAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = deletePlanSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requirePlatformAdmin();

  try {
    const target = await planRepository.findById(parsed.data.id);
    if (!target) throw new AppError("NOT_FOUND", "Plan not found.");

    await planRepository.delete(parsed.data.id);

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "plan_deleted",
      targetType: "plan",
      targetId: parsed.data.id,
      summary: `Deleted plan "${target.name}".`,
    });

    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
