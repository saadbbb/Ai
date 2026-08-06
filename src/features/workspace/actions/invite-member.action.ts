"use server";

import type { Invitation } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { teamService } from "../services/team.service";
import { inviteMemberSchema } from "../validation/team-schemas";

export async function inviteMemberAction(input: unknown): Promise<ActionResult<{ invitation: Invitation; link: string }>> {
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "workspace.members.invite");

  try {
    const result = await teamService.inviteMember(workspace, { userId: user.id, email: user.email }, parsed.data.email, parsed.data.roleId);
    return actionOk(result);
  } catch (error) {
    return actionFail(error);
  }
}
