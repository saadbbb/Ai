"use server";

import { z } from "zod";
import { aiService, type GeneratedWorkflowFields } from "@/features/ai/services/ai.service";
import { FEATURE_FLAG_KEYS } from "@/features/platform-admin/lib/feature-flag-keys";
import { featureFlagRepository } from "@/features/platform-admin/repository/feature-flag.repository";
import { workspaceAuditLogRepository } from "@/features/workspace/repository/workspace-audit-log.repository";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";

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
    const isGeneratorEnabled = await featureFlagRepository.isEnabled(FEATURE_FLAG_KEYS.AI_WORKFLOW_GENERATOR, workspace.id);
    if (!isGeneratorEnabled) {
      throw new AppError("SERVICE_UNAVAILABLE", "The AI Workflow Generator is temporarily disabled. Build the workflow manually below.");
    }

    const fields = await aiService.generateWorkflowFromDescription(workspace.id, parsed.data.description);

    await workspaceAuditLogRepository.log({
      workspaceId: workspace.id,
      actorUserId: user.id,
      actorEmail: user.name ?? user.email ?? "Unknown",
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
