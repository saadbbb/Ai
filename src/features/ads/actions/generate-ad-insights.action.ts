"use server";

import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, type ActionResult } from "@/lib/errors/app-error";
import { adsService } from "../services/ads.service";

export async function generateAdInsightsAction(): Promise<ActionResult<string>> {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "ads");
  await requireWorkspacePermission(user.id, workspace.id, "ads.manage");

  try {
    const insights = await adsService.generateAdInsights(workspace.id);
    return actionOk(insights);
  } catch (error) {
    return actionFail(error);
  }
}
