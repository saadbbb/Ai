"use server";

import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { featureFlagRepository } from "../repository/feature-flag.repository";
import { removeFeatureFlagOverrideSchema } from "../validation/schemas";

export async function removeFeatureFlagOverrideAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = removeFeatureFlagOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    await featureFlagRepository.removeOverride(parsed.data.id);

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "feature_flag_override_removed",
      targetType: "feature_flag",
      targetId: parsed.data.id,
      summary: "Removed a workspace-specific feature flag override.",
    });

    return actionOk({ id: parsed.data.id });
  } catch (error) {
    return actionFail(error);
  }
}
