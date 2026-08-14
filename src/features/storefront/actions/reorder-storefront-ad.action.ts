"use server";

import type { StorefrontAd } from "@/db/schema";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { storefrontAdService } from "../services/storefront-ad.service";
import { reorderStorefrontAdSchema } from "../validation/schemas";

export async function reorderStorefrontAdAction(input: unknown): Promise<ActionResult<StorefrontAd[]>> {
  const parsed = reorderStorefrontAdSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  try {
    const ads = await storefrontAdService.reorderAd(workspace.id, parsed.data.id, parsed.data.direction);
    return actionOk(ads);
  } catch (error) {
    return actionFail(error);
  }
}
