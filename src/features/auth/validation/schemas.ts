import { z } from "zod";
import type { TranslateFn } from "@/i18n/config";
import { normalizeIraqiPhone } from "../lib/phone";

/** Accepts the local 07XXXXXXXXX format merchants actually type; normalizeIraqiPhone also accepts an already-international one. */
function phoneField(t: TranslateFn) {
  return z
    .string()
    .trim()
    .refine((value) => normalizeIraqiPhone(value) !== null, t("phoneInvalid"));
}

export function createPhoneSignUpSchema(t: TranslateFn) {
  return z
    .object({
      phone: phoneField(t),
      password: z.string().min(8, t("passwordMin")),
      confirmPassword: z.string().min(1, t("passwordRequired")),
      acceptTerms: z.literal(true, { message: t("acceptTermsRequired") }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsMustMatch"),
      path: ["confirmPassword"],
    });
}

export function createPhoneLoginSchema(t: TranslateFn) {
  return z.object({
    phone: phoneField(t),
    password: z.string().min(1, t("passwordRequired")),
  });
}

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

/**
 * Not a fixed 6 digits — this Supabase project's configured OTP length is 8
 * (verified against the live project via the Admin API's generateLink, not
 * assumed), and that length is a dashboard setting that could change again,
 * so validate shape rather than an exact count. Shared by every OTP-entry
 * form (signup confirmation, password recovery) so they can't drift apart.
 */
export function createOtpCodeSchema(t: TranslateFn) {
  return z.string().trim().min(6, t("codeLength")).max(10, t("codeLength")).regex(/^\d+$/, t("codeLength"));
}

export function createVerifyOtpSchema(t: TranslateFn) {
  return z.object({
    email: z.string().trim().toLowerCase().email(t("emailInvalid")),
    code: createOtpCodeSchema(t),
  });
}

export type SignUpInput = z.infer<ReturnType<typeof createSignUpSchema>>;
export type PhoneSignUpInput = z.infer<ReturnType<typeof createPhoneSignUpSchema>>;
export type PhoneLoginInput = z.infer<ReturnType<typeof createPhoneLoginSchema>>;
export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;
export type RequestPasswordResetInput = z.infer<ReturnType<typeof createRequestPasswordResetSchema>>;
export type SetNewPasswordInput = z.infer<ReturnType<typeof createSetNewPasswordSchema>>;
export type VerifyOtpInput = z.infer<ReturnType<typeof createVerifyOtpSchema>>;
