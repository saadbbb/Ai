"use server";

import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { featureFlagRepository, type FeatureFlagOverrideWithWorkspace } from "../repository/feature-flag.repository";
import { setFeatureFlagOverrideSchema } from "../validation/schemas";

export async function setFeatureFlagOverrideAction(input: unknown): Promise<ActionResult<FeatureFlagOverrideWithWorkspace>> {
  const parsed = setFeatureFlagOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const flag = await featureFlagRepository.findById(parsed.data.featureFlagId);
    if (!flag) throw new AppError("NOT_FOUND", "Feature flag not found.");

    const override = await featureFlagRepository.setOverride({
      featureFlagId: parsed.data.featureFlagId,
      workspaceId: parsed.data.workspaceId,
      enabled: parsed.data.enabled,
    });

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.name ?? admin.email ?? "Unknown",
      action: "feature_flag_override_set",
      targetType: "feature_flag",
      targetId: flag.id,
      summary: `Set "${flag.key}" to ${parsed.data.enabled ? "enabled" : "disabled"} for workspace "${override.workspaceName}".`,
    });

    return actionOk(override);
  } catch (error) {
    return actionFail(error);
  }
}
