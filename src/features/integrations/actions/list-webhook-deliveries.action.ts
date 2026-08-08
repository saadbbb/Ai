"use server";

import { z } from "zod";
import type { WebhookDelivery } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { webhookSubscriptionRepository } from "../repository/webhook-subscription.repository";
import { integrationService } from "../services/integration.service";

const schema = z.object({ subscriptionId: z.string().uuid() });

export async function listWebhookDeliveriesAction(input: unknown): Promise<ActionResult<WebhookDelivery[]>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "integrations.manage");

  try {
    const subscriptions = await webhookSubscriptionRepository.findByWorkspaceId(workspace.id);
    if (!subscriptions.some((subscription) => subscription.id === parsed.data.subscriptionId)) {
      return actionFail(new Error("Webhook subscription not found."));
    }

    const deliveries = await integrationService.listWebhookDeliveries(parsed.data.subscriptionId);
    return actionOk(deliveries);
  } catch (error) {
    return actionFail(error);
  }
}
