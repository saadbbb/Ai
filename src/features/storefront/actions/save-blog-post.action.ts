"use server";

import type { BlogPost } from "@/db/schema";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { blogService } from "../services/blog.service";
import { saveBlogPostSchema } from "../validation/schemas";

export async function saveBlogPostAction(input: unknown): Promise<ActionResult<BlogPost>> {
  const parsed = saveBlogPostSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  const { id, ...data } = parsed.data;

  try {
    const post = id ? await blogService.updatePost(workspace.id, id, data) : await blogService.createPost(workspace.id, data);
    return actionOk(post);
  } catch (error) {
    return actionFail(error);
  }
}
