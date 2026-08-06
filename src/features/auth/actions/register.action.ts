"use server";

import { getTranslations } from "next-intl/server";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { authService } from "../services/auth.service";
import { createSignUpSchema } from "../validation/schemas";

export async function registerAction(input: unknown): Promise<ActionResult<{ needsEmailConfirmation: boolean }>> {
  const t = await getTranslations("validation");
  const parsed = createSignUpSchema(t).safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const result = await authService.signUp(parsed.data.email, parsed.data.password);
    return actionOk(result);
  } catch (error) {
    return actionFail(error);
  }
}
