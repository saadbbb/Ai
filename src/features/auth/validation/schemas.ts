import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().length(6, "Enter the 6-digit code."),
});

export const setPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  acceptTerms: z.literal(true, { message: "You must accept the terms to continue." }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().optional(),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
