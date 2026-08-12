"use server";

import { z } from "zod";
import type { PlatformSettings } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { platformSettingsRepository } from "../repository/platform-settings.repository";

const schema = z.object({ creativity: z.enum(["low", "medium", "high"]) });

export async function setDefaultCreativityAction(input: unknown): Promise<ActionResult<PlatformSettings>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const settings = await platformSettingsRepository.setDefaultCreativity(parsed.data.creativity);

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.name ?? admin.email ?? "Unknown",
      action: "platform_settings_updated",
      targetType: "platform_settings",
      summary: `Changed the platform-wide default AI creativity to "${parsed.data.creativity}".`,
    });

    return actionOk(settings);
  } catch (error) {
    return actionFail(error);
  }
}
