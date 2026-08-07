"use server";

import type { WebhookSubscription } from "@/db/schema";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { integrationService } from "../services/integration.service";
import { createWebhookSubscriptionSchema } from "../validation/schemas";

export async function createWebhookSubscriptionAction(input: unknown): Promise<ActionResult<WebhookSubscription>> {
  const parsed = createWebhookSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "integrations");
  await requireWorkspacePermission(user.id, workspace.id, "integrations.manage");

  try {
    const subscription = await integrationService.createWebhookSubscription(workspace.id, parsed.data.url, parsed.data.eventTypes);
    return actionOk(subscription);
  } catch (error) {
    return actionFail(error);
  }
}
