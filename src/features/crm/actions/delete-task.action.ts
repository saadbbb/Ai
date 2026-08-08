"use server";

import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { taskService } from "../services/task.service";
import { deleteTaskSchema } from "../validation/schemas";

export async function deleteTaskAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = deleteTaskSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "crm.records.manage");

  try {
    await taskService.deleteTask(workspace.id, parsed.data.taskId);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
