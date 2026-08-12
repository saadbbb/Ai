"use server";

import type { ApiKey } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { integrationService } from "../services/integration.service";
import { revokeApiKeySchema } from "../validation/schemas";

export async function revokeApiKeyAction(input: unknown): Promise<ActionResult<ApiKey>> {
  const parsed = revokeApiKeySchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "integrations.manage");

  try {
    const apiKey = await integrationService.revokeApiKey(workspace.id, parsed.data.id, { userId: user.id, name: user.name, email: user.email });
    return actionOk(apiKey);
  } catch (error) {
    return actionFail(error);
  }
}
