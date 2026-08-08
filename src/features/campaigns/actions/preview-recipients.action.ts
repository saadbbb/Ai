"use server";

import type { Contact } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { campaignService } from "../services/campaign.service";
import { previewRecipientsSchema } from "../validation/schemas";

export async function previewRecipientsAction(input: unknown): Promise<ActionResult<Contact[]>> {
  const parsed = previewRecipientsSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "campaigns.manage");

  try {
    const recipients = await campaignService.previewRecipients(workspace.id, {
      lifecycleStage: parsed.data.segmentLifecycleStage,
      tag: parsed.data.segmentTag,
      churnRisk: parsed.data.segmentChurnRisk,
    });
    return actionOk(recipients);
  } catch (error) {
    return actionFail(error);
  }
}
