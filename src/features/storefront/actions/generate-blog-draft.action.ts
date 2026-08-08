"use server";

import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { blogService } from "../services/blog.service";
import { generateBlogDraftSchema } from "../validation/schemas";

interface GeneratedDraft {
  title: string;
  excerpt: string;
  content: string;
}

export async function generateBlogDraftAction(input: unknown): Promise<ActionResult<GeneratedDraft>> {
  const parsed = generateBlogDraftSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  try {
    const draft = await blogService.generateDraft(workspace.id, parsed.data.topic);
    return actionOk(draft);
  } catch (error) {
    return actionFail(error);
  }
}
