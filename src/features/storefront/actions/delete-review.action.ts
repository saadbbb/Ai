"use server";

import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { reviewService } from "../services/review.service";
import { deleteReviewSchema } from "../validation/schemas";

export async function deleteReviewAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = deleteReviewSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  try {
    await reviewService.deleteReview(workspace.id, parsed.data.id);
    return actionOk(null);
  } catch (error) {
    return actionFail(error);
  }
}
