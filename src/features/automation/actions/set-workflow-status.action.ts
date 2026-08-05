"use server";

import { z } from "zod";
import { workflowStatusEnum, type Workflow } from "@/db/schema";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { automationService } from "../services/automation.service";

const schema = z.object({
  workflowId: z.string().uuid(),
  status: z.enum(workflowStatusEnum.enumValues),
});

export async function setWorkflowStatusAction(input: unknown): Promise<ActionResult<Workflow>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const workflow = await automationService.setWorkflowStatus(workspace.id, parsed.data.workflowId, parsed.data.status);
    return actionOk(workflow);
  } catch (error) {
    return actionFail(error);
  }
}
