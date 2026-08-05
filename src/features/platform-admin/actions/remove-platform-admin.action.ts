"use server";

import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { platformAdminRepository } from "../repository/platform-admin.repository";
import { removePlatformAdminSchema } from "../validation/schemas";

export async function removePlatformAdminAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = removePlatformAdminSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await requirePlatformAdmin();

  try {
    await platformAdminRepository.delete(parsed.data.id);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
