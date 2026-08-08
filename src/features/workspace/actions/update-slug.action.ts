"use server";

import { z } from "zod";
import { workspaceService } from "@/features/workspace/services/workspace.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";

const updateSlugSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "URL must be at least 3 characters.")
    .max(50, "URL must be at most 50 characters."),
});

export async function updateSlugAction(input: unknown): Promise<ActionResult<{ slug: string }>> {
  const parsed = updateSlugSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const updated = await workspaceService.updateSlug(workspace.id, parsed.data.slug);
    return actionOk({ slug: updated.slug });
  } catch (error) {
    return actionFail(error);
  }
}
