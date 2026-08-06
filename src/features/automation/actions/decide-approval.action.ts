"use server";

import { z } from "zod";
import { workspaceAuditLogRepository } from "@/features/workspace/repository/workspace-audit-log.repository";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { automationService } from "../services/automation.service";

const schema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

export async function decideApprovalAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "automation.workflows.manage");

  try {
    await automationService.decideApproval(workspace.id, parsed.data.approvalId, parsed.data.decision, user.id);
    await workspaceAuditLogRepository.log({
      workspaceId: workspace.id,
      actorUserId: user.id,
      actorEmail: user.email,
      action: "workflow_approval_decided",
      targetType: "workflow_approval",
      targetId: parsed.data.approvalId,
      summary: `${parsed.data.decision === "approved" ? "Approved" : "Rejected"} a pending automation approval.`,
    });
    return actionOk(null);
  } catch (error) {
    return actionFail(error);
  }
}
