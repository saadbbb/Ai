"use server";

import type { ApiKey } from "@/db/schema";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { integrationService } from "../services/integration.service";
import { createApiKeySchema } from "../validation/schemas";

export async function createApiKeyAction(input: unknown): Promise<ActionResult<{ apiKey: ApiKey; plaintext: string }>> {
  const parsed = createApiKeySchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "integrations");
  await requireWorkspacePermission(user.id, workspace.id, "integrations.manage");

  try {
    const result = await integrationService.createApiKey(workspace.id, parsed.data.name);
    return actionOk(result);
  } catch (error) {
    return actionFail(error);
  }
}
