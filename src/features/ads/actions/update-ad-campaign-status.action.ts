"use server";

import type { AdCampaign } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { adsService } from "../services/ads.service";
import { updateAdCampaignStatusSchema } from "../validation/schemas";

export async function updateAdCampaignStatusAction(input: unknown): Promise<ActionResult<AdCampaign>> {
  const parsed = updateAdCampaignStatusSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "ads.manage");

  try {
    const campaign = await adsService.updateCampaignStatus(workspace.id, parsed.data.campaignId, parsed.data.status);
    return actionOk(campaign);
  } catch (error) {
    return actionFail(error);
  }
}
