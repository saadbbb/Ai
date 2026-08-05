"use server";

import type { PlatformSettings } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { platformSettingsRepository } from "../repository/platform-settings.repository";
import { updatePlatformSettingsSchema } from "../validation/schemas";

export async function updatePlatformSettingsAction(input: unknown): Promise<ActionResult<PlatformSettings>> {
  const parsed = updatePlatformSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requirePlatformAdmin();

  try {
    const settings = await platformSettingsRepository.upsert({
      whatsappNumber: parsed.data.whatsappNumber || null,
      whatsappMessageTemplate: parsed.data.whatsappMessageTemplate || null,
      supportEmail: parsed.data.supportEmail || null,
    });

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "platform_settings_updated",
      targetType: "platform_settings",
      summary: "Updated platform settings.",
    });

    return actionOk(settings);
  } catch (error) {
    return actionFail(error);
  }
}
