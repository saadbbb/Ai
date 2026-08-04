"use server";

import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { authService } from "../services/auth.service";
import { verifyOtpSchema } from "../validation/schemas";

export async function verifyRegistrationOtpAction(input: unknown): Promise<ActionResult> {
  const parsed = verifyOtpSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    await authService.verifyRegistrationOtp(parsed.data.email, parsed.data.code);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}

export async function verifyPasswordResetOtpAction(input: unknown): Promise<ActionResult> {
  const parsed = verifyOtpSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    await authService.verifyPasswordResetOtp(parsed.data.email, parsed.data.code);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
