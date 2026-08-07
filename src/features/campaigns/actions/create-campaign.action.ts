"use server";

import type { Campaign } from "@/db/schema";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { campaignService } from "../services/campaign.service";
import { createCampaignSchema } from "../validation/schemas";

export async function createCampaignAction(input: unknown): Promise<ActionResult<Campaign>> {
  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "campaigns");
  await requireWorkspacePermission(user.id, workspace.id, "campaigns.manage");

  try {
    const campaign = await campaignService.createCampaign(workspace.id, parsed.data);
    return actionOk(campaign);
  } catch (error) {
    return actionFail(error);
  }
}
