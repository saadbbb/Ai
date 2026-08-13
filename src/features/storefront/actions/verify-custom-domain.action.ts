"use server";

import type { StorefrontCustomDomainStatus } from "@/db/schema";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, type ActionResult } from "@/lib/errors/app-error";
import { storefrontService } from "../services/storefront.service";

export async function verifyCustomDomainAction(): Promise<ActionResult<{ status: StorefrontCustomDomainStatus }>> {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  try {
    const status = await storefrontService.verifyCustomDomain(workspace.id);
    return actionOk({ status });
  } catch (error) {
    return actionFail(error);
  }
}
