"use server";

import type { Plan } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { planRepository } from "../repository/plan.repository";
import { planFormSchema } from "../validation/plan-schemas";

export async function savePlanAction(input: unknown): Promise<ActionResult<Plan>> {
  const parsed = planFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();
  const { id, ...data } = parsed.data;

  try {
    if (id) {
      const updated = await planRepository.update(id, data);
      if (!updated) throw new AppError("NOT_FOUND", "Plan not found.");

      await auditLogRepository.log({
        actorUserId: admin.id,
        actorEmail: admin.email,
        action: "plan_saved",
        targetType: "plan",
        targetId: updated.id,
        summary: `Updated plan "${updated.name}".`,
      });

      return actionOk(updated);
    }

    const created = await planRepository.create(data);

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "plan_saved",
      targetType: "plan",
      targetId: created.id,
      summary: `Created plan "${created.name}".`,
    });

    return actionOk(created);
  } catch (error) {
    return actionFail(error);
  }
}
