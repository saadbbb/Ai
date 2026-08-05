"use server";

import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { teamService } from "../services/team.service";
import { revokeInvitationSchema } from "../validation/team-schemas";

export async function revokeInvitationAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = revokeInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "workspace.members.manage");

  try {
    await teamService.revokeInvitation(workspace.id, parsed.data.invitationId);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
