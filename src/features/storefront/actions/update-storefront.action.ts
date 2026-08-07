"use server";

import type { Storefront } from "@/db/schema";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { storefrontService } from "../services/storefront.service";
import { updateStorefrontSchema } from "../validation/schemas";

export async function updateStorefrontAction(input: unknown): Promise<ActionResult<Storefront>> {
  const parsed = updateStorefrontSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  try {
    const storefront = await storefrontService.updateStorefront(workspace.id, parsed.data);
    return actionOk(storefront);
  } catch (error) {
    return actionFail(error);
  }
}
