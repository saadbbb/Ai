import { z } from "zod";
import type { TranslateFn } from "@/i18n/config";

export function createSignUpSchema(t: TranslateFn) {
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
  });
}

export function createRequestPasswordResetSchema(t: TranslateFn) {
  return z.object({
    email: z.string().trim().toLowerCase().email(t("emailInvalid")),
  });
}

export function createSetNewPasswordSchema(t: TranslateFn) {
  return z.object({
    password: z.string().min(8, t("passwordMin")),
  });
}

export type SignUpInput = z.infer<ReturnType<typeof createSignUpSchema>>;
export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;
export type RequestPasswordResetInput = z.infer<ReturnType<typeof createRequestPasswordResetSchema>>;
export type SetNewPasswordInput = z.infer<ReturnType<typeof createSetNewPasswordSchema>>;
