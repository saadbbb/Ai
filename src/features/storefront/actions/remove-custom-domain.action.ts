"use server";

import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, type ActionResult } from "@/lib/errors/app-error";
import { storefrontService } from "../services/storefront.service";

export async function removeCustomDomainAction(): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  try {
    await storefrontService.removeCustomDomain(workspace.id);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
