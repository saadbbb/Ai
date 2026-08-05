"use server";

import type { Plan } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { planRepository } from "../repository/plan.repository";
import { planFormSchema } from "../validation/plan-schemas";

export async function savePlanAction(input: unknown): Promise<ActionResult<Plan>> {
  const parsed = planFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await requirePlatformAdmin();
  const { id, ...data } = parsed.data;

  try {
    if (id) {
      const updated = await planRepository.update(id, data);
      if (!updated) throw new AppError("NOT_FOUND", "Plan not found.");
      return actionOk(updated);
    }

    const created = await planRepository.create(data);
    return actionOk(created);
  } catch (error) {
    return actionFail(error);
  }
}
