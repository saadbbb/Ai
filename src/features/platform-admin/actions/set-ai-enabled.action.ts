"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import type { PlatformSettings } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { PLATFORM_SETTINGS_CACHE_TAG, platformSettingsRepository } from "../repository/platform-settings.repository";

const schema = z.object({ enabled: z.boolean() });

export async function setAiEnabledAction(input: unknown): Promise<ActionResult<PlatformSettings>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const settings = await platformSettingsRepository.setAiEnabled(parsed.data.enabled);

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.name ?? admin.email ?? "Unknown",
      action: "ai_enabled_changed",
      targetType: "platform_settings",
      summary: parsed.data.enabled ? "Re-enabled AI replies platform-wide." : "Disabled AI replies platform-wide.",
    });

    revalidateTag(PLATFORM_SETTINGS_CACHE_TAG);
    return actionOk(settings);
  } catch (error) {
    return actionFail(error);
  }
}
