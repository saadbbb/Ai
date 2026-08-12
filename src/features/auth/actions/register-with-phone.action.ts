"use server";

import { getTranslations } from "next-intl/server";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { normalizeIraqiPhone } from "../lib/phone";
import { authService } from "../services/auth.service";
import { createPhoneSignUpSchema } from "../validation/schemas";

export async function registerWithPhoneAction(input: unknown): Promise<ActionResult<undefined>> {
  const t = await getTranslations("validation");
  const parsed = createPhoneSignUpSchema(t).safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const phone = normalizeIraqiPhone(parsed.data.phone);
  if (!phone) {
    return actionValidationError(t("phoneInvalid"));
  }

  try {
    await authService.signUpWithPhone(phone, parsed.data.password);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
