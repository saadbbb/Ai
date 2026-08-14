"use server";

import type { StorefrontPage } from "@/db/schema";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { storefrontPageService } from "../services/storefront-page.service";
import { reorderStorefrontPageSchema } from "../validation/schemas";

export async function reorderStorefrontPageAction(input: unknown): Promise<ActionResult<StorefrontPage[]>> {
  const parsed = reorderStorefrontPageSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  try {
    const pages = await storefrontPageService.reorderPage(workspace.id, parsed.data.id, parsed.data.direction);
    return actionOk(pages);
  } catch (error) {
    return actionFail(error);
  }
}
