"use server";

import type { Campaign } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { campaignService } from "../services/campaign.service";
import { sendCampaignSchema } from "../validation/schemas";

export async function sendCampaignAction(input: unknown): Promise<ActionResult<Campaign>> {
  const parsed = sendCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "campaigns.manage");

  try {
    const campaign = await campaignService.sendCampaign(workspace.id, parsed.data.campaignId, {
      userId: user.id,
      email: user.email,
    });
    return actionOk(campaign);
  } catch (error) {
    return actionFail(error);
  }
}
