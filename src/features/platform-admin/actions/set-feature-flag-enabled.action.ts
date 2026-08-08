"use server";

import type { FeatureFlag } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { featureFlagRepository } from "../repository/feature-flag.repository";
import { setFeatureFlagEnabledSchema } from "../validation/schemas";

export async function setFeatureFlagEnabledAction(input: unknown): Promise<ActionResult<FeatureFlag>> {
  const parsed = setFeatureFlagEnabledSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const flag = await featureFlagRepository.setEnabled(parsed.data.id, parsed.data.enabled);
    if (!flag) throw new AppError("NOT_FOUND", "Feature flag not found.");

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "feature_flag_toggled",
      targetType: "feature_flag",
      targetId: flag.id,
      summary: `${parsed.data.enabled ? "Enabled" : "Disabled"} feature flag "${flag.key}".`,
    });

    return actionOk(flag);
  } catch (error) {
    return actionFail(error);
  }
}
