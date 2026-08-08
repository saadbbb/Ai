"use server";

import type { Task } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { taskService } from "../services/task.service";
import { completeTaskSchema } from "../validation/schemas";

export async function completeTaskAction(input: unknown): Promise<ActionResult<Task>> {
  const parsed = completeTaskSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "crm.records.manage");

  try {
    const task = await taskService.completeTask(workspace.id, user.id, parsed.data.taskId);
    return actionOk(task);
  } catch (error) {
    return actionFail(error);
  }
}
