"use server";

import type { PlatformAdmin } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { platformAdminRepository } from "../repository/platform-admin.repository";
import { addPlatformAdminSchema } from "../validation/schemas";

export async function addPlatformAdminAction(input: unknown): Promise<ActionResult<PlatformAdmin>> {
  const parsed = addPlatformAdminSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requirePlatformAdmin();

  try {
    const existing = await platformAdminRepository.findByEmail(parsed.data.email);
    if (existing) {
      throw new AppError("VALIDATION_ERROR", "This email is already a platform admin.");
    }

    const created = await platformAdminRepository.create({
      email: parsed.data.email,
      addedByEmail: admin.email,
    });
    return actionOk(created);
  } catch (error) {
    return actionFail(error);
  }
}
