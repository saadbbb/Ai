"use server";

import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { campaignService } from "../services/campaign.service";
import { unsubscribeSchema } from "../validation/schemas";

/** Reached from the unsubscribe link in a campaign email's footer — zero-auth by design, same pattern as the storefront's public write paths. */
export async function unsubscribeAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = unsubscribeSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    await campaignService.setMarketingOptOut(parsed.data.workspaceId, parsed.data.contactId, true);
    return actionOk(null);
  } catch (error) {
    return actionFail(error);
  }
}
