"use server";

import type { Workflow } from "@/db/schema";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { automationService } from "../services/automation.service";
import { createWorkflowSchema } from "../validation/schemas";

export async function createWorkflowAction(input: unknown): Promise<ActionResult<Workflow>> {
  const parsed = createWorkflowSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const workflow = await automationService.createWorkflow(workspace.id, parsed.data);
    return actionOk(workflow);
  } catch (error) {
    return actionFail(error);
  }
}
