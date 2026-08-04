"use server";

import { getRequestContext } from "@/lib/auth/request-context";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { authService } from "../services/auth.service";
import { loginSchema } from "../validation/schemas";

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const context = await getRequestContext();
    await authService.login(parsed.data.email, parsed.data.password, {
      ...context,
      rememberMe: parsed.data.rememberMe,
    });
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
