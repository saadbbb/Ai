"use server";

import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { integrationService } from "../services/integration.service";
import { deleteWebhookSubscriptionSchema } from "../validation/schemas";

export async function deleteWebhookSubscriptionAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = deleteWebhookSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "integrations.manage");

  try {
    await integrationService.deleteWebhookSubscription(workspace.id, parsed.data.id);
    return actionOk(null);
  } catch (error) {
    return actionFail(error);
  }
}
