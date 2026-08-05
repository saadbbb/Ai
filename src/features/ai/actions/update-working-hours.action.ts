"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { aiAgentRepository } from "../repository/ai-agent.repository";
import { workingHoursSchema } from "../validation/schemas";

export async function updateWorkingHoursAction(input: unknown): Promise<ActionResult> {
  const parsed = workingHoursSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await aiAgentRepository.update(workspace.id, {
      workingHours: { ...parsed.data, holidayNotes: parsed.data.holidayNotes ?? null },
    });
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
