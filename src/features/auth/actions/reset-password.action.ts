"use server";

import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { authService } from "../services/auth.service";
import { resetPasswordSchema } from "../validation/schemas";

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    await authService.resetPassword(parsed.data.email, parsed.data.password);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
