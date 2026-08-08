"use server";

import type { Review } from "@/db/schema";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { reviewService } from "../services/review.service";
import { saveReviewSchema } from "../validation/schemas";

export async function saveReviewAction(input: unknown): Promise<ActionResult<Review>> {
  const parsed = saveReviewSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  const { id, ...data } = parsed.data;

  try {
    const review = id
      ? await reviewService.updateReview(workspace.id, id, data)
      : await reviewService.createReview(workspace.id, data);
    return actionOk(review);
  } catch (error) {
    return actionFail(error);
  }
}
