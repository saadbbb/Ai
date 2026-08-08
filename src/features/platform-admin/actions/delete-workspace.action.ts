"use server";

import { requirePrimaryPlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { workspaceAdminRepository } from "../repository/workspace-admin.repository";
import { deleteWorkspaceSchema } from "../validation/workspace-schemas";

/**
 * Bootstrap admins only (requirePrimaryPlatformAdmin) — same reasoning as
 * impersonation: this is the single most destructive action on the whole
 * platform (cascades every row the workspace owns) and shouldn't be
 * delegable to a self-service database-managed admin. The confirmSlug
 * type-to-confirm check happens here too, not just client-side, since a
 * server action must never trust the client alone for a destructive op.
 */
export async function deleteWorkspaceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = deleteWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requirePrimaryPlatformAdmin();

  try {
    const workspace = await workspaceAdminRepository.findById(parsed.data.workspaceId);
    if (!workspace) throw new AppError("NOT_FOUND", "Workspace not found.");
    if (workspace.slug !== parsed.data.confirmSlug) {
      throw new AppError("VALIDATION_ERROR", "Confirmation text doesn't match the workspace's slug.");
    }

    await workspaceAdminRepository.delete(workspace.id);

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "workspace_deleted",
      targetType: "workspace",
      targetId: workspace.id,
      summary: `Permanently deleted workspace "${workspace.name}" (${workspace.slug}).`,
    });

    return actionOk({ id: workspace.id });
  } catch (error) {
    return actionFail(error);
  }
}
