"use server";

import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { planRepository } from "../repository/plan.repository";
import { deletePlanSchema } from "../validation/plan-schemas";

export async function deletePlanAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = deletePlanSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await requirePlatformAdmin();

  try {
    await planRepository.delete(parsed.data.id);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
