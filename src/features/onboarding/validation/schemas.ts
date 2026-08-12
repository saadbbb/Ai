import { z } from "zod";
import type { TranslateFn } from "@/i18n/config";

export function createOwnerNameSchema(t: TranslateFn) {
  return z.object({
    name: z.string().trim().min(1, t("ownerNameRequired")).max(200),
  });
}

export function createBusinessInfoSchema(t: TranslateFn) {
  return z.object({
    name: z.string().trim().min(1, t("nameRequired")).max(200),
  });
}

export function createBusinessTypeSchema(t: TranslateFn) {
  return z.object({
    businessType: z.string().trim().min(1, t("businessTypeRequired")).max(100),
  });
}

export type OwnerNameInput = z.infer<ReturnType<typeof createOwnerNameSchema>>;
export type BusinessInfoInput = z.infer<ReturnType<typeof createBusinessInfoSchema>>;
export type BusinessTypeInput = z.infer<ReturnType<typeof createBusinessTypeSchema>>;
