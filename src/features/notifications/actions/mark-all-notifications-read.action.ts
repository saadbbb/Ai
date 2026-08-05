"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, type ActionResult } from "@/lib/errors/app-error";
import { notificationService } from "../services/notification.service";

export async function markAllNotificationsReadAction(): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await notificationService.markAllAsRead(workspace.id);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
