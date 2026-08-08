"use server";

import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { crmService } from "../services/crm.service";
import { removeTagSchema } from "../validation/schemas";

export async function removeTagAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = removeTagSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "crm.records.manage");

  try {
    await crmService.removeTag(workspace.id, parsed.data.contactId, parsed.data.tag, { type: "human", userId: user.id });
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
