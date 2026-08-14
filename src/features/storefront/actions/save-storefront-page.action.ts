"use server";

import type { StorefrontPage } from "@/db/schema";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { storefrontPageService } from "../services/storefront-page.service";
import { saveStorefrontPageSchema } from "../validation/schemas";

export async function saveStorefrontPageAction(input: unknown): Promise<ActionResult<StorefrontPage>> {
  const parsed = saveStorefrontPageSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  const { id, ...data } = parsed.data;

  try {
    const page = id
      ? await storefrontPageService.updatePage(workspace.id, id, data)
      : await storefrontPageService.createPage(workspace.id, data);
    return actionOk(page);
  } catch (error) {
    return actionFail(error);
  }
}
