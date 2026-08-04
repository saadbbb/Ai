"use server";

import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { authService } from "../services/auth.service";
import { registerSchema } from "../validation/schemas";

export async function registerAction(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    await authService.startRegistration(parsed.data.email);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
