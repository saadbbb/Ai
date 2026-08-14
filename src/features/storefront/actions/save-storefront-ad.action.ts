"use server";

import type { StorefrontAd } from "@/db/schema";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { storefrontAdService } from "../services/storefront-ad.service";
import { saveStorefrontAdSchema } from "../validation/schemas";

export async function saveStorefrontAdAction(input: unknown): Promise<ActionResult<StorefrontAd>> {
  const parsed = saveStorefrontAdSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  const { id, ...data } = parsed.data;

  try {
    const ad = id
      ? await storefrontAdService.updateAd(workspace.id, id, data)
      : await storefrontAdService.createAd(workspace.id, data);
    return actionOk(ad);
  } catch (error) {
    return actionFail(error);
  }
}
