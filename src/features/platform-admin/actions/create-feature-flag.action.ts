"use server";

import type { FeatureFlag } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { featureFlagRepository } from "../repository/feature-flag.repository";
import { createFeatureFlagSchema } from "../validation/schemas";

export async function createFeatureFlagAction(input: unknown): Promise<ActionResult<FeatureFlag>> {
  const parsed = createFeatureFlagSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requirePlatformAdmin();

  try {
    const existing = await featureFlagRepository.findByKey(parsed.data.key);
    if (existing) throw new AppError("VALIDATION_ERROR", "A flag with this key already exists.");

    const flag = await featureFlagRepository.create({
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description || null,
      enabled: parsed.data.enabled,
    });

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "feature_flag_created",
      targetType: "feature_flag",
      targetId: flag.id,
      summary: `Created feature flag "${flag.key}".`,
    });

    return actionOk(flag);
  } catch (error) {
    return actionFail(error);
  }
}
