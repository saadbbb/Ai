import { z } from "zod";
import type { TranslateFn } from "@/i18n/config";

export function createRegisterSchema(t: TranslateFn) {
  return z.object({
    email: z.string().trim().toLowerCase().email(t("emailInvalid")),
  });
}

export function createVerifyOtpSchema(t: TranslateFn) {
  return z.object({
    email: z.string().trim().toLowerCase().email(t("emailInvalid")),
    code: z.string().length(6, t("codeLength")),
  });
}

export function createSetPasswordSchema(t: TranslateFn) {
  return z.object({
    email: z.string().trim().toLowerCase().email(t("emailInvalid")),
    password: z.string().min(8, t("passwordMin")),
    acceptTerms: z.literal(true, { message: t("acceptTermsRequired") }),
  });
}

export function createLoginSchema(t: TranslateFn) {
  return z.object({
    email: z.string().trim().toLowerCase().email(t("emailInvalid")),
    password: z.string().min(1, t("passwordRequired")),
    rememberMe: z.boolean().optional(),
  });
}

export function createRequestPasswordResetSchema(t: TranslateFn) {
  return z.object({
    email: z.string().trim().toLowerCase().email(t("emailInvalid")),
  });
}

export function createResetPasswordSchema(t: TranslateFn) {
  return z.object({
    email: z.string().trim().toLowerCase().email(t("emailInvalid")),
    password: z.string().min(8, t("passwordMin")),
  });
}

export type RegisterInput = z.infer<ReturnType<typeof createRegisterSchema>>;
export type VerifyOtpInput = z.infer<ReturnType<typeof createVerifyOtpSchema>>;
export type SetPasswordInput = z.infer<ReturnType<typeof createSetPasswordSchema>>;
export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;
export type RequestPasswordResetInput = z.infer<ReturnType<typeof createRequestPasswordResetSchema>>;
export type ResetPasswordInput = z.infer<ReturnType<typeof createResetPasswordSchema>>;
