"use server";

import { workspaceService } from "@/features/workspace/services/workspace.service";
import { getRequestContext } from "@/lib/auth/request-context";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { authService } from "../services/auth.service";
import { setPasswordSchema } from "../validation/schemas";

export async function completeRegistrationAction(input: unknown): Promise<ActionResult> {
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const context = await getRequestContext();
    const user = await authService.completeRegistration(parsed.data.email, parsed.data.password, context);
    await workspaceService.createWorkspaceForNewUser(user.id, user.email);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
