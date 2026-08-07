"use server";

import type { AdCampaign } from "@/db/schema";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { adsService } from "../services/ads.service";
import { createAdCampaignSchema } from "../validation/schemas";

export async function createAdCampaignAction(input: unknown): Promise<ActionResult<AdCampaign>> {
  const parsed = createAdCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "ads");
  await requireWorkspacePermission(user.id, workspace.id, "ads.manage");

  try {
    const campaign = await adsService.createCampaign(workspace.id, parsed.data);
    return actionOk(campaign);
  } catch (error) {
    return actionFail(error);
  }
}
