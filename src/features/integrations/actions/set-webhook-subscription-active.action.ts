"use server";

import type { WebhookSubscription } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { integrationService } from "../services/integration.service";
import { setWebhookSubscriptionActiveSchema } from "../validation/schemas";

export async function setWebhookSubscriptionActiveAction(input: unknown): Promise<ActionResult<WebhookSubscription>> {
  const parsed = setWebhookSubscriptionActiveSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "integrations.manage");

  try {
    const subscription = await integrationService.setWebhookSubscriptionActive(workspace.id, parsed.data.id, parsed.data.isActive);
    return actionOk(subscription);
  } catch (error) {
    return actionFail(error);
  }
}
