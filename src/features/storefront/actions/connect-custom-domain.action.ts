"use server";

import { z } from "zod";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { storefrontService } from "../services/storefront.service";

const connectCustomDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(255)
    .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Enter a valid domain, e.g. www.yourbusiness.com"),
});

export async function connectCustomDomainAction(input: unknown): Promise<ActionResult<{ status: string; record: { type: string; name: string; value: string } | null }>> {
  const parsed = connectCustomDomainSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  try {
    const result = await storefrontService.connectCustomDomain(workspace.id, parsed.data.domain);
    return actionOk(result);
  } catch (error) {
    return actionFail(error);
  }
}
