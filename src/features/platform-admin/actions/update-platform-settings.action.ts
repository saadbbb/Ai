"use server";

import { revalidateTag } from "next/cache";
import type { PlatformSettings } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { PLATFORM_SETTINGS_CACHE_TAG, platformSettingsRepository } from "../repository/platform-settings.repository";
import { updatePlatformSettingsSchema } from "../validation/schemas";

export async function updatePlatformSettingsAction(input: unknown): Promise<ActionResult<PlatformSettings>> {
  const parsed = updatePlatformSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const settings = await platformSettingsRepository.upsert({
      whatsappNumber: parsed.data.whatsappNumber || null,
      whatsappMessageTemplate: parsed.data.whatsappMessageTemplate || null,
      supportEmail: parsed.data.supportEmail || null,
    });

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.name ?? admin.email ?? "Unknown",
      action: "platform_settings_updated",
      targetType: "platform_settings",
      summary: "Updated platform settings.",
    });

    revalidateTag(PLATFORM_SETTINGS_CACHE_TAG);
    return actionOk(settings);
  } catch (error) {
    return actionFail(error);
  }
}
