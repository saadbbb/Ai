"use server";

import { requireUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { teamService } from "../services/team.service";
import { acceptInvitationSchema } from "../validation/team-schemas";

export async function acceptInvitationAction(input: unknown): Promise<ActionResult<{ workspaceId: string }>> {
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();

  try {
    const result = await teamService.acceptInvitation(parsed.data.token, user);
    return actionOk(result);
  } catch (error) {
    return actionFail(error);
  }
}
