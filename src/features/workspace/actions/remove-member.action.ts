"use server";

import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { teamService } from "../services/team.service";
import { removeMemberSchema } from "../validation/team-schemas";

export async function removeMemberAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "workspace.members.manage");

  try {
    await teamService.removeMember(workspace.id, parsed.data.memberId, { userId: user.id, name: user.name, email: user.email });
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
