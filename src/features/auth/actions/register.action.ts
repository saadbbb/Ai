"use server";

import { getTranslations } from "next-intl/server";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { authService } from "../services/auth.service";
import { createRegisterSchema } from "../validation/schemas";

export async function registerAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("validation");
  const parsed = createRegisterSchema(t).safeParse(input);
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
