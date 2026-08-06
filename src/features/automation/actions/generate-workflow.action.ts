"use server";

import { z } from "zod";
import { aiService, type GeneratedWorkflowFields } from "@/features/ai/services/ai.service";
import { workspaceAuditLogRepository } from "@/features/workspace/repository/workspace-audit-log.repository";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";

const schema = z.object({
  description: z.string().trim().min(5).max(500),
});

export async function generateWorkflowAction(input: unknown): Promise<ActionResult<GeneratedWorkflowFields>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Describe the automation you want first.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "automation.workflows.manage");

  try {
    const fields = await aiService.generateWorkflowFromDescription(workspace.id, parsed.data.description);

    await workspaceAuditLogRepository.log({
      workspaceId: workspace.id,
      actorUserId: user.id,
      actorEmail: user.email,
      action: "workflow_ai_generated",
      targetType: "workflow_draft",
      summary: `Generated an automation draft from: "${parsed.data.description}"`,
      metadata: { fields },
    });

    return actionOk(fields);
  } catch (error) {
    return actionFail(error);
  }
}
