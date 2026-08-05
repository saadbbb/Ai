"use server";

import type { Task } from "@/db/schema";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { taskService } from "../services/task.service";
import { createTaskSchema } from "../validation/schemas";

export async function createTaskAction(input: unknown): Promise<ActionResult<Task>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const task = await taskService.createTask(workspace.id, user.id, parsed.data);
    return actionOk(task);
  } catch (error) {
    return actionFail(error);
  }
}
