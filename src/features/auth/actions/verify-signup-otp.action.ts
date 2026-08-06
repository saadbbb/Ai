"use server";

import { getTranslations } from "next-intl/server";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { authService } from "../services/auth.service";
import { createVerifyOtpSchema } from "../validation/schemas";

export async function verifySignupOtpAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("validation");
  const parsed = createVerifyOtpSchema(t).safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    await authService.verifySignupOtp(parsed.data.email, parsed.data.code);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
