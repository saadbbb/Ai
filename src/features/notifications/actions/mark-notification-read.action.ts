"use server";

import { z } from "zod";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { notificationService } from "../services/notification.service";

const schema = z.object({ id: z.string().uuid() });

export async function markNotificationReadAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await notificationService.markAsRead(workspace.id, parsed.data.id);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
